window.HTG = (function () {
    var consts;

    var HTG = function () {
        this.$code = $('#pre code');
        this.$suggestions = $('#suggestions');
        this.state.$code = this.$code;
        this.setUIListeners();
        this.setSelectListeners();
        this.setStateListeners();
    };
    
    extend(HTG.prototype, {
        // TODO refactor this - decompose
        getSelection: function (event) {
            var start        = getTextColumn(event),
                end          = start + 1,
                $row         = $(event.currentTarget),
                lineIndex    = $row.data('line-index'),
                line         = this.file.lines[lineIndex],
                startChar    = line[start],
                re           = /\w|&|\||<|>|#|\$|=|\+|\-|\//,
                startFound,
                endFound,
                text;

            if (this.$row) {
                this.$row.html(htmlConvert(this.file.lines[this.$row.data('line-index')] + '\n', 'html'));
                hljs.highlightBlock(this.$row[0]);
                this.$row.removeClass('hljs');
            }

            if (re.test(startChar)) {
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
            text = addHighlight(line, start, end);
            $row.html(text);
            hljs.highlightBlock($row[0]);
            $row.removeClass('hljs');
            this.$row = $('span[data-line-index="' + lineIndex +'"]');
            this.$selection = $('#selection');
            this.selection = this.$selection.text();
        },

        loadFromFile: function (event) {
            var self   = this,
                reader = new FileReader(),
                file   = event.currentTarget.files[0];

            reader.onload = function (event) {
                $('title').html('htg | '+file.name);
                self.loadFromString(event.target.result);
            }

            reader.readAsText(file);
        },

        loadFromString: function (fileString) {
            var self = this,
                numberWidth,
                text;

            this.file = new HTGFile(fileString);

            numberWidth = this.file.lines.length.toString().length;

            text = _.map(this.file.lines, function (line, idx) {
                var lineNumber = (idx + 1).toString();

                while (lineNumber.length < numberWidth) {
                    lineNumber = ' ' + lineNumber;
                }

                lineNumber = '<span class="line-number noselect">' + lineNumber + '</span> ';

                line = '<span class="editor-row" data-line-index="' + idx + '">' + 
                        htmlConvert(line, 'html') + '\n</span>';

                return lineNumber +  line;
            }).join('');

            this.$code.html(text);

            hljs.highlightBlock(this.$code[0]);
            this.setConstants(numberWidth);
            // this.state.save();
        },

        makeSuggestions: function () {
            var suggestions = '<div class="suggestion">here is a suggestion for '+this.selection+'</div>';

            $('.suggestion').remove();
            this.$row.after(suggestions);
            this.$row.after(suggestions);
        },

        renumber: function () {
            var $rows = $('#editor > pre > div.editor-row'),
                numberWidth = $rows.length.toString().length;
            
            // remove numbers
            $('#editor > pre span.line-number').remove();

            // make new line number spans
            $rows.each(function (i) {
                var lineNumber = (i + 1).toString();

                while (lineNumber.length < numberWidth) {
                    lineNumber = ' ' + lineNumber;
                }
                $(this).prepend('<span class="line-number noselect">' + lineNumber + ' </span>');
            });
        },

        setConstants: function (numberWidth) {
            var border     = this.$code.css('border-width'),
                padding    = this.$code.css('padding'),
                offset     = this.$code.offset(),
                adjustment;

            // create namespace
            this.consts = consts = {};

            // calculate average letter width by averaging appended test letters
            this.$code.append('<span id="test-letters">qwertyuiopasdfghjklzxcvbnm(){}[];</span>'),
            this.consts.fontWidth = $('#test-letters').width()/33;

            // remove test letters
            $('#test-letters').remove();

            // strip px and parse into floats
            adjustment = stripPx(border)  + 
                         stripPx(padding) + 
                         (numberWidth * this.consts.fontWidth);

            // add in adjustment for border and padding
            this.consts.adjustedLeft = offset.left + adjustment;
        },

        setLanguage: function (language) {
            var self   = this,
                script = document.createElement('script'),
                head   = document.getElementsByTagName('body')[0];

            script.src = 'languages/' + language + '.js';
            head.appendChild(script);

            script.onload = function () {
                self.language = new self.LanguageBase(self.languageDefinitions[language]);
            };
        },

        setUIListeners: function () {
            // fullscreen
            $('#goFS').on('click', toggleFullScreen); // fullscreen listener

            // upload file
            $('#load-file').on('change', this.loadFromFile.bind(this)); // load file listener

            // scroll
            $(this.$code).on('scroll', function(){
                $('.suggestion').css('left', $(this).scrollLeft());
            });
        },

        setStateListeners: function () {
            var self = this;

            $('#undo').on('click', function () {
                if (self.state.undo()) {
                    self.splitPre();
                }
            });

            $('#redo').on('click', function () {
                if (self.state.redo()) {
                    self.splitPre();
                }
            });
        },

        setSelectListeners: function () {
            var self = this;

            this.$code.on('click', 'span.editor-row', function (event) {
                self.getSelection(event);
                self.makeSuggestions();
            });
        },
        
        /*
         * finds a word from the mouse click positiontion and highlights it
         * by wrapping it in a styled span tag
         */
        //TODO redo this
        deprecated: function () {
            var self = this;

            // listener for clicking on pre direct child-spans
            this.$code.on('click', 'span.editor-row', function (event) {
                var $span  = $(event.currentTarget),
                    col    = getTextColumn(event),
                    text   = $span.text(),
                    html;

                // remove previous highlight
                self.util.removePreviousHighlight();

                // get html without highlight
                html = $span.html();

                // remove line on second click 
                if (col >= text.length) {
                    $span.one('click', function remove(event) {
                        var col = getTextColumn(event);

                        if (col >= text.length) {
                            $span.remove();
                            self.state.save();
                            self.renumber();
                        }
                    });

                    // remove listener after 2 seconds
                    setTimeout(function () {
                        $span.off();
                    }, 2000);
                }
                // highlight word/char
                else {
                    $span.html(self.util.getHighlight(text, html, col));
                    self.makeSuggestions($span); // make suggestions
                }
            });

            // add new row if click is past last row
            $code.on('click', function (event) {
                if (event.target === event.currentTarget) {
                    $code.find('div.editor-row:last-child').append('\n');
                    $code.append('<div class="editor-row"> </div>');
                    self.state.save();
                    self.renumber();
                }
            });

            
        },

        /*
         * wraps each line in a span tag for easier listening
         */
        splitPre: function () {
            var $rows,
                numberWidth;
            
            $code.html('<div class="editor-row">' + 
                      $code.text().split('\n').join('\n</div><div class="editor-row">') + 
                      '</div>')
            this.renumber();
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

    var HTGFile = function (fileString) {
        this.fileString = replaceAll(fileString, /\t/g, { '\t': '    ' }); // replace tabs
        this.lines      = this.fileString.split(/\n|\r/);

        // remove extraneous newline if it exists
        if (this.lines.slice(-1)[0] === "") 
            this.lines = this.lines.slice(0, -1);
    };
    
    return HTG;

    // add highlight span to string based on indices
    function addHighlight(string, start, end) {
        var startSlice = htmlConvert(string.slice(0, start), 'html'),
            selection  = htmlConvert(string.slice(start, end), 'html'),
            endSlice   = htmlConvert(string.slice(end), 'html');

        return startSlice + '<span id="selection">' + selection + '</span>' + endSlice;
    }

    // shallow extend function
    function extend (obj, props) {
        for (var i in props) {
            obj[i] = props[i];
        }
    }

    function getTextColumn(event) {
        var $child  = $(event.currentTarget),
            $parent = $child.parent(),
            clickX  = event.pageX,
            left    = clickX - (consts.adjustedLeft - $parent.scrollLeft()),
            col     = Math.floor(left/consts.fontWidth) - 1;

        return col;
    }

    // convert to and from html
    function htmlConvert(string, dir) {
        var replacements = {
                '&'     : '&amp;',
                '>'     : '&gt;',
                '<'     : '&lt;',
                '&amp;' : '&',
                '&gt;'  : '>',
                '&lt;'  : '<'
            };

        if (dir === 'html') {
            string = replaceAll(string, /&|<|>/g, replacements);
        }
        else if (dir === 'text') {
            string = replaceAll(string, /&lt;|&gt;/ig, replacements);
            string = replaceAll(string, /&amp;/ig, replacements);
        }
        else {
            console.error('Please provide a valid direction (text, html) for conversion');
        }

        return string;
    }

    //replace all instances with regex and object of replacements
    function replaceAll(string, re, replacements) {
        var replacement, 
            match,
            lastMatchLength = 0,
            lastMatchIndex  = 0,
            result = '';

        while ((match = re.exec(string)) !== null) {
            replacement = typeof(replacements) === 'function' ? replacements(match[0]) : replacements[match[0]];
            result += string.slice(lastMatchIndex + lastMatchLength, match.index) + replacement; 
            lastMatchLength = match[0].length;
            lastMatchIndex  = match.index;
        }

        result += string.slice(lastMatchIndex + lastMatchLength);

        return result;
    }

    // strip off px from css properties
    function stripPx(prop) {
         return parseFloat(prop.slice(0, prop.length -2));
    }

    // full screen fill
    function toggleFullScreen() {
        var doc = window.document;
        var docEl = doc.documentElement;

        var requestFullScreen = docEl.requestFullscreen || docEl.mozRequestFullScreen || docEl.webkitRequestFullScreen || docEl.msRequestFullscreen;
        var cancelFullScreen = doc.exitFullscreen || doc.mozCancelFullScreen || doc.webkitExitFullscreen || doc.msExitFullscreen;

        if(!doc.fullscreenElement && !doc.mozFullScreenElement && !doc.webkitFullscreenElement && !doc.msFullscreenElement) {
            requestFullScreen.call(docEl);
        }
        else {
            cancelFullScreen.call(doc);
        }
    }
})();

window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    window.htg = new HTG();
},false);
