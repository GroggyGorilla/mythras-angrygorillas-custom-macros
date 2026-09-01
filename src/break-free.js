// break-free.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmBreakFree) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmBreakFree === "function") {
    await globalThis.magcmBreakFree();
} else {
    ui.notifications.error("magcmBreakFree function is not loaded in main.js.");
}
