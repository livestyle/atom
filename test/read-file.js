'use strict';

const path = require('path');
const assert = require('assert');
const readFile = require('../lib/read-file');

require('../lib/debug').disable();

describe('Read file', () => {
	let p = file => path.resolve(__dirname, file);

	// lower caches maxAge for sake of testing
	readFile._cache.options.maxAge = 70;

	it('read and cache', done => {
		let lastTime;
		let target = p('fixtures/conf1/d1.scss');
		let content = '.foo {padding: 10px;}';

		readFile(target)
		.then(obj => {
			assert.equal(obj.uri, target);
			assert.equal(obj.content, content);
			lastTime = obj.readTime;

			// wait for some time and then continue to ensure that we received
			// cached object
			return new Promise(resolve => setTimeout(resolve, 10));
		})
		.then(() => readFile(target))
		.then(obj => {
			assert.equal(obj.uri, target);
			assert.equal(obj.content, content);
			assert.equal(obj.readTime, lastTime);

			// wait for some time and then continue to ensure that 
			// cache was cleared and we received new object
			return new Promise(resolve => setTimeout(resolve, 70));
		})
		.then(() => readFile(target))
		.then(obj => {
			assert.equal(obj.uri, target);
			assert.equal(obj.content, content);
			assert(obj.readTime > lastTime);
			done();
		})
		.catch(done);
	});
});