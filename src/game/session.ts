import chalk from "chalk";
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
import { drawSettings } from "./ui/settings";
import { recalcCps, calculatePrestigeCost } from "./systems";
import { drawFooter } from "./ui/footer";
import { drawDebug } from "./ui/debug";
import { logger } from "../utils/logger";
import { handleGameInput } from "./input";

export class GameSession {
    public terminal: ITerminal;
    public appState: AppState;
    public gameState: GameState;
    private saveSystem: SaveSystemInstance | null = null;

    constructor(terminal: ITerminal, appState: AppState) {
        this.terminal = terminal;
        this.appState = appState;
        this.gameState = createInitialGameState();
    }

    public init() {
        this.terminal.setup();

        try {
            const saveSystemResult = initSaveSystem(
                this.appState,
                this.gameState,
            );
            if (!saveSystemResult) {
                process.exit(1);
            }
            this.saveSystem = saveSystemResult;
        } catch (e: any) {
            console.error(e.message);
            process.exit(1);
        }

        this.terminal.onKey((key: string) => this.handleKey(key));
        recalcCps(this.gameState);
        calculatePrestigeCost(this.gameState);
        this.gameState.prestigeMultiplier = 2 ** this.gameState.prestige;
        return true;
    }

    public saveGameNow() {
        this.saveSystem?.saveGame();
    }

    public tick() {
        tickCookie(this.appState, this.gameState, this.terminal);
        tickBits(this.appState, this.terminal);

        this.gameState.ticksPlayed++;
        this.gameState.ticksPlayedThisPrestige++;

        if (this.appState.ui.highlightTicks > 0) {
            this.appState.ui.highlightTicks -= 1;
        }
        calculatePrestigeCost(this.gameState);
    }

    public render() {
        this.terminal.clear();
        drawBits(this.appState, this.terminal);

        this.drawNavBar();
        drawFooter(this.gameState, this.terminal);

        if (this.appState.screen === "main") {
            if (this.appState.layout === "large") {
                this.renderLargeMain();
            } else if (this.appState.layout === "medium") {
                this.renderMediumMain();
            } else {
                this.renderSmallMain();
            }
        } else if (this.appState.screen === "settings") {
            drawSettings(this.appState, this.gameState, this.terminal);
        } else if (this.appState.screen === "workers") {
            drawWorkers(this.appState, this.gameState, this.terminal);
        } else if (this.appState.screen === "upgrades") {
            drawUpgrades(this.appState, this.gameState, this.terminal);
        }

        if (this.appState.debug) {
            drawDebug(this.appState, this.terminal);
        }

        this.terminal.render();
    }

    private renderLargeMain() {
        drawCookie(this.appState, this.gameState, this.terminal);
        drawStats(this.appState, this.gameState, this.terminal);
        drawWorkers(this.appState, this.gameState, this.terminal);
        drawUpgrades(this.appState, this.gameState, this.terminal);
    }

    private renderMediumMain() {
        drawCookie(this.appState, this.gameState, this.terminal);
        drawStats(this.appState, this.gameState, this.terminal);
        if (this.appState.ui.focus === "workers") {
            drawWorkers(this.appState, this.gameState, this.terminal);
        } else if (this.appState.ui.focus === "upgrades") {
            drawUpgrades(this.appState, this.gameState, this.terminal);
        }
    }

    private renderSmallMain() {
        drawCookie(this.appState, this.gameState, this.terminal);
        drawStats(this.appState, this.gameState, this.terminal);
    }

    private drawNavBar() {
        const settingsText = "[S]ettings";

        if (this.appState.screen !== "main") {
            const backText = "[backspace] to return";
            const { x } = this.terminal.getCenterForSize(backText.length, 0);
            this.terminal.draw(x, 0, backText, chalk.gray);
            return;
        }

        if (this.appState.layout === "large") {
            const { x: startX } = this.terminal.getCenterForSize(
                settingsText.length,
                0,
            );
            this.terminal.draw(startX, 0, settingsText, chalk.gray);
        } else if (this.appState.layout === "medium") {
            const workersText = "[W]orkers";
            const upgradesText = "[U]pgrades";
            const totalLength =
                workersText.length + upgradesText.length + settingsText.length;
            const { x: startX } = this.terminal.getCenterForSize(
                totalLength + 6,
                0,
            );

            let currentX = startX;

            this.terminal.draw(
                currentX,
                0,
                workersText,
                this.appState.ui.focus === "workers"
                    ? chalk.yellow.bold
                    : chalk.gray,
            );
            currentX += workersText.length + 3;

            this.terminal.draw(
                currentX,
                0,
                upgradesText,
                this.appState.ui.focus === "upgrades"
                    ? chalk.blue.bold
                    : chalk.gray,
            );
            currentX += upgradesText.length + 3;

            this.terminal.draw(currentX, 0, settingsText, chalk.gray);
        } else if (this.appState.layout === "small") {
            const text = "[W]orkers  [U]pgrades  [S]ettings";
            const { x } = this.terminal.getCenterForSize(text.length, 0);
            this.terminal.draw(x, 0, text, chalk.gray);
        }
    }

    public handleKey(key: string) {
        handleGameInput(this, key);
    }

    public destroy() {
        this.saveSystem?.saveGame();
        if (this.appState.mode === "ssh") {
            logger.info(
                `Disconnected from account ${this.appState.ssh!.accountId}`,
            );
        }
        this.saveSystem?.releaseLock();
        this.terminal.destroy();
    }
}
