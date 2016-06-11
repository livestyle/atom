/**
 * Tracks mouse movement on given TextEditor
 * Mostly inspired by Hyperclick: https://github.com/facebooknuclideapm/hyperclick
 */
'use strict';

const Disposable = require('atom').Disposable;
const utils = require('./utils');

module.exports = function(editor, registry) {
    let view = atom.views.getView(editor);
    let widgetUnderCursor = null;
    let lastMousePos = null;

    // TODO observe grammar and add mouse events for supported
    // editors only

    let enter = (evt, widget) => {
        if (widget !== widgetUnderCursor) {
            leave(evt);
            widget.mouseenter(evt);
            widgetUnderCursor = widget;
            view.classList.add('livestyle-widget-hover');
        }
    };

    let leave = evt => {
        if (widgetUnderCursor) {
            widgetUnderCursor.mouseleave(evt);
            view.classList.remove('livestyle-widget-hover');
            widgetUnderCursor = null;
        }
    };

    let isValidEventContext = evt => {
        let key = process.platform === 'darwin' ? evt.metaKey : evt.ctrlKey;
        return key && utils.supportedSyntax(editor);
    };

    let widgetForMouseEvent= evt => {
        var screenPos = view.component.screenPositionForMouseEvent(evt);
        try {
            var bufferPos = editor.bufferPositionForScreenPosition(screenPos);
            var widget = registry.findForPos(editor, bufferPos);
            return widget && widget.isClickable() ? widget : null;
        } catch (error) {
            // Fix https://github.com/facebook/nuclide/issues/292
            // When navigating Atom workspace with `CMD/CTRL` down,
            // it triggers TextEditorElement's `mousemove` with invalid screen position.
            // This falls back to returning the start of the editor.
            console.error('Error getting buffer position for screen position:', error);
        }
    };

    let handleWidgetHover = evt => {
        var widget = widgetForMouseEvent(evt);
        widget ? enter(evt, widget) : leave(evt);
    };

    let onMouseMove = evt => {
        if (isValidEventContext(evt)) {
            handleWidgetHover(evt);
        } else {
            leave(evt);
        }

        lastMousePos = {clientX: evt.clientX, clientY: evt.clientY};
    };

    let onMouseDown = evt => {
        if (isValidEventContext(evt)) {
            var widget = widgetForMouseEvent(evt);
            widget && widget.click(evt);
        }
    };

    let onKeyDown = evt => {
        if (isValidEventContext(evt) && lastMousePos) {
            handleWidgetHover(lastMousePos);
        }
    };

    let onKeyUp = leave;

    getLinesDomNode(view).addEventListener('mousedown', onMouseDown);
    view.addEventListener('mousemove', onMouseMove);
    view.addEventListener('keydown', onKeyDown);
    view.addEventListener('keyup', onKeyUp);

    return new Disposable(() => {
        leave();
        getLinesDomNode(view).removeEventListener('mousedown', onMouseDown);
        view.removeEventListener('mousemove', onMouseMove);
        view.removeEventListener('keydown', onKeyDown);
        view.removeEventListener('keyup', onKeyUp);
        editor = view = registry = null;
    });
};

function getLinesDomNode(view) {
    return view.component ? view.component.linesComponent.getDomNode() : view;
}
