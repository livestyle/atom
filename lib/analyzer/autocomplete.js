/**
 * Autocomplete+ provider for LiveStyle completetions (variables and mixins).
 *
 * How it works:
 * LiveStyle adds stylesheet analysis data as marker into current document.
 * There’s a special marker with type `section` that holds completions specific
 * for context section. So in order to provide completions we have to find
 * section marker from given cursor position and feed them to Autocomplete+
 */
'use strict';

const utils = require('./utils');
const isColor = require('./widget/colorPreview').isColor;
const type = require('./widget/type');
const reVarPrefix = /[\$@][\w\-]*$/;
const reLessMixinPrefix = /([\.#])[\w\-]*$/;
const reTerminator = /;\s*$/;
const variableCompletionScopes = [
    // SCSS
    'meta.property-value.scss',
    'meta.set.variable.scss',

    // LESS
    'meta.property-value.css'
];

const scssMixinCompletionScopes = [
    'meta.at-rule.include.scss'
];

const lessMixinCompletionScopes = [
    'meta.property-list.css'
];

module.exports = {
    selector: '.source.scss, .source.less',
    disableForSelector: '.source.scss .comment, .source.scss .string, .source.less .comment, .source.less .string',
    filterSuggestions: true,

    getSuggestions(request) {
        let line = getLine(request.editor, request.bufferPosition);
        if (reTerminator.test(line)) {
            // do not provide completions right after terminator
            return;
        }

        let scopes = request.scopeDescriptor.getScopesArray();
        let marker = getMarkers(request)
        .filter(marker => {
            var t = ls(marker).type;
            return t === type.COMPLETIONS_PROVIDER || t === type.ROOT_NODE;
        })
        .sort((a, b) => b.getStartBufferPosition().compare(a.getStartBufferPosition()))
        [0];

        if (marker) {
            // console.log('request completions for', request.prefix, scopes, marker);
            if (hasAnyScope(scopes, variableCompletionScopes)) {
                return variableCompletions(request, ls(marker).info.completions);
            } else if (hasAnyScope(scopes, scssMixinCompletionScopes)) {
                return scssMixinCompletions(request, ls(marker).info.completions);
            } else if (hasAnyScope(scopes, lessMixinCompletionScopes)) {
                return lessMixinCompletions(request, ls(marker).info.completions);
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
    // won’t be available in `request.prefix`. If variable prefix exists before
    // invocation point, we should trim it from completion
    let line = getLine(request.editor, request.bufferPosition);
    let hasVarPrefix = reVarPrefix.test(line);

    return Object.keys(completions.variables)
    .sort()
    .map(name => {
        var variable = completions.variables[name];
        var resolvedValue = variable.computed != null ? variable.computed : variable.raw;
        if (isColor(resolvedValue)) {
            resolvedValue = `<i class="livestyle-autocomplete-color" style="background-color:${resolvedValue}"></i>${resolvedValue}`;
        }

        return {
            type: 'variable',
            text: hasVarPrefix ? name.substr(1) : name,
            displayText: name,
            rightLabelHTML: resolvedValue
        };
    });
}

function scssMixinCompletions(request, completions) {
    return completions && completions.mixins && completions.mixins.reduce((out, mixin) => {
        var args = mixin.arguments.map(arg => arg[0]);
        var displayText = `${mixin.name}`;
        var snippet = displayText;

        // add mixin without arguments, it can possibly contain default values
        out.push({type: 'function', snippet, displayText});

        if (args.length) {
            snippet += `(${args.map((arg, i) => `\${${i + 1}:${arg}}`).join(', ')})`;
            displayText += `(${args.join(', ')})`;
            out.push({type: 'function', snippet, displayText});
        }

        return out;
    }, []);
}

function lessMixinCompletions(request, completions) {
    // In LESS, mixins are prefixed with `#` or `.`, which are stop symbols
    // for autocomplete+
    // We have to manually check if user input is prefixed with one of these
    // symbols
    let line = getLine(request.editor, request.bufferPosition)
    let prefixMatch = line.match(reLessMixinPrefix);
    let prefix = prefixMatch ? prefixMatch[1] : '';

    return completions && completions.mixins && completions.mixins.reduce((out, mixin) => {
        if (prefix && mixin.name[0] !== prefix) {
            return out;
        }

        var args = mixin.arguments.map(arg => arg[0]);
        var displayText = `${mixin.name}`;
        var snippetBase = displayText;

        if (prefix) {
            snippetBase = snippetBase.slice(prefix.length);
        }

        // add mixin without arguments, it can possibly contain default values
        var snippet = snippetBase + ';$0';
        out.push({type: 'function', snippet, displayText});

        if (args.length) {
            snippet = snippetBase + `(${args.map((arg, i) => `\${${i + 1}:${arg}}`).join(', ')});\$0`;
            displayText += `(${args.join(', ')})`;
            out.push({type: 'function', snippet, displayText});
        }

        return out;
    }, []);
}


function hasScope(list, scope) {
    return list.indexOf(scope) !== -1;
}

function hasAnyScope(list, scopes) {
    return scopes.some(scope => hasScope(list, scope));
}

function getLine(editor, point) {
    return editor.getTextInRange([[point.row, 0], point]);
}

function ls(marker) {
    if (marker.bufferMarker) {
        marker = marker.bufferMarker;
    }
    return marker.getProperties().livestyle;
}

function getMarkers(request) {
    var markers = utils.getLiveStyleMarkers(request.editor, request.bufferPosition);
    if (!markers.length) {
        // no markers: root of the document? Get root marker
        markers = utils.getLiveStyleMarkers(request.editor, [0, 0])
        .filter(marker => ls(marker).type === 'root');
    }

    return markers;
}
