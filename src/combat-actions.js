// combat-actions.js
// Tested with Foundry VTT v13
// All logic lives in esmodules/main.js (magcmOpenCombatActionsDialog) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenCombatActionsDialog === "function") {
    globalThis.magcmOpenCombatActionsDialog();
} else {
    ui.notifications.error("magcmOpenCombatActionsDialog function is not loaded in main.js.");
}