import type { GameSession } from "../game/session";
import { logger } from "../utils/logger";

let tickInterval: NodeJS.Timeout | null = null;
const activeSessions = new Set<GameSession>();
let isServerMode: boolean = false;
let lastSaveTime: number = 0;

const AUTOSAVE_INTERVAL_MS = 60 * 1000;

export const TPS = 20;

export function registerSession(session: GameSession) {
    activeSessions.add(session);
}

export function unregisterSession(session: GameSession) {
    activeSessions.delete(session);
}

export function startTicker(serverMode: boolean = false) {
    stopTicker();
    isServerMode = serverMode;
    lastSaveTime = Date.now();

    tickInterval = setInterval(() => {
        for (const session of activeSessions) {
            session.tick();
        }

        if (isServerMode && Date.now() - lastSaveTime >= AUTOSAVE_INTERVAL_MS) {
            for (const session of activeSessions) {
                session.saveGameNow();
            }
            logger.info(`Autosaving ${activeSessions.size} sessions.`);
            lastSaveTime = Date.now();
        }
    }, 1000 / TPS);
}

export function stopTicker() {
    if (tickInterval) {
        clearInterval(tickInterval);
        tickInterval = null;
    }
}
