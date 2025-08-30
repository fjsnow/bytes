import { Database } from "bun:sqlite";

export type Mode = "standalone" | "ssh";
export type Screen = "main" | "workers" | "upgrades" | "settings";
export type Layout = "small" | "medium" | "large";
export type Focus = "main" | "workers" | "upgrades" | "settings";

export interface AppState {
    screen: Screen;
    layout: Layout;
    mode: Mode;
    debug: boolean;
    ssh: {
        accountId: number;
        accountKey: string;
        db: Database;
        isNewAccount?: boolean;
    } | null;
    ui: {
        focus: Focus;
        highlightTicks: number;
        fallingBits: {
            x: number;
            y: number;
            one: boolean;
            aliveTicks: number;
        }[];
        workers: {
            selectedIndex: number;
            scrollOffset: number;
        };
        upgrades: {
            selectedIndex: number;
            scrollOffset: number;
        };
        upgradesShowMaxed: boolean;
        lastClickTime: number;
        cookieAccumulator: number;
        settings: {
            selectedIndex: number;
            scrollOffset: number;
            pureBlackBackground: boolean;
            fallingBits: "full" | "reduced" | "disabled";
            linkingToken: string | null;
            linkingTokenGeneratedAt?: number;
            linkedKeys: string[];
            isDeletingAccount: boolean;
            confirmDeleteAccount: boolean;
            isDeletingKey: boolean;
            keyToDelete: string | null;
        };
        confirmPrestige: boolean;
        lastFocusBeforeSettings?: Focus;
    };
}

export interface GameState {
    cookies: bigint;
    cps: bigint;
    workers: Record<string, number>;
    upgrades: Record<string, number>;
    prestige: number;
    prestigeCost: bigint;
    prestigeMultiplier: number;
}

export function createInitialStandaloneAppState(
    layout: Layout,
    debug: boolean = false,
): AppState {
    return {
        screen: "main",
        layout,
        mode: "standalone",
        debug,
        ssh: null,
        ui: {
            focus: layout === "small" ? "main" : "workers",
            highlightTicks: 0,
            fallingBits: [],
            workers: {
                selectedIndex: 0,
                scrollOffset: 0,
            },
            upgrades: {
                selectedIndex: 0,
                scrollOffset: 0,
            },
            upgradesShowMaxed: false,
            lastClickTime: 0,
            cookieAccumulator: 0,
            settings: {
                selectedIndex: 0,
                scrollOffset: 0,
                pureBlackBackground: false,
                fallingBits: "full",
                linkingToken: null,
                linkedKeys: [],
                isDeletingAccount: false,
                confirmDeleteAccount: false,
                isDeletingKey: false,
                keyToDelete: null,
            },
            confirmPrestige: false,
            lastFocusBeforeSettings: layout === "small" ? "main" : "workers",
        },
    };
}

export function createInitialSSHAppState(
    accountId: number,
    accountKey: string,
    db: Database,
    layout: Layout,
    isNewAccount: boolean = false,
    debug: boolean = false,
): AppState {
    return {
        screen: "main",
        layout,
        mode: "ssh",
        debug,
        ssh: {
            accountId,
            accountKey,
            db,
            isNewAccount,
        },
        ui: {
            focus: layout === "small" ? "main" : "workers",
            highlightTicks: 0,
            fallingBits: [],
            workers: {
                selectedIndex: 0,
                scrollOffset: 0,
            },
            upgrades: {
                selectedIndex: 0,
                scrollOffset: 0,
            },
            upgradesShowMaxed: false,
            lastClickTime: 0,
            cookieAccumulator: 0,
            settings: {
                selectedIndex: 0,
                scrollOffset: 0,
                pureBlackBackground: false,
                fallingBits: "full",
                linkingToken: null,
                linkedKeys: [],
                isDeletingAccount: false,
                confirmDeleteAccount: false,
                isDeletingKey: false,
                keyToDelete: null,
            },
            confirmPrestige: false,
            lastFocusBeforeSettings: layout === "small" ? "main" : "workers",
        },
    };
}

export function createInitialGameState(): GameState {
    return {
        cookies: 0n,
        cps: 0n,
        workers: {},
        upgrades: {},
        prestige: 0,
        prestigeCost: 0n,
        prestigeMultiplier: 1,
    };
}
