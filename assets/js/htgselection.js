HTG = window.HTG || {};

/**
 * creates the selection class
 * @param {HTG} htg - the htg instance
 */
HTG.Selection = function (htg) {
    this.htg = htg;
    this.clear();
};

$.extend(HTG.Selection.prototype, {
    /**
     * adds a range to the selection based on points and flags
     * @param {object} startPoint - an object representing a starting point 
     * @param {object} endPoint   - an object representing a ending point 
     * @param {bool}   block      - a flag for whether this range is block type
     * @param {bool}   inverse    - a flag for whether this range is inverse (subtractive)
     * @return {Range}
     */
    addRange: function (startPoint, endPoint, block, inverse) {
        this.currentRange = new HTG.Range(startPoint, endPoint, block, inverse);
        this.prevLines = this.lines;
        this.combineLines(this.currentRange.getLines(), inverse);
        this.ranges.push(this.currentRange);
        return this.currentRange;
    },

    /**
     * resets the selection
     */
    clear: function () {
        this.currentRange = undefined;
        this.ranges       = [];
        this.lines        = {};
        this.$lineNumbers = []
        this.prevLines    = {};
        this.$rows        = [];
    },

    /**
     * combines the columns from a new range with the existing columns in the selection
     * @param {object} lines   - an object containing columns in arrays by line index
     * @param {bool}   inverse - a flag indicating whether to add columns or subtract them 
     */
    combineLines: function (lines, inverse) {
        var self = this;

        this.lines = $.extend(true, {}, this.prevLines);
        _.each(lines, function (newLine, idx) {
            var fileLine = self.htg.file.lines[idx],
                prevLine = self.lines[idx],
                startCol = newLine.startCol || 0,
                endCol   = newLine.endCol !== undefined ? newLine.endCol + 1 : fileLine.length;

            if (!prevLine)
                prevLine = self.lines[idx] = [];

            _.each(_.range(startCol, endCol), function (col) {
                if (!inverse && prevLine.indexOf(col) === -1)
                    prevLine.push(col);
                else if (inverse && prevLine.indexOf(col) > -1)
                    prevLine.splice(prevLine.indexOf(col), 1);
            });

            prevLine.sort(function (a, b) { return a - b; });
        });
    },

    /**
     * makes a deep copy of the selections ranges and gets the current string 
     * representations of them from the file
     * @return {Range[]} - an array of ranges representing the selection
     */
    copy: function () {
        var ranges = $.extend(true, [], this.getRanges()),
            file  = this.htg.file,
            colOffset,
            rowOffset;

        _.each(ranges, function (range) {
            range.string = file.getString(range);
        });

        return ranges;
    },

    getInsertRanges: function () {
        var ranges = this.getRanges(),
            result = {};

        // return false if no ranges
        if (!ranges.length)
            return false;
        
        // create new ranges with zero length by line
        _.each(ranges, function (range) {
            range = $.extend(true, {}, range);
            range.endCol = range.startCol;
            range.endRow = range.startRow;

            result[range.startRow] = result[range.startRow] || [];
            result[range.startRow].push(range);
        });

        // sort ranges by col
        _.each(result, function (line) {
            line.sort(function (a, b) {
                return a.startCol - b.startCol;
            });

            // adjust for length of previous range (because it is being removed
            _.each(line, function (range, idx) {
                var prevLine = idx > 0 && line[idx - 1];

                if (prevLine)
                    range.endCol = range.startCol = range.startCol - prevLine.length;
            });
        });

        return result;
    },

    /**
     * returns the line numbers of the current selection
     * @return {int[]}
     */
    getLineNumbers: function () {
        return _.map(Object.keys(this.lines), function (lineNumber) {
            return parseInt(lineNumber);
        });
    },

    /**
     * returns an object filled with arrays of ranges by line indexOf
     * @return {object}
     */
    getLines: function () {
        var self  = this,
            lines = {};

        _.each(this.lines, function (line, lineIdx) {
            var startCol = line[0];

            lineIdx = parseInt(lineIdx);
            lines[lineIdx] = [];
            _.each(line, function (col, idx) {
                var nextCol = line[idx + 1];

                if (nextCol - col > 1 || idx === line.length - 1) {
                    lines[lineIdx].push(new HTG.Range({
                        row: lineIdx, 
                        col: startCol
                    }, {
                        row: lineIdx,
                        col: col
                    }));

                    startCol = nextCol;
                }
            });
        });

        return lines;
    },

    /**
     * returns an array of ranges representing the current selection
     * @return {Range[]}
     */
    getRanges: function () {
        var lines   = this.getLines(),
            overlap = false,
            ranges  = [];

        _.each(this.ranges, function (range) {
            if (range.inverse)
                overlap = true;
        });

        if (!overlap)
            return this.ranges;

        _.each(lines, function (lineRanges) {
            _.each(lineRanges, function (range) {
                ranges.push(range);
            });
        });

        return ranges;
    },

    /**
     * returns whether a given point exists in the lines touched by the current selection
     * @param {object} point - a point on the $code element
     * @return {bool}
     */
    linesContain: function (point) {
        return Object.keys(this.lines).indexOf(point.row.toString()) > -1;
    },

    /**
     * returns whether a given point is contained within the current selection
     * @param {object} point - a point on the $code element
     * @return {bool}
     */
    rangesContain: function (point) {
        return this.linesContain(point) && this.lines[point.row].indexOf(point.col) > -1;
    },

    /**
     * updates the current range (for drag select)
     * @param {object} startPoint - an object representing a starting point 
     * @param {object} endPoint   - an object representing a ending point 
     * @param {bool}   block      - a flag for whether this range is block type
     * @param {bool}   inverse    - a flag for whether this range is inverse (subtractive)
     */
    updateCurrentRange(startPoint, endPoint, block, inverse) {
        this.currentRange = this.currentRange || this.addRange(startPoint, endPoint, block, inverse);
        this.currentRange.update(startPoint, endPoint);
        var lines = this.currentRange.getLines();
        this.combineLines(lines, inverse);
    }
});
