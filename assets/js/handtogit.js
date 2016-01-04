window.HTG = (function () {
    var HTG = function () {
        this.$pre = $('#pre');
        this.$suggestions = $('#suggestions');
        this.state.$pre = this.$pre;
        this.setConstants();
        this.setUIListeners();
        this.setStateListeners();
    };
    
    extend(HTG.prototype, {
        htmlConvert: function (string, dir) {
            return htmlConvert(string, dir);
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

        loadFile: function (event) {
            var self   = this,
                reader = new FileReader(),
                file   = event.currentTarget.files[0];

            reader.onload = function (event) {
                self.loadFileFromString(event.target.result);
            }

            reader.readAsText(file);
        },

        loadFileFromString: function (fileString) {
            var self = this;

            this.file = new HTGFile(fileString);

            this.$pre.html('');
            _.each(this.file.lines, function (line) {
                self.$pre.append('<div class="editor-row">' + htmlConvert(line, 'html') + '</div>');
            });

            this.state.save();
        },

        makeSuggestions: function ($span) {
            $suggestions.find('tbody').append('<tr><td>here is a suggestion</td></tr>');
        },

        setConstants: function () {
            var border     = this.$pre.css('border-width'),
                padding    = this.$pre.css('padding'),
                offset     = this.$pre.offset(),
                fontWidth,
                adjustment;

            // create namespace
            this.const = {};

            // calculate average letter width by averaging appended test letters
            this.$pre.append('<span id="test-letters">qwertyuiopasdfghjklzxcvbnm</span>'),
            this.const.fontWidth = $('#test-letters').width()/26;

            // remove test letters
            $('#test-letters').remove();

            // strip px and parse into floats
            adjustment = stripPx(border) + stripPx(padding);

            // add in adjustment for border and padding
            this.const.adjustedLeft = offset.left + adjustment;
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
            $('#goFS').on('click', toggleFullScreen); // fullscreen listener
            $('#load-file').on('change', this.loadFile.bind(this)); // load file listener
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
        
        /*
         * finds a word from the mouse click positiontion and highlights it
         * by wrapping it in a styled span tag
         */
        //TODO redo this
        setSelectListeners: function () {
            var self = this;

            // listener for clicking on pre direct child-spans
            $pre.on('click', 'div.editor-row', function (event) {
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
            $pre.on('click', function (event) {
                if (event.target === event.currentTarget) {
                    $pre.find('div.editor-row:last-child').append('\n');
                    $pre.append('<div class="editor-row"> </div>');
                    self.state.save();
                    self.renumber();
                }
            });

            function getTextColumn(event) {
                var $child  = $(event.currentTarget),
                    $parent = $child.parent(),
                    clickX  = event.pageX,
                    left    = clickX - (self.const.adjustedLeft - $parent.scrollLeft()),
                    col     = Math.ceil(left/self.const.fontWidth) - 1;

                return col;
            }
        },

        /*
         * wraps each line in a span tag for easier listening
         */
        splitPre: function () {
            var $rows,
                numberWidth;
            
            $pre.html('<div class="editor-row">' + 
                      $pre.text().split('\n').join('\n</div><div class="editor-row">') + 
                      '</div>')
            this.renumber();
        },

        state: {
            pointer: -1,

            redo: function () {
                if (this.pointer > this.stack.length - 2) return false;
                this.pointer++;
                $pre.html(this.stack[this.pointer]);
                return true;
            },

            save: function () {
                // remove forward history
                this.stack = this.stack.slice(0, this.pointer + 1);

                // remove line numbers
                $('#editor > pre span.line-number').remove();

                // save text copy of file
                this.stack.push(this.$pre.text());

                // move pointer
                this.pointer++;
            },


            undo: function () {
                if (this.pointer < 1) return false;
                this.pointer--;
                this.$pre.html(this.stack[this.pointer]);
                return true;
            },

            stack: []
        }
    });

    var HTGFile = function (fileString) {
        this.fileString = fileString;
        this.lines = fileString.split(/\n|\r/);
    };
    
    return HTG;

    // shallow extend function
    function extend (obj, props) {
        for (var i in props) {
            obj[i] = props[i];
        }
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
            replacement = replacements[match[0]];
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
