HTG = window.HTG || {};

HTG.Keyboard = function (context, options) {
    this.context  = context;
    this.handler  = options.handler;
    this.$element = options.$element;

    this.$element.addClass('htg-keyboard');
    this.$element.addClass('htg-noselect');
    this.buildKeys(options.keys);
    if (options.otherHandlers) 
        this.setHandlers(options.otherHandlers);
};

$.extend(HTG.Keyboard.prototype, {
    buildKeys: function (keyHandlers) {
        var self = this,
            idx  = 0;

        _.each(keyHandlers, function (handler, key) {
            var listener = 'click span[data-key-idx="'+idx+'"]';

            if (typeof(handler) === 'string') {
                key     = handler;
                handler = self.handler;
            }

            self.$element.append('<span class="htg-key" data-key-idx="'+idx+'">'+key+'</span>');
            self.setHandler(listener, handler.bind(self.context));
            idx++;
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
