import chalk from "chalk";
import { getFps } from "../../core/fps";
import type { ITerminal } from "../../core/terminal";
import type { AppState } from "../state";

export function drawDebug(appState: AppState, terminal: ITerminal) {
    const { width, height } = terminal.getSize();

    terminal.draw(
        0,
        0,
        `fps: ${getFps()}, width: ${width}, height: ${height}, screen: ${appState.screen}, prev: ${appState.previousScreen}, layout: ${appState.layout}`,
        chalk.red,
    );
}
