/**
 * For each text editor, watches for caret position update and adds context
 * LiveStyle decorators
 */
'use strict';

const createWidget = require('./widget');
const utils = require('./utils');

const editorWidgets = new Map();

var findWidgetsForBufferPosition = module.exports.find = function(editor, pos) {
    return Array.from(editorWidgets.get(editor.id) || [])
    .filter(w => w.getMarker().getBufferRange().containsPoint(pos));
};

atom.workspace.observeTextEditors(editor => {
    var onCursorMove = editor.onDidChangeCursorPosition(event => {
        // console.log('caret event', event);
        updateContextState(editor, event.cursor.getBufferPosition())
    });

    var onMarkerUpdate = editor.getBuffer().onDidUpdateMarkers(event => {
        updateStaticState(editor);
    });

    // handle clicks on specific elements
    var clickHandler = evt => {
        if (evt.target.dataset.goToRange) {
            var buffer = editor.getBuffer();
            let range = utils.makePositionRange(buffer, JSON.parse(evt.target.dataset.goToRange));
            console.log('got click on', range);
            editor.setSelectedBufferRange(range);
        }
    };

    var elem = editor.getElement();
    elem && elem.addEventListener('click', clickHandler);

    editor.onDidDestroy(() => {
        var elem = editor.getElement();
        elem && elem.removeEventListener('click', clickHandler);
        onMarkerUpdate.dispose();
        onCursorMove.dispose();
    });

    updateContextState(editor, editor.getCursorBufferPosition());
    updateStaticState(editor);
});

/**
 * Creates widget for given marker, if possible, and registers it in editor’s
 * widget list
 * @param  {TextEditor} editor
 * @param  {Marker} markers
 * @return {AbstractWidget}
 */
function registerWidgetForMarker(editor, marker) {
    let key = editor.id;
    let widgets = editorWidgets.get(key);
    var widget = decorate(editor, marker);
    if (widget) {
        if (!widgets) {
            widgets = new Set();
        }
        widgets.add(widget);
        widget.onDidDestroy(() => {
            var widgets = editorWidgets.get(key);
            if (widgets) {
                widgets.delete(widget);
            }
        });
        widget.update();
    }

    if (widgets && widgets.size) {
        editorWidgets.set(key, widgets);
    } else {
        editorWidgets.delete(key);
    }

    return widget;
}

/**
 * Creates decoration for given marker in text editor
 * @param  {TextEditor} editor
 * @param  {Marker} markers
 * @return {Decoration}
 */
function decorate(editor, marker) {
    // we have matching property data, let’s see if we have something to display
    if (isMixinCall(marker)) {
        return createWidgetIfNeeded(editor, marker, 'mixin');
    }

    if (isComputedValue(marker)) {
        return createWidgetIfNeeded(editor, marker, 'computed-value');
    }
}

/**
 * Creates new widget instance of given type if it’s not yet exists
 * @param  {TextEditor} editor
 * @param  {TextEditorMarker} marker
 * @param  {String} type
 * @return {AbstractWidget}
 */
function createWidgetIfNeeded(editor, marker, type) {
    return !findWidget(editor, marker) && createWidget(editor, marker, type);
}

/**
 * Check if given marker contains mixin call data
 * @param  {Marker}  marker
 * @return {Boolean}
 */
function isMixinCall(marker) {
    var data = utils.markerData(marker);
    return data.type === 'property' && !!data.info.mixinCall;
}

/**
 * Check if given marker contains computed value
 * @param  {Marker}  marker
 * @return {Boolean}
 */
function isComputedValue(marker) {
    var data = utils.markerData(marker);
    return data.type === 'property' && data.info.computed != null;
}

/**
 * Check if given marker is context one, e.g. its decoration should appear only
 * when user moves caret into marker range
 * @param  {Marker}  marker
 * @return {Boolean}
 */
function isContextMarker(marker) {
    return isComputedValue(marker);
}

/**
 * Check if given marker is static one, e.g. its decoration should always appear
 * inside text editor
 * @param  {Marker}  marker
 * @return {Boolean}
 */
function isStaticMarker(marker) {
    return isMixinCall(marker);
}

function findWidget(editor, marker) {
    var widgets = editorWidgets.get(editor.id);
    return widgets && Array.from(widgets).find(w => matchesMarker(w, marker));
}

function matchesMarker(widget, marker) {
    return widget.getMarker().id === marker.id;
}

function updateContextState(editor, cursorPos) {
    removeWidgetsOutsidePoint(editor.id, cursorPos);
    utils.getLiveStyleMarkers(editor, cursorPos)
    .filter(isContextMarker)
    .forEach(marker => registerWidgetForMarker(editor, marker));
}

function updateStaticState(editor) {
    utils.getLiveStyleMarkers(editor)
    .filter(isStaticMarker)
    .forEach(marker => {
        // console.log('add static marker', marker);
        var widgets = new Set(editorWidgets.get(editor.id));

        // add new widgets; old ones will be automatically removed when
        // underlying marker is removed.
        for (let widget of widgets) {
            if (matchesMarker(widget, marker)) {
                console.log('widget already exists');
                return widgets.delete(widget);
            }
        }

        console.log('create new widget');
        registerWidgetForMarker(editor, marker);
    });
}

/**
 * Removes cursor widgets outside of given point
 * @param  {String} editorKey Editor lookup key
 * @param  {Point} point
 */
function removeWidgetsOutsidePoint(editorKey, point) {
    var widgets = editorWidgets.get(editorKey);
    if (widgets) {
        widgets.forEach(w => {
            if (w.isCursorContext() && !w.getMarker().getBufferRange().containsPoint(point)) {
                w.destroy();
            }
        });
    }
}
