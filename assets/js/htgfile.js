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

    deleteLines: function (lineNumbers) {
        var newLines = [];

        _.each(this.lines, function (line, idx) {
            if (lineNumbers.indexOf(idx) === -1)
                newLines.push(line);
        });

        this.lines = newLines;
    },

    deleteRanges: function (lines) {
        var self = this;

        _.each(lines, function (line, lineNumber) {
            var fileLine = self.lines[lineNumber],
                startIdx = 0,
                newLine  = '';

            _.each(line, function (range) {
                newLine += fileLine.slice(startIdx, range.startCol);
                startIdx = range.endCol + 1;
            });

            newLine += fileLine.slice(startIdx);

            self.lines[lineNumber] = newLine;
        });
    },

    getString: function (range) {
        var startSlice, intermediateRows, endSlice;

        if (range.endRow - range.startRow > 1) {
            startSlice       = this.lines[range.startRow].slice(range.startCol);
            intermediateRows = this.lines.slice(range.startRow + 1, range.endRow - 1).join('\n');
            endSlice         = this.lines[range.endRow].slice(0, range.endCol + 1);
            return startSlice+'\n'+intermediateRows+'\n'+endSlice;
        }
        else {
            return this.lines[range.startRow].slice(range.startCol, range.endCol + 1)
        }
    },

    getSuggestions: function (match, limit) {
        var re = match ? new RegExp('^'+match+'.*', 'i') : /\w+/;
            suggestions = _.filter(this.words, function (word) {
            return re.test(word);
        });

        return suggestions.slice(0, limit);
    }
});
