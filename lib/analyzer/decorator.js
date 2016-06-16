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
const getType = require('./widget/type');

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
            if (!item) {
                // return all widgets for given editor
                return registry.get(editor);
            }

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
    var widget = createWidget(editor, marker);
    if (widget) {
        registry.add(editor, widget);
    }

    return widget;
}
