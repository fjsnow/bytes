import chalk from "chalk";
import { draw, getSize } from "../../core/screen";
import { formatBytes } from "../../utils/bytes";
import { appState, gameState } from "../state";
import { WORKER_DATA, type Worker } from "../data/workers";

function getWorkerCost(worker: Worker, count: number) {
    return worker.baseCost * Math.pow(1.15, count);
}

function drawWorker(y: number, worker: Worker, highlight: boolean) {
    const count = gameState.workers[worker.id] || 0;
    const cost = getWorkerCost(worker, count);
    const formattedCost = formatBytes(cost);
    const canAfford = gameState.cookies >= cost;

    draw(5, y, worker.name, canAfford ? chalk.yellow.bold : chalk.yellow);
    draw(worker.name.length + 6, y, `(owned: ${count})`, chalk.gray);
    draw(5, y + 1, "cost: ", chalk.gray);
    draw(11, y + 1, formattedCost, chalk.white);
    draw(formattedCost.length + 11, y + 1, ", bps: ", chalk.gray);
    draw(
        formattedCost.length + 18,
        y + 1,
        formatBytes(worker.baseCookiesPerSecond) + "/s",
        chalk.white,
    );

    if (highlight) {
        draw(3, y, ">", chalk.yellow);
        if (gameState.cookies >= cost) {
            draw(5, y + 2, "[b]uy", chalk.green);
        } else {
            draw(5, y + 2, "you cannot afford this", chalk.red);
        }
    }
}

export function drawWorkers() {
    const { height } = getSize();
    const focused = appState.ui.focus === "workers";
    const availableHeight = height - 3;
    const maxWorkers = Math.floor(availableHeight / 4);

    draw(1, 2, "Workers", focused ? chalk.yellow.bold : chalk.gray.bold);
    draw(8, 2, " (W)", chalk.gray);

    const start = appState.ui.workers.scrollOffset;
    const end = Math.min(start + maxWorkers, WORKER_DATA.length);

    for (let i = start; i < end; i++) {
        const worker = WORKER_DATA[i];
        const y = 3 + (i - start) * 4;
        drawWorker(
            y,
            worker,
            focused && i === appState.ui.workers.selectedIndex,
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
                draw(1, y, "┃", chalk.gray);
            }
        }
    }
}
