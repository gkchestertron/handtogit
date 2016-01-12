HTG = window.HTG || {};

HTG.Range = function (startPoint, endPoint) {
    this.update(startPoint, endPoint);
};

$.extend(HTG.Range.prototype, {
    contains: function (point) {
        if (!this.linesContain(point))
            return false;

        if (point.row === this.startRow && point.col < this.startCol)
            return false

        if (point.row === this.endRow && point.col > this.endCol)
            return false;

        return true;
    },

    linesContain: function(point) {
        return this.lines.indexOf(point.row) > -1;
    },

    update: function (startPoint, endPoint, block) {
        var startCol = startPoint.col,
            startRow = startPoint.row,
            endCol   = endPoint.col,
            endRow   = endPoint.row,
            temp;

        // swap start and end cols if necessary
        if (((startRow === endRow || block) && startCol > endCol) || (startRow > endRow)) {
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
        this.lines    = _.range(startRow, endRow + 1);
        this.$rows    = _.map(this.lines, function (line) {
            return self.htg.$('[data-line-index="'+line+'"]');
        });
    }
});
