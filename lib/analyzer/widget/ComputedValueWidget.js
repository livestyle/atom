/**
 * Widget for displaying computed value from current LiveStyle marker
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const colorPreview = require('./colorPreview');

module.exports = class ComputedValueWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, 'computed-value');
    }

    getValue() {
        var data = this.getLivestyleData();
        var computedValue = colorPreview.addColorMarkers(data.info.computed);
        return data.value !== computedValue ? computedValue : null;
    }
}
