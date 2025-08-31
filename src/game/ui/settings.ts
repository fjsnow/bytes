import type { AppState, GameState } from "../state";
import type { ITerminal } from "../../core/terminal";
import { redactPlayerKey } from "../../utils/logger";
import { wrapText, formatTime } from "../../utils/text";
import { formatBytes } from "../../utils/bytes";
import { TPS } from "../../core/ticker";
import chalk from "chalk";
import {
    LINKING_TOKEN_COOLDOWN_MS,
    LINKING_TOKEN_DURATION_MS,
} from "../account";
import {
    calculateScrollbar,
    calculateVisibleRange,
    ensureVisibleVariable,
} from "../../utils/scrollbar";

export type SettingsItem =
    | {
          type: "toggle";
          id: "pureBlackBackground";
          label: string;
          description?: string;
      }
    | {
          type: "options";
          id: "fallingBits";
          label: string;
          options: { value: string; label: string }[];
          description?: string;
      }
    | { type: "linkedKeysHeader" }
    | { type: "linkedKey"; pubkey: string; isCurrentKey: boolean }
    | {
          type: "action";
          id: "generateToken" | "deleteAllData";
          label: string;
          description?: string;
      };

export function getSettingsItemHeight(
    item: SettingsItem,
    appState: AppState,
    panelWidth: number,
): number {
    switch (item.type) {
        case "linkedKeysHeader":
            return 1;
        case "toggle": {
            let height = 2;
            if (item.description) {
                const descLines = wrapText(item.description, panelWidth - 4);
                height += descLines.length;
            }
            return height;
        }
        case "options": {
            let height = 2;
            if (item.description) {
                const descLines = wrapText(item.description, panelWidth - 4);
                height += descLines.length;
            }
            return height;
        }
        case "linkedKey":
            return 1;
        case "action": {
            if (item.id === "generateToken") {
                let height = 2;
                if (item.description) {
                    const descLines = wrapText(
                        item.description,
                        panelWidth - 4,
                    );
                    height += descLines.length;
                }
                const tokenActive =
                    appState.ui.settings.linkingToken &&
                    appState.ui.settings.linkingTokenGeneratedAt &&
                    Date.now() - appState.ui.settings.linkingTokenGeneratedAt <
                        LINKING_TOKEN_DURATION_MS;
                if (tokenActive) {
                    height += 4;
                }
                return height;
            } else if (item.id === "deleteAllData") {
                let height = 1;
                if (item.description) {
                    const descLines = wrapText(
                        item.description,
                        panelWidth - 4,
                    );
                    height += descLines.length;
                }
                height += 1;
                return height;
            }
            return 1;
        }
        default:
            return 1;
    }
}

export function getSettingsItems(appState: AppState): SettingsItem[] {
    const items: SettingsItem[] = [
        {
            type: "toggle",
            id: "pureBlackBackground",
            label: "Pure black background",
            description:
                "Enables a pure black background, may look better on lighter backgrounds.",
        },
        {
            type: "options",
            id: "fallingBits",
            label: "Falling Bits",
            options: [
                { value: "full", label: "Full" },
                { value: "reduced", label: "Reduced" },
                { value: "disabled", label: "Disabled" },
            ],
            description:
                "Control the intensity of falling bits or disable them completely.",
        },
    ];

    if (appState.mode === "ssh") {
        items.push({
            type: "action",
            id: "generateToken",
            label: "Generate linking token",
            description: "Link another SSH key to your account.",
        });
        items.push({ type: "linkedKeysHeader" });
        for (const key of appState.ui.settings.linkedKeys) {
            items.push({
                type: "linkedKey",
                pubkey: key,
                isCurrentKey: key === appState.ssh?.accountKey,
            });
        }
        items.push({
            type: "action",
            id: "deleteAllData",
            label: "Delete all data",
            description:
                "Delete your account and all associated linked keys (irreversible).",
        });
    }

    return items;
}

function getGapAfter(
    index: number,
    allItems: SettingsItem[],
    itemHeight: number,
): number {
    if (index >= allItems.length - 1 || itemHeight === 0) {
        return 0;
    }

    const nextItem = allItems[index + 1];
    if (nextItem.type === "linkedKey") {
        return 0;
    }

    return 1;
}

export function drawSettings(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const { width, height } = terminal.getSize();

    const maxPanelWidth = 70;
    const panelWidth = Math.min(maxPanelWidth, width - 5);
    const panelY = 3;
    const panelHeight = height - 6;

    let contentStartX: number;
    let pointerX: number;
    let scrollbarX: number;

    if (appState.layout === "large" || appState.layout === "medium") {
        const { x: panelStartX } = terminal.getCenterForSize(panelWidth, 0);
        contentStartX = panelStartX + 4;
        pointerX = panelStartX + 2;
        scrollbarX = panelStartX;
        terminal.draw(panelStartX, panelY - 1, "[S]ettings", chalk.white.bold);
        terminal.draw(panelStartX + 11, panelY - 1, "j(↓) / k(↑)", chalk.gray);
    } else {
        contentStartX = 7;
        pointerX = 5;
        scrollbarX = 1;
        terminal.draw(1, 2, "[S]ettings", chalk.white.bold);
        terminal.draw(12, 2, "j(↓) / k(↑)", chalk.gray);
    }

    const allItems = getSettingsItems(appState);
    appState.ui.settings.selectedIndex = Math.max(
        0,
        Math.min(appState.ui.settings.selectedIndex, allItems.length - 1),
    );

    const itemHeights = allItems.map((item, i) => {
        const h = getSettingsItemHeight(item, appState, panelWidth);
        return h + getGapAfter(i, allItems, h);
    });

    ensureSettingsVisible(appState, terminal);

    const { startIndex, endIndex } = calculateVisibleRange(
        itemHeights,
        panelHeight,
        appState.ui.settings.scrollOffset,
    );

    let yOffset = 0;
    for (let i = startIndex; i <= endIndex; i++) {
        const item = allItems[i];
        const isSelected = i === appState.ui.settings.selectedIndex;
        let itemContentDrawY = panelY + yOffset;

        const pointerChar =
            isSelected &&
            !appState.ui.settings.isDeletingAccount &&
            !appState.ui.settings.isDeletingKey
                ? ">"
                : " ";

        switch (item.type) {
            case "toggle": {
                const checked = appState.ui.settings[item.id];
                terminal.draw(
                    pointerX,
                    itemContentDrawY,
                    pointerChar,
                    chalk.white,
                );
                terminal.draw(
                    contentStartX,
                    itemContentDrawY,
                    `[${checked ? "x" : " "}] ${item.label}`,
                    isSelected ? chalk.white.bold : chalk.white,
                );
                itemContentDrawY += 1;
                if (item.description) {
                    const descLines = wrapText(
                        item.description,
                        panelWidth - 4,
                    );
                    for (const line of descLines) {
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            line,
                            chalk.gray.italic,
                        );
                        itemContentDrawY++;
                    }
                }
                if (isSelected) {
                    const hint = checked ? "[d]isable" : "[e]nable";
                    const color = checked ? chalk.red : chalk.green;
                    terminal.draw(contentStartX, itemContentDrawY, hint, color);
                }
                break;
            }
            case "options": {
                terminal.draw(
                    pointerX,
                    itemContentDrawY,
                    pointerChar,
                    chalk.white,
                );
                const currentValue = appState.ui.settings[item.id];
                const currentLabel =
                    item.options.find((o) => o.value === currentValue)?.label ||
                    "Unknown";
                terminal.draw(
                    contentStartX,
                    itemContentDrawY,
                    item.label + ": ",
                    isSelected ? chalk.white.bold : chalk.white,
                );
                terminal.draw(
                    contentStartX + item.label.length + 2,
                    itemContentDrawY,
                    currentLabel,
                    chalk.gray,
                );
                itemContentDrawY += 1;
                if (item.description) {
                    const descLines = wrapText(
                        item.description,
                        panelWidth - 4,
                    );
                    for (const line of descLines) {
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY++,
                            line,
                            chalk.gray.italic,
                        );
                    }
                }
                if (isSelected) {
                    terminal.draw(
                        contentStartX,
                        itemContentDrawY,
                        "[tab] to cycle",
                        chalk.green,
                    );
                }
                break;
            }
            case "linkedKeysHeader": {
                const selectedItem =
                    allItems[appState.ui.settings.selectedIndex];
                terminal.draw(
                    contentStartX,
                    itemContentDrawY,
                    "Linked SSH Keys",
                    selectedItem?.type === "linkedKey"
                        ? chalk.white.bold
                        : chalk.white,
                );
                break;
            }
            case "linkedKey": {
                terminal.draw(
                    pointerX,
                    itemContentDrawY,
                    pointerChar,
                    chalk.white,
                );
                let currentX = contentStartX;
                terminal.draw(currentX, itemContentDrawY, "-", chalk.white);
                currentX += 2;
                const redactSize = Math.max(
                    1,
                    Math.floor((panelWidth - 40) / 2),
                );
                const displayKey = redactPlayerKey(item.pubkey, redactSize);
                const keyColor = item.isCurrentKey ? chalk.green : chalk.gray;
                terminal.draw(currentX, itemContentDrawY, displayKey, keyColor);
                currentX += displayKey.length;
                if (item.isCurrentKey) {
                    terminal.draw(
                        currentX,
                        itemContentDrawY,
                        ` (current key)`,
                        chalk.gray.italic,
                    );
                    currentX += 14;
                }
                if (
                    isSelected &&
                    (item.pubkey !== appState.ssh?.accountKey ||
                        appState.ui.settings.linkedKeys.length > 1)
                ) {
                    if (
                        appState.ui.settings.isDeletingKey &&
                        appState.ui.settings.keyToDelete === item.pubkey
                    ) {
                        terminal.draw(
                            currentX + 1,
                            itemContentDrawY,
                            "are you sure? [y]es [n]o",
                            chalk.red.bold,
                        );
                    } else {
                        terminal.draw(
                            currentX + 1,
                            itemContentDrawY,
                            `[r]emove`,
                            chalk.red,
                        );
                    }
                }
                break;
            }
            case "action": {
                terminal.draw(
                    pointerX,
                    itemContentDrawY,
                    pointerChar,
                    chalk.white,
                );
                terminal.draw(
                    contentStartX,
                    itemContentDrawY,
                    `${item.label}`,
                    isSelected ? chalk.white.bold : chalk.white,
                );
                itemContentDrawY++;
                if (item.description) {
                    const descLines = wrapText(
                        item.description,
                        panelWidth - 4,
                    );
                    for (const line of descLines) {
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            line,
                            chalk.gray.italic,
                        );
                        itemContentDrawY++;
                    }
                }
                if (item.id === "generateToken") {
                    const tokenActive =
                        appState.ui.settings.linkingToken &&
                        appState.ui.settings.linkingTokenGeneratedAt &&
                        Date.now() -
                            appState.ui.settings.linkingTokenGeneratedAt <
                            LINKING_TOKEN_DURATION_MS;
                    const onCooldown =
                        Date.now() -
                            (appState.ui.settings.linkingTokenGeneratedAt ||
                                0) <
                        LINKING_TOKEN_COOLDOWN_MS;

                    if (tokenActive) {
                        itemContentDrawY++;
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            ` ssh b.fjsn.io link ${appState.ui.settings.linkingToken!} `,
                            chalk.black.bold.bgWhite,
                        );
                        itemContentDrawY += 2;
                        const remaining = Math.ceil(
                            (LINKING_TOKEN_DURATION_MS -
                                (Date.now() -
                                    appState.ui.settings
                                        .linkingTokenGeneratedAt!)) /
                                1000,
                        );
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            `Expires in: ${Math.floor(remaining / 60)}m ${remaining % 60}s`,
                            chalk.gray.italic,
                        );
                        itemContentDrawY++;
                    } else if (appState.ui.settings.linkingToken) {
                        appState.ui.settings.linkingToken = null;
                    }

                    if (isSelected) {
                        if (tokenActive) {
                            terminal.draw(
                                contentStartX,
                                itemContentDrawY,
                                "[r]evoke token",
                                chalk.red,
                            );
                        } else if (onCooldown) {
                            terminal.draw(
                                contentStartX,
                                itemContentDrawY,
                                `[g]enerate (cooldown)`,
                                chalk.gray,
                            );
                        } else {
                            terminal.draw(
                                contentStartX,
                                itemContentDrawY,
                                "[g]enerate linking token",
                                chalk.green,
                            );
                        }
                    }
                } else if (item.id === "deleteAllData") {
                    if (appState.ui.settings.isDeletingAccount) {
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            "are you sure? [y]es [n]o",
                            chalk.red.bold,
                        );
                    } else if (isSelected) {
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            "[d]elete",
                            chalk.red,
                        );
                    }
                }
                break;
            }
        }
        yOffset += itemHeights[i];
    }

    const visibleItems = endIndex - startIndex + 1;
    const scrollbar = calculateScrollbar(
        allItems.length,
        visibleItems,
        appState.ui.settings.scrollOffset,
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

    const accountId = appState.ssh?.accountId.toString() || "offline";
    const totalBytes = formatBytes(gameState.totalCookiesEarned);
    const timePlayed = formatTime(gameState.ticksPlayed / TPS);
    const visibleLength =
        "id: ".length +
        accountId.length +
        " | bytes baked: ".length +
        totalBytes.length +
        " | playtime: ".length +
        timePlayed.length;
    const { x } = terminal.getCenterForSize(visibleLength, 0);
    let currentX = x;
    terminal.draw(currentX, height - 2, "id: ", chalk.gray);
    currentX += "id: ".length;
    terminal.draw(currentX, height - 2, accountId, chalk.white);
    currentX += accountId.length;
    terminal.draw(currentX, height - 2, " | bytes baked: ", chalk.gray);
    currentX += " | bytes baked: ".length;
    terminal.draw(currentX, height - 2, totalBytes, chalk.white);
    currentX += totalBytes.length;
    terminal.draw(currentX, height - 2, " | playtime: ", chalk.gray);
    currentX += " | playtime: ".length;
    terminal.draw(currentX, height - 2, timePlayed, chalk.white);
}

export function ensureSettingsVisible(
    appState: AppState,
    terminal: ITerminal,
): void {
    const { width, height } = terminal.getSize();
    const allItems = getSettingsItems(appState);
    const maxPanelWidth = 70;
    const panelWidth = Math.min(maxPanelWidth, width - 5);
    const panelHeight = height - 6;

    const itemHeights = allItems.map((item, i) => {
        const h = getSettingsItemHeight(item, appState, panelWidth);
        return h + getGapAfter(i, allItems, h);
    });

    appState.ui.settings.scrollOffset = ensureVisibleVariable(
        appState.ui.settings.selectedIndex,
        appState.ui.settings.scrollOffset,
        itemHeights,
        panelHeight,
    );
}

export function moveSettingsSelection(
    appState: AppState,
    delta: number,
    terminal: ITerminal,
): void {
    const allItems = getSettingsItems(appState);
    let newSelectedIndex = appState.ui.settings.selectedIndex + delta;

    newSelectedIndex = Math.max(
        0,
        Math.min(newSelectedIndex, allItems.length - 1),
    );

    while (
        newSelectedIndex > 0 &&
        newSelectedIndex < allItems.length - 1 &&
        allItems[newSelectedIndex].type === "linkedKeysHeader"
    ) {
        newSelectedIndex += delta > 0 ? 1 : -1;
    }
    newSelectedIndex = Math.max(
        0,
        Math.min(newSelectedIndex, allItems.length - 1),
    );

    if (
        newSelectedIndex >= 0 &&
        newSelectedIndex < allItems.length &&
        allItems[newSelectedIndex].type === "linkedKeysHeader"
    ) {
        newSelectedIndex = appState.ui.settings.selectedIndex;
    }

    appState.ui.settings.selectedIndex = newSelectedIndex;
    ensureSettingsVisible(appState, terminal);
}
