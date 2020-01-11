// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const {WebhookClient} = require('dialogflow-fulfillment');
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const functions = require('firebase-functions');

const firebase = require('firebase');
const firebaseConfig = require("./firebaseconfig.json");

firebase.initializeApp(firebaseConfig);
const dbRef = firebase.database().ref();
const usersRef = dbRef.child('users');

const keyApiGoogle = require("./keyApiGoogle.json");
const googleMapsClient = require('@google/maps').createClient({
    key: keyApiGoogle,
    Promise: Promise,
});
const {addNewEventToGoogleCalendar, setEventData} = require('./addNewEventToCalendar');
const {
    getNumContext,
    computeSeanceDuration,
    } = require("./dialogflowFirebaseFulfillment/addUserActivityToFirebase")

exports.addNewEventToCalendar = functions.database.ref('/users/{userId}/activities/{activityId}/events/{eventId}')
    .onCreate(async (snapshot, context) => {
        const event = snapshot.val();
        const eventRef = snapshot.ref;
        const userId = context.params.userId;
        const eventData = setEventData(event);

        let tokenSnapshot;
        try {
            tokenSnapshot = await usersRef.child(userId + '/infos/token').once("value");
        } catch (err) {
            console.error("Error getting user's access token: " + err);
        }
        let token = tokenSnapshot.val();

        let eventRessource;
        try {
            eventRessource = await addNewEventToGoogleCalendar(eventData, token);
        } catch (err) {
            console.error("Error adding google event id to firebase: " + err);
        }
        await addGoogleEventIdToFirebase(eventRessource.data.id, eventRef);
    });

async function addGoogleEventIdToFirebase(eventId, eventRef) {
    const data = {
        googleEventId: eventId
    };

    try {
        await eventRef.update(data);
    } catch (err) {
        console.error("Error getting user's access token: " + err);
    }
}

exports.apiSupprimerActiviteUser = functions.https.onRequest((request, response) => {
    var id = request.query.id;


    var promesseRequeteUser = Promise.resolve(usersRef.orderByChild('infos/name').equalTo('david').once("value"));

    return promesseRequeteUser.then(data => {

        var idUser = Object.keys(data.val())[0];
        const myUserRef = usersRef.child(idUser);
        const myUserActsRef = myUserRef.child('activities');
        console.log("id: ")
        console.log(id)
        console.log("myUserActsRef")
        console.log(myUserActsRef)
        myUserActsRef.child(id).remove();
        response.send("Suppression effectuée")
        return 0;
    })
        .catch(err => {
            console.log(err);
            response.send("ERREUR 1003", err);
            return 0;
        });
});

exports.apiActiviteUser = functions.https.onRequest((request, response) => {

    var promesseRequeteUser = Promise.resolve(usersRef.orderByChild('infos/name').equalTo('david').once("value"));

    return promesseRequeteUser.then(data => {
        var idUser = Object.keys(data.val())[0];
        const myUserActsRef = data.val()[idUser].activities;
        //const myUserActsRef = myUserRef.child('activities');
        response.send(myUserActsRef);
        return 0;
    })
    .catch(err => {
        console.log(err);
        response.send("ERREUR 1002", err);
        return 0;
    });
});


exports.test = functions.https.onRequest(async (request, response) => {

    var gpsHomePosition = [-33.8665433,151.1956316];

    var req = {
        location: gpsHomePosition,
        radius: 10000,
        type: 'train_station'
    };
    try{
        let res = await googleMapsClient.placesNearby(req).asPromise();
        console.log(res);
        return response.send(res);
    } catch (err) {
        console.log(err)
        throw(JSON.stringify(err, null, 4));
    }
});

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
  const agent = new WebhookClient({ request, response });
  console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
  console.log('Dialogflow Request body: ' + JSON.stringify(request.body));


   // Uncomment and edit to make your own intent handler
   // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
   // below to get this function to be run when a Dialogflow intent is matched
   function addUserInfosToFirebase(agent) {

    name = agent.contexts[0].parameters.any;


    var data = {infos:
        {
            name: name,
            preference:"afternoon",
            adresse:"9 rue Jean Luc Mélenchon",
        }
    }
    usersRef.push(data)
    //const userRef = dbRef.child('users/' + e.target.getAttribute("userid"));
     agent.add(`Ok vous êtes inscrit - enregistrez une nouvelle activité ?`);

     agent.context.set({ name: 'New Activity', lifespan: 2, parameters: { }});
   }



   function addUserActivityToFirebase(agent) {

    var promesseRequeteUser = Promise.resolve(usersRef.orderByChild('infos/name').equalTo('david').once("value"));

    return promesseRequeteUser.then(data => {

        var idUser = Object.keys(data.val())[0];
        const myUserRef = usersRef.child(idUser);
        const myUserActsRef = myUserRef.child('activities');



        console.log("BAH VOYONS")
        console.log(agent.contexts)

        var numContexte = getNumContext(agent, 'newactivity-followup');
        var contextParameters = agent.contexts[numContexte].parameters;
        console.log("numContexte : ")
        console.log(numContexte)

        var numContexteValidationDemandee = getNumContext(agent, 'new activity - yes') //contexte auquel en théorie, la variable sera rajoutée

        console.log("numContexteValidationDemandee : ")
        console.log(numContexteValidationDemandee)


        // computeSeanceDuration
        var seanceDurationInMinute = computeSeanceDuration(contextParameters);

        var confirmationDemandee = false;
        try{
            console.log("Contexte True : ")
            console.log(agent.contexts[numContexteValidationDemandee])
            confirmationDemandee = agent.contexts[numContexteValidationDemandee].parameters.confirmationDemandee;
        }
        catch(error){
            console.log("ERROR 1005 : ")
            console.log(error)
            confirmationDemandee = false
        }
        /*if(agent.contexts[agent.contexts.length-2]!==undefined && agent.contexts[agent.contexts.length-2].parameters.confirmationDemandee === true)
            confirmationDemandee = true*/
        var nameSport = contextParameters.sport

        var homeTimeAmount = -1
        var workTimeAmount = -1
        if (contextParameters.homeTime !== undefined && contextParameters.homeTime.amount !== undefined)
            homeTimeAmount = contextParameters.homeTime.amount;
        if (contextParameters.workTime !== undefined && contextParameters.workTime.amount !== undefined)
            workTimeAmount = contextParameters.workTime.amount;

        let addressToPush = contextParameters.address
        if (addressToPush === undefined){
            addressToPush = "9 rue des inventions"
        }
        var donnee = {
            name: nameSport,
            placeType: contextParameters.placeType,
            address: addressToPush,
            homeTime:  homeTimeAmount,
            workTime:  workTimeAmount,
            frequence: contextParameters.frequence,
            nbSeance: contextParameters.nbSeance,
            duration: seanceDurationInMinute,
        }

        var promesseRequeteSport = Promise.resolve(myUserActsRef.orderByChild('name').equalTo(nameSport).once("value"));

            return promesseRequeteSport.then(data => {

            console.log("data", data.val())
            console.log("parameters", agent.contexts[0].parameters)
            if(data.val() === null || confirmationDemandee)
            {
                agent.add(`WOOOW ON EST LÀ`);

                //type lieu = dehors, salle, chez soi

                myUserActsRef.push(donnee)
                //const userRef = dbRef.child('users/' + e.target.getAttribute("userid"));
                agent.add(`OK COOOL : ${agent.contexts[0].parameters.sport}, ${agent.contexts[0].parameters.frequence}, ${seanceDurationInMinute} minutes`);

                agent.context.set({ name: 'New Activity', lifespan: 2, parameters: { }});
            }
            else{

                donnee.confirmationDemandee = true;
                agent.context.set({ name: 'new activity - yes', lifespan: 2, parameters: donnee });
                agent.add(`Le sport que vous souhaitez ajouter possède déjà des activités, voulez-vous confirmer votre ajout ?`);
            }
            return 0;
        })
        .catch(err => {
            console.log(err);
            agent.add(`WOOOW BUG VERIF SPORT 1001`);
            return 0;
        });
    })
    .catch(err => {
        console.log(err);
        agent.add(`WOOOW BUG 1000`);
        return 0;
    });
   }

   function guessedAddress()
   {


        var guessedAddress = "9 rue des inventions";
        agent.context.set({ name: 'new activity - address', lifespan: 2, parameters: {guessedAddress : guessedAddress} });
        agent.add(`Nous vous suggérons de faire votre activité à ${guessedAddress}, cela vous convient-il ?`);
   }



   // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
   // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('add User', addUserInfosToFirebase);
  intentMap.set('New Activity - yes', addUserActivityToFirebase);
  intentMap.set('New Activity - more', guessedAddress);

  
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});
