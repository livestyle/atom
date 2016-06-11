/**
 * Not a widget, but a clickable decoration for given widget which changes
 * its appearence when mouse cursor hovers
 */
'use strict';

const CompositeDisposable = require('atom').CompositeDisposable;
const utils = require('../utils');

const cl = utils.bem('livestyle-hyperlink');

module.exports = class HyperlinkDecoration {
    /**
     * @param  {AbstractWidget} widget
     * @param  {String} className
     */
    constructor(widget, className) {
        this._classNames = new Set();
        this._destroyed = false;
        this.disposable = new CompositeDisposable();

        this.addClass(cl(''));
        if (className) {
            this.addClass(className);
        }

        this.decoration = widget.editor.decorateMarker(widget.marker, this.getProps());

        this.disposable.add(
            widget.onMouseEnter(() => this.addClass(cl('_hover'))),
            widget.onMouseLeave(() => this.removeClass(cl('_hover'))),
            widget.onClick(event => {
                event.stopPropagation();
                widget.toggle();
            })
        );
    }

    addClass(className) {
        if (className && !this.hasClass(className)) {
            this._classNames.add(className);
            this.updateDecoration();
        }
        return this;
    }

    removeClass(className) {
        if (className && this.hasClass(className)) {
            this._classNames.delete(className);
            this.updateDecoration();
        }
        return this;
    }

    toggleClass(className, state) {
        if (state == null) {
            state = !this.hasClass(className);
        }
        state ? this.addClass(className) : this.removeClass(className);
        return this;
    }

    hasClass(className) {
        return this._classNames.has(className);
    }

    getProps() {
        return {
            type: 'highlight',
            class: Array.from(this._classNames).join(' ')
        };
    }

    updateDecoration() {
        if (this.decoration) {
            this.decoration.setProperties(this.getProps());
        }
    }

    destroy() {
        if (!this._destroyed) {
            this._destroyed = true;
            this.disposable.dispose();
            if (this.decoration) {
                this.decoration.destroy();
                this.decoration = null;
            }
        }
    }
};
