import { CFG, CFGmatcher } from "../../empirler";

/**
 * In this cfg, the names dont serve any othe purpose than organizing the grammar a bit
 * The pattern determines the syntax it should match, where any string is a variable
 * And the 'build' method is not used by the cfg either
 *
 * We use the build method ourselves at the bottom of the code, when we perform our treewalk
 * The build method provides semantics for the syntax we matched
 * It is a method that builds a function which will result in the boolean expression result
 */

//prettier-ignore
window.cfg = new CFG({
    ors: [
        {
            name: "or", 
            pattern: ["ors", /\s*\|\s*/, "ors"], 
            build: m=>{
                return ()=>m[0]() || m[2]();
            }
        },
        {
            name: "or-descent", 
            pattern: ["ands"], 
            build: m=>m[0]
        },
    ],
    ands: [
        {
            name: "and", 
            pattern: ["ands", /\s*\&\s*/, "ands"],
            build: m=>{
                return ()=>m[0]() && m[2]();
            }
        },
        {
            name: "and-descent", 
            pattern: ["variable"],
            build: m=>m[0]
        },
    ],
    variable: [
        {
            name: "variable", 
            pattern: [/\s*(\w+)\s*/],
            build: m=>{
                const variable = m[0][1];
                return ()=>window[variable];
            }
        },
        {
            name: "not", 
            pattern: [/\s*\!/, "variable"],
            build: m=>{
                return ()=>!m[1]();
            }
        },
        {
            name: "group", 
            pattern: [/\s*\(/, "ors", /\)\s*/],
            build: m=>m[1]
        },
    ]
}, "ors");

// Create a metcher that uses the grammar and give it a string to match
window.matcher = new CFGmatcher(cfg, "! t | ! f & t");

// Execute the steps in order to match the input string
const match = window.matcher.stepAll();

// Check whether we sucessfully matched the input
if (match instanceof Error) {
    // If not, throw the error
    throw match;
} else {
    // Otherwise use the AST created
    match.walkTree(stackItem => {
        // Get the builds of all children (which was created by this method itself, recursively)
        const children = stackItem.match.parts.map(part => {
            // Check if the child is a stackItem, and if so return its build
            if (part.variableMatch) return part.build;
            // Otherwise return the regex match
            else return part.match;
        });

        // Call the build method of the definition with this child argument
        const build = stackItem.definition.build(children);

        // Store the build of the stackItem
        stackItem.build = build;
    });

    // Retrieve the main build
    const executeExpression = match.root.build;

    // Set up some variables, and run the build
    window.t = true;
    window.f = false;
    const result = executeExpression();
    console.log(result);
}
