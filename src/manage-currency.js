// manage-currency.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmManageCurrency) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmManageCurrency === "function") {
    await globalThis.magcmManageCurrency(token);
} else {
    ui.notifications.error("magcmManageCurrency function is not loaded in main.js.");
}
