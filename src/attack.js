// attack.js
// Tested on Foundry VTT v13

const MODULE_ID = typeof MAGCM_MODULE_ID !== "undefined" ? MAGCM_MODULE_ID : "mythras-angrygorillas-custom-macros";

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
    if (weapon.getFlag(MODULE_ID, "pinned") || weapon.getFlag(MODULE_ID, "impaled")) return false;
    return holdingLocations.length > 0 || Boolean(weapon.system?.equipped ?? weapon.system?.isEquipped);
});

if (weaponArray.length === 0) {
    weaponArray.push({
        name: "Unarmed",
        type: "melee-weapon",
        damageRoll: token.actor.damageMod || "1d3",
        system: { reach: "T", size: "S", force: "S" }
    });
}

const skillOptions = skillArray.map(i => `<option>${i.name}</option>`);
const augOptions = augArray.map(i => `<option>${i.name}</option>`);
const weaponOptions = weaponArray.map(i => `<option>${i.name}</option>`);

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
        const modifiersList = token.actor.sheet.roller.getSkillRollModifiers(initialSkill);
        if (modifiersList && modifiersList.length > 0) {
            modText = modifiersList.map(m => `<strong>${m.name}:</strong><br/> ${m.value}`).join('<br/>');
            isModTextVisible = true;
        }
    } catch(e) {
        console.warn("Could not retrieve roll modifiers", e);
    }
}

let modHtml = "";
let chatModHtml = "";
if (isModTextVisible) {
    modHtml = `
    <tr>
        <td colspan="2">
            <div style="margin-bottom: 5px;">
                <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: darkred; font-weight: bold;">
                    Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                </span>
            </div>
        </td>
    </tr>`;
    
    chatModHtml = `
    <div style="text-align: center; margin-bottom: 5px;">
        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: darkred; font-weight: bold;">
            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
        </span>
    </div>`;
}

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

                if (weapon?.id && (weapon.getFlag(MODULE_ID, "pinned") || weapon.getFlag(MODULE_ID, "impaled"))) {
                    const state = weapon.getFlag(MODULE_ID, "impaled") ? "impaled" : "pinned";
                    ui.notifications.warn(`${weapon.name} is ${state} and cannot be used to attack.`);
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
                
                let attackerRangeName = "Medium";
                if (enableReach) {
                    attackerRangeName = html.find('#combatRangeValue').text() || "Medium";

                    // Create reciprocal engagement if reach mechanics are enabled and none exists
                    if (activeTarget?.actor && (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed')) {
                        const targetActor = activeTarget.actor;
                        const sourceEngagements = actor.getFlag(MODULE_ID, "engagements") || {};

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
                
                let combatStyleValue = skillToRoll.totalVal;
                if (cb) {
                    if (customValue !== 0) combatStyleValue = Number(skillToRoll.totalVal + customValue);
                    else combatStyleValue = Number(Math.ceil(augSkill.totalVal * 0.2) + skillToRoll.totalVal);
                }

                let diffValue = Math.ceil(combatStyleValue * diffMult);

                let weaponDamage = weapon.damageRoll;
                let weaponReachName = weapon.system?.reach || "S"; 
                let weaponSizeName = weapon.system?.size || "M";
                let weaponForceName = weapon.system?.force || "S";
                let weaponImpaleSizeName = weapon.system?.["impale-size"] || "S";

                if (skillToRollName.toLowerCase() === 'unarmed') {
                    weaponName = `Unarmed`;
                    weaponDamage = token.actor.damageMod;
                    weaponReachName = "T";
                    weaponSizeName = "S";
                }

                let rangeVal = rangeScale[attackerRangeName] ?? 1;
                let reachVal = rangeScale[weaponReachName] ?? 1;
                let sizeVal = sizeMap[weaponSizeName] ?? 1;

                let effectiveDamage = weaponDamage;
                let effectiveSizeName = weaponSizeName;
                let reachPenaltyTriggered = false;

                // Only evaluate reach penalties if reach mechanics are enabled
                if (enableReach && (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed')) {
                    if (rangeVal < reachVal - 1) {
                        reachPenaltyTriggered = true;
                        const dmod = token.actor.damageMod ? String(token.actor.damageMod).trim() : "";
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
                let weaponRoll = new Roll(effectiveDamage);
                let hitLocRoll = new Roll("1d20");
                await combatRoll.evaluate();
                await weaponRoll.evaluate();
                await hitLocRoll.evaluate();
                
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

                let targetHitLocation = activeTarget.actor.items.find(loc => {
                    const start = loc.system?.rollRangeStart ?? loc.rollRangeStart;
                    const end = loc.system?.rollRangeEnd ?? loc.rollRangeEnd;
                    return start !== undefined && end !== undefined && hitLocRoll.total >= start && hitLocRoll.total <= end;
                });

                let equippedArmorAp = targetHitLocation?.equippedArmor ? targetHitLocation.equippedArmor.map((armor) => armor.ap).reduce((prev, curr) => prev + curr, 0) : 0;
                let totalAp = targetHitLocation?.totalAp || 0;
                let equippedArmorName = (equippedArmorAp == totalAp && targetHitLocation?.equippedArmorNames) ? targetHitLocation.equippedArmorNames : "Natural";
                
                let locationArmorEntry = targetHitLocation ? `<div style="display: flex; justify-content: space-between; border-bottom: 1px solid; padding: 5px 0;">
                                                                    <div><strong>Location Armor: </strong></div>
                                                                    <div>${equippedArmorName} <strong>[[${totalAp}]]</strong></div>
                                                            </div>` : "";

                function createDamageButton(className, label) {
                  const finalDamage = weaponRoll.total < 0 ? 0 : weaponRoll.total;
                  return `<button type="button" class="${className} submit-damage" 
                              data-target-token="${activeTarget.id}"
                              data-target-name="${activeTarget.name}"
                              data-hit-location-name="${targetHitLocation?.name || 'Unknown Location'}"
                              data-weapon-name="${weaponName}"
                              data-damage="${finalDamage}" 
                              data-damage-formula="${weaponRoll.formula}"
                              data-armor="${equippedArmorAp}" 
                              data-natural-armor="${targetHitLocation?.naturalArmor || 0}" 
                              data-hit-location-id="${targetHitLocation?.id}">
                              ${label}
                          </button>`;
                }


                const combatEffects = weapon.system?.["combat-effects"] ?? weapon.system?.combatEffects ?? "";
                const canImpale = (Array.isArray(combatEffects) ? combatEffects.join(",") : String(combatEffects)).toLowerCase().includes("impale");
                const impaleButton = canImpale ? `<button type="button" class="attack-impale-button"
                data-target-token="${activeTarget.id}"
                data-target-name="${activeTarget.name}"
                data-hit-location-name="${targetHitLocation?.name || 'Unknown Location'}"
                data-weapon-name="${weaponName}"
                data-weapon-id="${weapon.id || ""}"
                data-attacker-actor-id="${actor.id}"
                    data-attacker-token="${token.id}"
                data-damage-formula="${weaponRoll.formula}"
                data-damage-modifier="${weapon.system?.damageModifier === true}"
                data-weapon-size="${weapon.system?.size || weapon.system?.["impale-size"] || "Unknown"}"
                data-armor="${equippedArmorAp}"
                data-natural-armor="${targetHitLocation?.naturalArmor || 0}"
                data-hit-location-id="${targetHitLocation?.id || ""}">
                Roll Impale
                </button>` : "";
                let applyDamageButton = createDamageButton('simple-damage', 'Apply Damage');
                let bypassArmorButton = createDamageButton('bypass-armor', 'Bypass Armor and Apply Damage');
                let chooseLocationButton = createDamageButton('choose-location', 'Choose Location');
                let penaltyNotice = reachPenaltyTriggered 
                    ? `<div style="color: darkred; font-size: 0.85em; margin-bottom: 5px;"><i>Weapon inside Reach limit: Damage reduced to 1d3+1. Size reduced by steps.</i></div>` : "";

                let displayReach = rangeDisplay[weaponReachName] || weaponReachName;
                let displaySize = sizeDisplay[effectiveSizeName] || effectiveSizeName;
                let displayForce = sizeDisplay[weaponForceName] || weaponForceName;
                let displayImpaleSize = sizeDisplay[weaponImpaleSizeName] || weaponImpaleSizeName;

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
                    augString = customValue !== 0 ? `Custom Value (${customValue})` : `${augSkillName} (+${Math.ceil(augSkill.totalVal * 0.2)})`;
                }

                // Gather properties for parry/evade specific effects pass
                let attackerWeaponType = weapon.type === "ranged-weapon" ? "ranged" : "melee";
                let attackerWeaponTraits = weapon.system?.['combat-effects'] || "";
                let attackerStyleTraits = skillToRoll.system?.traits || "";

                let contentString = `
                    <div style="font-size: 0.9em; margin-bottom: 5px; border-bottom: 1px solid var(--color-border-dark-tertiary); padding-bottom: 4px;">
                        ${statsInfoHtml}
                    </div>
                    ${penaltyNotice}
                    ${chatModHtml}
                    <div style="margin: 0 0 5px 0;">
                        <p style="font-size: 1.1em; text-align: center; margin-bottom: 4px;">
                            <strong>Roll (${diffText}):</strong> [[${combatRoll.result}]] vs ${diffValue}% (${resultLabel})
                        </p>
                        <button type="button" class="viewDamage" style="margin-top: 5px;">View Damage/Hit Loc.</button>
                    </div>

                    <div class="damageElement" style="display: flex; flex-direction: column; justify-content: center; gap: 5px; overflow: hidden; height: 0; width: 0; visibility: hidden; transition: 0.3s; padding: 5px 0 0 0;">
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid; padding: 5px 0;">
                            <div><strong>Hit Location:</strong></div>
                            <div>${targetHitLocation?.name||""} <strong>[[${hitLocRoll.result}]]</strong></div>
                        </div>
                        ${locationArmorEntry}
                        <div style="display: flex; justify-content: space-between; border-bottom: 1px solid; padding: 5px 0;">
                            <div><strong>Weapon Damage: </strong></div>
                            <div>${weaponName} <strong>[[${weaponRoll.result}]]</strong></div>
                        </div>
                        <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 4px;">
                          ${applyDamageButton} ${bypassArmorButton} ${chooseLocationButton} ${impaleButton}
                        </div>
                    </div>
                    ${actionPointReducedLabel}
                    <hr>                    
                    <div style="display: flex; gap: 5px; margin-top: 10px;">
                        <button type="button" class="parry-button" data-attacker-name="${token.name}" data-attacker-range="${attackerRangeName}" data-attacker-size="${effectiveSizeName}" data-attacker-result="${baseResultLabel}" data-attacker-weapon-type="${attackerWeaponType}" data-attacker-weapon-traits="${attackerWeaponTraits}" data-attacker-style-traits="${attackerStyleTraits}">Parry</button>
                        <button type="button" class="evade-button" data-attacker-name="${token.name}" data-attacker-result="${baseResultLabel}" data-attacker-weapon-type="${attackerWeaponType}" data-attacker-weapon-traits="${attackerWeaponTraits}" data-attacker-style-traits="${attackerStyleTraits}">Evade</button>
                        <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${skillToRoll.id}" data-attacker-score="${combatRoll.result}" data-attacker-result="${baseResultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}">Contest</button>
                    </div>`;

                let flavortext = `Attacking ${activeTarget.name} with ${weaponName} using ${skillToRollName}`;
                if (cb) {
                    let augVal = customValue !== 0 ? customValue : Math.ceil(augSkill.totalVal * 0.2);
                    let augLabel = customValue !== 0 ? "Custom" : augSkillName;
                    flavortext += ` (Augmented by ${augLabel}: +${augVal})`;
                }

                if (weapon.type === "ranged-weapon") {
                    await weapon.setFlag(MODULE_ID, "loadProgress", 0);
                }

                ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker(), flavor: flavortext, content: contentString, rolls: [combatRoll, weaponRoll, hitLocRoll] });
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

            if (selectedWeapon && selectedWeapon.type === "ranged-weapon") {
                ammoRow.show();
                if (enableReach) rangeRow.hide();
                rangedStatsRow.show();
                const requiredLoad = Number(selectedWeapon.system?.load) ?? 1;
                const currentLoad = selectedWeapon.getFlag(MODULE_ID, "loadProgress") ?? 0;
                const ammo = selectedWeapon.system?.ammo ?? 0;
                rangedStatsValue.text(`Load: ${currentLoad}/${requiredLoad} | Ammo: ${ammo}`);
            } else {
                ammoRow.hide();
                rangedStatsRow.hide();

                if (enableReach) {
                    rangeRow.show();
                    const engagements = token.actor.getFlag(MODULE_ID, "engagements") || {};
                    const targetActorId = activeTarget?.actor?.id;
                    const engagementData = targetActorId ? engagements[targetActorId] : (activeTarget ? engagements[activeTarget.id] : null);

                    const rawRange = typeof engagementData === "object" ? engagementData?.range : engagementData;

                    if (rawRange) {
                        const formattedRange = rangeDisplay[rawRange] || rawRange;
                        html.find('#combatRangeValue').text(formattedRange);
                    } else {
                        let rawReach = selectedWeapon.system?.reach || "M";
                        if (skillToRollName.toLowerCase() === 'unarmed') rawReach = "T";
                        const defaultRange = rangeDisplay[rawReach] || "Medium";
                        html.find('#combatRangeValue').text(defaultRange);
                    }
                } else {
                    rangeRow.hide();
                }
            }
        }

        weaponSelect.on('change', () => {
            const selectedWeaponName = weaponSelect.val();
            const selectedWeapon = weaponArray.find(i => i.name === selectedWeaponName);
            if (selectedWeapon && selectedWeapon.type === "ranged-weapon") {
                ammoCheckbox.prop('checked', true);
            }
            updateVisibility();
        });

        skillSelect.on('change', updateVisibility);
        augmentCheckbox.on('change', updateVisibility);
        updateVisibility();
    }
}, { width: 425, height: 440, resizable: true });

d.render(true);