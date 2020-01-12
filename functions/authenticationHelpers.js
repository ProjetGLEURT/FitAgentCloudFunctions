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

let authorizze = async function (token) {
    let credentials = await readCredentials();

    const { client_secret, client_id, redirect_uris } = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials({ access_token: token });

    return oAuth2Client;
};

async function getTokenInfosFromToken(token) {
    let oAuth2Client = await authorizze(token);
    return await oAuth2Client.getTokenInfo(token);
}

exports.getTokenFromUrl = function (request) {
    let token = request.header("Authorization")
    token = token.substr(7);
    console.log("Token Extracted from request : ", token)
    return token
}

exports.getEmailFromToken = async function (token) {
    const tokenInfos = await getTokenInfosFromToken(token)
    console.log("TOKEN INFO", tokenInfos)
    return tokenInfos.email
}