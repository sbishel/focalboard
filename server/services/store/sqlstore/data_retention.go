// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
package sqlstore

import (
	"database/sql"
	"time"

	"github.com/pkg/errors"

	sq "github.com/Masterminds/squirrel"
	_ "github.com/lib/pq" // postgres driver

	"github.com/mattermost/mattermost-server/v6/shared/mlog"
)

type RetentionTableDeletionInfo struct {
	Table          string
	ParentIDColumn string
}

type OrphanTableCleanupInfo struct {
	Table            string
	TableJoinColumn  string
	ParentTable      string
	ParentJoinColumn string
}

func (s *SQLStore) runDataRetention(db sq.BaseRunner, globalRetentionDate int64, batchSize int64) (int64, error) {
	s.logger.Info("Start Boards Data Retention",
		mlog.String("Global Retention Date", time.Unix(globalRetentionDate/1000, 0).String()),
		mlog.Int64("Raw Date", globalRetentionDate))

	cleanupTable := []OrphanTableCleanupInfo{
		{
			Table:            "subscriptions",
			TableJoinColumn:  "block_id", //index
			ParentTable:      "blocks",
			ParentJoinColumn: "id",
		},
	}
	deleteTables := []RetentionTableDeletionInfo{
		{
			Table:          "blocks",
			ParentIDColumn: "board_id", //index
		},
		{
			Table:          "blocks_history",
			ParentIDColumn: "board_id", //no index
		},
		{
			Table:          "boards",
			ParentIDColumn: "id", //index
		},
		{
			Table:          "boards_history",
			ParentIDColumn: "id", //index
		},
		{
			Table:          "board_members",
			ParentIDColumn: "board_id", //index
		},
		{
			Table:          "board_members_history",
			ParentIDColumn: "board_id", //index
		},
		{
			Table:          "sharing",
			ParentIDColumn: "id", //index
		},
		{
			Table:          "category_boards",
			ParentIDColumn: "board_id", //no index
		},
	}

	blockGroupQuery := s.getQueryBuilder(db).
		Select("board_id, MAX(update_at) AS maxDate").
		From(s.tablePrefix + "blocks").
		GroupBy("board_id")
	blockGroupSubQuery, _, _ := blockGroupQuery.ToSql()

	boardsQuery := s.getQueryBuilder(db).
		Select("id").
		From(s.tablePrefix + "boards").
		LeftJoin("( " + blockGroupSubQuery + " ) As subquery ON (subquery.board_id = id)").
		Where(sq.Lt{"maxDate": globalRetentionDate}).
		Where(sq.NotEq{"team_id": "0"}).
		Where(sq.Eq{"is_template": false})

	rows, err := boardsQuery.Query()
	if err != nil {
		s.logger.Error(`dataRetention subquery ERROR`, mlog.Err(err))
		return 0, err
	}
	defer s.CloseRows(rows)
	deleteIds, err := idsFromRows(rows)
	if err != nil {
		return 0, err
	}

	totalAffected := 0
	if len(deleteIds) > 0 {
		boardsPerBatch := 20
		for i := 0; i < len(deleteIds); i += boardsPerBatch {
			boardsThisBatch := boardsPerBatch
			if boardsPerBatch > len(deleteIds)-1 {
				boardsThisBatch = len(deleteIds) - i
			}
			deleteIDsBatch := deleteIds[i : i+boardsThisBatch]

			s.logger.Info("Processing Boards Data Retention",
				mlog.Int("Total deleted ids", i),
				mlog.Int("TotalAffected", totalAffected))

			for _, table := range deleteTables {
				affected, err := s.genericRetentionPoliciesDeletion(db, table, deleteIDsBatch, batchSize)
				if err != nil {
					return int64(totalAffected), err
				}
				totalAffected += int(affected)
			}
		}
	}

	// Clean up Subscription table
	s.logger.Info("Processing Boards Data Retention Cleanup")
	for _, table := range cleanupTable {
		affected, err := s.genericRetentionTableCleanup(db, table, batchSize)
		if err != nil {
			return int64(totalAffected), err
		}
		totalAffected += int(affected)
	}

	s.logger.Info("Complete Boards Data Retention",
		mlog.Int("Total deletion ids", len(deleteIds)),
		mlog.Int("TotalAffected", totalAffected))
	return int64(totalAffected), nil
}

func idsFromRows(rows *sql.Rows) ([]string, error) {
	deleteIds := []string{}
	for rows.Next() {
		var boardID string
		err := rows.Scan(
			&boardID,
		)
		if err != nil {
			return nil, err
		}
		deleteIds = append(deleteIds, boardID)
	}
	return deleteIds, nil
}

// genericRetentionPoliciesDeletion actually executes the DELETE query
// using a sq.SelectBuilder which selects the rows to delete.
func (s *SQLStore) genericRetentionPoliciesDeletion(
	db sq.BaseRunner,
	tableInfo RetentionTableDeletionInfo,
	deleteIds []string,
	batchSize int64,
) (int64, error) {
	var totalRowsAffected int64

	deleteQuery := s.getQueryBuilder(db).
		Delete(s.tablePrefix + tableInfo.Table).
		Where(sq.Eq{tableInfo.ParentIDColumn: deleteIds})

	if batchSize > 0 {
		deleteQuery.Limit(uint64(batchSize))
	}

	rowsAffected, err := executeDeleteQuery(deleteQuery, batchSize)
	if err != nil {
		return 0, errors.Wrap(err, "failed to delete "+tableInfo.Table)
	}
	totalRowsAffected += rowsAffected
	return totalRowsAffected, nil
}

func (s *SQLStore) genericRetentionTableCleanup(
	db sq.BaseRunner,
	tableInfo OrphanTableCleanupInfo,
	batchSize int64,
) (int64, error) {
	var totalRowsAffected int64

	// SELECT block_id FROM mattermost_test.focalboard_subscriptions AS S
	// LEFT JOIN mattermost_test.focalboard_blocks AS B ON S.block_id = B.id
	// WHERE isNull(B.id);
	selectQuery := s.getQueryBuilder(db).
		Select(tableInfo.TableJoinColumn).
		From(s.tablePrefix + tableInfo.Table + " AS S").
		LeftJoin((s.tablePrefix + tableInfo.ParentTable + " AS B ON S." + tableInfo.TableJoinColumn + " == B." + tableInfo.ParentJoinColumn)).
		Where(sq.Eq{tableInfo.ParentJoinColumn: nil})
	selectString, _, _ := selectQuery.ToSql()

	deleteQuery := s.getQueryBuilder(db).
		Delete(s.tablePrefix + tableInfo.Table).
		Where(tableInfo.TableJoinColumn + " IN (" + selectString + ")")

	if batchSize > 0 {
		deleteQuery.Limit(uint64(batchSize))
	}

	rowsAffected, err := executeDeleteQuery(deleteQuery, batchSize)
	if err != nil {
		return 0, errors.Wrap(err, "failed to delete "+tableInfo.Table)
	}
	totalRowsAffected += rowsAffected
	return totalRowsAffected, nil
}

func executeDeleteQuery(deleteQuery sq.DeleteBuilder, batchSize int64) (int64, error) {

	var totalRowsAffected int64
	for {
		result, err := deleteQuery.Exec()
		if err != nil {
			return totalRowsAffected, errors.Wrap(err, "delete query failed")
		}

		rowsAffected, err := result.RowsAffected()
		if err != nil {
			return totalRowsAffected, errors.Wrap(err, "failed to get rows affected for delete query")
		}
		totalRowsAffected += rowsAffected
		if batchSize == 0 || rowsAffected != batchSize {
			break
		}
	}
	return totalRowsAffected, nil
}
