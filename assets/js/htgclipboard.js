window.HTG = window.HTG || {};

/**
 * creates a clipboard class
 * @class
 */
HTG.Clipboard = function (htg) {
    this.htg = htg;
    this.selections = [];
};

$.extend(HTG.Clipboard.prototype, {
    /**
     * returns last thing in clipboard
     * @return {Range[]}
     */
    last: function () {
        return this.selections.slice(-1)[0];
    },

    /**
     * pops off last item in clipboard
     * @return {Range[]|undefined}
     */
    pop: function () {
        return this.selections.pop();
    },

    /**
     * adds a selection to the clipboard
     * @param {Range[]} selection - collection of ranges with string properties
     */
    push: function (selection) {
        this.selections.push(selection);
        if (this.selections.length > 15)
            this.selections.shift();
    }
});
