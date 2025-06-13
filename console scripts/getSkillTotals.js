/**
 * This script is intended to be run in the Foundry VTT console. Its output is printed into the console in Markdown.
 * The purpose of the script is to output the name, characteristics, and skill values of all of the selected tokens. It also provides a total of the skill values.
 * The main reason the script was created was to gauge the disparity between the characteristics and skill totals of the player characters.
 * 
 * Written on 2025-06-04
 * Written by Angry Gorilla
 */

let outputString = `_As of ${new Date().toLocaleDateString('en-CA')}_
`;

let tokens = canvas.tokens.controlled.sort((a, b) => a.actor.system.playerName.localeCompare(b.actor.system.playerName));

for (const token of tokens) {
    let character = token.actor;
    // BIO
    let bioString = ``;
    
    bioString += `
# ${character.name}`;

    outputString += bioString;

    // CHARACTERISTICS
    let characteristicsString = ``;
    let characteristics = character.system.characteristics;
    let characteristicsTotal = Object.values(characteristics).reduce((a, c) => a + +c.value, 0);
    let characteristicsModTotal = Object.values(characteristics).reduce((a, c) => a + +c.mod, 0);

    characteristicsString += `
## Characteristics

| **Characteristic** | **Value** | **Modifier** |
| --- | --- | --- |
| **Strength** | ${characteristics.str.value} | ${characteristics.str.mod} |
| **Constitution** | ${characteristics.con.value} | ${characteristics.con.mod} |
| **Size** | ${characteristics.siz.value} | ${characteristics.siz.mod} |
| **Dexterity** | ${characteristics.dex.value} | ${characteristics.dex.mod} |
| **Intelligence** | ${characteristics.int.value} | ${characteristics.int.mod} |
| **Power** | ${characteristics.pow.value} | ${characteristics.pow.mod} |
| **Charisma** | ${characteristics.cha.value} | ${characteristics.cha.mod} |
| **Total** | **${characteristicsTotal}** | **${characteristicsModTotal}** |`;

    outputString += characteristicsString;
    
    // SKILLS
    let skillsString = ``
    let trainingTotal = 0;
    let miscTotal = 0;
    let skillTotal = 0;

    let standardSkills = character.itemTypes.standardSkill.sort((a, b) => a.name.localeCompare(b.name));
    let professionalSkills = character.itemTypes.professionalSkill.sort((a, b) => a.name.localeCompare(b.name));
    let magicSkills = character.itemTypes.magicSkill.sort((a, b) => a.name.localeCompare(b.name));
    let combatStyles = character.itemTypes.combatStyle.sort((a, b) => a.name.localeCompare(b.name));

    skillsString += `
## Skills
#### Standard Skills

| **Skill Name** | **Training (%)** | **Misc (%)** | **Skill (%)** |
| --- | --- | --- | --- |`;
    for (const skill of standardSkills) {
        trainingTotal += parseInt(skill.system.trainingVal);
        miscTotal += parseInt(skill.system.miscBonus);
        skillTotal += parseInt(skill.totalVal);
        skillsString +=`
| **${skill.name}** | ${skill.system.trainingVal} | ${skill.system.miscBonus} | ${skill.totalVal} |`;
    }

    skillsString += `
#### Professional Skills

| **Skill** | **Training (%)** | **Misc (%)** | **Skill (%)** |
| --- | --- | --- | --- |`;
    for (const skill of professionalSkills) {
        trainingTotal += parseInt(skill.system.trainingVal);
        miscTotal += parseInt(skill.system.miscBonus);
        skillTotal += parseInt(skill.totalVal);
        skillsString +=`
| **${skill.name}** | ${skill.system.trainingVal} | ${skill.system.miscBonus} | ${skill.totalVal} |`;
    }

    skillsString += `
#### Combat Styles

| **Skill** | **Training (%)** | **Misc (%)** | **Skill (%)** |
| --- | --- | --- | --- |`;
    for (const skill of combatStyles) {
        trainingTotal += parseInt(skill.system.trainingVal);
        miscTotal += parseInt(skill.system.miscBonus);
        skillTotal += parseInt(skill.totalVal);
        skillsString +=`
| **${skill.name}** | ${skill.system.trainingVal} | ${skill.system.miscBonus} | ${skill.totalVal} |`;
    }

    if (!!magicSkills.length) {
        skillsString += `
#### Magic Skills

| **Skill** | **Training (%)** | **Misc (%)** | **Skill (%)** |
| --- | --- | --- | --- |`;
        for (const skill of magicSkills) {
            trainingTotal += parseInt(skill.system.trainingVal);
            miscTotal += parseInt(skill.system.miscBonus);
        skillTotal += parseInt(skill.totalVal);
            skillsString +=`
| **${skill.name}** | ${skill.system.trainingVal} | ${skill.system.miscBonus} | ${skill.totalVal} |`;
        }
    }

    skillsString += `
#### Total Sums

| **Sum of** | **Value** |
| --- | --- |
| **Training (%)** | ${trainingTotal} |
| **Misc (%)** | ${miscTotal} |
| **Skill (%)** | ${skillTotal} |
`;

    outputString += skillsString;
}
console.log(outputString);