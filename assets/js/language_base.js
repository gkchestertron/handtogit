HTG.LDEFS = {};

HTG.prototype.LanguageBase = (function () {
    var LanguageBase = function (options) {
        this.defs = options;
    };

    extend(LanguageBase.prototype, {
        getSuggestions: function (match, limit) {
            var re = match ? new RegExp('^'+match+'.*', 'i') : /\w+/;
                suggestions = _.filter(this.defs.keywords, function (word) {
                    return re.test(word);
                });

            return suggestions.slice(0, limit);
        }
    });

    return LanguageBase;

    // shallow extend function
    function extend (obj, props) {
        for (var i in props) {
            obj[i] = props[i];
        }
    }
})();
