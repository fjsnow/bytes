import chalk from "chalk";
import { getFps } from "../../core/fps";
import type { ITerminal } from "../../core/terminal";
import type { AppState } from "../state";

export function drawDebug(appState: AppState, terminal: ITerminal) {
    const { width, height } = terminal.getSize();

    let debugParts: string[] = [];
    debugParts.push(`DEBUG`);

    const fpsText = `fps: ${getFps()}`;
    if (width >= 80) {
        debugParts.push(fpsText);
    }

    const sizeText = `${width}x${height}`;
    if (width >= 60) {
        debugParts.push(sizeText);
    }

    const screenLayoutText = `${appState.screen}, ${appState.layout}, ${appState.ui.focus}`;
    if (width >= 120) {
        debugParts.push(screenLayoutText);
    }

    debugParts.push(`[0] 1min | [1] 10min | [2] 1hr`);

    let debugText = debugParts.filter(Boolean).join(" | ");

    if (debugText.length > width - 2) {
        debugText = `DEBUG`;
        if (fpsText.length < width - 2 - debugText.length - 3) {
            debugText += ` | ${fpsText}`;
        }
        const commandHint = ` | [0]...`;
        if (debugText.length + commandHint.length <= width - 2) {
            debugText += commandHint;
        } else {
            debugText = `DEBUG`;
            if (debugText.length + commandHint.length <= width - 2) {
                debugText += commandHint;
            }
        }
    }

    const paddedDebugText = ` ${debugText} `;
    const { x } = terminal.getCenterForSize(paddedDebugText.length, 0);
    terminal.draw(
        x,
        terminal.getSize().height - 1,
        paddedDebugText,
        chalk.bgRed.white.bold,
    );
}
