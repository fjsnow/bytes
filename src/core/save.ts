import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import type { GameState, AppState } from "../game/state";
import { logger } from "../utils/logger";
import { createInitialGameState } from "../game/state";
import { recalcCps } from "../game/systems";

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

            const initialGameState = createInitialGameState();
            const initialProgress = JSON.stringify({
                cookies: initialGameState.cookies.toString(),
                workers: initialGameState.workers,
                upgrades: initialGameState.upgrades,
                prestige: initialGameState.prestige,
                prestigeMultiplier: initialGameState.prestigeMultiplier,
                ticksPlayed: initialGameState.ticksPlayed,
                ticksPlayedThisPrestige:
                    initialGameState.ticksPlayedThisPrestige,
                cookiesEarnedThisPrestige:
                    initialGameState.cookiesEarnedThisPrestige.toString(),
                totalCookiesEarned:
                    initialGameState.totalCookiesEarned.toString(),
            });
            const initialSettings = JSON.stringify({
                pureBlackBackground: appState.ui.settings.pureBlackBackground,
                fallingBits: appState.ui.settings.fallingBits,
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
            Object.assign(gameState.workers, parsedProgress.workers);
            Object.assign(gameState.upgrades, parsedProgress.upgrades);
            gameState.prestige = parsedProgress.prestige ?? 0;
            gameState.prestigeMultiplier =
                parsedProgress.prestigeMultiplier ?? 1;
            gameState.ticksPlayed = parsedProgress.ticksPlayed ?? 0;
            gameState.ticksPlayedThisPrestige =
                parsedProgress.ticksPlayedThisPrestige ?? 0;
            gameState.cookiesEarnedThisPrestige = BigInt(
                parsedProgress.cookiesEarnedThisPrestige ?? "0",
            );
            gameState.totalCookiesEarned = BigInt(
                parsedProgress.totalCookiesEarned ?? "0",
            );
            recalcCps(gameState);

            const parsedSettings = JSON.parse(accountDataRow.settings);
            if (parsedSettings) {
                appState.ui.settings.pureBlackBackground =
                    parsedSettings.pureBlackBackground ?? false;
                appState.ui.settings.fallingBits =
                    parsedSettings.fallingBits ?? "full";
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
                Object.assign(gameState.workers, parsed.progress.workers);
                Object.assign(gameState.upgrades, parsed.progress.upgrades);
                gameState.prestige = parsed.progress.prestige ?? 0;
                gameState.prestigeMultiplier =
                    parsed.progress.prestigeMultiplier ?? 1;
                gameState.ticksPlayed = parsed.progress.ticksPlayed ?? 0;
                gameState.ticksPlayedThisPrestige =
                    parsed.progress.ticksPlayedThisPrestige ?? 0;
                gameState.cookiesEarnedThisPrestige = BigInt(
                    parsed.progress.cookiesEarnedThisPrestige ?? "0",
                );
                gameState.totalCookiesEarned = BigInt(
                    parsed.progress.totalCookiesEarned ?? "0",
                );
                recalcCps(gameState);

                if (parsed.settings) {
                    appState.ui.settings.pureBlackBackground =
                        parsed.settings.pureBlackBackground ?? false;
                    appState.ui.settings.fallingBits =
                        parsed.settings.fallingBits ?? "full";
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
            workers: gameState.workers,
            upgrades: gameState.upgrades,
            prestige: gameState.prestige,
            prestigeMultiplier: gameState.prestigeMultiplier,
            ticksPlayed: gameState.ticksPlayed,
            ticksPlayedThisPrestige: gameState.ticksPlayedThisPrestige,
            cookiesEarnedThisPrestige:
                gameState.cookiesEarnedThisPrestige.toString(),
            totalCookiesEarned: gameState.totalCookiesEarned.toString(),
        };

        const settingsToSave = {
            pureBlackBackground: appState.ui.settings.pureBlackBackground,
            fallingBits: appState.ui.settings.fallingBits,
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
