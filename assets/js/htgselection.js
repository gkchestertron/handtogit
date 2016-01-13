HTG = window.HTG || {};

HTG.Selection = function (htg) {
    this.htg = htg;
    this.clear();
};

$.extend(HTG.Selection.prototype, {
    addRange: function (startPoint, endPoint, block, inverse) {
        console.log('adding range');
        this.range = new HTG.Range({
            startPoint : startPoint,
            endPoint   : endPoint,
            block      : block,
            inverse    : inverse
        });

        this.combineLines(this.range.getLines(), inverse);

        // TODO add support for extending/spliting/truncating ranges
        return this.range;
    },

    clear: function () {
        this.range  = undefined;
        this.lines  = {};
        this.$rows  = [];
    },

    combineLines: function (lines, inverse) {
        var self = this;

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

    getLines: function () {
        var self  = this,
            lines = {};

        _.each(this.lines, function (line, lineIdx) {
            var startCol = line[0];

            lines[lineIdx] = [];
            _.each(line, function (col, idx) {
                var nextCol = line[idx + 1];

                if (nextCol - col > 1 || idx === line.length - 1) {
                    lines[lineIdx].push({ startCol: startCol, endCol: col });
                    startCol = nextCol;
                }
            });
        });

        return lines;
    },

    linesContain: function (point) {
        return Object.keys(this.lines).indexOf(point.row.toString()) > -1;
    },

    rangesContain: function (point) {
        return this.linesContain(point) && this.lines[point.row].indexOf(point.col) > -1;
    },

    sortRanges: function () {
        this.ranges.sort(function (a, b) { 
            if (a.startRow === b.startRow) 
                return a.startCol - b.startCol;
            return a.startRow - b.startRow;
        });
    },

    updateRange(startPoint, endPoint, block, inverse) {
        console.log('updating');
        this.range = this.range || this.addRange(startPoint, endPoint, block, inverse);
        this.range.update(startPoint, endPoint);
        var lines = HTG.benchmark('getlines', this.range, this.range.getLines);
        HTG.benchmark('combineLines', this, this.combineLines, [lines, inverse]);
    }
});
