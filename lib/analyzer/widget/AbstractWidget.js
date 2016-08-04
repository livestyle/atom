/**
 * Abstract LiveStyle widget implementation. Contains methods to override
 * and all logic required for widget display and update
 */
'use strict';

const deepEqual = require('deep-equal');
const utils = require('../utils');
const Emitter = require('atom').Emitter;
const CompositeDisposable = require('atom').CompositeDisposable;
const LiveStyleWidget = require('./LiveStyleWidget');

const defaultDecorationProps = {
    type: 'overlay',
    position: 'tail'
};

module.exports = class AbstractWidget {
    constructor(editor, marker, type, decorationProperties) {
        this._destroyed = false;

        // hyperlink is a special decoration (@see HyperlinkDecoration) that
        // indicates that current widget is clickable
        this._hyperlink = null;

        // main decoration of current widget
        this._decoration = null;

        this.decorationProperties = Object.assign({}, defaultDecorationProps, decorationProperties);
        this.emitter = new Emitter();
        this.editor = editor;
        this.type = type;
        this.marker = marker;
        this.disposable = new CompositeDisposable();

        this.disposable.add(
            marker.onDidChange(event => {
                if (!deepEqual(event.oldProperties.livestyle, event.newProperties.livestyle)) {
                    // LiveStyle data updated, update widget content
                    this.emitter.emit('will-update');
                    this.update();
                    this.emitter.emit('did-update');
                }
            }),
            marker.onDidDestroy(() => this.destroy()),
            editor.onDidDestroy(() => this.destroy())
        );
    }

    /**
     * Creates main decoration for current widget.
     * @param {Object} value Initial value of decoration
     * @return {Decoration}
     */
    decorate(value) {
        this.elem = this.createElement();
        this.update(value);
        var props = Object.assign({}, this.decorationProperties, {
            item: this.elem
        });

        if (props.type === 'livestyle-widget') {
            let view = atom.views.getView(this.editor);
            return new LiveStyleWidget().initialize(this.editor, view, this.marker, props);
        }

        if (props.type === 'block-overlay') {
            // A special decoration type: display overlay widget inside
            // block. Pure `overlay` decoration is too unstable when scrolling
            // and with multiline values
            props.type = 'block';
            let view = atom.views.getView(this.editor);
            let startPos = view.pixelPositionForBufferPosition(this.marker.getStartPosition());
            let endPos = view.pixelPositionForBufferPosition(this.marker.getEndPosition());
            props.item.style.left = startPos.left + 'px';
            props.item.style.maxWidth = Math.max(350, Math.abs(endPos.left - startPos.left)) + 'px';
        }

        var target = props.type === 'gutter' ? this.getGutter(this.editor) : this.editor;
        return this.attachDecoration(target, this.marker, props);
    }

    attachDecoration(target, marker, props) {
        if (target !== this.editor) {
            return target.decorateMarker(marker, props);
        }

        // Atom v1.9 introduced incompatibility with buffer and editor markers:
        // a buffer marker doesn’t create text marker and vice versa.
        // So before attaching decoration we have to ensure that editor marker
        // exists

        let editorMarker = target
        .findMarkers({containsBufferRange: marker.getRange()})
        .reduce((prev, marker) => utils.isLiveStyleMarker(marker) ? marker : prev, null);

        if (editorMarker) {
            // Atom prior v1.9
            return target.decorateMarker(editorMarker, props);
        }

        editorMarker = target.markBufferRange(marker.getRange(), props);
        let decoration = target.decorateMarker(editorMarker, props);
        decoration.onDidDestroy(() => editorMarker.destroy());
        return decoration;
    }

    /**
     * Toggles display of main decoration
     */
    toggle() {
        this.isVisible() ? this.hide() : this.show();
    }

    /**
     * Display main widget’s decoration
     */
    show() {
        if (!this._decoration) {
            let value = this.getValue();
            if (value != null) {
                this.emitter.emit('will-show');
                this._decoration = this.decorate(value);
                this.emitter.emit('did-show');
            }
        }
    }

    /**
     * Hide main widget’s decoration
     */
    hide() {
        if (this._decoration) {
            this.emitter.emit('will-hide');
            this._decoration.destroy();
            this._decoration = null;
            this.emitter.emit('did-hide');
        }
    }

    /**
     * Cehck if main widget’s decoration is currently visible
     * @return {Boolean}
     */
    isVisible() {
        return !!this._decoration;
    }

    /**
     * Creates DOM representation of main widget decoration
     * @return {HTMLElement}
     */
    createElement() {
        return utils.elem('div', {'class': `livestyle-widget livestyle-widget__${this.type}`});
    }

    /**
     * Updates value of main decoration’s DOM element with value obtained from
     * `getValue()` method call. This method is automatically invoked when
     * LiveStyle data was updated in undelying marker
     */
    update(value) {
        if (!this.elem) {
            return;
        }

        utils.emptyNode(this.elem);
        utils.appendToElement(this.elem, value != null ? value : this.getValue());
    }

    /**
     * Returns current widget value. Return `null` to hide widget itself
     * @return {Object} Widget value: string, DOM element or array of these
     * values. If value is `null` or `undefined`, widget is not displayed
     */
    getValue() {
        return 'dummy value';
    }

    getMarker() {
        return this.marker;
    }

    getLivestyleData() {
        return utils.markerData(this.getMarker());
    }

    getGutter() {
        const gutterName = 'livestyle';
        var gutter = this.editor.gutterWithName(gutterName);
        if (!gutter) {
            gutter = this.editor.addGutter({name: gutterName});
        }
        return gutter;
    }

    /**
     * Check if current widget’s marker contains given buffer point
     * @param  {Point} point
     * @return {Boolean}
     */
    containsPoint(point) {
        return this.getMarker().getRange().containsPoint(point);
    }

    /**
     * Check if current widget is clickable
     * @return {Boolean}
     */
    isClickable() {
        return !!this._hyperlink;
    }

    // event handling
    mouseenter(event) {
        this.emitter.emit('mouseenter', event);
    }

    mouseleave(event) {
        this.emitter.emit('mouseleave', event);
    }

    cursorenter(event) {
        this.emitter.emit('cursorenter', event);
    }

    cursorleave(event) {
        this.emitter.emit('cursorleave', event);
    }

    click(event) {
        this.emitter.emit('click', event);
    }

    onMouseEnter(callback) {
        return this.emitter.on('mouseenter', callback);
    }

    onMouseLeave(callback) {
        return this.emitter.on('mouseleave', callback);
    }

    onCursorEnter(callback) {
        return this.emitter.on('cursorenter', callback);
    }

    onCursorLeave(callback) {
        return this.emitter.on('cursorleave', callback);
    }

    onClick(callback) {
        return this.emitter.on('click', callback);
    }

    onWillUpdate(callback) {
        return this.emitter.on('will-update', callback);
    }

    onDidUpdate(callback) {
        return this.emitter.on('did-update', callback);
    }

    onWillShow(callback) {
        return this.emitter.on('will-show', callback);
    }

    onDidShow(callback) {
        return this.emitter.on('did-show', callback);
    }

    onWillHide(callback) {
        return this.emitter.on('will-hide', callback);
    }

    onDidHide(callback) {
        return this.emitter.on('did-hide', callback);
    }

    onDidDestroy(callback) {
        return this.emitter.on('did-destroy', callback);
    }

    destroy() {
        if (!this._destroyed) {
            this._destroyed = true;
            if (this._hyperlink) {
                this._hyperlink.destroy();
                this._hyperlink = null;
            }

            if (this._decoration) {
                this._decoration.destroy();
                this._decoration = null;
            }

            this.disposable.dispose();
            this.emitter.emit('did-destroy');
            this.emitter.dispose();
            this.editor = this.marker = this.elem = null;
        }
    }
};
