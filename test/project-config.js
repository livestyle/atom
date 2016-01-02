'use strict';

const path = require('path');
const assert = require('assert');
const projectConfig = require('../lib/project-config');

describe('Project config', () => {
	let p = file => path.resolve(__dirname, file);
	// lower caches maxAge for sake of testing
	let _caches = projectConfig._caches();
	_caches.configCache.options.maxAge = 80;
	_caches.lookupCache.options.maxAge = 130;

	beforeEach(() => {
		_caches.configCache.clear();
		_caches.lookupCache.clear();
	});

	it('find livestyle.json', done => {
		projectConfig(p('fixtures/conf1/foo.scss'))
		.then(config => {
			assert(config);
			assert.equal(config.globals.length, 3);
			done();
		})
		.catch(done);
	});

	it('find .livestyle.json', done => {
		projectConfig(p('fixtures/conf2/foo.scss'))
		.then(config => {
			assert(config);
			assert.equal(config.globals.length, 3);
			done();
		})
		.catch(done);
	});

	it('no config', done => {
		projectConfig(p('fixtures/foo.scss'))
		.then(() => done(new Error('Should fail')))
		.catch(err => {
			assert.equal(err.code, 'ENOCONFIG');
			done();
		});
	});

	it('invalid JSON', done => {
		projectConfig(p('fixtures/conf3/foo.scss'))
		.then(() => done(new Error('Should fail')))
		.catch(err => {
			assert.equal(err.code, 'EINVALIDJSON');
			done();
		});
	});

	it('missing deps files', done => {
		projectConfig(p('fixtures/conf4/foo.scss'))
		.then(config => {
			assert(config);
			assert.equal(config.globals.length, 1);
			done();
		})
		.catch(done);
	});

	it('cache', done => {
		let target = p('fixtures/conf1/foo.scss');
		let cacheMarker = Date.now();

		projectConfig(target)
		.then(config => {
			assert.deepEqual(getKeys(_caches.lookupCache), [path.dirname(target)]);
			assert.equal(config.globals.length, 3);
			
			// mark current config with special property and make sure it exists
			// upon next request
			config.cacheMarker = cacheMarker;
			return projectConfig(p('fixtures/conf1/bar.scss'));
		})
		.then(config => {
			assert.equal(config.globals.length, 3);
			assert.equal(config.cacheMarker, cacheMarker);
			// wait some time to ensure cache is expired then make next request,
			// it shouold not contain cache marker
			return new Promise(resolve => setTimeout(resolve, 150))
		})
		.then(() => projectConfig(p('fixtures/conf1/baz.scss')))
		.then(config => {
			assert.equal(config.globals.length, 3);
			assert.equal(config.cacheMarker, undefined);
			done();
		})
		.catch(done)
	});
});

function getKeys(map) {
	let keys = [];
	for (let k of map.keys()) {
		keys.push(k);
	}
	return keys;
}