// contested-roll-1v1.js
// Tested on Foundry VTT v13
// System: Mythras v2.2.6 (deprecated - functionality is now integrated into the default Mythras rolls)
// All logic lives in esmodules/main.js (magcmOpenContestedRoll1v1Dialog) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmOpenContestedRoll1v1Dialog === "function") {
    globalThis.magcmOpenContestedRoll1v1Dialog();
} else {
    ui.notifications.error("magcmOpenContestedRoll1v1Dialog function is not loaded in main.js.");
}