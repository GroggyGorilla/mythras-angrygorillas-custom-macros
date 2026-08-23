// equip-weapon.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmEquipWeapon) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmEquipWeapon === "function") {
    await globalThis.magcmEquipWeapon();
} else {
    ui.notifications.error("magcmEquipWeapon function is not loaded in main.js.");
}
