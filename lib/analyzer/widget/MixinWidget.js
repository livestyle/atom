/**
 * Displays computed content of given mixin invocation.
 * For LESS syntax, also displays list of matched mixins
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
        super(editor, marker, 'mixin');
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

            return div(cl(''), [
                div(cl('-name'), name),
                ...outputToDom(mixin.output)
            ]);
        });
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
