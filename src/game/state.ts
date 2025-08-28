export type Screen = "main" | "workers" | "upgrades" | "settings";
export type Layout = "small" | "medium" | "large";
export type Focus = "main" | "workers" | "upgrades" | "settings";

export interface AppState {
    screen: Screen;
    previousScreen: Screen | null;
    layout: Layout;
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
    };
}

export interface GameState {
    cookies: number;
    cps: number;
    workers: Record<string, number>;
    upgrades: Record<string, number>;
    prestige: number;
}

export function createInitialAppState(): AppState {
    return {
        screen: "main",
        previousScreen: null,
        layout: "medium",
        ui: {
            focus: "main",
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
        },
    };
}

export function createInitialGameState(): GameState {
    return {
        cookies: 1024 ** 12,
        cps: 0,
        workers: {},
        upgrades: {},
        prestige: 0,
    };
}
