/**
 * LiveStyle Worker: for given LESS or SCSS stylesheet performs analysis
 * for code hints.
 *
 * Should run in separate thread (Atom Task: https://atom.io/docs/api/v1.7.4/Task)
 * since its pretty CPU-consuming
 */
'use strict';

const livestyle = require('emmet-livestyle');
const analyzer = require('livestyle-analyzer');

// Silence logger, do not output errors for missing variables and mixins
livestyle.logger.silent(true);

module.exports = function(syntax, stylesheet) {
    let callback = this.async();

    analyze(syntax, stylesheet)
    .then(data => callback({status: 'ok', data}))
    .catch(err => {
        console.error(err);
        callback({
            status: 'error',
            error: err.message
        });
    });
};

function analyze(syntax, stylesheet) {
    return new Promise((resolve, reject) => {
        // Steps for analysis:
        // 1. Pass LESS/SCSS stylesheet to LiveStyle resolver, ignore external
        //    dependencies for now.
        // 2. Resolved tree contains all the data required for Analyzer. Pass
        //    tree to Analyzer which simply extracts this data from tree and
        //    and produces readable result
        livestyle.resolve(stylesheet, {syntax}, (err, tree) => {
            err ? reject(err) : resolve(analyzer(tree).toJSON());
        });
    });
}
