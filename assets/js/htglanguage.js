HTG = window.HTG || {};

HTG.LDEFS = {};

/**
 * creates the Language class
 */
HTG.Language = function (options) {
    this.defs = options;
};

$.extend(HTG.Language.prototype, {
    /**
     * gets suggestions from the language definition based on a given match
     * @param {string} match - the string to match
     * @param {string[]} - an array of matches from the definition
     */
    getSuggestions: function (match, limit) {
        var re = match ? new RegExp('^'+match+'.*', 'i') : /\w+/;
            suggestions = _.filter(this.defs.keywords, function (word) {
                return re.test(word);
            });

        return suggestions.slice(0, limit);
    }
});
