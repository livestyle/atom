/**
 * Widget factory: generates widget of given type
 */
'use strict';

const ComputedValueWidget = require('./ComputedValueWidget');
const MixinWidget = require('./MixinWidget');
const SelectorWidget = require('./SelectorWidget');
const getType = require('./type');

module.exports = function(editor, marker) {
    var type = getType(marker);
    if (type === getType.COMPUTED_VALUE) {
        return new ComputedValueWidget(editor, marker);
    } else if (type === getType.MIXIN_CALL) {
        return new MixinWidget(editor, marker);
    } else if (type === getType.SELECTOR) {
       return new SelectorWidget(editor, marker);
   }
};
