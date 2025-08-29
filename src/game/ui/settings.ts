import type { AppState, GameState } from "../state";
import type { ITerminal } from "../../core/terminal";
import { redactPlayerKey } from "../../utils/logger";
import { wrapText } from "../../utils/text";
import chalk from "chalk";
import {
    LINKING_TOKEN_COOLDOWN_MS,
    LINKING_TOKEN_DURATION_MS,
} from "../account";

export type SettingsItem =
    | {
          type: "toggle";
          id: "pureBlackBackground" | "reduceFallingBits";
          label: string;
          description?: string;
      }
    | { type: "header"; label: string }
    | { type: "linkedKey"; pubkey: string; isCurrentKey: boolean }
    | {
          type: "action";
          id: "generateToken" | "deleteAllData";
          label: string;
          description?: string;
      };

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
            type: "toggle",
            id: "reduceFallingBits",
            label: "Reduce Falling Bits",
            description: "Reduces distractions by having fewer falling bits.",
        },
    ];

    if (appState.mode === "ssh") {
        items.push({
            type: "action",
            id: "generateToken",
            label: "Generate linking token",
            description: "Link another SSH key to your account.",
        });
        items.push({ type: "header", label: "Linked SSH keys" });
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

export function drawSettings(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const { width, height } = terminal.getSize();

    const maxPanelWidth = 70;
    const panelWidth = Math.min(maxPanelWidth, width - 5);
    const panelHeight = Math.min(
        height - 4,
        getSettingsItems(appState).length * 4 + 10,
    );

    const { x: panelStartX, y: panelStartY } = terminal.getCenterForSize(
        panelWidth,
        panelHeight,
    );

    let contentStartX: number;
    let pointerX: number;

    if (appState.layout === "large" || appState.layout === "medium") {
        contentStartX = panelStartX + 2;
        pointerX = panelStartX;
        terminal.draw(
            panelStartX,
            panelStartY - 1,
            "[S]ettings",
            chalk.white.bold,
        );
        terminal.draw(
            panelStartX + 11,
            panelStartY - 1,
            "j(↓) / k(↑)",
            chalk.gray,
        );
    } else {
        contentStartX = 5;
        pointerX = 3;
        terminal.draw(1, 2, "[S]ettings", chalk.white.bold);
        terminal.draw(12, 2, "j(↓) / k(↑)", chalk.gray);
    }

    const allItems = getSettingsItems(appState);

    appState.ui.settings.selectedIndex = Math.max(
        0,
        allItems.length > 0
            ? Math.min(appState.ui.settings.selectedIndex, allItems.length - 1)
            : 0,
    );

    let currentScreenDrawingY = appState.layout === "small" ? 3 : panelStartY;

    for (let i = 0; i < allItems.length; i++) {
        const item = allItems[i];
        const isSelected = i === appState.ui.settings.selectedIndex;

        if (currentScreenDrawingY >= height - 1) break;

        const pointerChar =
            isSelected &&
            !appState.ui.settings.isDeletingAccount &&
            !appState.ui.settings.isDeletingKey
                ? ">"
                : " ";

        if (item.type !== "header" || item.label) {
            terminal.draw(
                pointerX,
                currentScreenDrawingY,
                pointerChar,
                chalk.white,
            );
        }

        let itemContentDrawY = currentScreenDrawingY;

        switch (item.type) {
            case "toggle": {
                const checked = appState.ui.settings[item.id];
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
                    for (let l = 0; l < descLines.length; l++) {
                        if (itemContentDrawY + l >= height - 1) break;
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY + l,
                            descLines[l],
                            chalk.gray.italic,
                        );
                    }
                    itemContentDrawY += descLines.length;
                }

                if (isSelected) {
                    if (itemContentDrawY >= height - 1) break;
                    const toggleHintText = checked ? "[d]isable" : "[e]nable";
                    const toggleHintColor = checked ? chalk.red : chalk.green;
                    terminal.draw(
                        contentStartX,
                        itemContentDrawY,
                        toggleHintText,
                        toggleHintColor,
                    );
                }
                itemContentDrawY += 1;
                break;
            }
            case "header": {
                if (item.label) {
                    terminal.draw(
                        contentStartX,
                        itemContentDrawY,
                        item.label,
                        chalk.white,
                    );
                    itemContentDrawY++;
                }
                break;
            }
            case "linkedKey": {
                let currentX = contentStartX;

                terminal.draw(currentX, itemContentDrawY, "-", chalk.white);
                currentX += 2;

                const actionTextMinWidth = 25;
                const minSpaceForAction = 2 + actionTextMinWidth;
                const availableWidthForRedaction =
                    panelWidth - (currentX - contentStartX) - minSpaceForAction;
                const redactSize = Math.max(
                    1,
                    Math.floor(availableWidthForRedaction / 2) - 1,
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
                    currentX += ` (current key)`.length;
                }

                let actionX = currentX + 1;

                if (
                    isSelected &&
                    (item.pubkey !== appState.ssh?.accountKey ||
                        appState.ui.settings.linkedKeys.length > 1)
                ) {
                    if (itemContentDrawY >= height - 1) break;
                    if (
                        appState.ui.settings.isDeletingKey &&
                        appState.ui.settings.keyToDelete === item.pubkey
                    ) {
                        terminal.draw(
                            actionX,
                            itemContentDrawY,
                            "are you sure? ",
                            chalk.red.bold,
                        );
                        terminal.draw(
                            actionX + 14,
                            itemContentDrawY,
                            "[y]es ",
                            chalk.red,
                        );
                        terminal.draw(
                            actionX + 20,
                            itemContentDrawY,
                            "[n]o",
                            chalk.green,
                        );
                    } else {
                        terminal.draw(
                            actionX,
                            itemContentDrawY,
                            `[r]emove`,
                            chalk.red,
                        );
                    }
                }

                itemContentDrawY++;
                break;
            }
            case "action": {
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
                    for (let l = 0; l < descLines.length; l++) {
                        if (itemContentDrawY + l >= height - 1) break;
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY + l,
                            descLines[l],
                            chalk.gray.italic,
                        );
                    }
                    itemContentDrawY += descLines.length;
                }

                if (item.id === "generateToken") {
                    const tokenActive =
                        appState.ui.settings.linkingToken &&
                        appState.ui.settings.linkingTokenGeneratedAt &&
                        Date.now() -
                            appState.ui.settings.linkingTokenGeneratedAt <
                            LINKING_TOKEN_DURATION_MS;

                    const now = Date.now();
                    const lastGenerated =
                        appState.ui.settings.linkingTokenGeneratedAt || 0;
                    const onCooldown =
                        now - lastGenerated < LINKING_TOKEN_COOLDOWN_MS;

                    if (tokenActive) {
                        if (itemContentDrawY >= height - 1) break;
                        itemContentDrawY++;
                        if (itemContentDrawY >= height - 1) break;
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            ` ssh b.fjsn.io link ${appState.ui.settings.linkingToken!} `,
                            chalk.black.bold.bgWhite,
                        );
                        itemContentDrawY++;
                        if (itemContentDrawY >= height - 1) break;
                        itemContentDrawY++;
                        if (itemContentDrawY >= height - 1) break;

                        const remainingSecondsTotal = Math.ceil(
                            (LINKING_TOKEN_DURATION_MS -
                                (Date.now() -
                                    appState.ui.settings
                                        .linkingTokenGeneratedAt!)) /
                                1000,
                        );
                        const remainingMinutes = Math.floor(
                            remainingSecondsTotal / 60,
                        );
                        const remainingSeconds = remainingSecondsTotal % 60;

                        let timeString = "";
                        if (remainingMinutes > 0) {
                            timeString += `${remainingMinutes}m `;
                        }
                        timeString += `${remainingSeconds}s`;

                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            `Expires in: ${timeString}`,
                            chalk.gray.italic,
                        );
                        itemContentDrawY++;
                    } else if (appState.ui.settings.linkingToken) {
                        if (itemContentDrawY >= height - 1) break;
                        appState.ui.settings.linkingToken = null;
                        appState.ui.settings.linkingTokenGeneratedAt =
                            undefined;
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            "Token expired. Generate a new one.",
                            chalk.red.italic,
                        );
                        itemContentDrawY++;
                    }

                    if (isSelected) {
                        if (itemContentDrawY >= height - 1) break;
                        if (tokenActive) {
                            terminal.draw(
                                contentStartX,
                                itemContentDrawY,
                                "[r]evoke token",
                                chalk.red,
                            );
                        } else if (onCooldown) {
                            const remaining = Math.ceil(
                                (LINKING_TOKEN_COOLDOWN_MS -
                                    (now - lastGenerated)) /
                                    1000,
                            );
                            terminal.draw(
                                contentStartX,
                                itemContentDrawY,
                                `[g]enerate (cooldown: ${remaining}s)`,
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
                    itemContentDrawY++;
                } else if (item.id === "deleteAllData") {
                    if (itemContentDrawY >= height - 1) break;
                    if (appState.ui.settings.isDeletingAccount) {
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            "are you sure? ",
                            chalk.red.bold,
                        );
                        terminal.draw(
                            contentStartX + 14,
                            itemContentDrawY,
                            "[y]es ",
                            chalk.red,
                        );
                        terminal.draw(
                            contentStartX + 20,
                            itemContentDrawY,
                            "[n]o",
                            chalk.green,
                        );
                        itemContentDrawY++;
                    } else if (isSelected) {
                        terminal.draw(
                            contentStartX,
                            itemContentDrawY,
                            "[d]elete",
                            chalk.red,
                        );
                        itemContentDrawY++;
                    }
                }
                break;
            }
        }

        if (i < allItems.length - 1) {
            const nextItem = allItems[i + 1];
            if (
                (item.type === "header" &&
                    nextItem.type === "linkedKey" &&
                    item.label) ||
                (item.type === "linkedKey" && nextItem.type === "linkedKey")
            ) {
            } else if (itemContentDrawY > currentScreenDrawingY) {
                itemContentDrawY++;
            }
        }

        currentScreenDrawingY = itemContentDrawY;
    }

    const accountIdText = `account id: ${appState.ssh?.accountId || "none"}`;
    const { x } = terminal.getCenterForSize(accountIdText.length, 0);
    terminal.draw(x, height - 1, accountIdText, chalk.gray);
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
        allItems.length > 0
            ? Math.min(newSelectedIndex, allItems.length - 1)
            : 0,
    );

    while (
        newSelectedIndex >= 0 &&
        newSelectedIndex < allItems.length &&
        allItems[newSelectedIndex].type === "header"
    ) {
        newSelectedIndex += delta;
        newSelectedIndex = Math.max(
            0,
            allItems.length > 0
                ? Math.min(newSelectedIndex, allItems.length - 1)
                : 0,
        );
    }

    if (allItems[newSelectedIndex]?.type === "header") {
        while (
            newSelectedIndex >= 0 &&
            allItems[newSelectedIndex].type === "header"
        ) {
            newSelectedIndex--;
        }
        newSelectedIndex = Math.max(0, newSelectedIndex);
    }
    appState.ui.settings.selectedIndex = newSelectedIndex;
}
