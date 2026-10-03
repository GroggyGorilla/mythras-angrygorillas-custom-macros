// drink-alcohol.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmDrinkAlcohol) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmDrinkAlcohol === "function") {
    await globalThis.magcmDrinkAlcohol();
} else {
    ui.notifications.error("magcmDrinkAlcohol function is not loaded in main.js.");
}
