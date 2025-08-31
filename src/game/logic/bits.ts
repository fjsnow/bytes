import type { AppState } from "../state";
import type { ITerminal } from "../../core/terminal";

export function tickBits(appState: AppState, terminal: ITerminal) {
    if (appState.ui.fallingBits.length === 0) return;
    if (appState.ui.settings.fallingBits === "disabled") {
        appState.ui.fallingBits = [];
        return;
    }

    const { height } = terminal.getSize();

    for (let i = appState.ui.fallingBits.length - 1; i >= 0; i--) {
        const bit = appState.ui.fallingBits[i];
        bit.y += appState.timeMultiplier;
        bit.aliveTicks -= appState.timeMultiplier;
        if (bit.aliveTicks <= 0 || bit.y > height) {
            appState.ui.fallingBits.splice(i, 1);
        }
    }
}
