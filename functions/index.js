const functions = require('firebase-functions');
const cors = require('cors')({ origin: true});
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fitAgent.firebaseio.com"
});

const { SessionsClient } = require('dialogflow');


exports.dialogflowGateway = functions.https.onRequest((request, response) => {
  cors(request, response, async () => {
    const { queryInput, sessionId } = request.body;


    const sessionClient = new SessionsClient({ credentials: serviceAccount  });
    const session = sessionClient.sessionPath('fitAgent', sessionId);


    const responses = await sessionClient.detectIntent({ session, queryInput});

    const result = responses[0].queryResult;

    response.send(result);
  });
});




const { WebhookClient } = require('dialogflow-fulfillment');

exports.dialogflowWebhook = functions.https.onRequest(async (request, response) => {
    const agent = new WebhookClient({ request, response });

    const result = request.body.queryResult;


    async function userOnboardingHandler(agent) {

     // Do backend stuff here
     const db = admin.firestore();
     const profile = db.collection('users').doc('jeffd23');

     const { name, color } = result.parameters;

      await profile.set({ name, color })
      agent.add(`Welcome aboard my friend!`);
    }


    let intentMap = new Map();
    intentMap.set('UserOnboarding', userOnboardingHandler);
    agent.handleRequest(intentMap);
});


// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest(async (req, res) => {
  // Grab the text parameter.
  const original = req.query.text;
  // Push the new message into the Realtime Database using the Firebase Admin SDK.
  const snapshot = await admin.database().ref('/messages').push({original: original});
  // Redirect with 303 SEE OTHER to the URL of the pushed object in the Firebase console.
  res.redirect(303, snapshot.ref.toString());
});