window.HTG = window.HTG || {};

HTG.Clipboard = function (htg) {
    this.htg = htg;
    this.selections = [];
};

$.extend(HTG.Clipboard.prototype, {
    pop: function () {
        return this.selections.pop();
    },

    push: function (string) {
        this.selections.push(string);
    }
});
