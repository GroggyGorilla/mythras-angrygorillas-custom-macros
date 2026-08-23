// ward-location.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmWardLocation) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmWardLocation === "function") {
    await globalThis.magcmWardLocation();
} else {
    ui.notifications.error("magcmWardLocation function is not loaded in main.js.");
}
