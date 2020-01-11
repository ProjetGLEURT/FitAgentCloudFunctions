const {google} = require('googleapis');
const fs = require('fs');
const {promisify} = require('util');
const readFileAsync = promisify(fs.readFile);

const CREDENTIALS_FILE = "credentials.json";

exports.authorize = async function (token) {
    let credentials = await readCredentials();

    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials({access_token: token});

    return oAuth2Client;
};

async function readCredentials() {
    try {
        let contents = await readFileAsync(CREDENTIALS_FILE);
        return JSON.parse(contents);
    } catch (err) {
        throw new Error("Error reading credentials file: " + err);
    }
}
