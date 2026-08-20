// impale.js
// Tested on Foundry VTT v13

const MODULE_ID = "mythras-angrygorillas-custom-macros";
const attackerToken = canvas.tokens.controlled[0];
const targetToken = game.user.targets.first();

if (!attackerToken?.actor) {
    return ui.notifications.warn("Please select an attacking token first.");
}

const attackerActor = attackerToken.actor;
const targetActor = targetToken?.actor;
const getCombatEffects = item => {
    const effects = item.system?.["combat-effects"] ?? item.system?.combatEffects ?? "";
    return Array.isArray(effects) ? effects.join(",") : String(effects);
};
const isEquipped = item => {
    const holdingLocations = item.getFlag(MODULE_ID, "holdingLocations") || [];
    return holdingLocations.length > 0 || Boolean(item.system?.equipped ?? item.system?.isEquipped);
};
const weapons = attackerActor.items.filter(item => {
    if (item.type !== "melee-weapon" && item.type !== "ranged-weapon") return false;
    return isEquipped(item) && !item.getFlag(MODULE_ID, "pinned") && /impale/i.test(getCombatEffects(item));
});
const hitLocations = targetActor?.items.filter(item => {
    const start = item.system?.rollRangeStart ?? item.rollRangeStart;
    const end = item.system?.rollRangeEnd ?? item.rollRangeEnd;
    return item.type === "hitLocation" || (start !== undefined && end !== undefined);
});

if (weapons.length === 0) return ui.notifications.warn("You have no equipped, unpinned weapon with the Impale combat effect.");
if (targetActor && hitLocations.length === 0) return ui.notifications.warn("The target has no hit locations.");

const weaponOptions = weapons.map(item => `<option value="${item.id}">${item.name} (${item.system?.size || item.system?.["impale-size"] || "Unknown size"})</option>`).join("");
const locationOptions = (hitLocations || []).map(item => {
    const start = item.system?.rollRangeStart ?? item.rollRangeStart;
    const end = item.system?.rollRangeEnd ?? item.rollRangeEnd;
    const range = start !== undefined && end !== undefined ? ` (${start}-${end})` : "";
    return `<option value="${item.id}">${item.name}${range}</option>`;
}).join("");

function addDamageModifier(formula, weapon) {
    if (!attackerActor.damageMod || !weapons.length) return formula;
    if (!weapon?.system?.damageModifier) return formula;
    const modifier = String(attackerActor.damageMod).trim();
    if (!modifier) return formula;
    return `${formula}${modifier.startsWith("+") || modifier.startsWith("-") ? modifier : `+${modifier}`}`;
}

function damageFormula(weapon) {
    return weapon.damageRoll || weapon.system?.damage || weapon.system?.damageFormula || "1d3";
}

new Dialog({
    title: `Impale - ${attackerActor.name}`,
    content: `
        <form>
            <div style="margin-bottom:8px;"><label>Weapon</label><select id="impaleWeaponId" style="width:100%;">${weaponOptions}</select></div>
            <div><label>Hit Location</label><select id="impaleLocationId" style="width:100%;">${locationOptions}</select></div>
        </form>`,
    buttons: {
        impale: {
            label: "Roll Impale",
            callback: async html => {
                if (!targetActor) return ui.notifications.warn("Please target a victim before rolling an impale.");
                const weapon = attackerActor.items.get(html.find("#impaleWeaponId").val());
                const hitLocation = targetActor.items.get(html.find("#impaleLocationId").val());
                if (!weapon || !hitLocation) return ui.notifications.warn("Weapon or hit location not found.");
                if (weapon.getFlag(MODULE_ID, "pinned") || weapon.getFlag(MODULE_ID, "impaled")) return ui.notifications.warn(`${weapon.name} cannot be used for this impale.`);

                const formula = addDamageModifier(damageFormula(weapon), weapon);
                const firstRoll = await new Roll(formula).evaluate();
                const secondRoll = await new Roll(formula).evaluate();
                const kept = Math.max(Number(firstRoll.total), Number(secondRoll.total));
                const wornArmor = hitLocation.equippedArmor ? hitLocation.equippedArmor.reduce((sum, armor) => sum + (Number(armor.ap) || 0), 0) : 0;
                const naturalArmor = Number(hitLocation.naturalArmor) || 0;
                const mitigation = Math.max(wornArmor, naturalArmor);
                const damage = Math.max(0, kept - mitigation);
                const weaponSize = weapon.system?.size || weapon.system?.["impale-size"] || "Unknown";

                ChatMessage.create({
                    speaker: ChatMessage.getSpeaker({ token: attackerToken.document }),
                    flavor: `${attackerActor.name} impales ${targetActor.name} with ${weapon.name}.`,
                    rolls: [firstRoll, secondRoll],
                    content: `
                        <p><strong>Impale:</strong> ${weapon.name} into ${targetActor.name}'s ${hitLocation.name}</p>
                        <p>Damage rolls: [[${firstRoll.total}]] and [[${secondRoll.total}]]</p>
                        <p><strong>Kept:</strong> ${kept} | Worn AP: ${wornArmor} | Natural AP: ${naturalArmor} | Applied after AP: ${damage}</p>
                        <button type="button" class="apply-impale-damage"
                            data-target-token="${targetToken.id}" data-target-name="${targetToken.name}"
                            data-hit-location-id="${hitLocation.id}" data-hit-location-name="${hitLocation.name}"
                            data-attacker-actor-id="${attackerActor.id}" data-weapon-id="${weapon.id}"
                            data-weapon-size="${weaponSize}" data-damage="${kept}"
                            data-armor="${wornArmor}" data-natural-armor="${naturalArmor}">Apply Impale Damage</button>`
                });
            }
        },
        unimpale: {
            label: "Unimpale Weapon",
            callback: async html => {
                const impaledWeapons = attackerActor.items.filter(item => item.getFlag(MODULE_ID, "impaled"));
                if (impaledWeapons.length === 0) return ui.notifications.info("You have no impaled weapons.");
                const weaponId = html.find("#impaleWeaponId").val();
                const weapon = impaledWeapons.find(item => item.id === weaponId) || impaledWeapons[0];
                const impaled = weapon.getFlag(MODULE_ID, "impaled");
                const target = canvas.tokens.get(impaled.targetId)?.actor || game.scenes.current?.tokens.get(impaled.targetId)?.actor || game.actors.get(impaled.targetActorId);
                const location = target?.items.get(impaled.hitLocationId);
                if (!target || !location) return ui.notifications.warn("The original impale target or hit location could not be found.");

                const fullRoll = await new Roll(damageFormula(weapon)).evaluate();
                const isBarbed = /barbed/i.test(getCombatEffects(weapon));
                const damage = isBarbed ? Number(fullRoll.total) : Math.round(Number(fullRoll.total) / 2);
                ChatMessage.create({
                    speaker: ChatMessage.getSpeaker({ token: attackerToken.document }),
                    flavor: `${attackerActor.name} unimpales ${weapon.name} from ${target.name}.`,
                    rolls: [fullRoll],
                    content: `<p><strong>Unimpale:</strong> ${weapon.name} from ${target.name}'s ${location.name}</p><p>Damage roll: [[${fullRoll.total}]] | ${isBarbed ? "Barbed weapon: full damage" : "Non-barbed weapon: half damage"}</p><p><strong>Damage to apply:</strong> ${damage}</p><button type="button" class="apply-unimpale-damage" data-target-token="${impaled.targetId}" data-hit-location-id="${location.id}" data-attacker-actor-id="${attackerActor.id}" data-weapon-id="${weapon.id}" data-damage="${damage}">Apply Unimpale Damage</button>`
                });
            }
        },
        cancel: { label: "Cancel" }
    },
    default: "impale",
    render: html => {
        const weaponSelect = html.find("#impaleWeaponId");
        const impaledWeapons = attackerActor.items.filter(item => item.getFlag(MODULE_ID, "impaled"));
        impaledWeapons.forEach(item => weaponSelect.append(`<option value="${item.id}">Unimpale: ${item.name}</option>`));
    }
}, { width: 425, resizable: true }).render(true);
