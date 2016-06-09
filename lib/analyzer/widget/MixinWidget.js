/**
 * Displays computed content of given mixin invocation. For LESS syntax, also
 * displays list of matched mixins.
 *
 * This widget decorates mixin name which will display block with generated
 * mixin calue when clicked
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const type = require('./type');
const utils = require('../utils');
const getIndentation = require('../indentation');

const div = (attrs, content) => utils.elem('div', attrs, content);
const span = (attrs, content) => utils.elem('span', attrs, content);
const bem = utils.bem('livestyle-mixin');
const cl = (...classNames) => ({'class': bem(...classNames)});

module.exports = class MixinWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, type.MIXIN_CALL, getDecorationProps());
        // this.onMouseEnter(event => console.log('mouse enter', this, event));
        // this.onMouseLeave(event => console.log('mouse leave', this, event));
        this.onClick(event => {
            event.stopPropagation();
            this.toggle();
        });
    }

    getDecorationProps(expanded) {
        return {
            type: 'highlight',
            class: bem(expanded ? '-hl_expanded' : '-hl')
        };
    }

    createElement() {
        return null;
        // return utils.elem('i', {class: `icon icon-chevron-right ${bem('-call')}`});
    }

    isCursorContext() {
        return false;
    }

    getValue() {
        // TODO add mixin source node to analyzer data so it will be possible to
        // click on mixin title and get to mixin source
        return '';
    }

    toggle() {
        if (this._blockDecoration) {
            this.decoration.setProperties(getDecorationProps());
            return this._destroyContextDecoration();
        }

        var marker = this.getMarker();
        var editorOptions = {
            softTabs: this.editor.getSoftTabs(),
            tabLength: this.editor.getTabLength(),
            indent: getIndentation(this.editor, marker.getBufferRange().start),
            grammar: this.editor.getGrammar()
        };

        this._blockDecoration = this.editor.decorateMarker(marker, {
            item: createMixinOutput(this.dataProvider(), editorOptions),
            type: 'block',
            position: 'after',
            editorOptions
        });
        this._blockDecoration.onDidDestroy(() => this._blockDecoration = null);
        this.decoration.setProperties(getDecorationProps(true));
    }

    dataProvider() {
        return this.getLivestyleData().info.mixinCall;
    }

    update() {
        if (!this._blockDecoration) {
            return;
        }

        var props = this._blockDecoration.getProperties();
        var editor = props.item.getModel();
        var options = props.editorOptions;
        updateMixinOutputContent(editor, this.dataProvider(), options);
    }

    _destroyContextDecoration() {
        if (this._blockDecoration) {
            this._blockDecoration.destroy();
            this._blockDecoration = null;
        }
    }

    destroy() {
        this._destroyContextDecoration();
        return super.destroy();
    }
};

function getDecorationProps(expanded) {
    return {
        type: 'highlight',
        class: bem(expanded ? '-hl_expanded' : '-hl')
    };
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
