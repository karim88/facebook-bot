'use strict';

const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// Imports dependencies and set up http server
const
    request = require('request'),
    express = require('express'),
    body_parser = require('body-parser'),
    app = express().use(body_parser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 3000, () => console.log('webhook is listening'));
const cars = require('./db.json');

// Response messages
const welcomeMsg = [
    "Hi",
    "Hey",
    "Hello"
];


const errMsg = [
    'Apparently we don\'t speak the same language',
    'I don\'t understand what you say??',
    'Try something else',
    'Ask for Help'
];

// Accepts POST requests at /webhook endpoint
app.get('/', function (req, res) {
    //console.log(req.query);
    res.send('Great stuff!!');
});

app.post('/webhook', (req, res) => {
    // Parse the request body from the POST
    let body = req.body;

    // Check the webhook event is from a Page subscription
    if (body.object === 'page') {

        body.entry.forEach(function(entry) {

            // Gets the body of the webhook event
            let webhook_event = entry.messaging[0];
            console.log(webhook_event);


            // Get the sender PSID
            let sender_psid = webhook_event.sender.id;
            console.log('Sender ID: ' + sender_psid);
            // Check if the event is a message or postback and
            // pass the event to the appropriate handler function
            if (webhook_event.message) {
                handleMessage(sender_psid, webhook_event.message);
            } else if (webhook_event.postback) {
                handlePostback(sender_psid, webhook_event.postback);
            }
        });
        // Return a '200 OK' response to all events
        res.status(200).send('EVENT_RECEIVED');
    } else {
        // Return a '404 Not Found' if event is not from a page subscription
        res.sendStatus(404);
    }

});

// Accepts GET requests at the /webhook endpoint
app.get('/webhook', (req, res) => {

    /** UPDATE YOUR VERIFY TOKEN **/
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    // Parse params from the webhook verification request
    let mode = req.query['hub.mode'];
    let token = req.query['hub.verify_token'];
    let challenge = req.query['hub.challenge'];

    // Check if a token and mode were sent
    if (mode && token) {

        // Check the mode and token sent are correct
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {

            // Respond with 200 OK and challenge token from the request
            console.log('WEBHOOK_VERIFIED');
            res.status(200).send(challenge);

        } else {
            // Responds with '403 Forbidden' if verify tokens do not match
            res.sendStatus(403);
        }
    }
});

/**
 * Handle messages
 * @param {*} sender_psid Sender PSID
 * @param {*} received_message Message
 * @returns {void}
 */
const handleMessage = (sender_psid, received_message) => {
    let response = {};

    // Checks if the message contains text
    if (received_message.text) {
        // Create the payload for a basic text message, which
        // will be added to the body of our request to the Send API
        const resp = myResponse(sender_psid, received_message.text);
        const type = resp[0];
        response[type] = resp[1];
    } else if (received_message.attachments) {
        // Get the URL of the message attachment
        let attachment_url = received_message.attachments[0].payload.url;
        response = {
            "attachment": {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": [{
                        "title": "Is this the right picture?",
                        "subtitle": "Tap a button to answer.",
                        "image_url": attachment_url,
                        "buttons": [
                            {
                                "type": "postback",
                                "title": "Yes!",
                                "payload": "yes",
                            },
                            {
                                "type": "postback",
                                "title": "No!",
                                "payload": "no",
                            }
                        ],
                    }]
                }
            }
        }
    }

    // Send the response message
    callSendAPI(sender_psid, response);
};

/**
 * Find cars by sender id
 * @param {*} sender_id Sender id
 * @returns {*} Car
 */
const findCars = (sender_id) => cars.filter((car) => Number(car.sender_id) === Number(sender_id));
const findCar = (sender_id, car_id) => cars.filter((car) => Number(car.sender_id) === Number(sender_id) && Number(car.id) === Number(car_id));
const findCarByName = (sender_id, name) => cars.filter((car) => Number(car.sender_id) === Number(sender_id) && car.name.toLowerCase() === name.toLowerCase());
const findCarByModel = (sender_id, model) => cars.filter((car) => Number(car.sender_id) === Number(sender_id) && car.model.toLowerCase() === model.toLowerCase());
const findCarByMatricule = (sender_id, matricule) => cars.filter((car) => Number(car.sender_id) === Number(sender_id) && car.matricule.toLowerCase() === matricule.toLowerCase());

/**
 * Response to message
 * @param {*} sender_id Sender PSID
 * @param {*} text Received message
 * @returns {String} Text
 */
const myResponse = (sender_id, text) => {
    let resp = [
        'text',
        errMsg[Math.floor(Math.random() * errMsg.length)]
    ];

    if (text.toLowerCase() === "hey" || text.toLowerCase() === "hi" || text.toLowerCase() === "hello" || text.toLowerCase() === "salam") {
        return [
            'text',
            welcomeMsg[Math.floor(Math.random() * welcomeMsg.length)]
        ];
    }
    if (text.toLowerCase() === "login") {
        return [
            'text',
            'You don\'t need to login'
        ];
    }
    if (text.toLowerCase().match(/car: \d*/)) {

        const car_id = text.toLowerCase().replace("car: ", "").trim();

        let car = findCar(sender_id, car_id);
        if (Number(car.length) === 0) {
            return [
                'text',
                'unfortunately you don\'t have any car yet!'
            ];
        }
        return [
            'attachment',
            {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": {
                        "element": {
                            "title": car[0].name.toUpperCase() + ' ' + car[0].model.toUpperCase(),
                            "image_url": 'https://maps.googleapis.com/maps/api/staticmap?size=764x400&center=' + car[0].latitude + ',' + car[0].longitude + '&zoom=13&markers=' + car[0].latitude + ',' + car[0].longitude,
                            "item_url": 'http://maps.apple.com/maps?q=' + car[0].latitude + ',' + car[0].longitude + '&z=16'
                        }
                    }
                }
            }
        ];
    }
    if (text.toLowerCase().match(/car brand \s*/)) {

        const name = text.toLowerCase().replace("car brand ", "").trim();

        let cars = findCarByName(sender_id, name);
        if (Number(cars.length) === 0) {
            return [
                'text',
                'unfortunately you don\'t have any car with that rand!'
            ];
        }
        if(Number(cars.length) === 1) {

            return [
                'attachment',
                {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": {
                            "element": {
                                "title": cars[0].name.toUpperCase() + ' ' + cars[0].model.toUpperCase(),
                                "image_url": 'https://maps.googleapis.com/maps/api/staticmap?size=764x400&center=' + cars[0].latitude + ',' + cars[0].longitude + '&zoom=13&markers=' + cars[0].latitude + ',' + cars[0].longitude,
                                "item_url": 'http://maps.apple.com/maps?q=' + cars[0].latitude + ',' + cars[0].longitude + '&z=16'
                            }
                        }
                    }
                }
            ];
        }
        cars = cars.map((car) => {
            return {
                "title": 'Brand: ' + car.name,
                "subtitle": 'Model: ' + car.model + ' | Matricule: ' + car.matricule
            };
        });
        return [
            "attachment",
            {
                "type": "template",
                "payload": {
                    "top_element_style": "compact",
                    "template_type": "list",
                    "elements":
                        cars.slice(0, 4)
                }
            }
        ];
    }
    if (text.toLowerCase().match(/car model \s*/)) {

        const model = text.toLowerCase().replace("car model ", "").trim();

        let cars = findCarByModel(sender_id, model);
        if (Number(cars.length) === 0) {
            return [
                'text',
                'unfortunately you don\'t have any car with that model!'
            ];
        }

        if(Number(cars.length) === 1) {
            return [
                'attachment',
                {
                    "type": "template",
                    "payload": {
                        "template_type": "generic",
                        "elements": {
                            "element": {
                                "title": cars[0].name.toUpperCase() + ' ' + cars[0].model.toUpperCase(),
                                "image_url": 'https://maps.googleapis.com/maps/api/staticmap?size=764x400&center=' + cars[0].latitude + ',' + cars[0].longitude + '&zoom=13&markers=' + cars[0].latitude + ',' + cars[0].longitude,
                                "item_url": 'http://maps.apple.com/maps?q=' + cars[0].latitude + ',' + cars[0].longitude + '&z=16'
                            }
                        }
                    }
                }
            ];
        }
        cars = cars.map((car) => {
            return {
                "title": 'brand: ' + car.name,
                "subtitle": 'Model: ' + car.model + ' | Matricule: ' + car.matricule
            };
        });
        return [
            "attachment",
            {
                "type": "template",
                "payload": {
                    "top_element_style": "compact",
                    "template_type": "list",
                    "elements":
                        cars.slice(0, 4)
                }
            }
        ];
    }
    if (text.toLowerCase().match(/car matricule \s*/)) {

        const matricule = text.toLowerCase().replace("car matricule ", "").trim();

        let car = findCarByMatricule(sender_id, matricule);
        if (Number(car.length) === 0) {
            return [
                'text',
                'unfortunately you don\'t have any car with that matricule!'
            ];
        }
        return [
            'attachment',
            {
                "type": "template",
                "payload": {
                    "template_type": "generic",
                    "elements": {
                        "element": {
                            "title": car[0].name.toUpperCase() + ' ' + car[0].model.toUpperCase(),
                            "image_url": 'https://maps.googleapis.com/maps/api/staticmap?size=764x400&center=' + car[0].latitude + ',' + car[0].longitude + '&zoom=13&markers=' + car[0].latitude + ',' + car[0].longitude,
                            "item_url": 'http://maps.apple.com/maps?q=' + car[0].latitude + ',' + car[0].longitude + '&z=16'
                        }
                    }
                }
            }
        ];
    }
    if (text.toLowerCase().match(/cars list \d*/)) {

        let num = text.toLowerCase().replace("cars list ", "").trim();

        let mycars = findCars(sender_id);
        if (!mycars) {
            return [
                'text',
                'unfortunately you don\'t have any cars yet!'
            ];
        }
        mycars = mycars.map((car) => {
            return {
                "title": 'Brand: ' + car.name,
                "subtitle": 'Model: ' + car.model + ' | Matricule: ' + car.matricule
            };
        });

        num = Number(num) <= 0 ? 1 : num;
        let min = 4 * (Number(num) - 1);
        let max = 4 * Number(num);
        if (min >= mycars.length) {
            return [
                'text', 'the list has only ' + mycars.length + ' cars,\nbut you requested cars from ' + (min + 1) + ' to ' + (max + 1)
            ];
        }
        return [
            "attachment",
            {
                "type": "template",
                "payload": {
                    "top_element_style": "compact",
                    "template_type": "list",
                    "elements":
                        mycars.slice(min, max)
                }
            }
        ];
    }
    if (text.toLowerCase() === "help" || text.toLowerCase() === "help me") {
        return [
            'text',
            'UltimateBot\n' +
            '- car: {id)\tDisplay car by id\n' +
            '- car brand {name}\tDisplay car(s) by brand name\n' +
            '- car model {model}\tDisplay car(s) by model\n' +
            '- car matricule {matricule}\tDisplay car by matricule\n' +
            '- cars list {page}\tList cars by page each page has 4 cars\n' +
            '- cars\tDisplay 4th first cars\n' +
            '- help\tDisplay help'
        ];
    }
    if (text.toLowerCase() === "get my cars" || text.toLowerCase() === "list my cars" || text.toLowerCase() === "cars" || text.toLowerCase() === "my cars") {
        let mycars = findCars(sender_id);
        if (!mycars) {
            return [
                'text',
                'unfortunately you don\'t have any cars yet!'
            ];
        }
        mycars = mycars.map((car) => {
            return {
                "title": car.name,
                "subtitle": car.model + ' ' + car.matricule
            };
        });
        return [
            "attachment",
            {
                "type": "template",
                "payload": {
                    "top_element_style": "compact",
                    "template_type": "list",
                    "elements":
                        mycars.slice(0, 4)
                }
            }
        ];
    }

    return resp;
}

/**
 * Handle postback
 * @param {*} sender_psid Sender PSID
 * @param {*} received_postback POSTBACK
 * @returns {void}
 */
const handlePostback = (sender_psid, received_postback) => {
    let response;
    // Get the payload for the postback
    let payload = received_postback.payload;

    // Set the response based on the postback payload
    if (payload === 'yes') {
        response = { "text": "Thanks!" }
    } else if (payload === 'no') {
        response = { "text": "Oops, try sending another image." }
    }
    // Send the message to acknowledge the postback
    callSendAPI(sender_psid, response);
};

/**
 * Sending
 * @param {*} sender_psid Sender PSID
 * @param {*} response Response
 * @returns {void}
 */
const callSendAPI = (sender_psid, response) => {
    // Construct the message body
    let request_body = {
        "recipient": {
            "id": sender_psid
        },
        "message": response
    };

    // Send the HTTP request to the Messenger Platform
    request({
        "uri": "https://graph.facebook.com/v2.6/me/messages",
        "qs": { "access_token": PAGE_ACCESS_TOKEN },
        "method": "POST",
        "json": request_body
    }, (err, res, body) => {
        console.log(body);
        if (!err) {
            console.log('message sent!');
        } else {
            console.error("Unable to send message:" + err);
        }
    });
};

