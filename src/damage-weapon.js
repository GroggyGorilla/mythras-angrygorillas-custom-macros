// damage-weapon.js
// Tested on Foundry VTT v13
// Implements the "Damage Weapon" special effect: damage is first resisted by the target weapon's own
// Armour Points, with any surplus reducing its Hit Points. A weapon reduced to 0 HP breaks.

const MODULE_ID = typeof MAGCM_MODULE_ID !== "undefined" ? MAGCM_MODULE_ID : "mythras-angrygorillas-custom-macros";

const targetToken = game.user.targets.first();
const targetActor = targetToken?.actor;

if (!targetActor) {
    ui.notifications.warn("Please target the token whose weapon you wish to damage.");
    return;
}

const isEquipped = item => {
    const holdingLocations = item.getFlag(MODULE_ID, "holdingLocations") || [];
    return holdingLocations.length > 0 || Boolean(item.system?.equipped ?? item.system?.isEquipped);
};

const weapons = targetActor.items.filter(item => (item.type === "melee-weapon" || item.type === "ranged-weapon") && isEquipped(item));

if (weapons.length === 0) {
    ui.notifications.warn(`${targetActor.name} has no equipped weapons.`);
    return;
}

// Helper: update the weapon's HP locally, or relay via GM socket if the current user lacks permission
async function updateWeaponHp(weapon, newHp) {
    if (targetActor.canUserModify(game.user, "update")) {
        await targetActor.updateEmbeddedDocuments("Item", [{ _id: weapon.id, "system.hp": newHp }]);
    } else {
        game.socket.emit(`module.${MODULE_ID}`, {
            action: "updateItemFields",
            targetTokenId: targetToken.id,
            itemId: weapon.id,
            fields: { "system.hp": newHp }
        });
    }
}

const weaponOptions = weapons.map(w => `<option value="${w.id}">${w.name} (AP: ${Number(w.system?.ap) || 0} / HP: ${Number(w.system?.hp) || 0})</option>`).join("");

new Dialog({
    title: `Damage Weapon - ${targetActor.name}`,
    content: `
        <form style="padding: 4px;">
            <div class="form-group" style="margin-bottom: 8px;">
                <label style="font-weight: bold; display: block; margin-bottom: 4px;">Target Weapon</label>
                <select id="damage-weapon-select" style="width: 100%;">${weaponOptions}</select>
            </div>
            <div id="damage-weapon-stats" style="font-size: 11px; color: #555; margin-bottom: 10px;"></div>
            <div class="form-group">
                <label style="font-weight: bold; display: block; margin-bottom: 4px;">Damage Amount</label>
                <input type="number" id="damage-weapon-amount" value="1" step="1" style="width: 100%; text-align: center;" />
            </div>
        </form>
    `,
    buttons: {
        apply: {
            icon: '<i class="fas fa-hammer"></i>',
            label: "Apply Damage to Weapon",
            callback: async (html) => {
                const weaponId = html.find("#damage-weapon-select").val();
                const weapon = targetActor.items.get(weaponId);
                if (!weapon) return ui.notifications.warn("Selected weapon not found.");

                const rawInput = html.find("#damage-weapon-amount").val();
                const damage = Number(rawInput);
                if (!Number.isInteger(damage) || damage === 0) {
                    return ui.notifications.warn(`"${rawInput}" is not a valid damage amount. Please enter a non-zero whole number.`);
                }

                const ap = Number(weapon.system?.ap) || 0;
                const currentHp = Number(weapon.system?.hp) || 0;
                const mitigatedDamage = Math.max(0, damage - ap);
                const newHp = Math.max(0, currentHp - mitigatedDamage);
                const broken = newHp <= 0 && currentHp > 0;

                await updateWeaponHp(weapon, newHp);

                const content = `
                    <h3 style="border-bottom: 2px solid var(--color-border-dark-tertiary); margin-bottom: 4px;">Damage Weapon</h3>
                    <p><strong>Target:</strong> ${targetActor.name}'s ${weapon.name}</p>
                    <p><strong>Weapon AP:</strong> ${ap} | <strong>Damage Rolled:</strong> ${damage} | <strong>After AP:</strong> ${mitigatedDamage}</p>
                    <p><strong>Weapon HP:</strong> ${currentHp} &rarr; ${newHp}</p>
                    ${broken ? `<p style="color: darkred; font-weight: bold;">${weapon.name} has broken!</p>` : ""}
                `;

                ChatMessage.create({
                    speaker: ChatMessage.getSpeaker({ token: targetToken.document }),
                    content
                });
            }
        },
        cancel: {
            icon: '<i class="fas fa-times"></i>',
            label: "Cancel"
        }
    },
    default: "apply",
    render: (html) => {
        const select = html.find("#damage-weapon-select");
        const statsEl = html.find("#damage-weapon-stats");

        function updateStats() {
            const weapon = targetActor.items.get(select.val());
            if (!weapon) return statsEl.text("");
            statsEl.html(`Current <strong>AP:</strong> ${Number(weapon.system?.ap) || 0} | Current <strong>HP:</strong> ${Number(weapon.system?.hp) || 0}`);
        }

        select.on("change", updateStats);
        updateStats();
    }
}, { width: 400, resizable: true }).render(true);
