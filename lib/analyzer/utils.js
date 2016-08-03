'use strict';

module.exports = {
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
    },

    bem(name) {
    	const prefixes = {'-' : '__', '_': '_'};
    	return (...args) => args
    		.filter(a => a || a === '')
    		.map(a => {
    			if (a === '') {
    				a = name;
    			} else if (a.charAt(0) in prefixes) {
    				a = name + prefixes[a.charAt(0)] + a.slice(1);
    			}
    			return a;
    		})
    		.join(' ');
    },

    makePositionRange(buffer, indexRange) {
        return indexRange && [
            buffer.positionForCharacterIndex(indexRange[0]),
            buffer.positionForCharacterIndex(indexRange[1])
        ];
    },

    markerData(marker) {
        if (marker.bufferMarker) {
            marker = marker.bufferMarker;
        }
        return marker.getProperties().livestyle;
    },

    isLiveStyleMarker(marker) {
        return !!module.exports.markerData(marker);
    },

    /**
     * Returns array of LiveStyle markers for given position
     * @param  {Point} pos
     * @return {Marker[]}
     */
    getLiveStyleMarkers(editor, pos) {
        var props = {};
        if (pos) {
            props.containsBufferPosition = pos;
        }
        return editor.getBuffer().findMarkers(props)
        .filter(marker => module.exports.isLiveStyleMarker(marker));
    },

    /**
     * Returns a function, that, as long as it continues to be invoked, will not
     * be triggered. The function will be called after it stops being called for
     * N milliseconds. If `immediate` is passed, trigger the function on the
     * leading edge, instead of the trailing.
     *
     * @src underscore.js
     *
     * @param  {Function} func
     * @param  {Number} wait
     * @param  {Boolean} immediate
     * @return {Function}
     */
    debounce(func, wait, immediate) {
    	var timeout, args, context, timestamp, result;

    	var later = function() {
    		var last = Date.now() - timestamp;

    		if (last < wait && last >= 0) {
    			timeout = setTimeout(later, wait - last);
    		} else {
    			timeout = null;
    			if (!immediate) {
    				result = func.apply(context, args);
    				if (!timeout) context = args = null;
    			}
    		}
    	};

    	return function() {
    		context = this;
    		args = arguments;
    		timestamp = Date.now();
    		var callNow = immediate && !timeout;
    		if (!timeout) timeout = setTimeout(later, wait);
    		if (callNow) {
    			result = func.apply(context, args);
    			context = args = null;
    		}

    		return result;
    	};
    },

    supportedSyntax(editor) {
        let rootScope = editor.getRootScopeDescriptor().scopes[0] || '';
        let m = rootScope.match(/\.(less|scss)\b/);
        if (m) {
            return m[1];
        }
    }
};

function isPlainObject(obj) {
    return obj && typeof obj === 'object' && !Array.isArray(obj) && !('nodeType' in obj);
}
