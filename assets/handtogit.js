window.htg = (function () {
    var HTG = function () {
        this.languageDefinitions = {};
    };
    
    extend(HTG.prototype, {
        init: function () {
            this.setLanguage('js');
            this.splitPre();
            this.setWordListener();
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
        
        setWordListener: function () {
            var $pre       = $('#editor > pre'),
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

            // listener for clicking on pre
            $('#editor > pre').on('click', 'span.editor-row', function (event) {
                var $span    = $(event.currentTarget),
                    clickY   = event.pageY,
                    clickX   = event.pageX,
                    position = { 
                        top: clickY - (top - $pre.scrollTop()), 
                        left: clickX - (left - $pre.scrollLeft()) 
                    },
                    row = Math.ceil(position.top/lineHeight), // not reliable
                    col = Math.ceil(position.left/fontWidth) - 1;

                highlightWord($span, col);
            });

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
                    html;

                // replace previous highlight with plain text
                if ($wordSelect.length) {
                    $wordSelect.after($wordSelect.text());
                    $wordSelect.remove();
                }

                text = $span.text();
                html = $span.html();

                // find index in text
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

                // find indexes in html
                re = new RegExp('[^<|<\/|-]' + word, 'g');

                while((match = re.exec(html)) != null && htmlIdx < textIdx) {
                    wordIdx = match.index + 1;
                    htmlIdx++;
                }

                html = html.slice(0, wordIdx) + 
                       '<span id="word-select" style="background-color: yellow;">' + 
                       html.slice(wordIdx, wordIdx + word.length) + 
                       '</span>'                                  +
                       html.slice(wordIdx + word.length, html.length);

                $span.html(html);
            }
        },

        splitPre: function () {
            var $pre = $('pre');
            
            $pre.html('<span class="editor-row">' + $pre.text().split('\n').join('</span>\n<span class="editor-row">') + '</span>')
            hljs.highlightBlock($('pre')[0]); // move to wherever you dynamically load code
        }
    });
    
    return new HTG();

    // shallow extend function
    function extend (obj, props) {
        for (var i in props) {
            obj[i] = props[i];
        }
    }

    function stripPx(prop) {
         return parseFloat(prop.slice(0, prop.length -2));
    }
})();

window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    htg.init();
},false);
