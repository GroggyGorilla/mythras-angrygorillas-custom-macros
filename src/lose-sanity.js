// lose-sanity.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmLoseSanity) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmLoseSanity === "function") {
    await globalThis.magcmLoseSanity();
} else {
    ui.notifications.error("magcmLoseSanity function is not loaded in main.js.");
}
