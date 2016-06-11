/**
 * Watch for cursor movement in given editor and invoke specific events
 * on widget under cursor
 */
'use strict';

const Disposable = require('atom').Disposable;
const utils = require('./utils');

module.exports = function(editor, registry) {
    var contextWidget = null;

    let enter = (event, widget) => {
        if (widget !== contextWidget) {
            leave(event);
            widget.cursorenter(event);
            contextWidget = widget;
        }
    };

    let leave = event => {
        if (contextWidget) {
            contextWidget.cursorleave(event);
            contextWidget = null;
        }
    };

    let isValidContext = () => utils.supportedSyntax(editor);

    let check = event => {
        if (editor.isDestroyed() || !isValidContext()) {
            return;
        }

        var pos = event
            ? event.cursor.getBufferPosition()
            : editor.getCursorBufferPosition();

        var widget = registry.findForPos(editor, pos);
        widget ? enter(event, widget) : leave(event);
    };

    let onCursorMove = editor.onDidChangeCursorPosition(check);
    check();

    return new Disposable(() => {
        leave();
        onCursorMove.dispose();
        editor = registry = null;
    });
};
