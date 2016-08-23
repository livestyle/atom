/**
 * Holds every created LiveStyle widget for editors.
 * If editor contains LiveStyle widget, its element will be marked with
 * `has-livestyle-widget` class for easier keyboar shortcuts targeting
 */
'use strict';

const hasWidgetClass = 'has-livestyle-widget';
const pkg = require('../../../package.json');

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
            atom.views.getView(editor).classList.add(hasWidgetClass);
            widget.onDidDestroy(() => this.delete(editor, widget));
            widget.onDidShow(notifyPromo);
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
                atom.views.getView(editor).classList.remove(hasWidgetClass);
            }
        }
    }

    findForPos(editor, pos) {
        if (this._registry.has(editor)) {
            for (let widget of this._registry.get(editor)) {
                if (widget.getMarker().getRange().containsPoint(pos)) {
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
        // this._registry = null;
    }
};


var promoNotificationTimer = null;
function notifyPromo() {
    if (!promoNotificationTimer) {
        promoNotificationTimer = setTimeout(displayPromoNotification, 15000);
    }
}

/**
 * Display notification about LiveStyle campaign
 */
function displayPromoNotification() {
	let key = `${pkg.name}.analyzer.notifyCampaign`;
	if (atom.config.get(key)) {
		atom.notifications.addInfo(`**Do you like LiveStyle Analyzer?**<br>Help make this project better by supporting [crowdfunding campaign](https://www.indiegogo.com/projects/livestyle-analyzer/).`, {
			dismissable: true
		});
		atom.config.set(key, false);
	}
}
