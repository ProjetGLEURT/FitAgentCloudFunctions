// See https://github.com/dialogflow/dialogflow-fulfillment-nodejs
// for Dialogflow fulfillment library docs, samples, and to report issues
'use strict';

const functions = require('firebase-functions');
const {WebhookClient} = require('dialogflow-fulfillment');
const {Card, Suggestion} = require('dialogflow-fulfillment');
const firebase = require('firebase');

process.env.DEBUG = 'dialogflow:debug'; // enables lib debugging statements


var firebaseConfig = require("./firebaseconfig.json")



firebase.initializeApp(firebaseConfig);


const dbRef = firebase.database().ref();
const usersRef = dbRef.child('users');

exports.test = functions.https.onRequest((request, response) => {
    console.log("waaaw c'est appelé");
    response.send("waaaw c'est appelé");
    return 0;
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


   function computeDuration(durationUnit, durationAmount)
   {
    if(durationUnit === "heure")
        return (durationAmount * 60);
    return durationAmount;
   }


   
   function addUserActivityToFirebase(agent) {




    var promesseRequeteUser = Promise.resolve(usersRef.orderByChild('infos/name').equalTo('david').once("value"));

    return promesseRequeteUser.then(data => {
        
        console.log(data.val())
        var idUser = Object.keys(data.val())[0];
        console.log(idUser)
        const myUserRef = usersRef.child(idUser);
        const myUserActsRef = myUserRef.child('activities');

        
        
        console.log("BAH VOYONS")
        console.log(agent.contexts)

        //calcul durée séance
        var durationUnit = agent.contexts[0].parameters.duration.unit;
        var durationAmount = agent.contexts[0].parameters.duration.amount;
        var durationInMinute = computeDuration(durationUnit, durationAmount);

        var confirmationDemandee = false;
        if(agent.contexts[2]!==undefined && agent.contexts[2].parameters.confirmationDemandee === true)
            confirmationDemandee = true
        var nameSport = agent.contexts[0].parameters.sport


        var donnee = {
            name: nameSport,
            placeType: agent.contexts[0].parameters.placeType,
            adresse: "Talence, 105 avenue Jean Jaurès",
            frequence:agent.contexts[0].parameters.frequence,
            nbSeance:agent.contexts[0].parameters.nbSeance,
            duration:durationInMinute,
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
                agent.add(`OK COOOL : ${agent.contexts[0].parameters.sport}, ${agent.contexts[0].parameters.frequence}, ${durationInMinute} minutes`);
                
                agent.context.set({ name: 'New Activity', lifespan: 2, parameters: { }});
            }
            else{

                donnee.confirmationDemandee = true;

                agent.context.set({ name: 'New Activity - yes', lifespan: 2, parameters: donnee });
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





   // See https://github.com/dialogflow/fulfillment-actions-library-nodejs
   // for a complete Dialogflow fulfillment library Actions on Google client library v2 integration sample

  // Run the proper function handler based on the matched Dialogflow intent name
  let intentMap = new Map();
  intentMap.set('add User', addUserInfosToFirebase);
  intentMap.set('New Activity - yes', addUserActivityToFirebase);

  
  // intentMap.set('your intent name here', googleAssistantHandler);
  agent.handleRequest(intentMap);
});










/*
exports.dialogflowFirebaseFulfillment = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });
    console.log('Dialogflow Request headers: ' + JSON.stringify(request.headers));
    console.log('Dialogflow Request body: ' + JSON.stringify(request.body));

    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
        agent.add(`I didn't understand`);
        agent.add(`I'm sorry, can you try again?`);
    }

    // // Uncomment and edit to make your own intent handler
    // // uncomment `intentMap.set('your intent name here', yourFunctionHandler);`
    // // below to get this function to be run when a Dialogflow intent is matched
    // function yourFunctionHandler(agent) {
    //   agent.add(`This message is from Dialogflow's Cloud Functions for Firebase editor!`);
    //   agent.add(new Card({
    //       title: `Title: this is a card title`,
    //       imageUrl: 'https://developers.google.com/actions/images/badges/XPM_BADGING_GoogleAssistant_VER.png',
    //       text: `This is the body text of a card.  You can even use line\n  breaks and emoji! 💁`,
    //       buttonText: 'This is a button',
    //       buttonUrl: 'https://assistant.google.com/'
    //     })
    //   );
    //   agent.add(new Suggestion(`Quick Reply`));
    //   agent.add(new Suggestion(`Suggestion`));
    //   agent.setContext({ name: 'weather', lifespan: 2, parameters: { city: 'Rome' }});
    // }

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
    // intentMap.set('your intent name here', googleAssistantHandler);
    agent.handleRequest(intentMap);
});*/