// take-cover.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmTakeCover) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmTakeCover === "function") {
    await globalThis.magcmTakeCover();
} else {
    ui.notifications.error("magcmTakeCover function is not loaded in main.js.");
}
