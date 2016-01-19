window.HTG = window.HTG || {};

HTG.Clipboard = function (htg) {
    this.htg = htg;
    this.selections = [];
};

$.extend(HTG.Clipboard.prototype, {
    last: function () {
        return this.selections.slice(-1)[0];
    },

    pop: function () {
        return this.selections.pop();
    },

    push: function (selection) {
        this.selections.push(selection);
    }
});
