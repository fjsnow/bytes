import { clickCookie, buyWorker, buyUpgrade } from "./systems";
import type { AppState, GameState, Focus } from "./state";
import type { ITerminal } from "../core/terminal";
import { WORKER_DATA } from "./data/workers";
import { UPGRADE_DATA } from "./data/upgrades";

export function getFilteredUpgrades(appState: AppState, gameState: GameState) {
    return UPGRADE_DATA.filter((u) => {
        if (appState.ui.upgradesShowMaxed) return true;
        const owned = gameState.upgrades[u.id] || 0;
        return u.maxOwned === undefined || owned < u.maxOwned;
    });
}

export function ensureUpgradeVisible(appState: AppState, terminal: ITerminal) {
    const { height } = terminal.getSize();
    const maxPerUpgrade = 5;
    const maxVisible = Math.floor((height - 3) / maxPerUpgrade);

    const filtered = getFilteredUpgrades(appState, {} as GameState);
    const sel = appState.ui.upgrades.selectedIndex;
    let scroll = appState.ui.upgrades.scrollOffset;

    if (sel < scroll) {
        scroll = sel;
    } else if (sel >= scroll + maxVisible) {
        scroll = sel - maxVisible + 1;
    }

    const maxScroll = Math.max(0, filtered.length - maxVisible);
    if (scroll > maxScroll) {
        scroll = maxScroll;
    }

    appState.ui.upgrades.scrollOffset = Math.max(0, scroll);
}

export function moveWorkerSelection(
    appState: AppState,
    terminal: ITerminal,
    delta: number,
) {
    const { height } = terminal.getSize();
    const maxVisible = Math.floor((height - 3) / 4);
    appState.ui.workers.selectedIndex += delta;
    if (appState.ui.workers.selectedIndex < 0)
        appState.ui.workers.selectedIndex = 0;
    if (appState.ui.workers.selectedIndex >= WORKER_DATA.length)
        appState.ui.workers.selectedIndex = WORKER_DATA.length - 1;
    if (appState.ui.workers.selectedIndex < appState.ui.workers.scrollOffset) {
        appState.ui.workers.scrollOffset = appState.ui.workers.selectedIndex;
    }
    if (
        appState.ui.workers.selectedIndex >=
        appState.ui.workers.scrollOffset + maxVisible
    ) {
        appState.ui.workers.scrollOffset =
            appState.ui.workers.selectedIndex - maxVisible + 1;
    }
}

export function moveUpgradeSelection(
    appState: AppState,
    terminal: ITerminal,
    delta: number,
    gameState: GameState,
) {
    const filtered = getFilteredUpgrades(appState, gameState);
    appState.ui.upgrades.selectedIndex += delta;
    if (appState.ui.upgrades.selectedIndex < 0)
        appState.ui.upgrades.selectedIndex = 0;
    if (appState.ui.upgrades.selectedIndex >= filtered.length)
        appState.ui.upgrades.selectedIndex = filtered.length - 1;

    ensureUpgradeVisible(appState, terminal);
}

export function cycleFocus(appState: AppState) {
    if (appState.layout === "large") {
        const order: Focus[] = ["main", "workers", "upgrades"];
        const idx = order.indexOf(appState.ui.focus);
        appState.ui.focus = order[(idx + 1) % order.length];
    } else if (appState.layout === "medium") {
        const order: Focus[] = ["main", appState.screen];
        const idx = order.indexOf(appState.ui.focus);
        appState.ui.focus = order[(idx + 1) % order.length];
    }
}

export function handleGameInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    if (key === "\t") {
        cycleFocus(appState);
        return;
    }

    if (appState.layout === "large") {
        handleLargeInput(appState, gameState, terminal, key);
    } else if (appState.layout === "medium") {
        handleMediumInput(appState, gameState, terminal, key);
    } else {
        handleSmallInput(appState, gameState, terminal, key);
    }

    if (key.toLowerCase() === "h") {
        const prevFiltered = getFilteredUpgrades(appState, gameState);
        const prevUpgrade = prevFiltered[appState.ui.upgrades.selectedIndex];

        appState.ui.upgradesShowMaxed = !appState.ui.upgradesShowMaxed;

        const newFiltered = getFilteredUpgrades(appState, gameState);

        if (prevUpgrade) {
            const newIndex = newFiltered.findIndex(
                (u) => u.id === prevUpgrade.id,
            );
            if (newIndex !== -1) {
                appState.ui.upgrades.selectedIndex = newIndex;
            } else {
                appState.ui.upgrades.selectedIndex = Math.max(
                    0,
                    appState.ui.upgrades.selectedIndex - 1,
                );
            }
        }

        ensureUpgradeVisible(appState, terminal);
    }
}

function handleLargeInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    const map: Record<string, () => void> = {
        " ": () => clickCookie(appState, gameState, terminal),
        w: () => {
            appState.ui.focus = "workers";
        },
        u: () => {
            appState.ui.focus = "upgrades";
        },
        j: () => {
            if (appState.ui.focus === "workers")
                moveWorkerSelection(appState, terminal, 1);
            if (appState.ui.focus === "upgrades")
                moveUpgradeSelection(appState, terminal, 1, gameState);
        },
        k: () => {
            if (appState.ui.focus === "workers")
                moveWorkerSelection(appState, terminal, -1);
            if (appState.ui.focus === "upgrades")
                moveUpgradeSelection(appState, terminal, -1, gameState);
        },
        b: () => {
            if (appState.ui.focus === "workers") {
                const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
                if (worker) buyWorker(worker.id, gameState);
            } else if (appState.ui.focus === "upgrades") {
                const filtered = getFilteredUpgrades(appState, gameState);
                const upgrade = filtered[appState.ui.upgrades.selectedIndex];
                if (upgrade) buyUpgrade(upgrade.id, gameState);
            }
        },
    };
    if (map[key]) map[key]();
}

function handleMediumInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    const map: Record<string, () => void> = {
        " ": () => clickCookie(appState, gameState, terminal),
        w: () => {
            appState.screen = "workers";
            appState.ui.focus = "workers";
        },
        u: () => {
            appState.screen = "upgrades";
            appState.ui.focus = "upgrades";
        },
        j: () => {
            if (appState.ui.focus === "workers")
                moveWorkerSelection(appState, terminal, 1);
            if (appState.ui.focus === "upgrades")
                moveUpgradeSelection(appState, terminal, 1, gameState);
        },
        k: () => {
            if (appState.ui.focus === "workers")
                moveWorkerSelection(appState, terminal, -1);
            if (appState.ui.focus === "upgrades")
                moveUpgradeSelection(appState, terminal, -1, gameState);
        },
        b: () => {
            if (appState.ui.focus === "workers") {
                const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
                if (worker) buyWorker(worker.id, gameState);
            } else if (appState.ui.focus === "upgrades") {
                const filtered = getFilteredUpgrades(appState, gameState);
                const upgrade = filtered[appState.ui.upgrades.selectedIndex];
                if (upgrade) buyUpgrade(upgrade.id, gameState);
            }
        },
    };
    if (map[key]) map[key]();
}

function handleSmallInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    if (appState.screen === "main") {
        const map: Record<string, () => void> = {
            " ": () => clickCookie(appState, gameState, terminal),
            w: () => {
                appState.screen = "workers";
                appState.ui.focus = "workers";
            },
            u: () => {
                appState.screen = "upgrades";
                appState.ui.focus = "upgrades";
            },
        };
        if (map[key]) map[key]();
    } else if (appState.screen === "workers") {
        if (key === "\b" || key === "\x7f") {
            appState.screen = "main";
            appState.ui.focus = "main";
            return;
        }
        if (key === "j") moveWorkerSelection(appState, terminal, 1);
        if (key === "k") moveWorkerSelection(appState, terminal, -1);
        if (key === "b") {
            const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
            if (worker) buyWorker(worker.id, gameState);
        }
    } else if (appState.screen === "upgrades") {
        if (key === "\b" || key === "\x7f") {
            appState.screen = "main";
            appState.ui.focus = "main";
            return;
        }
        if (key === "j") moveUpgradeSelection(appState, terminal, 1, gameState);
        if (key === "k")
            moveUpgradeSelection(appState, terminal, -1, gameState);
        if (key === "b") {
            const filtered = getFilteredUpgrades(appState, gameState);
            const upgrade = filtered[appState.ui.upgrades.selectedIndex];
            if (upgrade) buyUpgrade(upgrade.id, gameState);
        }
    }
}
