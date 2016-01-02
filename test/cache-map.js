'use strict';

const assert = require('assert');
const CacheMap = require('../lib/cache-map');

describe('Cache Map', () => {
	it('create & auto-remove', done => {
		let cache = new CacheMap({maxAge: 100});

		cache.set('k1', 'v1');
		cache.set('k2', 'v2');

		assert.equal(cache.get('k1'), 'v1');
		assert.equal(cache.get('k2'), 'v2');
		assert.deepEqual(getKeys(cache), ['k1', 'k2']);

		setTimeout(() => {
			cache.set('k2', 'v2-2');
			cache.set('k3', 'v3');
			assert.deepEqual(getKeys(cache), ['k1', 'k2', 'k3']);
		}, 50);

		setTimeout(() => {
			// `k1` should be removed here
			assert.deepEqual(getKeys(cache), ['k2', 'k3']);
			assert.equal(cache.get('k1'), undefined);
			assert.equal(cache.get('k2'), 'v2-2');
			assert.equal(cache.get('k3'), 'v3');
		}, 110);

		setTimeout(() => {
			assert.deepEqual(getKeys(cache), []);
			assert.equal(cache.get('k1'), undefined);
			assert.equal(cache.get('k2'), undefined);
			assert.equal(cache.get('k3'), undefined);

			done();
		}, 200);
	});

	it('sync times and values', () => {
		let cache = new CacheMap({maxAge: 100});
		cache.set('k1', 'v1');
		cache.set('k2', 'v2');

		assert.deepEqual(getKeys(cache), ['k1', 'k2']);

		cache.delete('k1');
		assert.deepEqual(getKeys(cache), ['k2']);
		assert.deepEqual(getKeys(cache._times), ['k2']);

		cache.clear();
		assert.deepEqual(getKeys(cache), []);
		assert.deepEqual(getKeys(cache._times), []);
	});
});

function getKeys(map) {
	let keys = [];
	for (let k of map.keys()) {
		keys.push(k);
	}
	return keys;
}