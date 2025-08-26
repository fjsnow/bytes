import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";
import { getCookieGray } from "../../utils/colours";
import type { AppState } from "../state";

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

export function drawCookie(appState: AppState, terminal: ITerminal) {
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

    const message = "Press [space] to bake!";
    let tx: number;
    let ty: number;

    if (appState.layout === "medium") {
        const leftPanelWidth = 44 + 2;
        const rightWidth = width - leftPanelWidth;
        tx = leftPanelWidth + Math.floor((rightWidth - message.length) / 2);
        ty = cy + cookieHeight + 2;
    } else {
        const center = terminal.getCenterForSize(message.length, 0);
        tx = center.x;
        ty = cy + cookieHeight + 2;
    }

    terminal.draw(tx, ty, message, chalk.gray);
}
