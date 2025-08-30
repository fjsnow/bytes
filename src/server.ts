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
import { createInitialSSHAppState } from "./game/state";
import chalk from "chalk";
import {
    logger,
    redactPlayerKey,
    startFileLogging,
    stopFileLogging,
} from "./utils/logger";
import {
    countLinkedKeys,
    cleanupExpiredLinkingTokens,
    findLinkedKeyAccount,
    getLinkedKeysForAccount,
    getLinkingTokenData,
    getOrCreateAccountId,
    linkKeyToAccount,
} from "./game/account";
import { generateMessage } from "./utils/messages";

let hostKey: string;

try {
    hostKey = readFileSync("host_key").toString();
} catch (err) {
    logger.error("Error reading host_key. Please generate one using:");
    logger.error('ssh-keygen -t rsa -b 4096 -f host_key -N ""');
    process.exit(1);
}

const HOST = "0.0.0.0";
const KEEP_ALIVE_INTERVAL = 60_000;
const KEEP_ALIVE_COUNT_MAX = 3;

type SshClientConnection = import("ssh2").Connection;

const sharedDb = new Database("saves.db");
sharedDb.run("PRAGMA journal_mode = WAL;");
sharedDb.run("PRAGMA synchronous = NORMAL;");

sharedDb.run(`
  CREATE TABLE IF NOT EXISTS accounts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    data TEXT NOT NULL
  );
`);

sharedDb.run(`
  CREATE TABLE IF NOT EXISTS linked_keys (
    pubkey TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  );
`);

sharedDb.run(`
  CREATE TABLE IF NOT EXISTS linking_tokens (
    token TEXT PRIMARY KEY,
    account_id INTEGER NOT NULL,
    expires_at INTEGER NOT NULL,
    FOREIGN KEY (account_id) REFERENCES accounts(id)
  )
`);

const activeGameSessions = new Map<number, GameSession>();
let serverDebugMode = false;

async function disconnectSession(
    oldSession: GameSession,
    messageType: "info" | "success" | "error",
    messageText: string,
): Promise<void> {
    const accountId = oldSession.appState.ssh!.accountId;
    const accountKey = oldSession.appState.ssh!.accountKey;
    logger.info(
        `Disconnecting existing session for account ${accountId} (playerKey: ${redactPlayerKey(
            accountKey,
        )}) due to: ${messageText}`,
    );

    return new Promise((resolve) => {
        (oldSession.terminal as SshTerminal).endAndRestore(
            generateMessage(messageType, messageText),
        );

        const client = (oldSession.terminal as SshTerminal).getSshClient();
        client.once("close", () => {
            logger.info(
                `Old session for account ${accountId} confirmed closed.`,
            );
            resolve();
        });
    });
}

function handleClientConnection(client: SshClientConnection) {
    logger.info("Incoming connection..");
    let accountKey: string | null = null;
    let accountUsername: string | null = null;
    let authenticated: boolean = false;

    client
        .on("authentication", (ctx) => {
            if (ctx.method === "publickey") {
                accountKey = `${ctx.key.algo}:${ctx.key.data.toString("base64")}`;
                accountUsername = ctx.username;
                ctx.accept();
                return;
            }

            ctx.reject(["publickey"]);
            logger.warn(
                `Authentication failed for ${ctx.username} using ${ctx.method}.`,
            );
        })
        .on("ready", () => {
            if (!authenticated && accountKey) {
                logger.info(
                    `${accountUsername} authenticated with key ${redactPlayerKey(
                        accountKey,
                    )}`,
                );
                authenticated = true;
            }

            if (!accountKey || !accountUsername) {
                logger.error(
                    "Client ready but no accountKey or username. Ending connection.",
                );
                client.end();
                return;
            }

            client.on("session", (accept) => {
                const session = accept();
                handleSession(session, client, accountUsername!, accountKey!);
            });
        })
        .on("end", () => {
            if (accountUsername) {
                logger.info(`Client ${accountUsername} disconnected`);
            } else {
                logger.info("Client disconnected");
            }
        })
        .on("error", (err) => {
            logger.error("Client error:", err.message);
        });
}

function handleSession(
    session: import("ssh2").Session,
    client: SshClientConnection,
    username: string,
    accountKey: string,
) {
    let gameSession: GameSession | null = null;
    let ptyCols = 80;
    let ptyRows = 24;

    session.on("pty", (acceptPty, _reject, info) => {
        ptyCols = info.cols;
        ptyRows = info.rows;
        if (acceptPty) acceptPty();
    });

    session.on("window-change", (acceptWinch, _reject, info) => {
        if (gameSession) {
            const terminal = gameSession.terminal as SshTerminal;
            terminal.handleResize(info.cols, info.rows);
        }
        if (acceptWinch) acceptWinch();
    });

    session.on("shell", async (acceptShell) => {
        const stream = acceptShell();
        try {
            const newGameSession = await handleShellRequest(
                stream,
                client,
                username,
                accountKey,
                ptyCols,
                ptyRows,
            );
            if (newGameSession) {
                gameSession = newGameSession;
                client.on("close", async () => {
                    logger.info(
                        `Client connection for ${username} (${redactPlayerKey(
                            accountKey,
                        )}) closed.`,
                    );
                    await gameSession!.destroy();
                    unregisterTickerSession(gameSession!);
                    unregisterRendererSession(gameSession!);
                    activeGameSessions.delete(
                        gameSession!.appState.ssh!.accountId,
                    );
                });
            }
        } catch (e) {
            logger.error(`Error during shell request for ${username}:`, e);
        }
    });

    session.on("exec", async (acceptExec, _reject, info) => {
        const stream = acceptExec();
        try {
            const newGameSession = await handleExecRequest(
                stream,
                client,
                accountKey,
                info.command.trim(),
            );
            if (newGameSession) {
                gameSession = newGameSession;
                client.on("close", async () => {
                    logger.info(`Client connection for ${username} closed`);
                    await gameSession!.destroy();
                    unregisterTickerSession(gameSession!);
                    unregisterRendererSession(gameSession!);
                    activeGameSessions.delete(
                        gameSession!.appState.ssh!.accountId,
                    );
                });
            }
        } catch (e) {
            logger.error(`Error during exec request for ${username}:`, e);
        }
    });
}

async function handleShellRequest(
    stream: import("stream").Duplex,
    client: SshClientConnection,
    username: string,
    accountKey: string,
    ptyCols: number,
    ptyRows: number,
): Promise<GameSession | null> {
    let gameSession: GameSession | null = null;
    try {
        const { accountId, isNewAccount } = getOrCreateAccountId(
            sharedDb,
            accountKey,
        );

        const linkedKeys = getLinkedKeysForAccount(sharedDb, accountId);

        const appState = createInitialSSHAppState(
            accountId,
            accountKey,
            sharedDb,
            "medium",
            isNewAccount,
            serverDebugMode,
        );
        appState.ui.settings.linkedKeys = linkedKeys;

        const sshTerminal = new SshTerminal(
            stream,
            ptyCols,
            ptyRows,
            appState,
            client,
        );

        const existingSession = activeGameSessions.get(accountId);
        if (existingSession) {
            await disconnectSession(
                existingSession,
                "error",
                "You logged in from another location.",
            );
        }

        gameSession = new GameSession(sshTerminal, appState);

        const initSuccess = gameSession.init();
        if (!initSuccess) {
            stream.write(
                generateMessage("error", "Failed to initialize game session."),
            );
            stream.end();
            return null;
        }
        registerTickerSession(gameSession);
        registerRendererSession(gameSession);
        activeGameSessions.set(accountId, gameSession);

        logger.info(`Game session started for account ${accountId}.`);
        return gameSession;
    } catch (e: any) {
        logger.error(
            `Error starting game session for account ${username}.`,
            e.message,
        );
        stream.write(generateMessage("error", "Failed to start game session."));
        stream.end();
        return null;
    }
}

async function handleExecRequest(
    stream: import("stream").Duplex,
    client: SshClientConnection,
    accountKey: string,
    command: string,
): Promise<GameSession | null> {
    const [label, token] = command.split(" ");

    if (label === "link" && token) {
        await handleLinkingTokenExec(stream, client, accountKey, token);
        return null;
    }

    logger.info(`Client requested exec command: ${command}`);
    stream.write(
        `This server does not support direct command execution for this user.\r\n`,
    );
    stream.end();
    return null;
}

async function handleLinkingTokenExec(
    stream: import("stream").Duplex,
    client: SshClientConnection,
    currentAccountKey: string,
    token: string,
) {
    logger.info(
        `Client attempting to link token: ${token} for key ${redactPlayerKey(
            currentAccountKey,
        )}`,
    );

    const tokenData = getLinkingTokenData(sharedDb, token);

    if (tokenData && tokenData.expires_at > Date.now()) {
        const targetAccountId = tokenData.account_id;

        const existingLinkedAccountId = findLinkedKeyAccount(
            sharedDb,
            currentAccountKey,
        );
        if (existingLinkedAccountId) {
            if (existingLinkedAccountId === targetAccountId) {
                stream.write(
                    generateMessage(
                        "info",
                        `Your key is already linked to that account.\nConnect normally to play.`,
                    ),
                );
                logger.info(
                    `PlayerKey ${redactPlayerKey(
                        currentAccountKey,
                    )} is already linked to target account ${targetAccountId}.`,
                );
                stream.end();
                return;
            } else {
                stream.write(
                    generateMessage(
                        "error",
                        `This key is already linked to another account. Please detach it first then try again.`,
                    ),
                );
                logger.info(
                    `PlayerKey ${redactPlayerKey(currentAccountKey)} attempted to link to account ${targetAccountId} but is already linked to account ${existingLinkedAccountId}.`,
                );
                stream.end();
                return;
            }
        }

        if (countLinkedKeys(sharedDb, targetAccountId) >= 8) {
            stream.write(
                generateMessage(
                    "error",
                    `That account has reached the maximum of 8 linked keys. Please unlink another key first then try again.`,
                ),
            );
            stream.end();
            return;
        }

        linkKeyToAccount(sharedDb, currentAccountKey, targetAccountId);
        sharedDb.run("DELETE FROM linking_tokens WHERE token = ?", [token]);

        stream.write(
            generateMessage(
                "success",
                `Your key is now linked to that account!\nConnect normally to play.`,
            ),
        );
    } else {
        stream.write(
            generateMessage(
                "error",
                "Invalid or expired linking token.\nPlease generate a new one in the game and try again.",
            ),
        );
        logger.warn(
            `Failed linking attempt for playerKey ${redactPlayerKey(
                currentAccountKey,
            )} with token ${token}. Token invalid or expired.`,
        );
    }

    stream.end();
    client.end();
}

export async function startSshServer(port: number, debug: boolean = false) {
    serverDebugMode = debug;
    logger.info(`Starting SSH server in ${debug ? 'debug' : 'normal'} mode`);
    startFileLogging();
    cleanupExpiredLinkingTokens(sharedDb);

    const server = new Server(
        {
            hostKeys: [hostKey],
            keepaliveInterval: KEEP_ALIVE_INTERVAL,
            keepaliveCountMax: KEEP_ALIVE_COUNT_MAX,
        },
        handleClientConnection,
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
                `Destroying active session for player ${redactPlayerKey(
                    session.appState.ssh!.accountKey,
                )}`,
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
