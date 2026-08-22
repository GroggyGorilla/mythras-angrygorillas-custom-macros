// impale.js
// Tested on Foundry VTT v13

const MODULE_ID = "mythras-angrygorillas-custom-macros";
const targetToken = game.user.targets.first();
const targetActor = targetToken?.actor;
const attackerToken = canvas.tokens.controlled[0];
const attackerActor = attackerToken?.actor;

if (!targetActor) {
    ui.notifications.warn("Please target the actor you wish to impale or unimpale first.");
    return;
}

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

const impaleRecordsFor = item => {
    const stored = item.getFlag(MODULE_ID, "impaledBy");
    return Array.isArray(stored) ? stored : (stored ? [stored] : []);
};
const unimpaleLocations = hitLocations?.filter(item => impaleRecordsFor(item).length > 0) || [];

const weaponOptions = (weapons || []).map(item => `<option value="${item.id}">${item.name} (${item.system?.size || item.system?.["impale-size"] || "Unknown size"})</option>`).join("");
const locationOptions = (hitLocations || []).map(item => {
    const start = item.system?.rollRangeStart ?? item.rollRangeStart;
    const end = item.system?.rollRangeEnd ?? item.rollRangeEnd;
    const range = start !== undefined && end !== undefined ? ` (${start}-${end})` : "";
    return `<option value="${item.id}">${item.name}${range}</option>`;
}).join("");

// Helper: Build the checkbox HTML for a hit location's impaled record(s), organized like unentangle.js
const renderUnimpaleCell = (locItem) => {
    const records = impaleRecordsFor(locItem);
    if (records.length === 0) {
        return `<div style="display: flex; align-items: center; justify-content: center; opacity: 0.35;"><span style="font-size: 11px; color: #333;">Not Impaled</span></div>`;
    }
    return `
        <div style="display: flex; flex-direction: column; gap: 4px;">
            ${records.map(record => {
                const source = record.isProjectile ? `${record.weaponName} projectile` : record.weaponName;
                return `
                    <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                        <input type="checkbox" class="unimpale-checkbox" data-loc-id="${locItem.id}" data-impale-id="${record.impaleId || "legacy"}" checked style="width: 16px; height: 16px; cursor: pointer;" />
                        <span style="font-size: 10px; color: #333;">${source}</span>
                    </label>
                `;
            }).join("")}
        </div>
    `;
};

// Identify humanoid body layout for the Unimpale grid, matching ward-location.js / take-cover.js / unentangle.js
const bodyPartMap = {};
(hitLocations || []).forEach(loc => {
    const name = loc.name.toLowerCase().trim();
    if (name.includes("head")) bodyPartMap.head = loc;
    else if (name.includes("chest")) bodyPartMap.chest = loc;
    else if (name.includes("abdomen")) bodyPartMap.abdomen = loc;
    else if (name.includes("right arm")) bodyPartMap.rightArm = loc;
    else if (name.includes("left arm")) bodyPartMap.leftArm = loc;
    else if (name.includes("right leg")) bodyPartMap.rightLeg = loc;
    else if (name.includes("left leg")) bodyPartMap.leftLeg = loc;
});
const isStandardHumanoid = Boolean(bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
    bodyPartMap.rightArm && bodyPartMap.leftArm && bodyPartMap.rightLeg && bodyPartMap.leftLeg);

let unimpaleFieldsHtml = `<label style="display:block; margin-bottom:6px;">Impaled Locations on ${targetActor?.name || "Target"}</label>`;
if (unimpaleLocations.length === 0) {
    unimpaleFieldsHtml += `<p style="font-size:11px; color:#888;">No impaled locations found on this target.</p>`;
} else if (isStandardHumanoid) {
    unimpaleFieldsHtml += `
        <style>
            .unimpale-grid { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 8px; align-items: center; background: rgba(0,0,0,0.04); border: 1px solid #7a0000; border-radius: 6px; padding: 10px; }
            .unimpale-cell { background: rgba(255,255,255,0.85); border: 1px solid #b5b5b5; border-radius: 4px; padding: 5px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
            .unimpale-cell label.loc-label { font-weight: bold; font-size: 11px; display: block; margin-bottom: 3px; color: #7a0000; }
            .u-grid-head  { grid-column: 2; grid-row: 1; }
            .u-grid-rarm  { grid-column: 1; grid-row: 2; }
            .u-grid-chest { grid-column: 2; grid-row: 2; }
            .u-grid-larm  { grid-column: 3; grid-row: 2; }
            .u-grid-abdo  { grid-column: 2; grid-row: 3; }
            .u-grid-rleg  { grid-column: 1; grid-row: 4; }
            .u-grid-lleg  { grid-column: 3; grid-row: 4; }
        </style>
        <div class="unimpale-grid">
            <div class="unimpale-cell u-grid-head"><label class="loc-label">${bodyPartMap.head.name}</label>${renderUnimpaleCell(bodyPartMap.head)}</div>
            <div class="unimpale-cell u-grid-rarm"><label class="loc-label">${bodyPartMap.rightArm.name}</label>${renderUnimpaleCell(bodyPartMap.rightArm)}</div>
            <div class="unimpale-cell u-grid-chest"><label class="loc-label">${bodyPartMap.chest.name}</label>${renderUnimpaleCell(bodyPartMap.chest)}</div>
            <div class="unimpale-cell u-grid-larm"><label class="loc-label">${bodyPartMap.leftArm.name}</label>${renderUnimpaleCell(bodyPartMap.leftArm)}</div>
            <div class="unimpale-cell u-grid-abdo"><label class="loc-label">${bodyPartMap.abdomen.name}</label>${renderUnimpaleCell(bodyPartMap.abdomen)}</div>
            <div class="unimpale-cell u-grid-rleg"><label class="loc-label">${bodyPartMap.rightLeg.name}</label>${renderUnimpaleCell(bodyPartMap.rightLeg)}</div>
            <div class="unimpale-cell u-grid-lleg"><label class="loc-label">${bodyPartMap.leftLeg.name}</label>${renderUnimpaleCell(bodyPartMap.leftLeg)}</div>
        </div>
    `;
} else {
    unimpaleFieldsHtml += `<div style="max-height: 300px; overflow-y: auto; padding-right: 4px;">`;
    unimpaleLocations.forEach(loc => {
        unimpaleFieldsHtml += `
            <div class="form-group" style="display: flex; align-items: center; margin-bottom: 6px;">
                <label style="flex: 1; font-weight: bold; font-size: 12px;">${loc.name}:</label>
                <div style="flex: 1.5;">${renderUnimpaleCell(loc)}</div>
            </div>
        `;
    });
    unimpaleFieldsHtml += `</div>`;
}
unimpaleFieldsHtml += `<label style="display:block; margin-top:8px;"><input type="checkbox" id="unimpaleSafely"> Unimpale all selected safely (no damage)</label>`;

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
    title: `Impale / Unimpale - ${targetActor.name}${attackerActor ? ` (Attacker: ${attackerActor.name})` : ""}`,
    content: `
        <form>
            <div style="margin-bottom:8px;"><label>Action</label><select id="impaleAction" style="width:100%;">
                <option value="impale">Impale Target</option>
                <option value="unimpale" ${unimpaleLocations.length ? "" : "disabled"}>Unimpale Target Location(s)</option>
            </select></div>
            <div id="impaleFields">
                <div style="margin-bottom:8px;"><label>Weapon</label><select id="impaleWeaponId" style="width:100%;">${weaponOptions || `<option value="">-- No eligible Impale weapons --</option>`}</select></div>
                <div><label>Hit Location</label><select id="impaleLocationId" style="width:100%;">${locationOptions}</select></div>
            </div>
            <div id="unimpaleFields" style="display:none;">
                ${unimpaleFieldsHtml}
            </div>
        </form>`,
    buttons: {
        impale: {
            label: "Roll Impale",
            callback: async html => {
                if (html.find("#impaleAction").val() === "unimpale") {
                    const selected = html.find(".unimpale-checkbox:checked").toArray();
                    if (selected.length === 0) {
                        return ui.notifications.info("No impaled locations were selected to unimpale.");
                    }
                    const unimpaleSafely = html.find("#unimpaleSafely").is(":checked");

                    const buttonsHtml = [];
                    const summaryLines = [];
                    for (const el of selected) {
                        const locationId = el.dataset.locId;
                        const impaleId = el.dataset.impaleId;
                        const location = targetActor?.items.get(locationId);
                        const impaledRecords = impaleRecordsFor(location);
                        const impaled = impaledRecords.find(record => (record.impaleId || "legacy") === impaleId);
                        if (!location || !impaled) continue;

                        const source = impaled.isProjectile ? `${impaled.weaponName} projectile` : impaled.weaponName;
                        const damage = Math.round(Number(impaled.appliedDamage || 0) / 2);
                        if (!unimpaleSafely && (!Number.isFinite(damage) || damage <= 0)) {
                            summaryLines.push(`<li>${location.name} (${source}): skipped, missing original applied damage.</li>`);
                            continue;
                        }

                        summaryLines.push(`<li><strong>${location.name}</strong>: ${source} - ${unimpaleSafely ? "no damage (safe)" : `half of original damage applied (${damage})`}</li>`);
                        buttonsHtml.push(`<button type="button" class="apply-unimpale-damage" data-allow-any-user="true" data-safe="${unimpaleSafely}" data-impale-id="${impaled.impaleId || "legacy"}" data-target-token="${targetToken.id}" data-hit-location-id="${location.id}" data-attacker-actor-id="${impaled.attackerActorId}" data-weapon-id="${impaled.weaponId}" data-damage="${unimpaleSafely ? 0 : damage}">Apply Unimpale: ${location.name} (${source})</button>`);
                    }

                    if (buttonsHtml.length === 0) {
                        return ui.notifications.warn("None of the selected impalements could be processed.");
                    }

                    return ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: targetToken.document }),
                        flavor: `${canvas.tokens?.controlled[0] ? canvas.tokens.controlled[0].name : game.user.name} prepares to unimpale ${targetActor.name}.`,
                        content: `<ul style="margin:0 0 8px 15px; padding:0;">${summaryLines.join("")}</ul><div style="display:flex; flex-direction:column; gap:4px;">${buttonsHtml.join("")}</div>`
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
