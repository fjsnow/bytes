import type { AppState, GameState } from "../state";
import type { ITerminal } from "../../core/terminal";

export function tickCookie(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const cps = gameState.cps;
    const baseIncrement = Number(cps) / 25 * appState.timeMultiplier;
    const integerIncrement = BigInt(Math.floor(baseIncrement));
    const fractionalIncrement = baseIncrement - Math.floor(baseIncrement);

    gameState.cookies += integerIncrement;
    gameState.cookiesEarnedThisPrestige += integerIncrement;
    gameState.totalCookiesEarned += integerIncrement;

    appState.ui.cookieAccumulator += fractionalIncrement;
    while (appState.ui.cookieAccumulator >= 1) {
        gameState.cookies += 1n;
        gameState.cookiesEarnedThisPrestige += 1n;
        gameState.totalCookiesEarned += 1n;
        appState.ui.cookieAccumulator -= 1;
    }

    if (appState.ui.highlightTicks > 0) appState.ui.highlightTicks -= appState.timeMultiplier;

    if (gameState.cps > 0n && appState.ui.settings.fallingBits !== "disabled") {
        const expectedBits = Math.log1p(Number(gameState.cps)) / Math.log(1.5);

        let bitsThisTick = expectedBits / 25;
        if (appState.ui.settings.fallingBits === "reduced") {
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
