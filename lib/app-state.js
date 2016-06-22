/**
 * A simple persistent app storage
 */
'use strict';

module.exports = class LiveStyleAppState {
    constructor(state) {
        this.data = state || {};
        this.notifyAnalyzer();
    }

    static deserialize(state) {
        return new LiveStyleAppState(state.data);
    }

    notifyAnalyzer() {
        if (!this.data.didShowAnalyzerNotification) {
            this.data.didShowAnalyzerNotification = true;
            atom.notifications.addInfo(`**LiveStyle can help you with LESS and SCSS!**<br>A new [LiveStyle Analyzer experimental UI](https://github.com/livestyle/atom#livestyle-analyzer) displays instant code hints for LESS and SCSS stylesheets.`, {
                dismissable: true
            });
        }
    }

    serialize() {
        return {
            deserializer: this.constructor.name,
            data: this.data
        };
    }
};
