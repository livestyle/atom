/**
 * A little debug logger
 */
'use strict';

const colors = [
	'lightseagreen',
	'forestgreen',
	'goldenrod',
	'dodgerblue',
	'darkorchid',
	'crimson'
];
var colorIx = 0;
var enabled = true;

module.exports = function(prefix) {
	let color = colors[colorIx];
	colorIx = (colorIx + 1) % colors.length;
	let localEnabled = true;
	let out = function() {
		if (!enabled || !localEnabled) {
			return;
		}

		let args = Array.prototype.slice.call(arguments, 0);
		console.log.apply(console, [`%c${prefix}`, `font-weight:bold;color:${color}`].concat(args));
	};

	out.enable = function() {
		localEnabled = true;
		return out;
	};

	out.disable = function() {
		localEnabled = false;
		return out;
	};

	return out;
};

module.exports.disable = () => enabled = false;
module.exports.enable = () => enabled = true;