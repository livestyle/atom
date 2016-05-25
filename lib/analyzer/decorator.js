/**
 * For each text editor, watches for caret position update and adds context
 * LiveStyle decorators
 */
'use strict';

const createWidget = require('./widget');
const utils = require('./utils');

const editorWidgets = new Map();

atom.workspace.observeTextEditors(editor => {
    let onCursorChange = editor.onDidChangeCursorPosition(function(event) {
        let key = editor.id;
        let cursorPos = event.cursor.getBufferPosition();

        // hide widgets outside cursor position
        var widgets = editorWidgets.get(key);
        if (widgets) {
            widgets.forEach(w => {
                if (w.isCursorContext() && !w.getMarker().getBufferRange().containsPoint(cursorPos)) {
                    w.destroy();
                }
            });
        }

        let markers = getLiveStyleMarkers(editor, cursorPos);
        if (markers.length) {
            console.log('LS markers', markers);
            var widget = decorate(editor, markers);
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
            }
        }

        if (widgets && widgets.size) {
            editorWidgets.set(key, widgets);
        } else {
            editorWidgets.delete(key);
        }
    });
});

/**
 * Returns array of LiveStyle markers for given position
 * @param  {Point} pos
 * @return {Marker[]}
 */
function getLiveStyleMarkers(editor, pos) {
    return editor
    .findMarkers({containsBufferPosition: pos})
    .filter(marker => utils.isLiveStyleMarker(marker.bufferMarker));
}

/**
 * Creates decoration for given marker set for given text editor
 * @param  {TextEditor} editor
 * @param  {Marker[]} markers
 * @return {Decoration}
 */
function decorate(editor, markers) {
    // In most cases, `markers` array will contain at least 2 markers: one for
    // containing section/selector (holds list of available variable and mixin
    // completions for section) and one for property, which holds context
    // suggestions for matching property
    var property = markers.find(m => m.bufferMarker.getProperties().livestyle.type === 'property');
    if (property) {
        // we have matching property data, let’s see if we have something to display
        let ls = property.bufferMarker.getProperties().livestyle;
        if (ls.info.computed != null) {
            return createWidgetIfNeeded(editor, property, 'computed-value');
        }
    }

    console.log('nothing to decorate');
}

/**
 * Creates new widget instance of given type if it’s not yet exists
 * @param  {TextEditor} editor
 * @param  {TextEditorMarker} marker
 * @param  {String} type
 * @return {AbstractWidget}
 */
function createWidgetIfNeeded(editor, marker, type) {
    return !findWidget(editor, marker, type) && createWidget(editor, marker, type);
}

function findWidget(editor, marker, type) {
    var widgets = editorWidgets.get(editor.id);
    return widgets && Array.from(widgets).find(w => {
        return w.type === type && w.getMarker().id === marker.id;
    });
}
