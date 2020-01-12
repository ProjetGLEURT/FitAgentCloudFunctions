const {google} = require('googleapis');
const {authorize} = require('./authenticationHelpers.js');

exports.addNewEventToGoogleCalendar = async function (eventData, token) {
    const auth = await authorize(token);
    return await insertEvent(eventData, auth);
};

exports.setEventData = function (event, activity) {
    let activityName = activity.name || "sport";
    let activityLocation = activity.location || 'Endroit où on fait du ' + activityName;

    let dateTimeStart = event.dateTimeStart || '2019-01-10T09:00:00-09:00';
    let dateTimeEnd = event.dateTimeEnd || '2019-01-10T09:00:00-10:00';
    if (!event.dateTimeStart) console.warn("No start datetime provided.");
    if (!event.dateTimeEnd) console.warn("No end datetime provided.");
    checkDateTimesCoherence(dateTimeStart, dateTimeEnd);

    return {
        summary: 'Séance de : ' + activityName,
        location: activityLocation,
        description: 'Créé avec amour par FitAgent.',
        start: {
            dateTime: dateTimeStart,
            timeZone: 'Europe/Paris'
        },
        end: {
            dateTime: dateTimeEnd,
            timeZone: 'Europe/Paris'
        },
        recurrence: ['RRULE:FREQ=DAILY;COUNT=1'],
        attendees: [],
        reminders: {
            useDefault: false,
            overrides: [
                {method: 'popup', minutes: 10}
            ]
        }
    }
};

function checkDateTimesCoherence(dateTimeStart, dateTimeEnd) {
    if (Date.parse(dateTimeStart) >= Date.parse(dateTimeEnd)) throw new Error("Incoherent dates, end date is older than" +
        " start date");
}

async function insertEvent(event, auth) {
    const calendar = google.calendar({version: 'v3', auth});
    try {
        let eventsRessource = await calendar.events.insert({calendarId: 'primary', resource: event});
        console.log('Google Calendar event created: %s', eventsRessource.data.htmlLink);
        return eventsRessource;
    } catch (err) {
        throw new Error('There was an error while inserting event in google calendar: ' + err)
    }
}

exports.deleteEventFromGoogleCalendar = async function (eventId, token) {
    let auth = await authorize(token);
    await deleteEvent(eventId, auth);
};

async function deleteEvent(eventId, auth) {
    const calendar = google.calendar({version: 'v3', auth});
    try {
        await calendar.events.delete({calendarId: 'primary', eventId: eventId});
        console.log('Event %s deleted from google calendar.', eventId);
    } catch (err) {
        throw new Error('There was an error while deleting an event in google calendar: ' + err)
    }
}

exports.getFreeTimesFromGoogleCalendar = async function (token, timeInterval, nightInterval) {
    const auth = await authorize(token);
    let response = await getBusyTimesFromGoogleCalendar(auth, timeInterval);
    let busyTimes = combineBusyTimesFromCalendars(response);
    convertIntervalsFromStringsToDates(busyTimes);
    addNightIntervals(busyTimes, timeInterval, nightInterval);
    let busyTimeUnion = getUnionOfIntervals(busyTimes);

    return getFreeTimes(busyTimeUnion, timeInterval);
};

function combineBusyTimesFromCalendars(response) {
    let busyTimes = [];
    let calendars = response.data.calendars;
    for (let calendar in calendars) {
        // skip loop if the property is from prototype
        if (!calendars.hasOwnProperty(calendar)) continue;
        busyTimes = busyTimes.concat(calendars[calendar].busy || []);
    }
    return busyTimes;
}

function convertIntervalsFromStringsToDates(busyTimes) {
    return busyTimes.forEach(interval => {
        interval.start = new Date(interval.start);
        interval.end = new Date(interval.end);
    })
}

// We allow nights to overlap out of the timeInterval as long as at least one of the boundaries is in the timeInterval.
// This is because we latter apply
function addNightIntervals(busyTimes, timeInterval, nightInterval) {
    let intervalStartDate = new Date(timeInterval.start);
    let intervalEndDate = new Date(timeInterval.end);

    let nightStartDate = hourToDate(nightInterval.start, intervalStartDate);
    let nightEndDate = hourToDate(nightInterval.end, intervalStartDate);
    decrementDay(nightStartDate);

    if (nightEndDate < intervalStartDate) {
        incrementDay(nightEndDate);
        incrementDay(nightStartDate);
    }

    while (nightStartDate < intervalEndDate) {
        busyTimes.push({
            start: new Date(nightStartDate),
            end: new Date(nightEndDate)
        });
        incrementDay(nightStartDate);
        incrementDay(nightEndDate);
    }
}

function hourToDate(hour, referenceDate) {
    let date = new Date(referenceDate);
    date.setHours(hour);
    return date;
}

function incrementDay(date) {
    date.setDate(date.getDate() + 1);
}

function decrementDay(date) {
    date.setDate(date.getDate() - 1);
}

function getUnionOfIntervals(busyTimes) {
    busyTimes = sortIntervalsByStartTime(busyTimes);
    let i = 0;
    while (i < busyTimes.length - 1) {
        let intervalEnd = busyTimes[i].end;
        let lastIntervalToCombineIndex = getLastIntervalToCombineIndex(busyTimes, intervalEnd);
        if (isNotOverlapping(busyTimes, i)) i++;
        else busyTimes = combineIntervals(busyTimes, i, lastIntervalToCombineIndex);
    }
    return busyTimes;
}

// We assume that i < intervals.length - 1
function getLastIntervalToCombineIndex(intervals, intervalEnd) {
    let i = 0;
    while (intervalEnd >= intervals[i + 1].start) {
        i++;
    }
    return i;
}

// We can assume that there is not overlap to the left. We thus only have to check overlap to the right.
// We also assume that i < intervals.length - 1.
function isNotOverlapping(intervals, i) {
    return intervals[i].end < intervals[i + 1].start;
}

function sortIntervalsByStartTime(intervals) {
    return intervals.sort((int1, int2) => {
        if (int1.start > int2.start) return 1;
        if (int1.start <= int2.start) return -1;
    })
}

function combineIntervals(intervals, firstIntervalToCombineIndex, lastIntervalToCombineIndex) {
    let newIntervals = intervals.slice(0, firstIntervalToCombineIndex);
    newIntervals.push(
        {
            start: intervals[firstIntervalToCombineIndex].start,
            end: getLatestEnd(intervals.slice(firstIntervalToCombineIndex, lastIntervalToCombineIndex + 1))
        }
    );

    return newIntervals.concat(intervals.slice(lastIntervalToCombineIndex + 1, intervals.length));
}

function getLatestEnd(intervals) {
    return intervals.reduce((latestEnd, interval) => interval.end > latestEnd ? interval.end : latestEnd, intervals[0].end)
}

function getFreeTimes(busyTimes, timeInterval) {
    let freeTimes = [
        {
            start: new Date(timeInterval.start)
        }
    ];
    busyTimes.forEach(busyInterval => {
        freeTimes[freeTimes.length - 1].end = busyInterval.start;
        freeTimes.push(
            {
                start: busyInterval.end
            }
        )
    });
    freeTimes[freeTimes.length - 1].end = new Date(timeInterval.end);

    return checkCoherenceOfIntervals(freeTimes);
}

// Removes intervals if they are empty or incoherent.
function checkCoherenceOfIntervals(intervals) {
    let coherentIntervals = [];

    intervals.forEach( interval => {
        if (interval.start < interval.end) coherentIntervals.push(interval);
    });

    return coherentIntervals;
}


async function getCalendarIdList(auth) {
    const calendar = google.calendar({version: 'v3', auth});
    let response;
    try {
        response = await calendar.calendarList.list();
    } catch (err) {
        throw new Error("Can't retrieve list of Google Calendars: " + err);
    }
    return getCalendarIds(response);
}

function getCalendarIds(response) {
    return response.data.items.map(item => {
        return {id: item.id}
    });
}

async function getBusyTimesFromGoogleCalendar(auth, timeInterval) {
    const calendar = google.calendar({version: 'v3', auth});
    let calendarIdList = await getCalendarIdList(auth);
    let query = {
        auth: auth,
        resource: {
            timeMin: timeInterval.start,
            timeMax: timeInterval.end,
            timeZone: 'Europe/Paris',
            items: calendarIdList
        }
    };
    try {
        return await calendar.freebusy.query(query);
    } catch (err) {
        throw new Error('There was an error while requesting freebusy info from Google Calendar: ' + err)
    }
}

