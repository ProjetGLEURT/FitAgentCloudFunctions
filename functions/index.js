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
const {
    getContextParameters,
    computeSeanceDuration,
    getTokenFromContext,
    searchLocationSport,
    } = require("./dialogflowFirebaseFulfillment/addUserActivityToFirebase");



const { getEmailFromToken, getTokenFromUrl } = require("./authenticationHelpers");
const {addNewEventToGoogleCalendar, setEventData, deleteEventFromGoogleCalendar, getFreeTimesFromGoogleCalendar}
    = require('./googleCalendarHelpers');
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
    let timeInterval = {
        start: timeMin,
        end: timeMax
    };
    let data = await usersRef.orderByChild('infos/name').equalTo("david").once("value");
    let userId = Object.keys(data.val())[0];
    let userInfos = data.val()[userId].infos;
    let nightInterval = {
        start: userInfos.maxSportEndTime || 22,
        end: userInfos.minSportBeginTime || 8
    };
    return await getFreeTimesFromGoogleCalendar(token, timeInterval, nightInterval);
}

exports.apiSupprimerActiviteUser = functions.https.onRequest(async (request, response) => {
    var id = request.query.id;

    let userEmail = await getEmailFromToken(getTokenFromUrl(request))
    console.log("EMAILMEAIL EMAIL EAMIL EMAIL MAIL", userEmail)
    let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");

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

exports.apiActiviteUser = functions.https.onRequest(async (request, response) => {

    let userEmail = await getEmailFromToken(getTokenFromUrl(request))
    console.log("EMAILMEAIL EMAIL EAMIL EMAIL MAIL", userEmail)
    let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");

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






exports.updateFirebaseInfo = functions.https.onRequest(async (request, response) =>{
    console.log("Requete 5 : ", request)
    console.log("address to add", request.headers)
    let token = request.header("Authorization")
    console.log("address to add", token)
    let userEmail = await getEmailFromToken(getTokenFromUrl(request))
    let userAddressInUrl = "40 cours Pasteur"
    console.log("Email address from token", headers)
    let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");
    try {
        if (promesseRequeteUser === undefined || promesseRequeteUser === null) {
            response.send("404 User not find")
            throw new Error("404 User not find")
        }
        else {
            let idUser = Object.keys(promesseRequeteUser.val())[0];
            const myUserRef = usersRef.child(idUser);
            const myUserInfosRef = myUserRef.child('infos');
            console.log("User info : ", JSON.stringify(myUserInfosRef, null, 4))
            let data = {
                address: userAddressInUrl,
                // maxSportBeginTime: request.maxSportBeginTime,
                // minSportBeginTime: request.minSportBeginTime,
            }
            console.log("Data to add : ",data)

            myUserInfosRef.update(data)
            console.log("Updated user info ")

            response.send("BRAVO")
        }
    }
    catch (err) {
        response.send("user not find in the database")
        throw new Error("User not find in the Database", err)
    }
});



exports.apiInfosUser = functions.https.onRequest(async (request, response) => {
    try {
        let token = getTokenFromUrl(request)
        let userEmail = await getEmailFromToken(getTokenFromUrl(request))
        console.log("EMAILMEAIL EMAIL EAMIL EMAIL MAIL", userEmail )
        let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");
        console.log("EMAILMEAIL EMAIL EAMIL EMAIL MAIL", userEmail)
        console.log(promesseRequeteUser)
        try {
            if (promesseRequeteUser === undefined || promesseRequeteUser === null ) {
                console.log("REQUEST USER = NUL")
                let data = {
                    infos:
                    {
                        name: userEmail,
                        minSportBeginTime: "8",
                        maxSportBeginTime: "21",
                        email: userEmail,
                        address: "",
                        token: token,
                    },
                    activities: {}
                }
                console.log("URL TO PUSH", usersRef)
                usersRef.push(data)
                console.log("Pushed data", data)

                response.send(data)
            }
            else {
                console.log("User find in the database")
                console.log(JSON.stringify(promesseRequeteUser,null,4))
                console.log("Id : ")
                let idUser = Object.keys(promesseRequeteUser.val())[0];
                console.log("USER ID", idUser)
                const myUserRef = usersRef.child(idUser);
                const myUserInfosRef = myUserRef.child('infos');
                console.log("User info : ", JSON.stringify(myUserInfosRef, null, 4))
                let data = {
                    token: token,
                }
                console.log("MIS A JOURS DU TOKEN")
                myUserInfosRef.update(data)
                console.log("infos", await myUserInfosRef.once("value"))

                response.send(await myUserRef.once("value"))
            }
        }
        catch (err) {
            console.log("Catch REQUEST USER = NUL")
            let data = {
                infos:
                {
                    name: userEmail,
                    minSportBeginTime: "8",
                    maxSportBeginTime: "22",
                    email: userEmail,
                    address: "",
                    token: token,
                },
                activities: {}
            }
            usersRef.push(data)
            response.send(data)
            throw new Error("This should not happend, user not Find", err)
        }
    }
    catch (err) {
            throw new Error("Request failed", err)
        }
});


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
        let userEmail = await getEmailFromToken(getTokenFromContext(agent))
        console.log("Email get from context", userEmail)
        let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");

        let idUser = Object.keys(promesseRequeteUser.val())[0];
        const myUserRef = usersRef.child(idUser);
        const myUserActsRef = myUserRef.child('activities');

        console.log("Contexts of Dialogflow : ")
        console.log(agent.contexts)

        let contextParameters = getContextParameters(agent, 'newactivity-followup');
        let ParametersAskedValidation = getContextParameters(agent, 'new activity - yes'); //context used to ask validation if activity already exist in the database
        let seanceDurationInMinute = computeSeanceDuration(contextParameters);

        let confirmationDemandee = false;
        try {
            console.log("Parameters asked validation : ")
            console.log(ParametersAskedValidation)
            confirmationDemandee = ParametersAskedValidation.confirmationDemandee;
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
        let contextParameters = getContextParameters(agent, 'newactivity-followup');
        console.log("data", data.val())
        console.log("parameters", contextParameters)
        if (data.val() === null || confirmationDemandee) {
            agent.add(`Votre activité a été  `);
            //type lieu = dehors, salle, chez soi
            let refActivity = myUserActsRef.push(donnee);
            //const userRef = dbRef.child('users/' + e.target.getAttribute("userid"));
            console.log("Sport à ajouter :",contextParameters.sport)
            console.log("Duré :", seanceDurationInMinute)
            try{
                let token = getTokenFromContext(agent)
                let time = getIntervalPeriod(1, donnee.frequence)
                let freeTimes = await getFreeTimes(token, time.begin, time.end)
                await addActivityEvents(freeTimes, donnee.nbSeance, seanceDurationInMinute, token, usersRef, refActivity)
            }
            catch(err){
                console.log("Error adding news events : ")
                console.log(err)
            }
            console.log(`ajouté avec succès : ${contextParameters.sport}, ${contextParameters.frequence}, ${seanceDurationInMinute} minutes`)
            agent.add(`ajouté avec succès : ${contextParameters.sport}, ${contextParameters.frequence}, ${seanceDurationInMinute} minutes`);
            console.log("THE END")

        }
        else {

            donnee.confirmationDemandee = true;
            agent.context.set({ name: 'new activity - yes', lifespan: 2, parameters: donnee });
            //agent.add(`Le sport que vous souhaitez ajouter possède déjà des activités, voulez-vous confirmer votre ajout ?`);
            agent.add("dis oui")
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
        console.log("LOG ALL CONTEXT")
        console.log(agent.contexts)
        try{
            let token = getTokenFromContext(agent)
            let userEmail = await getEmailFromToken(getTokenFromContext(agent))
            console.log("Email get from context", userEmail)
            let promesseRequeteUser = await usersRef.orderByChild('infos/email').equalTo(userEmail).once("value");
            let idUser = Object.keys(promesseRequeteUser.val())[0];
            const myUserRef = usersRef.child(idUser);
            console.log("Id of user", idUser)

            let dataUser = await myUserRef.once("value")
            let addressUser = dataUser.val().infos.address
            console.log("Address get from database", addressUser)

            let contextParameters = getContextParameters(agent, 'newactivity-followup');
            let nameSport = contextParameters.sport
            let resultSearchSport = await searchLocationSport(addressUser, nameSport);
            console.log(resultSearchSport)
            let guessedAddress = resultSearchSport.address;
            let distanceInKm = resultSearchSport.distanceInKm;
            agent.context.set({ name: 'newactivity-token', lifespan: 5, parameters: { token: token } });
            agent.context.set({ name: 'new activity - address', lifespan: 2, parameters: { guessedAddress: guessedAddress, token: token } });
            //agent.add(`Nous vous suggérons de faire votre activité à ${guessedAddress} à environ ${distanceInKm} km de chez vous, cela vous convient-il ?`);
            agent.add("dis oui")
        }
        catch(err){
            throw new Error("Can't search Location",err)
        }
    }

    function logAll(agent) {
        try{
            let contextParameters = getContextParameters(agent, 'newactivity-followup');
            console.log(agent.contexts)
            agent.context.set({ name: 'newactivity-token', lifespan: 5, parameters: { token: getTokenFromContext(agent) } });
            // agent.add(`Combien de séance ${contextParameters.frequence} de ${contextParameters.sport} ?`)
            agent.add("?")
        }
        catch(err){
            throw new Error ("Probably issue with token", err)
        }
    }


    // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
    // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

    // Run the proper function handler based on the matched Dialogflow intent name
    let intentMap = new Map();
    intentMap.set('add User', addUserInfosToFirebase);
    intentMap.set('New Activity - yes', addUserActivityToFirebase);
    intentMap.set('New Activity - more', guessedAddress);
    intentMap.set('New Activity', logAll);

    // intentMap.set('your intent name here', googleAssistantHandler);
    agent.handleRequest(intentMap);
});
