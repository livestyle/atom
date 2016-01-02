/**
 * Reads and caches contents of given file
 */
'use strict';

const fs = require('fs');
const path = require('path');
const crc32 = require('crc').crc32;
const CacheMap = require('./cache-map');
const debug = require('./debug')('LiveStyle File Reader').disable();

const cache = new CacheMap({maxAge: 10000});

module.exports = function(uri) {
	debug('requested file', uri);
	uri = path.resolve(uri);
	if (!cache.get(uri)) {
		debug('no cached copy, fetch new');
		cache.set(uri, fetch(uri));
	}

	return cache.get(uri);
};

// for unit-testing
module.exports._cache = cache;

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