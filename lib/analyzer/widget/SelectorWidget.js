/**
 * Displays computed selector for given source selector
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const type = require('./type');

module.exports = class SelectorWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, type.SELECTOR);

        this.disposable.add(
            this.onCursorEnter(() => this.show()),
            this.onCursorLeave(() => this.hide())
        );
    }

    getValue() {
        return this.getLivestyleData().info.selector;
    }
};
