htg.languageDefinitions.js = {
    builtIn: {
        call: {
            snip: '{0}({1})',
            fills: [['var'], ['param']],
        },
        func: {
            snip: 'function {0}({1}) {\n {2}\n}',
            fills: [['var'], ['param'], null],
            children: ['vars', 'if', 'var', 'func']
        },
        if: {
            snip: 'if ({0}) {\n {1}\n}',
            fills: [['var', 'call']],
            children: ['var', 'call', 'if']
        },
        operator: {
            snip: '{0}',
            fills: [['var', 'func', 'call']],
        },
        param: {
            snip: '{0}',
            fills: null
        },
        var: {
            snip: '{0}',
            fills: null
        }
    },

    snippets: {},

    vars: [],

    docs: []
};
