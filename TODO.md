-   Grammar:

    -   Extra feedback:
        -   Check for unreachable variables in grammar
        -   Check for unproductive variables in grammar
    -   Add inline variables in patterns
    -   Add space for semantics for variables

-   Grammar Matcher:

    -   Handle syntax errors
    -   Extend variableMatch capabilities
    -   Make matches and caching items have relative indices
    -   Allow a previously matched AST to be be modified when text is inserted/deleted

-   AST:

    -   Add async tree walking method using stepping

-   Editor:

    -   Create an editor in html that interacts with the classes above to provide syntax highlighting for custom languages
    -   Add semantic error checking
    -   Add intellisense
    -   Add code folding
