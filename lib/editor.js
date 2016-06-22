/**
 * Utility module for fetching data required by LiveStyle from Atom editor
 */
'use strict';

const path = require('path');
const crc32 = require('crc').crc32;
const projectConfig = require('./project-config');

// List of LiveStyle-supported file extensions and scopes
const supportedSyntaxes = {
	css: 'source.css',
	less: 'source.css.less',
	scss: 'source.css.scss'
};

// Transposed `supportedSyntaxes`, used for lookups
const syntaxScopes = Object.keys(supportedSyntaxes).reduce((v,k) => {
	v[supportedSyntaxes[k]] = k;
	return v;
}, {});

var _bufId = 0;
const bufferIdMapping = new Map();
const locks = new Set();

/**
 * Returns all available `TextEditor`s that supported by LiveStyle
 * @return {Array}
 */
var getAllEditors = module.exports.all = function() {
	return atom.workspace.getTextEditors().filter(editor => getSyntax(editor));
};

/**
 * Returns LiveStyle-supported syntax for given editor.
 * @param  {TextEditor}  editor
 * @return {String} Returns `null` if editor contains unsupported content
 */
var getSyntax = module.exports.syntax = function(editor) {
	// If editor points to a file, use it’s extension instead of grammar.
	// Some users may mistakenly pick wrong syntax
	var filePath = editor.getPath();
	if (filePath) {
		let ext = path.extname(filePath).slice(1);
		return Object.keys(supportedSyntaxes).indexOf(ext) !== -1 ? ext : null;
	}

	// Looks like unsaved file, get syntax from grammar
	let sd = editor.getRootScopeDescriptor();
	let matched = sd.scopes.map(scope => syntaxScopes[scope]).filter(Boolean);
	return matched[0] || null;
};

/**
 * Returns hash for given editor content. Used for comparisions and and
 * for preserving state
 * @param  {TextEditor} editor
 * @return {String}
 */
var getHash = module.exports.hash = function(editor) {
	return crc32(editor.getText());
};

/**
 * Returns URI that uniquely identifies editing text buffer in given editor,
 * including unsaved files
 * @param  {TextEditor} editor
 * @return {String}
 */
var getFileUri = module.exports.fileUri = function(editor) {
	return editor.getPath() || getTempFileName(editor);
};

/**
 * Returns diff/patch payload for given editor to be sent to LiveStyle server
 * @param  {TextEditor} editor
 * @param  {Object} data
 * @return {Object}
 */
module.exports.payload = function(editor, data) {
	var payload = Object.assign({
		uri: getFileUri(editor),
		syntax: getSyntax(editor),
		content: editor.getText(),
		hash: getHash(editor)
	}, data);

	if (payload.syntax === 'css' || !editor.getPath()) {
		// no need to resolve global dependencies
		return Promise.resolve(payload);
	}

	return projectConfig(editor.getPath())
	.then(config => {
		if (config.globals && config.globals.length) {
			payload.globalDependencies = config.globals;
		}
		return payload;
	}, err => payload);
};

/**
 * Returns first supported editor instance for given URI
 * @param  {String}
 * @return {TextEditor}
 */
module.exports.editorForUri = function(uri) {
	return getAllEditors().filter(editor => getFileUri(editor) === uri)[0];
};

/**
 * Locks buffer of given editor. Locked buffer does not respond to `onDidChange`
 * callback that sends updated content to LiveStyle patcher
 * @param  {TextEditor} editor
 */
module.exports.lock = function(editor) {
	locks.add(getBuffer(editor));
};

module.exports.unlock = function(editor) {
	locks.delete(getBuffer(editor));
};

module.exports.isLocked = function(editor) {
	return locks.has(getBuffer(editor));
};

function getBuffer(obj) {
	return obj.getBuffer ? obj.getBuffer() : obj;
}

function getBufferId(editor) {
	let buffer = getBuffer(editor);
	if (!bufferIdMapping.has(buffer)) {
		bufferIdMapping.set(buffer, _bufId++);
		buffer.onDidDestroy(() => bufferIdMapping.delete(buffer));
	}

	return bufferIdMapping.get(buffer);
}

function getTempFileName(editor) {
	return `[untitled:${getBufferId(editor)}]`;
}
