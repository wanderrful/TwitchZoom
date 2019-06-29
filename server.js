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

server.listen(process.env.PORT);

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

app.use((req, res, next) => {
	res.header("Access-Control-Allow-Origin", "*");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	next();
});

// Render the React client as the root route 
app.use("/", (req, res) => {
	res.sendFile(path.join(__dirname + "client/build/index.html"));
});

// Create the Twitch Bot and define its behavior
const bot = (channel, socket) => {
	const tmiOptions = {
		options: {
			debug: false
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