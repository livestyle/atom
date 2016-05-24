/**
 * Widget for displaying computed value from current LiveStyle marker
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');

module.exports = class ComputedValueWidget extends AbstractWidget {
    constructor(editor, marker) {
        console.log('create computed value for', marker);
        super(editor, marker, 'computed-value');
    }

    getValue() {
        var marker = this.getMarker();
        if (marker.bufferMarker) {
            marker = marker.bufferMarker;
        }
        return marker.getProperties().livestyle.info.computed;
    }
}
