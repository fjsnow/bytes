import chalk from "chalk";
import { getFps } from "../../core/fps";
import type { ITerminal } from "../../core/terminal";
import type { AppState } from "../state";

export function drawDebug(appState: AppState, terminal: ITerminal) {
    const { width, height } = terminal.getSize();

    const commandText = ` [<] ${appState.timeMultiplier}x [>] | [0] 1min | [1] 10min | [2] 1hr `;
    const { x: commandX } = terminal.getCenterForSize(commandText.length, 0);
    terminal.draw(commandX, height - 4, commandText, chalk.bgRed.white.bold);

    const debugText = ` fps: ${getFps()} | ${width}x${height} | ${appState.layout} | ${appState.screen} | ${appState.ui.focus} `;
    const { x: debugX } = terminal.getCenterForSize(debugText.length, 0);
    terminal.draw(debugX, height - 3, debugText, chalk.bgRed.white.bold);
}
