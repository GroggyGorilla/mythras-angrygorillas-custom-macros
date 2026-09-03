// skill-roll.js
// Tested on Foundry VTT v13
// All logic lives in esmodules/main.js (magcmSkillRoll) so it can be updated without
// having to re-paste this macro into the compendium every release.
if (typeof globalThis.magcmSkillRoll === "function") {
    await globalThis.magcmSkillRoll();
} else {
    ui.notifications.error("magcmSkillRoll function is not loaded in main.js.");
}
