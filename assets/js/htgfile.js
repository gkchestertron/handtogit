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
            if (language.defs.keywords.indexOf(word) === -1 && self.words.indexOf(word) === -1)
                self.words.push(word);
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

    getLines: function (ranges) {

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
    },

    replaceRange: function (srcRanges, destRange) {

    },

    /*
     * replaces destination ranges with source ranges within the file's lines
     * - will restart at beginning of source ranges if there are more destination ranges than source ranges
     * @param {object} srcRangesObj - an object containing arrays of ranges by line number
     * - ranges contain a string representing the file's content in that range at the time the range was made
     * - ranges contain relative cols and rows
     * @param {array} - array of destination ranges
     */
    replaceRanges: function (srcRangesObj, destRanges) {
        var self        = this,
            lines       = {},
            srcRangeIdx = 0
            srcRangeArr = [];
        
        // return if there is no src
        if (!srcRangesObj) 
            return;

        // convert object into flat array
        _.each(srcRangesObj, function (rangeArr) {
            srcRangeArr = srcRangeArr.concat(rangeArr);
        });

        // get unique rows
        _.each(_.unique(destRanges, function (range) { return range.startRow }), function (range) {
            lines[range.startRow] = self.lines[range.startRow].split('');
        });

        // overwrite each range on each row with string from clipboard
        _.each(destRanges, function (range, idx) {
            var line = lines[range.startRow];

            _.each(_.range(range.startCol, range.endCol + 1), function (col) {
                line[col] = '';
            });

            line[range.startCol] = srcRangeArr[srcRangeIdx++].string;

            if (!srcRangeArr[srcRangeIdx])
                srcRangeIdx = 0;
        });

        // rejoin rows
        _.each(lines, function (line, lineNumber) {
            self.lines[lineNumber] = line.join('');
        });
    }
});
