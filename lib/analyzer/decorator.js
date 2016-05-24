/**
 * For each text editor, watches for caret position update and adds context
 * LiveStyle decorators
 */
'use strict';

atom.workspace.observeTextEditors(editor => {
    let onCursorChange = editor.onDidChangeCursorPosition(function(event) {
        let markers = getLiveStyleMarkers(editor, event.cursor.getBufferPosition());
        if (markers.length) {
            console.log('LS markers', markers);
        }
    });
});

/**
 * Returns array of LiveStyle markers for given position
 * @param  {Point} pos
 * @return {Marker[]}
 */
function getLiveStyleMarkers(editor, pos) {
    return editor
    .findMarkers({containsBufferPosition: pos})
    .filter(marker => marker.bufferMarker && ('_livestyle' in marker.bufferMarker))
    .map(marker => marker.bufferMarker);
}

/**
 * Creates decoration for given marker set
 * @param  {Marker[]} markers
 * @return {Decoration}
 */
function decorate(markers) {
    
}
