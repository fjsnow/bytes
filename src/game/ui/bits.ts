import type { ITerminal } from "../../core/terminal";
import { getFallingBitGray } from "../../utils/colours";
import type { AppState } from "../state";

export function drawBits(appState: AppState, terminal: ITerminal) {
    if (appState.ui.settings.fallingBits === "disabled") return;
    for (const bit of appState.ui.fallingBits) {
        terminal.draw(
            bit.x,
            bit.y,
            bit.one ? "1" : "0",
            getFallingBitGray(bit.aliveTicks),
        );
    }
}
