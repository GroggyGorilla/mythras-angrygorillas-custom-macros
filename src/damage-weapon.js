// damage-weapon.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmDamageWeapon) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmDamageWeapon === "function") {
    await globalThis.magcmDamageWeapon();
} else {
    ui.notifications.error("magcmDamageWeapon function is not loaded in main.js.");
}

