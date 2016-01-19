HTG = window.HTG || {};

HTG.Selection = function (htg) {
    this.htg = htg;
    this.clear();
};

$.extend(HTG.Selection.prototype, {
    addRange: function (startPoint, endPoint, block, inverse) {
        this.range = new HTG.Range(startPoint, endPoint, block, inverse);
        this.prevLines = this.lines;
        this.combineLines(this.range.getLines(), inverse);
        this.ranges.push(this.range);
        return this.range;
    },

    clear: function () {
        this.range        = undefined;
        this.ranges       = [];
        this.lines        = {};
        this.$lineNumbers = []
        this.prevLines    = {};
        this.$rows        = [];
    },

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

    getLineNumbers: function () {
        return _.map(Object.keys(this.lines), function (lineNumber) {
            return parseInt(lineNumber);
        });
    },

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
                    lines[lineIdx].push({ startRow: lineIdx, endRow: lineIdx, startCol: startCol, endCol: col });
                    startCol = nextCol;
                }
            });
        });

        return lines;
    },

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

    linesContain: function (point) {
        return Object.keys(this.lines).indexOf(point.row.toString()) > -1;
    },

    rangesContain: function (point) {
        return this.linesContain(point) && this.lines[point.row].indexOf(point.col) > -1;
    },

    updateRange(startPoint, endPoint, block, inverse) {
        this.range = this.range || this.addRange(startPoint, endPoint, block, inverse);
        this.range.update(startPoint, endPoint);
        var lines = this.range.getLines();
        this.combineLines(lines, inverse);
    }
});
