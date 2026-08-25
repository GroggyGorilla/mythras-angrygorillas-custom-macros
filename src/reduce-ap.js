// reduce-ap.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmReduceActionPoints) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmReduceActionPoints === "function") {
    await globalThis.magcmReduceActionPoints(token);
} else {
    ui.notifications.error("magcmReduceActionPoints function is not loaded in main.js.");
}
