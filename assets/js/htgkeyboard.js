HTG = window.HTG || {};

HTG.Keyboard = function (context, $element, keyHandlers) {
    this.context  = context;
    this.$element = $element;

    this.$element.addClass('htg-keyboard');
    this.$element.addClass('htg-noselect');
    this.buildKeys(keyHandlers);
};

$.extend(HTG.Keyboard.prototype, {
    buildKeys: function (keyHandlers) {
        var self = this,
            idx  = 0;

        _.each(keyHandlers, function (keys, handler) {
            if (typeof(keys) === 'string') {
                keys = [keys];
            }

            _.each(keys, function (key) {
                var listener = 'click span[data-key-idx="'+idx+'"]';
                    $key     = $('<span class="htg-key" data-handler="'+handler+'" data-key-idx="'+idx+'">'+key+'</span>');

                self.$element.append($key);
                self.setHandler(listener, self.context[handler].bind(self.context));
                idx++;
            });
        });
    },

    setHandler: function (listener, handler) {
        var split    = listener.split(' '),
            event    = split[0],
            elements = split.slice(1).join('');

        this.$element.on(event, elements, handler.bind(this.context));
    },

    setHandlers: function (handlers) {
        var self = this;

        _.each(handlers, function (handler, listener) {
            self.setHandler(listener, handler);
        });
    }
});
