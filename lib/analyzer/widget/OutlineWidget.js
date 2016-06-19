/**
 * A web component that displays preprocessor stylesheet structure as well
 * as its compiled CSS result tree
 */
'use strict';

const utils = require('../utils');
const nodeFilter = require('./node-filter');
const Emitter = require('atom').Emitter;

const nodeFilterOptions = {textNode: '.node-label-text'};
const escapeHTMLMap = {
    '<': '&lt;',
    '>': '&gt',
    '&': '&amp;'
};

class LiveStyleOutline extends HTMLElement {
    createdCallback() {
        this.emitter = new Emitter();
        this._cache = new WeakMap();
        this._shadow = this.createShadowRoot();
        // create initial contents
        this._shadow.innerHTML = `
            <ul class="switch">
				<li class="selected" data-target="source"></li>
				<li data-target="result"></li>
			</ul>
			<input type="text" name="search" placeholder="Filter tree..." />
			<div class="section-list">
                <section class="selected" data-type="source"></section>
                <section data-type="result"></section>
			</div>
			<p class="tip">Use Tab key to toggle between source and result</p>
        `;

        let fld = this.searchField;

        this._shadow.addEventListener('click', evt => {
            if (this.controls.indexOf(evt.target) !== -1) {
                this.toggleSection(evt.target.dataset.target);
                evt.preventDefault();
                evt.stopPropagation();
                fld.focus();
            } else if (evt.target.classList.contains('node-label')) {
                evt.preventDefault();
    			evt.stopPropagation();
    			this.highlightNode(evt.target.closest('.node'));
    			this.hide();
            }
        });

        fld.addEventListener('keydown', this.handleKeyEvent.bind(this));
		fld.addEventListener('keyup', evt => {
			let query = fld.value.trim();
			if (this._prevQuery !== query) {
				this.filter(query);
				this._prevQuery = query;
			}
            evt.stopPropagation();
		});
    }

    attachedCallback() {
        this.searchField.focus();
    }

    setData(editor, model) {
        this._cache = new WeakMap();
        this.editor = editor;
        this.model = model;
        this._prevSelectedRanges = editor.getSelectedBufferRanges();
        let sourceGrammar = editor.getGrammar();
        let resultGrammar = atom.grammars.grammarForScopeName('source.css');
        this.sections.forEach(section => {
            let type = section.dataset.type;
            section.classList.remove('filtered');
            section.innerHTML = stringifyTree(
                model[type],
                model[type === 'source' ? 'result' : 'source'],
                type === 'source' ? sourceGrammar : resultGrammar
            );
        });
    }

    get searchField() {
        return this._shadow.querySelector('input[name=search]');
    }

    get controls() {
        return Array.from(this._shadow.querySelectorAll('.switch > li'));
    }

    get sections() {
        return Array.from(this._shadow.querySelectorAll('.section-list section'));
    }

    get activeSection() {
        return this._shadow.querySelector('.section-list section.selected');
	}

	get activeSectionName() {
		var section = this.activeSection;
		return section && section.dataset.type;
	}

    get activeSectionNodes() {
        return this.getSectionNodes(this.activeSection);
    }

    getSectionNodes(section) {
        if (typeof section === 'string') {
            section = this.sections.filter(s => s.dataset.type === section)[0];
        }

        if (section && !this._cache.has(section)) {
            this._cache.set(section, Array.from(section.querySelectorAll('.node')));
        }

        return this._cache.get(section);
    }

    traverse(up) {
		var nodes = this.activeSectionNodes;
		var active = -1;

		if (this.activeSection.classList.contains('filtered')) {
			nodes = nodes.filter(node => node.classList.contains('filtered'));
		}

		nodes.some((n, i) => {
			if (n.classList.contains('selected')) {
				active = i;
				return true;
			}
		});

		if (active === -1) {
			active = up ? 0 : nodes.length - 1;
		}

		nodes[active].classList.remove('selected');
		let hl = nodes[(active + nodes.length + (up ? -1 : 1)) % nodes.length];
		this.highlightNode(hl);
	}

	highlightNode(node) {
		node.classList.add('selected');
        node.scrollIntoViewIfNeeded();

		var range = node.dataset.range;
		if (range) {
            // highlight selected node in editor
            range = utils.makePositionRange(this.editor.getBuffer(), range.split(','));
			this.editor.setSelectedBufferRange(range);
		}
        this.emitter.emit('node-highlight', node);
	}

	toggleSection(name) {
        let sections = this.sections;
		if (typeof name !== 'string') {
			// section name is not a string:
			// find next/prev section to select
			let selected = sections.indexOf(this.activeSection);

			if (selected === -1) {
				selected = !name ? 0 : sections.length - 1;
			} else {
				selected = (selected + sections.length + (name ? -1 : 1)) % sections.length;
			}

			name = sections[selected].dataset.type;
		}

		this.controls.forEach(s => s.classList.toggle('selected', s.dataset.target === name));
		sections.forEach(s => s.classList.toggle('selected', s.dataset.type === name));
        this.emitter.emit('change-section', name);
	}

	filter(query) {
		query = query.trim();

        this.sections.forEach(section => {
            section.classList.toggle('filtered', !!query);
            if (query) {
                var nodes = this.getSectionNodes(section);
                if (nodes) {
                    nodes.forEach(node => node.classList.remove('filtered'));
                    nodeFilter(nodes, query, nodeFilterOptions).forEach(markAsFiltered);
                }
            } else {
                nodeFilter.reset(section);
            }
        });

        this.emitter.emit('filtered', query);
	}

	handleKeyEvent(evt) {
		switch (evt.keyCode) {
			case 9:  // tab
				this.toggleSection(evt.shiftKey);
				break;

			case 13: // enter
				this.hide();
				break;

			case 27: // escape
				if (this._prevSelectedRanges) {
					this.editor.setSelectedBufferRanges(this._prevSelectedRanges);
				}
				this.hide();
				break;

			case 38: // up
			case 40: // down
				this.traverse(evt.keyCode === 38);
				break;

			default:
				return;
		}

		evt.preventDefault();
		evt.stopPropagation();
	}

    hide() {
        this.emitter.emit('hide');
        atom.views.getView(this.editor).focus();
    }

    onDidHide(callback) {
        return this.emitter.on('hide', callback);
    }
}

function stringifyTree(tree, counterTree, grammar) {
	var empty = [];
	return tree.children.map(node => {
		let content = '';
        let name = escapeHTML(node.name);
		if (node.type === 'property') {
			let sep = /^[\.#]/.test(name) || name === '@include' ? ' ' : ': ';
			content = `${nodeLabel(name + sep + escapeHTML(node.value))}`;
		} else {
			content = `${nodeLabel(name)}
                <div class="node-body">${stringifyTree(node, counterTree, grammar)}</div>`;
		}

		var range = null;
		var rangeSource = node.origin ? counterTree.getById(node.origin) : node;
		if (rangeSource) {
			range = rangeSource.type === 'property'
				? rangeSource.fullRange
				: rangeSource.nameRange;
		}

		return `<div class="node" data-type="${node.type}" data-name="${name}" data-range="${(range || empty).join(',')}">${content}</div>`;
	}).join('');
}

function nodeLabel(text) {
    return `<div class="node-label"><div class="node-label-text">${text}</div></div>`;
}

function markAsFiltered(node) {
    while (node && node.nodeType !== 11) {
        if (node.classList && node.classList.contains('node')) {
            node.classList.add('filtered');
        }
        node = node.parentNode;
    }
}

function escapeHTML(str) {
    return str.replace(/[<>&]/g, ch => escapeHTMLMap[ch]);
}

module.exports = document.registerElement('livestyle-outline', {
    prototype: LiveStyleOutline.prototype
});
