// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React, {createContext, ReactElement, ReactNode, useContext, useMemo, useState} from 'react'

import {useIntl} from 'react-intl'

import {FileSizeError} from '../content/imageElement'

import {Block} from '../../blocks/block'
import {Card} from '../../blocks/card'
import {ContentHandler} from '../content/contentRegistry'
import mutator from '../../mutator'
import {sendFlashMessage} from '../flashMessages'

export function getFormattedFileSize(fileSize: number): string {
    const fileSizes = [
        ['TB', 1024 * 1024 * 1024 * 1024],
        ['GB', 1024 * 1024 * 1024],
        ['MB', 1024 * 1024],
        ['KB', 1024],
    ]
    const size = fileSizes.find((unitAndMinBytes) => {
        const minBytes = unitAndMinBytes[1]
        return fileSize > minBytes
    })

    if (size) {
        return `${Math.floor(fileSize / (size[1] as any))} ${size[0]}`
    }

    return `${fileSize} B`
}

export type AddedBlock = {
    id: string
    autoAdded: boolean
}

export type CardDetailContextType = {
    card: Card
    lastAddedBlock: AddedBlock
    addBlock: (handler: ContentHandler, index: number, auto: boolean) => void
    deleteBlock: (block: Block, index: number) => void
}

export const CardDetailContext = createContext<CardDetailContextType | null>(null)

export function useCardDetailContext(): CardDetailContextType {
    const cardDetailContext = useContext(CardDetailContext)
    if (!cardDetailContext) {
        throw new Error('CardDetailContext is not available!')
    }
    return cardDetailContext
}

type CardDetailProps = {
    card: Card
    children: ReactNode
}

export const CardDetailProvider = (props: CardDetailProps): ReactElement => {
    const intl = useIntl()
    const [lastAddedBlock, setLastAddedBlock] = useState<AddedBlock>({
        id: '',
        autoAdded: false,
    })
    const {card} = props
    const contextValue = useMemo(() => ({
        card,
        lastAddedBlock,
        addBlock: async (handler: ContentHandler, index: number, auto: boolean) => {
            await handler.createBlock(card.rootId).then((block) => {
                block.parentId = card.id
                block.rootId = card.rootId
                const typeName = handler.getDisplayText(intl)
                const description = intl.formatMessage({id: 'ContentBlock.addElement', defaultMessage: 'add {type}'}, {type: typeName})
                mutator.performAsUndoGroup(async () => {
                    const insertedBlock = await mutator.insertBlock(block, description)
                    const contentOrder = card.fields.contentOrder.slice()
                    contentOrder.splice(index, 0, insertedBlock.id)
                    setLastAddedBlock({
                        id: insertedBlock.id,
                        autoAdded: auto,
                    })
                    await mutator.changeCardContentOrder(card.id, card.fields.contentOrder, contentOrder, description)
                })
            }).catch((err: FileSizeError) => {
                const errorMessage = intl.formatMessage({
                    id: 'file_upload.fileAbove',
                    defaultMessage: 'Files must be less than {max}',
                }, {
                    max: getFormattedFileSize(err.fileSize),
                })
                const contentM = (<b>{errorMessage}</b>)
                sendFlashMessage({content: contentM, severity: 'normal'})
            })
        },
        deleteBlock: async (block: Block, index: number) => {
            const contentOrder = card.fields.contentOrder.slice()
            contentOrder.splice(index, 1)
            const description = intl.formatMessage({id: 'ContentBlock.DeleteAction', defaultMessage: 'delete'})
            await mutator.performAsUndoGroup(async () => {
                await mutator.deleteBlock(block, description)
                await mutator.changeCardContentOrder(card.id, card.fields.contentOrder, contentOrder, description)
            })
        },
    }), [card, lastAddedBlock, intl])
    return (
        <CardDetailContext.Provider value={contextValue}>
            {props.children}
        </CardDetailContext.Provider>
    )
}
