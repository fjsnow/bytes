import { setupScreen, restoreScreen } from "./core/screen";
import { startTicker } from "./core/ticker";
import { startRenderer } from "./core/renderer";
import { setupGameInput } from "./game/input";

setupScreen();
setupGameInput();
startTicker();
startRenderer();

process.on("SIGINT", () => {
    restoreScreen();
    process.exit(0);
});
