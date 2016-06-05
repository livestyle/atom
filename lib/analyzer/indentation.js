/**
 * Helper module that reads indentation preferences from given text editor
 * and given buffer position (if passed) and returns object that can be used
 * for formatting text output
 */
'use strict';

module.exports = function(editor, point) {
    var text = '\t';
    var level = 0;
    if (editor) {
        text = editor.getTabText();
        if (point) {
            level = editor.indentationForBufferRow(Array.isArray(point) ? point[0] : point.row);
        }
    }

    return new Indentation(text, level);
}

class Indentation {
    constructor(text, level) {
        this.text = text || '\t';
        this.level = level || 0;
        this._text = null;
    }

    increment() {
        return new Indentation(this.text, this.level + 1);
    }

    decrement() {
        return level > 0 ? new Indentation(this.text, this.level - 1) : this;
    }

    valueOf() {
        if (this._text === null) {
            this._text = '';
            var level = this.level;
            while (level-- > 0) {
                this._text += this.text;
            }
        }
        return this._text;
    }

    toString() {
        return this.valueOf();
    }
}
