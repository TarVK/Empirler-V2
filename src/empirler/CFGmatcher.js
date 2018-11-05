const errorRepairVar = Symbol("repairVar");
export default class CFGmatcher {
    constructor(ast, variable, expected) {
        this.ast = ast;
        this.expected = expected;

        this.stack = [this.getChildStackItem(variable)];
    }

    getInflateStackItem(inflationTarget, previous) {
        // Get the attempt
        const attempt = previous?previous.attempt+1:0;

        // Get the best attempt
        let best = 

        // Get the top of the stack
        const top = this.stack[this.stack.length - 1];

        return {
            variableMatch: inflationTarget.variableMatch,
            attempt: attempt,
            definition: this.ast.grammar.getDefinition(
                inflationTarget.variableMatch.variable,
                attempt,
                true
            ),
            tryInflate: true,
            match: {
                parts: [inflationTarget],
                range: {
                    start: inflationTarget.match.range.start
                }
            },
            parent: top && {
                stackItem: top,
                patternIndex: top.match.parts.length
            },
            isInflationAttempt: true,
            inflationTarget: inflationTarget
        };
    }
    getChildStackItem(variableMatch, attempt) {
        // Get the top of the stack
        const top = this.stack[this.stack.length - 1];

        // Determine whether this item should try to inflate (in order for left recursion,
        //  the child of an inflation attempt shouldn't inflate if it is the same variable)
        const tryInflate =
            top &&
            top.variableMatch.variable == variableMatch.variable &&
            top.isInflationAttempt
                ? false
                : true;

        return {
            variableMatch: variableMatch,
            attempt: attempt,
            definition: this.ast.grammar.getDefinition(
                variableMatch.variable,
                attempt,
                false
            ),
            tryInflate: tryInflate,
            match: {
                parts: [],
                range: {
                    start: this.ast.index
                }
            },
            parent: top && {
                stackItem: top,
                patternIndex: top.match.parts.length
            }
        };
    }

    getStackFromItem(stackItem) {
        const stack = [];

        do {
            stack.unshift(stackItem);
            const parent = stackItem.parent;
            if (parent) {
                stackItem = parent.stackItem;

                stackItem.match.parts = stackItem.match.parts.splice(
                    0,
                    parent.patternIndex
                );
            } else {
                break;
            }
        } while (true);

        return stack;
    }

    stepAll() {
        let i = 10000;
        do {
            this.step();
        } while (this.stack.length > 0 && i-- > 0);
        return this.ast;
    }
}
