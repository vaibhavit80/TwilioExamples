'use strict';

/**
 * Load Twilio configuration from .env config file - the following environment
 * variables should be set:
 * process.env.TWILIO_ACCOUNT_SID
 * process.env.TWILIO_API_KEY
 * process.env.TWILIO_API_SECRET
 */
require('dotenv').load();

const express = require('express');
const http = require('http');
const path = require('path');
const Twilio = require('twilio');
const axios = require('axios');
const AccessToken = Twilio.jwt.AccessToken;
const VideoGrant = AccessToken.VideoGrant;
const ChatGrant = AccessToken.ChatGrant;
// Max. period that a Participant is allowed to be in a Room (currently 14400 seconds or 4 hours)
const MAX_ALLOWED_SESSION_DURATION = 14400;

// Create Express webapp.
const app = express();

// Set up the paths for the examples.
// [
//   'bandwidthconstraints',
//   'codecpreferences',
//   'dominantspeaker',
//   'localvideofilter',
//   'localvideosnapshot',
//   'mediadevices',
//   'networkquality',
//   'reconnection',
//   'screenshare',
//   'localmediacontrols',
//   'remotereconnection'

// ].forEach(example => {
//   const examplePath = path.join(__dirname, `../examples/${example}/public`);
//   app.use(`/${example}`, express.static(examplePath));
// });

// Set up the path for the quickstart.
const quickstartPath = path.join(__dirname, '../quickstart/public');
app.use('/', express.static(quickstartPath));

// Set up the path for the examples page.
// const examplesPath = path.join(__dirname, '../examples');
// app.use('/examples', express.static(examplesPath));

/**
 * Default to the Quick Start application.
 */
app.get('/access', (request, response) => {
  const { token } = request.query;
  if (!token) {
    response.sendStatus(400);
  }
  else {
    try
    {
      axios.get(`https://apidev.iconnections.io/f4f/token/${token}`)
        .then((r) => {
          let access = r.data;
          response.send({
            token: access.TwilioToken,
            room: access.RoomName,
            name: access.MeetingParticipant
          });
        })
        .catch((e) => {
          console.log(e);
          response.sendStatus(401);
        });
    }
    catch (error) {
      console.error(error);
      response.sendStatus(500);
    }
  }
});

/**
 * Generate an Access Token for a chat application user - it generates a random
 * username for the client requesting a token, and takes a device ID as a query
 * parameter.
 */

app.get('/token/:id?', function(request, response) {

debugger;
  const  identity =  request.params.id || 'UnknownUser';

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );

  // Assign the generated identity to the token.
  token.identity = identity;

  // Grant the access token Twilio Video capabilities
  const videoGrant = new VideoGrant();
  token.addGrant(videoGrant);

  if (process.env.TWILIO_CHAT_SERVICE_SID) {
    // Create a "grant" which enables a client to use IPM as a given user,
    // on a given device
    const chatGrant = new ChatGrant({
      serviceSid: process.env.TWILIO_CHAT_SERVICE_SID
    });
    token.addGrant(chatGrant);
  }
  // Serialize the token to a JWT string.
  response.send({
    identity: token.identity,
    token: token.toJwt()
  });


});
app.post('/token', function(request, response) {
  debugger;
  const  identity =  request.body.id || 'UnknownUser';

  // Create an access token which we will sign and return to the client,
  // containing the grant we just created.
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET
  );

  // Assign the generated identity to the token.
  token.identity = identity;

  // Grant the access token Twilio Video capabilities
  const videoGrant = new VideoGrant();
  token.addGrant(videoGrant);

  if (process.env.TWILIO_CHAT_SERVICE_SID) {
    // Create a "grant" which enables a client to use IPM as a given user,
    // on a given device
    const chatGrant = new ChatGrant({
      serviceSid: process.env.TWILIO_CHAT_SERVICE_SID
    });
    token.addGrant(chatGrant);
  }
  // Serialize the token to a JWT string.
  response.send({
    identity: token.identity,
    token: token.toJwt()
  });

});
// Create http server and run it.
const server = http.createServer(app);
const port = process.env.PORT || 3000;
server.listen(port, function() {
  console.log('Express server running on *:' + port);
});
