HTG.LDEFS = {};

HTG.prototype.Language = (function () {
    var Language = function (options) {
        this.defs = options;
    };

    $.extend(Language.prototype, {
        getSuggestions: function (match, limit) {
            var re = match ? new RegExp('^'+match+'.*', 'i') : /\w+/;
                suggestions = _.filter(this.defs.keywords, function (word) {
                    return re.test(word);
                });

            return suggestions.slice(0, limit);
        }
    });

    return Language;
})();
