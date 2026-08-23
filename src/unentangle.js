// unentangle.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmUnentangle) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmUnentangle === "function") {
    await globalThis.magcmUnentangle();
} else {
    ui.notifications.error("magcmUnentangle function is not loaded in main.js.");
}

