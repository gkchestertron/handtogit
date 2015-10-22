htg.LanguageBase = (function () {
    var LanguageBase = function (options) {
        this.definition = options;
    };

    extend(LanguageBase.prototype, {

    });

    return LanguageBase;

    // shallow extend function
    function extend (obj, props) {
        for (var i in props) {
            obj[i] = props[i];
        }
    }
})();
