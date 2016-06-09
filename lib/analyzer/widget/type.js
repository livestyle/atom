'use strict';

const utils = require('../utils');

module.exports = function(marker) {
    var data = utils.markerData(marker);

    if (data.type === 'property' && !!data.info.mixinCall) {
        return module.exports.MIXIN_CALL;
    } else if (data.type === 'property' && data.info.computed != null) {
        return module.exports.COMPUTED_VALUE;
    }
};

module.exports.COMPUTED_VALUE = 'computed-value';
module.exports.MIXIN_CALL = 'mixin';
