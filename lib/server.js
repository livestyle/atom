/**
 * LiveStyle WebSocket server
 */
'use strict';
const http = require('http');
const WebSocketServer = require('ws').Server;
const debug = require('./debug')('LiveStyle Server').disable();

var server;
var clients  = []; // all connected clients
var patchers = []; // clients identified as 'patcher'
var editors  = {}; // clients identified as 'editor'

const serverId = 'LiveStyle WebSocket server is up and running by Atom plugin.'

/**
 * Start server on given port
 * @param  {Number} port
 * @param  {Function} callback
 */
module.exports = function(port, callback) {
	if (!server) {
		debug('starting server at', port);
		server = http.createServer(handleHttpRequest)
		.once('close', onServerClose);

		server.ws = new WebSocketServer({server, verifyClient});
		server.ws.on('connection', onWsConnection);
		server.listen(port, callback);
	} else {
		debug('re-use existing server');
	}
	return server;
};

module.exports.send = function(message, exclude) {
	sendMessage(clients, message, exclude);
};

module.exports.destroy = function(callback) {
	while (clients.length) {
		clients.pop().terminate();
	}

	patchers.length = 0;
	editors = {};
	if (server) {
		server.close(callback);
	} else if (typeof callback === 'function') {
		callback();
	}
};

Object.defineProperties(module.exports, {
	server: {
		get() {
			return server;
		}
	}
});

function verifyClient(info) {
	debug('verifying request', /^\/livestyle\/?/.test(info.req.url));
	return /^\/livestyle\/?/.test(info.req.url);
}

/**
 * Response stub for HTTP requests to WebSocket server
 * @param  {http.IncomingMessage} req
 * @param  {http.ServerResponse} res
 */
function handleHttpRequest(req, res) {
	debug('got http request');
	res.writeHead(200, {Connection: 'close'});
	res.end(serverId);
}

function onWsConnection(conn) {
	debug('received ws connection');
	clients.push(conn);
	conn
	.on('message', handleMessage)
	.on('close', removeClient);

	sendMessage(clients, {name: 'client-connect'}, conn);
}

function onServerClose() {
	debug('closed');
	if (this.ws) {
		this.ws.removeListener('connection', onWsConnection);
		this.ws = null;
	}
}

function handleMessage(message) {
	var payload = JSON.parse(message);
	var receivers = clients;
	debug('got message', payload.name);
	switch (payload.name) {
		case 'editor-connect':
			editors[payload.data.id] = this;
			break;
		case 'patcher-connect':
			patchers.push(this);
			break;
		case 'calculate-diff':
		case 'apply-patch':
			receivers = patchers;
			break;
	}

	// Send all incoming messages to all connected clients
	// except current one
	sendMessage(receivers, message, this);
}

/**
 * Sends message to given receivers
 * @param  {Array} receivers List of receivers (websocket clients)
 * @param  {Object} message   Message to send
 * @param  {Websocket|Array} exclude  Exclude given client(s) from receivers
 */
function sendMessage(receivers, message, exclude) {
	if (typeof message !== 'string')  {
		message = JSON.stringify(message);
	}

	if (exclude) {
		if (!Array.isArray(exclude)) {
			exclude = [exclude];
		}
		receivers = receivers.filter(client => exclude.indexOf(client) === -1);
	}

	receivers.forEach(r => r.send(message));
}

/**
 * Removes given client from all collections
 * @param  {Websocket} client
 */
function removeClient() {
	removeFromArray(clients, this);
	removeFromArray(patchers, this);

	for (let id of Object.keys(editors)) {
		if (editors[id] === this) {
			sendMessage(clients, {
				name: 'editor-disconnect',
				data: {id}
			});
			delete editors[id];
		}
	}
}

/**
 * Removes all occuences of `item` from given aray
 * @param  {Array} arr
 * @param  {any} item
 * @return {Array}
 */
function removeFromArray(arr, item) {
	for (var i = arr.length - 1; i >= 0; i--) {
		if (arr[i] === item) {
			arr.splice(i, 1);
		}
	}
	return arr;
};
