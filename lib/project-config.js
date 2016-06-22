/**
 * A project config reader for LiveStyle, mostly for fetching global deps.
 * Reads data from `livestyle.json` file found in one of the top folder of given
 * file.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const glob = require('glob');
const CacheMap = require('./cache-map');

const configFiles = ['livestyle.json', '.livestyle.json'];
const configCache = new CacheMap({maxAge: 5000});
const lookupCache = new CacheMap({maxAge: 30000});

module.exports = function(file) {
	let dir = path.dirname(file);
	if (!lookupCache.get(dir)) {
		lookupCache.set(dir, findConfigFile(dir));
	}

	return lookupCache.get(dir)
	.then(configFile => {
		if (!configCache.get(configFile)) {
			configCache.set(configFile, readConfig(configFile));
		}
		return configCache.get(configFile);
	})
};

// for unit-tesing
module.exports._caches = () => ({configCache, lookupCache});

/**
 * Find config for given `dir`, moving upward the file structure
 * @param  {String} dir Initial dir to start searching
 * @return {Promise}
 */
function findConfigFile(dir) {
	return new Promise((resolve, reject) => {
		let next = (d) => {
			if (!d) {
				return reject(error('ENOCONFIG', `No config found for ${dir} path`));
			}

			fs.readdir(d, (err, items) => {
				if (err) {
					return reject(err);
				}

				let found = configFiles.filter(f => items.indexOf(f) !== -1);
				if (found.length) {
					return resolve(path.resolve(d, found[0]));
				}

				let nextDir = path.dirname(d);
				next(nextDir && nextDir !== d ? nextDir : null);
			});
		};

		next(dir);
	});
}

/**
 * Reads given config file into a final config data
 * @param  {String} file Path to config file
 * @return {Promise}
 */
function readConfig(file) {
	return new Promise((resolve, reject) => {
		fs.readFile(file, 'utf8', (err, content) => {
			if (err) {
				return reject(error(err.code, `Unable to read ${file}: ${err.message}`));
			}

			try {
				content = JSON.parse(content) || {};
			} catch(e) {
				return reject(error('EINVALIDJSON', `Unable to parse ${file}: ${e.message}`));
			}

			readDeps(file, content).then(resolve, reject);
		});
	});
}

function readDeps(file, config) {
	var globals = config.globals;
	if (!config.globals) {
		return Promise.resolve(Object.assign({}, config, {globals: []}));
	}

	return globAllDeps(globals, path.dirname(file))
	.then(globals => Object.assign({}, config, {globals}));
}

function globDeps(pattern, cwd) {
	return new Promise((resolve, reject) => {
		glob(pattern, {cwd}, (err, items) => resolve(items || []));
	});
}

function globAllDeps(patters, cwd) {
	if (typeof patters === 'string') {
		return globDeps(patters, cwd);
	}

	if (Array.isArray(patters)) {
		return Promise.all(patters.map(p => globDeps(p, cwd)))
		.then(values => values
			.reduce((r, v) => r.concat(v), [])
			.filter(unique)
			.map(v => path.resolve(cwd, v))
		);
	}

	return Promise.reject(new Error('Unknown pattern type for global dependencies'));
}

function error(code, message) {
	let err = new Error(message || code);
	err.code = code;
	return err;
}

function unique(value, i, array) {
	return array.indexOf(value) === i;
}
