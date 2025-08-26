import chalk from "chalk";
import { resolve } from "path";
import { existsSync, mkdirSync } from "fs";
import { file, type FileSink } from "bun";

const LOGS_DIR = "logs";
const LATEST_LOG_FILE = resolve(LOGS_DIR, "latest.log");

const levels = {
    INFO: chalk.blue("[INFO]"),
    WARN: chalk.yellow("[WARN]"),
    ERROR: chalk.red("[ERROR]"),
};

const ansiStripRegex =
    /[\u001b\u009b][[()#;?]*(?:[0-9]{1,4}(?:;[0-9]{0,4})*)?[0-9A-ORZcf-nqry=><]/g;

let consoleStream: typeof console = console;
let latestLogWriter: FileSink | null = null;
let timestampedLogWriter: FileSink | null = null;

function ensureLogDir() {
    if (!existsSync(LOGS_DIR)) {
        mkdirSync(LOGS_DIR, { recursive: true });
    }
}

function getTimestamp() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour12: false });
}

function getFileTimestamp() {
    const now = new Date();
    const pad = (num: number) => num.toString().padStart(2, "0");
    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
}

function formatMessage(
    level: keyof typeof levels,
    isConsole: boolean,
    ...messages: any[]
): string {
    const timestamp = isConsole ? chalk.gray(getTimestamp()) : getTimestamp();
    const levelTag = isConsole ? levels[level] : `[${level}]`;
    const messageContent = messages
        .map((m) => {
            if (typeof m === "object" && m !== null) {
                return JSON.stringify(m);
            }
            return String(m);
        })
        .join(" ");

    return `${timestamp} ${levelTag} ${messageContent}`;
}

function writeToStreams(level: keyof typeof levels, ...messages: any[]) {
    consoleStream.log(formatMessage(level, true, ...messages));

    const fileMessage = formatMessage(level, false, ...messages).replace(
        ansiStripRegex,
        "",
    );

    if (latestLogWriter) {
        latestLogWriter.write(`${fileMessage}\n`);
    }
    if (timestampedLogWriter) {
        timestampedLogWriter.write(`${fileMessage}\n`);
    }
}

export const logger = {
    info: (...messages: any[]) => writeToStreams("INFO", ...messages),
    warn: (...messages: any[]) => writeToStreams("WARN", ...messages),
    error: (...messages: any[]) => writeToStreams("ERROR", ...messages),
};

export function redactPlayerKey(playerKey: string | null | undefined): string {
    if (!playerKey) {
        return "N/A";
    }

    const parts = playerKey.split(":");
    if (parts.length < 2) {
        return playerKey;
    }

    const data = parts[1];

    if (data.length <= 16) {
        return data;
    }

    return `${data.slice(0, 8)}...${data.slice(-8)}`;
}

export function startFileLogging() {
    ensureLogDir();

    latestLogWriter = file(LATEST_LOG_FILE).writer();
    latestLogWriter.write(
        `--- Log started at ${new Date().toISOString()} ---\n`,
    );

    const timestampedFileName = resolve(LOGS_DIR, `${getFileTimestamp()}.log`);
    timestampedLogWriter = file(timestampedFileName).writer();
    timestampedLogWriter.write(
        `--- Log started at ${new Date().toISOString()} ---\n`,
    );

    logger.info("File logging started.");
}

export async function stopFileLogging() {
    logger.info("Stopping file logging...");
    if (latestLogWriter) {
        latestLogWriter.write(
            `--- Log ended at ${new Date().toISOString()} ---\n`,
        );
        latestLogWriter.end();
        latestLogWriter = null;
    }
    if (timestampedLogWriter) {
        timestampedLogWriter.write(
            `--- Log ended at ${new Date().toISOString()} ---\n`,
        );
        timestampedLogWriter.end();
        timestampedLogWriter = null;
    }
}
