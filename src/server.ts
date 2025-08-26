import { Server } from "ssh2";
import { readFileSync } from "fs";
import { Database } from "bun:sqlite";
import { GameSession } from "./game/session";
import { SshTerminal } from "./core/terminal";
import {
    startTicker,
    stopTicker,
    registerSession as registerTickerSession,
    unregisterSession as unregisterTickerSession,
} from "./core/ticker";
import {
    startRenderer,
    stopRenderer,
    registerSession as registerRendererSession,
    unregisterSession as unregisterRendererSession,
} from "./core/renderer";
import { createInitialAppState } from "./game/state";
import chalk from "chalk";
import {
    logger,
    redactPlayerKey,
    startFileLogging,
    stopFileLogging,
} from "./utils/logger";

const HOST = "0.0.0.0";
const KEEP_ALIVE_INTERVAL = 60_000;
const KEEP_ALIVE_COUNT_MAX = 3;

let hostKey: string;
try {
    hostKey = readFileSync("host_key").toString();
} catch (err) {
    logger.error("Error reading host_key. Please generate one using:");
    logger.error('ssh-keygen -t rsa -b 4096 -f host_key -N ""');
    process.exit(1);
}

type SshClientConnection = import("ssh2").Connection;

const sharedDb = new Database("saves.db");
sharedDb.run("PRAGMA journal_mode = WAL;");
sharedDb.run("PRAGMA synchronous = NORMAL;");

sharedDb.run(`
  CREATE TABLE IF NOT EXISTS saves (
    pubkey TEXT PRIMARY KEY,
    data TEXT NOT NULL
  )
`);

const activeGameSessions = new Map<string, GameSession>();

export async function startSshServer(port: number) {
    startFileLogging();

    const server = new Server(
        {
            hostKeys: [hostKey],
            keepaliveInterval: KEEP_ALIVE_INTERVAL,
            keepaliveCountMax: KEEP_ALIVE_COUNT_MAX,
        },
        (client) => {
            logger.info("Client connected!");
            let playerKey: string | null = null;
            let username: string | null = null;
            let playerKeyAlreadyInUse: boolean = false;
            let authenticationLogged: boolean = false;

            client
                .on("authentication", (ctx) => {
                    if (ctx.method === "publickey") {
                        playerKey = `${ctx.key.algo}:${ctx.key.data.toString("base64")}`;
                        username = ctx.username;

                        if (activeGameSessions.has(playerKey)) {
                            playerKeyAlreadyInUse = true;
                            logger.warn(
                                `Client ${ctx.username} with key ${redactPlayerKey(playerKey)} tried to connect but save is already in use.`,
                            );
                        }

                        if (!playerKeyAlreadyInUse && !authenticationLogged) {
                            logger.info(
                                `Client authenticated as ${ctx.username} using publickey.` +
                                    ` Key: ${redactPlayerKey(playerKey)}.`,
                            );
                            authenticationLogged = true;
                        }

                        ctx.accept();
                        return;
                    }

                    ctx.reject(["publickey"]);
                    logger.warn(
                        `Authentication failed for ${ctx.username} using ${ctx.method}.`,
                    );
                })
                .on("ready", () => {
                    if (!playerKey) {
                        logger.error(
                            "Client ready but no playerKey (authentication failed). Ending connection.",
                        );
                        client.end();
                        return;
                    }

                    if (playerKeyAlreadyInUse) {
                        const displayKey = redactPlayerKey(playerKey);
                        client.once("session", (accept) => {
                            const session = accept();
                            session.once("pty", (acceptPty) => {
                                if (acceptPty) acceptPty();
                            });
                            session.once("shell", (acceptShell) => {
                                const stream = acceptShell();
                                stream.write(
                                    chalk.red("\n  Oh no! ") +
                                        chalk.white(
                                            "Your save is currently in use by another session.\r\n",
                                        ) +
                                        chalk.white(
                                            "  Please close any existing SSH sessions using this key and try again.\r\n\n  You are connected using the public key ",
                                        ) +
                                        chalk.gray(displayKey) +
                                        chalk.white(".\r\n\n"),
                                );

                                setTimeout(() => {
                                    stream.end();
                                    client.end();
                                    logger.info(
                                        `Client for player ${redactPlayerKey(playerKey)} disconnected due to active session conflict.`,
                                    );
                                }, 50);
                            });
                        });
                        return;
                    }

                    client.on("session", async (accept) => {
                        const session = accept();

                        let gameSession: GameSession | null = null;
                        let initialCols = 80;
                        let initialRows = 24;

                        session.on("pty", (acceptPty, _reject, info) => {
                            initialCols = info.cols;
                            initialRows = info.rows;
                            if (acceptPty) acceptPty();
                        });

                        session.on(
                            "window-change",
                            (acceptWinch, _reject, info) => {
                                if (gameSession) {
                                    const terminal =
                                        gameSession.terminal as SshTerminal;
                                    terminal.handleResize(info.cols, info.rows);
                                }
                                if (acceptWinch) acceptWinch();
                            },
                        );

                        session.on("shell", async (acceptShell) => {
                            if (!playerKey) {
                                logger.error(
                                    "Shell requested without valid playerKey. Closing.",
                                );
                                client.end();
                                return;
                            }

                            const stream = acceptShell();

                            try {
                                const appState = createInitialAppState();
                                const sshTerminal = new SshTerminal(
                                    stream,
                                    initialCols,
                                    initialRows,
                                    appState,
                                    client,
                                );
                                gameSession = new GameSession(
                                    playerKey,
                                    sshTerminal,
                                    playerKey,
                                    appState,
                                    username,
                                );

                                gameSession.init(sharedDb);

                                registerTickerSession(gameSession);
                                registerRendererSession(gameSession);
                                activeGameSessions.set(playerKey, gameSession);

                                logger.info(
                                    `Game session started for player ${redactPlayerKey(playerKey)}.`,
                                );

                                client.on("close", async () => {
                                    if (activeGameSessions.has(playerKey!)) {
                                        logger.info(
                                            `Game session for player ${redactPlayerKey(playerKey)} ending.`,
                                        );
                                        if (gameSession) {
                                            unregisterTickerSession(
                                                gameSession,
                                            );
                                            unregisterRendererSession(
                                                gameSession,
                                            );
                                            activeGameSessions.delete(
                                                playerKey!,
                                            );
                                            await gameSession.destroy();
                                        }
                                    }
                                });
                            } catch (e: any) {
                                logger.error(
                                    `Error starting game session for player ${redactPlayerKey(playerKey)}:`,
                                    e.message,
                                );
                                stream.write(
                                    chalk.red("Error: ") +
                                        "Failed to start game session.\r\n",
                                );
                                stream.end();
                                client.end();
                            }
                        });

                        session.on("exec", (acceptExec, _reject, info) => {
                            logger.info(
                                `Client requested exec command: ${info.command}`,
                            );
                            const stream = acceptExec();
                            stream.write(
                                `This server does not support direct command execution for this user.\r\n`,
                            );
                            stream.end();
                        });
                    });
                })
                .on("end", () => {
                    logger.info("Client disconnected");
                })
                .on("error", (err) => {
                    logger.error("Client error:", err.message);
                });
        },
    );

    server.listen(port, HOST, () => {
        logger.info(`SSH server listening on ${HOST}:${port}`);
        startTicker(true);
        startRenderer();
    });

    const gracefulShutdown = async () => {
        logger.info("Shutting down SSH server...");
        stopTicker();
        stopRenderer();

        const sessionCleanupPromises: Promise<void>[] = [];
        const clientsToClose: Set<SshClientConnection> = new Set();
        for (const session of activeGameSessions.values()) {
            logger.info(
                `Destroying active session ${session.id} for player ${redactPlayerKey(session.playerKey)}`,
            );
            sessionCleanupPromises.push(session.destroy());
            if (session.terminal instanceof SshTerminal) {
                clientsToClose.add(session.terminal.getSshClient());
            }
        }
        await Promise.all(sessionCleanupPromises);
        clientsToClose.forEach((client) => client.end());

        server.close(async (err) => {
            if (err) logger.error("Error closing SSH server:", err.message);
            else logger.info("SSH server closed.");
            sharedDb.close();
            await stopFileLogging();
            process.exit(0);
        });
    };

    process.on("SIGINT", gracefulShutdown);
    process.on("SIGTERM", gracefulShutdown);
}
