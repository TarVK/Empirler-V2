# Empirler-V2
This will be an improved version of [Empirler v1](https://github.com/TarVK/Empirler)

This systems is intended to allow people to easily create a custom language. Empirler v1 focused on markup languages, but this second version is also intended to work for full programming languages. Empirler allows you to define syntax together with the semantics in a single place. These semantics will be useable for transpilation, interpretation or compilation. 

Empirler v1 could only be used for transpilation, but this second version will be more genaralized, and will not do anything with the semantics on its own. Instead I will create extra plugins that either take care of a specific task like transpilation, or help you take care of this.

Empirler v2 will basically be a [CFG](https://en.wikipedia.org/wiki/Context-free_grammar) matcher. The grammars that it can match only have a single restriction, where they may not be indirectly left recursive. 
I intend to make a editor similar to [ace](https://ace.c9.io/) in the future, but this will be far down the line. This would allow you to easily add syntax highlighting to your rules, by adding some semantics. Similarly you would be able to define intelisense right within your grammar. 

## Current state
Above I have described what Empirler v2 should become, but we are nowhere close to that yet.
I have currently implemented a basic CFG matcher that appears to be efficient enough for most purposes. The next step that I have been working on is to handle small syntax errors. When there is a small syntax error in the text you are trying to match using your CFG, you basically won't be able to get a proper match. Yet you wouldn't want all syntax highlighting in the editor to dissapear. So I have to make a system where it doesn't entirely follow the CFG, but stays as close as possible to it while matching all text. 

I will however take a break from this project, and I have no clue when I shall continue. For that reasom I have created a 'basic' version which only contains the strict CFG matcher, which you can find [here](https://github.com/TarVK/Empirler-V2/tree/master/src/empirler/basic). This is what the index file in the source code also refers to.

There is also currently a single working demo, which will only log some text to the console. This demo can be found [here](https://github.com/TarVK/Empirler-V2/tree/master/src/demos/logic).

## Installation
```
npm install
```

## Commands

| Action | Command         | Description                 |
| ------ | --------------- | --------------------------- |
| run    | `npm start`     | Runs the logic demo         |
| build  | `npm run build` | Builds the code of Empirler |