HTG = window.HTG || {};

HTG.SelectionController = function (htg) {
    this.htg = htg;
    this.selection = new HTG.Selection(htg);
    this.setListeners();
};

$.extend(HTG.SelectionController.prototype, {
    clearSelection: function () {
        this.redrawSelectedRows();
        this.selection.clear();
        this._currentRange = undefined;
    },

    dragSelect: function () {
        if (!this.endPoint.chr) return;
        this.redrawSelectedRows();
        this.updateCurrentRange();
        this.highlightRanges();
    },

    getCurrentRange: function (range) {
        this._currentRange = range || this._currentRange || this.selection.addRange(this.startPoint, this.endPoint);
        return this._currentRange;
    },

    getMoveDirection: function () {
        var x = this.endPoint.col - this.startPoint.col,
            y = this.endPoint.row - this.startPoint.row,
            dirs = {
                right : x,
                left  : -1 * x,
                down  : y,
                up    : -1 * y
            },
            current,
            max,
            maxDir;

        if (!this.moved) return;

        for (var dir in dirs) {
            current = dirs[dir];
            if (max === undefined || current > max) {
                max = current;
                maxDir = dir;
            }
        }

        return maxDir;
    },

    getTouchPoint: function (event) {
        var col   = HTG.getTextColumn(event),
            row   = HTG.getTextRow(event),
            line  = this.htg.file.lines[row],
            chr   = line && line[col];

        return {
            col  : col,
            row  : row,
            line : line,
            chr  : chr
        };
    },

    highlightRanges: function () {
        var self = this;


        _.each(this.selection.ranges, function (range) {
            _.each(range.lines, function (line, idx) {
                var $row = range.$rows[idx];

                line = self.htg.file.lines[line];

                if (range.$rows.length === 1) {
                    self.htg.redrawRow(range.$rows[0], HTG.addHighlight(line, range.startCol, range.endCol + 1));
                }
                else {
                    if (idx === 0) 
                        self.htg.redrawRow($row, HTG.addHighlight(line, range.startCol, line.length));

                    if (idx === range.$rows.length - 1) 
                        self.htg.redrawRow($row, HTG.addHighlight(line, 0, range.endCol + 1));

                    if (idx > 0 && idx < range.$rows.length - 1)
                        self.htg.redrawRow($row, HTG.addHighlight(line, 0, line.length));
                }
            });
        });
    },

    redrawSelectedRows: function () {
        var self  = this;
        
        _.each(this.selection.$rows, function ($row) {
            this.htg.redrawRow($row);
        });
    },

    reset: function () {
        // reset flags
        this.moved = false;
        this.hold  = false;
        delete this.actionType;
        delete this.startPoint;
        delete this.endPoint;
        delete this.secondaryAction;
    },

    setListeners: function () {
        var self = this,
            htg  = this.htg;

        // start
        htg.$overlay.on('touchstart mousedown', function (event) {
            self.reset();
            self.selecting = true;
            self.startPoint = self.getTouchPoint(event);
            self.actionType = self.startPoint.col > -1 ? 'code' : 'line';


            if (self.actionType === 'code') {
                // clear selection unless point is in existing selection
                if (self.selection.rangesContain(self.startPoint)) {
                    self.secondaryAction = true;
                }
                else {
                    self.clearSelection();
                }

                // set hold flag in 200ms
                setTimeout(function () {
                    if (!self.moved) self.hold = true;
                }, 200);
            }

            if (self.actionType === 'line') {
                if (!self.selection.linesContain(self.startPoint))
                    self.selection.clear();
            }

        });

        // move
        htg.$overlay.on('touchmove mousemove', function (event) {
            if (!self.selecting) return;

            self.endPoint = self.getTouchPoint(event);

            // block scrolling
            if (self.actionType === 'line' || self.startPoint.chr)
                event.preventDefault();

            self.moved = true;

            if (self.actionType === 'code' && !self.secondaryAction)
                self.dragSelect();
        });

        htg.$overlay.on('touchend mouseup', function (event) {
            self.endPoint = self.getTouchPoint(event);
            if (!self.moved) self.tapSelect();
            self.selecting = false;
        });
    },

    tapSelect: function () {
        var start        = this.startPoint.col,
            end          = start,
            lineIndex    = this.startPoint.row,
            $row         = this.htg.$('span[data-line-index="'+lineIndex+'"]'),
            line         = this.htg.file.lines[lineIndex],
            re           = /\w|&|\||<|>|#|\$|=|\+|\-|\//,
            startFound,
            endFound,
            text;

        if (re.test(line[start])) {
            while (!startFound || !endFound) {
                if (start > 0 && re.test(line[start - 1]))
                    start--;
                else
                    startFound = true;

                if (end < line.length && re.test(line[end]))
                    end++;
                else
                    endFound = true;
            }
        }

        // adjust for off by one in redraw
        if (end - start > 0) end -= 1;

        this.startPoint.col = start;
        this.endPoint.col   = end;
        this.updateCurrentRange();
        this.highlightRanges();
    },

    updateCurrentRange: function () {
        var range = this.getCurrentRange();

        range.update(this.startPoint, this.endPoint);
        this.selection.addLines();
    }
});
