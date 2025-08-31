import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";
import { getCookieGray } from "../../utils/colours";
import type { AppState, GameState } from "../state";
import { formatBytes } from "../../utils/bytes";

const ASCII = [
    "       ⢰⠒⠒⠒⠒⠒⠒⢲⡖⣶⣶⡆       ",
    "  ⢀⡀⣯⠉⠉⠉⣖⣲⣶⡆⠀⠀⠈⠉⠉⠉⠉⠉⠉⢱    ",
    "⢀⣀⣸⠀⠀⠀⠀⠀⠈⠉⠉⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⢸⣿⣇⣀⡀",
    "⢸⣿⣀⣀⡀⠀⠿⠿⠀⠀⠀⣸⣙⣿⣿⠀⢸⣿⠀⠀⠀⠀⠀⠀⢰⡇",
    "⢸⡿⠾⠿⠟⠀⠀⠀⣤⡄⠀⠸⠿⠿⠟⠀⠸⠿⠀⠀⠀⣠⣤⠀⢸⡇",
    "⢸⡃⠀⠀⠀⠀⠀⠀⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠀⢸⡇",
    "⢸⣖⠀⠀⠀⠀⠀⠀⠙⠋⠀⢴⣶⣶⣶⠀⠀⠀⣶⣶⠀⠀⠀⠀⢸⡇",
    "⢸⣿⣶⠀⠀⠀⣶⣶⠀⠀⠀⠈⠉⠉⠉⠀⠀⠀⠉⠉⠀⠀⠀⣷⣾⡇",
    "⠈⠉⢹⣿⣿⣀⣀⣠⠀⠀⠀⠀⠀⠀  ⣿⡇⠀⣀⣀⣀⣿⣿⡏⠉⠁",
    "    ⢿⠿⠿⢿⣀⣀⣀⣀⣠⣤⣤⣤⣤⣤⣿⠿⠿⡿    ",
    "       ⠸⠿⠿⠿⠿⠿⣿⣿⣿⣿⠿⠇       ",
];

function getCookieTextX(
    appState: AppState,
    terminal: ITerminal,
    textLength: number,
): number {
    if (appState.layout === "medium") {
        const leftPanelWidth = 44 + 2;
        const rightWidth = terminal.getSize().width - leftPanelWidth;
        const cookieWidth = ASCII[0].length;
        const cx = leftPanelWidth + Math.floor((rightWidth - cookieWidth) / 2);
        return cx + Math.floor((cookieWidth - textLength) / 2);
    } else {
        return terminal.getCenterForSize(textLength, 0).x;
    }
}

export function drawCookie(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const { width, height } = terminal.getSize();
    const cookieWidth = ASCII[0].length;
    const cookieHeight = ASCII.length;

    let cx: number;
    let cy: number;

    if (appState.layout === "medium") {
        const leftPanelWidth = 44 + 2;
        const rightWidth = width - leftPanelWidth;

        cx = leftPanelWidth + Math.floor((rightWidth - cookieWidth) / 2);
        cy = Math.floor((height - cookieHeight) / 2);
    } else {
        const center = terminal.getCenterForSize(cookieWidth, cookieHeight);
        cx = center.x;
        cy = center.y;
    }

    for (let i = 0; i < ASCII.length; i++) {
        const line = ASCII[i];
        terminal.draw(
            cx,
            cy + i,
            line,
            getCookieGray(appState.ui.highlightTicks),
        );
    }

    let currentTextY = cy + cookieHeight + 2;

    if (appState.screen === "main") {
        const bakeMessage = "Press [space] to bake!";
        const bakeX = getCookieTextX(appState, terminal, bakeMessage.length);
        terminal.draw(bakeX, currentTextY, bakeMessage, chalk.gray);

        currentTextY += 1;
        const canPrestige = gameState.cookies >= gameState.prestigeCost;

        if (canPrestige) {
            if (appState.ui.confirmPrestige) {
                const confirmText = "Are you sure? [y]es / [n]o";
                const confirmX = getCookieTextX(
                    appState,
                    terminal,
                    confirmText.length,
                );
                terminal.draw(
                    confirmX,
                    currentTextY,
                    confirmText,
                    chalk.red.bold,
                );
            } else {
                const actionText = `[P]restige now!`;
                const actionX = getCookieTextX(
                    appState,
                    terminal,
                    actionText.length,
                );
                terminal.draw(actionX, currentTextY, actionText, chalk.yellow);
            }
        } else {
            const neededText = `You need ${formatBytes(gameState.prestigeCost)} to prestige.`;
            const neededX = getCookieTextX(
                appState,
                terminal,
                neededText.length,
            );
            terminal.draw(neededX, currentTextY, neededText, chalk.gray);
        }
    }
}
