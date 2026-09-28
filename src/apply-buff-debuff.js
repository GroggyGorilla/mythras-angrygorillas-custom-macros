// timed-effect.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmOpenTimedEffectDialog) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenTimedEffectDialog === "function") {
    await globalThis.magcmOpenTimedEffectDialog();
} else {
    ui.notifications.error("magcmOpenTimedEffectDialog function is not loaded in main.js.");
}
