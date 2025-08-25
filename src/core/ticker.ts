import { tickBits } from "../game/logic/bits";
import { tickCookie } from "../game/logic/cookie";

let interval: NodeJS.Timeout | null = null;

export const TPS = 25;

export function startTicker() {
    stopTicker();
    interval = setInterval(() => {
        tickCookie();
        tickBits();
    }, 1000 / TPS);
}

export function stopTicker() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}
