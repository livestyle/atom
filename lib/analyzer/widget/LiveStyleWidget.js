/**
 * A web-component for LiveStyle widget
 */
'use strict';

const CompositeDisposable = require('atom').CompositeDisposable;
const Disposable = require('atom').Disposable;

class LiveStyleWidget extends HTMLElement {
    initialize(editor, editorView, marker, options) {
        this.editor = editor;
        this.editorView = editorView;
        this.marker = marker;
        this.options = Object.assign({position: 'bottom-left'}, options);

        if (this.options.item) {
            this.appendChild(this.options.item);
        }

        if (this.options.class) {
            this.options.class.split(/\s+/g).forEach(cl => this.className.add(cl));
        }

        this.name = this.options.name;
        this.position = this.options.position;

        // attach widget to lines element so we can follow editor scroll
        var lines = editorView.rootElement.querySelector('.lines');
        if (lines) {
            lines.appendChild(this);
        } else {
            console.warn('Unable to attach LiveStyle widget: no lines element');
        }

        return this;
    }

    get name() {
        return this.getAttribute('name');
    }

    set name(value) {
        return this.setAttribute('name', value);
    }

    get position() {
        return this.getAttribute('position');
    }

    set position(value) {
        return this.setAttribute('position', value);
    }

    attachedCallback() {
        this._subscriptions = this.setupEvents();
        this.update();
    }

    detachedCallback() {
        if (this._subscriptions) {
            this._subscriptions.dispose();
            this._subscriptions = null;
        }
    }

    attributeChangedCallback(name) {
        if (name === 'name' || name === 'position') {
            this.update();
        }
    }

    update() {
        let topLeft = this.editorView.pixelPositionForBufferPosition(this.marker.getStartPosition());
        let bottomRight = this.editorView.pixelPositionForBufferPosition(this.marker.getEndPosition());
        let scroll = {
            left: this.editorView.getScrollLeft(),
            top: this.editorView.getScrollTop()
        };

        topLeft.left -= scroll.left;
        topLeft.top -= scroll.top;

        bottomRight.left -= scroll.left;
        bottomRight.top += this.editor.getLineHeightInPixels() - scroll.top;

        let height = this.offsetHeight;
        let pos = topLeft;

        switch (this.position) {
            case 'top-left':
                pos = {
                    left: topLeft.left,
                    top: topLeft.top - height
                };
                break;
            case 'bottom-left':
                pos = {
                    left: topLeft.left,
                    top: bottomRight.top
                };
                break;
        }

        this.style.left = pos.left + 'px';
        this.style.top = pos.top + 'px';
        this.style.maxWidth = Math.max(350, Math.abs(topLeft.left - bottomRight.left)) + 'px';
    }

    setupEvents() {
        let subscriptions = new CompositeDisposable();
        let update = () => this.update();
        let destroy = () => this.destroy();

        let mutations = new MutationObserver(update);
        mutations.observe(this, {
            attributes: true,
            childList: true,
            subtree: true
        });

        subscriptions.add(
            this.editorView.onDidChangeScrollLeft(update),
            this.editorView.onDidChangeScrollTop(update),
            this.editor.onDidDestroy(destroy),
            this.marker.onDidDestroy(destroy),
            new Disposable(() => mutations.disconnect())
        );

        return subscriptions;
    }

    destroy() {
        this.remove();
    }
};

module.exports = document.registerElement('livestyle-widget', {
    prototype: LiveStyleWidget.prototype
});
