'use strict';

const connect = require('./lib/client');
const ed = require('./lib/editor');
const diffFactory = require('./lib/diff');
const pkg = require('./package.json');

const EDITOR_ID = 'atom';

module.exports.activate = function() {
	connect(pkg.config.websocketUrl, (err, client) => {
		if (err) {
			return console.error('Unable to setup LiveStyle connection:', err);
		}

		console.info('LiveStyle client connected');

		client
		.on('open', () => {
			debug('connection opened');
			clientId(client);
			editorId(client);
		})
		.on('client-connect', () => editorId(client))
		.on('identify-client', () => clientId(client))
		.on('patcher-connect', () => initialContent(client, atom.workspace.getActiveTextEditor()))
		.on('incoming-updates', data => {
			let editor = ed.editorForUri(data.uri);
			if (editor) {
				client.send('apply-patch', ed.payload(editor, {
					'patches': data.patches
				}));
			}
		})
		.on('patch', data => {
			let editor = ed.editorForUri(data.uri);
			if (editor) {
				updateContent(client, editor, data);
			}
		})
		.on('request-files', data => {
			// TODO implement preprocessor dependency fetcher
		})
		.on('request-unsaved-changes', data => {
			let files = data.files || [];
			files.forEach(uri => {
				let editor = ed.editorForUri(uri);
				if (editor) {
					sendUnsavedChanges(client, editor);
				}
			});
		})
		// supress 'error' event since in Node.js, in most cases it means unhandled exception
		.on('error', err => console.error(err));

		// observe editor life cycle
		let diff = diffFactory(client);
		let refresh = () => scheduleRefreshFiles(client);
		atom.workspace.observeTextEditors(editor => {
			refresh();
			let justLoaded = true;
			let callbacks = [
				editor.onDidChange(() => {
					if (ed.syntax(editor)) {
						if (justLoaded) {
							debug('set initial content for new editor');
							initialContent(client, editor);
							justLoaded = false;
						} else if (!ed.isLocked(editor)) {
							debug('editor did change');
							diff(editor);
						}
					}
				}),
				editor.onDidSave(refresh),
				editor.observeGrammar(refresh)
			];
			editor.onDidDestroy(() => {
				callbacks.forEach(c => c.dispose());
				callbacks = null;
				refresh();
			});
		});
	});
};

module.exports.deactivate = function() {
	// TODO close server
	console.log('deactivate');
};

/**
 * Updates content of given editor with patched content from LiveStyle
 * @param  {TextEditor} editor 
 * @param  {Object} payload
 */
function updateContent(client, editor, payload) {
	if (!payload) {
		return;
	}

	ed.lock(editor);
	// unlock after some timeout to ensure that `onDidChange` event didn't 
	// triggered 'calculate-diff' event
	setTimeout(() => ed.unlock(editor), 10);

	if (payload.ranges.length && payload.hash === ed.hash(editor)) {
		// integrity check: if editor content didn't changed since last patch 
		// request (e.g. content hashes are match), apply incremental updates

		let buf = editor.getBuffer();
		editor.transact(() => {
			if (editor.hasMultipleCursors()) {
				// reset multiple selections into a single cursor pos
				let pos = editor.getCursorBufferPosition();
				editor.setCursorBufferPosition(pos, {autoscroll: false});
			}

			let opt = {undo: 'skip'};
			payload.ranges.forEach(r => {
				buf.setTextInRange([
					buf.positionForCharacterIndex(r[0]),
					buf.positionForCharacterIndex(r[1])
				], r[2], opt);
			});

			// select last range
			let lastRange = payload.ranges[payload.ranges.length - 1];
			editor.setSelectedBufferRange([
				buf.positionForCharacterIndex(lastRange[0]),
				buf.positionForCharacterIndex(lastRange[0] + lastRange[2].length)
			]);
		});
	} else {
		// user changed content since last patch request: replace whole content
		editor.setText(payload.content || '');
	}

	// update initial content for current view in LiveStyle cache
	initialContent(client, editor);
}

function sendUnsavedChanges(client, editor) {
	if (editor.isModified()) {
		var previous = editor.getBuffer().cachedDiskContents || '';
		debug('send unsaved changes for', ed.fileUri(editor));
		client.send('calculate-diff', ed.payload(editor, {previous}));
	}
}

////////////////////////////////////////

function editorId(client) {
	debug('send editor id');
	client.send('editor-connect', {
		id: EDITOR_ID,
		title: 'Atom'
	});
	scheduleRefreshFiles(client);
}

function clientId(client) {
	debug('send client id');
	client.send('client-id', {id: EDITOR_ID});
}

function initialContent(client, editor) {
	let syntax = ed.syntax(editor);
	if (syntax) {
		client.send('initial-content', ed.payload(editor));
	}
}

function refreshFiles(client) {
	let files = ed.all().map(editor => ed.fileUri(editor)).filter(unique);
	debug('send file list', files);
	client.send('editor-files',  {id: EDITOR_ID, files});
}

var _refreshFilesTimer = null;
function scheduleRefreshFiles(client) {
	if (!_refreshFilesTimer) {
		_refreshFilesTimer = setImmediate(() => {
			refreshFiles(client);
			_refreshFilesTimer = null;
		});
	}
}

function unique(value, i, array) {
	return array.indexOf(value) === i;
}

function debug() {
	let args = Array.prototype.slice.call(arguments, 0);
	console.log.apply(console, ['%cLiveStyle', 'font-weight:bold;color:green'].concat(args));
}