/**
 * Autocomplete+ provider for LiveStyle completetions (variables and mixins).
 *
 * How it works:
 * LiveStyle adds stylesheet analysis data as marker into current document.
 * There’s a special marker with type `section` that holds completions specifical
 * for context section. So in order to provide completions we have to find
 * section marker from given cursor position and feed them to Autocomplete+
 */
'use strict';

const utils = require('./utils');
const reColor = require('./widget/colorPreview').reColor;
const reVarPrefix = /[\$@][\w\-]*$/;

module.exports = {
    selector: '.source.scss, .source.less',
    disableForSelector: '.source.scss .comment, .source.scss .string, .source.less .comment, .source.less .string',
    filterSuggestions: true,

    getSuggestions(request) {
        let scopes = request.scopeDescriptor.getScopesArray();
        let marker = utils.getLiveStyleMarkers(request.editor, request.bufferPosition)
        .filter(marker => ls(marker).type === 'section')
        .sort((a, b) => b.getStartBufferPosition().compare(a.getStartBufferPosition()))
        [0];

        if (marker) {
            // console.log('request completions for', request.prefix, scopes, marker);
            if (hasScope(scopes, 'meta.property-value.scss') || hasScope(scopes, 'meta.property-value.less')) {
                return variableCompletions(request, ls(marker).info.completions);
            } else if (hasScope(scopes, 'meta.at-rule.include.scss')) {
                return scssMixinCompletions(request, ls(marker).info.completions);
            }
        }

        return [];
    }
};

function variableCompletions(request, completions) {
    if (!completions || !completions.variables) {
        return;
    }

    // The `$` and `@` characters are stop symbols for autocomplete+, e.g. it
    // won’t be available in `request.prefix`. Make sure variable prefix
    // exists before invocation point
    let line = getLine(request.editor, request.bufferPosition)
    if (!reVarPrefix.test(line)) {
        return;
    }

    return Object.keys(completions.variables).map(name => {
        var resolvedValue = completions.variables[name];
        if (isColor(resolvedValue)) {
            resolvedValue = `<i class="livestyle-autocomplete-color" style="background-color:${resolvedValue}"></i>${resolvedValue}`;
        }

        return {
            type: 'variable',
            text: name.substr(1),
            displayText: name,
            rightLabelHTML: resolvedValue
        };
    });
}

function scssMixinCompletions(request, completions) {
    return completions && completions.mixins && completions.mixins.map(mixin => {
        var args = mixin.arguments.map((arg, i) => `\${${i + 1}:${arg[0]}}`).join(', ') || '$0';

        return {
            type: 'function',
            snippet: `${mixin.name}(${args})`,
            displayText: `${mixin.name}(${mixin.arguments.map(arg => arg[0]).join(', ')})`
        };
    });
}

function hasScope(list, scope) {
    return list.indexOf(scope) !== -1;
}

function getLine(editor, point) {
    return editor.getTextInRange([[point.row, 0], point]);
}

function ls(marker) {
    return marker.bufferMarker.getProperties().livestyle;
}

function isColor(text) {
    text = text.trim();
    var m = text.match(reColor);
    return m && m[0] === text;
}
