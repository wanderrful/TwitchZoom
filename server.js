"use strict";

// Load process environment variables for .env file
require('dotenv').config();

console.log(process.env.USERNAME);
console.log(process.env.PASSWORD);
console.log(process.env.PORT);

// Define import requirements
const express = require("express");
const path = require("path");

const tmi = require('tmi.js');
const socketio = require('socket.io');

const app = express();

// Serve static files from the React app
app.use(express.static(path.join(__dirname, "client/build")));

// Render the React client as the root route 
app.get("/", (req,res) => {
	res.sendFile(path.join(__dirname + "client/build/index.html"), { backendPort: process.env.PORT });
});

// Let's run the thing!
const httpServer = app.listen(process.env.PORT);
const io = socketio.listen(httpServer);

// Define the Twitch Bot's behavior
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
		console.log(`** L55: successfully connected to font-end!`)
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
			  	message:  ало камбэечная, тайлу скоро придут
			  	self:  false
			*/
			console.log(`[${channel}]: ${message}`);
			socket.emit('message', { channel, userstate, message });
		});
		socket.on('disconnect', () => {
			client.disconnect();
			socket.disconnect();
			console.log('Client disconnected');
		});
	});
	client.on('disconnected', reason => {
		console.log('Disconnected: ', reason);
	});
}

// Begin listening to the relevant Twitch chat and feeding messages to the front-end
try {
io.sockets.on('connection', (socket, username) => {
	console.log(`** L90: back-end connection successful!`);
	socket.on('message', channel => {
		bot(channel, socket);
	});
});
} catch (err) { console.log(err); }