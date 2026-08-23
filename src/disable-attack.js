// disable-attack.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmDisableAttack) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmDisableAttack === "function") {
    await globalThis.magcmDisableAttack();
} else {
    ui.notifications.error("magcmDisableAttack function is not loaded in main.js.");
}
