import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";
import { formatBytes } from "../../utils/bytes";
import type { AppState, GameState } from "../state";
import { WORKER_DATA, type Worker } from "../data/workers";

function drawWorker(
    terminal: ITerminal,
    y: number,
    worker: Worker,
    highlight: boolean,
    gameState: GameState,
) {
    const count = gameState.workers[worker.id] ?? 0;
    const cost = worker.cost(count);
    const formattedCost = formatBytes(cost);
    const canAfford = gameState.cookies >= cost;

    terminal.draw(
        5,
        y,
        worker.name,
        canAfford ? chalk.yellow.bold : chalk.yellow,
    );
    terminal.draw(worker.name.length + 6, y, `(owned: ${count})`, chalk.gray);
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

export function drawWorkers(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const { height } = terminal.getSize();
    const focused = appState.ui.focus === "workers";
    const availableHeight = height - 3;
    const maxWorkers = Math.floor(availableHeight / 4);

    terminal.draw(
        1,
        2,
        "[W]orkers",
        focused ? chalk.yellow.bold : chalk.gray.bold,
    );
    if (focused) terminal.draw(11, 2, "j(↓) / k(↑)", chalk.gray);

    const start = appState.ui.workers.scrollOffset;
    const end = Math.min(start + maxWorkers, WORKER_DATA.length);

    for (let i = start; i < end; i++) {
        const worker = WORKER_DATA[i];
        const y = 3 + (i - start) * 4;
        drawWorker(
            terminal,
            y,
            worker,
            focused && i === appState.ui.workers.selectedIndex,
            gameState,
        );
    }

    const barHeight = height - 4;
    const total = WORKER_DATA.length;
    if (total > maxWorkers) {
        const scrollbarHeight = Math.max(
            1,
            Math.floor((barHeight * maxWorkers) / total),
        );
        const maxScroll = total - maxWorkers;
        const scrollRatio =
            maxScroll > 0 ? appState.ui.workers.scrollOffset / maxScroll : 0;
        const scrollbarY =
            3 + Math.floor((barHeight - scrollbarHeight) * scrollRatio);

        for (let y = 3; y < 3 + barHeight; y++) {
            if (y >= scrollbarY && y < scrollbarY + scrollbarHeight) {
                terminal.draw(1, y, "┃", chalk.gray);
            }
        }
    }
}
