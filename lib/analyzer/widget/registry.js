/**
 * Holds every created LiveStyle widget for editors
 */
'use strict';

module.exports = class WidgetRegistry {
    constructor() {
        this._registry = new WeakMap();
    }

    add(editor, widget) {
        if (!this._registry.has(editor)) {
            this._registry.set(editor, new Set());
        }

        var widgets = this._registry.get(editor);
        if (!widgets.has(widget)) {
            widgets.add(widget);
            widget.onDidDestroy(() => this.delete(editor, widget));
        }
    }

    get(editor) {
        return this._registry.get(editor) || new Set();
    }

    delete(editor, widget) {
        if (this._registry.has(editor)) {
            let widgets = this._registry.get(editor);
            widgets.delete(widget);
            if (!widgets.size) {
                this._registry.delete(editor);
            }
        }
    }

    findForPos(editor, pos) {
        if (this._registry.has(editor)) {
            for (let widget of this._registry.get(editor)) {
                if (widget.getMarker().getBufferRange().containsPoint(pos)) {
                    return widget;
                }
            }
        }
    }

    findForMarker(editor, marker) {
        if (this._registry.has(editor)) {
            for (let widget of this._registry.get(editor)) {
                if (widget.getMarker().id === marker.id) {
                    return widget;
                }
            }
        }
    }

    destroy() {
        this._registry = null;
    }
};
