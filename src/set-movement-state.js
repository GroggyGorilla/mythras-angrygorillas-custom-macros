// Macro: Open Set Movement Dialog
if (!game.settings.get("mythras-angrygorillas-custom-macros", "enableMovementStateControlInCombat")) {
    ui.notifications.warn("Movement State Control in Combat is disabled in the module settings.");
} else {
    const actor = canvas.tokens.controlled[0]?.actor || game.user.character;

    if (!actor) {
        ui.notifications.warn("Please select a token or assign a character first.");
    } else if (typeof globalThis.openMovementDialog === "function") {
        globalThis.openMovementDialog(actor);
    } else {
        ui.notifications.error("openMovementDialog function is not loaded in main.js.");
    }
}