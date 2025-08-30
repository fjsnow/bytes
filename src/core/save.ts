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
            .query("SELECT progress, settings FROM accounts WHERE id = ?")
            .get(accountId) as
            | { progress: string; settings: string }
            | undefined;

        if (isNewAccount || !accountDataRow) {
            logger.info(
                `Initializing or re-initializing account data for new/missing account ${accountId}.`,
            );
            const initialProgress = JSON.stringify({
                cookies: createInitialGameState().cookies.toString(),
                cps: createInitialGameState().cps.toString(),
                workers: createInitialGameState().workers,
                upgrades: createInitialGameState().upgrades,
                prestige: createInitialGameState().prestige,
            });
            const initialSettings = JSON.stringify({
                pureBlackBackground: appState.ui.settings.pureBlackBackground,
                reduceFallingBits: appState.ui.settings.reduceFallingBits,
                disableFallingBits: appState.ui.settings.disableFallingBits,
            });

            db.run(
                "INSERT OR REPLACE INTO accounts (id, progress, settings) VALUES (?, ?, ?)",
                [accountId, initialProgress, initialSettings],
            );
            accountDataRow = {
                progress: initialProgress,
                settings: initialSettings,
            };
        }

        try {
            const parsedProgress = JSON.parse(accountDataRow.progress);
            gameState.cookies = BigInt(parsedProgress.cookies);
            gameState.cps = BigInt(parsedProgress.cps);
            Object.assign(gameState.workers, parsedProgress.workers);
            Object.assign(gameState.upgrades, parsedProgress.upgrades);
            gameState.prestige = parsedProgress.prestige;

            const parsedSettings = JSON.parse(accountDataRow.settings);
            if (parsedSettings) {
                appState.ui.settings.pureBlackBackground =
                    parsedSettings.pureBlackBackground ?? false;
                appState.ui.settings.reduceFallingBits =
                    parsedSettings.reduceFallingBits ?? false;

                appState.ui.settings.disableFallingBits =
                    parsedSettings.disableFallingBits ?? false;
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
                gameState.cookies = BigInt(parsed.progress.cookies);
                gameState.cps = BigInt(parsed.progress.cps);
                Object.assign(gameState.workers, parsed.progress.workers);
                Object.assign(gameState.upgrades, parsed.progress.upgrades);
                gameState.prestige = parsed.progress.prestige;

                if (parsed.settings) {
                    appState.ui.settings.pureBlackBackground =
                        parsed.settings.pureBlackBackground ?? false;
                    appState.ui.settings.reduceFallingBits =
                        parsed.settings.reduceFallingBits ?? false;
                    appState.ui.settings.disableFallingBits =
                        parsed.settings.disableFallingBits ?? false;
                }
            } catch (e) {
                console.error("Failed to parse local save", e);
            }
        }
    }

    const saveGame = () => {
        if (!hasLock) return;

        const progressToSave = {
            cookies: gameState.cookies.toString(),
            cps: gameState.cps.toString(),
            workers: gameState.workers,
            upgrades: gameState.upgrades,
            prestige: gameState.prestige,
        };

        const settingsToSave = {
            pureBlackBackground: appState.ui.settings.pureBlackBackground,
            reduceFallingBits: appState.ui.settings.reduceFallingBits,
            disableFallingBits: appState.ui.settings.disableFallingBits,
        };

        if (appState.mode === "ssh") {
            logger.info(
                "Saving game state to database for accountId: " +
                    appState.ssh!.accountId,
            );
            const ssh = appState.ssh!;
            ssh!.db.run(
                "UPDATE accounts SET progress = ?, settings = ? WHERE id = ?",
                [
                    JSON.stringify(progressToSave),
                    JSON.stringify(settingsToSave),
                    ssh.accountId,
                ],
            );
        } else {
            writeFileSync(
                SAVE_FILE,
                JSON.stringify(
                    {
                        progress: progressToSave,
                        settings: settingsToSave,
                    },
                    null,
                    2,
                ),
            );
        }
    };

    return {
        saveGame,
        releaseLock: cleanupLock,
    };
}
