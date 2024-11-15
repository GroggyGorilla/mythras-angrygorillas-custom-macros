async function randomizeBuild(token, skillLevel, physicalSkillLevel, utilitySkillLevel, deceptionSkillLevel, socialSkillLevel, combatSkillLevel) {

    if (!!token.actor.hasPlayerOwner) {
        ui.notifications.warn(`Build cannot be randomized for ${token.actor.name} as it is owned by a player.`);
    }

    else {
        let rollStr, rollCon, rollSiz, rollDex, rollInt, rollPow, rollCha;
        let rollPhysicalSkills, rollUtilitySkills, rollDeceptionSkills, rollSocialSkills, rollCombatSkills;
        const physicalSkills = ['athletics', 'brawn', 'endurance', 'evade', 'unarmed', 'acrobatics'];
        const utilitySkills = ['boating', 'drive', 'first aid', 'insight', 'perception', 'ride', 'swim', 'willpower', 'healing', 'lockpicking', 'mechanisms', 'sleight', 'streetwise', 'survival', 'track'];
        const deceptionSkills = ['conceal', 'deceit', 'stealth'];
        const socialSkills = ['customs', 'dance', 'influence', 'locale', 'native tongue', 'sing'];
        const combatSkills = ['primary combat style', 'secondary combat style', 'tertiary combat style'];

        // Set roll values
        switch (skillLevel) {
            case 'untrained':
                rollStr = '4d4';
                rollCon = '4d4';
                rollSiz = '1d7+7';
                rollDex = '4d4';
                rollInt = '1d5+7';
                rollPow = '3d4';
                rollCha = '3d4';
                break;
            case 'novice':
                rollStr = '4d4+2';
                rollCon = '4d4+2';
                rollSiz = '1d8+8';
                rollDex = '4d4+2';
                rollInt = '1d9+7';
                rollPow = '4d4+2';
                rollCha = '4d4+2';
                break;
            case 'skilled':
                rollStr = '2d6+6';
                rollCon = '2d6+6';
                rollSiz = '2d6+6';
                rollDex = '2d6+6';
                rollInt = '2d6+6';
                rollPow = '2d6+6';
                rollCha = '2d6+6';
                break;
            case 'veteran':
                rollStr = '6d2+6';
                rollCon = '6d2+6';
                rollSiz = '6d2+6';
                rollDex = '6d2+6';
                rollInt = '6d2+6';
                rollPow = '6d2+6';
                rollCha = '6d2+6';
                break;
            case 'master':
                rollStr = '4d2+10';
                rollCon = '4d2+10';
                rollSiz = '6d2+6';
                rollDex = '4d2+10';
                rollInt = '6d2+6';
                rollPow = '6d2+6';
                rollCha = '6d2+6';
                break;
            default:
                rollStr = '3d6';
                rollCon = '3d6';
                rollSiz = '2d6+6';
                rollDex = '3d6';
                rollInt = '2d6+6';
                rollPow = '3d6';
                rollCha = '3d6';
        }

        switch (physicalSkillLevel) {
            case 'untrained':
                rollPhysicalSkills = '1d20';
                break;
            case 'novice':
                rollPhysicalSkills = '1d20+10';
                break;
            case 'skilled':
                rollPhysicalSkills = '5d4+15';
                break;
            case 'veteran':
                rollPhysicalSkills = '5d6+25';
                break;
            case 'master':
                rollPhysicalSkills = '5d6+35';
                break;
            default:
                rollPhysicalSkills = '4d20';
                break;
        }

        switch (utilitySkillLevel) {
            case 'untrained':
                rollUtilitySkills = '0';
                break;
            case 'novice':
                rollUtilitySkills = '5d4-5';
                break;
            case 'skilled':
                rollUtilitySkills = '5d4+15';
                break;
            case 'veteran':
                rollUtilitySkills = '5d6+20';
                break;
            case 'master':
                rollUtilitySkills = '5d6+25';
                break;
            default:
                rollUtilitySkills = '4d20';
                break;
        }

        switch (deceptionSkillLevel) {
            case 'untrained':
                rollDeceptionSkills = '0';
                break;
            case 'novice':
                rollDeceptionSkills = '5d4-5';
                break;
            case 'skilled':
                rollDeceptionSkills = '5d6+10';
                break;
            case 'veteran':
                rollDeceptionSkills = '5d6+15';
                break;
            case 'master':
                rollDeceptionSkills = '5d8+25';
                break;
            default:
                rollDeceptionSkills = '4d20';
                break;
        }

        switch (socialSkillLevel) {
            case 'untrained':
                rollSocialSkills = '0';
                break;
            case 'novice':
                rollSocialSkills = '5d4-5';
                break;
            case 'skilled':
                rollSocialSkills = '5d6';
                break;
            case 'veteran':
                rollSocialSkills = '5d6+15';
                break;
            case 'master':
                rollSocialSkills = '5d8+20';
                break;
            default:
                rollSocialSkills = '4d20';
                break;
        }

        switch (combatSkillLevel) {
            case 'untrained':
                rollCombatSkills = '1d20';
                break;
            case 'novice':
                rollCombatSkills = '1d20+15';
                break;
            case 'skilled':
                rollCombatSkills = '6d4+32';
                break;
            case 'veteran':
                rollCombatSkills = '6d4+45';
                break;
            case 'master':
                rollCombatSkills = '8d4+60';
                break;
            default:
                rollCombatSkills = '4d20';
                break;
        }


        rollStr = new Roll(rollStr);    // STR
        rollStr.roll({ async: false });
        rollCon = new Roll(rollCon);    // CON
        rollCon.roll({ async: false });
        rollSiz = new Roll(rollSiz);    // SIZ
        rollSiz.roll({ async: false });
        rollDex = new Roll(rollDex);    // DEX
        rollDex.roll({ async: false });
        rollInt = new Roll(rollInt);    // INT
        rollInt.roll({ async: false });
        rollPow = new Roll(rollPow);    // POW
        rollPow.roll({ async: false });
        rollCha = new Roll(rollCha);    // CHA
        rollCha.roll({ async: false });



        token.actor.update({ 'system.characteristics.str.value': Number(rollStr.total) });
        token.actor.update({ 'system.characteristics.con.value': Number(rollCon.total) });
        token.actor.update({ 'system.characteristics.siz.value': Number(rollSiz.total) });
        token.actor.update({ 'system.characteristics.dex.value': Number(rollDex.total) });
        token.actor.update({ 'system.characteristics.int.value': Number(rollInt.total) });
        token.actor.update({ 'system.characteristics.pow.value': Number(rollPow.total) });
        token.actor.update({ 'system.characteristics.cha.value': Number(rollCha.total) });

        let skills = token.actor.items.filter(skill =>
            skill.type === "standardSkill" ||
            skill.type === "professionalSkill" ||
            skill.type === "combatStyle");

        for (const skill of skills) {
            if (physicalSkills.includes(skill.name.toLowerCase())) {
                let physicalSkillsRoll = new Roll(rollPhysicalSkills);  // Physical Skills
                physicalSkillsRoll.roll({ async: false });
                skill.update({
                    'system.trainingVal': Number(physicalSkillsRoll.total)
                });
            }
            if (utilitySkills.includes(skill.name.toLowerCase())) {
                let utilitySkillsRoll = new Roll(rollUtilitySkills);    // Utility Skills
                utilitySkillsRoll.roll({ async: false });
                skill.update({
                    'system.trainingVal': Number(utilitySkillsRoll.total)
                });
            }
            if (deceptionSkills.includes(skill.name.toLowerCase())) {
                let deceptionSkillsRoll = new Roll(rollDeceptionSkills);// Deception Skills
                deceptionSkillsRoll.roll({ async: false });
                skill.update({
                    'system.trainingVal': Number(deceptionSkillsRoll.total)
                });
            }
            if (socialSkills.includes(skill.name.toLowerCase())) {
                let socialSkillsRoll = new Roll(rollSocialSkills);      // Social Skills
                socialSkillsRoll.roll({ async: false });
                let skillIncrease = Number(socialSkillsRoll.total);
                if (skillIncrease < 40) {
                    skillIncrease = 40;
                }
                skill.update({
                    'system.trainingVal': Number(skillIncrease)
                });
            }
            if (combatSkills.includes(skill.name.toLowerCase())) {
                let combatSkillsRoll = new Roll(rollCombatSkills);      // Combat Skills
                combatSkillsRoll.roll({ async: false });
                skill.update({
                    'system.trainingVal': Number(combatSkillsRoll.total)
                });
            }
        }


        // Restore AP and HP
        let maxAP = token.actor.maxActionPoints;
        if (!!maxAP) {
            token.actor.update({ 'system.trackedStats.actionPoints.value': maxAP });
        }

        let allHitLocations = token.actor.items.filter(i => i.type === 'hitLocation')
        for (let hitLoc of allHitLocations) {
            if (hitLoc.system.currentHp != hitLoc.maxHp) {
                hitLoc.update({ 'system.currentHp': hitLoc.maxHp })
            }
        }

        ui.notifications.info(`Build randomized for ${token.actor.name} with the selected skill levels.`);
    }
}

async function cycleTargets(skillLevel, physicalSkillLevel, utilitySkillLevel, deceptionSkillLevel, socialSkillLevel, combatSkillLevel) {

    let tokens = canvas.tokens.controlled;

    for (let tok of tokens) {

        await randomizeBuild(tok, skillLevel, physicalSkillLevel, utilitySkillLevel, deceptionSkillLevel, socialSkillLevel, combatSkillLevel);

    }

}

const d = new Dialog({
    title: "Randomize Build",
    content: `
        <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
            <em>
                <p>Randomizes the characteristics, standard skills, certain professional skills, and the "Primary Combat Style" and "Secondary Combat Style" of selected tokens.</p>
                <p>Does not work on player-owned tokens.</p>
                <p>Also resets AP and hit location HP based on new stats.</p>
            </em>
        </div>
        <table>
            <tr>
                <th style="text-align:right; padding-right:10px">Statistics Level</th>
                <td><select name="drpBuildSkillLevel" id="drpBuildSkillLevel">
                <option value="untrained">Untrained</option>
                <option value="novice" selected>Novice</option>
                <option value="skilled">Skilled</option>
                <option value="veteran">Veteran</option>
                <option value="master">Master</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Physical Skill Level</th>
                <td><select name="drpBuildPhysicalSkillLevel" id="drpBuildPhysicalSkillLevel">
                <option value="untrained">Untrained</option>
                <option value="novice" selected>Novice</option>
                <option value="skilled">Skilled</option>
                <option value="veteran">Veteran</option>
                <option value="master">Master</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Utility Skill Level</th>
                <td><select name="drpBuildUtilitySkillLevel" id="drpBuildUtilitySkillLevel">
                <option value="untrained">Untrained</option>
                <option value="novice" selected>Novice</option>
                <option value="skilled">Skilled</option>
                <option value="veteran">Veteran</option>
                <option value="master">Master</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Deception Skill Level</th>
                <td><select name="drpBuildDeceptionSkillLevel" id="drpBuildDeceptionSkillLevel">
                <option value="untrained">Untrained</option>
                <option value="novice" selected>Novice</option>
                <option value="skilled">Skilled</option>
                <option value="veteran">Veteran</option>
                <option value="master">Master</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Social Skill Level</th>
                <td><select name="drpBuildSocialSkillLevel" id="drpBuildSocialSkillLevel">
                <option value="untrained">Untrained</option>
                <option value="novice" selected>Novice</option>
                <option value="skilled">Skilled</option>
                <option value="veteran">Veteran</option>
                <option value="master">Master</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Combat Skill Level</th>
                <td><select name="drpBuildCombatSkillLevel" id="drpBuildCombatSkillLevel">
                <option value="untrained">Untrained</option>
                <option value="novice" selected>Novice</option>
                <option value="skilled">Skilled</option>
                <option value="veteran">Veteran</option>
                <option value="master">Master</option>
                </select>
            </tr>
        </table>`,
    buttons: {
        one: {
            label: "Randomize",
            callback: html => {
                cycleTargets(html.find(`[id="drpBuildSkillLevel"]`).val(), html.find(`[id="drpBuildPhysicalSkillLevel"]`).val(), html.find(`[id="drpBuildUtilitySkillLevel"]`).val(), html.find(`[id="drpBuildDeceptionSkillLevel"]`).val(), html.find(`[id="drpBuildSocialSkillLevel"]`).val(), html.find(`[id="drpBuildCombatSkillLevel"]`).val())
            }
        },
        two: {
            label: "Cancel",
            callback: html => console.log("Cancelled")
        }
    },
    default: "one",
    close: html => console.log()
});

d.render(true);