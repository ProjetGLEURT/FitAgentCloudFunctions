const {google} = require('googleapis');
const fs = require('fs');
const {promisify} = require('util');
const readFileAsync = promisify(fs.readFile);

const CREDENTIALS_FILE = "credentials.json";

exports.authorize = authorize;

async function authorize(token) {
    let credentials = await readCredentials();

    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
    oAuth2Client.setCredentials({access_token: token});

    return oAuth2Client;
}

async function readCredentials() {
    try {
        let contents = await readFileAsync(CREDENTIALS_FILE);
        return JSON.parse(contents);
    } catch (err) {
        throw new Error("Error reading credentials file: " + err);
    }

}

async function getTokenInfosFromToken(token) {
    let oAuth2Client = await authorize(token);
    return await oAuth2Client.getTokenInfo(token);
}

exports.getTokenFromUrl = function (request) {
    let token = request.header("Authorization");
    token = token.substr(7);
    console.log("Token Extracted from request : ", token);
    return token
};

exports.getEmailFromToken = async function (token) {
    const tokenInfos = await getTokenInfosFromToken(token);
    console.log("TOKEN INFO", tokenInfos);
    return tokenInfos.email
};

exports.initializeFirebaseUser = function (token, userEmail, response){
    let data = {
        infos:
        {
            name: userEmail,
            minSportBeginTime: "8",
            maxSportEndTime: "22",
            email: userEmail,
            address: "",
            token: token,
        },
        activities: {}
    };
    usersRef.push(data);
    response.send(data)
};

exports.initializeFirebaseUser = function (token, userEmail, response) {
    let data = {
        infos:
        {
            name: userEmail,
            minSportBeginTime: "8",
            maxSportEndTime: "22",
            email: userEmail,
            address: "",
            token: token,
        },
        activities: {}
    };
    usersRef.push(data);
    response.send(data)
};

exports.refreshTokenInFirebase = async function (token, response, promesseRequeteUser){ //deprecated

    let idUser = Object.keys(promesseRequeteUser.val())[0];
    const myUserRef = usersRef.child(idUser);
    const myUserInfosRef = myUserRef.child('infos');
    let data = {
        token: token,
    };
    myUserInfosRef.update(data);
    response.send(await myUserRef.once("value"))
};
