/**
 * Displays computed content of given mixin invocation. For LESS syntax, also
 * displays list of matched mixins.
 *
 * This widget decorates mixin name which will display block with generated
 * mixin calue when clicked
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const utils = require('../utils');
const getIndentation = require('../indentation');

const div = (attrs, content) => utils.elem('div', attrs, content);
const span = (attrs, content) => utils.elem('span', attrs, content);
const bem = utils.bem('livestyle-mixin');
const cl = (...classNames) => ({'class': bem(...classNames)});

module.exports = class MixinWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, 'mixin', {
            type: 'highlight',
            'class': bem('-call')
        });
    }

    createElement() {
        return null;
    }

    isCursorContext() {
        return false;
    }

    getValue() {
        // TODO add mixin source node to analyzer data so it will be possible to
        // click on mixin title and get to mixin source
        var data = this.getLivestyleData();

        return data.info.mixinCall.map(mixin => {
            var name = mixin.name;
			if (mixin.arguments.length) {
				name += `(${mixin.arguments.map(a => a.join(': ')).join(', ')})`;
			}

            let originRange = mixin.origin && JSON.stringify(mixin.origin.nameRange);
            return div(cl(''), [
                div({
                    'class': bem('-name'),
                    'data-go-to-range': originRange
                }, name),
                ...outputToDom(mixin.output)
            ]);
        });
    }

    toggle(editor, pos) {
        if (this._blockDecoration) {
            this._blockDecoration.destroy();
            this._blockDecoration = null;
            return false;
        }

        var ls = this.getLivestyleData();
        var marker = this.getMarker();
        var options = {
            softTabs: editor.getSoftTabs(),
            tabLength: editor.getTabLength(),
            indent: getIndentation(editor, marker.getBufferRange().start),
            grammar: editor.getGrammar()
        };

        this._blockDecoration = editor.decorateMarker(marker, {
            item: createMixinOutput(ls.info.mixinCall, options),
            type: 'block',
            position: 'after'
        });
        this._blockDecoration.onDidDestroy(() => this._blockDecoration = null);
    }
};

function outputToDom(output) {
	return output.map(item => {
		if (typeof item[1] === 'string') {
            return div(cl('-property'), [
                span(cl('-property-name'), item[0]),
                span(cl('-property-value'), item[1])
            ]);
		}

        return div(cl('-section'), [
            div(cl('-section-name'), item[0]),
            div(cl('-section-body'), outputToDom(item[1]))
        ]);
	});
}

function stringifyOutput(output, indent) {
    indent = indent || getIndentation();
	return output.map(item => {
		if (typeof item[1] === 'string') {
            return indent + item.join(': ') + ';';
		}

        return `${indent}${item[0]} {\n${stringifyOutput(item[1], indent.increment())}\n${indent}}`;
	});
}

/**
 * Creates element with formatted mixin output
 * @param  {Array} data Array of matched mixin outputs
 * @return {HTMLElement}
 */
function createMixinOutput(data, options) {
    // we’ll create a mini editor with CSS grammar and mixin declarations as
    // block decorations
    var elem = document.createElement('atom-text-editor');
    elem.setAttribute('mini', 'mini');
    elem.classList.add('livestyle-mixin__output');

    var editor = elem.getModel();
    editor.setSoftTabs(options.softTabs);
    editor.setTabLength(options.tabLength);
    editor.setGrammar(options.grammar);
    updateMixinOutputContent(editor, data, options);
    return elem;
}

function updateMixinOutputContent(editor, data, options) {
    var output = [];
    var indent = options && options.indent || getIndentation();
    data.forEach(mixin => {
        // TODO setup proper declaration for LESS syntax
        var declaration = `@mixin ${mixin.name}`;
        if (mixin.arguments.length) {
            declaration += `(${mixin.arguments.map(a => a.join(': ')).join(', ')})`;
        }

        var text = stringifyOutput(mixin.output, indent.increment());
        var lastOutput = output[output.length - 1];

        output.push({
            declaration,
            text: `${indent}${declaration} {\n${text.join('\n')}\n${indent}}`,
            lines: text.length,
            offset: lastOutput ? lastOutput.lines + lastOutput.offset : 0
        });
    });

    editor.setText(output.map(item => item.text).join('\n'));
    // remove old LiveStyle markers
    editor.findMarkers()
    .filter(utils.isLiveStyleMarker)
    .forEach(marker => marker.destroy());

    // add new markers before every matched mixin output and decorate them
    // with block decorations with mixin declaration
    output.forEach(item => {
        var row = item.offset;
        var col = editor.indentationForBufferRow(item.offset);
        var marker = editor.markBufferRange([[row, col], [row, col + item.declaration.length]]);
        editor.decorateMarker(marker, {
            type: 'highlight',
            class: 'livestyle-mixin__name'
        });
    });
}
