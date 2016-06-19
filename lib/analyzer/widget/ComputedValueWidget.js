/**
 * Widget for displaying computed value from current LiveStyle marker
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const colorPreview = require('./colorPreview');
const type = require('./type');
const pkg = require('../../../package.json');

const configKey = `${pkg.name}.analyzer.computedValue`;
const displayProperties = {
    type: 'livestyle-widget',
    position: 'bottom-left',
    name: 'computed-value'
};

module.exports = class ComputedValueWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, type.COMPUTED_VALUE, displayProperties);

        this.disposable.add(
            this.onCursorEnter(() => {
                if (atom.config.get(configKey)) {
                    this.show();
                }
            }),
            this.onCursorLeave(() => this.hide())
        );
    }

    getValue() {
        var data = this.getLivestyleData();
        var computedValue = colorPreview.addColorMarkers(data.info.computed);
        return data.value !== computedValue ? computedValue : null;
    }
};
