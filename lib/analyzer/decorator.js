/**
 * For each text editor, watches for caret position update and adds context
 * LiveStyle decorators
 */
'use strict';

const Point = require('atom').Point;
const Disposable = require('atom').Disposable;
const CompositeDisposable = require('atom').CompositeDisposable;
const createWidget = require('./widget');
const WidgetRegistry = require('./widget/registry');
const createHyperlinkWatcher = require('./hyperlink');
const createCursorWatcher = require('./cursor');
const utils = require('./utils');
const getType = require('./widget/type');

module.exports = function() {
    const registry = new WidgetRegistry();
    const editorObservers = new Set();

    var disposable = atom.workspace.observeTextEditors(editor => {
        let debouncedUpdate = utils.debounce(event => update(editor, registry), 100);

        let subscriptions = new CompositeDisposable();
        subscriptions.add(
            editor.getBuffer().onDidUpdateMarkers(debouncedUpdate),
            editor.onDidDestroy(() => subscriptions.dispose()),
            createHyperlinkWatcher(editor, registry),
            createCursorWatcher(editor, registry),
            new Disposable(() => editorObservers.delete(subscriptions))
        );

        editorObservers.add(subscriptions);
        update(editor, registry);
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
            editorObservers.forEach(subscriptions => subscriptions.dispose());
            editorObservers.clear();
            disposable.dispose();
            registry.destroy();
        }
    };
};

/**
 * Creates missing widgets for LiveStyle markers on given editor
 * @param  {TextEditor} editor
 */
function update(editor, registry) {
    if (editor.isDestroyed() || !registry) {
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
