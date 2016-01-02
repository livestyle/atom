/**
 * Performs diff requests to LiveStyle patcher.
 * When `diff()` method is called, sends `calculate-diff` request to patching
 * server and wait until either `diff` or `error` response is received.
 * Until that all other `diff()` requests are queued to lower the pressure
 * to patcher and save system resources
 */
'use strict';

const ed = require('./editor');
const debug = require('./debug')('LiveStyle Patcher');

// Duration, in milliseconds, after which performing diff lock considered obsolete
const waitTimeout = 10000;

module.exports = function(client) {
	const _state = {
		lockedBy: null,
		created: 0,
		pending: []
	};

	let nextQueued = release => {
		if (release) {
			debug('Release diff lock');
			_state.lockedBy = null;
		}

		// make sure current command lock is still valid
		if (_state.lockedBy && _state.created + waitTimeout < Date.now()) {
			debug('Waiting response is obsolete, reset');
			_state.lockedBy = null;
		}

		if (!_state.lockedBy && _state.pending.length) {
			let uri = _state.pending.shift();
			let editor = ed.editorForUri(uri);
			if (!editor) {
				// looks like view for pending diff is already closed, move to next one
				debug('No view, move to next queued diff item');
				return nextQueued();
			}

			debug('Send "calculate-diff" message');
			_state.lockedBy = uri;
			_state.created = Date.now();
			ed.payload(editor).then(payload => client.send('calculate-diff', payload));
		} else {
			debug('Diff locked, waiting for response');
		}
	};

	client
	.on('diff', data => {
		debug('Got diff response for', data.uri);
		if (_state.lockedBy === data.uri) {
			debug('Release diff lock, move to next item');
			nextQueued(true);
		}
	})
	.on('error', data => {
		if (typeof data !== 'object' || data instanceof Error) {
			// a system error, do not handle
			return;
		}

		let origin = data.origin || {};
		if (origin.name === 'calculate-diff' && _state.lockedBy && _state.lockedBy === origin.uri) {
			nextQueued(true);
		}
	});

	return function(editor) {
		let uri = ed.fileUri(editor);
		if (_state.pending.indexOf(uri) === -1) {
			debug('Pending patch request for', uri);
			_state.pending.push(uri);
		}

		nextQueued();
	};
};