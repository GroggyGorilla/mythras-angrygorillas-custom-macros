// set-movement-state.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmOpenSetMovementStateDialog) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenSetMovementStateDialog === "function") {
    globalThis.magcmOpenSetMovementStateDialog();
} else {
    ui.notifications.error("magcmOpenSetMovementStateDialog function is not loaded in main.js.");
}