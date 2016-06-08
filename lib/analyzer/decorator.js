/**
 * For each text editor, watches for caret position update and adds context
 * LiveStyle decorators
 */
'use strict';

const createWidget = require('./widget');
const hyperlink = require('./hyperlink');
const utils = require('./utils');
const WidgetRegistry = require('./widget/registry');

const registry = new WidgetRegistry();

atom.workspace.observeTextEditors(editor => {
    hyperlink(editor, registry);
    var onCursorMove = editor.onDidChangeCursorPosition(event => {
        updateContextState(editor, event.cursor.getBufferPosition());
    });

    var debouncedUpdateStaticState = utils.debounce(event => {
        updateStaticState(editor);
    }, 100);

    var onMarkerUpdate = editor.getBuffer().onDidUpdateMarkers(debouncedUpdateStaticState);

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
    var widget = decorate(editor, marker);
    if (widget) {
        registry.add(editor, widget);
        widget.update();
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
    return !registry.findForMarker(editor, marker) && createWidget(editor, marker, type);
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

function updateContextState(editor, cursorPos) {
    if (editor.isDestroyed()) {
        return;
    }

    removeWidgetsOutsidePoint(editor, cursorPos);
    utils.getLiveStyleMarkers(editor, cursorPos)
    .filter(isContextMarker)
    .forEach(marker => registerWidgetForMarker(editor, marker));
}

function updateStaticState(editor) {
    if (editor.isDestroyed()) {
        return;
    }

    utils.getLiveStyleMarkers(editor)
    .filter(isStaticMarker)
    .forEach(marker => {
        // first, remove existing widget for the same marker
        let widget = registry.findForMarker(editor, marker);
        if (widget) {
            registry.delete(editor, widget);
        }

        // add new widget; old ones will be automatically removed when
        // underlying marker is removed.
        registerWidgetForMarker(editor, marker);
    });
}

/**
 * Removes cursor widgets outside of given point
 * @param  {TextEditor} editor
 * @param  {Point} point
 */
function removeWidgetsOutsidePoint(editor, point) {
    for (let widget of registry.get(editor)) {
        if (widget.isCursorContext() && !widget.containsPoint(point)) {
            widget.destroy();
        }
    }
}
