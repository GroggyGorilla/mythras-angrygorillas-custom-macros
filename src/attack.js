// attack.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmOpenAttackDialog) so it can be updated without having
// to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenAttackDialog === "function") {
    globalThis.magcmOpenAttackDialog(token);
} else {
    ui.notifications.error("magcmOpenAttackDialog function is not loaded in main.js.");
}