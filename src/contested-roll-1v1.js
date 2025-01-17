// Foundry VTT v12 Macro
// System: Mythras v2.2.6
// Developer: angrygorilla
/* This macro is designed to allow contested rolls between two characters. 
*  The characters rolling must have their tokens on the canvas.
*  The first character will be the one currently selected.
*  The second character will be the one currently targeted (using T).
*  If multiple characters are selected or targeted, only the first selected and first targeted characters will be rolled for.
*  
*  This macro accounts for both Differential Rolls and Opposed Rolls. The actual roll value is commented out by default in the content table string, but can be uncommented if it needs to be shown.
*  
*/
const firstCharacter = canvas.tokens.controlled[0].actor;
const secondCharacter = game.user.targets.first().actor;
const firstCharacterSkillArray = firstCharacter.items.filter(skill =>
    skill.type === "standardSkill" ||
    skill.type === "professionalSkill" ||
    skill.type === "combatStyle" ||
    skill.type === "magicSkill");


firstCharacterSkillArray.sort(function (a, b) {
    let nameA = a.name.toUpperCase();
    let nameB = b.name.toUpperCase();
    if (nameA < nameB) {
        return -1;
    } if (nameA > nameB) {
        return 1;
    }
    return 0;
});

const secondCharacterSkillArray = secondCharacter.items.filter(skill =>
    skill.type === "standardSkill" ||
    skill.type === "professionalSkill" ||
    skill.type === "combatStyle" ||
    skill.type === "magicSkill");


secondCharacterSkillArray.sort(function (a, b) {
    let nameA = a.name.toUpperCase();
    let nameB = b.name.toUpperCase();
    if (nameA < nameB) {
        return -1;
    } if (nameA > nameB) {
        return 1;
    }
    return 0
});

const difficultyGrades = [
    "Very Easy",
    "Easy",
    "Standard",
    "Hard",
    "Formidable",
    "Herculean"
];

const firstCharacterSkillOptions = [];
const secondCharacterSkillOptions = [];
const difficultyGradeOptions = [];

for (let i of firstCharacterSkillArray) {
    let option = `<option>${i.name}</option>`
    firstCharacterSkillOptions.push(option);
}
for (let i of secondCharacterSkillArray) {
    let option = `<option>${i.name}</option>`
    secondCharacterSkillOptions.push(option);
}
for (let i of difficultyGrades) {
    let option = (i === 'Standard') ? `<option selected>${i}</option>` : `<option>${i}</option>`;
    difficultyGradeOptions.push(option);
}

const d = new Dialog({
    title: "Contested Roll",
    content: `<script>
            </script>
            <form>
                <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
                    <div>
                        <i>
                            <p>Allows a contested roll between the selected token and the selected target. Defaults to the first selected token and the first selected target.</p>
                        </i>
                    <hr>
                    </div>
                    <table>
                    <thead>
                    <tr>
                        <th></th>
                        <th>${firstCharacter.name}
                        <th>${secondCharacter.name}</th>                        
                    </tr>
                    </thead>
                    <tbody>
                    <tr>
                        <th>Skill</th>
                        <td>
                            <select id="firstCharacterSkillToRoll">
                                ${firstCharacterSkillOptions.join("")}
                            </select>
                        </td>
                        <td>
                            <select id="secondCharacterSkillToRoll">
                                ${secondCharacterSkillOptions.join("")}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Difficulty Grade</th>
                        <td>
                            <select id="firstCharacterDifficulty">
                                ${difficultyGradeOptions.join("")}
                            </select>
                        </td>
                        <td>
                            <select id="secondCharacterDifficulty">
                                ${difficultyGradeOptions.join("")}
                            </select>
                        </td>
                    </tr>
                    <tr>
                        <th>Augment By</th>
                        <td>
                            <input type="number" id="txtFirstCharacterAugment" name="txtFirstCharacterAugment" value="0" step="1">
                        </td>
                        <td>
                            <input type="number" id="txtSecondCharacterAugment" name="txtSecondCharacterAugment" value="0" step="1">
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

                const firstCharacterSkill = firstCharacterSkillArray.filter(skill => skill.name === html.find(`[id="firstCharacterSkillToRoll"]`).val())[0];
                const secondCharacterSkill = secondCharacterSkillArray.filter(skill => skill.name === html.find(`[id="secondCharacterSkillToRoll"]`).val())[0];
                const firstCharacterDifficulty = html.find(`[id=firstCharacterDifficulty]`).val();
                const secondCharacterDifficulty = html.find(`[id=secondCharacterDifficulty]`).val();
                const firstCharacterAugment = html.find(`[id=txtFirstCharacterAugment]`).val();                
                const secondCharacterAugment = html.find(`[id=txtSecondCharacterAugment]`).val();

                let firstCharacterDiffMult = 1;
                switch (firstCharacterDifficulty) {
                    case `Very Easy`:
                        firstCharacterDiffMult = 2;
                        break;
                    case `Easy`:
                        firstCharacterDiffMult = 1.5;
                        break;
                    case `Standard`:
                        firstCharacterDiffMult = 1;
                        break;
                    case `Hard`:
                        firstCharacterDiffMult = 2/3;
                        break;
                    case `Formidable`:
                        firstCharacterDiffMult = 0.5;
                        break;
                    case `Herculean`:
                        firstCharacterDiffMult = 0.1;
                        break;                    
                }

                let secondCharacterDiffMult = 1;
                switch (secondCharacterDifficulty) {
                    case `Very Easy`:
                        secondCharacterDiffMult = 2;
                        break;
                    case `Easy`:
                        secondCharacterDiffMult = 1.5;
                        break;
                    case `Standard`:
                        secondCharacterDiffMult = 1;
                        break;
                    case `Hard`:
                        secondCharacterDiffMult = 2/3;
                        break;
                    case `Formidable`:
                        secondCharacterDiffMult = 0.5;
                        break;
                    case `Herculean`:
                        secondCharacterDiffMult = 0.1;
                        break;                    
                }

                let firstCharacterSkillRollValue = firstCharacterDiffMult * (Number(firstCharacterSkill.totalVal) + Number(firstCharacterAugment));
                let secondCharacterSkillRollValue = secondCharacterDiffMult * (Number(secondCharacterSkill.totalVal) + Number(secondCharacterAugment));

                if (firstCharacterSkillRollValue > 100 || secondCharacterSkillRollValue > 100) {
                    let skillValueToSubtract = (firstCharacterSkillRollValue > secondCharacterSkillRollValue) ? (100 - firstCharacterSkillRollValue) : (100 - secondCharacterSkillRollValue);
                    firstCharacterSkillRollValue -= skillValueToSubtract;
                    secondCharacterSkillRollValue -= skillValueToSubtract;
                }

                let firstCharacterDiceRoll = new Roll("1d100");
                let secondCharacterDiceRoll = new Roll("1d100");
                await firstCharacterDiceRoll.evaluate();
                await secondCharacterDiceRoll.evaluate();
                
                const result = {
                    FUMBLE: 0,
                    FAILURE: 1,
                    SUCCESS: 2,
                    CRITICAL: 3
                }
                let firstCharacterResultLabel = ``;
                let firstCharacterResult = result.FAILURE;
                let secondCharacterResultLabel = ``;
                let secondCharacterResult = result.FAILURE;

                if (firstCharacterDiceRoll.result <= firstCharacterSkillRollValue * 0.1){
                    firstCharacterResult = result.CRITICAL;
                    firstCharacterResultLabel = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                } else if (firstCharacterDiceRoll.result == 99 || firstCharacterDiceRoll.result == 100){
                    firstCharacterResult = result.FUMBLE;
                    firstCharacterResultLabel = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                } else if ((firstCharacterDiceRoll.result <= firstCharacterSkillRollValue && firstCharacterDiceRoll.result < 96) || (firstCharacterDiceRoll.result <= 5 && firstCharacterDiceRoll.result > firstCharacterSkillRollValue)){
                    firstCharacterResult = result.SUCCESS;
                    firstCharacterResultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                } else if (firstCharacterDiceRoll.result > firstCharacterSkillRollValue && firstCharacterDiceRoll.result > 5 || firstCharacterDiceRoll.result >= 96  && firstCharacterDiceRoll.result <= firstCharacterSkillRollValue){
                    firstCharacterResult = result.FAILURE;
                    firstCharacterResultLabel = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                }

                if (secondCharacterDiceRoll.result <= secondCharacterSkillRollValue * 0.1){
                    secondCharacterResult = result.CRITICAL;
                    secondCharacterResultLabel = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                } else if (secondCharacterDiceRoll.result == 99 || secondCharacterDiceRoll.result == 100){
                    secondCharacterResult = result.FUMBLE;
                    secondCharacterResultLabel = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                } else if ((secondCharacterDiceRoll.result <= secondCharacterSkillRollValue && secondCharacterDiceRoll.result < 96) || (secondCharacterDiceRoll.result <= 5 && secondCharacterDiceRoll.result > secondCharacterSkillRollValue)){
                    secondCharacterResult = result.SUCCESS;
                    secondCharacterResultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                } else if (secondCharacterDiceRoll.result > secondCharacterSkillRollValue && secondCharacterDiceRoll.result > 5 || secondCharacterDiceRoll.result >= 96  && secondCharacterDiceRoll.result <= secondCharacterSkillRollValue){
                    secondCharacterResult = result.FAILURE;
                    secondCharacterResultLabel = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                }

                let opposedRollWinner = ``;
                const levelsOfSuccess = Math.abs(firstCharacterResult - secondCharacterResult);

                const firstCharacterTag = `@UUID[${firstCharacter.uuid}]{${firstCharacter.name}}`;
                const secondCharacterTag = `@UUID[${secondCharacter.uuid}]{${secondCharacter.name}}`;

                if (firstCharacterResult == secondCharacterResult) {
                    if (firstCharacterResult < result.SUCCESS || firstCharacterDiceRoll.result == secondCharacterDiceRoll.result) {
                        opposedRollWinner = `None`;
                    } else if (firstCharacterDiceRoll.result > secondCharacterDiceRoll.result) {
                        opposedRollWinner = firstCharacterTag;
                    } else if (firstCharacterDiceRoll.result < secondCharacterDiceRoll.result) {
                        opposedRollWinner = secondCharacterTag;
                    }
                } else if (firstCharacterResult > secondCharacterResult) {
                    opposedRollWinner = firstCharacterTag;
                } else {
                    opposedRollWinner = secondCharacterTag;
                }

                
                let flavortext = `Contested Roll between ${firstCharacter.name} and ${secondCharacter.name}.`;

                contentString = `
                <table class="contested-roll-table">
                <thead>
                    <tr style="color:black;text-shadow:none">
                        <th></th>
                        <th>${firstCharacterTag}</th>
                        <th>${secondCharacterTag}</th>
                    </tr>
                </thead>
                <tbody>
                    <colgroup>
                        <col style="width:40%">
                        <col style="width:30%">
                        <col style="width:30%">
                    </colgroup>
                    <tr>
                        <th>Skill</th>
                        <td>${firstCharacterSkill.name}</td>
                        <td>${secondCharacterSkill.name}</td>
                    </tr>
                    <tr>
                        <th>Difficulty</th>
                        <td>${firstCharacterDifficulty}</td>
                        <td>${secondCharacterDifficulty}</td>
                    </tr>
                    <tr>
                        <th>Skill %</th>
                        <td>${firstCharacterSkill.totalVal}%</td>
                        <td>${secondCharacterSkill.totalVal}%</td>
                    </tr>
                    <tr>
                        <th>Augment By</th>
                        <td>${firstCharacterAugment}%</td>
                        <td>${secondCharacterAugment}%</td>
                    </tr>
                    <!--<tr>
                        <th>Roll</th>
                        <td>[[${firstCharacterDiceRoll.result}]]</td>
                        <td>[[${secondCharacterDiceRoll.result}]]</td>
                    </tr>-->
                    <tr>
                        <th>Result</th>
                        <td>${firstCharacterResultLabel}</td>
                        <td>${secondCharacterResultLabel}</td>
                    </tr>
                    <tr style="border-top:1px black solid">
                        <th>Opposed Roll Winner</th>
                        <td colspan="2" style="text-align:center">${opposedRollWinner}</td>
                    </tr>
                    <tr>
                        <th>Levels of Success</th>
                        <td colspan="2" style="text-align:center">${levelsOfSuccess}</td>
                    </tr>
                </tbody>
                </table>`;

                ChatMessage.create({
                    type: CONST.CHAT_MESSAGE_TYPES.ROLL,
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker({ token: token }),
                    flavor: flavortext,
                    content: contentString
                });
            }
        },
        two: {
            label: "Cancel",
            callback: html => console.log("Cancelled")
        }
    },
    default: "one",
    close: html => console.log()
}, {width: 600, resizable: true});

d.render(true);