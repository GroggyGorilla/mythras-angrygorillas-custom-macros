// clean-up-combat-flags.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmCleanUpCombatFlags) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmCleanUpCombatFlags === "function") {
    await globalThis.magcmCleanUpCombatFlags();
} else {
    ui.notifications.error("magcmCleanUpCombatFlags function is not loaded in main.js.");
}