import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { Database } from "bun:sqlite";
import type { GameState } from "../game/state";

const SAVE_FILE = "save.json";
const LOCK_FILE = "save.json.lock";
const DB_FILE = "saves.db";

export interface SaveSystemInstance {
    saveGame(): void;
    releaseLock(): void;
}

export function initSaveSystem(
    playerKey: string | null,
    gameState: GameState,
    sharedDb: Database | null = null,
): SaveSystemInstance | null {
    let db: Database | null = sharedDb;
    let hasLock = false;

    const cleanupLock = () => {
        if (!hasLock) return;
        if (!playerKey && existsSync(LOCK_FILE)) {
            try {
                unlinkSync(LOCK_FILE);
            } catch {}
        }
        hasLock = false;
    };

    if (playerKey) {
        if (!db) {
            db = new Database(DB_FILE);
            db.run("PRAGMA journal_mode = WAL;");
            db.run("PRAGMA synchronous = NORMAL;");

            db.run(`
                CREATE TABLE IF NOT EXISTS saves (
                    pubkey TEXT PRIMARY KEY,
                    data TEXT NOT NULL
                )
            `);
        }

        const row = db
            .query("SELECT data FROM saves WHERE pubkey = ?")
            .get(playerKey);

        if (row) {
            try {
                const parsed = JSON.parse((row as any).data);
                Object.assign(gameState, parsed);
            } catch (e) {
                console.error("Failed to parse save for", playerKey, e);
            }
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
                Object.assign(gameState, parsed);
            } catch (e) {
                console.error("Failed to parse local save", e);
            }
        }
    }

    const saveGame = () => {
        if (!hasLock) return;

        if (playerKey && db) {
            db.run(
                "INSERT OR REPLACE INTO saves (pubkey, data) VALUES (?, ?)",
                [playerKey, JSON.stringify(gameState)],
            );
        } else if (!playerKey) {
            writeFileSync(SAVE_FILE, JSON.stringify(gameState, null, 2));
        }
    };

    return {
        saveGame,
        releaseLock: cleanupLock,
    };
}
