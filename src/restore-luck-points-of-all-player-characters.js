// restore-luck-points-of-all-player-characters.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmRestoreLuckPoints) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmRestoreLuckPoints === "function") {
    await globalThis.magcmRestoreLuckPoints();
} else {
    ui.notifications.error("magcmRestoreLuckPoints function is not loaded in main.js.");
}
