/**
* Takes data received from LiveStyle analyzer and produces a tree structure
* for conveniet access to analysis
 */
'use strict';

module.exports = function(data) {
	var resultOrigins = populateResultOrigins(data.references);
	var resultTree = populate(data.result, new Node(data.result), function(node) {
		node.origin = resultOrigins[node.id];
	});
	var sourceTree = populate(data.source, new Node(data.source), function(node) {
		var analysis = node.analysis = {};
		var id = node.id;
		if (id in data.references) {
			// since `references` key contains objects with circular references,
			// hide this key from `Object.keys()` for sake of deep equality
			// testing
			Object.defineProperty(analysis, 'references', {
				enumerable: false,
				value: data.references[id].map(id => resultTree.getById(id))
			});
		}

		analysis.selector = data.selectors[id];
		analysis.completions = data.completions[id];
		analysis.variableSuggest = data.variableSuggest[id];
		analysis.computed = data.computedValues[id];
		if (id in data.mixinCall) {
			analysis.mixinCall = data.mixinCall[id];
		}
	});

	return {
		source: sourceTree,
		result: resultTree,
		syntax: data.syntax
	};
};

/**
 * Traces origin (source) node for eaсh result node
 * @param {Object} refs A `references` section of analysis
 * @return {Object}
 */
function populateResultOrigins(refs) {
	var result = {};
	Object.keys(refs).forEach(sourceId => {
		refs[sourceId].forEach(resultId => result[resultId] = sourceId);
	});
	return result;
}

function populate(node, ctx, fn) {
	fn && fn(ctx, node);
	node.children.forEach(child => populate(child, ctx.addChild(child), fn));
	return ctx;
}

function walk(node, fn) {
	fn(node);
	node.children.forEach(child => walk(child, fn));
}

class Node {
	constructor(ref) {
		this.id = ref.id;
		this.type = ref.type;
		this.name = ref.name;
		this.value = ref.value;
		this.nameRange = ref.nameRange;
		this.valueRange = ref.valueRange;
		this.fullRange = ref.range;
		if (!this.fullRange) {
			this.fullRange = ref.nameRange ? [ref.nameRange[0], (ref.valueRange || ref.nameRange)[1]] : [-1, -1];
		} else {
			// workaround for bug when full property range includes
			// preceding formatting
			this.fullRange = this.fullRange.slice(0);
			this.fullRange[0] = this.nameRange[0];
		}
		this.parent = null;
		this.children = [];
		this.analysis = null;
	}

    get root() {
        var root = this;
        while (root.parent) {
            root = root.parent;
        }
        return root;
    }

	addChild(node) {
		if (!(node instanceof Node)) {
			node = new Node(node);
		}

		this.children.push(node);
		node.parent = this;
		return node;
	}

	getById(id) {
		var root = this.root;
		if (!root._idLookup) {
			root._idLookup = {};
			walk(root, function(node) {
				root._idLookup[node.id] = node;
			});
		}

		return root._idLookup[id];
	}

	nodeForPos(pos) {
		var node = null;
		this.children.some(function(child) {
			if (child.fullRange[0] <= pos && pos <= child.fullRange[1]) {
				return node = child;
			}
		});

		return node ? (node.nodeForPos(pos) || node) : null;
	}

	all() {
		var result = [];
		walk(this, node => result.push(node));
		return result;
	}
}
