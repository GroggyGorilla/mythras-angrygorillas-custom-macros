// pin-weapon.js
// Tested on Foundry VTT v13

const MODULE_ID = "mythras-angrygorillas-custom-macros";
const controlledToken = canvas.tokens.controlled[0];
const targetToken = game.user.targets.first();

if (!controlledToken?.actor) {
    return ui.notifications.warn("Please select a token first.");
}
if (!targetToken?.actor) {
    return ui.notifications.warn("Please target a token first.");
}

const actor = controlledToken.actor;
const targetActor = targetToken.actor;
const isSelf = targetActor.id === actor.id;
const weapons = targetActor.items.filter(item => {
    if (item.type !== "melee-weapon" && item.type !== "ranged-weapon") return false;
    const holdingLocations = item.getFlag(MODULE_ID, "holdingLocations") || [];
    return holdingLocations.length > 0 && (isSelf ? Boolean(item.getFlag(MODULE_ID, "pinned")) : true);
});

if (weapons.length === 0) {
    return ui.notifications.info(isSelf ? `${targetActor.name} has no pinned weapons.` : `${targetActor.name} has no equipped weapons.`);
}

const weaponOptions = weapons.map(weapon => {
    const locations = (weapon.getFlag(MODULE_ID, "holdingLocations") || [])
        .map(id => targetActor.items.get(id)?.name)
        .filter(Boolean)
        .join(", ");
    const status = weapon.getFlag(MODULE_ID, "pinned") ? " (Pinned)" : "";
    return `<option value="${weapon.id}">${weapon.name}${status} - ${locations || "Held"}</option>`;
}).join("");

new Dialog({
    title: isSelf ? `Unpin Weapon - ${targetActor.name}` : `Pin Weapon - ${targetActor.name}`,
    content: `
        <form>
            <p>${isSelf ? "Choose one of your pinned weapons to unpin." : "Choose an equipped weapon on the targeted token to pin."}</p>
            <select id="pinWeaponId" style="width:100%;">${weaponOptions}</select>
        </form>`,
    buttons: {
        apply: {
            label: isSelf ? "Unpin Weapon" : "Pin Weapon",
            callback: async html => {
                const weapon = targetActor.items.get(html.find("#pinWeaponId").val());
                if (!weapon) return ui.notifications.warn("Weapon not found.");
                const pinValue = isSelf ? null : true;
                if (targetActor.canUserModify(game.user, "update")) {
                    if (pinValue === null) await weapon.unsetFlag(MODULE_ID, "pinned");
                    else await weapon.setFlag(MODULE_ID, "pinned", pinValue);
                } else if (game.socket) {
                    game.socket.emit(`module.${MODULE_ID}`, {
                        action: "updateWeaponFlag",
                        actorId: targetActor.id,
                        weaponId: weapon.id,
                        flag: "pinned",
                        value: pinValue
                    });
                } else {
                    return ui.notifications.error("You do not have permission to change this weapon.");
                }

                canvas.tokens.placeables.filter(token => token.actor?.id === targetActor.id).forEach(token => token.refresh());
                ui.notifications.info(`${weapon.name} ${isSelf ? "is no longer pinned" : "is now pinned"}.`);
            }
        },
        cancel: { label: "Cancel" }
    },
    default: "apply"
}, { width: 400 }).render(true);
