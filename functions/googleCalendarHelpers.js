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

exports.getFreeTimesFromGoogleCalendar = async function (token, timeMin, timeMax) {
    const auth = await authorize(token);
    let response = await getBusy(auth, timeMin, timeMax);
    let busyTimes = combineBusyTimesFromCalendars(response);
    busyTimes = convertIntervalsFromStringsToDates(busyTimes);
    busyTimes = resolveOverlappingIntervals(busyTimes);

    return getFreeTimes(busyTimes, timeMin, timeMax);
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
    return busyTimes.map(interval => {
        return {
            start: Date.parse(interval.start),
            end: Date.parse(interval.end)
        }
    })
}

function resolveOverlappingIntervals(busyTimes) {
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
    while (intervalEnd > intervals[i + 1].start) {
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
    return intervals.sort((int1, int2) => int1.start > int2.start)
}

function combineIntervals(intervals, firstIntervalToCombineIndex, lastIntervalToCombineIndex) {
    let newIntervals = intervals.slice(0, firstIntervalToCombineIndex);
    newIntervals.push(
        {
            start: intervals[firstIntervalToCombineIndex].start,
            end: getLatestEnd(intervals.slice(firstIntervalToCombineIndex, lastIntervalToCombineIndex + 1))
        }
    );
    if (lastIntervalToCombineIndex === intervals.length - 1) {
        return newIntervals;
    }

    return newIntervals.concat(intervals.slice(lastIntervalToCombineIndex + 1, intervals.length));
}

function getLatestEnd(intervals) {
    return intervals.reduce((latestEnd, interval) => interval.end > latestEnd ? interval.end : interval, 0)
}

function getFreeTimes(busyTimes, timeMin, timeMax) {
    let freeTimes = [
        {
            start: Date.parse(timeMin)
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
    freeTimes[freeTimes.length - 1].end = Date.parse(timeMax);

    return freeTimes;
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

async function getBusy(auth, timeMin, timeMax) {
    const calendar = google.calendar({version: 'v3', auth});
    let calendarIdList = await getCalendarIdList(auth);
    let query = {
        auth: auth,
        resource: {
            timeMin: timeMin,
            timeMax: timeMax,
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
