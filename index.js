'use strict';

const Disposable = require('atom').Disposable;
const CompositeDisposable = require('atom').CompositeDisposable;
const connect = require('./lib/client');
const ed = require('./lib/editor');
const diffFactory = require('./lib/diff');
const readFile = require('./lib/read-file');
const globalDebug = require('./lib/debug');
const createAnalyzer = require('./lib/analyzer');
const autocompleteProvider = require('./lib/analyzer/autocomplete');
const pkg = require('./package.json');
const debug = globalDebug('LiveStyle');

const EDITOR_ID = 'atom';
var analyzer = null;

module.exports.activate = function(state) {
	setupLogger();
	setupAnalyzer();

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
		.on('patcher-connect', () => {
			let editor = atom.workspace.getActiveTextEditor();
			if (editor) {
				initialContent(client, editor);
			}
		})
		.on('incoming-updates', data => {
			let editor = ed.editorForUri(data.uri);
			if (editor) {
				sendEditorPayload(client, editor, 'apply-patch', {
					patches: data.patches
				});
			}
		})
		.on('patch', data => {
			let editor = ed.editorForUri(data.uri);
			if (editor) {
				updateContent(client, editor, data);
			}
		})
		.on('request-files', data => {
			let files = data.files || [];
			debug('requested deps', files);
			Promise.all(files.map(f => readFile(f.uri)))
			.catch(err => {
				console.error('Error fetching preprocessor dependencies:', err);
				return [];
			})
			.then(files => {
				files = files.filter(f => f && f.content !== null);
				debug('respond with deps', files);
				client.send('files', {token: data.token, files});
			});
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
			debug('add callbacks to', editor.getPath());

			// `editor.onDidChange()` might be invoked multiple times during
			// a single change. Instead of sending diff on each `didChange` and
			// generating unnecessary CPU load, postpone a single 'diff' request
			// on next event loop cycle
			// NB `editor.onDidStopChanging()` event is too slow for real-time
			// editing
			let diffScheduled = false;
			let scheduleDiff = () => {
				if (!diffScheduled) {
					process.nextTick(() => {
						debug('diff', editor.getPath());
						diffScheduled = false;
						diff(editor);
					});
					diffScheduled = true;
				}
			}

			if (ed.syntax(editor)) {
				initialContent(client, editor);
			}

			let callbacks = [
				editor.onDidChange(() => {
					if (ed.syntax(editor) && !ed.isLocked(editor)) {
						debug('editor did change');
						scheduleDiff();
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

		atom.workspace.onDidChangeActivePaneItem(item => {
			if (isEditor(item) && ed.syntax(item)) {
				// when uses focuses on supported editor, force update
				// its initial content
				initialContent(client, item);
			}
		});
	});
};

module.exports.config = {
	debugMode: {
		title: 'Debug Mode',
		description: 'Makes excessive logging into DevTools console, helps in finding bugs in plugin',
		type: 'boolean',
		default: false
	},
	analyzer: require('./lib/analyzer/config')
};

module.exports.deactivate = function() {
	// TODO close server
	debug('deactivate');
	globalDebug.disable();
	if (analyzer) {
		analyzer.dispose();
		analyzer = null;
	}
};

module.exports.getProvider = () => autocompleteProvider;

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
		debug('send unsaved changes for', ed.fileUri(editor), {previous});
		sendEditorPayload(client, editor, 'calculate-diff', {previous});
	}
}

function setupLogger() {
	let key = `${pkg.name}.debugMode`;
	let toggle = val => val ? globalDebug.enable() : globalDebug.disable();

	toggle(atom.config.get(key));
	atom.config.onDidChange(key, evt => toggle(evt.newValue));
}

function setupAnalyzer() {
	if (!analyzer) {
		let analyzerInstance = null;
		analyzer = new CompositeDisposable();
		analyzer.add(
			atom.config.observe(`${pkg.name}.analyzer.enabled`, enabled => {
				if (enabled && !analyzerInstance) {
					analyzerInstance = createAnalyzer();
				} else if (!enabled && analyzerInstance) {
					analyzerInstance.dispose();
					analyzerInstance = null;
				}
			}),
			new Disposable(() => {
				if (analyzerInstance) {
					analyzerInstance.dispose();
					analyzerInstance = null;
				}
			})
		);
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
		sendEditorPayload(client, editor, 'initial-content');
	}
}

function sendEditorPayload(client, editor, message, data) {
	ed.payload(editor, data)
	.then(payload => {
		debug('send', message, payload);
		client.send(message, payload);
	});
}

function refreshFiles(client) {
	let files = ed.all().map(editor => ed.fileUri(editor)).filter(unique);
	debug('send file list', files);
	client.send('editor-files',  {id: EDITOR_ID, files});
}

function isEditor(obj) {
	return obj && 'getPath' in obj && 'getRootScopeDescriptor' in obj;
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
