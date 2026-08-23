// impale.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmImpale) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmImpale === "function") {
    await globalThis.magcmImpale();
} else {
    ui.notifications.error("magcmImpale function is not loaded in main.js.");
}

