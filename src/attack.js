// attack.js
// Tested on Foundry VTT v13

const MODULE_ID = typeof MAGCM_MODULE_ID !== "undefined" ? MAGCM_MODULE_ID : "mythras-angrygorillas-custom-macros";

const getSkillValue = (item) => item?.totalVal ?? item?.system?.skillLevel ?? item?.system?.value ?? 0;

// Helper function to handle engagement updates locally or delegate via socket to GM
async function setEngagementFlag(actorObj, targetId, flagData) {
    if (actorObj.canUserModify(game.user, "update")) {
        if (flagData === null) {
            await actorObj.unsetFlag(MODULE_ID, `engagements.${targetId}`);
            const remaining = actorObj.getFlag(MODULE_ID, "engagements") || {};
            if (Object.keys(remaining).length === 0) {
                await actorObj.unsetFlag(MODULE_ID, "engagements");
            }
        } else {
            let engagements = foundry.utils.duplicate(actorObj.getFlag(MODULE_ID, "engagements") || {});
            engagements[targetId] = flagData;
            await actorObj.setFlag(MODULE_ID, "engagements", engagements);
        }
    } else {
        game.socket.emit(`module.${MODULE_ID}`, {
            action: "updateEngagement",
            actorId: actorObj.id,
            targetId: targetId,
            flagData: flagData
        });
    }
}

// Retrieve module setting for reach mechanics (defaulting to false if unregistered)
let enableReach = false;
try {
    enableReach = game.settings.get(MODULE_ID, "enableReachMechanics") ?? false;
} catch (e) {
    console.warn(`${MODULE_ID} | 'enableReachMechanics' setting not found. Defaulting reach mechanics to disabled.`);
}

const targetToken = game.user.targets.first();

const skillArray = token.actor.items.filter(skill => skill.type === "combatStyle" || (skill.type === "standardSkill" && skill.name.toLowerCase() === "unarmed")).sort((a, b) => {
    if (a.type === b.type) return a.name.localeCompare(b.name);
    return a.type === "combatStyle" ? -1 : 1;
});

const augArray = token.actor.items.filter(skill => 
    skill.type === "standardSkill" ||
    skill.type === "professionalSkill" ||
    skill.type === "combatStyle" ||
    skill.type === "magicSkill" ||
    skill.type === "passion");

const weaponArray = token.actor.items.filter(weapon => {
    if (weapon.type !== "melee-weapon" && weapon.type !== "ranged-weapon") return false;
    const holdingLocations = weapon.getFlag(MODULE_ID, "holdingLocations") || [];
    return holdingLocations.length > 0 || Boolean(weapon.system?.equipped ?? weapon.system?.isEquipped);
});

// Entangled arms block attacking with weapons held there; other entangled locations only add a Roll Modifiers penalty
const entangledLocations = token.actor.items.filter(i => i.type === "hitLocation" && i.getFlag(MODULE_ID, "entangledBy"));
const entangledArmIds = new Set(entangledLocations.filter(loc => /arm/i.test(loc.name)).map(loc => loc.id));
const stunnedLocationNames = new Set(
    (token.actor.effects || [])
        .map(effect => String(effect?.name || ""))
        .filter(name => name.toLowerCase().startsWith("stunned - "))
        .map(name => name.slice(10).trim().toLowerCase())
);
weaponArray.forEach(weapon => {
    const holdingLocations = weapon.getFlag?.(MODULE_ID, "holdingLocations") || [];
    weapon._pinned = Boolean(weapon.getFlag?.(MODULE_ID, "pinned"));
    weapon._impaled = weapon.type === "melee-weapon" && Boolean(weapon.getFlag?.(MODULE_ID, "impaled"));
    weapon._entangledBlocked = holdingLocations.some(locId => entangledArmIds.has(locId));
    weapon._stunnedBlocked = holdingLocations.some(locId => {
        const loc = token.actor.items.get(locId);
        return loc ? stunnedLocationNames.has(String(loc.name || "").toLowerCase()) : false;
    });
    const hpValue = weapon.system?.hp;
    weapon._broken = hpValue !== undefined && hpValue !== "" && Number(hpValue) <= 0;
    weapon._rangeBlocked = false;
});

function getWeaponDisableReasons(weapon) {
    if (!weapon) return [];
    const reasons = [];
    if (weapon._broken) reasons.push("Broken");
    if (weapon._pinned) reasons.push("Pinned");
    if (weapon._impaled) reasons.push("Impaling another target");
    if (weapon._entangledBlocked) reasons.push("Entangled arm");
    if (weapon._stunnedBlocked) reasons.push("Stunned limb");
    if (weapon._rangeBlocked) reasons.push("Reach too short for current range");
    return reasons;
}

// Unarmed is always a valid fallback (broken/entangled/unheld weapons shouldn't strand the attacker with no options)
const hasUsableWeapon = weaponArray.some(w => !w._entangledBlocked && !w._broken);
const unarmedFallback = {
    name: "Unarmed/Improvised",
    type: "melee-weapon",
    damageRoll: token.actor.damageMod || "1d3",
    system: { reach: "T", size: "S", force: "S" }
};
unarmedFallback._entangledBlocked = false;
unarmedFallback._broken = false;
weaponArray.push(unarmedFallback);

const skillOptions = skillArray.map(i => {
    const isUnarmedSkill = i.type === "standardSkill" && i.name.toLowerCase() === "unarmed";
    const selected = !hasUsableWeapon && isUnarmedSkill ? "selected" : "";
    return `<option ${selected}>${i.name}</option>`;
});
const augOptions = augArray.map(i => `<option>${i.name}</option>`);
const weaponOptions = weaponArray.map(i => {
    const reasons = getWeaponDisableReasons(i);
    const blocked = reasons.length > 0;
    const reason = blocked ? `Cannot attack: ${reasons.join(", ")}.` : "";
    const suffix = blocked ? ` (${reasons.join(", ")})` : "";
    const selected = !hasUsableWeapon && i === unarmedFallback ? "selected" : "";
    return `<option data-base-name="${i.name}" ${blocked ? "disabled" : ""} ${selected} title="${reason}">${i.name}${suffix}</option>`;
});

const rangeScale = { "T": 0, "S": 1, "M": 2, "L": 3, "VL": 4, "Touch": 0, "Short": 1, "Medium": 2, "Long": 3, "Very Long": 4 };
const rangeDisplay = { "T": "Touch", "S": "Short", "M": "Medium", "L": "Long", "VL": "Very Long", "Touch": "Touch", "Short": "Short", "Medium": "Medium", "Long": "Long", "Very Long": "Very Long" };

const sizeScale = ["S", "M", "L", "H", "E", "BE"];
const sizeMap = { "S": 0, "M": 1, "L": 2, "H": 3, "E": 4, "BE": 5, "Small": 0, "Medium": 1, "Large": 2, "Huge": 3, "Enormous": 4, "Colossal": 5 };
const sizeDisplay = { "S": "Small", "M": "Medium", "L": "Large", "H": "Huge", "E": "Enormous", "BE": "Beyond Enormous", "Small": "Small", "Medium": "Medium", "Large": "Large", "Huge": "Huge", "Enormous": "Enormous", "Colossal": "Colossal" };

const initialSkill = skillArray.length > 0 ? skillArray[0] : null;
let modText = "No Penalties";
let isModTextVisible = false;

if (initialSkill && token.actor?.sheet?.roller?.getSkillRollModifiers) {
    try {
        const modifiersList = typeof globalThis.MAGCM_getSkillRollModifiers === "function"
            ? globalThis.MAGCM_getSkillRollModifiers(token.actor, initialSkill)
            : token.actor.sheet.roller.getSkillRollModifiers(initialSkill);
        if (modifiersList && modifiersList.length > 0) {
            modText = modifiersList.map(m => `<strong>${m.name}:</strong><br/> ${m.value}`).join('<br/>');
            isModTextVisible = true;
        }
    } catch(e) {
        console.warn("Could not retrieve roll modifiers", e);
    }
}

// Combines the sheet's own roll modifiers with the Charging note added by this module
function composeModifiersText(chargingActive) {
    const parts = [];
    if (isModTextVisible) parts.push(modText);
    if (chargingActive) parts.push(`<strong>Charging:</strong><br /> One Step Penalty`);
    return parts.length > 0 ? parts.join('<br/>') : "No Penalties";
}
const escapeTooltip = (text) => text.replace(/"/g, '&quot;').replace(/'/g, '&#39;');

let chatModHtml = "";
const modHtml = `
    <tr id="rollModifiersRow" style="${isModTextVisible ? "" : "display:none;"}">
        <td colspan="2">
            <div style="margin-bottom: 5px;">
                <span class="tooltip rollModifiers" data-tooltip="${escapeTooltip(composeModifiersText(false))}" style="cursor: help; color: #e1a100; font-weight: bold;">
                    Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                </span>
            </div>
        </td>
    </tr>`;

// Conditionally render the Range Row in the dialog table as a static display label
const rangeRowHtml = enableReach ? `
<tr id="rangeRow">
    <th>Current Range</th>
    <td id="combatRangeValue" style="font-weight: bold;">-</td>
</tr>` : "";

const d = new Dialog({
    title: "Attack Roll",
    content: `<form>
                <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
                    <table style="text-align: left; width: 100%;">
                        <tbody>
                            ${modHtml}
                            <tr>
                                <th>Target</th>
                                <td id="targetNameValue" style="font-weight: bold;">-</td>
                            </tr>
                            <tr>
                                <th>Combat Style</th>
                                <td><select id="skillToRoll">${skillOptions.join("")}</select></td>
                            </tr>
                            <tr>
                                <th>Difficulty</th>
                                <td>
                                    <select id="rollDifficulty">
                                        <option value="2">Very Easy</option>
                                        <option value="1.5">Easy</option>
                                        <option value="1" selected>Standard</option>
                                        <option value="0.67">Hard</option>
                                        <option value="0.5">Formidable</option>
                                        <option value="0.1">Herculean</option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <th>Weapon</th>
                                <td><select id="weaponToRoll">${weaponOptions.join("")}</select></td>
                            </tr>
                            <tr id="unarmedDamageRow" style="display:none;">
                                <th>Damage Formula</th>
                                <td><input type="text" id="unarmedDamageFormula" value="1d3" style="width: 100px;"></td>
                            </tr>
                            <tr id="unarmedReachRow" style="display:none;">
                                <th>Reach</th>
                                <td>
                                    <select id="unarmedReach">
                                        <option value="T" selected>Touch</option>
                                        <option value="S">Short</option>
                                        <option value="M">Medium</option>
                                        <option value="L">Long</option>
                                        <option value="VL">Very Long</option>
                                    </select>
                                </td>
                            </tr>
                            <tr id="unarmedSizeRow" style="display:none;">
                                <th>Size</th>
                                <td>
                                    <select id="unarmedSize">
                                        <option value="S" selected>Small</option>
                                        <option value="M">Medium</option>
                                        <option value="L">Large</option>
                                        <option value="H">Huge</option>
                                        <option value="E">Enormous</option>
                                        <option value="BE">Beyond Enormous</option>
                                    </select>
                                </td>
                            </tr>
                            <tr id="unarmedCombatEffectsRow" style="display:none;">
                                <th>Combat Effects</th>
                                <td><input type="text" id="unarmedCombatEffects" placeholder="e.g. Bash, Stun Location" style="width: 100%;"></td>
                            </tr>
                            <tr id="rangedStatsRow">
                                <th>Ranged Status</th>
                                <td id="rangedStatsValue" style="font-weight: bold;">-</td>
                            </tr>
                            ${rangeRowHtml}
                            <tr>
                                <th>Spend AP</th>
                                <td><input type="checkbox" id="spend-ap"></td>
                            </tr>
                            <tr>
                                <th>Spend Luck Point</th>
                                <td><input type="checkbox" id="spend-luck"></td>
                            </tr>
                            <tr>
                                <th>Augment combat style</th>
                                <td><input type="checkbox" id="Augment"></td>
                            </tr>
                            <tr>
                                <th>Augment with</th>
                                <td><select id="augSkill">${augOptions.join("")}</select></td>
                            </tr>
                            <tr>
                                <th>Custom Augment Value:</th>
                                <td><input type="number" value="0" id="custom-augment" style="width: 100px; text-align: center;"></td>
                            </tr>
                            <tr>
                                <th>Reduce Ammo by 1</th>
                                <td><input id="ammoReduction" type="checkbox" checked></td>
                            </tr>
                            <tr>
                                <th>Charging?</th>
                                <td><input type="checkbox" id="isCharging"></td>
                            </tr>
                            <tr id="chargeTypeRow" style="display:none;">
                                <th>Charge Type</th>
                                <td>
                                    <select id="chargeType">
                                        <option value="contact">Into Contact</option>
                                        <option value="through">Through Contact</option>
                                    </select>
                                </td>
                            </tr>
                            <tr id="chargeDamageStepRow" style="display:none;">
                                <th>Damage Mod. Increase</th>
                                <td>
                                    <select id="chargeDamageStep">
                                        <option value="1">One Step</option>
                                        <option value="2">Two Steps</option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <th>Damage Mod. Substitute?</th>
                                <td><input type="checkbox" id="damageModSubToggle"></td>
                            </tr>
                            <tr id="damageModSubRow" style="display:none;">
                                <th>Substitute Value</th>
                                <td><input type="text" id="damageModSubValue" placeholder="e.g. 1d4+2" style="width: 100px;"></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
              </form>`,
    buttons: {
        one: {
            label: "Roll Attack",
            callback: async (html) => {
                const actor = token.actor;
                const activeTarget = game.user.targets.first();
                if (!activeTarget) return ui.notifications.info("Please target the token that you wish to attack.");

                let weaponName = html.find(`[id="weaponToRoll"]`).val();
                const weapon = weaponArray.find(i => i.name === weaponName) || weaponArray[0];

                const staticDisableReasons = getWeaponDisableReasons(weapon).filter(reason => reason !== "Reach too short for current range");
                if (staticDisableReasons.length > 0) {
                    ui.notifications.warn(`${weapon.name} cannot be used to attack (${staticDisableReasons.join(", ")}).`);
                    return;
                }

                if (weapon.type === "ranged-weapon") {
                    const requiredLoad = Number(weapon.system?.load) ?? 1;
                    const currentLoad = weapon.getFlag(MODULE_ID, "loadProgress") ?? 0;
                    if (requiredLoad > 0 && currentLoad < requiredLoad) {
                        ui.notifications.warn(`${weapon.name} is not loaded (${currentLoad}/${requiredLoad} Load actions completed). Use Load Weapon first!`);
                        return;
                    }
                }

                let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
                if (currentAP === undefined) {
                    currentAP = foundry.utils.getProperty(actor, "system.currentActionPoints") ?? 0;
                }
                currentAP = Number(currentAP);
                let newAP = currentAP;

                if (currentAP <= 0) {
                    ui.notifications.warn(`${token.name} has no Action Points left to attack!`);
                    return;
                }

                const reduceAmmo = html.find(`[id="ammoReduction"]`)[0].checked;
                let remainingAmmo = weapon.system?.ammo ?? 0;

                if (weapon.type === "ranged-weapon" && reduceAmmo) {
                    if (remainingAmmo <= 0) {
                        ui.notifications.info("You are out of ammunition for this weapon, please select another weapon.");
                        return;
                    }
                    remainingAmmo -= 1;
                    await weapon.update({"system.ammo": remainingAmmo});
                }

                const skillToRollName = html.find(`[id="skillToRoll"]`).val();
                const skillToRoll = skillArray.find(i => i.name === skillToRollName);
                const augSkillName = html.find(`[id="augSkill"]`).val();
                const augSkill = token.actor.items.find(i => i.name === augSkillName);
                const cb = html.find(`[id="Augment"]`)[0].checked;
                const customValue = Number(html[0].querySelector('#custom-augment').value);
                const spendLuck = html.find(`[id="spend-luck"]`).is(':checked');

                if (spendLuck && !await globalThis.MAGCM_spendLuckPoint(actor)) return;

                const isCharging = html.find(`[id="isCharging"]`).is(':checked');
                const chargeType = html.find(`[id="chargeType"]`).val();
                const chargeDamageStep = Number(html.find(`[id="chargeDamageStep"]`).val()) || 1;
                const useDamageModSub = html.find(`[id="damageModSubToggle"]`).is(':checked');
                const damageModSubRaw = String(html.find(`[id="damageModSubValue"]`).val() || "").trim();

                const damageModifierPattern = /^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i;
                if (useDamageModSub && !damageModifierPattern.test(damageModSubRaw)) {
                    ui.notifications.warn(`Invalid Damage Modifier Substitute value: "${damageModSubRaw}". Expected a format like "1d4+2" or "2d6".`);
                    return;
                }

                let attackerRangeName = "Medium";
                let hasExistingEngagementRange = false;
                if (enableReach) {
                    attackerRangeName = html.find('#combatRangeValue').text() || "Medium";
                    const engagements = actor.getFlag(MODULE_ID, "engagements") || {};
                    const targetActorId = activeTarget?.actor?.id;
                    const engagementData = targetActorId ? engagements[targetActorId] : (activeTarget ? engagements[activeTarget.id] : null);
                    const rawExistingRange = typeof engagementData === "object" ? engagementData?.range : engagementData;
                    hasExistingEngagementRange = Boolean(rawExistingRange);

                    // Charging through contact carries the attacker past the target, so no lasting engagement is formed
                    if (!(isCharging && chargeType === 'through') && activeTarget?.actor && (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed')) {
                        const targetActor = activeTarget.actor;
                        const sourceEngagements = engagements;

                        if (!sourceEngagements[targetActor.id]) {
                            const sourceData = {
                                name: activeTarget.name || targetActor.name,
                                img: activeTarget.document?.texture?.src || activeTarget.texture?.src || targetActor.img,
                                range: attackerRangeName
                            };
                            const targetData = {
                                name: token.name || actor.name,
                                img: token.document?.texture?.src || token.texture?.src || actor.img,
                                range: attackerRangeName
                            };

                            await setEngagementFlag(actor, targetActor.id, sourceData);
                            await setEngagementFlag(targetActor, actor.id, targetData);

                            canvas.tokens.placeables.forEach(t => t.refresh());
                        }
                    }
                }

                if (enableReach && hasExistingEngagementRange && weapon?.id && weapon.type === "melee-weapon") {
                    const rangeVal = rangeScale[attackerRangeName] ?? 1;
                    const reachVal = rangeScale[weapon.system?.reach || "S"] ?? 1;
                    if (rangeVal > reachVal + 1) {
                        ui.notifications.warn(`${weapon.name} cannot be used to attack at ${attackerRangeName} range because its reach is too short.`);
                        return;
                    }
                }

                const diffMult = Number(html.find(`[id="rollDifficulty"]`).val());
                const spendAP = html.find(`[id="spend-ap"]`)[0].checked;
                let actionPointReducedLabel = "";

                if (spendAP) {
                    newAP = currentAP - 1;
                    actionPointReducedLabel = `<p style="font-size: 0.85em; color: var(--color-text-dark-secondary); margin-top: 4px;">Action Points reduced by 1. ${newAP} Action Points remaining.</p>`;
                    await actor.update({ 
                        "system.trackedStats.actionPoints.value": String(newAP),
                        "system.currentActionPoints": newAP,
                        "system.attributes.actionPoints.value": newAP 
                    });
                }
                
                let combatStyleValue = getSkillValue(skillToRoll);
                if (cb) {
                    if (customValue !== 0) combatStyleValue = Number(getSkillValue(skillToRoll) + customValue);
                    else combatStyleValue = Number(Math.ceil(getSkillValue(augSkill) * 0.2) + getSkillValue(skillToRoll));
                }

                let diffValue = Math.ceil(combatStyleValue * diffMult);

                // Damage Modifier Substitute takes priority; otherwise a charge temporarily bumps the actor's damage mod steps
                let effectiveDamageModifierStr = actor.damageMod;
                if (useDamageModSub) {
                    effectiveDamageModifierStr = damageModSubRaw;
                } else if (isCharging) {
                    const originalDamageModStep = foundry.utils.getProperty(actor, "system.attributes.damageMod.mod");
                    await actor.update({ "system.attributes.damageMod.mod": Number(originalDamageModStep || 0) + chargeDamageStep });
                    effectiveDamageModifierStr = actor.damageMod;
                    await actor.update({ "system.attributes.damageMod.mod": originalDamageModStep });
                }

                let weaponDamage = weapon.system?.damageModifier
                    ? (effectiveDamageModifierStr ? `${weapon.system.damage}+${effectiveDamageModifierStr}` : weapon.system.damage)
                    : weapon.damageRoll;
                let weaponReachName = weapon.system?.reach || "S"; 
                let weaponSizeName = weapon.system?.size || "M";
                let weaponForceName = weapon.system?.force || "S";
                let weaponImpaleSizeName = weapon.system?.["impale-size"] || "S";

                // No usable weapon selected: use the custom damage/reach/size fields instead of the weapon's own stats
                if (!weapon.id) {
                    const customDamageFormula = String(html.find(`[id="unarmedDamageFormula"]`).val() || "").trim();
                    const baseFormula = customDamageFormula || "1d3";
                    const dmod = effectiveDamageModifierStr ? String(effectiveDamageModifierStr).trim() : "";
                    weaponDamage = dmod
                        ? `${baseFormula}${dmod.startsWith("+") || dmod.startsWith("-") ? dmod : `+${dmod}`}`
                        : baseFormula;
                    weaponReachName = html.find(`[id="unarmedReach"]`).val() || "T";
                    weaponSizeName = html.find(`[id="unarmedSize"]`).val() || "S";
                }

                // If the Unarmed skill is chosen while a real weapon is still selected, treat the attack as bare-handed;
                // when the Unarmed fallback itself is selected, its custom damage/reach/size fields already apply above.
                if (skillToRollName.toLowerCase() === 'unarmed' && weapon.id) {
                    weaponName = `Unarmed/Improvised`;
                    weaponDamage = effectiveDamageModifierStr;
                    weaponReachName = "T";
                    weaponSizeName = "S";
                }

                let rangeVal = rangeScale[attackerRangeName] ?? 1;
                let reachVal = rangeScale[weaponReachName] ?? 1;
                let sizeVal = sizeMap[weaponSizeName] ?? 1;
                if (isCharging) sizeVal = Math.min(sizeScale.length - 1, sizeVal + 1);

                let effectiveDamage = weaponDamage;
                let effectiveSizeName = isCharging ? (sizeScale[sizeVal] ?? weaponSizeName) : weaponSizeName;
                let reachPenaltyTriggered = false;

                // Only evaluate reach penalties if reach mechanics are enabled
                if (enableReach && (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed')) {
                    if (rangeVal < reachVal - 1) {
                        reachPenaltyTriggered = true;
                        const dmod = effectiveDamageModifierStr ? String(effectiveDamageModifierStr).trim() : "";
                        const baseDmg = "1d3+1";
                        if (dmod) {
                            if (!dmod.startsWith("+") && !dmod.startsWith("-")) {
                                effectiveDamage = `${baseDmg} + ${dmod}`;
                            } else {
                                effectiveDamage = `${baseDmg} ${dmod}`;
                            }
                        } else {
                            effectiveDamage = baseDmg;
                        }
                        let stepDiff = reachVal - rangeVal;
                        let newSizeVal = Math.max(0, sizeVal - stepDiff);
                        effectiveSizeName = sizeScale[newSizeVal];
                    }
                }

                let combatRoll = new Roll("1d100");
                await combatRoll.evaluate();
                
                let resultLabel = "";
                let baseResultLabel = ""; 
                
                if (combatRoll.result <= Math.ceil(diffValue * 0.1)){
                    resultLabel = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                    baseResultLabel = "Critical";
                } else if (combatRoll.result == 99 || combatRoll.result == 100){
                    resultLabel = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                    baseResultLabel = "Fumble";
                } else if (combatRoll.result <= diffValue){
                    resultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                    baseResultLabel = "Success";
                } else {
                    resultLabel = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                    baseResultLabel = "Failure";
                }

                function createDamageButton(className, label) {
                  return `<button type="button" class="${className} submit-damage" disabled
                              data-target-token="${activeTarget.id}"
                              data-target-name="${activeTarget.name}"
                              data-attacker-name="${token.name}"
                              data-attacker-uuid="${actor.uuid}"
                              data-attacker-actor-id="${actor.id}"
                              data-attacker-token="${token.id}"
                              data-hit-location-name="Unknown Location"
                              data-weapon-name="${weaponName}"
                              data-weapon-id="${weapon.id || ""}"
                              data-weapon-size="${weapon.system?.size || weapon.system?.["impale-size"] || "Unknown"}"
                              data-damage-modifier="${weapon.system?.damageModifier === true}"
                              data-damage=""
                              data-damage-formula="${effectiveDamage}"
                              data-armor="0"
                              data-natural-armor="0"
                              data-hit-location-id="">
                              ${label}
                          </button>`;
                }


                const combatEffects = weapon.id
                    ? (weapon.system?.["combat-effects"] ?? weapon.system?.combatEffects ?? "")
                    : String(html.find(`[id="unarmedCombatEffects"]`).val() || "");
                const combatEffectsText = (Array.isArray(combatEffects) ? combatEffects.join(",") : String(combatEffects)).toLowerCase();
                const canImpale = combatEffectsText.includes("impale");
                const canSunder = combatEffectsText.includes("sunder");
                const canEntangle = combatEffectsText.includes("entangle");
                const canStunLocation = combatEffectsText.includes("stun location");
                let applyDamageButton = createDamageButton('simple-damage', 'Apply Damage');
                let chooseLocationButton = createDamageButton('choose-location', 'Choose Location');
                let penaltyNotice = reachPenaltyTriggered 
                    ? `<div style="color: darkred; font-size: 0.85em; margin-bottom: 5px;"><i>Weapon inside Reach limit: Damage reduced to 1d3+1. Size reduced by steps.</i></div>` : "";

                let chargeNotice = isCharging
                    ? `<div style="color: darkred; font-size: 0.85em; margin-bottom: 5px;"><i>Charging ${chargeType === 'through' ? 'Through' : 'Into'} Contact (Damage Modifier +${chargeDamageStep} Step${chargeDamageStep > 1 ? 's' : ''}, Size +1 Step).</i></div>`
                    : "";
                let damageModSubNotice = useDamageModSub
                    ? `<div style="color: darkred; font-size: 0.85em; margin-bottom: 5px;"><i>Damage Modifier Substituted: ${damageModSubRaw}</i></div>`
                    : "";

                chatModHtml = (isModTextVisible || isCharging) ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${escapeTooltip(composeModifiersText(isCharging))}" style="cursor: help; color: #e1a100; font-weight: bold;">
                            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>` : "";

                let displayReach = rangeDisplay[weaponReachName] || weaponReachName;
                let displaySize = sizeDisplay[effectiveSizeName] || effectiveSizeName;
                let displayForce = sizeDisplay[weaponForceName] || weaponForceName;
                let displayImpaleSize = sizeDisplay[weaponImpaleSizeName] || weaponImpaleSizeName;

                // Maximise Damage (special effect) only applies to the weapon's own leading dice term, and only on a Critical
                const leadingDiceMatch = String(effectiveDamage).trim().match(/^(\d*)d(\d+)/i);
                const maxDiceStacks = leadingDiceMatch ? (parseInt(leadingDiceMatch[1] || "1", 10)) : 0;
                let maximiseDamageHtml = "";
                if (baseResultLabel === "Critical" && maxDiceStacks > 0) {
                    const stackOptions = Array.from({ length: maxDiceStacks + 1 }, (_, i) => `<option value="${i}">${i}</option>`).join("");
                    maximiseDamageHtml = `
                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 5px;">
                        <label for="maximise-damage-select" style="font-size: 0.85em;">Maximise Damage (dice):</label>
                        <select class="maximise-damage-select" id="maximise-damage-select" data-max-stacks="${maxDiceStacks}">${stackOptions}</select>
                    </div>`;
                }

                let statsInfoHtml = "";
                if (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed') {
                    if (enableReach) {
                        statsInfoHtml = `<strong>Range:</strong> ${attackerRangeName} | <strong>Reach:</strong> ${displayReach} | <strong>Size:</strong> ${displaySize}`;
                    } else {
                        statsInfoHtml = `<strong>Size:</strong> ${displaySize}`;
                    }
                } else if (weapon.type === "ranged-weapon") {
                    statsInfoHtml = `<strong>Force:</strong> ${displayForce} | <strong>Impale Size:</strong> ${displayImpaleSize} | <strong>Ammo Left:</strong> ${remainingAmmo}`;
                }

                let diffText = "Standard";
                let diffIndex = 2;
                switch(String(diffMult)) {
                    case "2": diffText = "Very Easy"; diffIndex = 0; break;
                    case "1.5": diffText = "Easy"; diffIndex = 1; break;
                    case "1": diffText = "Standard"; diffIndex = 2; break;
                    case "0.67": diffText = "Hard"; diffIndex = 3; break;
                    case "0.5": diffText = "Formidable"; diffIndex = 4; break;
                    case "0.1": diffText = "Herculean"; diffIndex = 5; break;
                }

                let augString = "";
                if (cb) {
                    augString = customValue !== 0 ? `Custom Value (${customValue})` : `${augSkillName} (+${Math.ceil(getSkillValue(augSkill) * 0.2)})`;
                }

                // Gather properties for parry/evade specific effects pass
                let attackerWeaponType = weapon.type === "ranged-weapon" ? "ranged" : "melee";
                let attackerWeaponTraits = combatEffectsText;
                let attackerStyleTraits = skillToRoll.system?.traits || "";

                let contentString = `
                    <div class="attack-card" data-attacker-user-id="${game.user.id}">
                    <div style="font-size: 0.9em; margin-bottom: 5px; border-bottom: 1px solid var(--color-border-dark-tertiary); padding-bottom: 4px;">
                        ${statsInfoHtml}
                    </div>
                    ${penaltyNotice}
                    ${chargeNotice}
                    ${damageModSubNotice}
                    ${chatModHtml}
                    <div style="margin: 0 0 5px 0;">
                        <p style="font-size: 1.1em; text-align: center; margin-bottom: 4px;">
                            <strong>Attack Roll (${diffText}):</strong> [[${combatRoll.result}]] vs ${diffValue}% (${resultLabel})
                        </p>
                        <div class="attack-staging-controls" style="display: flex; justify-content: center; gap: 5px; flex-wrap: wrap;">
                            <button type="button" class="roll-hit-location" data-target-token="${activeTarget.id}">Roll Hit Location</button>
                            <button type="button" class="roll-attack-damage" data-damage-formula="${effectiveDamage}">Roll Damage</button>
                            <button type="button" class="reroll-attack-damage" data-damage-formula="${effectiveDamage}" disabled>Re-roll Damage</button>
                        </div>
                        ${maximiseDamageHtml}
                    </div>

                    <div class="damageElement revealed" style="display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 5px 0 0 0;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid; padding: 5px 0;">
                            <div><strong>Hit Location:</strong></div>
                            <div class="attack-hit-location-result">Not rolled</div>
                        </div>
                        <div class="attack-location-armor" style="display: flex; justify-content: space-between; border-bottom: 1px solid; padding: 5px 0;">
                            <div><strong>Worn Armor:</strong></div><div>Not rolled</div>
                        </div>
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid; padding: 5px 0;">
                            <div><strong>Weapon Damage: </strong></div>
                            <div>${weaponName} <span class="attack-damage-result">Not rolled</span></div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 4px;">
                                                    ${applyDamageButton} ${chooseLocationButton}
                        </div>
                                                <div style="display: flex; justify-content: center; gap: 12px; margin-top: 5px; flex-wrap: wrap;">
                                                    <label><input type="checkbox" class="attack-bypass-worn-armor"> Bypass Worn Armor</label>
                                                    <label><input type="checkbox" class="attack-bypass-natural-armor"> Bypass Natural Armor</label>
                                                    <label><input type="checkbox" class="attack-half-damage"> Half Damage</label>
                                                    ${canImpale ? `<label><input type="checkbox" class="attack-impale-toggle"> Impale</label>` : ""}
                                                    ${canSunder ? `<label><input type="checkbox" class="attack-sunder-toggle"> Sunder</label>` : ""}
                                                    ${canEntangle ? `<label><input type="checkbox" class="attack-entangle-toggle"> Entangle</label>` : ""}
                                                    ${canStunLocation ? `<label><input type="checkbox" class="attack-stun-location-toggle"> Stun Location</label>` : ""}
                                                </div>
                    </div>
                    ${actionPointReducedLabel}
                    <hr>                    
                    <div style="display: flex; gap: 5px; margin-top: 10px;">
                        <button type="button" class="parry-button" data-attacker-name="${token.name}" data-attacker-range="${attackerRangeName}" data-attacker-size="${effectiveSizeName}" data-attacker-result="${baseResultLabel}" data-attacker-weapon-type="${attackerWeaponType}" data-attacker-weapon-traits="${attackerWeaponTraits}" data-attacker-style-traits="${attackerStyleTraits}">Parry</button>
                        <button type="button" class="evade-button" data-attacker-name="${token.name}" data-attacker-result="${baseResultLabel}" data-attacker-weapon-type="${attackerWeaponType}" data-attacker-weapon-traits="${attackerWeaponTraits}" data-attacker-style-traits="${attackerStyleTraits}">Evade</button>
                        <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${skillToRoll.id}" data-attacker-score="${combatRoll.result}" data-attacker-result="${baseResultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}">Contest</button>
                    </div>
                    </div>`;

                let flavortext = `Attacking ${activeTarget.name} with ${weaponName} using ${skillToRollName}`;
                if (cb) {
                    let augVal = customValue !== 0 ? customValue : Math.ceil(getSkillValue(augSkill) * 0.2);
                    let augLabel = customValue !== 0 ? "Custom" : augSkillName;
                    flavortext += ` (Augmented by ${augLabel}: +${augVal})`;
                }

                if (weapon.type === "ranged-weapon") {
                    await weapon.setFlag(MODULE_ID, "loadProgress", 0);
                }

                ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker(), flavor: flavortext, content: contentString, rolls: [combatRoll] });
            }
        },
        two: { label: "Cancel" }
    },
    default: "one",
    render: (html) => {
        const augmentCheckbox = html.find('#Augment');
        const augSkillRow = html.find('#augSkill').closest('tr');
        const customAugRow = html.find('#custom-augment').closest('tr');
        const ammoCheckbox = html.find('#ammoReduction');
        const ammoRow = ammoCheckbox.closest('tr');
        const rangeRow = html.find('#rangeRow');
        const rangedStatsRow = html.find('#rangedStatsRow');
        const rangedStatsValue = html.find('#rangedStatsValue');
        const weaponSelect = html.find('#weaponToRoll');
        const skillSelect = html.find('#skillToRoll');
        const chargingCheckbox = html.find('#isCharging');
        const chargeTypeRow = html.find('#chargeTypeRow');
        const chargeDamageStepRow = html.find('#chargeDamageStepRow');
        const damageModSubToggle = html.find('#damageModSubToggle');
        const damageModSubRow = html.find('#damageModSubRow');
        const rollModifiersRow = html.find('#rollModifiersRow');
        const rollModifiersSpan = html.find('.rollModifiers');
        const unarmedDamageRow = html.find('#unarmedDamageRow');
        const unarmedReachRow = html.find('#unarmedReachRow');
        const unarmedSizeRow = html.find('#unarmedSizeRow');
        const unarmedCombatEffectsRow = html.find('#unarmedCombatEffectsRow');

        function updateVisibility() {
            const activeTarget = game.user.targets.first();
            const targetNameHtml = activeTarget 
                ? activeTarget.name 
                : `<span style="color: darkred; font-weight: normal; font-style: italic;">No target selected</span>`;
            html.find('#targetNameValue').html(targetNameHtml);

            if (augmentCheckbox.is(':checked')) {
                augSkillRow.show();
                customAugRow.show();
            } else {
                augSkillRow.hide();
                customAugRow.hide();
            }

            const selectedWeaponName = weaponSelect.val();
            const selectedWeapon = weaponArray.find(i => i.name === selectedWeaponName) || weaponArray[0];
            const skillToRollName = skillSelect.val() || "";
            const engagements = token.actor.getFlag(MODULE_ID, "engagements") || {};
            const targetActorId = activeTarget?.actor?.id;
            const engagementData = targetActorId ? engagements[targetActorId] : (activeTarget ? engagements[activeTarget.id] : null);
            const rawRange = typeof engagementData === "object" ? engagementData?.range : engagementData;
            const hasExistingRange = Boolean(rawRange);
            const rangeForChecks = rawRange || "Medium";

            weaponArray.forEach(weapon => {
                weapon._rangeBlocked = Boolean(enableReach && hasExistingRange && weapon?.id && weapon.type === "melee-weapon"
                    && ((rangeScale[rangeForChecks] ?? 1) > ((rangeScale[weapon.system?.reach || "S"] ?? 1) + 1)));
            });

            weaponSelect.find('option').each(function () {
                const option = $(this);
                const baseName = String(option.data('baseName') || option.text()).replace(/\s*\([^)]*\)\s*$/, "");
                const weapon = weaponArray.find(i => i.name === baseName);
                if (!weapon) return;
                const reasons = getWeaponDisableReasons(weapon);
                const blocked = reasons.length > 0;
                const suffix = blocked ? ` (${reasons.join(", ")})` : "";
                option.prop('disabled', blocked);
                option.attr('title', blocked ? `Cannot attack: ${reasons.join(", ")}.` : "");
                option.text(`${baseName}${suffix}`);
            });

            if (selectedWeapon && getWeaponDisableReasons(selectedWeapon).length > 0) {
                const firstUsable = weaponArray.find(w => getWeaponDisableReasons(w).length === 0);
                if (firstUsable) weaponSelect.val(firstUsable.name);
            }

            const activeWeaponName = weaponSelect.val();
            const activeWeapon = weaponArray.find(i => i.name === activeWeaponName) || weaponArray[0];

            const isUnarmedFallback = Boolean(activeWeapon && !activeWeapon.id);
            unarmedDamageRow.toggle(isUnarmedFallback);
            unarmedReachRow.toggle(isUnarmedFallback);
            unarmedSizeRow.toggle(isUnarmedFallback);
            unarmedCombatEffectsRow.toggle(isUnarmedFallback);

            if (activeWeapon && activeWeapon.type === "ranged-weapon") {
                ammoRow.show();
                if (enableReach) rangeRow.hide();
                rangedStatsRow.show();
                const requiredLoad = Number(activeWeapon.system?.load) ?? 1;
                const currentLoad = activeWeapon.getFlag(MODULE_ID, "loadProgress") ?? 0;
                const ammo = activeWeapon.system?.ammo ?? 0;
                rangedStatsValue.text(`Load: ${currentLoad}/${requiredLoad} | Ammo: ${ammo}`);
            } else {
                ammoRow.hide();
                rangedStatsRow.hide();

                if (enableReach) {
                    rangeRow.show();
                    if (rawRange) {
                        const formattedRange = rangeDisplay[rawRange] || rawRange;
                        html.find('#combatRangeValue').text(formattedRange);
                    } else {
                        let rawReach = activeWeapon.system?.reach || "M";
                        if (skillToRollName.toLowerCase() === 'unarmed') rawReach = "T";
                        const defaultRange = rangeDisplay[rawReach] || "Medium";
                        html.find('#combatRangeValue').text(defaultRange);
                    }
                } else {
                    rangeRow.hide();
                }
            }

            if (chargingCheckbox.is(':checked')) {
                chargeTypeRow.show();
                chargeDamageStepRow.show();
            } else {
                chargeTypeRow.hide();
                chargeDamageStepRow.hide();
            }

            damageModSubRow.toggle(damageModSubToggle.is(':checked'));

            const chargingActive = chargingCheckbox.is(':checked');
            rollModifiersSpan.attr('data-tooltip', escapeTooltip(composeModifiersText(chargingActive)));
            rollModifiersRow.toggle(isModTextVisible || chargingActive);
        }

        weaponSelect.on('change', () => {
            const selectedWeaponName = weaponSelect.val();
            const selectedWeapon = weaponArray.find(i => i.name === selectedWeaponName);
            if (selectedWeapon && selectedWeapon.type === "ranged-weapon") {
                ammoCheckbox.prop('checked', true);
            }
            updateVisibility();
        });

        skillSelect.on('change', () => {
            if (skillSelect.val().toLowerCase() === 'unarmed') {
                weaponSelect.val('Unarmed/Improvised');
            }
            updateVisibility();
        });
        augmentCheckbox.on('change', updateVisibility);
        chargingCheckbox.on('change', updateVisibility);
        damageModSubToggle.on('change', updateVisibility);
        updateVisibility();
    }
}, { width: 425, height: 600, resizable: true });

d.render(true);