// pin-weapon.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmPinWeapon) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmPinWeapon === "function") {
    await globalThis.magcmPinWeapon();
} else {
    ui.notifications.error("magcmPinWeapon function is not loaded in main.js.");
}

