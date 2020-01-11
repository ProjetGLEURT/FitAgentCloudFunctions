const fs = require('fs');
const { promisify } = require('util');
const readFileAsync = promisify(fs.readFile);

const {google} = require('googleapis');

const CREDENTIALS_FILE = "credentials.json";

exports.addNewEventToGoogleCalendar = async function (eventData, token) {
    let content = await readCredentials();
    const auth = authorize(JSON.parse(content), token);
    return await insertEvent(eventData, auth);
};

exports.setEventData = function (event) {
    try {
        return {
            summary: 'Séance de : ' + event.activity || 'Sport Indéfini',
            location: event.location || 'Endroit où on fait du sport',
            description: 'Créé avec amour par FitAgent.',
            start: {
                dateTime: event.dateTimeStart || '2019-01-10T09:00:00-09:00',
                timeZone: 'Europe/Paris'
            },
            end: {
                dateTime: event.dateTimeEnd || '2019-01-10T09:00:00-10:00',
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

async function readCredentials() {
    try {
        return await readFileAsync(CREDENTIALS_FILE);
    } catch (err) {
        throw new Error("Error reading credentials file: " + err);
    }
}

function authorize(credentials, token) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials({access_token: token});
    return oAuth2Client;
}

async function insertEvent(event, auth) {
    const calendar = google.calendar({version: 'v3', auth});
    try {
        let eventsRessource = await calendar.events.insert({calendarId: 'primary', resource: event});
        console.log('Event created: %s', eventsRessource.data.htmlLink);
        return eventsRessource;
    } catch (err) {
        throw new Error('There was an error contacting the Calendar service: ' + err)
    }
}
