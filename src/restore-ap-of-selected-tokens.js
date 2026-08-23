// restore-ap-of-selected-tokens.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmRestoreActionPoints) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmRestoreActionPoints === "function") {
    await globalThis.magcmRestoreActionPoints();
} else {
    ui.notifications.error("magcmRestoreActionPoints function is not loaded in main.js.");
}
