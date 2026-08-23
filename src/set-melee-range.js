// set-melee-range.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmSetMeleeRange) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmSetMeleeRange === "function") {
    await globalThis.magcmSetMeleeRange();
} else {
    ui.notifications.error("magcmSetMeleeRange function is not loaded in main.js.");
}
