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
    const maxTextWidth = Math.min(width - 4, 80);

    if (appState.screen === "main") {
        const bakeMessage = "Press [space] to bake!";

        if (appState.layout === "medium") {
            terminal.draw(
                cx + Math.floor((cookieWidth - bakeMessage.length) / 2),
                currentTextY,
                bakeMessage,
                chalk.gray,
            );
        } else {
            let { x } = terminal.getCenterForSize(bakeMessage.length, 0);
            terminal.draw(x, currentTextY, bakeMessage, chalk.gray);
        }

        const canPrestige = gameState.cookies >= gameState.prestigeCost;
        if (appState.ui.confirmPrestige) {
            const confirmText = "Are you sure? [y]es / [n]o";
            if (appState.layout === "medium") {
                terminal.draw(
                    cx + Math.floor((cookieWidth - confirmText.length) / 2),
                    currentTextY + 1,
                    confirmText,
                    chalk.red.bold,
                );
            } else {
                let { x } = terminal.getCenterForSize(confirmText.length, 0);
                terminal.draw(x, currentTextY + 1, confirmText, chalk.red.bold);
            }
        } else {
            if (canPrestige) {
                const actionText = `[P]restige now!`;
                if (appState.layout === "medium") {
                    terminal.draw(
                        cx + Math.floor((cookieWidth - actionText.length) / 2),
                        currentTextY + 1,
                        actionText,
                        chalk.yellow,
                    );
                } else {
                    let { x } = terminal.getCenterForSize(actionText.length, 0);
                    terminal.draw(
                        x,
                        currentTextY + 1,
                        actionText,
                        chalk.yellow,
                    );
                }
            } else {
                const neededText = `Need ${formatBytes(gameState.prestigeCost)} to prestige.`;
                if (appState.layout === "medium") {
                    terminal.draw(
                        cx + Math.floor((cookieWidth - neededText.length) / 2),
                        currentTextY + 1,
                        neededText,
                        chalk.gray,
                    );
                } else {
                    let { x } = terminal.getCenterForSize(neededText.length, 0);
                    terminal.draw(x, currentTextY + 1, neededText, chalk.gray);
                }
            }
        }
    }
}
