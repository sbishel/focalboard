// Copyright (c) 2015-present Mattermost, Inc. All Rights Reserved.
// See LICENSE.txt for license information.
import React from 'react'

// import {FormattedMessage} from 'react-intl'

// import {BlockIcons} from '../../blockIcons'
// import mutator from '../../mutator'
import {Calendar, momentLocalizer, EventProps} from 'react-big-calendar'

// import withDragAndDrop from 'react-big-calendar/lib/addons/dragAndDrop'
// import 'react-big-calendar/lib/addons/dragAndDrop/styles.css'
import 'react-big-calendar/lib/css/react-big-calendar.css'

import moment from 'moment'

import {BoardTree} from '../../viewModel/boardTree'

// import Button from '../../widgets/buttons/button'
// import Editable from '../../widgets/editable'
// import EmojiIcon from '../../widgets/icons/emoji'

// import BlockIconSelector from '../blockIconSelector'

// Setup the localizer by providing the moment (or globalize) Object
// to the correct localizer.

// class CalendarResource {
//     title: string
//     id: string

//     constructor(id: string, title: string) {
//         this.id = id
//         this.title = title
//     }
// }

const localizer = momentLocalizer(moment) // or globalizeLocalizer

// const DnDCalendar = withDragAndDrop(Calendar)

type Props = {
    boardTree: BoardTree

    // cardTree: CardTree
    // readonly: boolean
}

type CalendarEvent ={
    id: string,
    title: string;
    properties: Record<string, string | string[]>;
    start: Date;
    end: Date;
}

const CalendarView = (props: Props): JSX.Element|null => {
    // const now = new Date()
    const myEventsList = props.boardTree.allCards.map((card) => {
        return {
            id: card.id,
            title: card.title,
            properties: card.properties,

            // allDay: true,
            start: new Date(card.createAt),
            end: new Date(card.createAt),
        }
    })

    const EventComponent = (eventProps: EventProps<CalendarEvent>): JSX.Element|null => {
        console.log(eventProps)
        console.log(eventProps.event.properties['7b55f22b-64f8-4c09-8752-fd72c4eae523'])
        return (
            <div>
                <h1>{eventProps.title}</h1>
                <div>{eventProps.event.properties['7b55f22b-64f8-4c09-8752-fd72c4eae523']}</div>
            </div>
        )
    }

    // const onEventResize = () => void {

    //     // const {start, end} = data

    //     // this.setState((state) => {
    //     //   state.events[0].start = start
    //     //   state.events[0].end = end;
    //     //   return { events: [...state.events] }
    //     // })
    // }

    // const onEventDrop = () => void {
    //     console.log('hjere')
    // }

    return (
        <div style={{height: '100vh'}}>
            <Calendar
                localizer={localizer}
                events={myEventsList}
                startAccessor='start'
                endAccessor='end'
                components={{
                    event: EventComponent,
                }}

                // onEventDrop={onEventDrop}
                // onEventResize={onEventResize}
            />
        </div>
    )

    // [
    //     {
    //         id: 0,
    //         title: 'All Day Event very long title',
    //         allDay: true,
    //         start: new Date(2015, 3, 0),
    //         end: new Date(2015, 3, 1),
    //     },
    //     {
    //         id: 1,
    //         title: 'Long Event',
    //         start: new Date(2015, 3, 7),
    //         end: new Date(2015, 3, 10),
    //     },
    //     {
    //         id: 2,
    //         title: 'DTS STARTS',
    //         start: new Date(2016, 2, 13, 0, 0, 0),
    //         end: new Date(2016, 2, 20, 0, 0, 0),
    //     },
    //     {
    //         id: 3,
    //         title: 'DTS ENDS',
    //         start: new Date(2016, 10, 6, 0, 0, 0),
    //         end: new Date(2016, 10, 13, 0, 0, 0),
    //     },
    //     {
    //         id: 4,
    //         title: 'Some Event',
    //         start: new Date(2015, 3, 9, 0, 0, 0),
    //         end: new Date(2015, 3, 10, 0, 0, 0),
    //     },
    //     {
    //         id: 5,
    //         title: 'Conference',
    //         start: new Date(2015, 3, 11),
    //         end: new Date(2015, 3, 13),
    //         desc: 'Big conference for important people',
    //     },
    //     {
    //         id: 6,
    //         title: 'Meeting',
    //         start: new Date(2015, 3, 12, 10, 30, 0, 0),
    //         end: new Date(2015, 3, 12, 12, 30, 0, 0),
    //         desc: 'Pre-meeting meeting, to prepare for the meeting',
    //     },
    //     {
    //         id: 7,
    //         title: 'Lunch',
    //         start: new Date(2015, 3, 12, 12, 0, 0, 0),
    //         end: new Date(2015, 3, 12, 13, 0, 0, 0),
    //         desc: 'Power lunch',
    //     },
    //     {
    //         id: 8,
    //         title: 'Meeting',
    //         start: new Date(2015, 3, 12, 14, 0, 0, 0),
    //         end: new Date(2015, 3, 12, 15, 0, 0, 0),
    //     },
    //     {
    //         id: 9,
    //         title: 'Happy Hour',
    //         start: new Date(2015, 3, 12, 17, 0, 0, 0),
    //         end: new Date(2015, 3, 12, 17, 30, 0, 0),
    //         desc: 'Most important meal of the day',
    //     },
    //     {
    //         id: 10,
    //         title: 'Dinner',
    //         start: new Date(2015, 3, 12, 20, 0, 0, 0),
    //         end: new Date(2015, 3, 12, 21, 0, 0, 0),
    //     },
    //     {
    //         id: 11,
    //         title: 'Planning Meeting with Paige',
    //         start: new Date(2015, 3, 13, 8, 0, 0),
    //         end: new Date(2015, 3, 13, 10, 30, 0),
    //     },
    //     {
    //         id: 11.1,
    //         title: 'Inconvenient Conference Call',
    //         start: new Date(2015, 3, 13, 9, 30, 0),
    //         end: new Date(2015, 3, 13, 12, 0, 0),
    //     },
    //     {
    //         id: 11.2,
    //         title: "Project Kickoff - Lou's Shoes",
    //         start: new Date(2015, 3, 13, 11, 30, 0),
    //         end: new Date(2015, 3, 13, 14, 0, 0),
    //     },
    //     {
    //         id: 11.3,
    //         title: 'Quote Follow-up - Tea by Tina',
    //         start: new Date(2015, 3, 13, 15, 30, 0),
    //         end: new Date(2015, 3, 13, 16, 0, 0),
    //     },
    //     {
    //         id: 12,
    //         title: 'Late Night Event',
    //         start: new Date(2015, 3, 17, 19, 30, 0),
    //         end: new Date(2015, 3, 18, 2, 0, 0),
    //     },
    //     {
    //         id: 12.5,
    //         title: 'Late Same Night Event',
    //         start: new Date(2015, 3, 17, 19, 30, 0),
    //         end: new Date(2015, 3, 17, 23, 30, 0),
    //     },
    //     {
    //         id: 13,
    //         title: 'Multi-day Event',
    //         start: new Date(2015, 3, 20, 19, 30, 0),
    //         end: new Date(2015, 3, 22, 2, 0, 0),
    //     },
    //     {
    //         id: 14,
    //         title: 'Today',
    //         start: new Date(new Date().setHours(new Date().getHours() - 3)),
    //         end: new Date(new Date().setHours(new Date().getHours() + 3)),
    //     },
    //     {
    //         id: 15,
    //         title: 'Point in Time Event',
    //         start: now,
    //         end: now,
    //     },
    //     {
    //         id: 16,
    //         title: 'Video Record',
    //         start: new Date(2015, 3, 14, 15, 30, 0),
    //         end: new Date(2015, 3, 14, 19, 0, 0),
    //     },
    //     {
    //         id: 17,
    //         title: 'Dutch Song Producing',
    //         start: new Date(2015, 3, 14, 16, 30, 0),
    //         end: new Date(2015, 3, 14, 20, 0, 0),
    //     },
    //     {
    //         id: 18,
    //         title: 'Itaewon Halloween Meeting',
    //         start: new Date(2015, 3, 14, 16, 30, 0),
    //         end: new Date(2015, 3, 14, 17, 30, 0),
    //     },
    //     {
    //         id: 19,
    //         title: 'Online Coding Test',
    //         start: new Date(2015, 3, 14, 17, 30, 0),
    //         end: new Date(2015, 3, 14, 20, 30, 0),
    //     },
    //     {
    //         id: 20,
    //         title: 'An overlapped Event',
    //         start: new Date(2015, 3, 14, 17, 0, 0),
    //         end: new Date(2015, 3, 14, 18, 30, 0),
    //     },
    //     {
    //         id: 21,
    //         title: 'Phone Interview',
    //         start: new Date(2015, 3, 14, 17, 0, 0),
    //         end: new Date(2015, 3, 14, 18, 30, 0),
    //     },
    //     {
    //         id: 22,
    //         title: 'Cooking Class',
    //         start: new Date(2015, 3, 14, 17, 30, 0),
    //         end: new Date(2015, 3, 14, 19, 0, 0),
    //     },
    //     {
    //         id: 23,
    //         title: 'Go to the gym',
    //         start: new Date(2015, 3, 14, 18, 30, 0),
    //         end: new Date(2015, 3, 14, 20, 0, 0),
    //     },
    // ]
}

export default CalendarView
