import {
    clickCookie,
    buyWorker,
    buyUpgrade,
    skipTime,
    prestige,
} from "./systems";
import type { AppState, GameState, Focus, Layout } from "./state";
import type { ITerminal } from "../core/terminal";
import { WORKER_DATA } from "./data/workers";
import { logger } from "../utils/logger";
import { getSettingsItems, moveSettingsSelection } from "./ui/settings";
import {
    getFilteredUpgrades,
    moveUpgradeSelection,
    ensureUpgradeVisible,
} from "./ui/upgrades";
import { moveWorkerSelection } from "./ui/workers";
import type { GameSession } from "./session";
import {
    deleteAccountData,
    generateLinkingToken,
    LINKING_TOKEN_COOLDOWN_MS,
    revokeLinkingToken,
    unlinkKey,
} from "./account";
import { generateMessage } from "../utils/messages";

export function cycleFocus(appState: AppState) {
    if (appState.screen !== "main") {
        appState.screen = "main";
        appState.ui.focus = appState.ui.lastFocusBeforeSettings || "main";
        if (appState.layout !== "small" && appState.ui.focus === "main") {
            appState.ui.focus = "workers";
        }
        return;
    }

    const focusOrderForLayout: Record<Layout, Focus[]> = {
        large: ["main", "workers", "upgrades"],
        medium: ["main", "workers", "upgrades"],
        small: ["main"],
    };

    let order = focusOrderForLayout[appState.layout];

    if (appState.layout === "small") {
        appState.ui.focus = "main";
        return;
    }

    const currentFocusIndex = order.indexOf(appState.ui.focus);
    let nextFocusIndex = (currentFocusIndex + 1) % order.length;

    if (
        order[nextFocusIndex] === "main" &&
        (appState.layout === "large" || appState.layout === "medium")
    ) {
        nextFocusIndex = (nextFocusIndex + 1) % order.length;
    }

    appState.ui.focus = order[nextFocusIndex];
    if (
        appState.ui.focus === "main" &&
        (appState.layout === "large" || appState.layout === "medium")
    ) {
        appState.ui.focus = "workers";
    }
}

export async function handleGameInput(session: GameSession, key: string) {
    const { appState, gameState, terminal } = session;

    if (appState.debug) {
        if (key === "0") {
            skipTime(gameState, 1);
            session.render();
            return;
        } else if (key === "1") {
            skipTime(gameState, 10);
            session.render();
            return;
        } else if (key === "2") {
            skipTime(gameState, 60);

            session.render();
            return;
        }
    }

    if (key === "\t") {
        if (appState.screen === "settings") {
            const allItems = getSettingsItems(appState);
            const selectedItem = allItems[appState.ui.settings.selectedIndex];
            if (selectedItem && selectedItem.type === "options") {
                const currentIndex = selectedItem.options.findIndex(
                    (o) =>
                        o.value ===
                        appState.ui.settings[
                            selectedItem.id as keyof typeof appState.ui.settings
                        ],
                );
                const nextIndex =
                    (currentIndex + 1) % selectedItem.options.length;
                appState.ui.settings[selectedItem.id] = selectedItem.options[
                    nextIndex
                ].value as any;
                session.render();
                return;
            }
        }
        appState.ui.confirmPrestige = false;
        cycleFocus(appState);
        session.render();
        return;
    } else if (key === "\u0008" || key === "\u007f") {
        if (appState.screen !== "main") {
            if (appState.screen === "settings") {
                appState.ui.settings.isDeletingAccount = false;
                appState.ui.settings.confirmDeleteAccount = false;
                appState.ui.settings.isDeletingKey = false;
                appState.ui.settings.keyToDelete = null;
            }
            appState.ui.confirmPrestige = false;
            appState.screen = "main";
            appState.ui.focus = appState.ui.lastFocusBeforeSettings || "main";
            if (appState.layout !== "small" && appState.ui.focus === "main") {
                appState.ui.focus = "workers";
            }
            session.render();
            return;
        }
    }

    if (key === " " && appState.screen !== "settings") {
        clickCookie(appState, gameState, terminal);
    }

    if (appState.ui.confirmPrestige && appState.screen === "main") {
        if (key.toLowerCase() === "y") {
            prestige(gameState, appState);
        }
        appState.ui.confirmPrestige = false;
        session.render();
        return;
    }

    if (
        key.toLowerCase() === "p" &&
        appState.screen === "main" &&
        gameState.cookies >= gameState.prestigeCost
    ) {
        appState.ui.confirmPrestige = !appState.ui.confirmPrestige;
        session.render();
        return;
    }

    if (appState.screen === "main") {
        if (appState.layout === "large") {
            handleLargeMainScreenInput(appState, gameState, terminal, key);
        } else if (appState.layout === "medium") {
            handleMediumMainScreenInput(appState, gameState, terminal, key);
        } else {
            handleSmallMainScreenInput(appState, gameState, terminal, key);
        }
    } else if (appState.screen === "settings") {
        await handleSettingsScreenInput(session, key);
    } else if (appState.screen === "workers") {
        handleWorkersScreenInput(appState, gameState, terminal, key);
    } else if (appState.screen === "upgrades") {
        handleUpgradesScreenInput(appState, gameState, terminal, key);
    }

    session.render();
}

function toggleUpgradesShowMaxed(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
) {
    const currentFiltered = getFilteredUpgrades(appState, gameState);
    const selectedUpgradeId =
        currentFiltered[appState.ui.upgrades.selectedIndex]?.id;

    appState.ui.upgradesShowMaxed = !appState.ui.upgradesShowMaxed;
    const newFiltered = getFilteredUpgrades(appState, gameState);
    let newSelectedIndex = 0;

    if (selectedUpgradeId) {
        const foundIndex = newFiltered.findIndex(
            (u) => u.id === selectedUpgradeId,
        );
        if (foundIndex !== -1) {
            newSelectedIndex = foundIndex;
        } else {
            newSelectedIndex = Math.max(
                0,
                newFiltered.length > 0 ? newFiltered.length - 1 : 0,
            );
        }
    } else if (newFiltered.length > 0) {
        newSelectedIndex = Math.min(
            appState.ui.upgrades.selectedIndex,
            newFiltered.length - 1,
        );
    }

    appState.ui.upgrades.selectedIndex = newSelectedIndex;
    ensureUpgradeVisible(appState, gameState, terminal);
}

function handleWorkersScreenInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    if (appState.ui.focus === "workers") {
        if (key === "j") moveWorkerSelection(appState, terminal, 1, gameState);
        if (key === "k") moveWorkerSelection(appState, terminal, -1, gameState);
        if (key.toLowerCase() === "b") {
            const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
            if (worker) buyWorker(worker.id, gameState);
        }
        appState.ui.confirmPrestige = false;
    }
}

function handleUpgradesScreenInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    if (appState.ui.focus === "upgrades") {
        if (key === "j") moveUpgradeSelection(appState, terminal, 1, gameState);
        if (key === "k")
            moveUpgradeSelection(appState, terminal, -1, gameState);
        if (key.toLowerCase() === "b") {
            const filtered = getFilteredUpgrades(appState, gameState);
            const upgrade = filtered[appState.ui.upgrades.selectedIndex];
            if (upgrade) buyUpgrade(upgrade.id, gameState);
        }
        if (key.toLowerCase() === "h") {
            toggleUpgradesShowMaxed(appState, gameState, terminal);
        }
        appState.ui.confirmPrestige = false;
    }
}

async function handleSettingsScreenInput(session: GameSession, key: string) {
    const { appState, terminal } = session;

    const allItems = getSettingsItems(appState);
    const selectedIndex = appState.ui.settings.selectedIndex;
    const currentSelectedItem = allItems[selectedIndex];

    if (key === "j") {
        moveSettingsSelection(appState, 1, terminal);
        appState.ui.settings.isDeletingAccount = false;
        appState.ui.settings.confirmDeleteAccount = false;
        appState.ui.settings.isDeletingKey = false;
        appState.ui.settings.keyToDelete = null;
        return;
    }
    if (key === "k") {
        moveSettingsSelection(appState, -1, terminal);
        appState.ui.settings.isDeletingAccount = false;
        appState.ui.settings.confirmDeleteAccount = false;
        appState.ui.settings.isDeletingKey = false;
        appState.ui.settings.keyToDelete = null;
        return;
    }

    if (appState.ui.settings.isDeletingAccount) {
        if (key.toLowerCase() === "y") {
            if (appState.mode === "ssh" && appState.ssh) {
                deleteAccountData(appState.ssh.db, appState.ssh.accountId);
                (
                    terminal as import("../core/terminal").SshTerminal
                ).endAndRestore(
                    generateMessage(
                        "success",
                        "All your data has been deleted.",
                    ),
                );
                await session.destroy();
            } else {
                appState.ui.settings.isDeletingAccount = false;
                appState.ui.settings.confirmDeleteAccount = false;
            }
        } else if (key.toLowerCase() === "n") {
            appState.ui.settings.isDeletingAccount = false;
            appState.ui.settings.confirmDeleteAccount = false;
        }
        return;
    }

    if (
        appState.ui.settings.isDeletingKey &&
        appState.ui.settings.keyToDelete
    ) {
        const keyToRemove = appState.ui.settings.keyToDelete;
        const totalLinkedKeys = appState.ui.settings.linkedKeys.length;
        if (totalLinkedKeys === 1) {
            return;
        }

        if (key.toLowerCase() === "y") {
            if (appState.mode === "ssh" && appState.ssh) {
                unlinkKey(appState.ssh.db, keyToRemove);
                appState.ui.settings.linkedKeys =
                    appState.ui.settings.linkedKeys.filter(
                        (k) => k !== keyToRemove,
                    );

                const newAllItems = getSettingsItems(appState);
                let newActualIndex = selectedIndex;
                if (newActualIndex >= newAllItems.length) {
                    newActualIndex = newAllItems.length - 1;
                }
                while (
                    newActualIndex >= 0 &&
                    newAllItems[newActualIndex].type === "linkedKeysHeader"
                ) {
                    newActualIndex = Math.max(0, newActualIndex - 1);
                }
                appState.ui.settings.selectedIndex = newActualIndex;

                if (keyToRemove === appState.ssh.accountKey) {
                    (
                        terminal as import("../core/terminal").SshTerminal
                    ).endAndRestore(
                        generateMessage(
                            "success",
                            "Your active key has been unlinked and your session was closed.",
                        ),
                    );
                    await session.destroy();
                }
            }
        }
        appState.ui.settings.isDeletingKey = false;
        appState.ui.settings.keyToDelete = null;
        return;
    }

    if (!currentSelectedItem) return;

    if (currentSelectedItem.type === "toggle") {
        const currentToggleState = appState.ui.settings[currentSelectedItem.id];
        if (key.toLowerCase() === "e" && !currentToggleState) {
            appState.ui.settings[currentSelectedItem.id] = true;
        } else if (key.toLowerCase() === "d" && currentToggleState) {
            appState.ui.settings[currentSelectedItem.id] = false;
        }
    } else if (currentSelectedItem.type === "action") {
        if (
            currentSelectedItem.id === "generateToken" &&
            key.toLowerCase() === "g" &&
            appState.ui.settings.linkingToken === null
        ) {
            const now = Date.now();
            const lastGenerated =
                appState.ui.settings.linkingTokenGeneratedAt || 0;

            if (
                now - lastGenerated > LINKING_TOKEN_COOLDOWN_MS &&
                appState.mode === "ssh" &&
                appState.ssh
            ) {
                await generateLinkingToken(appState, appState.ssh.db);
                logger.info(
                    `Generated linking token for account ${appState.ssh.accountId}: ${appState.ui.settings.linkingToken}`,
                );
            }
        } else if (
            currentSelectedItem.id === "generateToken" &&
            appState.ui.settings.linkingToken &&
            key.toLowerCase() === "r"
        ) {
            if (appState.mode === "ssh" && appState.ssh) {
                revokeLinkingToken(appState, appState.ssh.db);
            }
        } else if (
            currentSelectedItem.id === "deleteAllData" &&
            key.toLowerCase() === "d"
        ) {
            appState.ui.settings.isDeletingAccount = true;
            appState.ui.settings.confirmDeleteAccount = false;
        }
    } else if (
        currentSelectedItem.type === "linkedKey" &&
        key.toLowerCase() === "r"
    ) {
        if (appState.mode === "ssh" && appState.ssh) {
            const keyToRemove = currentSelectedItem.pubkey;
            const totalLinkedKeys = appState.ui.settings.linkedKeys.length;
            if (currentSelectedItem.isCurrentKey && totalLinkedKeys === 1) {
                return;
            }

            appState.ui.settings.isDeletingKey = true;
            appState.ui.settings.keyToDelete = keyToRemove;
        }
    }
}

function handleLargeMainScreenInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    const map: Record<string, () => void> = {
        w: () => {
            appState.ui.focus = "workers";
            appState.ui.confirmPrestige = false;
        },
        u: () => {
            appState.ui.focus = "upgrades";
            appState.ui.confirmPrestige = false;
        },
        s: () => {
            appState.screen = "settings";
            appState.ui.lastFocusBeforeSettings = appState.ui.focus;
            appState.ui.focus = "settings";
            appState.ui.settings.selectedIndex = 0;
            appState.ui.settings.isDeletingAccount = false;
            appState.ui.settings.confirmDeleteAccount = false;
            appState.ui.settings.isDeletingKey = false;
            appState.ui.settings.keyToDelete = null;
            appState.ui.confirmPrestige = false;
        },
        j: () => {
            if (appState.ui.focus === "workers") {
                moveWorkerSelection(appState, terminal, 1, gameState);
            } else if (appState.ui.focus === "upgrades") {
                moveUpgradeSelection(appState, terminal, 1, gameState);
            } else if (appState.ui.focus === "main") {
                appState.ui.focus = "workers";
            }
            appState.ui.confirmPrestige = false;
        },
        k: () => {
            if (appState.ui.focus === "workers") {
                moveWorkerSelection(appState, terminal, -1, gameState);
            } else if (appState.ui.focus === "upgrades") {
                moveUpgradeSelection(appState, terminal, -1, gameState);
            } else if (appState.ui.focus === "main") {
                appState.ui.focus = "upgrades";
            }
            appState.ui.confirmPrestige = false;
        },
        b: () => {
            if (appState.ui.focus === "workers") {
                const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
                if (worker) buyWorker(worker.id, gameState);
            } else if (appState.ui.focus === "upgrades") {
                const filtered = getFilteredUpgrades(appState, gameState);
                const upgrade = filtered[appState.ui.upgrades.selectedIndex];
                if (upgrade) buyUpgrade(upgrade.id, gameState);
            }
            appState.ui.confirmPrestige = false;
        },
    };
    if (key.toLowerCase() === "h") {
        toggleUpgradesShowMaxed(appState, gameState, terminal);
        appState.ui.confirmPrestige = false;
    } else if (map[key]) {
        map[key]();
    }
}

function handleMediumMainScreenInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    const map: Record<string, () => void> = {
        w: () => {
            appState.ui.focus = "workers";
            appState.ui.confirmPrestige = false;
        },
        u: () => {
            appState.ui.focus = "upgrades";
            appState.ui.confirmPrestige = false;
        },
        s: () => {
            appState.screen = "settings";
            appState.ui.lastFocusBeforeSettings = appState.ui.focus;
            appState.ui.focus = "settings";
            appState.ui.settings.selectedIndex = 0;
            appState.ui.settings.isDeletingAccount = false;
            appState.ui.settings.confirmDeleteAccount = false;
            appState.ui.settings.isDeletingKey = false;
            appState.ui.settings.keyToDelete = null;
            appState.ui.confirmPrestige = false;
        },
        j: () => {
            if (appState.ui.focus === "workers") {
                moveWorkerSelection(appState, terminal, 1, gameState);
            } else if (appState.ui.focus === "upgrades") {
                moveUpgradeSelection(appState, terminal, 1, gameState);
            } else if (appState.ui.focus === "main") {
                appState.ui.focus = "workers";
            }
            appState.ui.confirmPrestige = false;
        },
        k: () => {
            if (appState.ui.focus === "workers") {
                moveWorkerSelection(appState, terminal, -1, gameState);
            } else if (appState.ui.focus === "upgrades") {
                moveUpgradeSelection(appState, terminal, -1, gameState);
            } else if (appState.ui.focus === "main") {
                appState.ui.focus = "upgrades";
            }
            appState.ui.confirmPrestige = false;
        },
        b: () => {
            if (appState.ui.focus === "workers") {
                const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
                if (worker) buyWorker(worker.id, gameState);
            } else if (appState.ui.focus === "upgrades") {
                const filtered = getFilteredUpgrades(appState, gameState);
                const upgrade = filtered[appState.ui.upgrades.selectedIndex];
                if (upgrade) buyUpgrade(upgrade.id, gameState);
            }
            appState.ui.confirmPrestige = false;
        },
        h: () => {
            if (appState.ui.focus === "upgrades") {
                toggleUpgradesShowMaxed(appState, gameState, terminal);
            }
            appState.ui.confirmPrestige = false;
        },
    };
    if (map[key]) map[key]();
}

function handleSmallMainScreenInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    const map: Record<string, () => void> = {
        w: () => {
            appState.screen = "workers";
            appState.ui.focus = "workers";
            appState.ui.confirmPrestige = false;
        },
        u: () => {
            appState.screen = "upgrades";
            appState.ui.focus = "upgrades";
            appState.ui.confirmPrestige = false;
        },
        s: () => {
            appState.screen = "settings";
            appState.ui.lastFocusBeforeSettings = appState.ui.focus;
            appState.ui.focus = "settings";
            appState.ui.settings.selectedIndex = 0;
            appState.ui.settings.isDeletingAccount = false;
            appState.ui.settings.confirmDeleteAccount = false;
            appState.ui.settings.isDeletingKey = false;
            appState.ui.settings.keyToDelete = null;
            appState.ui.confirmPrestige = false;
        },
    };
    if (map[key]) map[key]();
}
