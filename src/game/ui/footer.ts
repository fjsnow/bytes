import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";
import type { GameState } from "../state";

export function drawFooter(gameState: GameState, terminal: ITerminal) {
    const { height } = terminal.getSize();

    const prestigeText = gameState.prestige.toString();
    const multiplierText = `${gameState.prestigeMultiplier}x`;

    const part1 = "ssh ";
    const part2 = "b.fjsn.io";
    const part3 = " | prestige: ";
    const part4 = prestigeText;
    const part5 = " (";
    const part6 = multiplierText;
    const part7 = " multi)";

    const totalTextLength =
        part1.length +
        part2.length +
        part3.length +
        part4.length +
        part5.length +
        part6.length +
        part7.length;

    let currentX = terminal.getCenterForSize(totalTextLength, 0).x;
    const y = height - 1;

    terminal.draw(currentX, y, part1, chalk.gray);
    currentX += part1.length;
    terminal.draw(currentX, y, part2, chalk.white);
    currentX += part2.length;
    terminal.draw(currentX, y, part3, chalk.gray);
    currentX += part3.length;
    terminal.draw(currentX, y, part4, chalk.white);
    currentX += part4.length;
    terminal.draw(currentX, y, part5, chalk.gray);
    currentX += part5.length;
    terminal.draw(currentX, y, part6, chalk.white);
    currentX += part6.length;
    terminal.draw(currentX, y, part7, chalk.gray);
}
