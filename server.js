"use strict";

// Load process environment variables for .env file
require('dotenv').config();

// Define import requirements
const express = require("express");
const path = require("path");

const tmi = require('tmi.js');

const app = express();

// Let's run the thing!
const server = require("http").Server(app);
const WebSocket = require("ws");
//const io = require('socket.io')(server);

server.listen(process.env.PORT);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

// Render the React client as the root route 
app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname + "client/build/index.html"));
});

// Create the Twitch Bot and define its behavior
const bot = (channel, socket) => {
	const tmiOptions = {
		options: {
			debug: true
		},
		connection: {
			reconnect: false
		},
		identity: {
			username: `${process.env.USERNAME}`,
			password: `${process.env.PASSWORD}`
		},
		channels: [channel]
	};

	const client = new tmi.client(tmiOptions);
	client.connect()
		.catch(err => { console.warn(err) });
	client.on('connected', (addr, port) => {
		console.log(`L55: Bot successfully connected to channel ${channel}!`)
		client.on('message', (channel, userstate, message, self) => {
			/*	---- DATA RESPONSE FORMAT ----
				channel:  #starladder5
				userstate:  {
				  badges: null,
				  color: '#8A2BE2',
				  'display-name': 'necrus7',
				  emotes: null,
				  id: '35e7ee43-3928-48b5-8db1-b8274bb36dd1',
				  mod: false,
				  'room-id': '28633374',
				  subscriber: false,
				  'tmi-sent-ts': '1537018245483',
				  turbo: false,
				  'user-id': '135853874',
				  'user-type': null,
				  'emotes-raw': null,
				  'badges-raw': null,
				  username: 'necrus7',
				  'message-type': 'chat'
				}
			  	message:  asdf
			  	self:  false
			*/
			console.log(`[${channel.toLowerCase()}]: ${message}`);
			socket.send(JSON.stringify({
				channel,
				userstate,
				message
			}));
		});
		socket.onclose = e => {
			client.disconnect();
			console.log('Socket closed (client disconnect)');
		};
	});
	client.on('disconnected', reason => {
		socket.terminate();
		console.log('Bot Disconnected: ', reason);
	});
}

// Begin listening to the relevant Twitch chat and feeding messages to the front-end
const wss = new WebSocket.Server({ server });

console.log(`** WebSocket.Server created: ${JSON.stringify(wss.address(), null, 2)}`);

wss.on('connection', ws => {
	console.log(`L97: Established connection with new client!`);
	ws.onmessage = channel => {
		console.log(`** Initializing new Bot for channel ${channel.data}...`);
		bot(channel.data, ws);
	};
});