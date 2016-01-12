HTG = window.HTG || {};

HTG.Selection = function (htg) {
    this.htg = htg;
    this.clear();
};

$.extend(HTG.Selection.prototype, {
    addLines: function () {
        var self  = this;

        this.lines = [];

        _.each(this.ranges, function (range) {
            _.each(range.lines, function (line) {
                if (self.lines.indexOf(line) === -1)
                    self.lines.push(line);
            });
        });

        this.lines.sort();

        this.$rows = _.map(this.lines, function (line) {
            return self.htg.$('[data-line-index="'+line+'"]');
        });
    },

    addRange: function (startPoint, endPoint) {
        var range = new HTG.Range(startPoint, endPoint);

        // TODO add support for extending/spliting/truncating ranges
        this.ranges.push(range); 
        this.sortRanges();
        this.addLines(range);

        return range;
    },


    clear: function () {
        this.ranges = [];
        this.lines  = [];
        this.$rows  = [];
    },

    linesContain: function (point) {
        return this.lines.indexOf(point.row) > -1;
    },

    rangesContain: function (point, block) {
        var contains = false,
            containingRange;

        // quick fail if not even in lines
        if (!this.linesContain(point)) return false;

        _.each(this.ranges, function (range) {
            if (contains = range.contains(point, block))
                containingRange = range;
        });

        return containingRange || contains;
    },

    sortRanges: function () {
        this.ranges.sort(function (a, b) { 
            if (a.startRow === b.startRow) 
                return a.startCol - b.startCol;
            return a.startRow - b.startRow;
        });
    }
});
