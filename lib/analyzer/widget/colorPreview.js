/**
 * Not actually a widget: creates DOM node with given color preview.
 * If `approximate` is truthy, adds special decoration indicating that given color
 * is approximate
 */
'use strict';

const reColor = /#[a-f0-9]{3,6}|(?:rgba?|hsla?)\(.+?\)/g;

class LiveStyleColorPreviewClass extends HTMLElement {
    attributeChangedCallback(name, oldValue, newValue) {
        if (name === 'color') {
            this.style.backgroundColor = newValue;
        }
    }
};

const LiveStyleColorPreview = document.registerElement('livestyle-color-preview', {
    prototype: LiveStyleColorPreviewClass.prototype
});

module.exports = function(color, approximate) {
    var elem = new LiveStyleColorPreview();
    elem.setAttribute('color', color);
    if (approximate) {
        elem.setAttribute('approximate', 'approximate');
    }
    return elem;
};

module.exports.isColor = function(str) {
    reColor.lastIndex = 0;
    // TODO sometimes str is an object?
    return typeof str === 'string' && reColor.test((str || '').trim());
};

/**
 * Finds all color values inside given string and adds color widget befors them.
 * If colors found in string, returns array of items, suitable for
 * `utils.appendToElement()`, returns original string otherwise
 * @param  {String} str
 * @return {Atring|Array}
 */
module.exports.addColorMarkers = function(str) {
    if (!str) {
        return str;
    }

    var result = [], m, lastStart = 0;
    reColor.lastIndex = 0;
    while (m = reColor.exec(str)) {
        result.push(
            str.substring(lastStart, m.index),
            module.exports(m[0])
        );
        lastStart = m.index;
    }

    result.push(str.substr(lastStart));
    return (result.length === 1) ? str : result.filter(Boolean);
};

module.exports.reColor = reColor;
