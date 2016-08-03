/**
 * Displays computed content of given mixin invocation. For LESS syntax, also
 * displays list of matched mixins.
 *
 * This widget decorates mixin name which will display block with generated
 * mixin value when clicked
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const HyperlinkDecoration = require('./HyperlinkDecoration');
const type = require('./type');
const utils = require('../utils');
const getIndentation = require('../indentation');

module.exports = class MixinWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, type.MIXIN_CALL, {
            type: 'block',
            position: 'after'
        });

        this._hyperlink = new HyperlinkDecoration(this, 'livestyle-mixin__hl');
        let expandedClass = 'livestyle-mixin__hl_expanded';
        this.disposable.add(
            this.onDidShow(() => this._hyperlink.addClass(expandedClass)),
            this.onDidHide(() => this._hyperlink.removeClass(expandedClass))
        );
    }

    createElement() {
        var elem = document.createElement('atom-text-editor');
        elem.setAttribute('mini', 'mini');
        elem.classList.add('livestyle-mixin__output');

        var editor = elem.getModel();
        var options = this.getEditorOptions();
        editor.setSoftTabs(options.softTabs);
        editor.setTabLength(options.tabLength);
        editor.setGrammar(options.grammar);
        return elem;
    }

    getValue() {
        // TODO add mixin source node to analyzer data so it will be possible to
        // click on mixin title and get to mixin source
        var indent = this.getEditorOptions().indent;
        var data = this.getLivestyleData().info.mixinCall;
        var syntax = utils.supportedSyntax(this.editor);

        var prevLines, prevOffset;

        return data.map(mixin => {
            var declaration = syntax === 'scss' ? `@mixin ${mixin.name}` : mixin.name;

            if (mixin.arguments.length) {
                let argList = mixin.arguments.map(arg => {
                    return arg[1] !== '' && arg[1] != null ? arg.join(': ') : arg[0];
                });
                declaration += `(${argList.join(', ')})`;
            }

            var text = stringifyOutput(mixin.output, indent.increment());
            var lines = text.split('\n').length;
            var offset = 0;
            if (prevLines != null) {
                lines += prevLines;
                offset += prevOffset;
            }

            prevLines = lines;
            prevOffset = offset;

            return {
                declaration,
                lines,
                offset,
                text: `${indent}${declaration} {\n${text}\n${indent}}`
            };
        });
    }

    update(value) {
        if (!this.elem) {
            return;
        }

        value = value != null ? value : this.getValue();
        var editor = this.elem.getModel();

        editor.setText(value.map(item => item.text).join('\n'));

        // remove old LiveStyle markers
        editor.findMarkers()
        .filter(utils.isLiveStyleMarker)
        .forEach(marker => marker.destroy());

        // add new markers before every matched mixin output and decorate them
        // with block decorations with mixin declaration
        value.forEach(item => {
            var row = item.offset;
            var col = editor.indentationForBufferRow(item.offset);
            var marker = editor.markBufferRange([[row, col], [row, col + item.declaration.length]]);
            editor.decorateMarker(marker, {
                type: 'highlight',
                class: 'livestyle-mixin__name'
            });
        });
    }

    getEditorOptions() {
        return {
            softTabs: this.editor.getSoftTabs(),
            tabLength: this.editor.getTabLength(),
            indent: getIndentation(this.editor, this.getMarker().getRange().start),
            grammar: this.editor.getGrammar()
        };
    }
};

function stringifyOutput(output, indent) {
    indent = indent || getIndentation();
	return output
    .filter(item => !Array.isArray(item[1]) || item[1].length)
    .map(item => {
		if (typeof item[1] === 'string') {
            return indent + item.join(': ') + ';';
		}

        return `${indent}${item[0]} {\n${stringifyOutput(item[1], indent.increment())}\n${indent}}`;
	}).join('\n');
}
