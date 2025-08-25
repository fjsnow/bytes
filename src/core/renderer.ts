import { drawBits } from "../game/ui/bits";
import { drawCookie } from "../game/ui/cookie";
import { drawDebug } from "../game/ui/debug";
import { drawStats } from "../game/ui/stats";
import { drawUpgrades } from "../game/ui/upgrades";
import { drawWorkers } from "../game/ui/workers";
import { updateFps } from "./fps";
import { clearScreen, draw, render, getSize, getCenterForSize } from "./screen";
import { appState } from "../game/state";
import chalk from "chalk";
import { drawWatermark } from "../game/ui/watermark";

let interval: NodeJS.Timeout | null = null;

export const FPS = 10;

function drawNavBar() {
    if (appState.layout === "medium") {
        const workersText = "[W]orkers ";
        const upgradesText = "[U]pgrades";
        const totalLength = workersText.length + upgradesText.length;
        const { x: startX } = getCenterForSize(totalLength, 0);

        draw(
            startX,
            0,
            workersText,
            appState.screen === "workers" ? chalk.yellow.bold : chalk.gray,
        );

        draw(
            startX + workersText.length,
            0,
            upgradesText,
            appState.screen === "upgrades" ? chalk.blue.bold : chalk.gray,
        );
    } else if (appState.layout === "small") {
        if (appState.screen === "main") {
            const text = "[W]orkers  [U]pgrades";
            const { x } = getCenterForSize(text.length, 0);
            draw(x, 0, text, chalk.gray);
        } else {
            const text = "[backspace] to return";
            const { x } = getCenterForSize(text.length, 0);
            draw(x, 0, text, chalk.gray);
        }
    }
}

function renderLarge() {
    drawBits();
    drawCookie();
    drawStats();
    drawWorkers();
    drawUpgrades();
    drawWatermark();
}

function renderMedium() {
    drawNavBar();
    drawBits();
    drawCookie();
    drawStats();
    drawWatermark();
    if (appState.screen === "workers") {
        drawWorkers();
    } else if (appState.screen === "upgrades") {
        drawUpgrades();
    }
}

function renderSmall() {
    drawNavBar();
    drawBits();
    drawWatermark();
    if (appState.screen === "main") {
        drawCookie();
        drawStats();
    } else if (appState.screen === "workers") {
        drawWorkers();
    } else if (appState.screen === "upgrades") {
        drawUpgrades();
    }
}

export function startRenderer() {
    stopRenderer();
    interval = setInterval(() => {
        updateFps();
        clearScreen();

        if (appState.layout === "large") {
            renderLarge();
        } else if (appState.layout === "medium") {
            renderMedium();
        } else {
            renderSmall();
        }

        render();
    }, 1000 / FPS);
}

export function stopRenderer() {
    if (interval) {
        clearInterval(interval);
        interval = null;
    }
}
