/**
 * Widget for displaying computed value from current LiveStyle marker
 */
'use strict';

const AbstractWidget = require('./AbstractWidget');
const colorPreview = require('./colorPreview');
const type = require('./type');

module.exports = class ComputedValueWidget extends AbstractWidget {
    constructor(editor, marker) {
        super(editor, marker, type.COMPUTED_VALUE);

        var decoration;
        let removeDecoration = () => {
            if (decoration) {
                decoration.destroy();
                decoration = null;
            }
        };

        this.disposable.add(
            this.onCursorEnter(() => {
                removeDecoration();
                decoration = this.decorate()
            }),
            this.onCursorLeave(removeDecoration),
            this.onDidDestroy(removeDecoration)
        );
    }

    getValue() {
        var data = this.getLivestyleData();
        var computedValue = colorPreview.addColorMarkers(data.info.computed);
        return data.value !== computedValue ? computedValue : null;
    }
};
