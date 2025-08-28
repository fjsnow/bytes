import type { ITerminal } from "../core/terminal";
import {
    createInitialGameState,
    type AppState,
    type GameState,
    type Focus,
} from "./state";
import { initSaveSystem, type SaveSystemInstance } from "../core/save";
import { tickBits } from "./logic/bits";
import { tickCookie } from "./logic/cookie";
import { drawBits } from "./ui/bits";
import { drawCookie } from "./ui/cookie";
import { drawStats } from "./ui/stats";
import { drawUpgrades } from "./ui/upgrades";
import { drawWorkers } from "./ui/workers";
import {
    clickCookie as clickCookieSystem,
    buyWorker,
    buyUpgrade,
    recalcCps,
} from "./systems";
import { WORKER_DATA } from "./data/workers";
import { UPGRADE_DATA } from "./data/upgrades";
import chalk from "chalk";
import { drawWatermark } from "./ui/watermark";
import { logger, redactPlayerKey } from "../utils/logger";

function getFilteredUpgrades(
    appState: AppState,
    gameState: GameState,
    currentUpgradeData: typeof UPGRADE_DATA,
) {
    return currentUpgradeData.filter((u) => {
        if (appState.ui.upgradesShowMaxed) return true;
        const owned = gameState.upgrades[u.id] || 0;
        return u.maxOwned === undefined || owned < u.maxOwned;
    });
}

function ensureUpgradeVisible(
    appState: AppState,
    terminal: ITerminal,
    filteredUpgrades: typeof UPGRADE_DATA,
) {
    const { height } = terminal.getSize();
    const maxPerUpgrade = 5;
    const maxVisible = Math.floor((height - 3) / maxPerUpgrade);

    const sel = appState.ui.upgrades.selectedIndex;
    let scroll = appState.ui.upgrades.scrollOffset;

    if (sel < scroll) {
        scroll = sel;
    } else if (sel >= scroll + maxVisible) {
        scroll = sel - maxVisible + 1;
    }

    const maxScroll = Math.max(0, filteredUpgrades.length - maxVisible);
    if (scroll > maxScroll) {
        scroll = maxScroll;
    }

    appState.ui.upgrades.scrollOffset = Math.max(0, scroll);
}

function moveWorkerSelection(
    appState: AppState,
    terminal: ITerminal,
    delta: number,
    currentWorkerData: typeof WORKER_DATA,
) {
    const { height } = terminal.getSize();
    const maxVisible = Math.floor((height - 3) / 4);
    appState.ui.workers.selectedIndex += delta;
    if (appState.ui.workers.selectedIndex < 0)
        appState.ui.workers.selectedIndex = 0;
    if (appState.ui.workers.selectedIndex >= currentWorkerData.length)
        appState.ui.workers.selectedIndex = currentWorkerData.length - 1;
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

function moveUpgradeSelection(
    appState: AppState,
    terminal: ITerminal,
    delta: number,
    gameState: GameState,
    currentUpgradeData: typeof UPGRADE_DATA,
) {
    const filtered = getFilteredUpgrades(
        appState,
        gameState,
        currentUpgradeData,
    );
    appState.ui.upgrades.selectedIndex += delta;
    if (appState.ui.upgrades.selectedIndex < 0)
        appState.ui.upgrades.selectedIndex = 0;
    if (appState.ui.upgrades.selectedIndex >= filtered.length)
        appState.ui.upgrades.selectedIndex = filtered.length - 1;

    ensureUpgradeVisible(appState, terminal, filtered);
}

function cycleFocus(appState: AppState) {
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

function handleLargeInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    const map: Record<string, () => void> = {
        " ": () => clickCookieSystem(appState, gameState, terminal),
        w: () => {
            appState.ui.focus = "workers";
        },
        u: () => {
            appState.ui.focus = "upgrades";
        },
        j: () => {
            if (appState.ui.focus === "workers")
                moveWorkerSelection(appState, terminal, 1, WORKER_DATA);
            if (appState.ui.focus === "upgrades")
                moveUpgradeSelection(
                    appState,
                    terminal,
                    1,
                    gameState,
                    UPGRADE_DATA,
                );
        },
        k: () => {
            if (appState.ui.focus === "workers")
                moveWorkerSelection(appState, terminal, -1, WORKER_DATA);
            if (appState.ui.focus === "upgrades")
                moveUpgradeSelection(
                    appState,
                    terminal,
                    -1,
                    gameState,
                    UPGRADE_DATA,
                );
        },
        b: () => {
            if (appState.ui.focus === "workers") {
                const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
                if (worker) buyWorker(worker.id, gameState);
            } else if (appState.ui.focus === "upgrades") {
                const filtered = getFilteredUpgrades(
                    appState,
                    gameState,
                    UPGRADE_DATA,
                );
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
        " ": () => clickCookieSystem(appState, gameState, terminal),
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
                moveWorkerSelection(appState, terminal, 1, WORKER_DATA);
            if (appState.ui.focus === "upgrades")
                moveUpgradeSelection(
                    appState,
                    terminal,
                    1,
                    gameState,
                    UPGRADE_DATA,
                );
        },
        k: () => {
            if (appState.ui.focus === "workers")
                moveWorkerSelection(appState, terminal, -1, WORKER_DATA);
            if (appState.ui.focus === "upgrades")
                moveUpgradeSelection(
                    appState,
                    terminal,
                    -1,
                    gameState,
                    UPGRADE_DATA,
                );
        },
        b: () => {
            if (appState.ui.focus === "workers") {
                const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
                if (worker) buyWorker(worker.id, gameState);
            } else if (appState.ui.focus === "upgrades") {
                const filtered = getFilteredUpgrades(
                    appState,
                    gameState,
                    UPGRADE_DATA,
                );
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
            " ": () => clickCookieSystem(appState, gameState, terminal),
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
        if (key === "j")
            moveWorkerSelection(appState, terminal, 1, WORKER_DATA);
        if (key === "k")
            moveWorkerSelection(appState, terminal, -1, WORKER_DATA);
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
        if (key === "j")
            moveUpgradeSelection(
                appState,
                terminal,
                1,
                gameState,
                UPGRADE_DATA,
            );
        if (key === "k")
            moveUpgradeSelection(
                appState,
                terminal,
                -1,
                gameState,
                UPGRADE_DATA,
            );
        if (key === "b") {
            const filtered = getFilteredUpgrades(
                appState,
                gameState,
                UPGRADE_DATA,
            );
            const upgrade = filtered[appState.ui.upgrades.selectedIndex];
            if (upgrade) buyUpgrade(upgrade.id, gameState);
        }
    }
}

export class GameSession {
    public id: string;
    public terminal: ITerminal;
    public appState: AppState;
    public gameState: GameState;
    public playerKey: string | null;
    public username: string | null;
    private saveSystem: SaveSystemInstance | null = null;

    constructor(
        id: string,
        terminal: ITerminal,
        playerKey: string | null,
        appState: AppState,
        username: string | null = null,
    ) {
        this.id = id;
        this.terminal = terminal;
        this.gameState = createInitialGameState();
        this.playerKey = playerKey;
        this.appState = appState;
        this.username = username;
    }

    public init(sharedDb?: any) {
        this.terminal.setup();

        try {
            const saveSystemResult = initSaveSystem(
                this.playerKey,
                this.gameState,
                sharedDb,
            );
            if (!saveSystemResult) {
                if (!this.playerKey) {
                    process.exit(1);
                }
                return false;
            }
            this.saveSystem = saveSystemResult;
        } catch (e: any) {
            console.error(e.message);
            if (!this.playerKey) {
                process.exit(1);
            }
            return false;
        }

        this.terminal.onKey((key: string) => this.handleKey(key));

        recalcCps(this.gameState);

        return true;
    }

    public saveGameNow() {
        this.saveSystem?.saveGame();
    }

    public tick() {
        tickCookie(this.appState, this.gameState, this.terminal);
        tickBits(this.appState, this.terminal);

        if (this.appState.ui.highlightTicks > 0) {
            this.appState.ui.highlightTicks -= 1;
        }
    }

    public render() {
        this.terminal.clear();

        if (this.appState.layout === "large") {
            this.renderLarge();
        } else if (this.appState.layout === "medium") {
            this.renderMedium();
        } else {
            this.renderSmall();
        }

        this.terminal.render();
    }

    private renderLarge() {
        drawBits(this.appState, this.terminal);
        drawCookie(this.appState, this.terminal);
        drawStats(this.appState, this.gameState, this.terminal);
        drawWorkers(this.appState, this.gameState, this.terminal);
        drawUpgrades(this.appState, this.gameState, this.terminal);
        drawWatermark(this.terminal);
    }

    private renderMedium() {
        drawBits(this.appState, this.terminal);
        this.drawNavBar();
        drawCookie(this.appState, this.terminal);
        drawStats(this.appState, this.gameState, this.terminal);
        if (this.appState.screen === "workers") {
            drawWorkers(this.appState, this.gameState, this.terminal);
        } else if (this.appState.screen === "upgrades") {
            drawUpgrades(this.appState, this.gameState, this.terminal);
        }
        drawWatermark(this.terminal);
    }

    private renderSmall() {
        drawBits(this.appState, this.terminal);
        this.drawNavBar();
        if (this.appState.screen === "main") {
            drawCookie(this.appState, this.terminal);
            drawStats(this.appState, this.gameState, this.terminal);
        } else if (this.appState.screen === "workers") {
            drawWorkers(this.appState, this.gameState, this.terminal);
        } else if (this.appState.screen === "upgrades") {
            drawUpgrades(this.appState, this.gameState, this.terminal);
        }
        drawWatermark(this.terminal);
    }

    private drawNavBar() {
        if (this.appState.layout === "medium") {
            const workersText = "[W]orkers ";
            const upgradesText = "[U]pgrades";
            const totalLength = workersText.length + upgradesText.length;
            const { x: startX } = this.terminal.getCenterForSize(
                totalLength,
                0,
            );

            this.terminal.draw(
                startX,
                0,
                workersText,
                this.appState.screen === "workers"
                    ? chalk.yellow.bold
                    : chalk.gray,
            );

            this.terminal.draw(
                startX + workersText.length,
                0,
                upgradesText,
                this.appState.screen === "upgrades"
                    ? chalk.blue.bold
                    : chalk.gray,
            );
        } else if (this.appState.layout === "small") {
            if (this.appState.screen === "main") {
                const text = "[W]orkers  [U]pgrades";
                const { x } = this.terminal.getCenterForSize(text.length, 0);
                this.terminal.draw(x, 0, text, chalk.gray);
            } else {
                const text = "[backspace] to return";
                const { x } = this.terminal.getCenterForSize(text.length, 0);
                this.terminal.draw(x, 0, text, chalk.gray);
            }
        }
    }

    public handleKey(key: string) {
        if (key === "q") {
            this.terminal.destroy();
            return;
        }

        if (key === "\t") {
            cycleFocus(this.appState);
            return;
        }

        if (this.appState.layout === "large") {
            handleLargeInput(this.appState, this.gameState, this.terminal, key);
        } else if (this.appState.layout === "medium") {
            handleMediumInput(
                this.appState,
                this.gameState,
                this.terminal,
                key,
            );
        } else {
            handleSmallInput(this.appState, this.gameState, this.terminal, key);
        }

        if (key.toLowerCase() === "h") {
            const prevFiltered = getFilteredUpgrades(
                this.appState,
                this.gameState,
                UPGRADE_DATA,
            );
            const prevUpgrade =
                prevFiltered[this.appState.ui.upgrades.selectedIndex];

            this.appState.ui.upgradesShowMaxed =
                !this.appState.ui.upgradesShowMaxed;

            const newFiltered = getFilteredUpgrades(
                this.appState,
                this.gameState,
                UPGRADE_DATA,
            );

            if (prevUpgrade) {
                const newIndex = newFiltered.findIndex(
                    (u) => u.id === prevUpgrade.id,
                );
                if (newIndex !== -1) {
                    this.appState.ui.upgrades.selectedIndex = newIndex;
                } else {
                    this.appState.ui.upgrades.selectedIndex = Math.max(
                        0,
                        this.appState.ui.upgrades.selectedIndex - 1,
                    );
                }
            }
            ensureUpgradeVisible(this.appState, this.terminal, newFiltered);
        }
    }

    public async destroy() {
        this.saveSystem?.saveGame();
        if (this.playerKey) {
            logger.info(
                `Saving game data on disconnect for player ${redactPlayerKey(this.playerKey)} (${this.username || "N/A"})`,
            );
        }
        this.saveSystem?.releaseLock();
        this.terminal.destroy();
    }
}
