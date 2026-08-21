// impale.js
// Tested on Foundry VTT v13

const MODULE_ID = "mythras-angrygorillas-custom-macros";
const targetToken = game.user.targets.first();
const targetActor = targetToken?.actor;
const attackerToken = canvas.tokens.controlled[0];
const attackerActor = attackerToken?.actor;
const getCombatEffects = item => {
    const effects = item.system?.["combat-effects"] ?? item.system?.combatEffects ?? "";
    return Array.isArray(effects) ? effects.join(",") : String(effects);
};
const isEquipped = item => {
    const holdingLocations = item.getFlag(MODULE_ID, "holdingLocations") || [];
    return holdingLocations.length > 0 || Boolean(item.system?.equipped ?? item.system?.isEquipped);
};
const weapons = attackerActor?.items.filter(item => {
    if (item.type !== "melee-weapon" && item.type !== "ranged-weapon") return false;
    return isEquipped(item) && !item.getFlag(MODULE_ID, "pinned") && /impale/i.test(getCombatEffects(item));
});
const hitLocations = targetActor?.items.filter(item => {
    const start = item.system?.rollRangeStart ?? item.rollRangeStart;
    const end = item.system?.rollRangeEnd ?? item.rollRangeEnd;
    return item.type === "hitLocation" || (start !== undefined && end !== undefined);
});

const unimpaleLocations = targetActor?.items.filter(item => {
    const stored = item.getFlag(MODULE_ID, "impaledBy");
    return Array.isArray(stored) ? stored.length > 0 : Boolean(stored);
}) || [];

const weaponOptions = (weapons || []).map(item => `<option value="${item.id}">${item.name} (${item.system?.size || item.system?.["impale-size"] || "Unknown size"})</option>`).join("");
const locationOptions = (hitLocations || []).map(item => {
    const start = item.system?.rollRangeStart ?? item.rollRangeStart;
    const end = item.system?.rollRangeEnd ?? item.rollRangeEnd;
    const range = start !== undefined && end !== undefined ? ` (${start}-${end})` : "";
    return `<option value="${item.id}">${item.name}${range}</option>`;
}).join("");
const impaleRecordsFor = item => {
    const stored = item.getFlag(MODULE_ID, "impaledBy");
    return Array.isArray(stored) ? stored : (stored ? [stored] : []);
};
const unimpaleOptions = unimpaleLocations.flatMap(item => impaleRecordsFor(item).map(data => {
    const source = data.isProjectile ? `${data.weaponName} projectile` : data.weaponName;
    return `<option value="${item.id}::${data.impaleId || "legacy"}">${item.name} (${source})</option>`;
})).join("");

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
    title: `Impale / Unimpale${attackerActor ? ` - ${attackerActor.name}` : ""}`,
    content: `
        <form>
            <div style="margin-bottom:8px;"><label>Action</label><select id="impaleAction" style="width:100%;">
                <option value="impale">Impale Target</option>
                <option value="unimpale" ${unimpaleLocations.length ? "" : "disabled"}>Unimpale Target Location</option>
            </select></div>
            <div id="impaleFields">
                <div style="margin-bottom:8px;"><label>Weapon</label><select id="impaleWeaponId" style="width:100%;">${weaponOptions}</select></div>
                <div><label>Hit Location</label><select id="impaleLocationId" style="width:100%;">${locationOptions}</select></div>
            </div>
            <div id="unimpaleFields" style="display:none;">
                <label>Impaled Location on ${targetActor?.name || "Target"}</label>
                <select id="unimpaleLocationId" style="width:100%;">${unimpaleOptions || "<option value=\"\">No impaled locations</option>"}</select>
                <label style="display:block; margin-top:8px;"><input type="checkbox" id="unimpaleSafely"> Unimpale safely (no damage)</label>
            </div>
        </form>`,
    buttons: {
        impale: {
            label: "Roll Impale",
            callback: async html => {
                if (html.find("#impaleAction").val() === "unimpale") {
                    const [locationId, impaleId] = String(html.find("#unimpaleLocationId").val() || "").split("::");
                    const location = targetActor?.items.get(locationId);
                    const impaledRecords = impaleRecordsFor(location);
                    const impaled = impaledRecords.find(record => (record.impaleId || "legacy") === impaleId) || impaledRecords[0];
                    if (!location || !impaled) return ui.notifications.warn("Impaled target location not found.");

                    const damage = Math.round(Number(impaled.appliedDamage || 0) / 2);
                    const unimpaleSafely = html.find("#unimpaleSafely").is(":checked");
                    if (!unimpaleSafely && (!Number.isFinite(damage) || damage <= 0)) {
                        return ui.notifications.warn("This impalement does not contain the original applied damage needed for unimpaling.");
                    }

                    return ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: targetToken.document }),
                        flavor: `${canvas.tokens?.controlled[0] ? canvas.tokens.controlled[0].name : game.user.name} unimpales ${impaled.isProjectile ? `${impaled.weaponName} projectile` : impaled.weaponName} from ${targetActor.name}.`,
                        content: `<p><strong>Unimpale:</strong> ${impaled.isProjectile ? `${impaled.weaponName} projectile` : impaled.weaponName} from ${targetActor.name}'s ${location.name}</p><p>${unimpaleSafely ? "Unimpale safely: no damage applied." : `Half of original damage applied: ${damage}`}</p><button type="button" class="apply-unimpale-damage" data-allow-any-user="true" data-safe="${unimpaleSafely}" data-impale-id="${impaled.impaleId || "legacy"}" data-target-token="${targetToken.id}" data-hit-location-id="${location.id}" data-attacker-actor-id="${impaled.attackerActorId}" data-weapon-id="${impaled.weaponId}" data-damage="${unimpaleSafely ? 0 : damage}">Apply Unimpale Damage</button>`
                    });
                }

                if (!attackerActor) return ui.notifications.warn("Please select an attacking token first.");
                if (!targetActor) return ui.notifications.warn("Please target a victim before rolling an impale.");
                if (!weapons?.length) return ui.notifications.warn("You have no equipped, unpinned weapon with the Impale combat effect.");
                const weapon = attackerActor.items.get(html.find("#impaleWeaponId").val());
                const hitLocation = targetActor.items.get(html.find("#impaleLocationId").val());
                if (!weapon || !hitLocation) return ui.notifications.warn("Weapon or hit location not found.");
                if (weapon.getFlag(MODULE_ID, "pinned") || (weapon.type === "melee-weapon" && weapon.getFlag(MODULE_ID, "impaled"))) return ui.notifications.warn(`${weapon.name} cannot be used for this impale.`);

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
                    flavor: `${attackerActor.name} impales ${targetActor.name} with ${weapon.type === "ranged-weapon" ? `${weapon.name}'s projectile` : weapon.name}.`,
                    rolls: [firstRoll, secondRoll],
                    content: `
                        <p><strong>Impale:</strong> ${weapon.type === "ranged-weapon" ? `${weapon.name}'s projectile` : weapon.name} into ${targetActor.name}'s ${hitLocation.name}</p>
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
        cancel: { label: "Cancel" }
    },
    default: "impale",
    render: html => {
        html.find("#impaleAction").on("change", event => {
            const isUnimpale = event.currentTarget.value === "unimpale";
            html.find("#impaleFields").toggle(!isUnimpale);
            html.find("#unimpaleFields").toggle(isUnimpale);
            html.closest(".dialog").find(".dialog-button:first").text(isUnimpale ? "Prepare Unimpale" : "Roll Impale");
        });
    }
}, { width: 425, resizable: true }).render(true);