HTG.prototype.util = (function () {

    return {
        getHighlight            : getHighlight,
        removePreviousHighlight : removePreviousHighlight
    };

    // encode html entities as regular strings 
    // - can't use built in because I need to convert &, <, > inside html
    function encodeHTMLEntities(string) {
        var re = /&[\w]{2,3};/g;
            
        return string.replace(re, replace);

        function replace(str) {
            var replacements = {
                '&amp;':'&',
                '&lt;': '<',
                '&gt;': '>'
            };

            return replacements[str] || str;
        }
    }

    // escape chars for regex
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

    // get html with with highlight of word or char based on index
    function getHighlight(text, html, letterIdx) {
        var wordIdx = 0,
            testHtml,
            match,
            word;

        text = encodeHTMLEntities(text);
        html = encodeHTMLEntities(html);
        testHtml = stripTags(html, text[letterIdx]);

        if (/\w/.test(text[letterIdx])) {
            findWordIndex();
        }
        else {
            findLetterIndex();
        }

        if (!word) return false;

        return html.slice(0, wordIdx) + 
                   '<span id="word-select">' + 
                   html.slice(wordIdx, wordIdx + word.length) + 
                   '</span>'                                  +
                   html.slice(wordIdx + word.length, html.length);

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
                textCount = 0,
                htmlCount = 0;

            // find word in text from index
            while ((match = re.exec(text)) != null) {
                if (match.index > letterIdx) break;
                word = match[0];
                textCount++;
            }

            // find index of word in html
            // re = new RegExp('\\b(' + word + ')\\b', 'g');
            while((match = re.exec(testHtml)) != null && htmlCount < textCount) {
                wordIdx = match.index;
                htmlCount++;
            }
        }

    }

    // remove previous highlight with plain text
    function removePreviousHighlight() {
        var $wordSelect = $('#word-select');

        if ($wordSelect.length) {
            $wordSelect.after($wordSelect.text());
            $wordSelect.off();
            $wordSelect.remove();
        }
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
