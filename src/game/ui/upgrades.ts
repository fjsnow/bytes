import chalk from "chalk";
import { draw, getSize } from "../../core/screen";
import { formatBytes } from "../../utils/bytes";
import { appState, gameState } from "../state";
import { UPGRADE_DATA, type Upgrade } from "../data/upgrades";

function getFilteredUpgrades() {
    return UPGRADE_DATA.filter((u) => {
        if (appState.ui.upgradesShowMaxed) return true;
        const owned = gameState.upgrades[u.id] || 0;
        return !u.maxOwned || owned < u.maxOwned;
    });
}

function wrapText(text: string, width: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let current = "";
    for (const word of words) {
        if ((current + word).length > width) {
            lines.push(current.trim());
            current = word + " ";
        } else {
            current += word + " ";
        }
    }
    if (current.trim().length > 0) lines.push(current.trim());
    return lines;
}

function drawUpgrade(
    x: number,
    y: number,
    width: number,
    upgrade: Upgrade,
    highlight: boolean,
) {
    const count = gameState.upgrades[upgrade.id] || 0;
    const cost = upgrade.baseCost;
    const formattedCost = formatBytes(cost);
    const canAfford = gameState.cookies >= cost;

    draw(x + 2, y, upgrade.name, canAfford ? chalk.blue.bold : chalk.blue);

    const ownedText = upgrade.maxOwned
        ? upgrade.maxOwned === 1
            ? count === 1
                ? " (owned)"
                : " (not owned)"
            : ` (owned: ${count} / ${upgrade.maxOwned})`
        : ` (owned: ${count})`;

    draw(x + 2 + upgrade.name.length, y, ownedText, chalk.gray);
    draw(x + 2, y + 1, "cost: ", chalk.gray);
    draw(x + 8, y + 1, formattedCost, chalk.white);

    const descLines = wrapText(upgrade.description, width - 4);
    for (let i = 0; i < descLines.length; i++) {
        draw(x + 2, y + 2 + i, descLines[i], chalk.gray.italic);
    }

    if (highlight) {
        draw(x, y, ">", chalk.blue);
        if (canAfford) {
            if (upgrade.maxOwned && count >= upgrade.maxOwned) {
                draw(x + 2, y + 2 + descLines.length, "maxed out", chalk.red);
            } else {
                draw(x + 2, y + 2 + descLines.length, "[b]uy", chalk.green);
            }
        } else {
            draw(
                x + 2,
                y + 2 + descLines.length,
                "you cannot afford this",
                chalk.red,
            );
        }
    }
}

export function drawUpgrades() {
    const { width, height } = getSize();
    const focused = appState.ui.focus === "upgrades";
    const availableHeight = height - 3;
    const maxPerUpgrade = 5;
    const maxUpgrades = Math.floor(availableHeight / maxPerUpgrade);

    let panelX = 1;
    let panelWidth = 44;
    let scrollbarX = 1;

    if (appState.layout === "large") {
        panelX = width - panelWidth - 1;
        scrollbarX = width - 2;
    } else if (appState.layout === "medium") {
        panelX = 1;
        scrollbarX = 1;
    } else if (appState.layout === "small") {
        panelX = 1;
        scrollbarX = 1;
    }

    if (appState.layout === "large") {
        draw(
            width - 13,
            2,
            "Upgrades",
            focused ? chalk.blue.bold : chalk.gray.bold,
        );
        draw(width - 5, 2, " (U)", chalk.gray);
    } else {
        draw(1, 2, "Upgrades", focused ? chalk.blue.bold : chalk.gray.bold);
        draw(9, 2, " (U)", chalk.gray);
    }

    const filtered = getFilteredUpgrades();
    const start = appState.ui.upgrades.scrollOffset;
    const end = Math.min(start + maxUpgrades, filtered.length);

    for (let i = start; i < end; i++) {
        const upgrade = filtered[i];
        const y = 3 + (i - start) * maxPerUpgrade;
        drawUpgrade(
            panelX,
            y,
            panelWidth,
            upgrade,
            focused && i === appState.ui.upgrades.selectedIndex,
        );
    }

    const barHeight = height - 4;
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
                draw(scrollbarX, y, "┃", chalk.gray);
            }
        }
    }

    const hint = appState.ui.upgradesShowMaxed
        ? "[H]ide maxed upgrades"
        : "Un[h]ide maxed upgrades";
    const hintX = appState.layout === "large" ? width - hint.length - 1 : 1;
    draw(hintX, 1, hint, chalk.gray.italic);
}
