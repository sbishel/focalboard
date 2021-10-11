// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import * as React from 'react'
import clsx from 'clsx'

export interface ICustomToolbarProps {
    view: string;
    views: any;
    label: any;
    localizer: any;
    onNavigate: (action: any) => void;
    onView: (view: any) => void;
}

export const navigateContants = {
    PREVIOUS: 'PREV',
    NEXT: 'NEXT',
    TODAY: 'TODAY',
    DATE: 'DATE',
}

export const views = {
    MONTH: 'month',
    WEEK: 'week',
    WORK_WEEK: 'work_week',
    DAY: 'day',
    AGENDA: 'agenda',
}

const CustomToolbar = (props: ICustomToolbarProps): JSX.Element|null => {
    const {localizer: {messages}} = props

    function navigate(action: string) {
        props.onNavigate(action)
    }

    function viewItem(view: string) {
        props.onView(view)
    }

    function viewNamesGroup() {
        const viewNames = props.views
        const view = props.view

        if (viewNames.length > 1) {
            return viewNames.map((name: string) => (
                <button
                    type='button'
                    key={name}
                    className={clsx('rbc-btn-view', {'rbc-active': view === name})}
                    onClick={viewItem.bind(null, name)}
                >
                    {messages[name as any]}
                </button>
            ))
        }
        return undefined
    }

    return (
        <div className='rbc-toolbar'>
            <span className='rbc-toolbar-label'>{props.label}</span>

            <span className='rbc-btn-group'>{viewNamesGroup()}</span>

            <span className='rbc-btn-group'>
                <button
                    type='button'
                    onClick={navigate.bind(null, navigateContants.PREVIOUS)}
                >
                    {'<'}
                </button>
                <button
                    type='button'
                    onClick={navigate.bind(null, navigateContants.TODAY)}
                >
                    {messages.today}
                </button>
                <button
                    type='button'
                    onClick={navigate.bind(null, navigateContants.NEXT)}
                >
                    {'>'}
                </button>
            </span>
        </div>
    )
}

export default CustomToolbar
