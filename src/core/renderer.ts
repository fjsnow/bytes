import { updateFps } from "./fps";
import type { GameSession } from "../game/session";

let interval: NodeJS.Timeout | null = null;
const activeSessions = new Set<GameSession>();

export const FPS = 20;

export function registerSession(session: GameSession) {
    activeSessions.add(session);
}

export function unregisterSession(session: GameSession) {
    activeSessions.delete(session);
}

export function startRenderer() {
    stopRenderer();
    interval = setInterval(() => {
        updateFps();
        for (const session of activeSessions) {
            session.render();
        }
    }, 1000 / FPS);
}

export function stopRenderer() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}
