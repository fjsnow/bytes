import { draw } from "../../core/screen";
import { getFallingBitGray } from "../../utils/colours";
import { appState } from "../state";

export function drawBits() {
    for (const bit of appState.ui.fallingBits) {
        draw(
            bit.x,
            bit.y,
            bit.one ? "1" : "0",
            getFallingBitGray(bit.aliveTicks),
        );
    }
}
