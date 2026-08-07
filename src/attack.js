// attack.js
// Tested on Foundry VTT v13

const skillArray = token.actor.items.filter(skill => skill.type === "combatStyle" || (skill.type === "standardSkill" && skill.name.toLowerCase() === "unarmed"));
const augArray = token.actor.items.filter(skill => 
    skill.type === "standardSkill" ||
    skill.type === "professionalSkill" ||
    skill.type === "combatStyle" ||
    skill.type === "magicSkill" ||
    skill.type === "passion");

const weaponArray = token.actor.items.filter(weapon => weapon.type === "melee-weapon" || weapon.type === "ranged-weapon");

skillArray.sort((a, b) => {
    let nameA = a.name.toUpperCase();
    let nameB = b.name.toUpperCase();
    if (nameA < nameB) return -1;
    if (nameA > nameB) return 1;
    return 0;
});

const skillOptions = skillArray.map(i => `<option>${i.name}</option>`);
const augOptions = augArray.map(i => `<option>${i.name}</option>`);
const weaponOptions = weaponArray.map(i => `<option>${i.name}</option>`);

const rangeScale = { "T": 0, "S": 1, "M": 2, "L": 3, "VL": 4, "Touch": 0, "Short": 1, "Medium": 2, "Long": 3, "Very Long": 4 };
const rangeDisplay = { "T": "Touch", "S": "Short", "M": "Medium", "L": "Long", "VL": "Very Long", "Touch": "Touch", "Short": "Short", "Medium": "Medium", "Long": "Long", "Very Long": "Very Long" };

const sizeScale = ["S", "M", "L", "H", "E", "BE"];
const sizeMap = { "S": 0, "M": 1, "L": 2, "H": 3, "E": 4, "BE": 5, "Small": 0, "Medium": 1, "Large": 2, "Huge": 3, "Enormous": 4, "Colossal": 5 };
const sizeDisplay = { "S": "Small", "M": "Medium", "L": "Large", "H": "Huge", "E": "Enormous", "BE": "Beyond Enormous", "Small": "Small", "Medium": "Medium", "Large": "Large", "Huge": "Huge", "Enormous": "Enormous", "Colossal": "Colossal" };

// Fetch Native Roll Modifiers for the default selected skill
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

const d = new Dialog({
    title: "Attack Roll",
    content: `<form>
                <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
                    <table style="text-align: left; width: 100%;">
                        <tbody>
                            ${modHtml}
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
                            <tr id="rangeRow">
                                <th>Current Range</th>
                                <td>
                                    <select id="combatRange">
                                        <option value="Touch">Touch</option>
                                        <option value="Short">Short</option>
                                        <option value="Medium" selected>Medium</option>
                                        <option value="Long">Long</option>
                                        <option value="Very Long">Very Long</option>
                                    </select>
                                </td>
                            </tr>
                            <tr>
                                <th>Augment combat style?</th>
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
                                <th>Reduce Ammo by 1?</th>
                                <td><input id="ammoReduction" type="checkbox"></td>
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
                let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
                if (currentAP === undefined) {
                    currentAP = foundry.utils.getProperty(actor, "system.currentActionPoints") ?? 0;
                }
                currentAP = Number(currentAP);

                if (currentAP <= 0) {
                    ui.notifications.warn(`${token.name} has no Action Points left to attack!`);
                    return;
                }

                const newAP = currentAP - 1;
                await actor.update({ 
                    "system.trackedStats.actionPoints.value": String(newAP),
                    "system.currentActionPoints": newAP,
                    "system.attributes.actionPoints.value": newAP 
                });

                const skillToRollName = html.find(`[id="skillToRoll"]`).val();
                const skillToRoll = skillArray.find(i => i.name === skillToRollName);
                const augSkillName = html.find(`[id="augSkill"]`).val();
                const augSkill = token.actor.items.find(i => i.name === augSkillName);
                const cb = html.find(`[id="Augment"]`)[0].checked;
                const customValue = Number(html[0].querySelector('#custom-augment').value);
                const attackerRangeName = html.find(`[id="combatRange"]`).val();
                const diffMult = Number(html.find(`[id="rollDifficulty"]`).val());
                
                let combatStyleValue = skillToRoll.totalVal;
                if (cb) {
                    if (customValue !== 0) combatStyleValue = Number(skillToRoll.totalVal + customValue);
                    else combatStyleValue = Number(Math.ceil(augSkill.totalVal * 0.2) + skillToRoll.totalVal);
                }

                let diffValue = Math.ceil(combatStyleValue * diffMult);

                let weaponName = html.find(`[id="weaponToRoll"]`).val();
                const weapon = weaponArray.find(i => i.name === weaponName);
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

                // Only apply reach and range penalties for melee weapons or unarmed attacks
                if (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed') {
                    if (rangeVal < reachVal) {
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

                let targetToken = game.scenes.active.tokens.find(t => t.id === Array.from(game.user.targets.ids)[0]);
                if (!targetToken) return ui.notifications.info("Please target the token that you wish to attack.");

                let targetHitLocation = targetToken ? targetToken.actor.items.find(loc => {
                    const start = loc.system?.rollRangeStart ?? loc.rollRangeStart;
                    const end = loc.system?.rollRangeEnd ?? loc.rollRangeEnd;
                    return start !== undefined && end !== undefined && hitLocRoll.total >= start && hitLocRoll.total <= end;
                }) : "";

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
                              data-target-token="${targetToken.id}"
                              data-target-name="${targetToken.name}"
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

                let applyDamageButton = createDamageButton('simple-damage', 'Apply Damage');
                let bypassArmorButton = createDamageButton('bypass-armor', 'Bypass Armor');
                let chooseLocationButton = createDamageButton('choose-location', 'Choose Location');
                let impaleButton = createDamageButton('impale', 'Impale Damage');

                let penaltyNotice = reachPenaltyTriggered 
                    ? `<div style="color: darkred; font-size: 0.85em; margin-bottom: 5px;"><i>Weapon inside Reach limit: Damage reduced to 1d3+1. Size reduced by steps.</i></div>` : "";

                let displayReach = rangeDisplay[weaponReachName] || weaponReachName;
                let displaySize = sizeDisplay[effectiveSizeName] || effectiveSizeName;
                let displayForce = sizeDisplay[weaponForceName] || weaponForceName;
                let displayImpaleSize = sizeDisplay[weaponImpaleSizeName] || weaponImpaleSizeName;

                let statsInfoHtml = "";
                if (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed') {
                    statsInfoHtml = `<strong>Range:</strong> ${attackerRangeName} | <strong>Reach:</strong> ${displayReach} | <strong>Size:</strong> ${displaySize}`;
                } else if (weapon.type === "ranged-weapon") {
                    statsInfoHtml = `<strong>Force:</strong> ${displayForce} | <strong>Impale Size:</strong> ${displayImpaleSize}`;
                }

                let diffText = "Standard";
                let diffIndex = 2; // Default to Standard
                switch(String(diffMult)) {
                    case "2": diffText = "Very Easy"; diffIndex = 0; break;
                    case "1.5": diffText = "Easy"; diffIndex = 1; break;
                    case "1": diffText = "Standard"; diffIndex = 2; break;
                    case "0.67": diffText = "Hard"; diffIndex = 3; break;
                    case "0.5": diffText = "Formidable"; diffIndex = 4; break;
                    case "0.1": diffText = "Herculean"; diffIndex = 5; break;
                }

                // Build Augment string for Contest Roll forwarding
                let augString = "";
                if (cb) {
                    augString = customValue !== 0 ? `Custom Value (${customValue})` : `${augSkillName} (+${Math.ceil(augSkill.totalVal * 0.2)})`;
                }

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
                    
                    <hr>
                    <div style="display: flex; gap: 5px; margin-top: 10px;">
                        <button type="button" class="parry-button" data-attacker-name="${token.name}" data-attacker-range="${attackerRangeName}" data-attacker-size="${effectiveSizeName}" data-attacker-result="${baseResultLabel}">Parry</button>
                        <button type="button" class="evade-button" data-attacker-name="${token.name}" data-attacker-result="${baseResultLabel}">Evade</button>
                        <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${skillToRoll.id}" data-attacker-score="${combatRoll.result}" data-attacker-result="${baseResultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}">Contest</button>
                    </div>`;

                let flavortext = `Attacking ${targetToken.name} with ${weaponName} using ${skillToRollName}`;
                if (cb) {
                    let augVal = customValue !== 0 ? customValue : Math.ceil(augSkill.totalVal * 0.2);
                    let augLabel = customValue !== 0 ? "Custom" : augSkillName;
                    flavortext += ` (Augmented by ${augLabel}: +${augVal})`;
                }

                const reduceAmmo = html.find(`[id="ammoReduction"]`)[0].checked;
                if (weapon.type === "ranged-weapon" && reduceAmmo) {
                    if (weapon.system.ammo <= 0) {
                        ui.notifications.info("You are out of ammunition for this weapon, please select another weapon");
                    } else {
                        weapon.update({"system.ammo": weapon.system.ammo - 1});
                        ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker(), flavor: flavortext, content: contentString, rolls: [combatRoll, weaponRoll, hitLocRoll] });
                    }
                } else {
                    ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker(), flavor: flavortext, content: contentString, rolls: [combatRoll, weaponRoll, hitLocRoll] });
                }
            }
        },
        two: { label: "Cancel" }
    },
    default: "one",
    render: (html) => {
        const augmentCheckbox = html.find('#Augment');
        const augSkillRow = html.find('#augSkill').closest('tr');
        const customAugRow = html.find('#custom-augment').closest('tr');
        const ammoRow = html.find('#ammoReduction').closest('tr');
        const rangeRow = html.find('#rangeRow');
        const weaponSelect = html.find('#weaponToRoll');

        function updateVisibility() {
            if (augmentCheckbox.is(':checked')) {
                augSkillRow.show();
                customAugRow.show();
            } else {
                augSkillRow.hide();
                customAugRow.hide();
            }

            const selectedWeaponName = weaponSelect.val();
            const selectedWeapon = weaponArray.find(i => i.name === selectedWeaponName);
            if (selectedWeapon && selectedWeapon.type === "ranged-weapon") {
                ammoRow.show();
                rangeRow.hide();
            } else {
                ammoRow.hide();
                rangeRow.show();
            }
        }

        augmentCheckbox.on('change', updateVisibility);
        weaponSelect.on('change', updateVisibility);
        updateVisibility();
    }
}, { width: 425, height: 400, resizable: true });

d.render(true);