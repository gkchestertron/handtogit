window.HTG = (function () {
    var $pre;

    var HTG = function ($parent, language) {
        $pre = $('<pre class="noselect"></pre>');
        $parent.append($pre);
        this.languageDefinitions = {};
        this.setLanguage(language);
        this.setConstants();
        this.setListeners();
        $('#goFS').on('click', toggleFullScreen);
    };
    
    extend(HTG.prototype, {
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

            hljs.highlightBlock($pre[0]); // move to wherever you dynamically load code
        },

        loadFileFromString(fileString) {
            $pre.html(fileString);
            this.state.save();
            this.splitPre();
        },

        setConstants: function () {
            var border     = $pre.css('border-width'),
                padding    = $pre.css('padding'),
                offset     = $pre.offset(),
                fontWidth,
                adjustment;

            // create namespace
            this.const = {};

            // calculate average letter width by averaging appended test letters
            $pre.append('<span id="test-letters">qwertyuiopasdfghjklzxcvbnm</span>'),
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

        setListeners: function () {
            this.setSelectListeners();
            this.setStateListeners();
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
                else {
                    $span.html(self.util.getHighlight(text, html, col));
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
                this.stack.push($pre.text());

                // move pointer
                this.pointer++;
            },


            undo: function () {
                if (this.pointer < 1) return false;
                this.pointer--;
                $pre.html(this.stack[this.pointer]);
                return true;
            },

            stack: []
        }
    });
    
    return HTG;

    // shallow extend function
    function extend (obj, props) {
        for (var i in props) {
            obj[i] = props[i];
        }
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
    window.htg = new HTG($('#editor'), 'js');
},false);


