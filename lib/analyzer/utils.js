'use strict';

module.exports = {
    isLiveStyleMarker(marker) {
        return 'livestyle' in marker.getProperties();
    },

    elem(name, attrs, content) {
        if (attrs && !isPlainObject(attrs)) {
            content = attrs;
            attrs = null;
        }

        var elem = document.createElement(name);
        if (attrs) {
            Object.keys(attrs).forEach(k => {
                if (k === 'class' || k === 'className') {
                    elem.className = attrs[k];
                } else {
                    elem.setAttribute(k, attrs[k]);
                }
            });
        }

        return module.exports.appendToElement(elem, content);
    },

    appendToElement(elem, content) {
        if (!Array.isArray(content)) {
            content = [content];
        }

        content
        .filter(value => value != null)
        .forEach(item => {
            if (typeof item !== 'object') {
                item = document.createTextNode(item);
            }
            elem.appendChild(item);
        });

        return elem;
    },

    emptyNode(node) {
        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }
        return node;
    }
};

function isPlainObject(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj) && !('nodeType' in obj);
}
