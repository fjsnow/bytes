import chalk from "chalk";
import { getFps } from "../../core/fps";
import { draw, getSize } from "../../core/screen";
import { appState } from "../state";

export function drawDebug() {
    const { width, height } = getSize();

    draw(
        0,
        0,
        `fps: ${getFps()}, width: ${width}, height: ${height}, screen: ${appState.screen}, prev: ${appState.previousScreen}, layout: ${appState.layout}`,
        chalk.red,
    );
}
