/**
 * Abstract LiveStyle widget implementation. Contains methods to override
 * and all logic required for widget display and update
 */
'use strict';

const atom = require('atom');
const deepEqual = require('deep-equal');
const utils = require('../utils');
const Emitter = atom.Emitter;
const CompositeDisposable = atom.CompositeDisposable;

const defaultDecorationProps = {
    type: 'overlay',
    position: 'head'
};

module.exports = class AbstractWidget {
    constructor(editor, marker, type, decorationProperties) {
        this._destroyed = false;

        this.decorationProperties = Object.assign({}, defaultDecorationProps, decorationProperties);
        this.emitter = new Emitter();
        this.editor = editor;
        this.type = type;
        this.marker = marker;
        this.disposable = new CompositeDisposable();

        this.disposable.add(
            marker.bufferMarker.onDidChange(event => {
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

    decorate() {
        this.elem = this.createElement();
        this.update();
        var props = Object.assign(this.decorationProperties, {
            item: this.elem
        });

        var target = props.type === 'gutter' ? this.getGutter(editor) : editor;
        return target.decorateMarker(marker, props);
    }

    createElement() {
        return utils.elem('div', {'class': `livestyle-widget livestyle-widget__${this.type}`});
    }

    update() {
        if (!this.elem) {
            return;
        }

        utils.emptyNode(this.elem);
        utils.appendToElement(this.elem, this.getValue());
    }

    /**
     * Returns current widget value. Return `null` to hide widget itself
     * @return {Object} Widget value: string, DOM element or array of these values
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
        return this.getMarker().getBufferRange().containsPoint(point);
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

    onDidDestroy(callback) {
        return this.emitter.on('did-destroy', callback);
    }

    destroy() {
        if (!this._destroyed) {
            this._destroyed = true;
            this.disposable.dispose();
            this.emitter.emit('did-destroy');
            this.emitter.dispose();
            this.editor = this.marker = this.elem = this.emitter = null;
        }
    }
};
