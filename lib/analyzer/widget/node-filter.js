/**
 * For given list of node, retuns ones that pass given search criteria.
 * For every matched node, highlights found word
 */
'use strict';

module.exports = function(nodeList, pattern, options) {
    options = options || {};
	var rePattern = regexp(pattern);
	return reset(nodeList).filter(node => {
		var text = textContainerNode(node, options.textNode);
		if (text.textContent.indexOf(pattern) !== -1) {
			highlight(text, rePattern, options);
			return true;
		}
	});
};

var reset = module.exports.reset = function(nodeList, options) {
	if (!Array.isArray(nodeList)) {
		nodeList = [nodeList];
	}

    let hlClass = options && options.highlightClass || 'highlight';
	nodeList.forEach(node => {
        Array.from(node.querySelectorAll(`.${hlClass}`)).forEach(hl => {
            let parent = hl.parentNode;
            while (hl.firstChild) {
                parent.insertBefore(hl.firstChild, hl);
            }
            parent.removeChild(hl);
            parent.normalize();
        });
	});

	return nodeList;
}

function highlight(node, re, options) {
    let hlClass = options && options.highlightClass || 'highlight';
	node.innerHTML = node.innerText.replace(re, '<b class="' + hlClass + '">$1</b>');
}
function regexp(str) {
	return new RegExp(`(${escapeRegExp(str)})`, 'ig');
}

function escapeRegExp(str) {
	return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

function textContainerNode(node, search) {
	if (typeof search === 'string') {
		return node.querySelector(search);
	}

	if (typeof search === 'function') {
		return search(node);
	}

	return node;
}
