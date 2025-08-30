import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";
import { formatBytes } from "../../utils/bytes";
import type { AppState, GameState } from "../state";
import { WORKER_DATA, type Worker } from "../data/workers";
import { calculateScrollbar, ensureVisible } from "../../utils/scrollbar";

const WORKER_ITEM_HEIGHT = 4;

function drawWorker(
    terminal: ITerminal,
    y: number,
    worker: Worker,
    highlight: boolean,
    gameState: GameState,
) {
    const count = gameState.workers[worker.id] ?? 0;
    const isLockedByPrestige =
        worker.prerequisitePrestige !== undefined &&
        gameState.prestige < worker.prerequisitePrestige;

    if (isLockedByPrestige) {
        const redactedName = worker.name.replace(/./g, (char) =>
            char === " " ? " " : "?",
        );
        const redactedValue = "???";
        const requiredPrestigeText = `requires prestige ${worker.prerequisitePrestige}`;

        terminal.draw(5, y, redactedName, chalk.yellow.dim);
        terminal.draw(5, y + 1, "cost: ", chalk.gray);
        terminal.draw(11, y + 1, redactedValue, chalk.white.dim);
        terminal.draw(redactedValue.length + 11, y + 1, ", bps: ", chalk.gray);
        terminal.draw(
            redactedValue.length + 18,
            y + 1,
            redactedValue + "/s",
            chalk.white.dim,
        );

        if (highlight) {
            terminal.draw(3, y, ">", chalk.yellow.dim);
            terminal.draw(5, y + 2, requiredPrestigeText, chalk.red.dim);
        }
    } else {
        const cost = worker.cost(count);
        const formattedCost = formatBytes(cost);
        const canAfford = gameState.cookies >= cost;

        terminal.draw(
            5,
            y,
            worker.name,
            canAfford ? chalk.yellow.bold : chalk.yellow,
        );
        terminal.draw(
            worker.name.length + 6,
            y,
            `(owned: ${count})`,
            chalk.gray,
        );
        terminal.draw(5, y + 1, "cost: ", chalk.gray);
        terminal.draw(11, y + 1, formattedCost, chalk.white);
        terminal.draw(formattedCost.length + 11, y + 1, ", bps: ", chalk.gray);
        terminal.draw(
            formattedCost.length + 18,
            y + 1,
            formatBytes(worker.baseCookiesPerSecond) + "/s",
            chalk.white,
        );

        if (highlight) {
            terminal.draw(3, y, ">", chalk.yellow);
            if (gameState.cookies >= cost) {
                terminal.draw(5, y + 2, "[b]uy", chalk.green);
            } else {
                terminal.draw(5, y + 2, "you cannot afford this", chalk.red);
            }
        }
    }
}

export function drawWorkers(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const { height } = terminal.getSize();
    const focused = appState.ui.focus === "workers";
    const panelY = 3;
    const panelHeight = height - 5;
    const scrollbarX = 1;
    const maxVisible = Math.floor(panelHeight / WORKER_ITEM_HEIGHT);

    terminal.draw(
        1,
        2,
        "[W]orkers",
        focused ? chalk.yellow.bold : chalk.gray.bold,
    );
    if (focused) terminal.draw(11, 2, "j(↓) / k(↑)", chalk.gray);

    appState.ui.workers.selectedIndex = Math.min(
        appState.ui.workers.selectedIndex,
        WORKER_DATA.length > 0 ? WORKER_DATA.length - 1 : 0,
    );
    appState.ui.workers.selectedIndex = Math.max(
        0,
        appState.ui.workers.selectedIndex,
    );
    appState.ui.workers.scrollOffset = ensureVisible(
        appState.ui.workers.selectedIndex,
        appState.ui.workers.scrollOffset,
        maxVisible,
        WORKER_DATA.length,
    );

    const start = appState.ui.workers.scrollOffset;
    const end = Math.min(start + maxVisible, WORKER_DATA.length);

    for (let i = start; i < end; i++) {
        const worker = WORKER_DATA[i];
        const y = panelY + (i - start) * WORKER_ITEM_HEIGHT;
        drawWorker(
            terminal,
            y,
            worker,
            focused && i === appState.ui.workers.selectedIndex,
            gameState,
        );
    }

    const scrollbar = calculateScrollbar(
        WORKER_DATA.length,
        maxVisible,
        appState.ui.workers.scrollOffset,
        panelHeight,
    );

    if (scrollbar.shouldShow) {
        for (let y = 0; y < scrollbar.height; y++) {
            terminal.draw(
                scrollbarX,
                panelY + scrollbar.y + y,
                "┃",
                chalk.gray,
            );
        }
    }
}

export function moveWorkerSelection(
    appState: AppState,
    terminal: ITerminal,
    delta: number,
    gameState: GameState,
) {
    const { height } = terminal.getSize();
    const maxVisible = Math.floor((height - 5) / WORKER_ITEM_HEIGHT);
    let newIndex = appState.ui.workers.selectedIndex + delta;
    newIndex = Math.max(
        0,
        Math.min(newIndex, WORKER_DATA.length > 0 ? WORKER_DATA.length - 1 : 0),
    );
    appState.ui.workers.selectedIndex = newIndex;

    appState.ui.workers.scrollOffset = ensureVisible(
        newIndex,
        appState.ui.workers.scrollOffset,
        maxVisible,
        WORKER_DATA.length,
    );
}
