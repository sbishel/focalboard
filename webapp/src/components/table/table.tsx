// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'
import {FormattedMessage} from 'react-intl'
import {useDrop, useDragLayer} from 'react-dnd'

import {IPropertyTemplate} from '../../blocks/board'
import {MutableBoardView} from '../../blocks/boardView'
import {Card} from '../../blocks/card'
import {Constants} from '../../constants'
import mutator from '../../mutator'
import {Utils} from '../../utils'
import {BoardTree} from '../../viewModel/boardTree'
import {OctoUtils} from './../../octoUtils'

import './table.scss'
import TableHeader from './tableHeader'
import TableRow from './tableRow'

type Props = {
    boardTree: BoardTree
    selectedCardIds: string[]
    readonly: boolean
    cardIdToFocusOnRender: string
    showCard: (cardId?: string) => void
    addCard: (show: boolean) => Promise<void>
    onCardClicked: (e: React.MouseEvent, card: Card) => void
}

// Eventually, these will need to come from the theme.
// Currently, the theme doesn't change any padding or font descriptor
const header = {
    fontDescriptor: 'bolder 14px sans-serif',
    padding: 22
}
const select = {
    fontDescriptor: 'bolder 13px sans-serif',
    padding: 56
}
const text = {
    fontDescriptor: '14px sans-serif',
    padding: 30
}
const title = {
    fontDescriptor: '14px sans-serif',
    padding: 57
}

// re-use canvas object for better performance
const canvas =  document.createElement('canvas') as HTMLCanvasElement;
function getTextWidth(text: string, font_descriptor: string) {
    if( text != '') {
        var context = canvas.getContext('2d');
        if( context ){
            context.font = font_descriptor;
            var metrics = context.measureText(text);
            return Math.ceil(metrics.width);
        }    
    }
    return 0;
}

const Table = (props: Props) => {
    const {boardTree} = props
    const {board, cards, activeView} = boardTree

    const {offset, resizingColumn} = useDragLayer((monitor) => {
        if (monitor.getItemType() === 'horizontalGrip') {
            return {
                offset: monitor.getDifferenceFromInitialOffset()?.x || 0,
                resizingColumn: monitor.getItem()?.id,
            }
        }
        return {
            offset: 0,
            resizingColumn: '',
        }
    })

    const [, drop] = useDrop(() => ({
        accept: 'horizontalGrip',
        drop: (item: {id: string}, monitor) => {
            const columnWidths = {...activeView.columnWidths}
            const finalOffset = monitor.getDifferenceFromInitialOffset()?.x || 0
            const newWidth = Math.max(Constants.minColumnWidth, (columnWidths[item.id] || 0) + (finalOffset || 0))
            if (newWidth !== columnWidths[item.id]) {
                columnWidths[item.id] = newWidth

                const newView = new MutableBoardView(activeView)
                newView.columnWidths = columnWidths
                mutator.updateBlock(newView, activeView, 'resize column')
            }
        },
    }), [activeView])

    const onAutoSizeColumn = ((columnID: string) => {
        var longestSize = 0;

        const visibleProperties = board.cardProperties.filter((template) => activeView.visiblePropertyIds.includes(columnID))

        if(columnID == Constants.titleColumnId){
            cards.forEach((card) => {
                const thisLen = getTextWidth(card.title, title.fontDescriptor)
                if( thisLen > longestSize){
                    longestSize = thisLen
                }
            })
            longestSize += title.padding
        } else{
            const template = visibleProperties.find((t) => t.id == columnID)
            if(!template) return

            // Set to Header size initally
            longestSize = getTextWidth(template.name.toUpperCase(), header.fontDescriptor) + header.padding

            var padding = text.padding
            var fontDescriptor = text.fontDescriptor
            if (template.type === 'select') {
                padding = select.padding
                fontDescriptor = select.fontDescriptor
            }

            cards.forEach((card) => {
                const propertyValue = card.properties[columnID]
                var displayValue = OctoUtils.propertyDisplayValue(card, propertyValue, template!) || ''
                if (template.type === 'select') {
                    displayValue = displayValue.toUpperCase()
                }

                const thisLen = getTextWidth(displayValue, fontDescriptor) + padding
                if( thisLen > longestSize){
                    longestSize = thisLen
                }
            })
        }

        if( longestSize == 0 ) return
        const columnWidths = {...activeView.columnWidths}
        columnWidths[columnID] = longestSize;
        const newView = new MutableBoardView(activeView)
        newView.columnWidths = columnWidths
        mutator.updateBlock(newView, activeView, 'autosize column')
    })

    const onDropToCard = (srcCard: Card, dstCard: Card) => {
        Utils.log(`onDropToCard: ${dstCard.title}`)
        const {selectedCardIds} = props

        const draggedCardIds = Array.from(new Set(selectedCardIds).add(srcCard.id))
        const description = draggedCardIds.length > 1 ? `drag ${draggedCardIds.length} cards` : 'drag card'

        // Update dstCard order
        let cardOrder = Array.from(new Set([...activeView.cardOrder, ...boardTree.cards.map((o) => o.id)]))
        const isDraggingDown = cardOrder.indexOf(srcCard.id) <= cardOrder.indexOf(dstCard.id)
        cardOrder = cardOrder.filter((id) => !draggedCardIds.includes(id))
        let destIndex = cardOrder.indexOf(dstCard.id)
        if (isDraggingDown) {
            destIndex += 1
        }
        cardOrder.splice(destIndex, 0, ...draggedCardIds)

        mutator.performAsUndoGroup(async () => {
            await mutator.changeViewCardOrder(activeView, cardOrder, description)
        })
    }

    const onDropToColumn = async (template: IPropertyTemplate, container: IPropertyTemplate) => {
        Utils.log(`ondrop. Source column: ${template.name}, dest column: ${container.name}`)

        // Move template to new index
        const destIndex = container ? board.cardProperties.indexOf(container) : 0
        await mutator.changePropertyTemplateOrder(board, template, destIndex >= 0 ? destIndex : 0)
    }

    const titleSortOption = activeView.sortOptions.find((o) => o.propertyId === Constants.titleColumnId)
    let titleSorted: 'up' | 'down' | 'none' = 'none'
    if (titleSortOption) {
        titleSorted = titleSortOption.reversed ? 'up' : 'down'
    }

    return (
        <div
            className='octo-table-body Table'
            ref={drop}
        >
            {/* Headers */}

            <div
                className='octo-table-header'
                id='mainBoardHeader'
            >
                <TableHeader
                    name={
                        <FormattedMessage
                            id='TableComponent.name'
                            defaultMessage='Name'
                        />
                    }
                    sorted={titleSorted}
                    readonly={props.readonly}
                    boardTree={boardTree}
                    template={{id: Constants.titleColumnId, name: 'title', type: 'text', options: []}}
                    offset={resizingColumn === Constants.titleColumnId ? offset : 0}
                    onDrop={onDropToColumn}
                    onAutoSizeColumn={onAutoSizeColumn}
                />

                {/* Table header row */}

                {board.cardProperties.
                    filter((template) => activeView.visiblePropertyIds.includes(template.id)).
                    map((template) => {
                        let sorted: 'up' | 'down' | 'none' = 'none'
                        const sortOption = activeView.sortOptions.find((o) => o.propertyId === template.id)
                        if (sortOption) {
                            sorted = sortOption.reversed ? 'up' : 'down'
                        }

                        return (
                            <TableHeader
                                name={template.name}
                                sorted={sorted}
                                readonly={props.readonly}
                                boardTree={boardTree}
                                template={template}
                                key={template.id}
                                offset={resizingColumn === template.id ? offset : 0}
                                onDrop={onDropToColumn}
                                onAutoSizeColumn={onAutoSizeColumn}
                            />
                        )
                    })}
            </div>

            {/* Rows, one per card */}

            {cards.map((card) => {
                const tableRow = (
                    <TableRow
                        key={card.id + card.updateAt}
                        boardTree={boardTree}
                        card={card}
                        isSelected={props.selectedCardIds.includes(card.id)}
                        focusOnMount={props.cardIdToFocusOnRender === card.id}
                        onSaveWithEnter={() => {
                            if (cards.length > 0 && cards[cards.length - 1] === card) {
                                props.addCard(false)
                            }
                        }}
                        onClick={(e: React.MouseEvent<HTMLDivElement>) => {
                            props.onCardClicked(e, card)
                        }}
                        showCard={props.showCard}
                        readonly={props.readonly}
                        onDrop={onDropToCard}
                        offset={offset}
                        resizingColumn={resizingColumn}
                    />)

                return tableRow
            })}

            {/* Add New row */}

            <div className='octo-table-footer'>
                {!props.readonly &&
                    <div
                        className='octo-table-cell'
                        onClick={() => {
                            props.addCard(false)
                        }}
                    >
                        <FormattedMessage
                            id='TableComponent.plus-new'
                            defaultMessage='+ New'
                        />
                    </div>
                }
            </div>
        </div>
    )
}

export default Table
