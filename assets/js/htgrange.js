HTG = window.HTG || {};

/**
 * creates the range class
 * @class
 * @param {object} startPoint - an object representing the starting point of the range
 * @param {object} endPoint   - an object representing the ending point of the range
 * @param {bool}   block      - the block flag
 * @param {bool}   inverse    - the inverse flag
 */
HTG.Range = function (startPoint, endPoint, block, inverse) {
    this.block   = block;
    this.inverse = inverse;
    this.update(startPoint, endPoint);
};

$.extend(HTG.Range.prototype, {
    /**
     * tells you whether a range contains a given point
     * @param {object} point - an object representing a point
     * @return {bool}
     */
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

    /**
     * gets ranges by line - not respecting contiguous ranges over multiple lines
     * @return {object} an object containing arrays of ranges
     */
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

    /**
     * tells you whether a given point is on any line touched by the range
     * @param {object} point - an object representing a location on the $code element
     */
    linesContain: function(point) {
        return (point.row >= this.startRow && point.row <= this.endRow);
    },

    /**
     * updates the range based on given start and end points
     * @param {object} startPoint - an object representing the starting point of the range
     * @param {object} endPoint   - an object representing the ending point of the range
     */
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
        this.length   = endCol - startCol + 1;
    }
});
