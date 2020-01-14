// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const {WebhookClient} = require('dialogflow-fulfillment');
process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements

const functions = require('firebase-functions');

const firebase = require('firebase');
const firebaseConfig = require("./firebaseconfig.json");

const {HttpClient} = require('./dialogflowFirebaseFulfillment/httpRequest')

firebase.initializeApp(firebaseConfig);

const dbRef = firebase.database().ref();
const usersRef = dbRef.child('users');
const {getContextParameters,
    computeSeanceDuration,
    getTokenFromContext,
    searchLocationSport,} = require("./dialogflowFirebaseFulfillment/addUserActivityToFirebase");
const { initializeFirebaseUser,
        refreshTokenInFirebase,
        updateAddressInFirebase,
        deleteActivityInFirebase} = require("./firebaseInteraction");
const {getEmailFromToken, getTokenFromUrl} = require("./authenticationHelpers");
const {addNewEventToGoogleCalendar, 
        setEventData, 
        deleteEventFromGoogleCalendar,
        getFreeTimesFromGoogleCalendar} = require('./googleCalendarHelpers');
const {addActivityEvents, getIntervalPeriod} = require('./eventCalendarHelpers');

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

        const activityId = context.params.activityId;

        let activity = await getActivityInfosFromFirebase(userId, activityId);
        const eventData = setEventData(event, activity);

        let token = await getStoredTokenFromFirebase(userId);

        let eventRessource = await addNewEventToGoogleCalendar(eventData, token);

        await addGoogleEventIdToFirebase(eventRessource.data.id, eventRef);
    });

async function getActivityInfosFromFirebase(userId, activityId) {
    try {
        let activitySnapshot = await usersRef.child(userId + '/activities/' + activityId).once("value");
        return activitySnapshot.val()
    } catch (err) {
        throw new Error("Problem getting activity " + activityId + " from user " + userId + ": " + err);
    }
}

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
    let timeInterval = {
        start: timeMin,
        end: timeMax
    };
    const nightInterval = await getNightIntervalFromUserInfos(token);
    return await getFreeTimesFromGoogleCalendar(token, timeInterval, nightInterval);
}

async function getNightIntervalFromUserInfos(token) {
    let data = await usersRef.orderByChild('infos/token').equalTo(token).once("value");
    let userId = Object.keys(data.val())[0];
    let userInfos = data.val()[userId].infos;
    return {
        start: userInfos.maxSportEndTime || 22,
        end: userInfos.minSportBeginTime || 8
    };
}

exports.apiSupprimerActiviteUser = functions.https.onRequest(async (request, response) => {
    let acitivityIdToDelete = request.query.id;
    let userEmail = await getEmailFromToken(getTokenFromUrl(request))
    let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");
    console.log(`Delete the user activitiy ${acitivityIdToDelete} to the user ${userEmail}`);
    try {
        deleteActivityInFirebase(acitivityIdToDelete, usersRef, promesseRequeteUser, response)
    }
    catch (err) {
        response.send("Can not remove the activity : ", err);
        throw new Error("Can not remove the activity : ", err)
    }
});

exports.apiActiviteUser = functions.https.onRequest(async (request, response) => {
    let userEmail = await getEmailFromToken(getTokenFromUrl(request));
    let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");
    console.log("Give user activities to the user with useremail :", userEmail);
    try {
        let idUser = Object.keys(promesseRequeteUser.val())[0];
        const myUserActsRef = promesseRequeteUser.val()[idUser].activities;
        response.send(myUserActsRef);
    } catch (err) {
        response.send("Issue with User references " + err);
        throw new Error("Issue with User references" + err)
    }
});


exports.updateFirebaseInfo = functions.https.onRequest(async (request, response) => {
    let userEmail = await getEmailFromToken(getTokenFromUrl(request));
    let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");
    console.log("Updating Firebase User Information");
    try {
        if (promesseRequeteUser === undefined || promesseRequeteUser === null) {
            response.send("404 User not found");
        } else {
            updateAddressInFirebase(request.headers.address, usersRef, promesseRequeteUser, response)
        }
    } catch (err) {
        response.send("User not find in the database");
        throw new Error("User not find in the database : " + err)
    }
});



exports.apiInfosUser = functions.https.onRequest(async (request, response) => {
    let userEmail = await getEmailFromToken(getTokenFromUrl(request));
    let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");
    try {
        if (Object.keys(promesseRequeteUser.val())[0] === undefined || Object.keys(promesseRequeteUser.val())[0] === null) {
            console.log("REQUEST USER = NUL");
            initializeFirebaseUser(getTokenFromUrl(request), userEmail, response)
        } else {
            console.log("User Find");
            refreshTokenInFirebase(getTokenFromUrl(request), usersRef, promesseRequeteUser, response ) // deprecated
        }
    } catch (err) {
        console.log("Error  while searching user in the database. THIS SHOULD NOT BE DONE LIKE THAT");
        initializeFirebaseUser(getTokenFromUrl(request), userEmail, usersRef, response);    // WARNING, there is an issu with the condition promessRequetUser
        throw new Error("This should not happen, user not Found: " + err)
    }
});


exports.dialogflowFirebaseFulfillment = functions.https.onRequest(async (request, response) => {
    const agent = new WebhookClient({request, response});
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));


    // Uncomment and edit to make your own intent handler
    // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
    // below to get this function to be run when a Dialogflow intent is matched

    async function addUserActivityToFirebase(agent) {
        let userEmail = await getEmailFromToken(getTokenFromContext(agent));
        console.log("Email get from context", userEmail);
        let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");

        let idUser = Object.keys(promesseRequeteUser.val())[0];
        const myUserRef = usersRef.child(idUser);
        const myUserActsRef = myUserRef.child('activities');

        console.log("Contexts of Dialogflow : ");
        console.log(agent.contexts);

        let contextParameters = getContextParameters(agent, 'newactivity-followup');
        let ParametersAskedValidation = getContextParameters(agent, 'new activity - yes'); //context used to ask validation if activity already exist in the database
        let seanceDurationInMinute = computeSeanceDuration(contextParameters);

        let confirmationDemandee = false;
        try {
            console.log("Parameters asked validation : ");
            console.log(ParametersAskedValidation);
            confirmationDemandee = ParametersAskedValidation.confirmationDemandee;
        } catch (error) {
            console.log("ERROR 1005 : ");
            console.log(error);
            confirmationDemandee = false;
            throw new Error(`Check dialogflow context ` + error)
        }
        /*if(agent.contexts[agent.contexts.length-2]!==undefined && agent.contexts[agent.contexts.length-2].parameters.confirmationDemandee === true)
            confirmationDemandee = true*/
        let nameSport = contextParameters.sport;


        let homeTimeAmount;
        let workTimeAmount;
        let addressToPush = contextParameters.address;
        var resultSearchSport = 10;
        if (addressToPush === undefined) {
            if (contextParameters.homeTime !== undefined && contextParameters.homeTime.amount !== undefined) {
                homeTimeAmount = contextParameters.homeTime.amount;
            }
            if (contextParameters.workTime !== undefined && contextParameters.workTime.amount !== undefined) {
                workTimeAmount = contextParameters.workTime.amount;
            } else {
                console.log("SEARCHING SPORT location");
                let dataUser = await myUserRef.once("value");
                let addressUser = dataUser.val().infos.address;
                resultSearchSport = await searchLocationSport(addressUser, nameSport);
                console.log(resultSearchSport);
                addressToPush = resultSearchSport;
                workTimeAmount = resultSearchSport.timeInMinutes;
                homeTimeAmount = 1
                console.log("sport find");

            }
        }
        let date = new Date()
        const donnee = {
            name: nameSport,
            placeType: contextParameters.placeType,
            address: addressToPush,
            kmToSport: resultSearchSport.distanceInKm,
            homeTime: homeTimeAmount,
            workTime: workTimeAmount,
            frequence: contextParameters.frequence,
            nbSeance: contextParameters.nbSeance,
            duration: seanceDurationInMinute,
            dateOfCreation: date.toISOString(),
            dateOfUpdating: date.toISOString(),
        };

        try {
            let data = await myUserActsRef.orderByChild('name').equalTo(nameSport).once("value");
            let contextParameters = getContextParameters(agent, 'newactivity-followup');
            console.log("Existing data in the database : ", data.val());
            console.log("parameters", contextParameters);
            console.log("Data to add to database", donnee);

            if (data.val() === null || confirmationDemandee) {
                agent.add(`Votre activité a été  `);
                //type lieu = dehors, salle, chez soi
                let refActivity = myUserActsRef.push(donnee);
                //const userRef = dbRef.child('users/' + e.target.getAttribute("userid"));
                console.log("Sport à ajouter :", contextParameters.sport);
                console.log("Duré :", seanceDurationInMinute);
                try {

                        
                    let client = new HttpClient()
                    await client.get(`https://www.infoclimat.fr/public-api/gfs/json?_ll=44.8333,-0.5667
                    &_auth=CBJQR1MtAyFRfAYxVSNVfAVtDjsBdwcgVChQM1g9AH0CaVAxAGBRNwBuVSgDLAQyAC0EZww3BzcBalYuWykHZghiUDxTOANkUT4GY1V6VX4FKw5vASEHIFQ%2FUDdYKwBiAmBQPAB9UTIAalU0Ay0EMQA2BGIMLAcgAWNWNFsxB2wIYlAwUzQDYlE%2BBm1VelV%2BBTMOOwE%2FB2xUZFAwWDYAZgJnUDMAZlE0AG5VNgMtBDAANgRnDDMHPgFiVjRbPgd7CHRQTVNDA3xRfgYmVTBVJwUrDjsBYAdr&_c=0741890848ffe9f18aca8160e26719c8`
                    , async res => {
                        console.log("Response of the request api meteo");
                        let meteoJson = JSON.parse(res)
                        let token = getTokenFromContext(agent);
                        let time = getIntervalPeriod(0, donnee.frequence);
                        let freeTimes = await getFreeTimes(token, time.begin, time.end);
                        await addActivityEvents(freeTimes, donnee.nbSeance, seanceDurationInMinute, token, usersRef, refActivity, meteoJson)
                        if(donnee.frequence === "hebdomadaire")
                        {
                            let time = getIntervalPeriod(1, donnee.frequence);
                            let freeTimes = await getFreeTimes(token, time.begin, time.end);
                            await addActivityEvents(freeTimes, donnee.nbSeance, seanceDurationInMinute, token, usersRef, refActivity, meteoJson)

                            time = getIntervalPeriod(2, donnee.frequence);
                            freeTimes = await getFreeTimes(token, time.begin, time.end);
                            await addActivityEvents(freeTimes, donnee.nbSeance, seanceDurationInMinute, token, usersRef, refActivity, meteoJson)
                    
                            time = getIntervalPeriod(3, donnee.frequence);
                            freeTimes = await getFreeTimes(token, time.begin, time.end);
                            await addActivityEvents(freeTimes, donnee.nbSeance, seanceDurationInMinute, token, usersRef, refActivity, meteoJson)
                        }
                        return 1;

                    });

                } catch (err) {
                    console.log("Error adding news events : ");
                    console.log(err)
                }
                console.log(`ajouté avec succès : ${contextParameters.sport}, ${contextParameters.frequence}, ${seanceDurationInMinute} minutes`);
                agent.add(`ajouté avec succès : ${contextParameters.sport}, ${contextParameters.frequence}, ${seanceDurationInMinute} minutes`);
                console.log("THE END")

            } else {

                donnee.confirmationDemandee = true;
                agent.context.set({name: 'new activity - yes', lifespan: 2, parameters: donnee});
          //      agent.add(`Le sport que vous souhaitez ajouter possède déjà des activités, voulez-vous confirmer votre ajout ?`);
                agent.add("dis oui")
            }
            return 0;
        } catch (err) {
            agent.add(`ERROR votre activité n'a pas pu être ajouté. Désoler du dérangement`);
            throw new Error("Activity can't be add to the database " + err)
        }
    }

    async function guessedAddress(agent) {
        console.log("SEARCHING SPORT LOCATION");
        console.log("LOG ALL CONTEXT");
        console.log(agent.contexts);
        try {
            let token = getTokenFromContext(agent);
            let userEmail = await getEmailFromToken(getTokenFromContext(agent));
            console.log("Email get from context", userEmail);
            let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");
            let idUser = Object.keys(promesseRequeteUser.val())[0];
            const myUserRef = usersRef.child(idUser);
            console.log("Id of user", idUser);

            let dataUser = await myUserRef.once("value");
            let addressUser = dataUser.val().infos.address;
            console.log("Address get from database", addressUser);

            let contextParameters = getContextParameters(agent, 'newactivity-followup');
            let nameSport = contextParameters.sport;
            let resultSearchSport = await searchLocationSport(addressUser, nameSport);
            console.log(resultSearchSport);
            let guessedAddress = resultSearchSport.address;
            let distanceInKm = resultSearchSport.distanceInKm;
            agent.context.set({name: 'newactivity-token', lifespan: 5, parameters: {token: token}});
            agent.context.set({
                name: 'new activity - address',
                lifespan: 2,
                parameters: {guessedAddress: guessedAddress, token: token}
            });
            //agent.add(`Nous vous suggérons de faire votre activité à ${guessedAddress} à environ ${distanceInKm} km de chez vous, cela vous convient-il ?`);
            agent.add("dis oui")
        } catch (err) {

            throw new Error("Can't search Location: " + err)
        }
    }



    // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
    // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('New Activity - yes', addUserActivityToFirebase);
    intentMap.set('New Activity', guessedAddress);

    // intentMap.set('your intent name here', googleAssistantHandler);
    await agent.handleRequest(intentMap);
});
