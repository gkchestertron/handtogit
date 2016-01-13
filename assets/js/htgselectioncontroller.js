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

    escape: function () {
        this.clearSelection();
        this.reset();
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

    handlers: {
        start: function (event) {
            this.reset();
            this.selecting  = true;
            this.startPoint = this.getTouchPoint(event);
            this.actionType = this.startPoint.col > -1 ? 'code' : 'line';

            if (this.actionType === 'code' && !this.add && !this.remove) {
                if (this.selection.rangesContain(this.startPoint)) {
                    this.secondaryAction = true;
                }
                else if (!this.add && !this.remove) {
                    this.clearSelection();
                }

                // set hold flag in 200ms
                setTimeout(function () {
                    if (!this.moved) 
                        this.hold = true;
                }, 200);
            }

            if (this.actionType === 'line') {
                if (!this.selection.linesContain(this.startPoint))
                    this.selection.clear();
            }
        },

        move: function (event) {
            if (!this.selecting) return;

            this.endPoint = this.getTouchPoint(event);

            // block scrolling
            if (this.actionType === 'line' || this.startPoint.chr)
                event.preventDefault();

            this.moved = true;

            if (this.actionType === 'code' && !this.secondaryAction)
                this.primaryActions.dragSelect.call(this);
        },

        end: function (event) {
            this.endPoint = this.getTouchPoint(event);

            if (this.actionType === 'code') {
                if (!this.moved && !this.secondaryAction) {
                    this.primaryActions.tapSelect.call(this);
                }
                else if (this.secondaryAction) {
                    console.log(this.getTouchDirection());
                    console.log(this.secondaryActions.code[this.getTouchDirection()].call(this));
                }

            }

            if (this.actionType === 'line') {
                console.log(this.secondaryActions.line[this.getTouchDirection()].call(this));
            }

            this.selecting = false;
        }
    },

    highlightRanges: function () {
        var self = this;

        _.each(this.selection.getLines(), function (ranges, lineNumber) {
            var line = self.htg.file.lines[lineNumber],
                $row = self.htg.$('[data-line-index="'+lineNumber+'"]'),
                $lineNumber = self.htg.$('[data-line-number-index="'+lineNumber+'"]');

            self.selection.$rows.push($row);
            self.selection.$lineNumbers.push($lineNumber);
            self.htg.redrawRow($row, HTG.addHighlight(line, ranges));
            self.htg.redrawRow($lineNumber, HTG.addHighlight($lineNumber.text(), [{}]));
        });
    },

    primaryActions: {
        dragSelect: function () {
            if (!this.htg.file.lines[this.endPoint.row] || this.endPoint.col < 0)
                return;
            this.redrawSelectedRows();
            this.updateRange();
            this.highlightRanges();
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
            this.updateRange();
            this.highlightRanges();
        }
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

    reset: function () {
        // reset flags
        this.moved = false;
        this.hold  = false;
        this.actionType = undefined;
        delete this.startPoint;
        delete this.endPoint;
        this.secondaryAction = false;
        this._currentRange = undefined;
    },

    secondaryActions: {
        code: {
            left: function () {
                console.log('delete');
            },

            right: function () {
                console.log('paste');
            },

            up: function () {
                console.log('find prev');
            },

            down: function () {
                console.log('find next');
            },

            tap: function () {
                console.log('copy');
            }
        },

        line: {
            left: function () {
                alert('delete');
            },

            right: function () {
                alert('paste over');
            },

            up: function () {
                alert('new line above');
            },

            down: function () {
                alert('new line below');
            },

            tap: function () {
                alert('select & copy');
            }
        }
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
        if (!this._currentRange) {
            this.selection.addRange(this.startPoint, this.endPoint, this.block, this.remove);
            this._currentRange = true;
        }
        else
            this.selection.updateRange(this.startPoint, this.endPoint, this.block, this.remove);
    }
});
