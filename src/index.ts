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
import { createInitialStandaloneAppState } from "./game/state";
import { logger } from "./utils/logger";

const isServerMode = process.argv.includes("--server");
const isDebugMode = process.argv.includes("--debug");

function runSinglePlayer() {
    const appState = createInitialStandaloneAppState("medium", isDebugMode);
    const terminal: ITerminal = new CliTerminal(appState);

    const gameSession = new GameSession(terminal, appState);

    gameSession.init();

    registerTickerSession(gameSession);
    registerRendererSession(gameSession);

    startTicker(false);
    startRenderer();

    const cleanup = () => {
        stopTicker();
        stopRenderer();
        gameSession.destroy();
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

        const { startSshServer } = await import("./server");
        await startSshServer(port, isDebugMode);
    } else {
        logger.info("Starting in single-player CLI mode.");
        runSinglePlayer();
    }
}

main().catch(console.error);
