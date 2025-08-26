import ansiEscapes from "ansi-escapes";
import type { Channel } from "ssh2";
import type { AppState } from "../game/state";

type Cell = { char: string; color?: (s: string) => string };
type KeyHandler = (key: string) => void;

export interface ITerminal {
    clear(full?: boolean): void;
    draw(
        x: number,
        y: number,
        text: string,
        color?: (s: string) => string,
    ): void;
    render(): void;
    getSize(): { width: number; height: number };
    getCenter(): { x: number; y: number };
    getCenterForSize(w: number, h: number): { x: number; y: number };
    setup(): void;
    restore(): void;
    onKey(handler: (key: string) => void): void;
    destroy(): void;
}

export class CliTerminal implements ITerminal {
    private width: number;
    private height: number;
    private prevBuffer: Cell[][];
    private nextBuffer: Cell[][];
    private initialized: boolean = false;
    private keyHandlers: KeyHandler[] = [];
    private appState: AppState;

    constructor(appState: AppState) {
        this.appState = appState;
        this.width = process.stdout.columns;
        this.height = process.stdout.rows;
        this.prevBuffer = this.makeBuffer(this.width, this.height);
        this.nextBuffer = this.makeBuffer(this.width, this.height);

        this.refreshLayout();
    }

    private makeBuffer(w: number, h: number): Cell[][] {
        return Array.from({ length: h }, () =>
            Array.from({ length: w }, () => ({ char: " " })),
        );
    }

    private refreshLayout() {
        if (this.width < 80) {
            this.appState.layout = "small";
        } else if (this.width < 120) {
            this.appState.layout = "medium";
            if (this.appState.screen === "main") {
                this.appState.screen = "workers";
            }
        } else {
            this.appState.layout = "large";
            if (this.appState.screen === "main") {
                this.appState.screen = "workers";
            }
        }
    }

    public setup() {
        if (this.initialized) return;
        this.initialized = true;

        if (process.stdout.isTTY) {
            process.stdout.write(ansiEscapes.clearScreen);
            process.stdout.write(ansiEscapes.cursorHide);
        }

        if (process.stdin.isTTY) {
            process.stdin.setRawMode(true);
        }
        process.stdin.resume();
        process.stdin.setEncoding("utf8");
        process.stdin.on("data", this.handleKeyData);

        process.stdout.on("resize", this.handleResize);

        process.on("exit", this.restore);
        process.on("SIGINT", this.handleSigInt);
        process.on("SIGTERM", this.handleSigTerm);
    }

    public restore = () => {
        if (!this.initialized) return;

        if (process.stdout.isTTY) {
            process.stdout.write(ansiEscapes.cursorShow);
        }
        if (process.stdin.isTTY) {
            process.stdin.setRawMode(false);
            process.stdin.pause();
        }
        process.stdin.off("data", this.handleKeyData);
        process.stdout.off("resize", this.handleResize);
        process.off("exit", this.restore);
        process.off("SIGINT", this.handleSigInt);
        process.off("SIGTERM", this.handleSigTerm);
        this.initialized = false;
    };

    public destroy() {
        this.restore();
    }

    private handleResize = () => {
        this.width = process.stdout.columns;
        this.height = process.stdout.rows;
        this.prevBuffer = this.makeBuffer(this.width, this.height);
        this.clear(true);
        this.refreshLayout();
        this.render();
    };

    private handleKeyData = (key: Buffer) => {
        const keyString = key.toString("utf8");
        if (keyString === "\u0003") {
            this.restore();
            process.exit(0);
        }
        for (const h of this.keyHandlers) {
            h(keyString);
        }
    };

    private handleSigInt = () => {
        this.restore();
        process.exit(0);
    };
    private handleSigTerm = () => {
        this.restore();
        process.exit(0);
    };

    public clear(full: boolean = false) {
        if (full && process.stdout.isTTY) {
            process.stdout.write(ansiEscapes.clearScreen);
            process.stdout.write(ansiEscapes.cursorHide);
        }
        this.nextBuffer = this.makeBuffer(this.width, this.height);
    }

    public draw(
        x: number,
        y: number,
        text: string,
        color?: (str: string) => string,
    ) {
        if (y < 0 || y >= this.height) return;
        if (x < 0 || x >= this.width) return;

        for (let i = 0; i < text.length; i++) {
            const pos = x + i;
            if (pos < this.width) {
                this.nextBuffer[y][pos] = { char: text[i], color };
            }
        }
    }

    public render() {
        if (!process.stdout.isTTY) return;

        for (let y = 0; y < this.height; y++) {
            const nextRow = this.nextBuffer[y]
                .map((cell) => (cell.color ? cell.color(cell.char) : cell.char))
                .join("");

            const prevRow = this.prevBuffer[y]
                .map((cell) => (cell.color ? cell.color(cell.char) : cell.char))
                .join("");

            let currentRow = nextRow;

            if (currentRow !== prevRow) {
                process.stdout.write(ansiEscapes.cursorTo(0, y) + currentRow);
                this.prevBuffer[y] = this.nextBuffer[y].map((c) => ({ ...c }));
            }
        }
        process.stdout.write(ansiEscapes.cursorTo(0, this.height));
    }

    public getSize() {
        return { width: this.width, height: this.height };
    }

    public getCenter() {
        return {
            x: Math.floor(this.width / 2),
            y: Math.floor(this.height / 2),
        };
    }

    public getCenterForSize(w: number, h: number) {
        return {
            x: Math.floor((this.width - w) / 2),
            y: Math.floor((this.height - h) / 2),
        };
    }

    public onKey(handler: KeyHandler) {
        this.keyHandlers.push(handler);
    }
}

export class SshTerminal implements ITerminal {
    private channel: Channel;
    private width: number;
    private height: number;
    private prevBuffer: Cell[][];
    private nextBuffer: Cell[][];
    private initialized: boolean = false;
    private keyHandlers: KeyHandler[] = [];
    private appState: AppState;
    private clientConnection: import("ssh2").Connection;

    constructor(
        channel: Channel,
        initialWidth: number,
        initialHeight: number,
        appState: AppState,
        clientConnection: import("ssh2").Connection,
    ) {
        this.channel = channel;
        this.appState = appState;
        this.width = initialWidth;
        this.height = initialHeight;
        this.prevBuffer = this.makeBuffer(this.width, this.height);
        this.nextBuffer = this.makeBuffer(this.width, this.height);
        this.clientConnection = clientConnection;

        this.refreshLayout();
    }

    private makeBuffer(w: number, h: number): Cell[][] {
        return Array.from({ length: h }, () =>
            Array.from({ length: w }, () => ({ char: " " })),
        );
    }

    private refreshLayout() {
        if (this.width < 80) {
            this.appState.layout = "small";
        } else if (this.width < 120) {
            this.appState.layout = "medium";
            if (this.appState.screen === "main") {
                this.appState.screen = "workers";
            }
        } else {
            this.appState.layout = "large";
            if (this.appState.screen === "main") {
                this.appState.screen = "workers";
            }
        }
    }

    public setup() {
        if (this.initialized) return;
        this.initialized = true;

        this.channel.write(ansiEscapes.clearScreen);
        this.channel.write(ansiEscapes.cursorHide);
        this.channel.write("\x1b[?1049h");

        this.channel.on("data", this.handleKeyData);
        this.channel.on("close", this.delayedRestore);
        this.channel.on("end", this.delayedRestore);
    }

    private delayedRestore = () => {
        if (!this.initialized) return;

        this.channel.write(ansiEscapes.cursorShow);
        this.channel.write("\x1b[?1049l");

        this.channel.off("data", this.handleKeyData);
        this.channel.off("close", this.delayedRestore);
        this.channel.off("end", this.delayedRestore);
        this.keyHandlers = [];
        this.initialized = false;
    };

    public restore = () => {
        if (!this.initialized) return;

        this.channel.write(ansiEscapes.cursorShow);
        this.channel.write("\x1b[?1049l");

        this.channel.off("data", this.handleKeyData);
        this.channel.off("close", this.delayedRestore);
        this.channel.off("end", this.delayedRestore);
        this.keyHandlers = [];
        this.initialized = false;
    };

    public destroy() {
        this.restore();
        this.channel.end();
    }

    public getSshClient(): import("ssh2").Connection {
        return this.clientConnection;
    }

    public handleResize = (w: number, h: number) => {
        this.width = w;
        this.height = h;
        this.prevBuffer = this.makeBuffer(this.width, this.height);
        this.clear(true);
        this.refreshLayout();
        this.render();
    };

    private handleKeyData = (key: Buffer) => {
        const keyString = key.toString("utf8");
        if (keyString === "\u0003") {
            this.restore();
            this.channel.close();
            return;
        }
        for (const h of this.keyHandlers) {
            h(keyString);
        }
    };

    public clear(full: boolean = false) {
        if (full) {
            this.channel.write(ansiEscapes.clearScreen);
            this.channel.write(ansiEscapes.cursorHide);
        }
        this.nextBuffer = this.makeBuffer(this.width, this.height);
    }

    public draw(
        x: number,
        y: number,
        text: string,
        color?: (str: string) => string,
    ) {
        if (y < 0 || y >= this.height) return;
        if (x < 0 || x >= this.width) return;

        for (let i = 0; i < text.length; i++) {
            const pos = x + i;
            if (pos < this.width) {
                this.nextBuffer[y][pos] = { char: text[i], color };
            }
        }
    }

    public render() {
        for (let y = 0; y < this.height; y++) {
            const nextRow = this.nextBuffer[y]
                .map((cell) => (cell.color ? cell.color(cell.char) : cell.char))
                .join("");

            const prevRow = this.prevBuffer[y]
                .map((cell) => (cell.color ? cell.color(cell.char) : cell.char))
                .join("");

            let currentRow = nextRow;

            if (currentRow !== prevRow) {
                this.channel.write(ansiEscapes.cursorTo(0, y) + currentRow);
                this.prevBuffer[y] = this.nextBuffer[y].map((c) => ({ ...c }));
            }
        }
        this.channel.write(ansiEscapes.cursorTo(0, this.height));
    }

    public getSize() {
        return { width: this.width, height: this.height };
    }

    public getCenter() {
        return {
            x: Math.floor(this.width / 2),
            y: Math.floor(this.height / 2),
        };
    }

    public getCenterForSize(w: number, h: number) {
        return {
            x: Math.floor((this.width - w) / 2),
            y: Math.floor((this.height - h) / 2),
        };
    }

    public onKey(handler: KeyHandler) {
        this.keyHandlers.push(handler);
    }
}
