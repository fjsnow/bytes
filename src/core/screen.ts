import ansiEscapes from "ansi-escapes";
import { appState } from "../game/state";
import { terminalChars } from "../utils/terminal";

type Cell = { char: string; color?: (s: string) => string };

let width = process.stdout.columns;
let height = process.stdout.rows;
refreshLayout();

let prev: Cell[][] = makeBuffer(width, height);
let next: Cell[][] = makeBuffer(width, height);

let initialized = false;

function makeBuffer(w: number, h: number): Cell[][] {
    return Array.from({ length: h }, () =>
        Array.from({ length: w }, () => ({ char: " " })),
    );
}

export function refreshLayout() {
    if (width < 80) {
        appState.layout = "small";
    } else if (width < 120) {
        appState.layout = "medium";
        if (appState.screen === "main") {
            appState.screen = "workers";
        }
    } else {
        appState.layout = "large";
        if (appState.screen === "main") {
            appState.screen = "workers";
        }
    }
}

export function setupScreen() {
    if (initialized) return;
    initialized = true;

    process.stdout.write(ansiEscapes.clearScreen);
    process.stdout.write(ansiEscapes.cursorHide);
    process.stdout.write("\x1b[?1049h");

    process.stdout.on("resize", () => {
        width = process.stdout.columns;
        height = process.stdout.rows;
        prev = makeBuffer(width, height);
        clearScreen(true);
        refreshLayout();
        render();
    });

    process.on("exit", () => {
        restoreScreen();
    });
}

export function restoreScreen() {
    if (!initialized) return;
    process.stdout.write(ansiEscapes.cursorShow);
    process.stdout.write("\x1b[?1049l");
    initialized = false;
}

export function clearScreen(full: boolean = false) {
    if (full) {
        process.stdout.write(ansiEscapes.clearScreen);
        process.stdout.write(ansiEscapes.cursorHide);
    }
    next = makeBuffer(width, height);
}

export function draw(
    x: number,
    y: number,
    text: string,
    color?: (str: string) => string,
) {
    if (y < 0 || y >= height) return;
    if (x < 0 || x >= width) return;

    for (let i = 0; i < text.length; i++) {
        const pos = x + i;
        if (pos < width) {
            next[y][pos] = { char: text[i], color };
        }
    }
}

export function drawBox(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    color?: (s: string) => string,
) {
    const width = x2 - x1;
    const height = y2 - y1;

    if (width < 2 || height < 2) return;

    draw(
        x1,
        y1,
        terminalChars.topLeft +
            terminalChars.horizontal.repeat(width - 1) +
            terminalChars.topRight,
        color,
    );

    draw(
        x1,
        y2,
        terminalChars.bottomLeft +
            terminalChars.horizontal.repeat(width - 1) +
            terminalChars.bottomRight,
        color,
    );

    for (let y = y1 + 1; y < y2; y++) {
        draw(x1, y, terminalChars.vertical, color);
        draw(x2, y, terminalChars.vertical, color);
    }
}

export function clear(x: number, y: number, length: number) {
    if (y < 0 || y >= height) return;
    if (x < 0 || x >= width) return;

    for (let i = 0; i < length; i++) {
        const pos = x + i;
        if (pos < width) {
            next[y][pos] = { char: " " };
        }
    }
}

export function render() {
    for (let y = 0; y < height; y++) {
        const nextRow = next[y]
            .map((cell) => (cell.color ? cell.color(cell.char) : cell.char))
            .join("");

        const prevRow = prev[y]
            .map((cell) => (cell.color ? cell.color(cell.char) : cell.char))
            .join("");

        if (nextRow !== prevRow) {
            process.stdout.write(ansiEscapes.cursorTo(0, y) + nextRow);
            prev[y] = next[y].map((c) => ({ ...c }));
        }
    }
    process.stdout.write(ansiEscapes.cursorTo(0, height));
}

export function getSize() {
    return { width, height };
}

export function getCenter() {
    return { x: Math.floor(width / 2), y: Math.floor(height / 2) };
}

export function getCenterForSize(w: number, h: number) {
    return {
        x: Math.floor((width - w) / 2),
        y: Math.floor((height - h) / 2),
    };
}
