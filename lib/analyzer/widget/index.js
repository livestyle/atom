/**
 * Widget factory: generates widget of given type
 */
'use strict';
const ComputedValueWidget = require('./ComputedValueWidget');
const MixinWidget = require('./MixinWidget');

module.exports = function(editor, marker, type) {
    if (type === 'computed-value') {
        return new ComputedValueWidget(editor, marker);
    } else if (type === 'mixin') {
        return new MixinWidget(editor, marker);
    }
};
