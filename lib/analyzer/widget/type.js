'use strict';

const hasColor = require('./colorPreview').isColor;

module.exports = function(node) {
    let type = node.type;
    if (type === 'root') {
        return module.exports.ROOT_NODE;
    } else if (type === 'property' && !!node.analysis.mixinCall) {
        return module.exports.MIXIN_CALL;
    } else if (type === 'property' && node.analysis.variableSuggest) {
        return module.exports.VARIABLE_SUGGEST;
    } else if (type === 'property' && node.analysis.computed != null) {
        // reduce noise for computed values (basically, all the property values):
        // output only marker where computed value contains colors
        // or its value differs from original one
        let val = node.analysis.computed;
        return node.value !== val || hasColor(val) ? module.exports.COMPUTED_VALUE : null;
    } else if (type === 'section' && node.analysis.selector && node.analysis.selector !== node.name) {
        return module.exports.SELECTOR;
    } else if (type === 'section' && node.analysis.completions) {
        return module.exports.COMPLETIONS_PROVIDER;
    }
};

module.exports.ROOT_NODE = 'root';
module.exports.COMPUTED_VALUE = 'computed-value';
module.exports.MIXIN_CALL = 'mixin';
module.exports.SELECTOR = 'selector';
module.exports.VARIABLE_SUGGEST = 'variable-suggest';
module.exports.COMPLETIONS_PROVIDER = 'completions-provider';
