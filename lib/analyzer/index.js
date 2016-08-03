/**
 * LiveStyle Analyzer handler.
 * How it works:
 * 1. Take `TextBuffer` with LESS/SCSS stylesheet to watch for.
 * 2. On every editor update, re-calculate analyzer data
 * 3. Create range markers on text buffer with analyzer data for further use.
 *    For each marker, add `livestyle` property with analyzer data.
 * 4. Watch for user interaction with TextBuffer’s editor view and draw decorations
 *    with analyzer data when required.
 */
'use strict';

const deepEqual = require('deep-equal');
const Task = require('atom').Task;
const Disposable = require('atom').Disposable;
const CompositeDisposable = require('atom').CompositeDisposable;
const convert = require('./convert');
const createDecorator = require('./decorator');
const utils = require('./utils');
const OutlineWidget = require('./widget/OutlineWidget');
const getType = require('./widget/type');

const analyzer = new Task(require.resolve('./worker'));
const queue = [];
const buffers = new Map();
const analysisCache = new WeakMap();
const analyzerState = {locked: false};

/**
 * Adds LiveStyle Analyzer markers to given TextBuffer. Returns `Disposable`
 * object that, when disposed, removes all LiveStyle data from given text buffer
 * @param  {TextBuffer} buffer
 * @return {Disposable}
 */
module.exports = function() {
    var decorator = createDecorator();
    var subscriptions = new CompositeDisposable();
    subscriptions.add(
        decorator,

        atom.workspace.observeTextEditors(watchBuffer),

        atom.commands.add('atom-text-editor', 'livestyle:show-widget', function(event) {
    		var editor = this.model;
    		if (toggleContextWidget(decorator, editor, editor.getCursorBufferPosition())) {
    			event.stopPropagation();
    		}
    	}),

        atom.commands.add('atom-text-editor', 'livestyle:hide-widget', function(event) {
    		hideWidgets(decorator, this.model);
    		event.abortKeyBinding();
    	}),

        atom.commands.add('atom-text-editor', 'livestyle:show-outline', function(event) {
            let editor = this.model;
            if (utils.supportedSyntax(editor) && analysisCache.has(editor.getBuffer())) {
                let item = new OutlineWidget();
                item.setData(editor, analysisCache.get(editor.getBuffer()));

                let panel = atom.workspace.addModalPanel({item});
                let panelView = atom.views.getView(panel);

                let removePanel = () => {
                    panel.destroy();
                    onHide.dispose();
                    panelView.removeEventListener('click', onPanelClick);
                };

                let onPanelClick = evt => {
                    if (!evt.target.closest('livestyle-outline')) {
                        // clicked outside panel
                        removePanel();
                    }
                };

                let onHide = item.onDidHide(removePanel);

                panelView.classList.add('livestyle-outline-panel');
                panelView.addEventListener('click', onPanelClick);
            } else {
                event.abortKeyBinding();
            }
    	}),

        new Disposable(cleanLiveStyleData)
    );

    return subscriptions;
};

function watchBuffer(editor) {
    var buffer = editor.getBuffer();
    var key = buffer.id;
    if (!buffers.has(key)) {
        var subscriptions = new CompositeDisposable();
        subscriptions.add(
            buffer.onDidDestroy(() => subscriptions.dispose()),
            buffer.onDidStopChanging(() => enqueue(key)),
            new Disposable(() => buffers.delete(key))
        );

        buffers.set(key, {buffer, key, subscriptions});
        enqueue(key);
    }
}

/**
 * Toggle LiveStyle context widget display found in given position, if possible
 * @param  {TextEditor} editor
 * @param  {Point} pos Buffer position in given editor
 * @return {Boolean} Returns true if expandable widget found in given position
 */
function toggleContextWidget(decorator, editor, pos) {
    let widget = decorator.find(editor, pos);
    if (widget) {
        widget.toggle(editor, pos);
        return true;
    }
}

/**
 * Hide all active Livestyle widgets in given editor
 * @param  {TextEditor} editor
 */
function hideWidgets(decorator, editor) {
    for (let widget of decorator.find(editor)) {
        widget.hide();
    }
}

function enqueue(key) {
    if (queue.indexOf(key) === -1) {
        queue.push(key);
        nextInQueue();
    }
}

function nextInQueue() {
    if (analyzerState.locked || !queue.length) {
        // still calculating something or queue is empty
        return;
    }

    let key = queue.shift();
    if (!buffers.has(key)) {
        // seems like buffer was already destroyed
        return nextInQueue();
    }

    let buffer = buffers.get(key).buffer;
    let syntax = getSyntaxForBuffer(buffer);
    if (!syntax) {
        // switched to unsupported syntax?
        return nextInQueue();
    }

    // analyze it!
    analyzerState.locked = true;
    analyzer.start(syntax, buffer.getText(), result => {
        // console.log('analyzer result', result);
        if (result.status === 'ok') {
            let data = convert(result.data);
            analysisCache.set(buffer, data);
            markBufferWithAnalyzerData(buffer, data);
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
        return utils.supportedSyntax(editor);
    }
}

/**
 * Adds range markers with LiveStyle Analyzer data to given text buffer.
 * Each `Marker` instance contains relevant analyzer data in `livestyle` property.
 * @param  {TextBuffer} buffer
 * @param  {Object} data
 */
function markBufferWithAnalyzerData(buffer, data) {
    // 1. Find existing markers
    // 2. Update them with new data if possible
    // 3. Remove old markers
    // 4. Add non-existing markers
    let oldMarkers = new Set(buffer.getMarkers().filter(utils.isLiveStyleMarker));
    let newMarkers = populateMarkers(buffer, data);

    newMarkers.forEach(item => {
        var matched = buffer.findMarkers({
            startPosition: item.range[0],
            endPosition: item.range[1]
        })
        .filter(utils.isLiveStyleMarker)
        .filter(marker => {
            return utils.markerData(marker).type === item.livestyle.type;
        });

        if (matched.length) {
            // found matched markers: update their data and remove from set
            matched.forEach(marker => {
                if (!deepEqual(marker.getProperties().livestyle, item.livestyle)) {
                    marker.setProperties({livestyle: item.livestyle});
                }
                oldMarkers.delete(marker);
            });
            newMarkers.delete(item);
        }
    });

    oldMarkers.forEach(marker => marker.destroy());
    newMarkers.forEach(marker => {
        buffer.markRange(marker.range, {
            livestyle: marker.livestyle
        });
    });
}

/**
 * Creates marker data from given LiveStyle Analyzer node
 * @param  {AnalyzerNode} node
 * @param  {TextBuffer} buffer
 * @return {Object}
 */
function createMarkerData(node, buffer) {
    if (!node.fullRange || !node.fullRange.length) {
        return;
    }

    var nameRange  = utils.makePositionRange(buffer, node.nameRange);
    var valueRange = utils.makePositionRange(buffer, node.valueRange);
    var fullRange  = utils.makePositionRange(buffer, node.fullRange);

    // depending on node type, pick best range for text buffer
    var range = fullRange;
    var type = getType(node);

    if (!type) {
        return null;
    } else if (type === getType.ROOT_NODE) {
        // for root node, do not mark entire range, add it at the beginning
        // of the document for easier decorator lookups
        range = [[0, 0], [0, 0]];
    } else if (node.type === 'property' && type !== getType.MIXIN_CALL) {
        range = valueRange;
    } else if (type === getType.SELECTOR) {
        range = nameRange;
    }

    return {
        range,
        type,
        livestyle: {
            nameRange,
            valueRange,
            fullRange,
            type,
            info: node.analysis,
            nodeType: node.type,
            name: node.name,
            value: node.value
        }
    };
}

function populateMarkers(buffer, data) {
    let marks = data.source.all()
    .filter(node => nonEmptyObj(node.analysis))
    .map(node => createMarkerData(node, buffer))
    .filter(Boolean);

    // Handle special case: a `SELECTOR` marker matches selector name only,
    // but it also provides completions for all nested properties.
    // For this case, create a new marker that will cover full rule section
    marks = marks.reduce((out, mark) => {
        if (mark.type === getType.SELECTOR) {
            let livestyle = Object.assign({}, mark.livestyle, {
                type: getType.COMPLETIONS_PROVIDER
            });
            out.push({
                range: livestyle.fullRange,
                type: livestyle.type,
                livestyle
            });
        }
        out.push(mark);
        return out;
    }, []);

    return new Set(marks);
}

function nonEmptyObj(obj) {
    return obj && Object.keys(obj).some(k => obj[k] != null);
}

function cleanLiveStyleData() {
    destroyAllLiveStyleMarkers();
    buffers.forEach(data => data.subscriptions.dispose());
    buffers.clear();
}

function destroyAllLiveStyleMarkers() {
    let buffers = new Set();
    atom.workspace.getTextEditors().forEach(editor => {
        if (utils.supportedSyntax(editor)) {
            buffers.add(editor.getBuffer());
        }
    });

    buffers.forEach(buffer => {
        buffer.getMarkers().filter(utils.isLiveStyleMarker)
        .forEach(marker => marker.destroy());
    })
}
