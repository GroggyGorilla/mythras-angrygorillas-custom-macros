// food-menu-generator.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmOpenFoodMenuGeneratorDialog) so it can be updated
// without having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenFoodMenuGeneratorDialog === "function") {
    globalThis.magcmOpenFoodMenuGeneratorDialog();
} else {
    ui.notifications.error("magcmOpenFoodMenuGeneratorDialog function is not loaded in main.js.");
}