// add-armour.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmOpenAddArmourDialog) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenAddArmourDialog === "function") {
    globalThis.magcmOpenAddArmourDialog();
} else {
    ui.notifications.error("magcmOpenAddArmourDialog function is not loaded in main.js.");
}