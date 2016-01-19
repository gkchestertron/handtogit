window.HTG = window.HTG || {};

HTG.File = function (fileString) {
    this.fileString = HTG.replaceAll(fileString, /\t/g, { '\t': '    ' }); // replace tabs
    this.lines      = this.fileString.split(/\n|\r/);
    this.newLines   = {};
    this.insertions = {};

    // remove extraneous newline if it exists
    if (this.lines.slice(-1)[0] === "") 
        this.lines = this.lines.slice(0, -1);
};

$.extend(HTG.File.prototype, {
    /**
     * adds a line or an array of lines to the newLines object for insertion upon commit
     * @param {string|string[]} lines - a line of array of lines to add
     * @param {int}             idx   - index at which to insert lines
     */
    addLine: function (lines, idx) {
        lines = this.array(lines);
        this.newLines[idx] = this.newLines[idx] || [];
        this.newLines[idx] = lines.concat(this.newLines[idx]);
    },

    /**
     * returns anything wrapped in an array if it isn't one already
     * @param {variable} thing - thing to wrap as an array
     * @return {array} thing wrapped in array
     */
    array: function (thing) {
        if (!Array.isArray(thing))
            thing = [thing];

        return thing;
    },

    buildWordList: function (language) {
        var self = this;

        this.words = [];

        _.each(this.fileString.match(/\w+/g), function (word) {
            if (language.defs.keywords.indexOf(word) === -1 && self.words.indexOf(word) === -1)
                self.words.push(word);
        });
    },

    /**
     * iterates over lines
     * - builds diff
     * - removes deleted lines
     * - adds in insertions and new lines
     * - converts changed/added lines back to strings (from arrays)
     * @return {object} the diff containing the indices of changed, added and removed lines
     */
    commit: function () {
        var lines = [],
            diff  = {
                added   : [],
                changed : [],
                deleted : []
            };

        this.makeInsertions();
        this.makeNewLines();

        _.each(this.lines, function (line, idx) {
            if (line === undefined) {
                diff.deleted.push(idx);
            }
            else {
                if (line.isNew)
                    diff.added.push(idx);
                else if (Array.isArray(line))
                    diff.changed.push(idx);

                if (Array.isArray(line))
                    line = line.join('');

                lines.push(line);
            }
        });

        this.lines      = lines;
        this.newLines   = {};
        this.insertions = {};

        return diff;
    },

    /**
     * deletes a range or array of ranges from a file, joining the last line to the first
     * @param {Range|Range[]} ranges - the range or array of ranges to delete 
     */
    deleteRanges: function (ranges) {
        var self  = this,
            lines = this.getLines(ranges),
            startCol, 
            endCol;

        ranges = this.array(ranges);

        ranges.sort(function (a, b) {
            return b.startRow - a.startRow;
        });

        _.each(ranges, function (range) {
            for (var row = range.startRow; row <= range.endRow; row++) {
                startCol = 0;
                endCol   = lines[row].length;

                if (row === range.startRow)
                    startCol = range.startCol;

                if (row === range.endRow)
                    endCol = range.endCol;

                if (row > range.startRow && row < range.endRow)
                    self.deleteLines(row);
                else
                    for (var col = startCol; col <= endCol; col++)
                        lines[row][col] = '';
            }

            self.joinLines(range);
        });
    },

    /**
     * marks a line or lines for deletion by setting its contents to undefined
     * @param {int|int[]} - the line or array of lines to delete
     */
    deleteLines: function (idxs) {
        var self = this;

        idxs = this.array(idxs);

        _.each(idxs, function (idx) {
            self.lines[idx] = undefined;
        });
    },

    /** 
     * @param {Range|Range[]} ranges - a range or array of ranges
     * @returns {object} lines from the file corresponding to a set of given ranges
     * lines are split into arrays so they can be referenced easily whether 
     * their index is changed by adding or deleting rows
     */
    getLines: function (ranges) {
        var self  = this,
            lines = {};

        ranges = this.array(ranges);

        _.each(ranges, function (range) {
            for (var i = range.startRow; i <= range.endRow; i++) {
                if (typeof(self.lines[i]) === 'string')
                    self.lines[i] = self.lines[i].split('');

                lines[i] = self.lines[i];
            }
        });

        return lines;
    },

    // TODO deprecate
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

    /**
     * adds insertion to insertions object
     * @param {Range} range - range to use for start point of insertion
     * @param {string} text - the text to insert
     */
    insert: function (range, text) {
        var insertion = this.insertions[range.startCol] = 
                this.insertions[range.startCol] || [];

        if (typeof(this.lines[range.startRow]) === 'string')
            this.lines[range.startRow] = this.lines[range.startRow].split('');

        insertion.push({ range: range, text: text });
    },

    /**
     * joins the first and last line of a range and deletes the last line
     * @param {Range} range - a range to join
     */
    joinLines: function (range) {
        var lines     = this.getLines(range),
            firstLine = lines[range.startRow],
            lastLine  = lines[range.endRow];

        if (firstLine === lastLine)
            return;

        // each instead of concat to maintain reference
        _.each(lastLine, function (col) {
            firstLine.push(col);
        });

        this.deleteLines(range.endRow);
    },

    /**
     * iterates backwards through insertions for each lines, 
     * splitting and adding new lines along the way
     */
    makeInsertions: function () {
        var self = this,
            insertionsArr = _.map(this.insertions, function (insertions, lineIdx) {
                return { lineIdx: parseInt(lineIdx), insertions: insertions };
            });

        insertionsArr.sort(function (a, b) {
            return b.lineIdx - a.lineIdx;
        });

        _.each(insertionsArr, function (insertions) {
            var offset = 0;

            insertions = insertions.insertions;

            // sort backwards
            insertions.sort(function (a, b) { 
                return b.range.startCol - a.range.startCol;
            });

            // split and add lines
            _.each(insertions, function (insertion) {
                var newLines       = insertion.text.split('\n'),
                    newLinesLength = newLines.length,
                    firstLine      = newLines.shift() || '',
                    lastLine       = newLines.pop()   || '',
                    splitIdx       = insertion.range.startCol,
                    lineIdx        = insertion.range.startRow;

                self.lines[lineIdx] = self.lines[lineIdx]
                    .slice(0, splitIdx)
                    .concat(firstLine)
                    .concat(lastLine)
                    .concat(self.lines[lineIdx].slice(splitIdx));

                if (newLinesLength > 1) {
                    self.splitLine(lineIdx, splitIdx);
                    self.addLines(newLines, lineIdx);
                }
            });
        });
    },

    /**
     * adds all new lines in the newLines object to the lines array for commit
     */
    makeNewLines: function () {
        var self        = this,
            offset      = 0,
            newLinesArr = _.map(this.newLines, function (lines, lineNumber) {
                return { lineNumber: parseInt(lineNumber), lines: lines };
            });

        newLinesArr.sort(function (a, b) { return a.lineNumber - b.lineNumber; });

        _.each(newLinesArr, function (newLinesObj) {
            var idx = newLinesObj.lineNumber + offset;

            _.each(newLinesObj.lines, function (line) {
                if (!Array.isArray(line))
                    line = line.split('');

                line.isNew = true;
            });

            self.lines = self.lines.slice(0, idx).concat(lines).concat(self.lines.slice(idx));

            offset += newLinesObj.lines.length;
        });
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
    },

    /**
     * splits line at given index
     * @param {int} lineIdx  - index of lineIdx
     * @param {int} splitIdx - index at which to split
     */
    splitLine: function (lineIdx, splitIdx) {
        if (typeof(this.lines[lineIdx]) === 'string')
            this.lines[lineIdx] = this.lines[lineIdx].split('');

        this.lines[lineIdx] = this.lines[lineIdx].slice(0, splitIdx);
        this.addLine(this.lines[lineIdx].slice(splitIdx));
    }
});
