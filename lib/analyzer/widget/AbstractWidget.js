/**
 * Abstract LiveStyle widget implementation. Contains methods to override
 * and all logic required for widget display and update
 */
'use strict';

const utils = require('../utils');
const Emitter = require('atom').Emitter;
const defaultDecorationProps = {
    type: 'overlay',
    position: 'head'
};

module.exports = class AbstractWidget {
    constructor(editor, marker, type, decorationProperties) {
        this._destroyed = false;
        this.decorationProperties = decorationProperties || defaultDecorationProps;

        this.emitter = new Emitter();
        this.type = type;
        this.elem = utils.elem('div', {'class': `livestyle-widget livestyle-widget__${type}`});
        this.decoration = this.decorate(editor, marker);

        this.update();
    }

    decorate(editor, marker) {
        var props = Object.assign(this.decorationProperties, {
            item: this.elem
        });
        var decoration = editor.decorateMarker(marker, props);

        var onMarkerUpdate = marker.bufferMarker.onDidChange(event => {
            console.log('marker updated');
            if (event.oldProperties.livestyle !== event.newProperties.livestyle) {
                console.log('LS marker data updated');
                // LiveStyle data updated, update widget content
                this.emitter.emit('will-update');
                this.update();
                this.emitter.emit('did-update');
            }
        });

        var onDestroy = decoration.onDidDestroy(() => {
            onMarkerUpdate.dispose();
            onDestroy.dispose();
            this.destroy();
        });

        return decoration;
    }

    update() {
        utils.emptyNode(this.elem);
        utils.appendToElement(this.elem, this.getValue());
    }

    getValue() {
        return 'dummy value';
    }

    getMarker() {
        return this.decoration.getMarker();
    }

    /**
     * Returns `true` if current widget display should depend on cursor position
     * (e.g. cursor should be inside inside widget’s marker range)
     * @return {Boolean}
     */
    isCursorContext() {
        return true;
    }

    onDidDestroy(callback) {
        return this.emitter.on('did-destroy', callback);
    }

    destroy() {
        if (!this._destroyed) {
            console.log('destoying widget', this);
            this._destroyed = true;
            this.emitter.emit('did-destroy');
            this.decoration.destroy();
            this.emitter.dispose();
            this.decoration = this.emitter = null;
        }
    }
};
