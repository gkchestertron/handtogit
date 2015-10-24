window.HTG = (function () {
    var $pre;

    var HTG = function ($parent) {
        $pre = $('<pre class="noselect">function () {\n    this is some code;\n}</pre>');
        $parent.append($pre);
        this.languageDefinitions = {};
        this.setLanguage('js');
        this.state.save();
        this.splitPre();
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
            this.setWordSelectListener();
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
        setWordSelectListener: function () {
            var self       = this,
                fontSize   = $pre.css('font-size'),
                border     = $pre.css('border-width'),
                padding    = $pre.css('padding'),
                offset     = $pre.offset(),
                fontWidth,
                adjustment, 
                left;

            // calculate average letter width
            $pre.append('<span id="test-letter">qwertyuiopasdfghjklzxcvbnm</span>'),
            fontWidth = $('#test-letter').width()/26;
            $('#test-letter').remove();

            // strip px and parse into floats
            fontSize   = stripPx(fontSize);
            adjustment = stripPx(border) + stripPx(padding);

            // add in adjustment for border and padding
            left = offset.left + adjustment;

            // listener for clicking on pre direct child-spans
            $pre.on('click', 'div.editor-row', function (event) {
                var $span    = $(event.currentTarget),
                    clickX   = event.pageX,
                    position = { 
                        left: clickX - (left - $pre.scrollLeft()) 
                    },
                    col = Math.ceil(position.left/fontWidth) - 1;

                // highlight word
                $span.highlight(col);

                // remove line on second click within 250ms
                $('#word-select').one('click',remove);

                // callback for remove one and off
                function remove(event) {
                    $span.remove();
                    self.state.save();
                    self.renumber();
                }
            });

            $pre.on('click', function (event) {
                if (event.target === event.currentTarget) {
                    $pre.append('<div class="editor-row"> </div>');
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
    window.htg = new HTG($('#editor'));
},false);


