import chalk from "chalk";
import { draw, getCenterForSize, getSize } from "../../core/screen";
import { getCookieGray } from "../../utils/colours";
import { appState } from "../state";

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

export function drawCookie() {
    const { width, height } = getSize();
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
        const center = getCenterForSize(cookieWidth, cookieHeight);
        cx = center.x;
        cy = center.y;
    }

    for (let i = 0; i < ASCII.length; i++) {
        const line = ASCII[i];
        draw(cx, cy + i, line, getCookieGray(appState.ui.highlightTicks));
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
        const center = getCenterForSize(message.length, 0);
        tx = center.x;
        ty = cy + cookieHeight + 2;
    }

    draw(tx, ty, message, chalk.gray);
}
