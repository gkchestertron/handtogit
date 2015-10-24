(function () {
    /* jquery plugins */

    // helper for finding the word in a span from a mouse-coordinated-derived index
    $.fn.highlight = function (letterIdx) {
        var wordIdx = 0,
            word,
            match,
            text,
            html,
            testHtml;

        replacePreviousHighlight();

        // get text, html, and tag-stripped html as strings
        text = this.text();
        html = this.html();
        testHtml = stripTags(html, text[letterIdx]);

        if (/\w/.test(text[letterIdx])) {
            findWordIndex();
        }
        else {
            findLetterIndex();
        }

        if (!word) return false;

        drawHighlight(html, word, wordIdx, this);

        // return true to indicate successful highlight
        return true;

        function drawHighlight(html, word, wordIdx, $el) {
            // wrap word in #word-select span
            html = html.slice(0, wordIdx) + 
                   '<span id="word-select">' + 
                   html.slice(wordIdx, wordIdx + word.length) + 
                   '</span>'                                  +
                   html.slice(wordIdx + word.length, html.length);
            $el.html(html);
        }

        function findLetterIndex() {
            var letter = text[letterIdx],
                escapedLetter = escapeForRegExp(letter),
                re = new RegExp(escapedLetter, 'g'),
                textCount = -1,
                htmlCount = -1,
                htmlIdx,
                match;

            word = letter;

            while ((match = re.exec(text)) && match.index < letterIdx) {
                textCount++;
            } 

            while ((match = re.exec(testHtml)) != null && htmlCount <= textCount) {
                htmlCount++;
                wordIdx = match.index;
            }
        }

        function findWordIndex() {
            var re = /\w+/g,
                textCount = -1,
                htmlCount = -1;

            // find word in text from index
            while ((match = re.exec(text)) != null) {
                if (match.index > letterIdx) break;
                word = match[0];
                textCount++;
            }

            // find index of word in html
            re = new RegExp('\\b(' + word + ')\\b', 'g');
            while((match = re.exec(testHtml)) != null && htmlCount < textCount) {
                wordIdx = match.index;
                htmlCount++;
            }
        }

        // replace previous highlight with plain text
        function replacePreviousHighlight() {
            var $wordSelect = $('#word-select');

            if ($wordSelect.length) {
                $wordSelect.after($wordSelect.text());
                $wordSelect.off();
                $wordSelect.remove();
            }
        }
    }

    function escapeForRegExp(str) {
        var specials = [
            // order matters for these
            "-", "[", "]",
            // order doesn't matter for any of these
            "/", "{", "}", "(", ")", "*", "+", "?", ".", "\\", "^", "$", "|"
        ],
        regex = RegExp('[' + specials.join('\\') + ']', 'g');

        return str.replace(regex, "\\$&");
    }

    // replace html tags with same-length strings
    function stripTags(html, letter) {
        var re = /(<[^>]*>)/g,
            result = '',
            lastIdx = 0,
            blank,
            match,
            space = ' ';

        if (letter === ' ') space = '%';
            
        // build string with tags replaced with blanks
        while((match = re.exec(html)) != null) {
            // add previous chunk
            result += html.slice(lastIdx, match.index);

            // generate blanks
            blank = '';
            while (blank.length < match[0].length) blank += space;

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
