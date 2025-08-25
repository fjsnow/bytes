import { appState } from "../state";
import { getSize } from "../../core/screen";

export function tickBits() {
    if (appState.ui.fallingBits.length === 0) return;

    for (let i = appState.ui.fallingBits.length - 1; i >= 0; i--) {
        const bit = appState.ui.fallingBits[i];
        bit.y += 1;
        bit.aliveTicks -= 1;
        if (bit.aliveTicks <= 0 || bit.y > getSize().height) {
            appState.ui.fallingBits.splice(i, 1);
        }
    }
}
