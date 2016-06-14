'use strict';

const utils = require('../utils');

module.exports = function(marker) {
    var data = utils.markerData(marker);

    if (data.type === 'property' && !!data.info.mixinCall) {
        return module.exports.MIXIN_CALL;
    } else if (data.type === 'property' && data.info.variableSuggest) {
        return module.exports.VARIABLE_SUGGEST;
    } else if (data.type === 'property' && data.info.computed != null) {
        return module.exports.COMPUTED_VALUE;
    } else if (data.type === 'section' && data.info.selector && data.info.selector !== data.name) {
        return module.exports.SELECTOR;
    }
};

module.exports.COMPUTED_VALUE = 'computed-value';
module.exports.MIXIN_CALL = 'mixin';
module.exports.SELECTOR = 'selector';
module.exports.VARIABLE_SUGGEST = 'variable-suggest';
