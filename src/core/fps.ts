let lastTime = process.hrtime.bigint();
let fps = 0;

export function updateFps() {
    const now = process.hrtime.bigint();
    const deltaNs = now - lastTime;
    lastTime = now;

    if (deltaNs > 0n) {
        const deltaMs = Number(deltaNs) / 1e6;
        fps = Math.round(1000 / deltaMs);
    }
}

export function getFps() {
    return fps;
}
