// multi-round-task.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmMultiRoundTask) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmMultiRoundTask === "function") {
    await globalThis.magcmMultiRoundTask();
} else {
    ui.notifications.error("magcmMultiRoundTask function is not loaded in main.js.");
}
