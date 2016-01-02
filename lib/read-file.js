/**
 * Reads and caches contents of given file
 */
'use strict';

const fs = require('fs');
const path = require('path');
const LRU = require('lru-cache');
const crc32 = require('crc').crc32;
const debug = require('./debug')('LiveStyle File Reader').disable();

const maxAge = 10000;
const cache = new LRU({maxAge});

module.exports = function(uri) {
	debug('requested file', uri);
	uri = path.resolve(uri);
	var f = cache.get(uri);
	if (!f) {
		debug('no cached copy, fetch new');
		f = fetch(uri);
		cache.set(uri, f);
	}

	return f.then(validate);
};

function fetch(uri) {
	return read(uri).then(content => ({
		uri,
		content,
		readTime: Date.now(),
		hash: crc32(content || '')
	}));
}

function read(filePath) {
	return new Promise((resolve, reject) => {
		fs.readFile(filePath, 'utf8', (err, content) => resolve(err ? null : content));
	});
}

function validate(fileObj) {
	if (fileObj.readTime + maxAge > Date.now()) {
		return fileObj;
	}
	debug(`cached copy of ${fileObj.uri} is obsolete, fetch new`);
	return fetch(fileObj.uri);
}