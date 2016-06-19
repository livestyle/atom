/**
 * Widget factory: generates widget of given type
 */
'use strict';

const ComputedValueWidget = require('./ComputedValueWidget');
const MixinWidget = require('./MixinWidget');
const SelectorWidget = require('./SelectorWidget');
const VariableSuggestWidget = require('./VariableSuggestWidget');
const type = require('./type');
const utils = require('../utils');

module.exports = function(editor, marker) {
    var data = utils.markerData(marker);
    if (data.type === type.COMPUTED_VALUE) {
        return new ComputedValueWidget(editor, marker);
    } else if (data.type === type.MIXIN_CALL) {
        return new MixinWidget(editor, marker);
    } else if (data.type === type.SELECTOR) {
        return new SelectorWidget(editor, marker);
    } else if (data.type === type.VARIABLE_SUGGEST) {
        return new VariableSuggestWidget(editor, marker);
    }
};
