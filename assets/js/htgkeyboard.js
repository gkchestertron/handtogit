HTG = window.HTG || {};

/**
 * creates the keyboard class
 * @class
 * @param {object} context  - the context for the handlers
 * @param {object} $element - the element to attach the keyboard to
 * @param (object} options  - the keys and handlers for building the keyboard
 */
HTG.Keyboard = function (context, $element, options) {
    this.context  = context;
    this.$element = $element;
    this.$element.addClass('htg-keyboard');
    this.$element.addClass('htg-noselect');
    this.buildKeys(options.keys, options.handlers);
};

$.extend(HTG.Keyboard.prototype, {
    /**
     * builds the keyboard from the keys and handlers
     * @param {array}  keyRows  - an array of arrays of strings representing keys
     * @param {object} handlers - a mapping of keys to callback names (with an optional default)
     */
    buildKeys: function (keyRows, handlers) {
        var self = this,
            keyIdx  = 0;

        this.$element.html('');

        _.each(keyRows, function (row, rowIdx) {
            var row$el = $('<div class="htg-keyboard" data-keyboard-row-idx="'+rowIdx+'"></div>');

            self.$element.append(row$el);

            _.each(row, function (key) {
                var selector = 'span[data-key-idx="'+keyIdx+'"]',
                    handler  = handlers[key] || handlers.default,
                    $key     = key === null ? $('<span> </span>') : $('<span class="htg-key" data-handler="'+
                                 handler+'" data-key-idx="'+keyIdx+'">'+key+
                               '</span>');

                if (/^\w$/.test(key))
                    $key.addClass('htg-alpha-key');

                row$el.append($key);
                self.setHandler(selector, key, handler);
                keyIdx++;
            });
        });

        // adds the touchend event to the main element instead of individual keys 
        // so that the direction can be determined
        this.$element.on('touchend', function (event) {
            var endX = HTG.getPageX(event),
                endY = HTG.getPageY(event),
                x    = endX - self.startX,
                y    = endY - self.startY,
                dir  = self.getDirection(x, y);

            self.context[self.currentHandler].call(self.context, self.currentKey, dir);
        });
    },

    /**
     * gets the direction of an action based on x and y diffs
     * @param  {int} x  - the horizontal diff
     * @param  {int} y  - the horizontal diff
     * @return {string} - a string representing the action direction
     */
    getDirection: function (x, y) {
        var dirs = {
                right : x,
                left  : -1 * x,
                down  : y,
                up    : -1 * y
            },
            current,
            max,
            maxDir;

        if (Math.abs(x) < 15 && Math.abs(y) < 15)
            return 'tap';

        for (var dir in dirs) {
            current = dirs[dir];
            if (max === undefined || current > max) {
                max = current;
                maxDir = dir;
            }
        }

        return maxDir;
    },

    /**
     * sets a handler for an individual key
     * @param {string} selector - the selector to delegate the event listener to
     * @param {string} key      - a string representing the key and its value
     * @param {string} handler  - a string representing the handler to call within the keyboard's given context
     */
    setHandler: function (selector, key, handler) {
        var self = this;

        this.$element.on('touchstart', selector, function (event) {
            self.startX = HTG.getPageX(event);
            self.startY = HTG.getPageY(event);
            self.currentHandler = handler;
            self.currentKey     = key;
        });
    }
});
