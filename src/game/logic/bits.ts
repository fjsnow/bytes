import type { AppState } from "../state";
import type { ITerminal } from "../../core/terminal";

export function tickBits(appState: AppState, terminal: ITerminal) {
    if (appState.ui.fallingBits.length === 0) return;
    if (appState.ui.settings.disableFallingBits) {
        appState.ui.fallingBits = [];
        return;
    }

    const { height } = terminal.getSize();

    for (let i = appState.ui.fallingBits.length - 1; i >= 0; i--) {
        const bit = appState.ui.fallingBits[i];
        bit.y += 1;
        bit.aliveTicks -= 1;
        if (bit.aliveTicks <= 0 || bit.y > height) {
            appState.ui.fallingBits.splice(i, 1);
        }
    }
}
