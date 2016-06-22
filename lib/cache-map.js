/**
 * A simple time-based cache storage: stores items and removes them when they
 * expire. Unlike LRU, items in this cache will always expire, no matter how
 * often you access them.
 */
'use strict';

const defaultOptions = {
	maxAge: 10000
};

class CacheMap extends Map {
	constructor(options) {
		super();
		this.options = Object.assign({}, defaultOptions, options);
		this._times = new Map();
	}

	set(key, value) {
		super.set(key, value);
		this._times.set(key, Date.now());
	}

	get(key) {
		removeExpired(this, this._times, this.options.maxAge);
		return super.get(key);
	}

	delete(key) {
		this._times.delete(key);
		return super.delete(key);
	}

	clear() {
		this._times.clear();
		return super.clear();
	}

	keys() {
		removeExpired(this, this._times, this.options.maxAge);
		return super.keys();
	}

	values() {
		removeExpired(this, this._times, this.options.maxAge);
		return super.values();
	}

	entries() {
		removeExpired(this, this._times, this.options.maxAge);
		return super.entries();
	}
};

module.exports = CacheMap;

function removeExpired(storage, times, maxAge) {
	var expTime = Date.now() - maxAge;
	times.forEach((v, k) => {
		if (v < expTime) {
			storage.delete(k);
			times.delete(k);
		}
	});
}
