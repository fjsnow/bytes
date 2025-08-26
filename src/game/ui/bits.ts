import type { ITerminal } from "../../core/terminal";
import { getFallingBitGray } from "../../utils/colours";
import type { AppState } from "../state";

export function drawBits(appState: AppState, terminal: ITerminal) {
    for (const bit of appState.ui.fallingBits) {
        terminal.draw(
            bit.x,
            bit.y,
            bit.one ? "1" : "0",
            getFallingBitGray(bit.aliveTicks),
        );
    }
}
