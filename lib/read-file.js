/**
 * Reads and caches contents of given file
 */
'use strict';

const fs = require('fs');
const path = require('path');
const LRU = require('lru-cache');

const maxAge = 10000;
const cache = new LRU({maxAge});

module.exports = function(filePath) {
	filePath = path.resolve(filePath);
	var f = cache.get(filePath);
	if (!f) {
		f = fetch(filePath);
		cache.set(filePath, f);
	}

	return f.then(validate);
};

function fetch(filePath) {
	return read(filePath)
	.catch(err => err)
	.then(content => {
		let isError = content instaceof Error;
		return {
			filePath,
			readTime: Date.now(),
			content: !isError ? content : null,
			error: isError ? content : null
		};
	});
}

function read(filePath) {
	return new Promise((resolve, reject)) => {
		fs.readFile(filePath, 'utf8', (err, contents) => {
			err ? reject(err) : resolve(contents);
		});
	};
}

function validate(fileObj) {
	if (file.readTime + maxAge > Date.now()) {
		return fileObj;
	}
	return fetch(fileObj.filePath);
}