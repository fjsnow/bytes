import { appState, gameState } from "../state";
import { getSize } from "../../core/screen";

export function tickCookie() {
    const cookiesThisTick = gameState.cps / 10;
    gameState.cookies += cookiesThisTick;

    if (appState.ui.highlightTicks > 0) appState.ui.highlightTicks -= 1;

    if (gameState.cps > 0) {
        const expectedBits = Math.log1p(gameState.cps) / Math.log(1.2);
        const bitsThisTick = expectedBits / 25;
        const maxBits = 5;

        let spawnCount = 0;
        if (bitsThisTick > 1) {
            spawnCount = Math.min(maxBits, Math.floor(bitsThisTick));
        } else if (Math.random() < bitsThisTick) {
            spawnCount = 1;
        }

        if (spawnCount > 0) {
            const { width, height } = getSize();
            for (let i = 0; i < spawnCount; i++) {
                appState.ui.fallingBits.push({
                    x: Math.floor(Math.random() * (width - 2)) + 1,
                    y: Math.floor(Math.random() * (height + 30)) - 15,
                    one: Math.random() < 0.5,
                    aliveTicks: 20,
                });
            }
        }
    }
}
