// src/game/ui/upgrades.ts
import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";
import { formatBytes } from "../../utils/bytes";
import { wrapText } from "../../utils/text";
import type { AppState, GameState } from "../state";
import { UPGRADE_DATA, type Upgrade } from "../data/upgrades";
import { calculateScrollbar, ensureVisible } from "../../utils/scrollbar";

const UPGRADE_ITEM_HEIGHT = 5;

export function getFilteredUpgrades(appState: AppState, gameState: GameState) {
    return UPGRADE_DATA.filter((u) => {
        if (appState.ui.upgradesShowMaxed) return true;
        const owned = gameState.upgrades[u.id] || 0;
        return !u.maxOwned || owned < u.maxOwned;
    }).filter((u) => {
        if (u.prerequisiteWorkerId) {
            return (gameState.workers[u.prerequisiteWorkerId] || 0) > 0;
        }
        return true;
    });
}

function drawUpgrade(
    terminal: ITerminal,
    x: number,
    y: number,
    width: number,
    upgrade: Upgrade,
    highlight: boolean,
    gameState: GameState,
) {
    const count = gameState.upgrades[upgrade.id] || 0;
    const cost = upgrade.cost(count);
    const formattedCost = formatBytes(cost);
    const canAfford = gameState.cookies >= cost;

    terminal.draw(
        x + 2,
        y,
        upgrade.name,
        canAfford ? chalk.blue.bold : chalk.blue,
    );

    const ownedText = upgrade.maxOwned
        ? upgrade.maxOwned === 1
            ? count === 1
                ? " (owned)"
                : " (not owned)"
            : ` (owned: ${count} / ${upgrade.maxOwned})`
        : ` (owned: ${count})`;

    terminal.draw(x + 2 + upgrade.name.length, y, ownedText, chalk.gray);
    terminal.draw(x + 2, y + 1, "cost: ", chalk.gray);
    terminal.draw(x + 8, y + 1, formattedCost, chalk.white);

    const descLines = wrapText(upgrade.description, width - 4);
    for (let i = 0; i < descLines.length; i++) {
        terminal.draw(x + 2, y + 2 + i, descLines[i], chalk.gray.italic);
    }

    if (highlight) {
        terminal.draw(x, y, ">", chalk.blue);
        if (canAfford) {
            if (upgrade.maxOwned && count >= upgrade.maxOwned) {
                terminal.draw(
                    x + 2,
                    y + 2 + descLines.length,
                    "maxed out",
                    chalk.red,
                );
            } else {
                terminal.draw(
                    x + 2,
                    y + 2 + descLines.length,
                    "[b]uy",
                    chalk.green,
                );
            }
        } else {
            terminal.draw(
                x + 2,
                y + 2 + descLines.length,
                "you cannot afford this",
                chalk.red,
            );
        }
    }
}

export function drawUpgrades(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const { width, height } = terminal.getSize();
    const focused = appState.ui.focus === "upgrades";
    const panelY = 3;
    const panelHeight = height - 5;
    const maxVisible = Math.floor(panelHeight / UPGRADE_ITEM_HEIGHT);

    let panelX = 1;
    let panelWidth = 44;
    let scrollbarX = 1;

    if (appState.layout === "large") {
        panelX = width - panelWidth - 1;
        scrollbarX = width - 2;
    } else if (appState.layout === "medium") {
        panelX = 3;
        scrollbarX = 1;
    } else if (appState.layout === "small") {
        panelX = 3;
        scrollbarX = 1;
    }

    if (appState.layout === "large") {
        terminal.draw(
            width - 11,
            2,
            "[U]pgrades",
            focused ? chalk.blue.bold : chalk.gray.bold,
        );

        if (focused) terminal.draw(width - 23, 2, "j(↓) / k(↑)", chalk.gray);
    } else {
        terminal.draw(
            1,
            2,
            "[U]pgrades",
            focused ? chalk.blue.bold : chalk.gray.bold,
        );
        if (focused) terminal.draw(12, 2, "j(↓) / k(↑)", chalk.gray);
    }

    const filtered = getFilteredUpgrades(appState, gameState);
    const start = appState.ui.upgrades.scrollOffset;
    const end = Math.min(start + maxVisible, filtered.length);

    for (let i = start; i < end; i++) {
        const upgrade = filtered[i];
        const y = panelY + (i - start) * UPGRADE_ITEM_HEIGHT;
        drawUpgrade(
            terminal,
            panelX,
            y,
            panelWidth,
            upgrade,
            focused && i === appState.ui.upgrades.selectedIndex,
            gameState,
        );
    }

    const scrollbar = calculateScrollbar(
        filtered.length,
        maxVisible,
        appState.ui.upgrades.scrollOffset,
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

    const hint = appState.ui.upgradesShowMaxed
        ? "[H]ide maxed upgrades"
        : "Un[h]ide maxed upgrades";
    const hintX = appState.layout === "large" ? width - hint.length - 1 : 1;
    terminal.draw(hintX, 1, hint, chalk.gray.italic);
}

export function ensureUpgradeVisible(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const { height } = terminal.getSize();
    const panelHeight = height - 5;
    const maxVisible = Math.floor(panelHeight / UPGRADE_ITEM_HEIGHT);
    const filtered = getFilteredUpgrades(appState, gameState);

    appState.ui.upgrades.scrollOffset = ensureVisible(
        appState.ui.upgrades.selectedIndex,
        appState.ui.upgrades.scrollOffset,
        maxVisible,
        filtered.length,
    );
}

export function moveUpgradeSelection(
    appState: AppState,
    terminal: ITerminal,
    delta: number,
    gameState: GameState,
) {
    const filtered = getFilteredUpgrades(appState, gameState);
    let newIndex = appState.ui.upgrades.selectedIndex + delta;
    newIndex = Math.max(0, Math.min(newIndex, filtered.length - 1));
    appState.ui.upgrades.selectedIndex = newIndex;

    ensureUpgradeVisible(appState, gameState, terminal);
}
