/**
 * For static properties, displays list of available variables that resolves
 * to the same or similar (for colors) value as property
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const HyperlinkDecoration = require('./HyperlinkDecoration');
const colorPreview = require('./colorPreview');
const type = require('./type');
const utils = require('../utils');

const cl = utils.bem('livestyle-variable-suggest');
const elem = utils.elem;
const displayProperties = {
    type: 'livestyle-widget',
    position: 'bottom-left',
    name: 'variable-suggest'
};

module.exports = class VariableSuggestWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, type.VARIABLE_SUGGEST, displayProperties);
        this._hyperlink = new HyperlinkDecoration(this, 'livestyle-value-with-suggest');
    }

    getValue() {
        return this.getLivestyleData().info.variableSuggest;
    }

    update(value) {
        value = value || this.getValue();
        var propValue = this.getLivestyleData().value;
        var isColor = colorPreview.isColor(propValue);
        var title = elem('h5', {class: cl('-title')}, 'Suggested variables');
        var variables = value.map(v => {
            var content = [
                elem('span', {class: cl('-varname')}, v[0]),
                elem('span', {class: cl('-varvalue')}, v[1])
            ];

            if (isColor) {
                content.unshift(colorPreview(v[2], v[2] !== propValue))
            }

            return elem('div', {
                class: cl('-item'),
                'data-variable': v[0]
            }, content);
        });

        super.update(elem('div', {class: cl('')}, [title].concat(variables)));
    }

    createElement() {
        var elem = super.createElement();
        elem.addEventListener('click', evt => {
            var item = evt.target.closest('.' + cl('-item'));
            if (item) {
                var varName = item.dataset.variable;
                this.editor.setTextInBufferRange(this.marker.getRange(), varName);
                this.marker.destroy();
            }
        });

        return elem;
    }
};
