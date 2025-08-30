import type { AppState, GameState } from "./state";
import { WORKER_DATA, type Worker } from "./data/workers";
import { UPGRADE_DATA } from "./data/upgrades";
import type { ITerminal } from "../core/terminal";

export function recalcCps(gameState: GameState) {
    let totalCpsFromWorkers = 0n;
    const workerCpsContributions: Record<string, bigint> = {};

    for (const worker of WORKER_DATA) {
        const count = BigInt(gameState.workers[worker.id] || 0);
        const contribution = count * worker.baseCookiesPerSecond;
        workerCpsContributions[worker.id] = contribution;
        totalCpsFromWorkers += contribution;
    }

    for (const upgrade of UPGRADE_DATA) {
        const owned = gameState.upgrades[upgrade.id] || 0;
        if (!owned) continue;

        switch (upgrade.id) {
            case "free_pizza":
                totalCpsFromWorkers += workerCpsContributions["intern"] || 0n;
                break;
            case "pair_programming":
                totalCpsFromWorkers +=
                    workerCpsContributions["junior_dev"] || 0n;
                break;
            case "agile_methodology":
                totalCpsFromWorkers +=
                    workerCpsContributions["senior_dev"] || 0n;
                totalCpsFromWorkers +=
                    workerCpsContributions["tech_lead"] || 0n;
                break;
            case "scrum_masters":
                totalCpsFromWorkers +=
                    workerCpsContributions["engineering_manager"] || 0n;
                break;
            case "corporate_synergy":
                totalCpsFromWorkers += workerCpsContributions["director"] || 0n;
                totalCpsFromWorkers +=
                    workerCpsContributions["vp_engineering"] || 0n;
                break;
            case "executive_retreats":
                totalCpsFromWorkers += workerCpsContributions["cto"] || 0n;
                totalCpsFromWorkers += workerCpsContributions["ceo"] || 0n;
                break;
            case "golden_parachutes":
                totalCpsFromWorkers +=
                    workerCpsContributions["board_member"] || 0n;
                totalCpsFromWorkers += workerCpsContributions["chairman"] || 0n;
                break;
            case "global_monopoly":
                totalCpsFromWorkers +=
                    workerCpsContributions["conglomerate_owner"] || 0n;
                break;
            default:
                break;
        }
    }

    for (const upgrade of UPGRADE_DATA) {
        const owned = gameState.upgrades[upgrade.id] || 0;
        if (!owned) continue;
        const ownedBigInt = BigInt(owned);

        switch (upgrade.id) {
            case "cloud_infrastructure":
                totalCpsFromWorkers =
                    (totalCpsFromWorkers * (100n + 25n * ownedBigInt)) / 100n;
                break;
            case "ai_automation":
                totalCpsFromWorkers =
                    (totalCpsFromWorkers * (100n + 50n * ownedBigInt)) / 100n;
                break;
            case "quantum_efficiency":
                totalCpsFromWorkers = totalCpsFromWorkers * 2n ** ownedBigInt;
                break;
            default:
                break;
        }
    }

    gameState.cps = totalCpsFromWorkers;
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

export function skipTime(gameState: GameState, minutes: number) {
    const seconds = BigInt(minutes * 60);
    const cookiesToAdd = gameState.cps * seconds;
    gameState.cookies += cookiesToAdd;
}
