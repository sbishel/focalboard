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
	PrimaryKeys    []string
	ParentIDColumn string
	ChildTables    []RetentionTableDeletionInfo
}

func (s *SQLStore) runDataRetention(db sq.BaseRunner, globalRetentionDate int64, batchSize int64) (int64, error) {
	s.logger.Info("Start Boards Data Retention",
		mlog.String("Global Retention Date", time.Unix(globalRetentionDate/1000, 0).String()),
		mlog.Int64("Raw Date", globalRetentionDate))
	deleteTables := []RetentionTableDeletionInfo{
		{
			Table:          "blocks",
			PrimaryKeys:    []string{"id"},
			ParentIDColumn: "board_id", //index
			ChildTables: []RetentionTableDeletionInfo{
				{
					Table:          "subscriptions",
					PrimaryKeys:    []string{"block_id", "subscriber_id"},
					ParentIDColumn: "block_id", //index
				},
				{
					Table:          "notification_hints",
					PrimaryKeys:    []string{"block_id", "subscriber_id"},
					ParentIDColumn: "block_id", //index
				},
			},
		},
		{
			Table:          "blocks_history",
			PrimaryKeys:    []string{"id"},
			ParentIDColumn: "board_id", //no index
		},
		{
			Table:          "boards",
			PrimaryKeys:    []string{"id"},
			ParentIDColumn: "id", //index
		},
		{
			Table:          "boards_history",
			PrimaryKeys:    []string{"id"},
			ParentIDColumn: "id", //index
		},
		{
			Table:          "board_members",
			PrimaryKeys:    []string{"board_id"},
			ParentIDColumn: "board_id", //index
		},
		{
			Table:          "board_members_history",
			PrimaryKeys:    []string{"board_id"},
			ParentIDColumn: "board_id", //index
		},
		{
			Table:          "sharing",
			PrimaryKeys:    []string{"id"},
			ParentIDColumn: "id", //index
		},
		{
			Table:          "category_boards",
			PrimaryKeys:    []string{"id"},
			ParentIDColumn: "board_id", //no index
		},
	}

	// Q1. Should use subquery or run subquery and use ids
	// Q2. Can delete all with same field name?

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

	for _, childInfo := range tableInfo.ChildTables {
		// Select id from blocks(info.table) where Where(sq.Eq{info.ParentIDColumn: deleteIds})
		selectQuery := s.getQueryBuilder(db).
			Select(childInfo.ParentIDColumn).
			From(s.tablePrefix + tableInfo.Table).
			Where(sq.Eq{childInfo.ParentIDColumn: deleteIds})
		selectString, _, _ := selectQuery.ToSql()

		// Delete from subscriptions where block_id in (Select id from blocks(info.table) where Where(sq.Eq{info.ParentIDColumn: deleteIds})
		deleteQuery := s.getQueryBuilder(db).
			Delete(s.tablePrefix + childInfo.Table).
			Where(childInfo.ParentIDColumn + " IN (" + selectString + ")")

		if batchSize > 0 {
			deleteQuery.Limit(uint64(batchSize))
		}
		rowsAffected, err := executeDeleteQuery(deleteQuery, batchSize)
		if err != nil {
			return 0, errors.Wrap(err, "failed to delete "+childInfo.Table)
		}
		totalRowsAffected += rowsAffected
	}

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
