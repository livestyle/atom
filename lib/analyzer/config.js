/**
 * Atom config for LiveStyle Analyzer
 */
module.exports = {
    title: 'LiveStyle Analyzer',
    type: 'object',
    properties: {
        enabled: {
            type: 'boolean',
            default: true,
            title: 'Enable Analyzer',
            description: 'Experimental UI that displays context code hints for LESS and SCSS stylesheets as you type.',
            order: 1
        },
        computedValue: {
            type: 'boolean',
            default: true,
            title: 'Automatically display computed value',
            description: 'Automatically display computed value tooltip when caret moves inside value token. When disabled, use `livestyle:show-widget` command to display tooltip.',
            order: 2
        },
        selector: {
            type: 'boolean',
            default: true,
            title: 'Automatically display resolved selector',
            description: 'Automatically display resolved CSS selector tooltip when caret moves inside selector token. When disabled, use `livestyle:show-widget` command to display tooltip.',
            order: 3
        },
        notifyCampaign: {
            type: 'boolean',
            default: true,
            title: 'Notify about LiveStyle Analyzer campaign',
            description: 'Displays LiveStyle Analyzer notification when new window is opened. This config setting is automatically set to `false` after a new window is created and the notification is shown.',
            order: 4
        }
    }
};
