// V12
// Derived from DogBoneZone's macros.

const skillArray = token.actor.items.filter(skill => skill.type === "combatStyle" || (skill.type === "standardSkill" && skill.name.toLowerCase() === "unarmed"));
const augArray = token.actor.items.filter(skill => 
    skill.type === "standardSkill"||
    skill.type === "professionalSkill"||
    skill.type === "combatStyle"||
    skill.type === "magicSkill"||
    skill.type === "passion");

const weaponArray = token.actor.items.filter(weapon => weapon.type === "melee-weapon"||weapon.type === "ranged-weapon");

skillArray.sort(function (a, b) {
    let nameA = a.name.toUpperCase();
    let nameB = b.name.toUpperCase();
    if (nameA < nameB) {
        return -1;
    } if (nameA > nameB) {
        return 1;
    }
    return 0
    });

const skillOptions = [];

const augOptions = [];
const weaponOptions = [];

for (let i of skillArray) {
    let option = `<option>${i.name}</option>`
    skillOptions.push(option);
}

for (let i of augArray) {
    let option = `<option>${i.name}</option>`
    augOptions.push(option);
}


for (let i of weaponArray) {
    let option = `<option>${i.name}</option>`
    weaponOptions.push(option);
}

const d = new Dialog({
    title: "Attack Roll",
    content: `<form>
                <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">

                    <div style="margin: 5px;">
                        <i>
                            <p>Select a Combat Style and Weapon. This will roll Combat Style, Weapon Damage, and Hit Location.</p>
<br>
                            <p>You can target a token in Foundry, which will auto-detect the target's Hit Location.
                            Otherwise, this will simply output the d20 result of the Hit Location roll.</p>
<br>
                            <p> You can augment the combat style with a selected skill or passion or set a custom value to add to the role. <br>
                            If any number other than 0 is entered into the custom value field, it will use it over the selected skill. Augmentation is only applied if the box is checked.</p>
                        </i>
                    </div>
                        <hr>
 
                        <table style="text-align: center;">
                            <tbody>
                                <tr>
                                    <th>Combat Style</th>
                                    <td>
                                        <select id="skillToRoll">
                                            ${skillOptions.join("")}
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                <th>Augment combat style?

                                <td>
                                <input type="checkbox" id="Augment" >  
                                </td>
                                </th>
                                </tr>
                                <tr>
                                <th> Augment with </th>
                                <td>
                                    <select id="augSkill">
                                        ${augOptions.join("")}
                                    </select>
                                </td>
                                 </tr>
                                 <tr>
                                 <th>Custom Augment Value:</th>
                                 <td>
                                     <input type="number" value="0" id="custom-augment" style="width: 100px; text-align: center;">
                                     </td>
                                 
                                 </tr>
                                <tr>
                                    <th>Weapon</th>
                                    <td>
                                        <select id="weaponToRoll"">
                                            ${weaponOptions.join("")}
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Reduce Ammo by 1?</th>
                                    <td>
                                        <input id="ammoReduction" type="checkbox">
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                </div>
              </form>`,
    buttons: {
        one: {
            label: "Roll",
            callback: async (html) => {
                const skillToRollName = html.find(`[id="skillToRoll"]`).val();
                const skillToRoll = skillArray.find(i => i.name === skillToRollName);
                const augSkillName = html.find(`[id="augSkill"]`).val();
                const augSkill = token.actor.items.find(i => i.name === augSkillName);
                const cb=html.find(`[id="Augment"]`)[0].checked;
                const customValue = Number(html[0].querySelector('#custom-augment').value)
                let combatStyleValue= "";
                if (cb) {
                    if (customValue != 0) {
                        combatStyleValue = Number(skillToRoll.totalVal + customValue)
                    }
                    else {
                        combatStyleValue = Number(Math.ceil(augSkill.totalVal*.2) + skillToRoll.totalVal);
                        console.log("%s augments %s (%i) with %s (%i) for a new total of %i", token.actor.name, skillToRollName, skillToRoll.totalVal, augSkillName, augSkill.totalVal, combatStyleValue);
                    }
                }
                else {
                    combatStyleValue = skillToRoll.totalVal;
                }
                

                // Weapon Damage and Identification
                let weaponName = html.find(`[id="weaponToRoll"]`).val();
                const weapon = weaponArray.find(i => i.name === weaponName);
                let weaponDamage = weapon.damageRoll;
                if (skillToRollName.toLowerCase() === 'unarmed') {
                    weaponName = `Unarmed`;
                    weaponDamage = token.actor.damageMod;
                }
                /*
                if (weapon.damageModifier != undefined && weapon.damageModifier != null){
                    weaponDamage = `${weapon.damage} + ${token.actor.damageMod.value}`;
                } else {
                    weaponDamage = weapon.damage;
                }
                */

                // Dice Roll Execution
                let combatRoll = new Roll("1d100");
                let weaponRoll = new Roll(weaponDamage);
                let hitLocRoll = new Roll("1d20");
                await combatRoll.evaluate();
                await weaponRoll.evaluate();
                await hitLocRoll.evaluate();
                
                const diffGrades = [2, 1.5, 1, 2/3, 0.5, 0.1];
                const tableEntries = [];

                // Create Results Table
                for (let i of diffGrades){
                    let label = "";
                    let diffValue = Math.ceil(combatStyleValue * i);
                    let resultLabel = "";
                    if (combatRoll.result <= diffValue * 0.1){
                        resultLabel = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`
                    } else if (combatRoll.result == 99||combatRoll.result == 100){
                        resultLabel = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`
                    } else if ((combatRoll.result <= diffValue && combatRoll.result <96 ) || (combatRoll.result<=5 && combatRoll.result > diffValue)){
                        resultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`
                    } else if (combatRoll.result > diffValue && combatRoll.result > 5 || combatRoll.result>=96  && combatRoll.result <= diffValue){
                        resultLabel = `<span style="font-weight: bold; color: red;">FAILURE</span>`
                    }

                    if (i === 2){
                        label = "Very Easy";
                    } else if (i === 1.5) {
                        label = "Easy";
                    } else if (i === 1) {
                        label = "Standard";
                    } else if (i === 2/3) {
                        label = "Hard";
                    } else if (i === 0.5) {
                        label = "Formidable";
                    } else if (i === 0.1) {
                        label = "Herculean";
                    }

                    let entry = `<tr>
                                    <td style="font-weight: bold;">${label}:</td>
                                    <td style="font-weight: bold;">[[${combatRoll.result}]]</td>
                                    <td style="font-weight: bold;">[[${diffValue}]]</td>
                                    <td style="font-weight: bold;">${resultLabel}</td>
                                </tr>`

                    tableEntries.push(entry);

                }


                // Determine if a Token is targeted to output Hit Location Label
                let targetToken = game.scenes.active.getEmbeddedDocument("Token", game.user.targets.ids[0])
                console.log('here');
                console.log(targetToken);
                if (!targetToken) return ui.notifications.info("Please target the token that you wish to attack.")

                let targetHitLocation = targetToken ? targetToken.actor.items.find(loc => hitLocRoll.total >= loc.rollRangeStart && hitLocRoll.total <= loc.rollRangeEnd) : ""
                console.log(targetHitLocation.equippedArmor.ap)
                console.log(targetHitLocation)
                let equippedArmorAp = targetHitLocation.equippedArmor
                .map((armor) => armor.ap)
                .reduce((previousAp, currentAp) => previousAp + currentAp, 0)

                if (equippedArmorAp == targetHitLocation.totalAp) {
                   var equippedArmorName = targetHitLocation.equippedArmorNames
                }
                else { var equippedArmorName = "Natural"}
                
                let locationArmorEntry = targetHitLocation ? `<div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-bottom: 1px solid; padding: 5px 0;">
                                                                    <div>
                                                                        <strong>Location Armor: </strong>
                                                                    </div>
                                                                    <div>
                                                                        ${equippedArmorName}
                                                                        <strong>[[${targetHitLocation.totalAp}]]</strong>
                                                                    </div>
                                                            </div>` : ""

                // Damage Apply Buttons
                function createDamageButton(className) {
                    console.log(`weaponRoll.formula:`);
                    console.log(weaponRoll.formula);
                  return `<button type="button" class="${className} submit-damage" data-target-token="${targetToken.id}"
                              data-damage="${weaponRoll.total < 0 ? 0 : weaponRoll.total}" data-damage-formula="${weaponRoll.formula}"
                              data-armor="${equippedArmorAp}" data-natural-armor="${targetHitLocation.naturalArmor || 0}" data-hit-location-id="${targetHitLocation.id}">
                              Damage Applied
                          </button>`
                }

                let applyDamageButton = createDamageButton('simple-damage')
                let bypassArmorButton = createDamageButton('bypass-armor')
                let chooseLocationButton = createDamageButton('choose-location')
                let impaleButton = createDamageButton('impale')

                let contentString = `<div style="margin: 0 0 5px 0;">
                                        <table>
                                            <tr>
                                                <th>Difficulty</th>
                                                <th>Roll</th>
                                                <th>Skill %</th>
                                                <th>Result</th> 
                                            </tr>
                                            ${tableEntries.join("")}
                                        </table>
                                        <button type="button" class="viewDamage">View Damage/Hit Loc.</button>
                                    </div>

                                <div class="damageElement" style="display: flex; flex-direction: column; justify-content: center; gap: 5px; overflow: hidden; height: 0; width: 0; visibility: hidden; transition: 0.3s; padding: 5px 0 0 0;">
                                        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-bottom: 1px solid; padding: 5px 0;">
                                            <div>
                                                <strong>Hit Location:</strong>
                                            </div>
                                            <div>
                                                ${targetHitLocation.name||""}
                                                <strong>[[${hitLocRoll.result}]]</strong>
                                            </div>
                                        </div>

                                        ${locationArmorEntry}

                                        <div style="display: flex; flex-direction: row; justify-content: space-between; align-items: center; border-bottom: 1px solid; padding: 5px 0;">
                                            <div>
                                                <strong>Weapon Damage: </strong>
                                            </div>
                                            <div>
                                                ${weaponName}
                                                <strong>[[${weaponRoll.result}]]</strong>
                                            </div>
                                        </div>
                                        <div style="display: flex; align-items: center; justify-content: space-around;">
                                          ${applyDamageButton}
                                          ${bypassArmorButton}
                                          ${chooseLocationButton}
                                          ${impaleButton}
                                        </div>
                                </div>
                                `


                if (cb) {

                    flavortext=`Rolling ${skillToRollName} (${skillToRoll.totalVal}%) augmented by ${customValue != 0 ? `${customValue}%` : `${augSkillName} (${Math.ceil(augSkill.totalVal * .2)}%)`} and attacking with ${weaponName}`
                }
                else {
                    flavortext=`Rolling ${skillToRollName}   (${skillToRoll.totalVal}%) and attacking with ${weaponName} `
                }
                


                // Logic for Ammo Reduction Option
                const reduceAmmo = html.find(`[id="ammoReduction"]`)[0].checked;
                if (weapon.type === "ranged-weapon" && reduceAmmo) {

                    if (weapon.system.ammo <= 0) {
                        ui.notifications.info("You are out of ammunition for this weapon, please select another weapon");
                    } else {

                        let newAmmo= weapon.system.ammo - 1;

                        weapon.update({"system.ammo": newAmmo});

                        ChatMessage.create({
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker(),
                            flavor: flavortext,
                            content: contentString,
                            rolls: [combatRoll, weaponRoll, hitLocRoll]
                        })
                    }
                } else {

                    
                    ChatMessage.create({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker(),
                        flavor:  flavortext,
                        content: contentString,
                        rolls: [combatRoll, weaponRoll, hitLocRoll]
                    })
                }
            }
        },
        two: {
            label: "Cancel",
            callback: html => console.log("Cancelled")
        }
    },
    default: "one",
    close: html => console.log()
})

d.render(true);