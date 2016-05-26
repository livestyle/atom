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

const Task = require('atom').Task;
const Disposable = require('atom').Disposable;
const convert = require('./convert');
const decorator = require('./decorator');
const utils = require('./utils');
const analyzer = new Task(require.resolve('./worker'));

const queue = [];
const buffers = new Map();
const analyzerState = {locked: false};
const reSupportedScopes = /\.(less|scss)\b/;
const layerId = 'analyzer';

/**
 * Adds LiveStyle Analyzer markers to given TextBuffer. Returns `Disposable`
 * object that, when disposed, removes all LiveStyle data from given text buffer
 * @param  {TextBuffer} buffer
 * @return {Disposable}
 */
module.exports = function(buffer) {
    var key = buffer.id;
    console.log('requested analyzer for', key);
    if (buffers.has(key)) {
        return buffers.get(key).disposable;
    }

    var disposable = new Disposable(() => {
        onDestroy.dispose();
        onChange.dispose();
        buffers.delete(key);
    });
    var onDestroy = buffer.onDidDestroy(() => disposable.dispose());
    var onChange = buffer.onDidStopChanging(() => enqueue(key));

    buffers.set(key, {buffer, key, disposable});
    enqueue(key);

    return disposable;
};

function enqueue(key) {
    if (queue.indexOf(key) === -1) {
        queue.push(key);
        nextInQueue();
    }
}

function nextInQueue() {
    if (analyzerState.locked || !queue.length) {
        // still calculating something or queue is empty
        // console.log('locked or empty queue');
        return;
    }

    let key = queue.shift();
    if (!buffers.has(key)) {
        // seems like buffer was already destroyed
        console.log('buffer destroyed');
        return nextInQueue();
    }

    let buffer = buffers.get(key).buffer;
    let syntax = getSyntaxForBuffer(buffer);
    if (!syntax) {
        // switched to unsupported syntax?
        // console.log('unsupported syntax');
        return nextInQueue();
    }

    // analyze it!
    analyzerState.locked = true;
    analyzer.start(syntax, buffer.getText(), result => {
        console.log('analyzer result', result);
        if (result.status === 'ok') {
            markBufferWithAnalyzerData(buffer, result.data);
        } else if (result.status === 'error') {
            console.error(result.error);
        }
        analyzerState.locked = false;
        nextInQueue();
    });
}

/**
 * Returns LiveStyle-supported syntax for given text buffer or `undefined`
 * if syntax is not supported
 * @param  {TextBuffer} buffer
 * @return {String}
 */
function getSyntaxForBuffer(buffer) {
    var editor = atom.workspace.getTextEditors().find(editor => editor.getBuffer() === buffer);
    if (editor) {
        let rootScope = editor.getRootScopeDescriptor().scopes[0] || '';
        let m = rootScope.match(reSupportedScopes);
        if (m) {
            return m[1];
        }
    }
}

/**
 * Adds range markers with LiveStyle Analyzer data to given text buffer.
 * Each `Marker` instance contains relevant analyzer data in `_livestyle` property.
 * @param  {TextBuffer} buffer
 * @param  {Object} data
 */
function markBufferWithAnalyzerData(buffer, data) {
    // 1. Find existing markers
    // 2. Update them with new data if possible
    // 3. Remove old markers
    // 4. Add non-existing markers
    let oldMarkers = new Set(buffer.getMarkers().filter(utils.isLiveStyleMarker));
    let newMarkers = new Set(convert(data).source.all()
    .map(node => {
        if (!node.fullRange || !node.fullRange.length || node.type === 'root') {
            return;
        }

        return {
            range: utils.makePositionRange(buffer, node.fullRange),
            livestyle: {
                info: node.analysis,
                type: node.type,
                name: node.value,
                value: node.value
            }
        };
    })
    .filter(Boolean));

    newMarkers.forEach(item => {
        var matched = buffer.findMarkers({
            startPosition: item.range[0],
            endPosition: item.range[1]
        })
        .filter(utils.isLiveStyleMarker)
        .filter(marker => {
            return marker.getProperties().livestyle.type === item.livestyle.type;
        });

        if (matched.length) {
            // found matched markers: update their data and remove from set
            matched.forEach(marker => {
                marker.setProperties({livestyle: item.livestyle});
                oldMarkers.delete(marker);
            });
            newMarkers.delete(item);
        }
    });

    console.log('markers to remove', oldMarkers);
    console.log('markers to add', newMarkers);

    oldMarkers.forEach(marker => marker.destroy());
    newMarkers.forEach(marker => {
        buffer.markRange(marker.range, {
            persistent: false,
            livestyle: marker.livestyle
        });
    });
}
