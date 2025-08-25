import { writeFileSync, readFileSync, existsSync, unlinkSync } from "fs";
import { Database } from "bun:sqlite";
import { gameState } from "../game/state";

const SAVE_FILE = "save.json";
const LOCK_FILE = "save.json.lock";
const DB_FILE = "saves.db";

let db: Database | null = null;
let playerKey: string | null = null;
let hasLock = false;

export function initSaveSystem(pubkey: string | null) {
    playerKey = pubkey;

    if (playerKey) {
        db = new Database(DB_FILE);
        db.run("PRAGMA journal_mode = WAL;");
        db.run("PRAGMA synchronous = NORMAL;");

        db.run(`
      CREATE TABLE IF NOT EXISTS saves (
        pubkey TEXT PRIMARY KEY,
        data TEXT NOT NULL
      )
    `);

        db.run(`
      CREATE TABLE IF NOT EXISTS locks (
        pubkey TEXT PRIMARY KEY
      )
    `);

        try {
            db.run("INSERT INTO locks (pubkey) VALUES (?)", [playerKey]);
            hasLock = true;
        } catch {
            console.error(`Save for pubkey ${playerKey} is already in use.`);
            process.exit(1);
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
    } else {
        if (existsSync(LOCK_FILE)) {
            console.error("Local save is already in use.");
            process.exit(1);
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

    setInterval(() => saveGame(), 10000);

    const cleanup = () => {
        saveGame();
        releaseLock();
    };
    process.on("exit", cleanup);
    process.on("SIGINT", () => {
        cleanup();
        process.exit(0);
    });
    process.on("SIGTERM", () => {
        cleanup();
        process.exit(0);
    });
}

export function saveGame() {
    if (!hasLock) return;

    if (playerKey && db) {
        db.run("INSERT OR REPLACE INTO saves (pubkey, data) VALUES (?, ?)", [
            playerKey,
            JSON.stringify(gameState),
        ]);
    } else {
        writeFileSync(SAVE_FILE, JSON.stringify(gameState, null, 2));
    }
}

function releaseLock() {
    if (!hasLock) return;

    if (playerKey && db) {
        db.run("DELETE FROM locks WHERE pubkey = ?", [playerKey]);
    } else if (existsSync(LOCK_FILE)) {
        try {
            unlinkSync(LOCK_FILE);
        } catch {}
    }
    hasLock = false;
}
