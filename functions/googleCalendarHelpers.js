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
