import type { ITerminal } from "../core/terminal";
import { createInitialGameState, type AppState, type GameState } from "./state";
import { initSaveSystem, type SaveSystemInstance } from "../core/save";
import { tickBits } from "./logic/bits";
import { tickCookie } from "./logic/cookie";
import { drawBits } from "./ui/bits";
import { drawCookie } from "./ui/cookie";
import { drawStats } from "./ui/stats";
import { drawUpgrades } from "./ui/upgrades";
import { drawWorkers } from "./ui/workers";
import { recalcCps } from "./systems";
import { UPGRADE_DATA } from "./data/upgrades";
import chalk from "chalk";
import { drawWatermark } from "./ui/watermark";
import { logger, redactPlayerKey } from "../utils/logger";
import {
    handleGameInput,
    getFilteredUpgrades,
    ensureUpgradeVisible,
} from "./input";

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
        handleGameInput(this.appState, this.gameState, this.terminal, key);
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
