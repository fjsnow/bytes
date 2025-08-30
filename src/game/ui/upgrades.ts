import chalk from "chalk";
import type { ITerminal } from "../../core/terminal";
import { formatBytes } from "../../utils/bytes";
import { wrapText } from "../../utils/text";
import type { AppState, GameState } from "../state";
import { UPGRADE_DATA, type Upgrade } from "../data/upgrades";

export function getFilteredUpgrades(appState: AppState, gameState: GameState) {
    return UPGRADE_DATA.filter((u) => {
        if (appState.ui.upgradesShowMaxed) return true;
        const owned = gameState.upgrades[u.id] || 0;
        return !u.maxOwned || owned < u.maxOwned;
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
    const availableHeight = height - 5;
    const maxPerUpgrade = 5;
    const maxUpgrades = Math.floor(availableHeight / maxPerUpgrade);

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
    const end = Math.min(start + maxUpgrades, filtered.length);

    for (let i = start; i < end; i++) {
        const upgrade = filtered[i];
        const y = 3 + (i - start) * maxPerUpgrade;
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

    const barHeight = height - 5;
    const total = filtered.length;
    if (total > maxUpgrades) {
        const scrollbarHeight = Math.max(
            1,
            Math.floor((barHeight * maxUpgrades) / total),
        );
        const maxScroll = total - maxUpgrades;
        const scrollRatio =
            maxScroll > 0 ? appState.ui.upgrades.scrollOffset / maxScroll : 0;
        const scrollbarY =
            3 + Math.floor((barHeight - scrollbarHeight) * scrollRatio);

        for (let y = 3; y < 3 + barHeight; y++) {
            if (y >= scrollbarY && y < scrollbarY + scrollbarHeight) {
                terminal.draw(scrollbarX, y, "┃", chalk.gray);
            }
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
    const maxPerUpgrade = 5;
    const maxVisible = Math.floor((height - 5) / maxPerUpgrade);

    const filtered = getFilteredUpgrades(appState, gameState);
    const sel = appState.ui.upgrades.selectedIndex;
    let scroll = appState.ui.upgrades.scrollOffset;

    if (sel < scroll) {
        scroll = sel;
    } else if (sel >= scroll + maxVisible) {
        scroll = sel - maxVisible + 1;
    }

    const maxScroll = Math.max(0, filtered.length - maxVisible);
    if (scroll > maxScroll) {
        scroll = maxScroll;
    }

    appState.ui.upgrades.scrollOffset = Math.max(0, scroll);
}

export function moveUpgradeSelection(
    appState: AppState,
    terminal: ITerminal,
    delta: number,
    gameState: GameState,
) {
    const filtered = getFilteredUpgrades(appState, gameState);
    appState.ui.upgrades.selectedIndex += delta;
    if (appState.ui.upgrades.selectedIndex < 0)
        appState.ui.upgrades.selectedIndex = 0;
    if (appState.ui.upgrades.selectedIndex >= filtered.length)
        appState.ui.upgrades.selectedIndex = filtered.length - 1;

    ensureUpgradeVisible(appState, gameState, terminal);
}
