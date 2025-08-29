import type { AppState, GameState } from "../state";
import type { ITerminal } from "../../core/terminal";

export function tickCookie(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const cookiesThisTick = gameState.cps / 10n;
    gameState.cookies += cookiesThisTick;

    if (appState.ui.highlightTicks > 0) appState.ui.highlightTicks -= 1;

    if (gameState.cps > 0n && !appState.ui.settings.disableFallingBits) {
        const expectedBits = Math.log1p(Number(gameState.cps)) / Math.log(1.5);

        let bitsThisTick = expectedBits / 25;
        if (appState.ui.settings.reduceFallingBits) {
            bitsThisTick = bitsThisTick * 0.5;
        }

        let spawnCount = 0;
        if (bitsThisTick > 1) {
            spawnCount = Math.floor(bitsThisTick);
        } else if (Math.random() < bitsThisTick) {
            spawnCount = 1;
        }

        if (spawnCount > 0) {
            const { width, height } = terminal.getSize();
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
