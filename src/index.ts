import { CliTerminal, type ITerminal } from "./core/terminal";
import {
    startTicker,
    registerSession as registerTickerSession,
    stopTicker,
} from "./core/ticker";
import {
    startRenderer,
    registerSession as registerRendererSession,
    stopRenderer,
} from "./core/renderer";
import { GameSession } from "./game/session";
import { createInitialAppState } from "./game/state";
import { startSshServer } from "./server";
import { logger } from "./utils/logger";

const isServerMode = process.argv.includes("--server");

async function runSinglePlayer() {
    const appState = createInitialAppState();
    const terminal: ITerminal = new CliTerminal(appState);
    const gameSession = new GameSession(
        "local-player",
        terminal,
        null,
        appState,
        null,
    );

    gameSession.init();

    registerTickerSession(gameSession);
    registerRendererSession(gameSession);

    startTicker(false);
    startRenderer();

    const cleanup = async () => {
        stopTicker();
        stopRenderer();
        await gameSession.destroy();
    };

    process.on("exit", cleanup);
}

async function main() {
    if (isServerMode) {
        logger.info("Starting in server mode.");
        const portArgIndex = process.argv.indexOf("--server");
        const port =
            portArgIndex !== -1
                ? parseInt(process.argv[portArgIndex + 1])
                : undefined;
        if (port === undefined || isNaN(port)) {
            logger.error(
                "No server port specified. Use --server <port> to set the port.",
            );
            process.exit(1);
        }
        await startSshServer(port);
    } else {
        logger.info("Starting in single-player CLI mode.");
        await runSinglePlayer();
    }
}

main().catch(console.error);
