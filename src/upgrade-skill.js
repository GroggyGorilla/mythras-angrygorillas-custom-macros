const skillArray = token.actor.items.filter(skill =>
    skill.type === "standardSkill" ||
    skill.type === "professionalSkill" ||
    skill.type === "combatStyle" ||
    skill.type === "magicSkill");
    

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

for (let i of skillArray) {
    let option = `<option>${i.name}</option>`
    skillOptions.push(option);
}

const d = new Dialog({
    title: "Skill Upgrade Roll",
    content: `<form>
                <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
                    <div>
                        <i>
                            <p>Uses an Experience Roll (if more than zero) to upgrade a skill. If the upgrade roll is successful, a 1d4+1 is rolled and the result is added to the selected skill. If the upgrade roll fails, one point is added to the skill's training instead.</p>
                        </i>
                    <hr>
                    </div>
                    <div style="text-align: right;">
                        <label style="font-weight: bold;">Skill:
                            <select id="skillToRoll">
                                ${skillOptions.join("")}
                            </select>
                        </label>
                    </div>
                    <div style="text-align: center;">
                    <label style="font-weight:bold;"> Bump by one?:
                    <input type="checkbox" id="BumpByOne">
                    </div>

                </div>
              </form>`,
    buttons: {
        one: {
            label: "Roll",
            callback: html => {

                canvas.tokens.controlled.forEach(rollToken);
                function rollToken(token) {

                    const selectedSkillName = html.find(`[id="skillToRoll"]`).val();
                    const selectedSkill = token.actor.items.find(i => i.name === selectedSkillName);
                    const selectedSkillValue = Number(selectedSkill.totalVal);
                    const intelligence = token.actor.characteristics.int;
                    const bumpByOne=html.find(`[id="BumpByOne"]`)[0].checked;


                    let flavortext = `Attempting to upgrade ${selectedSkillName} (${selectedSkill.totalVal}%) with INT: ${intelligence}`;

                    const expRolls = token.actor.statTracker.trackedStats.experienceRolls.value;

                    if (!!bumpByOne) {
                        let contentString = `<p><strong>${selectedSkillName}</strong> increased by 1.</p><p>${selectedSkillValue}% -> <span style="color:green">${selectedSkillValue + 1}</span>%</p>`;
                        selectedSkill.update({'system.trainingVal': Number(selectedSkill.system.trainingVal) + 1 });

                        ChatMessage.create({
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({ token: token }),
                            content: contentString
                        });
                    } else if (expRolls < 1) {

                        ChatMessage.create({
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({ token: token }),
                            flavor: flavortext,
                            content: `<p>Failed to upgrade due to lack of Experience Rolls.</p>`
                        });
                    }
                    else {


                        let skillUpgradeSuccessDiceRoll = new Roll(`1d100+${intelligence}`);
                        skillUpgradeSuccessDiceRoll.roll({ async: false });
                        let upgradeSuccess = false;

                        let resultLabel = "";

                        if (skillUpgradeSuccessDiceRoll.total >= selectedSkillValue) {
                            resultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                            upgradeSuccess = true;
                        } else {
                            resultLabel = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                        }

                        let resultRow = `<tr>
                                    <td style="font-weight: bold;">[[${skillUpgradeSuccessDiceRoll.result}]]</td>
                                    <td style="font-weight: bold;">[[${selectedSkillValue}]]</td>
                                    <td style="font-weight: bold;">${resultLabel}</td>
                                </tr>`;


                        let contentString = `<table>
                                    <tr>
                                        <th style="width:25%">Roll (d100+INT)</th>
                                        <th style="width:25%">Upgrade Threshold</th>
                                        <th style="width:25%">Result</th> 
                                    </tr>
                                    ${resultRow}
                                </table>`;


                        let skillUpgradeValueDiceRoll = new Roll(`1d4+1`);
                        skillUpgradeValueDiceRoll.roll({ async: false });
                        if (!upgradeSuccess) {
                            contentString += `<p>Skill upgrade failed. EXP rolls left: ${expRolls-1}</p><p><strong>${selectedSkillName}</strong> increased by 1.</p><p>${selectedSkillValue}% -> <span style="color:green">${selectedSkillValue + 1}</span>%</p>`;
                            selectedSkill.update({'system.trainingVal': Number(selectedSkill.system.trainingVal) + 1 });
                        } else {
                            contentString += `<p>Skill upgrade succeeded. EXP rolls left: ${expRolls-1}</p><p><strong>${selectedSkillName}</strong> increased by [[${skillUpgradeValueDiceRoll.result}]].</p><p>${selectedSkillValue}% -> <span style="color:green">${selectedSkillValue + skillUpgradeValueDiceRoll.total}</span>%</p>`;
                            selectedSkill.update({'system.trainingVal': Number(selectedSkill.system.trainingVal) + skillUpgradeValueDiceRoll.total });
                        }

                        token.actor.update({'system.trackedStats.experienceRolls.value' : expRolls-1 });


                        ChatMessage.create({
                            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                            roll: skillUpgradeSuccessDiceRoll,
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({ token: token }),
                            flavor: flavortext,
                            content: contentString
                        });
                    }
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