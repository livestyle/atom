/**
 * Widget factory: generates widget of given type
 */
'use strict';
const ComputedValueWidget = require('./ComputedValueWidget');

module.exports = function(editor, marker, type) {
    if (type === 'computed-value') {
        return new ComputedValueWidget(editor, marker);
    }
};
