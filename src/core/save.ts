import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import type { GameState, AppState } from "../game/state";
import { logger } from "../utils/logger";
import { createInitialGameState } from "../game/state";

const SAVE_FILE = "save.json";
const LOCK_FILE = "save.json.lock";

export interface SaveSystemInstance {
    saveGame(): void;
    releaseLock(): void;
}

export function initSaveSystem(
    appState: AppState,
    gameState: GameState,
): SaveSystemInstance | null {
    let hasLock = false;

    const cleanupLock = () => {
        if (!hasLock) return;
        if (appState.mode === "standalone" && existsSync(LOCK_FILE)) {
            try {
                unlinkSync(LOCK_FILE);
            } catch {}
        }
        hasLock = false;
    };

    if (appState.mode === "ssh") {
        const ssh = appState.ssh!;
        const db = ssh.db;
        const accountId = ssh.accountId;
        const isNewAccount = ssh.isNewAccount;

        let accountDataRow = db
            .query("SELECT data FROM accounts WHERE id = ?")
            .get(accountId) as { data: string } | undefined;

        if (isNewAccount || !accountDataRow) {
            logger.info(
                `Initializing or re-initializing account data for new/missing account ${accountId}.`,
            );
            const initialData = {
                gameState: {
                    cookies: createInitialGameState().cookies.toString(),
                    cps: createInitialGameState().cps.toString(),
                    workers: createInitialGameState().workers,
                    upgrades: createInitialGameState().upgrades,
                    prestige: createInitialGameState().prestige,
                },
                appSettings: {
                    ui: {
                        settings: {
                            pureBlackBackground:
                                appState.ui.settings.pureBlackBackground,
                            reduceFallingBits:
                                appState.ui.settings.reduceFallingBits,
                            disableFallingBits:
                                appState.ui.settings.disableFallingBits,
                        },
                    },
                },
            };
            db.run("INSERT OR REPLACE INTO accounts (id, data) VALUES (?, ?)", [
                accountId,
                JSON.stringify(initialData),
            ]);
            accountDataRow = { data: JSON.stringify(initialData) };
        }

        try {
            const parsedData = JSON.parse(accountDataRow.data);
            gameState.cookies = BigInt(parsedData.gameState.cookies);
            gameState.cps = BigInt(parsedData.gameState.cps);
            Object.assign(gameState.workers, parsedData.gameState.workers);
            Object.assign(gameState.upgrades, parsedData.gameState.upgrades);
            gameState.prestige = parsedData.gameState.prestige;

            if (parsedData.appSettings?.ui?.settings) {
                appState.ui.settings.pureBlackBackground =
                    parsedData.appSettings.ui.settings.pureBlackBackground ??
                    false;
                appState.ui.settings.reduceFallingBits =
                    parsedData.appSettings.ui.settings.reduceFallingBits ??
                    false;

                appState.ui.settings.disableFallingBits =
                    parsedData.appSettings.ui.settings.disableFallingBits ??
                    false;
            }
            logger.info(`Loaded game state for account ${accountId}.`);
        } catch (e) {
            logger.error(`Failed to parse save for account ${accountId}`, e);
        }
        hasLock = true;
    } else {
        if (existsSync(LOCK_FILE)) {
            try {
                process.stderr.write(
                    "\n" +
                        "  Oh no! Your local save is currently in use." +
                        "  If this is a mistake, run 'rm " +
                        LOCK_FILE +
                        "' and try again.\n" +
                        "\n",
                );
                return null;
            } catch (e: any) {
                if (e.code === "ESRCH") {
                    unlinkSync(LOCK_FILE);
                } else {
                    throw e;
                }
            }
        }

        writeFileSync(LOCK_FILE, String(process.pid));
        hasLock = true;

        if (existsSync(SAVE_FILE)) {
            try {
                const parsed = JSON.parse(readFileSync(SAVE_FILE, "utf8"));
                gameState.cookies = BigInt(parsed.gameState.cookies);
                gameState.cps = BigInt(parsed.gameState.cps);
                Object.assign(gameState.workers, parsed.gameState.workers);
                Object.assign(gameState.upgrades, parsed.gameState.upgrades);
                gameState.prestige = parsed.gameState.prestige;

                if (parsed.appSettings?.ui?.settings) {
                    appState.ui.settings.pureBlackBackground =
                        parsed.appSettings.ui.settings.pureBlackBackground ??
                        false;
                    appState.ui.settings.reduceFallingBits =
                        parsed.appSettings.ui.settings.reduceFallingBits ??
                        false;
                    appState.ui.settings.disableFallingBits =
                        parsed.appSettings.ui.settings.disableFallingBits ??
                        false;
                }
            } catch (e) {
                console.error("Failed to parse local save", e);
            }
        }
    }

    const saveGame = () => {
        if (!hasLock) return;

        const dataToSave = {
            gameState: {
                cookies: gameState.cookies.toString(),
                cps: gameState.cps.toString(),
                workers: gameState.workers,
                upgrades: gameState.upgrades,
                prestige: gameState.prestige,
            },
            appSettings: {
                ui: {
                    settings: {
                        pureBlackBackground:
                            appState.ui.settings.pureBlackBackground,
                        reduceFallingBits:
                            appState.ui.settings.reduceFallingBits,
                        disableFallingBits:
                            appState.ui.settings.disableFallingBits,
                    },
                },
            },
        };

        if (appState.mode === "ssh") {
            logger.info(
                "Saving game state to database for accountId: " +
                    appState.ssh!.accountId,
            );
            const ssh = appState.ssh!;
            ssh!.db.run("UPDATE accounts SET data = ? WHERE id = ?", [
                JSON.stringify(dataToSave),
                ssh.accountId,
            ]);
        } else {
            writeFileSync(SAVE_FILE, JSON.stringify(dataToSave, null, 2));
        }
    };

    return {
        saveGame,
        releaseLock: cleanupLock,
    };
}
