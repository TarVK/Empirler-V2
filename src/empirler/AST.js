export default class AST {
    constructor(input, root) {
        this.input = input;
        this.root = root;
    }
    highlight(part) {
        if (!part) part = this.root;

        let out = "";
        console.log(part);
        let lastIndex = part.match.range.start;
        part.match.parts.forEach((childPart, index) => {
            if (childPart) {
                const childStart = (childPart.match.range || childPart.range)
                    .start;
                if (index > 0 && lastIndex != childStart) {
                    out +=
                        "<span class=error style=color:darkred;background-color:pink>" +
                        escapeHtml(
                            this.input.substring(lastIndex, childStart)
                        ) +
                        "</span>";
                }

                if (childPart.match.parts) {
                    if (childPart.match.parts.length > 0) {
                        out += this.highlight(childPart);
                        lastIndex = childPart.match.range.end;
                    }
                } else {
                    const def = part.definition.pattern[index];
                    if (def.color) {
                        out +=
                            "<span style=color:" +
                            def.color +
                            ">" +
                            escapeHtml(
                                this.input.substring(
                                    childPart.range.start,
                                    childPart.range.end
                                )
                            ) +
                            "</span>";
                    } else {
                        out += escapeHtml(
                            this.input.substring(
                                childPart.range.start,
                                childPart.range.end
                            )
                        );
                    }
                    lastIndex = childPart.range.end;
                }
            }
        });
        return out;
    }
}
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
