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

        var item = document.createElement('atom-text-editor');
        var inlineEditor = item.getModel();
        var text = this.getLivestyleData().info.mixinCall
        .map(mixin => stringifyOutput(mixin.output))
        .join('\n');

        inlineEditor.setGrammar(atom.grammars.grammarForScopeName('source.css'));
        inlineEditor.setText(text);
        this._blockDecoration = editor.decorateMarker(this.getMarker(), {
            item,
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
    indent = indent || '';
	return output.map(item => {
		if (typeof item[1] === 'string') {
            return indent + item.join(': ') + ';';
		}

        return `${indent}${item[0]} {\n${stringifyOutput(item[1], indent + '\t')}${indent}\n}`;
	})
    .join('\n');
}
