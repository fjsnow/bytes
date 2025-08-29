import chalk from "chalk";

const MESSAGE_MAX_WIDTH = 60;

export function generateMessage(
    type: "info" | "success" | "error",
    text: string,
): string {
    const lines = text.split("\n").flatMap((line) => {
        const words = line.split(" ");
        const wrapped: string[] = [];
        let currentLine = "";
        for (const word of words) {
            if ((currentLine + word).length + 1 > MESSAGE_MAX_WIDTH) {
                wrapped.push(currentLine.trim());
                currentLine = word + " ";
            } else {
                currentLine += word + " ";
            }
        }
        if (currentLine.trim()) wrapped.push(currentLine.trim());
        return wrapped;
    });

    let colorFn: (s: string) => string;
    let label: string;

    switch (type) {
        case "info":
            colorFn = chalk.bgBlue.black;
            label = "INFO";
            break;
        case "success":
            colorFn = chalk.bgGreen.black;
            label = "SUCCESS";
            break;
        case "error":
            colorFn = chalk.bgRed.white;
            label = "ERROR";
            break;
    }

    const labelPadded = ` ${label} `;
    const coloredLabel = colorFn(labelPadded);

    return (
        "\n" +
        "  " +
        coloredLabel +
        "\r\n" +
        lines.map((l) => chalk.white(`  ${l}`).trimEnd() + "\r").join("\n") +
        "\r\n\r\n"
    );
}
