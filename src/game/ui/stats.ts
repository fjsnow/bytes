import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";
import { formatBytes } from "../../utils/bytes";
import type { AppState, GameState } from "../state";

export function drawStats(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const totalCookies =
        Number(gameState.cookies) + appState.ui.cookieAccumulator;
    const cookiesText = formatBytes(totalCookies);
    const cpsText = formatBytes(gameState.cps);

    const statsText = cookiesText + "   (" + cpsText + "/s)";
    const statsWidth = statsText.length;

    const { width, height } = terminal.getSize();

    let x: number;
    let y: number;

    if (appState.layout === "small") {
        const center = terminal.getCenterForSize(statsWidth, 0);
        x = center.x;
        y = Math.floor(height / 2) - 8;
    } else if (appState.layout === "medium") {
        const leftPanelWidth = 44 + 2;
        const rightWidth = width - leftPanelWidth;
        x = leftPanelWidth + Math.floor((rightWidth - statsWidth) / 2);
        y = Math.floor(height / 2) - 8;
    } else {
        const center = terminal.getCenterForSize(statsWidth, 0);
        x = center.x;
        y = Math.floor(height / 2) - 8;
    }

    terminal.draw(x, y, " " + cookiesText + " ", chalk.white.bgBlack);
    terminal.draw(
        x + cookiesText.length + 3,
        y,
        "(" + cpsText + "/s)",
        chalk.gray,
    );
}
