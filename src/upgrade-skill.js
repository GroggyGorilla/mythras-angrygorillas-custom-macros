// upgrade-skill.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmUpgradeSkill) so it can be updated without having to
// re-paste this macro into the compendium every release.
if (typeof globalThis.magcmUpgradeSkill === "function") {
    await globalThis.magcmUpgradeSkill(token);
} else {
    ui.notifications.error("magcmUpgradeSkill function is not loaded in main.js.");
}
