import { setupScreen, restoreScreen } from "./core/screen";
import { startTicker } from "./core/ticker";
import { startRenderer } from "./core/renderer";
import { setupGameInput } from "./game/input";
import { initSaveSystem } from "./core/save";

const playerKey: string | null = process.argv[2] || null;
initSaveSystem(playerKey);

setupScreen();
setupGameInput();
startTicker();
startRenderer();

process.on("SIGINT", () => {
    restoreScreen();
    process.exit(0);
});
