import type { AppState, GameState } from "./state";
import { WORKER_DATA } from "./data/workers";
import { UPGRADE_DATA } from "./data/upgrades";
import type { ITerminal } from "../core/terminal";
import { createInitialGameState } from "./state";

export function recalcCps(gameState: GameState) {
    let totalCpsFromWorkers = 0n;
    const workerCpsContributions: Record<string, bigint> = {};

    for (const worker of WORKER_DATA) {
        if (
            worker.prerequisitePrestige !== undefined &&
            gameState.prestige < worker.prerequisitePrestige
        ) {
            continue;
        }

        const count = BigInt(gameState.workers[worker.id] || 0);
        const contribution = count * worker.baseCookiesPerSecond;
        workerCpsContributions[worker.id] = contribution;
        totalCpsFromWorkers += contribution;
    }

    for (const upgrade of UPGRADE_DATA) {
        if (
            upgrade.prerequisitePrestige !== undefined &&
            gameState.prestige < upgrade.prerequisitePrestige
        ) {
            continue;
        }
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
                totalCpsFromWorkers +=
                    workerCpsContributions["angel_investor"] || 0n;
                break;
            default:
                break;
        }
    }

    for (const upgrade of UPGRADE_DATA) {
        if (
            upgrade.prerequisitePrestige !== undefined &&
            gameState.prestige < upgrade.prerequisitePrestige
        ) {
            continue;
        }

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

    totalCpsFromWorkers =
        (totalCpsFromWorkers *
            BigInt(Math.round(gameState.prestigeMultiplier * 100))) /
        100n;

    gameState.cps = totalCpsFromWorkers;
}

export function clickCookie(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    if (Date.now() - appState.ui.lastClickTime < 100) {
        appState.ui.lastClickTime = Date.now();
        return;
    }
    appState.ui.lastClickTime = Date.now();

    let clickGain = 1n;

    if (gameState.upgrades["mechanical_keyboards"] > 0) {
        clickGain += BigInt(gameState.upgrades["mechanical_keyboards"]);
    }

    clickGain =
        (clickGain * BigInt(Math.round(gameState.prestigeMultiplier * 100))) /
        100n;

    gameState.cookies += clickGain;
    appState.ui.highlightTicks = 10;

    if (appState.ui.settings.fallingBits !== "disabled") {
        const shouldSpawn =
            appState.ui.settings.fallingBits === "full" ||
            (appState.ui.settings.fallingBits === "reduced" &&
                Math.random() < 0.5);

        if (shouldSpawn) {
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

    if (
        worker.prerequisitePrestige !== undefined &&
        gameState.prestige < worker.prerequisitePrestige
    ) {
        return false;
    }

    const count = gameState.workers[id] || 0;
    const cost = worker.cost(count);
    if (gameState.cookies >= cost) {
        gameState.cookies -= cost;
        gameState.workers[id] = count + 1;
        recalcCps(gameState);
        calculatePrestigeCost(gameState);
        return true;
    }
    return false;
}

export function buyUpgrade(id: string, gameState: GameState) {
    const upgrade = UPGRADE_DATA.find((u) => u.id === id);
    if (!upgrade) return false;

    if (
        upgrade.prerequisitePrestige !== undefined &&
        gameState.prestige < upgrade.prerequisitePrestige
    ) {
        return false;
    }

    const owned = gameState.upgrades[id] || 0;
    if (upgrade.maxOwned !== undefined && owned >= upgrade.maxOwned)
        return false;

    const cost = upgrade.cost(owned);
    if (gameState.cookies >= cost) {
        gameState.cookies -= cost;
        gameState.upgrades[id] = owned + 1;
        recalcCps(gameState);
        calculatePrestigeCost(gameState);
        return true;
    }
    return false;
}

export function skipTime(gameState: GameState, minutes: number) {
    const seconds = BigInt(minutes * 60);
    const cookiesToAdd = gameState.cps * seconds;
    gameState.cookies += cookiesToAdd;
    calculatePrestigeCost(gameState);
}

export function calculatePrestigeCost(gameState: GameState) {
    const initialPrestigeCost = 64n * 1024n ** 2n;
    const prestigeCostPerLevelMultiplier = 256n;

    let cost = initialPrestigeCost;
    for (let i = 0; i < gameState.prestige; i++) {
        cost *= prestigeCostPerLevelMultiplier;
    }

    gameState.prestigeCost = cost;
}

export function prestige(gameState: GameState, appState: AppState) {
    if (gameState.cookies >= gameState.prestigeCost) {
        const initial = createInitialGameState();

        gameState.prestige++;
        gameState.cookies = initial.cookies;
        appState.ui.cookieAccumulator = 0;
        gameState.cps = initial.cps;
        gameState.workers = initial.workers;
        gameState.upgrades = initial.upgrades;
        calculatePrestigeCost(gameState);
        gameState.prestigeMultiplier = 2 ** gameState.prestige;
        return true;
    }
    return false;
}
