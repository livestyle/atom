/**
 * For each text editor, watches for caret position update and adds context
 * LiveStyle decorators
 */
'use strict';

const Point = require('atom').Point;
const createWidget = require('./widget');
const WidgetRegistry = require('./widget/registry');
const createHyperlinkWatcher = require('./hyperlink');
const createCursorWatcher = require('./cursor');
const utils = require('./utils');

module.exports = function() {
    const registry = new WidgetRegistry();

    var disposable = atom.workspace.observeTextEditors(editor => {
        var debouncedUpdate = utils.debounce(event => update(editor, registry), 100);
        var onMarkerUpdate = editor.getBuffer().onDidUpdateMarkers(debouncedUpdate);
        var hyperlink = createHyperlinkWatcher(editor, registry);
        var cursor = createCursorWatcher(editor, registry);

        update(editor);
        editor.onDidDestroy(() => {
            onMarkerUpdate.dispose();
            cursor.dispose();
            hyperlink.dispose();
        });
    });

    return {
        find(editor, item) {
            return Array.isArray(item) || item instanceof Point
                ? registry.findForPos(editor, item)
                : registry.findForMarker(editor, item);
        },
        dispose() {
            disposable.dispose();
            if (registry) {
                registry.destroy();
                registry = null;
            }
        }
    };
};


/**
 * Creates missing widgets for LiveStyle markers on given editor
 * @param  {TextEditor} editor
 */
function update(editor, registry) {
    if (editor.isDestroyed()) {
        return;
    }

    utils.getLiveStyleMarkers(editor).forEach(marker => {
        if (!registry.findForMarker(editor, marker)) {
            registerWidgetForMarker(editor, registry, marker);
        }
    });
}

/**
 * Creates widget for given marker, if possible, and registers it in editor’s
 * widget list
 * @param  {TextEditor} editor
 * @param  {WidgetRegistry} registry
 * @param  {Marker} markers
 * @return {AbstractWidget}
 */
function registerWidgetForMarker(editor, registry, marker) {
    var widget = decorate(editor, marker);
    if (widget) {
        registry.add(editor, widget);
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
    var type = null;
    var data = utils.markerData(marker);

    if (data.type === 'property' && !!data.info.mixinCall) {
        type = 'mixin';
    } else if (data.type === 'property' && data.info.computed != null) {
        type = 'computed-value';
    }

    return type && createWidget(editor, marker, type);
}
