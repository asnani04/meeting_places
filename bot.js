//
// This is main file containing code implementing the Express server and functionality for the Express echo bot.
// state = 0 ==> user sent "Start plan"
// state = 1 ==> sent msg "send your location"
//
'use strict';
const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const path = require('path');
var sleep = require('sleep');
var back = require('./back/meet.js');

var messengerButton = "<html><head><title>Facebook Messenger Bot</title></head><body><h1>Facebook Messenger Bot</h1>This is a bot based on Messenger Platform QuickStart. For more details, see their <a href=\"https://developers.facebook.com/docs/messenger-platform/guides/quick-start\">docs</a>.<script src=\"https://button.glitch.me/button.js\" data-style=\"glitch\"></script><div class=\"glitchButton\" style=\"position:fixed;top:20px;right:20px;\"></div></body></html>";
var friendLocationProcessing = 0;
var latitude = 0.0;
var THRESH = 4;

var location_info = {};
console.log(location_info)

// The rest of the code implements the routes for our Express server.
let app = express();

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: true
}));

// Webhook validation
app.get('/webhook', function(req, res) {
  if (req.query['hub.mode'] === 'subscribe' &&
      req.query['hub.verify_token'] === process.env.VERIFY_TOKEN) {
    console.log("Validating webhook");
    res.status(200).send(req.query['hub.challenge']);
  } else {
    console.error("Failed validation. Make sure the validation tokens match.");
    res.sendStatus(403);          
  }
});

// Display the web page
app.get('/', function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/html'});
  res.write(messengerButton);
  res.end();
});


// Message processing
app.post('/webhook', function (req, res) {
  console.log("EST")
  console.log(req.body);
  var data = req.body;

  // Make sure this is a page subscription
  if (data.object === 'page') {
    
    // Iterate over each entry - there may be multiple if batched
    data.entry.forEach(function(entry) {
      var pageID = entry.id;
      var timeOfEvent = entry.time;
      
      // Iterate over each messaging event
      entry.messaging.forEach(function(event) {
        if (event.message) {
          receivedMessage(event);
        } else if (event.postback) {
          receivedPostback(event);   
        } else {
          console.log("Webhook received unknown event: ", event);
        }
      });
    });

    // Assume all went well.
    //
    // You must send back a 200, within 20 seconds, to let us know
    // you've successfully received the callback. Otherwise, the request
    // will time out and we will keep trying to resend.
    res.sendStatus(200);
  }
});


function receiveLocations(event, list_locs, list_coords){
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var message = event.message;
  var messageText = message.text;
  var messageAttachments = message.attachments;
  
  // console.log("inside receiveLocations");
    
  if(location_info[senderID]["receive_location"] < location_info[senderID]["number"]){
    // console.log("receive_location: " + location_info[senderID]["receive_location"]);
    console.log("number: " + location_info[senderID]["number"]);
    location_info[senderID]["state"] = 3;
    if(messageText){
      var tmp = {}
      tmp["type"] = "string"
      tmp["data"] = messageText;
      location_info[senderID]["location"].push(tmp);
    }
    else if(messageAttachments){
      console.log("ATTACHMENT")
      var tmp = {}
      tmp["type"] = "coordinates"
      tmp['data'] = {};
      tmp["data"]['lat'] = message.attachments[0].payload.coordinates.lat;
      tmp['data']['lng'] = message.attachments[0].payload.coordinates.long;
      location_info[senderID]["location"].push(tmp);
    }
    location_info[senderID]["receive_location"]+= 1;
    console.log("receive_location: " + location_info[senderID]["receive_location"]);
    console.log("state is: " + location_info[senderID]["state"]);
    
    if(location_info[senderID]["receive_location"] == location_info[senderID]["number"]){
      location_info[senderID]["state"] = 4;
      var newMessage = "What type of place would you like to meet at?";  //Wow mother fucker! Thanks though.
      console.log("list locs and list coords are: ", list_locs, list_coords);
      for (var i=0; i < location_info[senderID]["number"]; i++) {
        if (location_info[senderID]['location'][i]['type'] == 'coordinates') {
          list_coords.push(location_info[senderID]['location'][i]['data'])
        } else {
          list_locs.push(location_info[senderID]['location'][i]['data']) 
        }
      }
      var options = {
        scriptPath: './',
        args: ['value1', 'value2', 'value3']
      };
      sendPlaceMessage(senderID, newMessage)
    }
    else{
      var newMessage = "Send next location.";
      sendLocationMessage(senderID, newMessage)
    }
  }
  return list_locs, list_coords;
}

function getMeetupType(event){
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var message = event.message;
  var messageText = message.text;
  if(messageText){
    location_info[senderID]["typeOfPlace"] = messageText
    location_info[senderID]["state"] = 5;
    var newMessage = "What would you like to optimize on?";
    sendPreferenceMessage(senderID, newMessage)
  }
  else{
    var newMessage = "What type of place would you like to meet at?";
    sendPlaceMessage(senderID, newMessage)
  }
}

function findResult(list_locs, list_coords, type_of_place, messageText, cb){
  return back.findCandidates(list_locs, list_coords, type_of_place, messageText);
}

function getPreference(event, list_locs, list_coords, type_of_place){
  var senderID = event.sender.id;
  var items = [];
  var recipientID = event.recipient.id;
  var message = event.message;
  var messageText = message.text;
  if(messageText){
    location_info[senderID]["preference"] = messageText
    location_info[senderID]["state"] = 6;
    console.log("list locs and list coords are as follows: ", list_locs, list_coords);
    back.findCandidates(list_locs, list_coords, type_of_place, messageText, function(err, items){
      if(err){
        console.log("ERROR in sending result: ", err)
      }
      else if(items == null){
        var newMessage = 'No place found!';
        sendTextMessage(senderID, newMessage);
      }
      else{
        console.log("RESPONSE(final result): ", items);
        console.log("items are: ", items);
        console.log("JSON items: ", JSON.stringify(items))
        var count = 0
        var newMessage = '';
        var messages = []
        while(count < THRESH && count < items.length){
          newMessage = newMessage + JSON.stringify(count+1) + '. ' + items[count][0] + '\n';
          console.log("all the items: ", JSON.stringify(items[count][2]['lat']), items[count][2]['lat'])
          messages.push("https://www.google.co.in/maps/search/?api=1&query=" + JSON.stringify(items[count][2]['lat']) + "," + 
                          JSON.stringify(items[count][2]['lng']) + "&query_place_id=" + JSON.stringify(items[count][3]));
          count++;
        }
        console.log("Final result: " + newMessage)  // Thank you!
        for (var i=0; i<messages.length; i++) {
          sendMapsMessage(senderID, messages[i], items[i][0], 
                          JSON.stringify(items[count][2]['lat']), JSON.stringify(items[count][2]['lng']));
        }
      }
    })
  }
  else{
    var newMessage = "What would you like to optimize on?";
    sendPreferenceMessage(senderID, newMessage)
  }
}

function sendLocationString(senderID){
  var messageText = "Please send your location."
  location_info[senderID]["state"] = 2;
  location_info[senderID]["location"] = []
  sendLocationMessage(senderID, messageText);
}

// Incoming events handling
function receivedMessage(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfMessage = event.timestamp;
  var message = event.message;

  console.log("Received message for user %d and page %d at %d with message:", 
    senderID, recipientID, timeOfMessage);
  console.log(JSON.stringify(message));

  var messageId = message.mid;
  var list_locs = [];
  var list_coords = [];
  var messageText = message.text;
  var messageAttachments = message.attachments;
  console.log(messageText, messageAttachments)
  if(messageText){
    if (messageText.toLowerCase() == "send nudes"){
      sendGenericMessage(senderID);
    } 
    else if (messageText.toLowerCase() == "start plan"){
      startPlan(senderID);
    }
    else if(senderID in location_info){
      if("state" in location_info[senderID]){
        if (location_info[senderID]["state"] == 5){
          console.log("list locs and list coords are: ", list_locs, list_coords);
          getPreference(event, location_info[senderID]['list_locs'], location_info[senderID]['list_coords'], 
                        location_info[senderID]['typeOfPlace']);
        }
        else if (location_info[senderID]["state"] == 4){
          // console.log("list locs and list coords: ", list_locs, list_coords);
          getMeetupType(event);
        }
        else if(location_info[senderID]["state"] == 3){
          //send a thank you msg
          console.log("list locs and list coords: ", list_locs, list_coords);
          list_locs, list_coords = receiveLocations(event, list_locs, list_coords);
          location_info[senderID]["list_locs"] = list_locs;
          location_info[senderID]['list_coords'] = list_coords;
        }
        else if(location_info[senderID]["state"] == 2){
          location_info[senderID]["receive_location"] = 0;
          list_locs, list_coords = receiveLocations(event, list_locs, list_coords);
          console.log("list locs and list coords: ", list_locs, list_coords);
        }
        else if(location_info[senderID]["state"] == 0){
          if(!isNaN(messageText)){
             //received a number = no. of people
            location_info[senderID]["number"] = parseInt(messageText);
            location_info[senderID]["state"] = 1;
            sendLocationString(senderID);
          }
          else{
            //resend How many friends message....

            startPlan(senderID)
          }
        }
        else{
          startPlan(senderID);
        }
      }
      else{
        startPlan(senderID);
      }
    }
    else{
      startPlan(senderID);
    }
  }
  else if(messageAttachments){
    if(location_info[senderID]["state"] == 3){
      console.log("This is inside else if messageAttachments. state 3")
      //send a thank you msg
      list_locs, list_coords = receiveLocations(event, list_locs, list_coords);
      location_info[senderID]["list_locs"] = list_locs;
      location_info[senderID]['list_coords'] = list_coords;
    }
    else if(location_info[senderID]["state"] == 2 && message.attachments[0].payload.coordinates){
      console.log("This is inside else if messageAttachments. state 2")
      location_info[senderID]["receive_location"] = 0;
      receiveLocations(event, list_locs, list_coords);
    }
    else{
      console.log("This is inside else if messageAttachments. state unknown")
      startPlan(senderID);
    }
  }
}

function receivedPostback(event) {
  var senderID = event.sender.id;
  var recipientID = event.recipient.id;
  var timeOfPostback = event.timestamp;

  // The 'payload' param is a developer-defined field which is set in a postback 
  // button for Structured Messages. 
  var payload = event.postback.payload;

  console.log("Received postback for user %d and page %d with payload '%s' " + 
    "at %d", senderID, recipientID, payload, timeOfPostback);
  if (payload == 'NEW_PLAN_PAYLOAD'){
    startPlan(senderID);
  }
  else{
    sendTextMessage(senderID, 'Type "Start plan" to start');
  }
  // When a postback is called, we'll send a message back to the sender to 
  // let them know it was successful
  
}

//////////////////////////
// Sending helpers
//////////////////////////
function sendTextMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText
    }
  };

  callSendAPI(messageData);
}

function sendMapsMessage(recipientId, messageText, subtitle, lat, long) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": subtitle,
            "subtitle": 'Location Shared By Bot',
            "image_url": "https://maps.googleapis.com/maps/api/staticmap?key=" + "AIzaSyBeWcVkl8kxqTdbvNjQfAtvJ0SlfBeXSEQ" +
            "&markers=color:red|label:B|" + lat + "," + long + "&size=360x360&zoom=13",
            "item_url": messageText
          }]
        }
      }
    }
  }
  callSendAPI(messageData);
}

function sendLocationMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      quick_replies: [
        {
          "content_type":"location"
        },
      ]
    }
  };

  callSendAPI(messageData);
}

function sendPreferenceMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      quick_replies: [
        {
          content_type: "text",
          title: "waiting_time",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "travel_time",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "rating",
          payload: "<NUMBER_PAYLOAD>",
        },
      ]
    }
  };

  callSendAPI(messageData);
}

function sendPlaceMessage(recipientId, messageText) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: messageText,
      quick_replies: [
        {
          content_type: "text",
          title: "bar",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "cafe",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "restaurant",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "shopping_mall",
          payload: "<NUMBER_PAYLOAD>",
        },
      ]
    }
  };

  callSendAPI(messageData);
}

function sendGenericMessage(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      attachment: {
        type: "template",
        payload: {
          template_type: "generic",
          elements: [{
            title: "Nudes",
            subtitle: "Next-generation nudes",
            item_url: "https://image.ibb.co/cuPBYG/3440442_photo_of_the_vitruvian_man_by_leonardo_da_vinci_from_1492_on_textured_background_1000.jpg",               
            image_url: "https://image.ibb.co/cuPBYG/3440442_photo_of_the_vitruvian_man_by_leonardo_da_vinci_from_1492_on_textured_background_1000.jpg",
          }]
        }
      }
    }
  };  

  callSendAPI(messageData);
}

function callSendAPI(messageData) {
  request({
    uri: 'https://graph.facebook.com/v2.6/me/messages',
    qs: { access_token: process.env.PAGE_ACCESS_TOKEN },
    method: 'POST',
    json: messageData

  }, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      var recipientId = body.recipient_id;
      var messageId = body.message_id;

      console.log("Successfully sent generic message with id %s to recipient %s", 
        messageId, recipientId);
    } else {
      console.error("Unable to send message.");
      console.error(response);
      console.error(error);
    }
  });  
}

function startPlan(recipientId) {
  //delte all existing info of this user
  location_info[recipientId] = {};
  location_info[recipientId]["state"] = 0;
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "How many people do you want to include in the meetup?",
      quick_replies: [
        {
          content_type: "text",
          title: "2",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "3",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "4",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "5",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "6",
          payload: "<NUMBER_PAYLOAD>",
        },
        {
          content_type: "text",
          title: "7",
          payload: "<NUMBER_PAYLOAD>",
        },
      ]
    }
  };

  callSendAPI(messageData);
}

function sendLatitude(recipientId) {
  // debug function for parallel user session check
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "your latitude: " + latitude
    }
  };
  
  callSendAPI(messageData);
}

// Type of meetup -> implement reply
function setMeetupType(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "Where would you prefer to meet?",
      quick_replies: [
        {
          content_type: "text",
          title:"Send meet_type",
          payload:"<POSTBACK_PAYLOAD>",
        },
      ]
    }
  };

  callSendAPI(messageData);
}

// set preference
function setPreference(recipientId) {
  var messageData = {
    recipient: {
      id: recipientId
    },
    message: {
      text: "What would you prefer to optimize on?",
      quick_replies: [
        {
          content_type: "text",
          title:"Preference: Travel_time",
          payload:"<POSTBACK_PAYLOAD>",
        },
        {
          content_type: "text",
          title:"Preference: Rating",
          payload:"<POSTBACK_PAYLOAD>",
        }
      ]
    }
  };

  callSendAPI(messageData);
}

// Set Express to listen out for HTTP requests
var server = app.listen(process.env.PORT || 3000, function () {
  console.log("Listening on port %s", server.address().port);
});