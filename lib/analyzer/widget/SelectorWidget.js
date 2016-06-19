/**
 * Displays computed selector for given source selector
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const type = require('./type');
const utils = require('../utils');

const displayProperties = {
    type: 'livestyle-widget',
    position: 'top-left',
    name: 'selector'
};

module.exports = class SelectorWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, type.SELECTOR, displayProperties);

        this.disposable.add(
            this.onCursorEnter(() => this.show()),
            this.onCursorLeave(() => this.hide())
        );
    }

    getValue() {
        return this.getLivestyleData().info.selector;
    }
};
