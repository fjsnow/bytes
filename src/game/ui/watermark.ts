import chalk from "chalk";
import { draw, getCenterForSize, getSize } from "../../core/screen";

export function drawWatermark() {
    const { height } = getSize();

    const text = "(c) fjsn";
    const { x } = getCenterForSize(text.length, 0);
    draw(x, height - 1, text, chalk.gray);
}
