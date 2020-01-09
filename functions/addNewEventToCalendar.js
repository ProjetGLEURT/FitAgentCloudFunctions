const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

exports.addNewEventToGoogleCalendar = function(eventData, token) {
    fs.readFile('credentials.json', (err, content) => {
        if (err) {
            throw err;
        }
        const auth = authorize(JSON.parse(content), token);
        addEvent(eventData, token);
    })
}

function authorize(credentials, token) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials(token);
    return oAuth2Client;
}

function addEvent(event, auth) {
    const calendar = google.auth.calendar({version: 'v3', auth});
    calendar.events.insert({
        calendarId: 'primary',
        resource: event,
    }, (err, event) => {
        if (err) {
            console.log('There was an error contacting the Calendar service: ' + err);
            return;
        }
        console.log('Event created: %s', event.htmlLink);
    });
}
