import { clickCookie, buyWorker, buyUpgrade, skipTime } from "./systems";
import type { AppState, GameState, Focus, Layout, Screen } from "./state";
import type { ITerminal } from "../core/terminal";
import { WORKER_DATA } from "./data/workers";
import { logger, redactPlayerKey } from "../utils/logger";
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

    if (appState.layout !== "small" && appState.ui.focus === "main") {
        appState.ui.focus = "workers";
        return;
    }

    if (appState.layout === "large" || appState.layout === "medium") {
        const idx = order.indexOf(appState.ui.focus);
        appState.ui.focus = order[(idx + 1) % order.length];
        if (appState.ui.focus === "main") {
            appState.ui.focus = "workers";
        }
    } else {
        appState.ui.focus = "main";
    }
}

export async function handleGameInput(session: GameSession, key: string) {
    const { appState, gameState, terminal } = session;

    if (appState.debug) {
        if (key === "0") {
            skipTime(gameState, 1);
            return;
        } else if (key === "1") {
            skipTime(gameState, 10);
            return;
        } else if (key === "2") {
            skipTime(gameState, 60);
            return;
        }
    }

    if (key === "\t") {
        cycleFocus(appState);
        return;
    } else if (key === "\u0008" || key === "\u007f") {
        if (appState.screen !== "main") {
            if (appState.screen === "settings") {
                appState.ui.settings.isDeletingAccount = false;
                appState.ui.settings.confirmDeleteAccount = false;
                appState.ui.settings.isDeletingKey = false;
                appState.ui.settings.keyToDelete = null;
            }

            appState.screen = "main";
            appState.ui.focus = appState.ui.lastFocusBeforeSettings || "main";
            if (appState.layout !== "small" && appState.ui.focus === "main") {
                appState.ui.focus = "workers";
            }
            return;
        }
    }

    if (appState.screen === "main") {
        if (appState.layout === "large") {
            handleLargeInput(appState, gameState, terminal, key);
        } else if (appState.layout === "medium") {
            handleMediumInput(appState, gameState, terminal, key);
        } else {
            handleSmallInput(appState, gameState, terminal, key);
        }
    } else if (appState.screen === "settings") {
        await handleSettingsScreenInput(session, key);
    } else if (appState.screen === "workers") {
        handleWorkersScreenInput(appState, gameState, terminal, key);
    } else if (appState.screen === "upgrades") {
        handleUpgradesScreenInput(appState, gameState, terminal, key);
    }
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
        if (key === "j") moveWorkerSelection(appState, terminal, 1);
        if (key === "k") moveWorkerSelection(appState, terminal, -1);
        if (key.toLowerCase() === "b") {
            const worker = WORKER_DATA[appState.ui.workers.selectedIndex];
            if (worker) buyWorker(worker.id, gameState);
        }
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
                    newAllItems[newActualIndex].type === "header"
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

function handleLargeInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    const map: Record<string, () => void> = {
        " ": () => clickCookie(appState, gameState, terminal),
        w: () => {
            appState.ui.focus = "workers";
        },
        u: () => {
            appState.ui.focus = "upgrades";
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
        },
        j: () => {
            if (appState.ui.focus === "workers") {
                moveWorkerSelection(appState, terminal, 1);
            } else if (appState.ui.focus === "upgrades") {
                moveUpgradeSelection(appState, terminal, 1, gameState);
            } else if (appState.ui.focus === "main") {
                appState.ui.focus = "workers";
            }
        },
        k: () => {
            if (appState.ui.focus === "workers") {
                moveWorkerSelection(appState, terminal, -1);
            } else if (appState.ui.focus === "upgrades") {
                moveUpgradeSelection(appState, terminal, -1, gameState);
            } else if (appState.ui.focus === "main") {
                appState.ui.focus = "workers";
            }
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
        },
    };
    if (key.toLowerCase() === "h") {
        toggleUpgradesShowMaxed(appState, gameState, terminal);
    } else if (map[key]) {
        map[key]();
    }
}

function handleMediumInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    if (appState.screen === "main") {
        const map: Record<string, () => void> = {
            " ": () => clickCookie(appState, gameState, terminal),
            w: () => {
                appState.ui.focus = "workers";
            },
            u: () => {
                appState.ui.focus = "upgrades";
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
            },
            j: () => {
                if (appState.ui.focus === "workers") {
                    moveWorkerSelection(appState, terminal, 1);
                } else if (appState.ui.focus === "upgrades") {
                    moveUpgradeSelection(appState, terminal, 1, gameState);
                } else if (appState.ui.focus === "main") {
                    appState.ui.focus = "workers";
                }
            },
            k: () => {
                if (appState.ui.focus === "workers") {
                    moveWorkerSelection(appState, terminal, -1);
                } else if (appState.ui.focus === "upgrades") {
                    moveUpgradeSelection(appState, terminal, -1, gameState);
                } else if (appState.ui.focus === "main") {
                    appState.ui.focus = "workers";
                }
            },
            b: () => {
                if (appState.ui.focus === "workers") {
                    const worker =
                        WORKER_DATA[appState.ui.workers.selectedIndex];
                    if (worker) buyWorker(worker.id, gameState);
                } else if (appState.ui.focus === "upgrades") {
                    const filtered = getFilteredUpgrades(appState, gameState);
                    const upgrade =
                        filtered[appState.ui.upgrades.selectedIndex];
                    if (upgrade) buyUpgrade(upgrade.id, gameState);
                }
            },
            h: () => {
                if (appState.ui.focus === "upgrades") {
                    toggleUpgradesShowMaxed(appState, gameState, terminal);
                }
            },
        };
        if (map[key]) map[key]();
    }
}

function handleSmallInput(
    appState: AppState,
    gameState: GameState,
    terminal: ITerminal,
    key: string,
) {
    if (appState.screen === "main") {
        const map: Record<string, () => void> = {
            " ": () => clickCookie(appState, gameState, terminal),
            w: () => {
                appState.screen = "workers";
                appState.ui.focus = "workers";
            },
            u: () => {
                appState.screen = "upgrades";
                appState.ui.focus = "upgrades";
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
            },
        };
        if (map[key]) map[key]();
    }
}
