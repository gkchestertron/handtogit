HTG = window.HTG || {};

/**
 * creates the controller class for handling selection and input
 * @param {HTG} htg - the htg instance to attach the controller to
 */
HTG.Controller = function (htg) {
    this.htg       = htg;
    this.mode      = 'select';
    this.selection = new HTG.Selection(htg);
    this.setListeners();
};

$.extend(HTG.Controller.prototype, {
    /**
     * a map of actions to callbacks based on action type, level and direction
     * @namespace
     */
    actionMap: {
        select: {
            line: {
                primary: {
                    drag : 'selectRange',
                    tap  : 'selectWord'
                },

                secondary: {
                    left  : 'deleteSelection',
                    right : 'paste',
                    up    : 'findPrev',
                    down  : 'findNext',
                    hold  : 'moveSelection',
                    tap   : 'copySelection'
                },

                hold: {
                    tap : 'setInsert',
                    left: 'setInsert'
                }
            },

            lineNumber: {
                primary: {
                    left  : 'deleteLines',
                    right : 'replaceLines',
                    up    : 'openNewLineAbove',
                    down  : 'openNewLineBelow',
                    tap   : 'selectLines'
                },
                secondary: {},
                hold: {}
            }
        },

        insert: {
            line: {
                primary: {
                    tap: 'setInsert'
                },
                secondary: {},
                hold: {}
            },

            lineNumber: {
                primary: {},
                secondary: {},
                hold: {}
            }
        }
    },

    /**
     * collection of action callbacks
     * @namespace
     */
    actions: {
        /**
         * copies the current selection to the clipboard
         */
        copySelection: function () {
            this.htg.clipboard.push(this.selection.copy());
            this.htg.flash();
        },

        /**
         * deletes all lines in the current selection
         */
        deleteLines: function () {
            var lineNumbers = this.selection.getLineNumbers();
            this.clearSelection(false);
            this.htg.file.deleteLines(lineNumbers);
            this.htg.reload();
        },

        /**
         * deletes the current selection
         */
        //TODO handle block mode
        deleteSelection: function () {
            var self = this,
                diff;

            this.htg.file.deleteRanges(this.selection.getRanges());
            this.clearSelection(false);
            this.htg.reload();
        },

        /**
         * pastes the last thing on the clipboard into the current selection
         */
        paste: function () {
            var srcRanges  = this.htg.clipboard.last(),
                destRanges = this.selection.getRanges(),
                srcIdx = 0;

            if (!srcRanges)
                return;

            this.htg.file.deleteRanges(destRanges);

            _.each(destRanges, function (destRange) {
                var text = srcRanges[srcIdx].string;

                this.htg.file.insert(destRange, text);

                srcIdx++;

                if (srcIdx === srcRanges.length)
                    srcIdx = 0;
            });

            this.clearSelection(false);
            this.htg.reload();
        },

        /**
         * extends selection to the beginning and end of all lines in the selection
         */
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

            this.updateCurrentRange();
            this.highlightRanges();
        },

        /**
         * selects a range
         */
        selectRange: function () {
            if (!this.htg.file.lines[this.endPoint.row] || this.endPoint.col < 0)
                return;

            this.updateCurrentRange();
            this.highlightRanges();
        },

        /**
         * selects a single word by searching for word boundaries in both directions
         * from the original touchpoint
         */
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
            this.updateCurrentRange();
            this.highlightRanges();
        },

        setInsert: function () {
            this.setInsert();
        }
    },

    /** 
     * backspaces when in insert mode
     * @param {bool} delete - whether to delete instead
     */
    backspace: function (del) {
        var self   = this,
            offset = del ? 0 : 1;

        if (this.mode !== 'insert')
            return;

        // TODO handle tabs
        _.each(this.insertRanges, function (line) {
            _.each(line, function (insertRange, idx) {
                insertRange.endCol = 
                    insertRange.startCol = 
                    insertRange.startCol - offset;
                    self.htg.file.deleteRanges(insertRange);

                insertRange.endCol = 
                    insertRange.startCol = 
                    insertRange.startCol - idx;
            });
        });
        this.htg.reload();
        this.selection.clear();
    },

    /**
     * calls an action based on the controller's current action type, level and direction
     */
    callAction: function () {
        var funcName = this.actionMap[this.mode][this.actionType][this.actionLevel][this.actionDirection];
        if (!this.scrolling && funcName && this.actions[funcName])
            this.actions[funcName].apply(this, arguments);
    },

    /**
     * clears out the selection, redraws the previously selected rows and removes 
     * reference to the previously selected range
     */
    clearSelection: function (redraw) {
        if (redraw !== false)
            this.redrawSelectedRows();
        this.selection.clear();
        this.currentRange = undefined;
    },

    /**
     * handles escape key in top controls
     */
    escape: function () {
        this.mode = 'select';
        delete this.insertRanges;
        this.htg.removeCursors();
        this.clearSelection();
        this.resetActionFlags();
        this.htg.hideKeyboard();
    },

    /**
     * gets the action direction based on the column difference between the current 
     * range's start point and end point
     */
    getActionDirection: function () {
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

    /**
     * gets a touch point based on an event
     * @param  {Event} event - the event triggered by some user action
     * @return {object}      - and object representing the point of contact within the $code element
     */
    getTouchPoint: function (event) {
        var col   = this.htg.getTextColumn(event),
            row   = this.htg.getTextRow(event),
            line  = this.htg.file.lines[row],
            chr   = line && line[col];

        return {
            col  : col,
            row  : row,
            line : line,
            chr  : chr
        };
    },

    /**
     * handlers for basic touch events
     * @namespace
     */
    handlers: {
        /**
         * handler for touchstart
         * - sets the initial action and selection flags
         * @param {Event} event - the user triggered event
         */
        start: function (event) {
            var self = this;

            this.resetActionFlags();
            this.startPoint = this.getTouchPoint(event);
            this.actionType = this.startPoint.col > -1 ? 'line' : 'lineNumber';
            this.selecting  = true;

            if (this.actionType === 'line' && !this.remove) {
                if (this.selection.rangesContain(this.startPoint))
                    this.actionLevel = 'secondary';
                else if (!this.add && !this.remove && this.startPoint.chr)
                    this.clearSelection();

                // set hold flag in 200ms
                setTimeout(function () {
                    if (!self.moved) 
                        self.actionLevel = 'hold';
                }, 200);
            }

            if (this.actionType === 'lineNumber') {
                if (!this.selection.linesContain(this.startPoint) && !this.add && !this.remove)
                    this.clearSelection();
            }
        },

        /** 
         * handler for touchmove
         * - sets the moved flag, among others and calls intermediate actions
         * @param {Event} event - the user-triggered event
         */
        move: function (event) {
            if (!this.selecting) 
                return;

            this.moved = true;

            this.endPoint = this.getTouchPoint(event);

            // block scrolling
            if (this.actionType === 'lineNumber' || this.startPoint.chr && HTG.getPageY(event) < $(window).height()/2)
                event.preventDefault();
            else
                this.scrolling = true

            if (this.startPoint.chr && this.actionType === 'line' && this.actionLevel === 'primary')
                this.actionDirection = 'drag';

            this.callAction();
        },

        /**
         * handles the touchend event
         * - sets final flags and calls actions
         * @param {Event} event - the user-triggered event
         */
        end: function (event) {
            this.endPoint = this.getTouchPoint(event);
            this.actionDirection = this.getActionDirection();
            console.log(this.actionType, this.actionLevel, this.actionDirection)
            this.callAction();
            this.selecting = false;
        }
    },

    /**
     * highlights all ranges within the current selection
     */
    highlightRanges: function () {
        var self = this;

        this.redrawSelectedRows();

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

    /**
     * inserts a char at the start of the current insert Range
     * @param {string} chr - a char or chars to insert
     */
    insert: function (chr, cursorOffset) {
        var self = this;

        if (this.mode !== 'insert')
            return;

        cursorOffset = cursorOffset || 0;

        _.each(this.insertRanges, function (line) {
            _.each(line, function (insertRange, idx) {
                insertRange.endCol   = 
                    insertRange.startCol = 
                    insertRange.startCol + (idx * chr.length);
                self.htg.file.insert(insertRange, chr);
                self.htg.reload();
                insertRange.endCol   = 
                    insertRange.startCol = 
                    insertRange.startCol + chr.length - cursorOffset;
            });
        });
        this.htg.drawCursors();
    },

    /**
     * reloads the file from the next saved state if any
     */
    //TODO implement diffs
    redo: function () {
        var string = this.htg.file.state.next();

        if (string)
            this.htg.loadFromString(string, false);
        else
            this.htg.flash();
    },

    /**
     * redraws all rows in the current selection
     */
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

    /**
     * resets the action flags for the next set of interactions
     */
    resetActionFlags: function () {
        this.moved           = false;
        this.hold            = false;
        this.scrolling       = false
        this.currentRange    = undefined;
        this.actionLevel     = 'primary';
        this.actionDirection = undefined;
        delete this.endPoint;
    },

    /**
     * resets the selection flags for the next set of interactions
     */
    resetSelectionFlags: function () {
        this.remove = false;
        this.htg.$('[data-handler="toggleRemove"]').removeClass('htg-key-active');
        this.block = false;
        this.htg.$('[data-handler="toggleBlock"]').removeClass('htg-key-active');
    },

    /**
     * puts the controller into insert mode and sets a new inser range
     */
    setInsert: function () {
        var left = this.actionDirection === 'left',
            ranges = this.selection.getInsertRanges(left);

        this.mode = 'insert';

        if (ranges) {
            this.insertRanges = ranges;
            if (left)
                this.actions.deleteSelection.call(this);
        }
        else {
            this.insertRanges = {};
            this.insertRanges[this.startPoint.row] = [new HTG.Range(this.startPoint, this.startPoint)];
        }

        this.htg.showKeyboard();
        this.htg.drawCursors();
    },

    /**
     * sets the listeners and builds the keyboards
     */
    setListeners: function () {
        this.htg.$overlay.on('touchstart mousedown', this.handlers.start.bind(this));
        this.htg.$overlay.on('touchmove mousemove', this.handlers.move.bind(this));
        this.htg.$overlay.on('touchend', this.handlers.end.bind(this));

        this.topControls = new HTG.Keyboard(this, this.htg.$topControls, {
            keys: [
                [ '<', '&#8634;', '-', '&#x2630;', '+', '&#8635;', '>', null, '/', 'esc', ]
            ],

            handlers: {
                default    : 'type',
                '&#8634;'  : 'undo',
                '-'        : 'toggleRemove',
                '&#x2630;' : 'toggleBlock',
                '+'        : 'toggleAdd',
                '&#8635;'  : 'redo',
                'esc'      : 'escape'
            }

        });
    },

    /**
     * toggles the add flag and indicates it in the ui
     */
    toggleAdd: function (event) {
        this.add = !this.add;
        this.htg.$('[data-handler="toggleAdd"]').toggleClass('htg-key-active');
        this.remove = false;
        this.htg.$('[data-handler="toggleRemove"]').removeClass('htg-key-active');
    },

    /**
     * toggles the block flag and indicates it in the ui
     */
    toggleBlock: function (event) {
        this.block = !this.block;
        this.htg.$('[data-handler="toggleBlock"]').toggleClass('htg-key-active');
    },

    /**
     * toggles the remove flag and indicates it in the ui
     */
    toggleRemove: function (event) {
        this.remove = !this.remove;
        this.htg.$('[data-handler="toggleRemove"]').toggleClass('htg-key-active');
        this.add = false;
        this.htg.$('[data-handler="toggleAdd"]').removeClass('htg-key-active');
    },

    /**
     * reloads from the previously saved state if any
     */
    //TODO implement diffs
    undo: function () {
        var string = this.htg.file.state.prev();

        if (string)
            this.htg.loadFromString(string, false);
        else
            this.htg.flash();
    },
    
    /**
     * updates the currentRange based on the current end point
     */
    updateCurrentRange: function () {
        if (!this.currentRange)
            this.currentRange = this.selection.addRange(this.startPoint, this.endPoint, this.block, this.remove);
        else
            this.selection.updateCurrentRange(this.startPoint, this.endPoint, this.block, this.remove);
    }
});
