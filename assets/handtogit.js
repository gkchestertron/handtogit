window.htg = (function () {
    var HTG = function () {
        this.languageDefinitions = {};
    };
    
    extend(HTG.prototype, {
        init: function () {
            this.setLanguage('js');
            this.state.save();
            this.splitPre();
            this.setListeners();
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

            hljs.highlightBlock($('pre')[0]); // move to wherever you dynamically load code
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
                $pre       = $('#editor > pre'),
                fontSize   = $pre.css('font-size'),
                lineHeight = $pre.css('line-height'), // not accurate
                border     = $pre.css('border-width'),
                padding    = $pre.css('padding'),
                offset     = $pre.offset(),
                fontWidth,
                adjustment, 
                top, 
                left;

            // calculate average letter width
            $pre.append('<span id="test-letter">qwertyuiopasdfghjklzxcvbnm</span>'),
            fontWidth = $('#test-letter').width()/26;
            $('#test-letter').remove();

            // strip px and parse into floats
            fontSize   = stripPx(fontSize);
            lineHeight = stripPx(lineHeight);
            adjustment = stripPx(border) + stripPx(padding);

            // add in adjustment for border and padding
            top  = offset.top  + adjustment;
            left = offset.left + adjustment;

            // listener for clicking on pre direct child-spans
            $('#editor > pre').on('click', 'div.editor-row', function (event) {
                var $span    = $(event.currentTarget),
                    clickY   = event.pageY,
                    clickX   = event.pageX,
                    position = { 
                        top: clickY - (top - $pre.scrollTop()), 
                        left: clickX - (left - $pre.scrollLeft()) 
                    },
                    row = Math.ceil(position.top/lineHeight), // not reliable
                    col = Math.ceil(position.left/fontWidth) - 1;

                // highlight word
                highlightWord($span, col);

                // remove line on second click within 250ms
                $span.one('click',remove);
                setTimeout(function () { $span.off('click', remove); }, 250);

                // callback for remove one and off
                function remove(event) {
                    $span.remove();
                    self.state.save();
                    self.renumber();
                }
            });
        },

        /*
         * wraps each line in a span tag for easier listening
         */
        splitPre: function () {
            var $pre = $('pre'),
                $rows,
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
                $('#editor > pre').html(this.stack[this.pointer]);
                return true;
            },

            save: function () {
                // remove forward history
                this.stack = this.stack.slice(0, this.pointer + 1);

                // remove line numbers
                $('#editor > pre span.line-number').remove();

                // save text copy of file
                this.stack.push($('#editor > pre').text());

                // move pointer
                this.pointer++;
            },


            undo: function () {
                if (this.pointer < 1) return false;
                this.pointer--;
                $('#editor > pre').html(this.stack[this.pointer]);
                return true;
            },

            stack: []
        }
    });
    
    return new HTG();

    // shallow extend function
    function extend (obj, props) {
        for (var i in props) {
            obj[i] = props[i];
        }
    }

    // helper for finding the word in a span from a mouse-coordinated-derived index
    function highlightWord($span, letterIdx) {
        var re = /\w+/g,
            wordIdx = 0,
            $wordSelect = $('#word-select'),
            wordIdxes = [],
            wordIdx,
            words = {},
            word,
            match,
            textIdx = -1,
            htmlIdx = -1,
            text,
            html,
            testHtml;

        // replace previous highlight with plain text
        if ($wordSelect.length) {
            $wordSelect.after($wordSelect.text());
            $wordSelect.remove();
        }

        // get text and html as strings
        text = $span.text();
        html = $span.html();
        testHtml = stripTags(html); // replace non-text with spaces

        // find word in text from index
        while ((match = re.exec(text)) != null) {
            if (match.index > letterIdx) break;
            word = match[0];
            if (words[word] === undefined) {
                words[word] = 0;
            }
            else {
                words[word]++;
            }
        }
        textIdx = words[word];

        // find index of word in html
        re = new RegExp('\\b(' + word + ')\\b', 'g');
        while((match = re.exec(testHtml)) != null && htmlIdx < textIdx) {
            wordIdx = match.index;
            htmlIdx++;
        }

        // return false if user clicked on a space
        if (!word) return false;

        // wrap word in #word-select span
        html = html.slice(0, wordIdx) + 
               '<span id="word-select">' + 
               html.slice(wordIdx, wordIdx + word.length) + 
               '</span>'                                  +
               html.slice(wordIdx + word.length, html.length);
        $span.html(html);

        // return true to indicate successful highlight
        return true;
    }

    // strip off px from css properties
    function stripPx(prop) {
         return parseFloat(prop.slice(0, prop.length -2));
    }

    // replace html tags with same-length strings
    function stripTags(html) {
        var re = /(<[^>]*>)/g,
            result = '',
            lastIdx = 0,
            blank,
            match;
            
        // build string with tags replaced with blanks
        while((match = re.exec(html)) != null) {
            // add previous chunk
            result += html.slice(lastIdx, match.index);

            // generate blanks
            blank = '';
            while (blank.length < match[0].length) blank += ' ';

            // add blank string
            result += blank;

            // save the starting index for the next chunk
            lastIdx = match.index + match[0].length;
        }
        // add the last chunk
        result += html.slice(lastIdx);

        return result;
    }
})();

window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    htg.init();
},false);
