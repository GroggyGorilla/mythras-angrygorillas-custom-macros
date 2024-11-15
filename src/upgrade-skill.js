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
    content: `<script>   
                function ToggleVisibilityOfCustomChangeControls() {
                    let checked = document.getElementById('cbCustomChange').checked;
                    if (checked) {
                        $('#txtCustomChange').prop('disabled', false);
                    } else {
                        $('#txtCustomChange').prop('disabled', true);
                    }
                }
            </script>
            <form>
                <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
                    <div>
                        <i>
                            <p>Uses an Experience Roll (if more than zero and Custom Change is unchecked) to upgrade a skill. If the upgrade roll is successful, a 1d4+1 is rolled and the result is added to the selected skill. If the upgrade roll fails, one point is added to the skill's training instead.</p>
                        </i>
                    <hr>
                    </div>
                    <table>
                    <tbody>
                    <tr>
                        <th style="text-align:left">Skill</th>
                        <td>
                            <select id="skillToRoll">
                                ${skillOptions.join("")}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th style="text-align:left"><label for="cbCustomChange">Custom Change</label></th>
                        <td>
                            <input type="checkbox" id="cbCustomChange" name="cbCustomChange" onclick="ToggleVisibilityOfCustomChangeControls()">
                        </td>
                    </tr>
                    <tr>
                        <th style="text-align:left"><label for="txtCustomChange">Custom Change Value</label></th>
                        <td>
                            <input type="text" id="txtCustomChange" name="txtCustomChange" value="0" disabled>
                        </td>
                    </tr>
                    <tr>
                        <th style="text-align:left"><label for="txtSkillCustomChangeReason">Reason</label></th>
                        <td>
                            <textarea id="txtSkillCustomChangeReason" name="txtSkillCustomChangeReason"></textarea>
                        </td>
                    </tbody>
                    </table>
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
                    const customChange = html.find(`[id="cbCustomChange"]`)[0].checked;
                    let customChangeValue = Number(document.getElementById('txtCustomChange').value);
                    customChangeValue = isNaN(customChangeValue) ? 0 : customChangeValue;
                    const reason = document.getElementById('txtSkillCustomChangeReason').value;




                    let flavortext = `Attempting to upgrade ${selectedSkillName} (${selectedSkill.totalVal}%) with INT: ${intelligence}`;

                    const expRolls = token.actor.statTracker.trackedStats.experienceRolls.value;

                    if (!!customChange) {
                        let contentString = `${reason != `` ? `<p><strong>Reason:</strong> ${reason}</p>` : ``}
                        <p><strong>${selectedSkillName}</strong> increased by ${customChangeValue}.</p><p>${selectedSkillValue}% -> <span style="color:green">${selectedSkillValue + customChangeValue}</span>%</p>`;
                        selectedSkill.update({ 'system.trainingVal': Number(selectedSkill.system.trainingVal) + customChangeValue });

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
                            contentString += `<p>Skill upgrade failed. EXP rolls left: ${expRolls - 1}</p><p><strong>${selectedSkillName}</strong> increased by 1.</p><p>${selectedSkillValue}% -> <span style="color:green">${selectedSkillValue + 1}</span>%</p>`;
                            selectedSkill.update({ 'system.trainingVal': Number(selectedSkill.system.trainingVal) + 1 });
                        } else {
                            contentString += `<p>Skill upgrade succeeded. EXP rolls left: ${expRolls - 1}</p><p><strong>${selectedSkillName}</strong> increased by [[${skillUpgradeValueDiceRoll.result}]].</p><p>${selectedSkillValue}% -> <span style="color:green">${selectedSkillValue + skillUpgradeValueDiceRoll.total}</span>%</p>`;
                            selectedSkill.update({ 'system.trainingVal': Number(selectedSkill.system.trainingVal) + skillUpgradeValueDiceRoll.total });
                        }

                        token.actor.update({ 'system.trackedStats.experienceRolls.value': expRolls - 1 });


                        ChatMessage.create({
                            type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                            roll: skillUpgradeSuccessDiceRoll,
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({ token: token }),
                            flavor: flavortext,
                            content: `${reason != `` ? `<p><strong>Reason:</strong> ${reason}</p>` : ``} ${contentString}`
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