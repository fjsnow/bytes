import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";

export function drawWatermark(terminal: ITerminal) {
    const { height } = terminal.getSize();

    const text = "ssh b.fjsn.io";
    const { x } = terminal.getCenterForSize(text.length, 0);
    terminal.draw(x, height - 1, text, chalk.gray);
}
