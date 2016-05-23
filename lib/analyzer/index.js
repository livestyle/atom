/**
 * LiveStyle Analyzer handler.
 * How it works:
 * 1. Take `TextBuffer` with LESS/SCSS stylesheet to watch for.
 * 2. On every editor update, re-calculate analyzer data
 * 3. Create range markers onseparate marker layer of text buffer with analyzer
 *    data for further use. For each marker, add `_livestyle` property with
 *    relative analyzer data.
 * 4. Watch for user interaction TextBuffer’s editor view and draw decorations
 *    with analyzer data when required.
 */
'use strict';

const atom = require('atom');
const analyzer = atom.Task('./worker');

const queue = new Set();
const buffers = new Map();

/**
 * Adds LiveStyle Analyzer markers to given TextBuffer. Returns `Disposable`
 * object that, when disposed, removes all LiveStyle data from given text buffer
 * @param  {TextBuffer} buffer
 * @return {Disposable}
 */
module.exports = function(buffer) {
    
};
