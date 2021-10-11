// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.

import React from 'react'
import {FormattedMessage, useIntl} from 'react-intl'

import {Utils} from '../../utils'

import {IPropertyTemplate} from '../../blocks/board'
import {BoardView} from '../../blocks/boardView'
import mutator from '../../mutator'
import Button from '../../widgets/buttons/button'
import Menu from '../../widgets/menu'
import MenuWrapper from '../../widgets/menuWrapper'
import CheckIcon from '../../widgets/icons/check'

type Props = {
    properties: readonly IPropertyTemplate[]
    activeView: BoardView
    displayByPropertyName?: string
}

const ViewHeaderDisplayByMenu = React.memo((props: Props) => {
    const {properties, activeView, displayByPropertyName} = props

    // properties?.map((o: IPropertyTemplate) => Utils.log(o.name + o.type))

    const intl = useIntl()
    return (
        <MenuWrapper>
            <Button>
                <FormattedMessage
                    id='ViewHeader.display-by'
                    defaultMessage='Display by: {property}'
                    values={{
                        property: (
                            <span
                                style={{color: 'rgb(var(--center-channel-color-rgb))'}}
                                id='displayByLabel'
                            >
                                {displayByPropertyName}
                            </span>
                        ),
                    }}
                />
            </Button>
            <Menu>
                {properties?.filter((o: IPropertyTemplate) => o.type === 'date' || o.type === 'createdTime' || o.type === 'updatedTime').map((date: IPropertyTemplate) => (
                    <Menu.Text
                        key={date.id}
                        id={date.id}
                        name={date.name}
                        rightIcon={activeView.fields.dateDisplayId === date.id ? <CheckIcon/> : undefined}
                        onClick={(id) => {
                            if (activeView.fields.dateDisplayId === id) {
                                return
                            }

                            mutator.changeViewDateDisplayId(activeView.id, activeView.fields.dateDisplayId, id)
                        }}
                    />
                ))}
            </Menu>
        </MenuWrapper>
    )
})

export default ViewHeaderDisplayByMenu
