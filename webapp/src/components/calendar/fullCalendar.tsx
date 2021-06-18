// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'
import FullCalendar, {EventContentArg, EventClickArg} from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'

import interactionPlugin from '@fullcalendar/interaction'

import {BoardTree} from '../../viewModel/boardTree'

type Props = {
    boardTree: BoardTree
}

const CalendarFullView = (props: Props): JSX.Element|null => {
    const myEventsList = props.boardTree.allCards.map((card) => {
        return {
            id: card.id,
            title: card.title,
            myProps: card.properties,

            allDay: true,
            start: new Date(card.createAt),
            end: new Date(card.createAt),
        }
    })

    // const myEventsList = [
    //     {
    //         title: 'All Day Event',
    //         start: '2018-01-01',
    //         allDay: true,
    //     },
    //     {
    //         title: 'Long Event',
    //         start: '2018-01-07',
    //         end: '2018-01-10',
    //     },
    //     {
    //         groupId: '999',
    //         title: 'Repeating Event',
    //         start: '2018-01-09T16:00:00',
    //     },
    //     {
    //         groupId: '999',
    //         title: 'Repeating Event',
    //         start: '2018-01-16T16:00:00',
    //     },
    //     {
    //         title: 'Conference',
    //         start: '2018-01-11',
    //         end: '2018-01-13',
    //     },
    //     {
    //         title: 'Meeting',
    //         start: '2018-01-12T10:30:00',
    //         end: '2018-01-12T12:30:00',
    //     },
    //     {
    //         title: 'Lunch',
    //         start: '2018-01-12T12:00:00',
    //     },
    //     {
    //         title: 'Meeting',
    //         start: '2018-01-12T14:30:00',
    //     },
    //     {
    //         title: 'Happy Hour',
    //         start: '2018-01-12T17:30:00',
    //     },
    //     {
    //         title: 'Dinner',
    //         start: '2018-01-12T20:00:00',
    //     },
    //     {
    //         title: 'Birthday Party',
    //         start: '2018-01-13T07:00:00',
    //     },
    //     {
    //         title: 'Click for Google',
    //         url: 'http://google.com/',
    //         start: '2018-01-28',
    //     },
    // ]

    const EventComponent = (eventProps: EventContentArg): JSX.Element|null => {
        const {event} = eventProps

        // console.log(event)
        // console.log(event.extendedProps.myProps['7b55f22b-64f8-4c09-8752-fd72c4eae523'])
        return (
            <div className=''>
                <h1>{event.title}</h1>
                <div>{event.extendedProps.myProps['7b55f22b-64f8-4c09-8752-fd72c4eae523']}</div>
            </div>
        )
    }

    const EventClick = (eventProps: EventClickArg): void => {
        const {event} = eventProps
        const title = prompt('Event Title:', event.title)

        if (title) {
            event.setProp('title', title)

            // calendar.fullCalendar('updateEvent', event)
        }
    }

    return (
        <div style={{height: '100vh'}}>
            <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}

                // initialDate={'2018-01-12'}
                initialView='dayGridMonth'
                events={myEventsList}
                editable={true}
                eventClick={EventClick}

                eventContent={EventComponent}
            />
        </div>
    )
}

export default CalendarFullView
