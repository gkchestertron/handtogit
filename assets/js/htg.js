window.HTG = window.HTG || (function () {
    var consts;

    /**
     * creates the main HTG class
     * @class
     */
    var HTG = function ($element) {
        this.buildTemplate($element);
        this.$ = this.$element.find.bind(this.$element);;
        this.suggestions = [
            { occurance: 3, suggestion: 'some' },
            { occurance: 1, suggestion: 'test' },
            { occurance: 2, suggestion: 'suggestions' },
        ],
        this.setListeners();
        this.loadFromString(
        "// PhantomJS doesn't support bind yet                                        \n" +
        "Function.prototype.bind = Function.prototype.bind || function (thisp) {\n" +
        "    var fn = this;\n" +
        "    return function () {\n" +
        "        return fn.apply(thisp, arguments);\n" +
        "    };\n" +
        "};\n");
        this.setLanguage('javascript');
        this.clipboard  = new HTG.Clipboard(this);
        this.controller = new HTG.Controller(this);
        this.dictionary = new HTG.Dictionary(this);
    };
    
    $.extend(HTG.prototype, {
        /**
         * builds the template for the htg instance
         * @param {object} $element - the element to build the instance in
         */
        buildTemplate: function ($element) {
            // setup objects
            this.$element      = $element;
            this.$wrapper      = $('<div class="htg-wrapper"></div>');
            this.$pre          = $('<pre class="htg-noselect htg-pre"></pre>');
            this.$topBar       = $('<div class="htg-top-bar"></div>');
            this.$topControls  = $('<div class="htg-top-controls"></div>');
            this.$numbers      = $('<div class="htg-line-numbers"></div>');
            this.$code         = $('<code class="htg-code"></code>');
            this.$overlay      = $('<div class="htg-overlay"></div>');
            this.$controls     = $('<div class="htg-controls"></div>');
            this.$keyboard     = $('<div class="htg-keyboard"></div>');
            this.$mainControls = $('<div class="htg-main-controls"></div>');

            // append the things
            this.$element.append(this.$wrapper);
            this.$wrapper.append(this.$topBar);
            this.$topBar.append(this.$topControls);
            this.$wrapper.append(this.$pre);
            this.$wrapper.append(this.$controls);
            this.$controls.append(this.$keyboard);
            this.$controls.append(this.$mainControls);
            this.$controls.append('<input title="Choose File" type="file" class="htg-load-file">');
            this.$pre.append(this.$numbers);
            this.$pre.append(this.$code);
            this.$pre.append(this.$overlay);

            // hide the keyboard
            this.$keyboard.hide();
        },

        drawCursors: function () {
            var self = this;

            if (this.controller.mode !== 'insert')
                return;

            this.removeCursors();

            _.each(this.controller.insertRanges, function (line) {
                _.each(line, function (insertRange) {
                    var row     = insertRange.startRow,
                        col     = insertRange.startCol,
                        top     = self.get$row(row).offset().top + self.$pre.scrollTop(),
                        left    =  (((col + 1) * self.consts.fontWidth) + 
                                    self.consts.adjustedLeft)
                        $cursor = $('<span class="htg-cursor"> </span>'); 

                    if (col < 0)
                        return self.flash();
                        
                    $cursor.css({
                        top: top,
                        left: (((col + 1) * self.consts.fontWidth) + self.consts.adjustedLeft)
                    });

                    self.$cursors.push($cursor);
                    self.$pre.append($cursor);
                });
            });

            this.scrollToCursor();
        },

        /**
         * makes the background flash green
         */
        flash: function () {
            var self = this;

            this.$code.addClass('htg-flash');
            this.$pre.addClass('htg-flash');
            this.$numbers.addClass('htg-flash');
            setTimeout(function () {
                self.$code.removeClass('htg-flash');
                self.$pre.removeClass('htg-flash');
                self.$numbers.removeClass('htg-flash');
            }, 200);
        },

        /**
         * gets the text column of an event
         * @param {Event} event
         * @return {int}
         */
        getTextColumn: function (event) {
            var $child  = $(event.currentTarget),
                $parent = $child.parent(),
                eventX  = HTG.getPageX(event),
                left    = eventX - (HTG.consts.adjustedLeft - $parent.scrollLeft()),
                col     = Math.floor(left/this.consts.fontWidth) - 1;

            return col;
        },

        /**
         * gets the text row of an event
         * @param {Event} event
         * @return {int}
         */
        getTextRow: function (event) {
            var eventY       = HTG.getPageY(event),
                rowHeight    = HTG.consts.rowHeight,
                rowNumber    = Math.floor((this.$pre.scrollTop() + eventY - this.consts.adjustedTop)/rowHeight);

            return rowNumber;
        },

        get$row: function (idx) {
            return this.$('span[data-line-index="'+idx+'"]');
        },

        /**
         * hides the keyboard and shows the main controls
         */
        hideKeyboard: function () {
            this.$keyboard.hide();
            this.$mainControls.show();
        },

        /**
         * loads a file into the htg instance - async
         * @param {Event} event - the file input change event
         */
        loadFromFile: function (event) {
            var self   = this,
                reader = new FileReader(),
                file   = event.currentTarget.files[0];

            reader.onload = function (event) {
                self.file.state.reset();
                self.loadFromString(event.target.result);
            }

            reader.readAsText(file);
        },

        /**
         * loads a string into the htg instance
         * @param {string} fileString - the string to load
         * @param {bool}   saveState  - whether to save the new state of the file on reload
         */
        loadFromString: function (fileString, saveState) {
            var self = this,
                i    = 0,
                text;

            this.file = new HTG.File(fileString);

            text = _.map(this.file.lines, function (line, idx) {

                return '<span class="htg-editor-row" data-line-index="' + idx + '">' + 
                        (HTG.htmlConvert(line, 'html') || ' ') + '</span>';
            }).join('<span class="htg-break">\n</span>');

            this.$code.html(text);
            // while (i++ < 30) this.$code.append('\n');

            hljs.highlightBlock(this.$code[0]);
            this.setConstants();
            if (this.language)
                this.file.buildWordList(this.language);

            // save state
            if (saveState !== false)
                this.file.state.save(fileString);
                // self.$topBar.html(file.name); // TODO need to show filename somewhere 

            this.renumber();
        },

        makeSuggestions: function () {
            var self        = this,
                // suggestions = this.language.getSuggestions(this.selection.text[0], 5);
                suggestions = this.file.getSuggestions(this.selection.text[0], 5);

            _.each(suggestions, function (suggestion, idx) {
                var $suggestion = $('<div class="htg-suggestion">'+suggestion+'</div>');

                if (idx === 0 && suggestions.length > 1) 
                    $suggestion.css({ display: 'inline-block' });

                self.$rows[0].after($suggestion);
            });

            $('.htg-suggestion').css('left', this.$pre.scrollLeft());
        },

        redrawRow: function ($row, text) {
            text = text || HTG.htmlConvert(this.file.lines[$row.data('line-index')], 'html');
            $row.html(text);
            hljs.highlightBlock($row[0]);
            $row.removeClass('hljs');
        },

        reload: function () {
            var diff   = this.file.commit(), // for later
                string = this.file.lines.join('\n');

            this.loadFromString(string);
            this.drawCursors();
        },

        removeLines: function (lineNumbers) {
            var self = this;

            _.each(lineNumbers, function (lineNumber) {
                var $row = self.$('span[data-line-index="'+lineNumber+'"]'),
                    $break = $row.next('.htg-break');

                $row.remove();
                $break.remove();
            });

            this.renumber();
        },

        /**
         * redoes the line numbers and resizes the overlay to match the new length of the file
         */
        renumber: function () {
            var numberWidth = this.file.lines.length.toString().length;

            this.$numbers.html(_.map(_.range(this.file.lines.length), function (num) {
                var lineNumber = (num + 1).toString();

                while (lineNumber.length < numberWidth) {
                    lineNumber = ' ' + lineNumber;
                }

                return '<span class="line-number htg-noselect" data-line-number-index="'+num+'"> '+lineNumber+'</span> \n';
            }));

            hljs.highlightBlock(this.$numbers[0]);

            this.$('span.htg-editor-row').each(function (idx, row) {
                $(row).attr('data-line-index', idx);
                $(row).data('line-index', idx);
            });

            // resize overlay
            this.resizeOverlay();
        },

        removeCursors: function () {
            _.each(this.$cursors, function ($cursor) {
                $cursor.remove();
            });

            this.$cursors = [];
        },

        removeSuggestions: function () {
            $('.htg-suggestion').remove();
        },

        /**
         * resizes the overlay to match the length of the file
         */
        resizeOverlay: function () {
            var $editorRows = this.$('.htg-editor-row');
            
            if (!$editorRows.length)
                return;

            this.$overlay.width($(_.max($editorRows, function (row) { 
                return $(row).width();
            })).width());

            if (this.$overlay.width() < this.$pre.width())
                this.$overlay.width(this.$pre.width());

            this.$overlay.height(this.$code.height() + (2 * this.consts.adjustedTop));
        },

        scrollToCursor: function () {
            if (!this.$cursors.length)
                return;

            var offset    = this.$cursors[0].offset(),
                preHeight = this.$pre.height(),
                preWidth  = this.$pre.width(),
                outOfBounds = (offset.top < 0         || 
                               offset.top > preHeight || 
                               offset.left < 0        ||
                               offset.left > preWidth);

            if (outOfBounds) {
                this.$pre.scrollLeft(offset.left + this.$pre.scrollLeft() - preWidth/3);
                this.$pre.scrollTop(offset.top   + this.$pre.scrollTop()  - preHeight/3);
            }
        },

        /**
         * connects the button to the hidden file input
         */
        selectFile: function () {
            var $file = this.$('.htg-load-file')

            $file.click();
            $file.one('change', this.loadFromFile.bind(this));
        },

        /**
         * sets the constants the htg instance will need
         */
        setConstants: function () {
            var border      = this.$code.css('border-width'),
                paddingTop  = this.$code.css('padding-top'),
                paddingLeft = this.$code.css('padding-left'),
                numberWidth = this.file.lines.length.toString().length,
                adjustment;

            // create namespace
            HTG.consts = this.consts = consts = {};

            // calculate average letter width by averaging appended test letters
            this.$code.append('<span id="htg-test-letters">qwertyuiopasdfghjklzxcvbnm(){}[];</span>'),
            this.consts.fontWidth = $('#htg-test-letters').width()/33;

            // remove test letters
            $('#htg-test-letters').remove();

            // strip px and parse into floats
            adjustment = HTG.stripPx(border)  + 
                         HTG.stripPx(paddingLeft) + 
                         (numberWidth * this.consts.fontWidth);

            // add in adjustment for border and padding
            this.consts.numberWidth  = numberWidth;
            this.consts.adjustedLeft = adjustment;
            this.consts.adjustedTop  = HTG.stripPx(border) + HTG.stripPx(paddingTop);
            this.consts.rowHeight    = (this.$code.height())/(this.file.lines.length);
        },

        /**
         * sets the language for the instance
         * @param {string} language - a string of the language name to fetch from the server
         */
        setLanguage: function (language) {
            var self   = this,
                script = document.createElement('script'),
                head   = document.getElementsByTagName('body')[0];

            script.src = 'assets/js/languages/' + language + '.js';
            head.appendChild(script);

            script.onload = function () {
                self.language = new HTG.Language(HTG.LDEFS[language]);
                self.file.buildWordList(self.language);
            };
        },

        /**
         * sets the listeners and builds the keyboards
         */
        setListeners: function () {
            var self = this;

            // main menu controls
            this.mainControls = new HTG.Keyboard(this, this.$mainControls, {
                keys: [
                    ['fullscreen', 'load...', null, '&#x2328;']
                ],

                handlers: {
                    'fullscreen'   : 'toggleFullScreen',
                    'load...' : 'selectFile',
                    '&#x2328;'    : 'showKeyboard'
                }
            });

            // keyboard
            this.keyboard = new HTG.Keyboard(this, $(this.$keyboard), {
                keys: [
                    ['!', '&', '|', '()', '{}', '[]', "''", '==', '<>'],
                    ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p', '&#x2190;'],
                    ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'space'],
                    ['z', 'x', 'c', 'v', 'b', 'n', 'm', ';',  null, '7', '8', '9'],
                    ['*', '/', '-', '+', '%', ':', ',', '.',  null, '4', '5', '6'],
                    ['~', '@', '#', '$', '^', '\\', '?', null, '0', '1', '2', '3']
                ],

                handlers: {
                    default: 'type'
                }
            });

            // scroll
            this.$pre.on('scroll', function(){
                self.$('.htg-suggestion').css('left', self.$pre.scrollLeft());
            });
        },

        /**
         * shows the keyboard and hides the main controls
         */
        showKeyboard: function () {
            this.$keyboard.show();
            this.$mainControls.hide();
        },

        /**
         * toggles full screen mode
         */
        toggleFullScreen: function () {
            HTG.toggleFullScreen()
        },

        /**
         * generic handler for typing on the keyboard 
         * - calls the controllers insert and backspace methods
         * @param {string} chr - the character (or characters) to type
         * @param {string} dir - the action direction
         */
        type: function (chr, dir) {
            if (chr === 'space') {
                if (dir === 'right')
                    chr = '    ';
                else
                    chr = ' ';
            }
            else if (chr === '&#x2190;') {
                if (dir === 'right')
                    return this.controller.backspace(true);
                else
                    return this.controller.backspace();
            }
            else
                chr = this.typeModifiers[dir](chr);

            
            if (chr !== '==' && chr.length === 2 && dir === 'up')
                this.controller.insert(chr, 1);
            else if (chr === '</>')
                this.controller.insert(chr, 1);
            else
                this.controller.insert(chr);
        },

        /**
         * namespace for modifying typed chars based on action direction
         * @namespace
         */
        typeModifiers: {
            left: function (chr) {
                if (chr.length === 2)
                    return chr[0];

                if (chr === '==')
                    return '=';

                return chr;
            },

            right: function (chr) {
                if (chr === '==')
                    return '===';

                if (chr.length === 2)
                    return chr[1];

                if (chr === ' ')
                    return '    ';

                return chr + chr;
            },

            up: function (chr) {
                if (/\w/.test(chr))
                    return chr.toUpperCase();

                if (chr === '~')
                    return '`';

                return chr;
            },

            down: function (chr) {
                if (chr === '<>')
                    return '</>';

                if (chr === '-')
                    return '_';

                return chr;
            },

            tap: function (chr) {
                return chr;
            }
        }
    });
    
    return HTG;
})();
