window.HTG = window.HTG || {};

HTG.File = function (fileString) {
    this.fileString = HTG.replaceAll(fileString, /\t/g, { '\t': '    ' }); // replace tabs
    this.lines      = this.fileString.split(/\n|\r/);

    // remove extraneous newline if it exists
    if (this.lines.slice(-1)[0] === "") 
        this.lines = this.lines.slice(0, -1);
};

$.extend(HTG.File.prototype, {
    buildWordList: function (language) {
        var self = this;

        this.words = [];

        _.each(this.fileString.match(/\w+/g), function (word) {
            if (
                language.defs.keywords.indexOf(word) === -1 &&
                    self.words.indexOf(word) === -1
            ) {
                self.words.push(word);
            }
        });
    },

    getSuggestions: function (match, limit) {
        var re = match ? new RegExp('^'+match+'.*', 'i') : /\w+/;
            suggestions = _.filter(this.words, function (word) {
            return re.test(word);
        });

        return suggestions.slice(0, limit);
    }
});
