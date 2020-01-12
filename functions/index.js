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

const {getNumContext, computeSeanceDuration} = require("./dialogflowFirebaseFulfillment/addUserActivityToFirebase");
const {HttpClient} = require("./dialogflowFirebaseFulfillment/httpRequest");
const {addNewEventToGoogleCalendar, setEventData, deleteEventFromGoogleCalendar, getFreeTimesFromGoogleCalendar}
    = require('./googleCalendarHelpers');

/**
 * When a new event is created in Firebase, creates a new event in the corresponding user's Google Calendar. The id of
 * of the google calendar event is stored in firebase for future modification or deletion.
 * @type {CloudFunction<DataSnapshot>}
 */
exports.addNewEventToCalendar = functions.database.ref('/users/{userId}/activities/{activityId}/events/{eventId}')
    .onCreate(async (snapshot, context) => {
        const event = snapshot.val();
        const eventRef = snapshot.ref;
        const userId = context.params.userId;
        const eventData = setEventData(event);

        let token = await getStoredTokenFromFirebase(userId);

        let eventRessource = await addNewEventToGoogleCalendar(eventData, token);

        await addGoogleEventIdToFirebase(eventRessource.data.id, eventRef);
    });

async function getStoredTokenFromFirebase(userId) {
    let tokenSnapshot;
    try {
        tokenSnapshot = await usersRef.child(userId + '/infos/token').once("value");
    } catch (err) {
        throw new Error("Problem getting user's access token from firebase: " + err);
    }
    return tokenSnapshot.val();
}

async function addGoogleEventIdToFirebase(eventId, eventRef) {
    const data = {
        googleEventId: eventId
    };

    try {
        await eventRef.update(data);
    } catch (err) {
        throw new Error("Can't get user's access token: " + err);
    }
}

/**
 * Activated when an event is deleted from Firebase. The corresponding event, if it exists, is deleted from the
 * corresponding user's Google Calendar.
 * @type {CloudFunction<DataSnapshot>}
 */
exports.deleteEventFromCalendar = functions.database
    .ref('/users/{userId}/activities/{activityId}/events/{eventId}').onDelete(async (snapshot, context) => {
        let googleEventId = snapshot.val().googleEventId;
        let userId = context.params.userId;
        let token = await getStoredTokenFromFirebase(userId);

        await deleteEventFromGoogleCalendar(googleEventId, token);
    });

/**
 * Returns the list of the free time intervals of the user over the specified period.
 */
async function getFreeTimes(token, timeMin, timeMax) {
    return await getFreeTimesFromGoogleCalendar(token, timeMin, timeMax);
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
            response.send("Can not remove the activity : ", err);
            throw new Error("Can not remove the activity : ", err)
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
            response.send("Can not remove the activity : ", err);
            throw new Error("Issue with User references",err)
        });
});

exports.apiInfosUser = functions.https.onRequest(async (request, response) => {
    console.log("waaw")
    console.log(request.headers)
    console.log(request.header("Authorization"));
    let token = request.header("Authorization")
    token = token.substr(7);
    console.log(token)
    let client = new HttpClient();
    console.log("request sent")
        // try {
        //     console.log(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&`+
        //     `access_token=${token}`)
        //     response = await client.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&`+
        //     `access_token=${token}`).asPromise()
        //     console.log("Response of the request")
        //     console.log(response)
        //     console.log(response.id)

        // }
        //  catch (err) {
        //      throw new Error(`Request failed `, err)
        //  }
    try {
        console.log(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&`+
            `access_token=${token}`)
        return client.get(`https://www.googleapis.com/oauth2/v1/userinfo?alt=json&`+
        `access_token=${token}`, async res => {
            console.log("Response of the request");
            console.log(res);
            let resJon = JSON.parse(res)
            console.log(resJon.id);


            let promesseRequeteUser = await usersRef.orderByChild('infos/idGoogle').equalTo(resJon.id).once("value");
            let idUser = Object.keys(promesseRequeteUser.val())[0];
            const myUserInfosRef = promesseRequeteUser.val()[idUser].infos;
            const myUserActsRef = myUserRef.child('activities');
            return response.send('4');
            });
    }
    catch (err) {
        throw new Error("Request failed" , err)
    }
});


async function searchLocationSport(address, sport)
{
    var reqGeoLoc = {
        address: address,
        language: "french"
    };
    try{
        let resGeoLoc = await googleMapsClient.geocode(reqGeoLoc).asPromise();
        let response = {};
        let gpsHomePosition = resGeoLoc.json.results[0].geometry.location
        response['myGpsLocation'] = gpsHomePosition;
        let req = {
            location: gpsHomePosition,
            keyword: sport,
            rankby: "distance"
        };
        let res = await googleMapsClient.placesNearby(req).asPromise();
        let firstResult = res.json.results[0]
        let origToDest = {
            origins:req.location,
            destinations:firstResult.geometry.location
        }
        response['sportGpsDest'] = firstResult.geometry.location;
        let resDist = await googleMapsClient.distanceMatrix(origToDest).asPromise();
        response['nameLocationSport'] = firstResult.name;
        response['address'] = firstResult.vicinity ;
        response['distanceInKm'] = (resDist.json.rows[0].elements[0].distance.value/1000).toFixed(2);
        response['timeInMinutes'] = Math.round(resDist.json.rows[0].elements[0].duration.value/60);
        return response;
    } catch (err) {
        console.log(err)
        throw(JSON.stringify(err, null, 4));
    }
}

exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({request, response});
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));


    // Uncomment and edit to make your own intent handler
    // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
    // below to get this function to be run when a Dialogflow intent is matched
    function addUserInfosToFirebase(agent) {

        name = agent.contexts[0].parameters.any;


        var data = {
            infos:
                {
                    name: name,
                    email: "dvdmcn66@gmail.com",
                    preference: "afternoon",
                    idGoogle: 105810815818197160000,
                    adress: "9 rue Jean Luc Mélenchon",
                }
        }
        usersRef.push(data)
        //const userRef = dbRef.child('users/' + e.target.getAttribute("userid"));
        agent.add(`Ok vous êtes inscrit - enregistrez une nouvelle activité ?`);

        agent.context.set({name: 'New Activity', lifespan: 2, parameters: {}});
    }


    async function addUserActivityToFirebase(agent) {

        let promesseRequeteUser = await usersRef.orderByChild('infos/name').equalTo('david').once("value");


        // let client = new HttpClient();
        // try {
        //     client.get('https://maps.googleapis.com/maps/api/place/findplacefromtext/json?' +
        //         `key=${keyApiGoogle}&` +
        //         'input=bordeaux&' +
        //         'inputtype=textquery', response => {
        //             console.log("Response of the request")
        //             console.log(response)
        //         });
        // }
        // catch (err) {
        //     throw new Error(`Request failed `, error)
        // }

        let idUser = Object.keys(promesseRequeteUser.val())[0];
        const myUserRef = usersRef.child(idUser);
        const myUserActsRef = myUserRef.child('activities');

        console.log("Contexts of Dialogflow : ")
        console.log(agent.contexts)

            let numContexte = getNumContext(agent, 'newactivity-followup');
            let contextParameters = agent.contexts[numContexte].parameters;
            let numContexteValidationDemandee = getNumContext(agent, 'new activity - yes') //context used to ask validation if activity already exist in the database

        let seanceDurationInMinute = computeSeanceDuration(contextParameters);

        let confirmationDemandee = false;
        try {
            console.log("Context True : ")
            console.log(agent.contexts[numContexteValidationDemandee])
            confirmationDemandee = agent.contexts[numContexteValidationDemandee].parameters.confirmationDemandee;
        }
        catch (error) {
            console.log("ERROR 1005 : ")
            console.log(error)
            confirmationDemandee = false
            throw new Error(`Check dialogflow context `, error)
        }
        /*if(agent.contexts[agent.contexts.length-2]!==undefined && agent.contexts[agent.contexts.length-2].parameters.confirmationDemandee === true)
            confirmationDemandee = true*/
        let nameSport = contextParameters.sport



        let homeTimeAmount
        let workTimeAmount
        let addressToPush = contextParameters.address
        if (addressToPush === undefined) {
            if (contextParameters.homeTime !== undefined && contextParameters.homeTime.amount !== undefined){
                homeTimeAmount = contextParameters.homeTime.amount;
            }
            if (contextParameters.workTime !== undefined && contextParameters.workTime.amount !== undefined){
                workTimeAmount = contextParameters.workTime.amount;
            }
            else{
                console.log("SEARCHING SPORT LOCATION")
                let dataUser = await myUserRef.once("value")
                let addressUser = dataUser.val().infos.address
                var resultSearchSport = await searchLocationSport(addressUser, nameSport);
                console.log(resultSearchSport)
                addressToPush = resultSearchSport
                workTimeAmount = resultSearchSport.timeInMinutes
                homeTimeAmount = 1
            }
        }

        var donnee = {
            name: nameSport,
            placeType: contextParameters.placeType,
            address: addressToPush,
            kmToSport: resultSearchSport.distanceInKm,
            homeTime: homeTimeAmount,
            workTime: workTimeAmount,
            frequence: contextParameters.frequence,
            nbSeance: contextParameters.nbSeance,
            duration: seanceDurationInMinute,
        }

        try{
        let data = await myUserActsRef.orderByChild('name').equalTo(nameSport).once("value");

        console.log("data", data.val())
        console.log("parameters", agent.contexts[0].parameters)
        if (data.val() === null || confirmationDemandee) {
            agent.add(`Votre activité a été  `);
            //type lieu = dehors, salle, chez soi
            myUserActsRef.push(donnee);
            //const userRef = dbRef.child('users/' + e.target.getAttribute("userid"));
            agent.add(`ajouté avec succès : ${agent.contexts[0].parameters.sport}, ${agent.contexts[0].parameters.frequence}, ${seanceDurationInMinute} minutes`);

            agent.context.set({ name: 'New Activity', lifespan: 2, parameters: {} });
        }
        else {

            donnee.confirmationDemandee = true;
            agent.context.set({ name: 'new activity - yes', lifespan: 2, parameters: donnee });
            agent.add(`Le sport que vous souhaitez ajouter possède déjà des activités, voulez-vous confirmer votre ajout ?`);
        }
        return 0;
        }
        catch(err){
            agent.add(`ERROR votre activité n'a pas pu être ajouté. Désoler du dérangement`);
            throw new Error("Activity can't be add to the database ", err)
        }
    }

   async function guessedAddress (agent) {
        console.log("SEARCHING SPORT LOCATION")
        let promesseRequeteUser = await usersRef.orderByChild('infos/name').equalTo('david').once("value");
        let idUser = Object.keys(promesseRequeteUser.val())[0];
        const myUserRef = usersRef.child(idUser);
        let dataUser = await myUserRef.once("value")
        let addressUser = dataUser.val().infos.address
        let numContexte = getNumContext(agent, 'newactivity-followup');
        let contextParameters = agent.contexts[numContexte].parameters;
        let nameSport = contextParameters.sport
        let resultSearchSport = await searchLocationSport(addressUser, nameSport);
        console.log(resultSearchSport)
        var guessedAddress = resultSearchSport.address;
        var distanceInKm = resultSearchSport.distanceInKm;
        agent.context.set({name: 'new activity - address', lifespan: 2, parameters: {guessedAddress: guessedAddress}});
        agent.add(`Nous vous suggérons de faire votre activité à ${guessedAddress} à environ ${resultSearchSport.distanceInKm} km de chez vous, cela vous convient-il ?`);
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
