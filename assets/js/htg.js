window.HTG = window.HTG || (function () {
    var consts;

    var HTG = function ($element) {
        this.buildTemplate($element);
        this.$ = this.$element.find.bind(this.$element);;
        this.suggestions = [
            { occurance: 3, suggestion: 'some' },
            { occurance: 1, suggestion: 'test' },
            { occurance: 2, suggestion: 'suggestions' },
        ],
        this.setUIListeners();
        this.setStateListeners();
        this.loadFromString(
        "// PhantomJS doesn't support bind yet                                        \n" +
        "Function.prototype.bind = Function.prototype.bind || function (thisp) {\n" +
        "    var fn = this;\n" +
        "    return function () {\n" +
        "        return fn.apply(thisp, arguments);\n" +
        "    };\n" +
        "};\n");
        this.setLanguage('javascript');
        this.selectionController = new HTG.SelectionController(this);
    };
    
    $.extend(HTG.prototype, {
        buildTemplate: function ($element) {
            // setup objects
            this.$element    = $element;
            this.$wrapper    = $('<div class="htg-wrapper"></div>');
            this.$pre        = $('<pre class="noselect htg-pre"></pre>');
            this.$filename   = $('<div class="htg-filename">test-file.js</div>');
            this.$code       = $('<code class="htg-code"></code>');
            this.$overlay    = $('<div class="htg-overlay"></div>');
            this.$controls   = $(
                '<div class="htg-controls">' +
                    '<div class="htg-keyboard"></div>' +
                    '<button class="htg-undo btn btn-default">undo</button>' +
                    '<button class="htg-redo btn btn-default">redo</button>' +
                    '<button class="htg-goFS btn btn-default">fullscreen</button>' +
                    '<div class="btn btn-default htg-btn-file form-group">' +
                        '<input title="Choose File" type="file" class="htg-load-file" name="image-upload" data-toggle="tooltip" data-placement="right" /><i class="fa fa-file-image-o"></i> Choose File...' +
                    '</div>' +
                '</div>');
            this.state.$code = this.$code;

            // append the things
            this.$element.append(this.$wrapper);
            this.$wrapper.append(this.$filename);
            this.$wrapper.append(this.$pre);
            this.$wrapper.append(this.$controls);
            this.$pre.append(this.$code);
            this.$pre.append(this.$overlay);
        },

        redrawSelectedRows: function () {
            var self = this;

            if (this.$rows) {
                _.each(this.$rows, function ($row) {
                    self.redrawRow($row)
                });
            }
        },

        drawKeyboard: function () {
            var self = this, 
                keys = '';

            _.each(_.range(97, 123), function (num) { 
                keys += String.fromCharCode(num);
            });

            self.$('.htg-keyboard').html(keys);
        },

        loadFromFile: function (event) {
            var self   = this,
                reader = new FileReader(),
                file   = event.currentTarget.files[0];

            reader.onload = function (event) {
                self.$filename.html(file.name);
                self.loadFromString(event.target.result);
            }

            reader.readAsText(file);
        },

        loadFromString: function (fileString) {
            var self = this,
                i    = 0,
                numberWidth,
                text;

            this.file = new HTG.File(fileString);

            numberWidth = this.file.lines.length.toString().length;

            text = _.map(this.file.lines, function (line, idx) {
                var lineNumber = (idx + 1).toString();

                while (lineNumber.length < numberWidth) {
                    lineNumber = ' ' + lineNumber;
                }

                lineNumber = '<span class="line-number noselect">' + lineNumber + '</span> ';

                line = '<span class="htg-editor-row" data-line-index="' + idx + '">' + 
                        HTG.htmlConvert(line, 'html') + '</span>';

                return lineNumber +  line;
            }).join('\n');

            this.$code.html(text);
            while (i++ < 30) this.$code.append('\n');

            hljs.highlightBlock(this.$code[0]);
            this.setConstants(numberWidth);
            if (this.language)
                this.file.buildWordList(this.language);
            // this.state.save();
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

        replaceSelection(text) {
            var line = this.selection.line,
                startSlice = line.slice(0, this.selection.start),
                endSlice = line.slice(this.selection.end),
                lineText = startSlice + text + endSlice;

            this.file.lines[this.selection.lineIndex] = lineText;
            this.redrawRow(this.selection.$row);
        },

        removeSuggestions: function () {
            $('.htg-suggestion').remove();
        },

        resizeOverlay: function () {
            this.$overlay.width($(_.max(this.$('.htg-editor-row'), function (row) { 
                return $(row).width(); 
            })).width());
        },

        setConstants: function (numberWidth) {
            var border      = this.$code.css('border-width'),
                paddingTop  = this.$code.css('padding-top'),
                paddingLeft = this.$code.css('padding-left'),
                offset      = this.$code.offset(),
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
            this.consts.adjustedLeft = offset.left + adjustment;
            this.consts.adjustedTop  = offset.top  + HTG.stripPx(border) + HTG.stripPx(paddingTop);
            this.consts.rowHeight = (this.$code.height() + (2 * this.consts.adjustedTop))/(this.file.lines.length + 29)

            // resize overlay
            this.resizeOverlay();
        },

        setLanguage: function (language) {
            var self   = this,
                script = document.createElement('script'),
                head   = document.getElementsByTagName('body')[0];

            script.src = 'languages/' + language + '.js';
            head.appendChild(script);

            script.onload = function () {
                self.language = new self.Language(HTG.LDEFS[language]);
                self.file.buildWordList(self.language);
            };
        },

        setUIListeners: function () {
            var self = this;

            // fullscreen
            $('.htg-goFS').on('click', HTG.toggleFullScreen); // fullscreen listener

            // upload file
            $('.htg-load-file').on('change', this.loadFromFile.bind(this)); // load file listener

            // scroll
            this.$pre.on('scroll', function(){
                self.$('.htg-suggestion').css('left', self.$pre.scrollLeft());
            });
        },

        setStateListeners: function () {
            var self = this;

            this.$('.htg-undo').on('click', function () {
                if (self.state.undo()) {
                    self.splitPre();
                }
            });

            this.$('.htg-redo').on('click', function () {
                if (self.state.redo()) {
                    self.splitPre();
                }
            });
        },

        state: {
            pointer: -1,

            redo: function () {
                if (this.pointer > this.stack.length - 2) return false;
                this.pointer++;
                $code.html(this.stack[this.pointer]);
                return true;
            },

            save: function () {
                // remove forward history
                this.stack = this.stack.slice(0, this.pointer + 1);

                // remove line numbers
                $('#editor > pre span.line-number').remove();

                // save text copy of file
                this.stack.push(this.$code.text());

                // move pointer
                this.pointer++;
            },


            undo: function () {
                if (this.pointer < 1) return false;
                this.pointer--;
                this.$code.html(this.stack[this.pointer]);
                return true;
            },

            stack: []
        }
    });
    
    return HTG;
})();
