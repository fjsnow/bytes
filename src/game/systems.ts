import type { AppState, GameState } from "./state";
import { WORKER_DATA, type Worker } from "./data/workers";
import { UPGRADE_DATA } from "./data/upgrades";
import type { ITerminal } from "../core/terminal";

function getWorkerCost(worker: Worker, count: number) {
    return Math.floor(worker.baseCost * Math.pow(1.15, count));
}

export function recalcCps(gameState: GameState) {
    let total = 0;

    for (const worker of WORKER_DATA) {
        const count = gameState.workers[worker.id] || 0;
        total += count * worker.baseCookiesPerSecond;
    }

    for (const upgrade of UPGRADE_DATA) {
        const owned = gameState.upgrades[upgrade.id] || 0;
        if (!owned) continue;

        switch (upgrade.id) {
            case "mechanical_keyboards":
                break;
            case "ergonomic_mice":
                break;
            case "free_pizza":
                const interns = gameState.workers["intern"] || 0;
                total += interns * 1 * gameState.upgrades[upgrade.id];
                break;

            case "pair_programming":
                const juniors = gameState.workers["junior_dev"] || 0;
                total += juniors * 16 * gameState.upgrades[upgrade.id];
                break;

            case "agile_methodology":
                const seniors = gameState.workers["senior_dev"] || 0;
                const leads = gameState.workers["tech_lead"] || 0;
                total += seniors * 256 * gameState.upgrades[upgrade.id];
                total += leads * 4 * 1024 ** 1 * gameState.upgrades[upgrade.id];
                break;

            case "scrum_masters":
                const mgrs = gameState.workers["engineering_manager"] || 0;
                total += mgrs * 64 * 1024 ** 1 * gameState.upgrades[upgrade.id];
                break;

            case "corporate_synergy":
                const dirs = gameState.workers["director"] || 0;
                const vps = gameState.workers["vp_engineering"] || 0;
                total += dirs * 1024 ** 2 * gameState.upgrades[upgrade.id];
                total += vps * 16 * 1024 ** 2 * gameState.upgrades[upgrade.id];
                break;

            case "executive_retreats":
                const cto = gameState.workers["cto"] || 0;
                const ceo = gameState.workers["ceo"] || 0;
                total += cto * 256 * 1024 ** 2 * gameState.upgrades[upgrade.id];
                total += ceo * 4 * 1024 ** 3 * gameState.upgrades[upgrade.id];
                break;

            case "golden_parachutes":
                const board = gameState.workers["board_member"] || 0;
                const chair = gameState.workers["chairman"] || 0;
                total +=
                    board * 64 * 1024 ** 3 * gameState.upgrades[upgrade.id];
                total += chair * 1024 ** 4 * gameState.upgrades[upgrade.id];
                break;

            case "global_monopoly":
                const conglom = gameState.workers["conglomerate_owner"] || 0;
                total +=
                    conglom * 16 * 1024 ** 4 * gameState.upgrades[upgrade.id];
                break;

            case "cloud_infrastructure":
                total *= 1 + 0.25 * owned;
                break;
            case "ai_automation":
                total *= 1 + 0.5 * owned;
                break;
            case "quantum_efficiency":
                total *= 2 ** owned;
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

    let clickGain = 1;

    if (gameState.upgrades["mechanical_keyboards"]) {
        clickGain += gameState.upgrades["mechanical_keyboards"];
    }

    gameState.cookies += clickGain;
    appState.ui.highlightTicks = 10;

    const { width, height } = terminal.getSize();
    appState.ui.fallingBits.push({
        x: Math.floor(Math.random() * (width - 2)) + 1,
        y: Math.floor(Math.random() * (height + 30)) - 15,
        one: Math.random() < 0.5,
        aliveTicks: 10,
    });
}

export function buyWorker(id: string, gameState: GameState) {
    const worker = WORKER_DATA.find((w) => w.id === id);
    if (!worker) return false;
    const count = gameState.workers[id] || 0;
    const cost = getWorkerCost(worker, count);
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
    if (upgrade.maxOwned && owned >= upgrade.maxOwned) return false;

    const cost = Math.floor(upgrade.baseCost * Math.pow(1.15, owned));
    if (gameState.cookies >= cost) {
        gameState.cookies -= cost;
        gameState.upgrades[id] = owned + 1;
        recalcCps(gameState);
        return true;
    }
    return false;
}
