// alcoholize.js
// Tested on Foundry VTT v13
// Supports a homebrew magical craft skill ("Aberration (Alcoholize)") for Angry Gorilla's campaign.
// Please ignore unless you're interested in using it for your own purposes.
// All logic lives in esmodules/main.js (magcmOpenAlcoholizeDialog) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenAlcoholizeDialog === "function") {
    await globalThis.magcmOpenAlcoholizeDialog();
} else {
    ui.notifications.error("magcmOpenAlcoholizeDialog function is not loaded in main.js.");
}