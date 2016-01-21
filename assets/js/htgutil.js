// shared util functions are saved as class methods
window.HTG = window.HTG || {};

/**
 * adds highlights to a line of text
 * @param  {string}  line - the line to highlight
 * @param  {Range[]} highlights - an array of ranges to highlight
 * @return {string}
 */
HTG.addHighlight = function (line, highlights) {
    var result = '',
        startIndex = 0;

    _.each(highlights, function (highlight) {
        var start = highlight.startCol || 0,
            end   = highlight.endCol ? highlight.endCol + 1 : line.length,
            startSlice = HTG.htmlConvert(line.slice(startIndex, start), 'html'),
            selection  = HTG.htmlConvert(line.slice(start, end), 'html');

        result += (startSlice + '<span class="htg-selection">' + selection + '</span>');
        startIndex = end;
    });

    result += HTG.htmlConvert(line.slice(startIndex), 'html');

    return result;
};

/**
 * benchmark any given function inline
 * @param {string}   msg     - message to log with run time
 * @param {object}   context - context in which to call the function
 * @param {function} func    - the function to call
 * @param {array}    args    - arguments to pass to the function
 */
HTG.benchmark = function (msg, context, func, args) {
    var startTime = window.performance.now();
    var result = func.apply(context, args);
    console.log(msg, window.performance.now() - startTime);
    return result;
}

/**
 * returns an x or y coordinate of an event on the page
 * @param {Event}  event - the user triggered event
 * @param {string} coord - the coordinate you want - pageX or pageY
 * @return {int}
 */
HTG.getPageCoord = function (event, coord) {
    return event[coord] || 
           (event.originalEvent && 
           event.originalEvent[coord]) || 
   
           (event.originalEvent &&
           event.originalEvent.touches && 
           event.originalEvent.touches[0] && 
           event.originalEvent.touches[0][coord]) ||
   
           (event.originalEvent &&
           event.originalEvent.changedTouches && 
           event.originalEvent.changedTouches[0] && 
           event.originalEvent.changedTouches[0][coord]);
}

/**
 * returns the pageX value of an event
 * @param  {Event}  event - the user triggered event
 * @return {int}
 */
HTG.getPageX = function (event) {
    return HTG.getPageCoord(event, 'pageX');
}

/**
 * returns the pageY value of an event
 * @param  {Event}  event - the user triggered event
 * @return {int}
 */
HTG.getPageY = function (event) {
    return HTG.getPageCoord(event, 'pageY');
}

/**
 * converts a string into html matching the text by replacing ampersands
 * @param {string} string - the string to converts
 * @param {string} dif    - the direction of the conversion (html, text)
 * @return {string}
 */
HTG.htmlConvert = function (string, dir) {
    var replacements = {
        '&'     : '&amp;',
        '>'     : '&gt;',
        '<'     : '&lt;',
        '&amp;' : '&',
        '&gt;'  : '>',
        '&lt;'  : '<'
    };

    if (dir === 'html') {
        string = HTG.replaceAll(string, /&|<|>/g, replacements);
    }
    else if (dir === 'text') {
        string = HTG.replaceAll(string, /&lt;|&gt;/ig, replacements);
        string = HTG.replaceAll(string, /&amp;/ig, replacements);
    }
    else {
        console.error('Please provide a valid direction (text, html) for conversion');
    }

    return string;
};

/**
 * returns a string with all matches of a regex replaced with a given set of replacements
 * @param  {string} string       - the string to manipulate
 * @param  {RegExp} re           - the regex to match with
 * @param  {object} replacements - replacement mapping
 * @return {string}
 */
HTG.replaceAll = function (string, re, replacements) {
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
};

/**
 * strips px off the end of css props
 * @param {string} prop - the prop to strip
 * @return {string}
 */
HTG.stripPx = function (prop) {
    return parseFloat(prop.slice(0, prop.length -2));
};

/**
 * toggles full screen mode on devices with the api available
 */
//TODO make this move the htg instance take up the whole screen if it does not already - prob move to htg.js
HTG.toggleFullScreen = function () {
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
};
