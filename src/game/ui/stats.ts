import chalk from "chalk";
import { draw, getCenterForSize, getSize } from "../../core/screen";
import { formatBytes } from "../../utils/bytes";
import { gameState, appState } from "../state";

export function drawStats() {
    const cookiesText = formatBytes(gameState.cookies);
    const cpsText = formatBytes(gameState.cps);

    const statsText = cookiesText + "   (" + cpsText + "/s)";
    const statsWidth = statsText.length;

    const { width, height } = getSize();

    let x: number;
    let y: number;

    if (appState.layout === "small") {
        const center = getCenterForSize(statsWidth, 0);
        x = center.x;
        y = Math.floor(height / 2) - 8;
    } else if (appState.layout === "medium") {
        const leftPanelWidth = 44 + 2;
        const rightWidth = width - leftPanelWidth;
        x = leftPanelWidth + Math.floor((rightWidth - statsWidth) / 2);
        y = Math.floor(height / 2) - 8;
    } else {
        const center = getCenterForSize(statsWidth, 0);
        x = center.x;
        y = Math.floor(height / 2) - 8;
    }

    draw(x, y, " " + cookiesText + " ", chalk.white.bgBlack);
    draw(x + cookiesText.length + 3, y, "(" + cpsText + "/s)", chalk.gray);
}
