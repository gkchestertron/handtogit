// shared util functions are saved as class methods
window.HTG = window.HTG || {};

// add highlight span to string based on indices
HTG.addHighlight = function (line, start, end) {
    var startSlice = HTG.htmlConvert(line.slice(0, start), 'html'),
        selection  = HTG.htmlConvert(line.slice(start, end), 'html'),
        endSlice   = HTG.htmlConvert(line.slice(end), 'html');

    return startSlice + '<span class="htg-selection">' + selection + '</span>' + endSlice;
}

// get text column
HTG.getTextColumn = function (event) {
    var $child  = $(event.currentTarget),
    $parent = $child.parent(),
    eventX  = event.pageX || event.originalEvent.touches[0].pageX,
    left    = eventX - (HTG.consts.adjustedLeft - $parent.scrollLeft()),
    col     = Math.floor(left/HTG.consts.fontWidth) - 1;

    return col;
}

HTG.getTextRow = function (event) {
    var eventY    = event.pageY || event.originalEvent.touches[0].pageY,
        rowHeight = HTG.consts.rowHeight,
        rowNumber = Math.floor(($('pre').scrollTop() + eventY - HTG.consts.adjustedTop)/rowHeight),
        $suggestions = $('.htg-suggestion');

    if ($suggestions.length && $suggestions.offset().top < eventY)
        rowNumber -= $suggestions.length;

    return rowNumber;
}

// convert to and from html
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
}

//replace all instances with regex and object of replacements
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
}

// strip off px from css properties
HTG.stripPx = function (prop) {
    return parseFloat(prop.slice(0, prop.length -2));
}

// full screen fill
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
}