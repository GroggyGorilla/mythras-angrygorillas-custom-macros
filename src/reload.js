// reload.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmReload) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmReload === "function") {
    await globalThis.magcmReload(token);
} else {
    ui.notifications.error("magcmReload function is not loaded in main.js.");
}
