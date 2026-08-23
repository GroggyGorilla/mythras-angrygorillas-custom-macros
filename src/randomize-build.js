// randomize-build.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmOpenRandomizeBuildDialog) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenRandomizeBuildDialog === "function") {
    globalThis.magcmOpenRandomizeBuildDialog();
} else {
    ui.notifications.error("magcmOpenRandomizeBuildDialog function is not loaded in main.js.");
}