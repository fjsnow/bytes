import type { AppState, GameState } from "./state";
import { WORKER_DATA, type Worker } from "./data/workers";
import { UPGRADE_DATA } from "./data/upgrades";
import type { ITerminal } from "../core/terminal";

export function recalcCps(gameState: GameState) {
    let total = 0n;

    for (const worker of WORKER_DATA) {
        const count = gameState.workers[worker.id] || 0;
        total += BigInt(count) * worker.baseCookiesPerSecond;
    }

    for (const upgrade of UPGRADE_DATA) {
        const owned = gameState.upgrades[upgrade.id] || 0;
        if (!owned) continue;

        const ownedBigInt = BigInt(owned);

        switch (upgrade.id) {
            case "mechanical_keyboards":
                break;
            case "ergonomic_mice":
                break;
            case "free_pizza":
                total += BigInt(gameState.workers["intern"] || 0) * ownedBigInt;
                break;

            case "pair_programming":
                total +=
                    BigInt(gameState.workers["junior_dev"] || 0) * ownedBigInt;
                break;

            case "agile_methodology":
                total +=
                    (BigInt(gameState.workers["senior_dev"] || 0) +
                        BigInt(gameState.workers["tech_lead"] || 0)) *
                    ownedBigInt;
                break;

            case "scrum_masters":
                total +=
                    BigInt(gameState.workers["engineering_manager"] || 0) *
                    ownedBigInt;
                break;

            case "corporate_synergy":
                total +=
                    (BigInt(gameState.workers["director"] || 0) +
                        BigInt(gameState.workers["vp_engineering"] || 0)) *
                    ownedBigInt;
                break;

            case "executive_retreats":
                total +=
                    (BigInt(gameState.workers["cto"] || 0) +
                        BigInt(gameState.workers["ceo"] || 0)) *
                    ownedBigInt;
                break;

            case "golden_parachutes":
                total +=
                    (BigInt(gameState.workers["board_member"] || 0) +
                        BigInt(gameState.workers["chairman"] || 0)) *
                    ownedBigInt;
                break;

            case "global_monopoly":
                total +=
                    BigInt(gameState.workers["conglomerate_owner"] || 0) *
                    ownedBigInt;
                break;

            case "cloud_infrastructure":
                total = total * (1n + (1n / 4n) * ownedBigInt);
                break;
            case "ai_automation":
                total = total * (1n + (1n / 2n) * ownedBigInt);
                break;
            case "quantum_efficiency":
                total = total * 2n ** ownedBigInt;
                break;
        }
    }

    gameState.cps = total;
}

function getClickDelay(gameState: GameState) {
    const baseDelay = 100;
    const ergonomic = gameState.upgrades["ergonomic_mice"] || 0;
    return baseDelay / (1 + ergonomic * 0.5);
}

export function clickCookie(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const clickDelay = getClickDelay(gameState);
    if (Date.now() - appState.ui.lastClickTime < clickDelay) {
        appState.ui.lastClickTime = Date.now();
        return;
    }
    appState.ui.lastClickTime = Date.now();

    let clickGain = 1n;

    if (gameState.upgrades["mechanical_keyboards"] > 0) {
        clickGain += BigInt(gameState.upgrades["mechanical_keyboards"]);
    }

    gameState.cookies += clickGain;
    appState.ui.highlightTicks = 10;

    if (!appState.ui.settings.reduceFallingBits || Math.random() < 0.5) {
        if (!appState.ui.settings.disableFallingBits) {
            const { width, height } = terminal.getSize();
            appState.ui.fallingBits.push({
                x: Math.floor(Math.random() * (width - 2)) + 1,
                y: Math.floor(Math.random() * (height + 30)) - 15,
                one: Math.random() < 0.5,
                aliveTicks: 10,
            });
        }
    }
}

export function buyWorker(id: string, gameState: GameState) {
    const worker = WORKER_DATA.find((w) => w.id === id);
    if (!worker) return false;
    const count = gameState.workers[id] || 0;
    const cost = worker.cost(count);
    if (gameState.cookies >= cost) {
        gameState.cookies -= cost;
        gameState.workers[id] = count + 1;
        recalcCps(gameState);
        return true;
    }
    return false;
}

export function buyUpgrade(id: string, gameState: GameState) {
    const upgrade = UPGRADE_DATA.find((u) => u.id === id);
    if (!upgrade) return false;
    const owned = gameState.upgrades[id] || 0;
    if (upgrade.maxOwned !== undefined && owned >= upgrade.maxOwned)
        return false;

    const cost = upgrade.cost(owned);
    if (gameState.cookies >= cost) {
        gameState.cookies -= cost;
        gameState.upgrades[id] = owned + 1;
        recalcCps(gameState);
        return true;
    }
    return false;
}
