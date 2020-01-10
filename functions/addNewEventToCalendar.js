const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

exports.addNewEventToGoogleCalendar = function (eventData, token) {
    fs.readFile('credentials.json', (err, content) => {
        if (err) {
            throw err;
        }
        const auth = authorize(JSON.parse(content), token);
        return addEvent(eventData, auth);
    })
};

exports.setEventData = function (event) {
    try {
        return {
            summary: 'Séance de : ' + event.activity,
            location: 'Endroit où on fait du sport',
            description: 'On va faire du sport.',
            start: {
                dateTime: '2019-01-10T09:00:00-09:00',
                timeZone: 'Europe/Paris'
            },
            end: {
                dateTime: '2019-01-10T09:00:00-10:00',
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
    } catch (err) {
        throw(err);
    }
};

function authorize(credentials, token) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    console.log(client_secret, client_id, redirect_uris, token);
    oAuth2Client.setCredentials({access_token: token});
    console.log(oAuth2Client);
    return oAuth2Client;
}

function addEvent(event, auth) {
    const calendar = google.calendar({version: 'v3', auth});
    return calendar.events.insert({
        calendarId: 'primary',
        resource: event,
    }, (err, eventsRessource) => {
        if (err) {
            console.log('There was an error contacting the Calendar service: ' + err);
            return;
        }
        console.log('Event created: %s', eventsRessource.data.htmlLink);
    });
}
