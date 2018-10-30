import AST from "./AST";
const errorRepairVar = Symbol("repairVar");
export default class CFGmatcher {
    constructor(grammar, input) {
        // Store the grammar
        this.grammar = grammar;

        // Enables debug messages
        this.debug = true;

        // Create variables used for the AST construction
        this.index = 0;
        this.stack = [];
        this.cache = {};
        this.furthestFound = { index: -1 };
        this.finished = false;
        this.finishedSuccesfully = false;

        // Put the start variable on the stack
        this.pushStack(this.getChildStackItem(grammar.getStartVariable(), 0));

        // Create an abstract syntax tree to store the result
        this.ast = new AST(input, this.stack[0]);
    }
    step() {
        // Don't step if we already finished
        if (this.finished) return true;

        // Get the top of the stack
        let top = this.stack[this.stack.length - 1];

        if (top.variableMatch.variable == errorRepairVar) {
            if (top.match.parts[0]) {
                const part = top.match.parts.pop();
                if (
                    part.match.range.start < top.best.range.start ||
                    (part.match.range.start == top.best.range.start &&
                        part.match.range.end > top.best.range.end)
                ) {
                    top.best = {
                        stackItem: part,
                        range: part.match.range
                    };
                }
            }
            this.nextAttempt();
            return;
        }

        if (!top.definition) {
            this.popStack(false);
            return;
        }

        // Get the part index
        let partIndex = top.match.parts.length;

        // If this index is 0 (index 1 for inflation attempt) and attempt 0,
        //  this stackItem has just been pushed, see if caching can be used
        //  (caching occures in teh popStack method)
        if (
            partIndex == 0 &&
            top.attempt == 0 &&
            !top.isInflationAttempt &&
            this.index != this.errorIndex
        ) {
            // Check if there is an cached item, and if so, use it
            if (this.checkCache()) {
                //console.log("foundCache");
                return;
            }
        }

        // Check what part should come next
        const part = top.definition.pattern[partIndex];
        if (part) {
            if (part.regex) {
                // If the part is a regular expression, try to match it
                const match = this.expect(part);
                if (match) {
                    // If a match could be found, add it to the parts
                    if (partIndex == 0) {
                        top.match.range.start = match.range.start;
                    }
                    top.match.parts.push(match);
                } else {
                    // Otherwise, this pattern couldn't be matched, move to the next definition
                    this.nextAttempt();
                }
            } else if (part.variable) {
                // If the part is an object, put its variable as a child match on the stack
                this.pushStack(this.getChildStackItem(part, 0)); // The child will automatically be added or go to the nextAttempt, when popped
            }
        } else {
            // If there is no more part to match, finish this match successfully
            this.popStack(true);
        }
    }
    expect(match) {
        // Extract the regex
        let regex;
        if (this.index == this.errorIndex) {
            regex = match.regex;
        } else {
            regex = match.stickyRegex;
        }

        // Make sure the regex only tries the location we are currently at
        regex.lastIndex = this.index;

        // Perform the regex test
        var match = regex.exec(this.ast.input);
        if (match) {
            // Output a message that can be used for debugging, if enabled
            if (this.debug) console.log("Matched", match.index, regex, match);

            // If a match was found, increase the index
            this.index = match.index + match[0].length;

            // Remove the input, as this will otherwise require ~ O(n^2) storage space
            delete match.input;

            // Check if we gotten further than the previous furthest
            if (this.index > this.furthestFound.index) {
                // If so, get the top of the stack
                const top = this.stack[this.stack.length - 1];

                // And set the furthest data
                this.furthestFound = {
                    index: this.index,
                    stackItem: top
                };
            }

            // And return the match information
            return {
                match: match,
                range: {
                    start: this.index - match[0].length,
                    end: this.index
                }
            };
        } else {
            // Output a message that can be used for debugging, if enabled
            if (this.debug) console.log("Tried", this.index, regex);

            //
            // // Check if we are as far in as the furthest match that couldn't be found
            // if(this.index==this.furthestNotFound.index){
            //     // Get the top of the stack
            //     const top = this.stack[this.stack.length-1];
            //
            //     // If so, augment the furthest data
            //     this.furthestNotFound.definitions.push({
            //         definition: top.definition,
            //         partIndex: top.match.parts.length,
            //         expected: regex,
            //     });
            // }
        }

        // Otherwise return nothing
    }

    nextAttempt() {
        // Get the index
        const stackIndex = this.stack.length - 1;

        // Get the top of the stack
        let top = this.stack[stackIndex];

        if (top.variableMatch.variable == errorRepairVar) {
            const nextVar = this.grammar.getVariable(++top.attempt);
            if (nextVar) {
                this.index = this.errorIndex;
                this.pushStack(
                    this.getChildStackItem(
                        {
                            variable: nextVar
                        },
                        0
                    )
                );
            } else {
                this.stack.pop();
                this.index = top.best.range.end;
                let newTop = this.stack[stackIndex - 1];
                if (newTop) {
                    if (!newTop.matchErrors) newTop.matchErrors = [];
                    newTop.matchErrors.push(top.best.stackItem);
                }
            }

            return;
        }

        // Check if this is an inflation attempt, or a normal child match
        if (top.isInflationAttempt) {
            // Reset the index to the end of that match
            this.index = top.inflationTarget.match.range.end;

            this.stack.pop();
            top = this.stack[stackIndex] = this.getInflateStackItem(
                top.inflationTarget,
                top.attempt + 1
            );
        } else {
            // Reset the index to the start of this match
            this.index = top.match.range.start;

            this.stack.pop();
            top = this.stack[stackIndex] = this.getChildStackItem(
                top.variableMatch,
                top.attempt + 1
            );
        }

        // If no next definition could be found, finish this attempt
        if (!top.definition) this.popStack();
    }

    popStack(success) {
        let stackItem;

        // Check whether the stack was popped because the top finished successfully
        if (success) {
            // Pop the stackItem
            stackItem = this.stack.pop();

            // Add the end index to the match of the popped item
            stackItem.match.range.end = this.index;

            // Check if we should attempt to inflate the match
            if (stackItem.tryInflate) {
                // If so, add an inflation attempt to the stack
                this.pushStack(this.getInflateStackItem(stackItem, 0));

                // // Indicate that no inflation is needed in the future
                // stackItem.tryInflate = false;
            } else {
                // Otherwise, get the top of the stack, and add the match as a child
                const top = this.stack[this.stack.length - 1];
                if (top) {
                    if (top.match.parts.length == 0) {
                        top.match.range.start = stackItem.match.range.start;
                    }
                    top.match.parts.push(stackItem);
                }

                // Cache the item for possible future usage
                this.cacheItem(stackItem);
            }
        } else {
            // Pop the stack item
            stackItem = this.stack.pop();

            // Check if the item was an inflation attempt
            if (stackItem.isInflationAttempt) {
                // Get the top of the stack, and add the item we tried to inflate as a part of the match
                // (Even though the inflation failed, we already had a valid match)
                const top = this.stack[this.stack.length - 1];
                if (top) {
                    if (top.match.parts.length == 0) {
                        top.match.range.start =
                            stackItem.inflationTarget.match.range.start;
                    }
                    top.match.parts.push(stackItem.inflationTarget);
                }

                // Cache the item for possible future usage
                this.cacheItem(stackItem.inflationTarget);

                // Set success to true, to indicate that the inflation target was at elast successful
                success = true;

                stackItem = stackItem.inflationTarget;
            } else {
                // Check if there is anything left on the stack
                if (this.stack.length > 0) {
                    // If it wasn't an inflation attempt, then the top's current definition can't be matched
                    // So move to the next definition
                    this.nextAttempt();

                    // Cache the item for possible future usage
                    this.cacheItem(stackItem);
                }
            }
        }

        // Check if we have popped the whole stack (!finished because recursion could finish it successfully, and finish unsuccessfully aftwards)
        if (this.stack.length == 0 && !this.finished) {
            // If we have, we finished the process
            this.finish(!!success, stackItem);
        }
    }
    pushStack(item) {
        //if(!item.definition){
        //    if(item.isInflationAttempt){
        //        this.stack.push(item);
        //        this.popStack(false);
        //    }else
        //        this.nextAttempt();
        //}else{
        //}
        this.stack.push(item);
    }
    finish(success, stackItem) {
        this.finished = true;
        this.finishedSuccesfully =
            success && this.index == this.ast.input.length;
        this.ast.root = stackItem;
        console.log(success, stackItem);
    }

    checkCache() {
        // Get the top of the stack
        let top = this.stack[this.stack.length - 1];

        // Get the cache at the match's start index
        let cacheAtIndex = this.cache[top.match.range.start];
        if (cacheAtIndex && cacheAtIndex[top.variableMatch.variable]) {
            // If this variable has already been cached at this index, replace the top by it
            top = this.stack[this.stack.length - 1] =
                cacheAtIndex[top.variableMatch.variable];

            // Check if the variable matched successfully previously
            if (top.definition) {
                // Indicate that the index should now be at the end of the match
                this.index = top.match.range.end;

                // Pop the stack with success
                this.popStack(true);
            } else {
                // Reset the index to the start of the match
                this.index = top.match.range.start;

                // Pop the stack without success
                this.popStack();
            }

            // Indicate that an cached item was found and used
            return true;
        }
    }
    cacheItem(stackItem) {
        // Create the cache at the index if not present
        let cacheAtIndex = this.cache[stackItem.match.range.start];
        if (!cacheAtIndex)
            cacheAtIndex = this.cache[stackItem.match.range.start] = {};

        // Cache the item for future usage
        cacheAtIndex[stackItem.variableMatch.variable] = stackItem;
    }

    getInflateStackItem(inflationTarget, attempt) {
        // Get the top of the stack
        const top = this.stack[this.stack.length - 1];

        return {
            variableMatch: inflationTarget.variableMatch,
            attempt: attempt,
            definition: this.grammar.getDefinition(
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
            definition: this.grammar.getDefinition(
                variableMatch.variable,
                attempt,
                false
            ),
            tryInflate: tryInflate,
            match: {
                parts: [],
                range: {
                    start: this.index
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

    continue() {
        const stack = this.getStackFromItem(this.furthestFound.stackItem);

        this.stack = stack.concat(
            {
                variableMatch: {
                    variable: errorRepairVar
                },
                attempt: 0,
                match: {
                    range: {
                        start: 0
                    },
                    parts: []
                },
                best: {
                    range: {
                        start: Infinity,
                        end: 0
                    },
                    stackItem: null
                }
            },
            this.getChildStackItem(
                {
                    variable: this.grammar.getVariable(0)
                },
                0
            )
        );
        this.errorIndex = this.index;
        this.finished = false;
    }

    /*
    getNextMatches(stack){
        console.log(stack);
        const top = stack[stack.length-1];
        const lastPart = top.match.parts[top.match.parts.length-1];
        const index = (lastPart.range || lastPart.match.range).end;
        this.index = index;
        console.log(index);

        const variables = {};
        const matchers = [];
        for(let i=stack.length-1; i>=0; i--){
            const stackItem = stack[i];
            const add = i<stack.length-1?1:0;
            const nextPart = stackItem.definition.pattern[stackItem.match.parts.length+add];
            const currentPart = stackItem.definition.pattern[stackItem.match.parts.length-1+add];

            const parts = [{
                part: nextPart,
            }, {
                part: currentPart,
                childInflation: true,
            }, {
                part: stackItem.variableMatch,
                selfInflation: true,
            }];
            parts.forEach(partData=>{
                const part = partData.part;
                if(part){
                    if(part.variable){
                        const id = part.variable+(partData.childInflation?".childInflation":partData.selfInflation?".selfInflation":"");
                        if(variables[id]) return;
                        variables[id] = true;

                        const variablesQueue = [{
                            extraStack: [],
                            variable: part.variable,
                            childInflation: partData.childInflation,
                            selfInflation: partData.selfInflation,
                        }];
                        while(variablesQueue.length>0){
                            const variableItem = variablesQueue.shift();
                            const inflation = variableItem.selfInflation||variableItem.childInflation;
                            const variable = variableItem.variable;

                            for(let i=0; i<10000; i++){
                                const def = this.grammar.getDefinition(variable, i, inflation);
                                if(!def) break;

                                const firstPart = def.pattern[inflation?1:0];
                                if(firstPart && firstPart.variable){
                                    if(!variables[firstPart.variable]){
                                        variables[firstPart.variable] = true;
                                        variablesQueue.push({
                                            extraStack: variableItem.extraStack.concat({
                                                variable: variable,
                                                childInflated: !!variableItem.childInflation,
                                                selfInflated: !!variableItem.selfInflation,
                                                attempt: i,
                                            }),
                                            variable: firstPart.variable,
                                        });
                                    }
                                } else if(firstPart){
                                    matchers.push({
                                        stackItem: stackItem,
                                        part: firstPart,
                                        extraStack: variableItem.extraStack.concat({
                                            variable: variable,
                                            childInflated: !!variableItem.childInflation,
                                            selfInflated: !!variableItem.selfInflation,
                                            attempt: i,
                                        }),
                                    });
                                }
                            }
                        }
                    }else{
                        matchers.unshift({
                            stackItem: stackItem,
                            part: part,
                        });
                    }
                }
            })
        }

        console.log(matchers);
        let closest = {
            index: Infinity,
            matcher: null,
            match: null
        };
        matchers.forEach(matcher=>{
            const regex = matcher.part.regex;
            regex.lastIndex = index;
            const match = regex.exec(this.ast.input);
            if(match){
                if(match.index<closest.index && match[0].length>0){
                    closest = {
                        index: match.index,
                        matcher: matcher,
                        match: match
                    }
                }
            }
        });

        console.log(closest);
        if(closest.matcher){

            const matcher = closest.matcher;

            const stackTop = stack[stack.length-1];
            let n = stackTop;
            while(n!=matcher.stackItem){
                for(var i=n.match.parts.length; i<n.definition.pattern.length; i++){
                    n.match.parts.push(null);
                }
                parent = n.parent && n.parent.stackItem;
                if(parent){
                    if(n.isInflationAttempt){
                        if(n.match.parts.length>1)
                            parent.match.parts.push(n);
                        else
                            parent.match.parts.push(n.inflationTarget);
                    }else{
                        parent.match.parts.push(n);
                    }
                }
                n = parent;
            }


            this.index = closest.match.index;
            this.stack = this.getStackFromItem(matcher.stackItem);
            if(matcher.extraStack){
                matcher.extraStack.forEach(item=>{
                    if(item.childInflated){
                        const top = this.stack[this.stack.length-1];
                        const p = top.match.parts.pop();
                        this.stack.push(this.getInflateStackItem(p, item.attempt));
                    }else if(item.selfInflated){
                        const top = this.stack.pop();
                        this.stack.push(this.getInflateStackItem(top, item.attempt));
                    }else{
                        this.stack.push(this.getChildStackItem({variable:item.variable}, item.attempt));
                    }
                });
            }
            const top = this.stack[this.stack.length-1];

            top.match.parts.push({
                match: closest.match,
                range: {
                    start: closest.match.index,
                    end: closest.match.index+closest.match[0].length
                }
            });
            this.index = closest.match.index+closest.match[0].length;
            this.finished = false;
            this.finishedSuccesfully = false;
        }
        console.log(this.stack);

        return closest;
    } */

    /*
    // nextAttempt(){
    //     // Get the top of the stack
    //     const top = this.stack[this.stack.length-1];
    //
    //     // Save the data in the failed attempts
    //     if(top.definition)
    //         top.attempts.push({
    //             definition: top.definition,
    //             parts: top.match.parts
    //         });
    //
    //     // Check if this is an inflation attempt, or a normal child match
    //     if(top.isInflationAttempt){
    //         // If it is an inflation attempt, get the next left recursive definition
    //         top.definition = this.grammar.getDefinition(top.variableMatch.variable, top.nextAttempt, true);
    //
    //         // Reset the parts to only the match we are trying to inflate
    //         top.match.parts = [top.inflationTarget.match];
    //
    //         // Reset the index to the end of that match
    //         this.index = top.inflationTarget.match.range.end;
    //     }else{
    //         // If it is not an inflation attempt, get the next normal definition
    //         top.definition = this.grammar.getDefinition(top.variableMatch.variable, top.nextAttempt, false);
    //
    //         // Reset the parts to an empty array
    //         top.match.parts = [];
    //
    //         // Reset the index to the start of this match
    //         this.index = top.match.range.start;
    //     }
    //
    //     // Increase the definition index for the next attempt
    //     top.nextAttempt++;
    //
    //     // If no next definition could be found, finish this attempt
    //     if(!top.definition) this.popStack();
    // }

    // getBaseStackItem(variableMatch, start, tryInflate){
    //     // Get the top of the stack
    //     const top = this.stack[this.stack.length-1];
    //
    //     // Create the stack item
    //     const stackItem = {
    //         variableMatch: variableMatch,   // The variable that needs to be created
    //         nextAttempt: 0,                 // The index of the next definition to try
    //         attempts: [],                   // A list of the failed attempts
    //         tryInflate: tryInflate,         // Indicate whether this can be inflated after matching
    //         match: {                        // Create an empty match, parts will be created by nextAttempt
    //             range: {
    //                 start: start            // Get the start index from the match we are inflating
    //             }
    //         },
    //     };
    //
    //     // Create a reference to the parent
    //     if(top)
    //         stackItem.parent = {
    //             stackItem: top,                         // The stack item to store itself
    //             attempt: top.nextAttempt-1,             // The attempt we are at while creating this variable
    //             patternIndex: top.match.parts.length,   // What index in the pattern we were matching
    //         }
    //
    //     // Return the newly created stack item
    //     return stackItem;
    // }
    // pushStackInflation(inflateStackItem){
    //     // Get a base stack item
    //     const stackItem = this.getBaseStackItem(inflateStackItem.variableMatch, inflateStackItem.match.range.start, true);
    //
    //     // Augment the stack item
    //     stackItem.isInflationAttempt = true;                // Indicate this is an inflation attempt
    //     stackItem.inflationTarget = inflateStackItem;       // Store the stack item we are inflating
    //
    //     // Add the item to the stack
    //     this.stack.push(stackItem);
    //
    //     // Initialise the first attempt of the item
    //     this.nextAttempt();
    //
    //     // Return the created stack item
    //     return stackItem;
    // }
    // pushStackChild(variableMatch){
    //     // Get the top of the stack
    //     const top = this.stack[this.stack.length-1];
    //
    //     // Determine whether this item should try to inflate (in order for left recursion,
    //     //  the child of an inflation attempt shouldn't inflate if it is the same variable)
    //     const tryInflate = top && top.variableMatch.variable==variableMatch.variable && top.isInflationAttempt ? false: true;
    //
    //     // Get a base stack item
    //     const stackItem = this.getBaseStackItem(variableMatch, this.index, tryInflate);
    //
    //     // Add the item to the stack
    //     this.stack.push(stackItem);
    //
    //     // Initialise the first attempt of the item
    //     this.nextAttempt();
    //
    //     // Return the created stack item
    //     return stackItem;
    // }
    */

    getErrorMessage() {}

    stepAll() {
        let i = 10000;
        do {
            this.step();
        } while (this.stack.length > 0 && i-- > 0);
        return this.ast;
    }
}
