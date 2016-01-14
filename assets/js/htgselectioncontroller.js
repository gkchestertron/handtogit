HTG = window.HTG || {};

HTG.SelectionController = function (htg) {
    this.htg = htg;
    this.selection = new HTG.Selection(htg);
    this.setListeners();
};

$.extend(HTG.SelectionController.prototype, {
    actionsMap: {
        line: {
            primary: {
                drag : 'selectRange',
                hold : 'moveSelection',
                tap  : 'selectWord'
            },

            secondary: {
                left  : 'deleteSelection',
                right : 'replaceSelectionWithPaste',
                up    : 'findPrev',
                down  : 'findNext',
                tap   : 'copySelection'
            }
        },

        lineNumber: {
            primary: {
                left  : 'deleteLines',
                right : 'replaceLinesWithPaste',
                up    : 'openNewLineAbove',
                down  : 'openNewLineBelow',
                tap   : 'selectLines'
            }
        }
    },

    actions: {
        selectLines: function () {
            var lines = _.map(Object.keys(this.selection.lines), function (num) { return parseInt(num) }),
                endRow,
                lastLine;

            if (lines.length && !this.add && !this.remove) {
                endRow = lines[lines.length - 1];
                lastLine = this.htg.file.lines[endRow];
                this.startPoint.row = lines[0];
                this.startPoint.col = 0;
                this.endPoint.row   = endRow;
                this.endPoint.col   = lastLine.length - 1;
            }
            else {
                endRow = this.endPoint.row;
                lastLine = this.htg.file.lines[endRow];
                this.startPoint.col = 0;
                this.endPoint.col   = lastLine.length - 1;
            }

            this.highlightRanges();
        },

        selectRange: function () {
            if (!this.htg.file.lines[this.endPoint.row] || this.endPoint.col < 0)
                return;
            this.highlightRanges();
        },

        selectWord: function () {
            var start        = this.startPoint.col,
                end          = start,
                lineIndex    = this.startPoint.row,
                $row         = this.htg.$('span[data-line-index="'+lineIndex+'"]'),
                line         = this.htg.file.lines[lineIndex],
                re           = /\w|&|\||<|>|#|\$|=|\+|\-|\//,
                startFound,
                endFound,
                text;

            if (!line) return;

            if (!this.block && re.test(line[start])) {
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
            this.highlightRanges();
        }
    },

    callAction: function () {
        var funcName = this.actionsMap[this.actionType][this.actionLevel][this.eventType];
        if (funcName && this.actions[funcName])
            this.actions[funcName].apply(this, arguments);
    },

    clearSelection: function () {
        this.redrawSelectedRows();
        this.selection.clear();
        this.currentRange = undefined;
    },

    escape: function () {
        this.clearSelection();
        this.resetSelectionFlags();
    },

    handlers: {
        start: function (event) {
            this.resetSelectionFlags();
            this.startPoint = this.getTouchPoint(event);
            this.actionType = this.startPoint.col > -1 ? 'line' : 'lineNumber';

            if (this.actionType === 'line' && !this.add && !this.remove) {
                if (this.selection.rangesContain(this.startPoint))
                    this.actionLevel = 'secondary';
                else if (!this.add && !this.remove)
                    this.clearSelection();

                // set hold flag in 200ms
                setTimeout(function () {
                    if (!this.moved) 
                        this.hold = true;
                }, 200);
            }

            if (this.actionType === 'lineNumber') {
                if (!this.selection.linesContain(this.startPoint) && !this.add && !this.remove)
                    this.clearSelection();
            }
        },

        move: function (event) {
            if (!this.selecting) return;

            this.endPoint = this.getTouchPoint(event);

            // block scrolling
            if (this.actionType === 'lineNumber' || this.startPoint.chr)
                event.preventDefault();

            this.moved = true;

            if (this.actionType === 'line' && this.actionLevel === 'primary')
                this.eventType = 'drag';

            this.callAction();
        },

        end: function (event) {
            this.endPoint = this.getTouchPoint(event);

            if (this.actionType === 'line') {
                if (!this.moved && this.actionLevel === 'primary')
                    this.eventType = 'tap';
                else if (this.actionLevel === 'secondary')
                    this.eventType = this.getTouchDirection();
            }

            if (this.actionType === 'lineNumber')
                this.eventType = this.getTouchDirection();

            this.callAction();
            this.selecting = false;
        }
    },

    getTouchDirection: function () {
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

        if (!this.moved) return 'tap';

        for (var dir in dirs) {
            current = dirs[dir];
            if (max === undefined || current > max) {
                max = current;
                maxDir = dir;
            }
        }

		if (max === 0 && this.moved)
            return 'left';
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

        this.redrawSelectedRows();
        this.updateRange();

        _.each(this.selection.getLines(), function (ranges, lineNumber) {
            var line = self.htg.file.lines[lineNumber],
                $row = self.htg.$('[data-line-index="'+lineNumber+'"]'),
                $lineNumber = self.htg.$('[data-line-number-index="'+lineNumber+'"]');

            if (ranges.length) {
                self.selection.$rows.push($row);
                self.htg.redrawRow($row, HTG.addHighlight(line, ranges));
                self.selection.$lineNumbers.push($lineNumber);
                self.htg.redrawRow($lineNumber, HTG.addHighlight($lineNumber.text(), [{}]));
            }
        });
    },

    redrawSelectedRows: function () {
        var self  = this;
        
        // lines
        _.each(this.selection.$rows, function ($row) {
            this.htg.redrawRow($row);
        });

        // line numbers
        _.each(this.selection.$lineNumbers, function ($lineNumber) {
            this.htg.redrawRow($lineNumber, $lineNumber.text());
        });
    },

    resetSelectionFlags: function () {
        this.moved            = false;
        this.hold             = false;
        this.selecting        = true;
        this.currentRange     = undefined;
        this.actionLevel      = 'primary';
        delete this.endPoint;
    },

    setListeners: function () {
        this.htg.$overlay.on('touchstart mousedown', this.handlers.start.bind(this));
        this.htg.$overlay.on('touchmove mousemove', this.handlers.move.bind(this));
        this.htg.$overlay.on('touchend touchcancel mouseup', this.handlers.end.bind(this));

        this.topControls = new HTG.Keyboard(this, this.htg.$topControls, {
            type: [ '<', '&#8634;'], 
            toggleRemove: '-', 
            toggleBlock: '&#x2630;',
            toggleAdd: '+',
            type2: ['&#8635;', '>', '/'], 
            escape: 'esc'
        });
    },

    toggleAdd: function (event) {
        this.add = !this.add;
        $(event.currentTarget).toggleClass('htg-key-active');
        this.remove = false;
        this.htg.$('[data-handler="toggleRemove"]').removeClass('htg-key-active');
    },

    toggleBlock: function (event) {
        this.block = !this.block;
        $(event.currentTarget).toggleClass('htg-key-active');
    },

    toggleRemove: function (event) {
        this.remove = !this.remove;
        $(event.currentTarget).toggleClass('htg-key-active');
        this.add = false;
        this.htg.$('[data-handler="toggleAdd"]').removeClass('htg-key-active');
    },

    type: function (event) {
        console.log($(event.currentTarget).text());
    },

    type2: function (event) {
        console.log($(event.currentTarget).text());
    },
    
    updateRange: function () {
        if (!this.currentRange)
            this.currentRange = this.selection.addRange(this.startPoint, this.endPoint, this.block, this.remove);
        else
            this.selection.updateRange(this.startPoint, this.endPoint, this.block, this.remove);
    }
});
