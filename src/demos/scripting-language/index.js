import { CFG, CFGmatcher } from "../../empirler";

//prettier-ignore
window.cfg = new CFG({
    lines: [
        {name: "lines", pattern: ["lines", "line"]},
        {name: "line", pattern: ["line"]},
        {name: "noline", pattern: []},
    ],
    line: [
        {name: "statement", pattern: ["statement", /;?\s*/y]},
    ],
    statement: [
        {name: "assignment", pattern: ["value", /\s*=\s*/y, "value"]},
        {name: "declaration", pattern: [/(const|let|var)\s*/y, "value", /\s*=\s*/y, "value"]},
        {name: "functionCall", pattern: ["value"]},
    ],
    value: [
        {name: "field", pattern: ["value", {regex:/\./y, color:"green"}, "value"]},
        {name: "functionCall", pattern: ["value", {regex:/\s*\(\s*/y, color:"orange"}, "args", {regex:/\s*\)\s*/y, color:"orange"}]},
        {name: "function", pattern: ["value", "block"]},
        {name: "boolean", pattern: [/true|false/y]},
        {name: "string", pattern: [{regex:/"/, color:"yellow"}, {regex:/([^"\\]|\\.)*/, color:"gold"}, {regex:/"/, color:"yellow"}]},
        {name: "number", pattern: [{regex:/\d+/y, color:"purple"}]},             //Just ints for now
        {name: "variable", pattern: [{regex:/\w(?<!\d)\w*/y, color:"blue"}]},
        // {name: "line", pattern: ["line"]}
    ],
    args: [
        {name: "arguments", pattern: ["args", {regex:/\s*,\s*/y, color:"yellow"}, "value"]},
        {name: "argument", pattern: ["value"]},
        {name: "noArgument", pattern: []},
    ],
    block: [
        {name: "block", pattern: [/\s*\{\s*/y, "lines", /\s*\}\s*/y]}
    ]
}, "lines");

// window.matcher = new CFGmatcher(
//     cfg,
//     'test.something(+ testing); plop = "test"; const n = test(test()())'
// );

window.matcher = new CFGmatcher(cfg, "test.something(+ testing);");
