HTG = window.HTG || {};

HTG.Range = function (startPoint, endPoint, block, inverse) {
    this.block   = block;
    this.inverse = inverse;
    this.update(startPoint, endPoint);
};

$.extend(HTG.Range.prototype, {
    contains: function (point) {
        if (!this.linesContain(point))
            return false;

        if (this.block)
            return (point.col >= this.startCol && point.col <= this.endCol);

        if (point.row === this.startRow && point.col < this.startCol)
            return false

        if (point.row === this.endRow && point.col > this.endCol)
            return false;

        return true;
    },

    getLines: function () {
        var self  = this,
            lines = {},
            count = this.endRow - this.startRow + 1,
            range = _.range(this.startRow, this.endRow + 1);;

        _.each(range, function (lineNumber, idx) {
            lineNumber = parseInt(lineNumber);

            var thing = { startRow: lineNumber, endRow: lineNumber };

            if (self.block || count === 1) {
                thing.startCol = self.startCol;
                thing.endCol   = self.endCol;
            }
            else {
                if (idx === 0)
                    thing.startCol = self.startCol;

                if (idx === count - 1)
                    thing.endCol = self.endCol;
            }

            lines[lineNumber] = thing;
        });

        return lines;
    },

    linesContain: function(point) {
        return (point.row >= this.startRow && point.row <= this.endRow);
    },

    update: function (startPoint, endPoint) {
        var self     = this,
            startCol = startPoint.col,
            startRow = startPoint.row,
            endCol   = endPoint.col,
            endRow   = endPoint.row,
            temp;

        // swap start and end cols if necessary
        if (((startRow === endRow || this.block) && startCol > endCol) || (startRow > endRow)) {
            temp     = startCol;
            startCol = endCol;
            endCol   = temp;
        }

        // swap row indices if necessary
        if (startRow > endRow) {
            temp     = startRow;
            startRow = endRow;
            endRow   = temp;
        }

        this.startCol = startCol;
        this.startRow = startRow;
        this.endCol   = endCol;
        this.endRow   = endRow;
    }
});
