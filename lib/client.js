/**
 * A minimal LiveStyle server client. Unlike existing
 * `livestyle/client`, this one will not reconnect when connection
 * in dropped. Instead, it will start its own WeSocket server instance.
 */
'use strict';

const WebSocket = require('ws');
const parseUrl = require('url').parse;
const createServer = require('./server');
const debug = require('./debug')('LiveStyle Client');

var errCount = 0;
var defaultOptions = {
	reconnectOnClose: true,
	maxRetries: 5
};

var connect = module.exports = function(url, options, callback) {
	if (typeof options === 'function') {
		callback = options;
		options = {};
	}

	callback = callback || noop;
	options = Object.assign({}, defaultOptions, options);

	debug('connecting to', url);
	var client = new WebSocket(url);

	return client
	.on('message', onMessage)
	.once('open', function() {
		debug('connection opened');
		errCount = 0;
		callback(null, wrapClient(client));
	})
	.once('close', function() {
		// reconnect if connection dropped
		var reconnect = !this._destroyed && options.reconnectOnClose;
		debug('connection closed', reconnect ? ', reconnecting' : '');
		if (reconnect) {
			connect(url, options, callback);
		}
	})
	.once('error', function(err) {
		debug(err);
		if (err.code === 'ECONNREFUSED') {
			// ECONNREFUSED means there’s no active LiveStyle
			// server, we should create our own instance and reconnect again
			errCount++;
			if (errCount < options.maxRetries) {
				return createServer(parseUrl(url).port, function() {
					this.removeListener('error', callback);
					var c = connect(url, options, callback);
					c.server = this;
				})
				.once('error', callback);
			}
		}

		// unknown error, aborting
		callback(err);
	});
};

function noop() {}

function onMessage(message) {
	try {
		message = JSON.parse(message);
	} catch (err) {
		return debug('Error parsing message: %s', err.message);
	}

	this.emit('message-receive', message.name, message.data);
	this.emit(message.name, message.data);
}

function wrapClient(client) {
	var _send = client.send;
	client.send = function(name, data) {
		try {
			_send.call(this, JSON.stringify({name, data}));
		} catch(err) {
			debug('Error while sending message:', err);
			client.emit('error', err);
		}
	};

	client.destroy = function() {
		this.close();
		this._destroyed = true;
		if (this.server) {
			this.server.destroy();
			this.server = null;
		}
	};
	return client;
}
