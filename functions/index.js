// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const firebase = require('firebase');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

var firebaseConfig = require("./firebaseconfig.json");

firebase.initializeApp(firebaseConfig);

const dbRef = firebase.database().ref();
const usersRef = dbRef.child('users');

const {addNewEventToGoogleCalendar} = require('./addNewEventToCalendar');

exports.addNewEventToCalendar = functions.database.ref('/users/{userId}/events/{eventId}')
    .onCreate((snapshot, context) => {
        const event = snapshot.val();
        const eventData = {
            summary: 'Google I/O 2015',
            location: '1 Avenue du Dr Albert Schweitzer, 33400 Talence',
            description: 'Represent our final project',
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
                    { method: 'popup', minutes: 10 }
                ]
            }
        };

        const token = snapshot.ref.parent.parent.parent.child('infos/token').val();
        addNewEventToGoogleCalendar(eventData, token);
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request, response});
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
        agent.add(`I didn't understand`);
        agent.add(`I'm sorry, can you try again?`);
    }

    // Uncomment and edit to make your own intent handler
    // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
    // below to get this function to be run when a Dialogflow intent is matched
    function addUserInfosToFirebase(agent) {

        var data = {
            infos:
                {
                    nom: agent.contexts[0].parameters.any,
                    preference: "afternoon",
                }
        }
        usersRef.push(data)
        //const userRef = dbRef.child('users/' + e.target.getAttribute("userid"));
        agent.add(`Ok vous êtes inscrit - enregistrez une nouvelle activité ?`);

        agent.setContext({name: 'New Activity', lifespan: 2, parameters: {}});
    }


    function computeDuration(durationUnit, durationAmount) {
        if (durationUnit === "heure")
            return (durationAmount * 60);
        return durationAmount;
    }

    function addUserActivityToFirebase(agent) {

        usersRef.orderByChild('infos/nom').equalTo('david').on("value", function (snapshot) {
            console.log(snapshot.val());
            snapshot.forEach(function (data) {
                console.log(data);
            });
        });
        //console.log(agent.contexts[0].parameters)

        //myUser = usersRef.child().child("name").equalTo("david");
        //console.log(myUser)
        var durationUnit = agent.contexts[0].parameters.duration.unit;
        var durationAmount = agent.contexts[0].parameters.duration.amount;
        var durationInMinute = computeDuration(durationUnit, durationAmount);

        var data = {
            activities:
                {
                    nom: agent.contexts[0].parameters.sport,
                    frequence: agent.contexts[0].parameters.frequence,
                    duration: durationInMinute,
                }
        }
        usersRef.push(data)
        //const userRef = dbRef.child('users/' + e.target.getAttribute("userid"));
        agent.add(`OK COOOL : ${agent.contexts[0].parameters.sport}, ${agent.contexts[0].parameters.frequence}, ${durationInMinute} minutes`);

        agent.setContext({name: 'New Activity', lifespan: 2, parameters: {}});
    }


    // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
    // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('add User', addUserInfosToFirebase);
    intentMap.set('New Activity', addUserActivityToFirebase);


    // intentMap.set('your intent name here', googleAssistantHandler);
    agent.handleRequest(intentMap);
});


/*
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    function checkActivityName(agent) {
      agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
      let context = agent.getContext();
    }

    // // Uncomment and edit to make your own Google Assistant intent handler
    // // uncomment `intentMap.set('your intent name here', googleAssistantHandler);`
    // // below to get this function to be run when a Dialogflow intent is matched
    // function googleAssistantHandler(agent) {
    //   let conv = agent.conv(); // Get Actions on Google library conv instance
    //   conv.ask('Hello from the Actions on Google client library!') // Use Actions on Google library
    //   agent.add(conv); // Add Actions on Google library responses to your agent's response
    // }
    // // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
    // // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    // intentMap.set('your intent name here', yourFunctionHandler);
    intentMap.set('', googleAssistantHandler);
    agent.handleRequest(intentMap);
});*/
