import { onKey } from "../core/input";
import { clickCookie, buyWorker, buyUpgrade } from "./systems";
import { appState, gameState } from "./state";
import { getSize } from "../core/screen";
import { WORKER_DATA } from "./data/workers";
import { UPGRADE_DATA } from "./data/upgrades";

export type Focus = "main" | "workers" | "upgrades" | "settings";

function getFilteredUpgrades() {
    return UPGRADE_DATA.filter((u) => {
        if (appState.ui.upgradesShowMaxed) return true;
        const owned = gameState.upgrades[u.id] || 0;
        return !u.maxOwned || owned < u.maxOwned;
    });
}

function ensureUpgradeVisible() {
    const { height } = getSize();
    const maxPerUpgrade = 5;
    const maxVisible = Math.floor((height - 3) / maxPerUpgrade);

    const filtered = getFilteredUpgrades();
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

function moveWorkerSelection(delta: number) {
    const { height } = getSize();
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

function moveUpgradeSelection(delta: number) {
    const filtered = getFilteredUpgrades();
    appState.ui.upgrades.selectedIndex += delta;
    if (appState.ui.upgrades.selectedIndex < 0)
        appState.ui.upgrades.selectedIndex = 0;
    if (appState.ui.upgrades.selectedIndex >= filtered.length)
        appState.ui.upgrades.selectedIndex = filtered.length - 1;

    ensureUpgradeVisible();
}

function cycleFocus() {
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

export function setupGameInput() {
    onKey((key) => {
        if (key === "q") process.exit(0);

        if (key === "\t") {
            cycleFocus();
            return;
        }

        if (appState.layout === "large") {
            handleLargeInput(key);
        } else if (appState.layout === "medium") {
            handleMediumInput(key);
        } else {
            handleSmallInput(key);
        }

        if (key.toLowerCase() === "h") {
            const prevFiltered = getFilteredUpgrades();
            const prevUpgrade =
                prevFiltered[appState.ui.upgrades.selectedIndex];

            appState.ui.upgradesShowMaxed = !appState.ui.upgradesShowMaxed;

            const newFiltered = getFilteredUpgrades();

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

            ensureUpgradeVisible();
        }
    });
}

function handleLargeInput(key: string) {
    const map: Record<string, () => void> = {
        " ": clickCookie,
        w: () => {
            appState.ui.focus = "workers";
        },
        u: () => {
            appState.ui.focus = "upgrades";
        },
        j: () => {
            if (appState.ui.focus === "workers") moveWorkerSelection(1);
            if (appState.ui.focus === "upgrades") moveUpgradeSelection(1);
        },
        k: () => {
            if (appState.ui.focus === "workers") moveWorkerSelection(-1);
            if (appState.ui.focus === "upgrades") moveUpgradeSelection(-1);
        },
        b: () => {
            if (appState.ui.focus === "workers") {
                const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
                if (worker) buyWorker(worker.id);
            } else if (appState.ui.focus === "upgrades") {
                const filtered = getFilteredUpgrades();
                const upgrade = filtered[appState.ui.upgrades.selectedIndex];
                if (upgrade) buyUpgrade(upgrade.id);
            }
        },
    };
    if (map[key]) map[key]();
}

function handleMediumInput(key: string) {
    const map: Record<string, () => void> = {
        " ": clickCookie,
        w: () => {
            appState.screen = "workers";
            appState.ui.focus = "workers";
        },
        u: () => {
            appState.screen = "upgrades";
            appState.ui.focus = "upgrades";
        },
        j: () => {
            if (appState.ui.focus === "workers") moveWorkerSelection(1);
            if (appState.ui.focus === "upgrades") moveUpgradeSelection(1);
        },
        k: () => {
            if (appState.ui.focus === "workers") moveWorkerSelection(-1);
            if (appState.ui.focus === "upgrades") moveUpgradeSelection(-1);
        },
        b: () => {
            if (appState.ui.focus === "workers") {
                const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
                if (worker) buyWorker(worker.id);
            } else if (appState.ui.focus === "upgrades") {
                const filtered = getFilteredUpgrades();
                const upgrade = filtered[appState.ui.upgrades.selectedIndex];
                if (upgrade) buyUpgrade(upgrade.id);
            }
        },
    };
    if (map[key]) map[key]();
}

function handleSmallInput(key: string) {
    if (appState.screen === "main") {
        const map: Record<string, () => void> = {
            " ": clickCookie,
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
        if (key === "j") moveWorkerSelection(1);
        if (key === "k") moveWorkerSelection(-1);
        if (key === "b") {
            const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
            if (worker) buyWorker(worker.id);
        }
    } else if (appState.screen === "upgrades") {
        if (key === "\b" || key === "\x7f") {
            appState.screen = "main";
            appState.ui.focus = "main";
            return;
        }
        if (key === "j") moveUpgradeSelection(1);
        if (key === "k") moveUpgradeSelection(-1);
        if (key === "b") {
            const filtered = getFilteredUpgrades();
            const upgrade = filtered[appState.ui.upgrades.selectedIndex];
            if (upgrade) buyUpgrade(upgrade.id);
        }
    }
}
