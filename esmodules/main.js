// main.js
// Tested on Foundry v13 (Mythras Round-Based Fatigue Tracker)

// Register toggleable settings when Foundry initializes
Hooks.once("init", () => {
    game.settings.register("mythras-angrygorillas-custom-macros", "enableBleedingFatigue", {
        name: "Bleeding Fatigue Progression",
        hint: "Automatically degrades a character's fatigue level by one step at the start of each combat round if they have the bleeding status effect.",
        scope: "world", // World scope ensures it applies globally for all players managed by the GM
        config: true,   // true makes it show up in the Configure Settings menu
        type: Boolean,  // Defines it as a toggle switch
        default: true  // Default state when first installed
    });
    game.settings.register("mythras-angrygorillas-custom-macros", "enableWoundsIntegrationWithConditionLab", {
        name: "Wounds Integration with Condition Lab",
        hint: "Integrates wound tracking with the Condition Lab module for enhanced visual feedback. This requires having individual custom statuses for each wound and hit location combination in the Condition Lab module. The expected format is as follows: [Wound Name] - [Hit Location]. (e.g. Serious Wound - Right Arm). This setting is only relevant if you have the Condition Lab module installed and active.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register("mythras-angrygorillas-custom-macros", "enableHoldingLocations", {
        name: "Holding Locations",
        hint: "Adds an option to weapon sheets to hold weapons with specific hit locations.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
});

Hooks.on('renderChatMessage', async (app, html, data) => {
  const messageDoc = game.messages.find(i => i.id == html[0].dataset.messageId);
  if (!messageDoc) return;

  // -- 1. Existing Damage Application Logic --
  let chatButtons = [...html[0].querySelectorAll('.submit-damage')];
  let revealButton = html[0].querySelector(".viewDamage");
  let damageElement = html[0].querySelector(".damageElement");
  const isClicked = messageDoc.getFlag('mythras-angrygorillas-custom-macros', 'damage-applied');
  
  if (revealButton && damageElement) {
    if (isClicked) {
      revealButton.innerHTML = "Damage applied";
      revealButton.classList.add('damage-applied');
    }
    revealButton.addEventListener("click", function viewDamage() {
      if (!messageDoc.getFlag('mythras-angrygorillas-custom-macros', 'damage-applied')) {
        damageElement.classList.toggle('revealed');
      }
    });
  }

  // Handle damage buttons if they exist
  if (chatButtons.length > 0) {
    
    async function administerDamage(damageButton, overrideArmor = null) {
      if (!game.user.isGM) return;
      
      const targetTokenId = damageButton.dataset.targetToken;
      const targetToken = canvas.tokens.get(targetTokenId) || game.scenes.current?.tokens.get(targetTokenId);
      const targetActor = targetToken?.actor;
      const hitLocationId = damageButton.dataset.hitLocationId;
      
      if (!targetActor || !hitLocationId) {
        return ui.notifications.warn("Target token or hit location not found for damage application.");
      }

      let hitLocation = targetActor.items.get(hitLocationId);
      if (!hitLocation) {
        return ui.notifications.warn("Hit location item not found on target actor.");
      }

      let rawDamage = Number(damageButton.dataset.damage) || 0;
      let armorPoints = overrideArmor !== null ? overrideArmor : (Number(damageButton.dataset.armor) || 0);
      let naturalArmor = overrideArmor !== null ? 0 : (Number(damageButton.dataset.naturalArmor) || 0);
      let maxAp = Math.max(armorPoints, naturalArmor);
      
      let armorMitigatedDamage = Math.max(0, rawDamage - maxAp);
      let currentHp = hitLocation.system.currentHp ?? hitLocation.system.hp?.value ?? 0;
      let updatedHp = currentHp - armorMitigatedDamage;

      // Update HP on the embedded hit location item (allowing negative HP)
      await targetActor.updateEmbeddedDocuments("Item", [{
        _id: hitLocationId,
        "system.currentHp": updatedHp
      }]);

      // Set flag so message locks / shows applied
      await messageDoc.setFlag('mythras-angrygorillas-custom-macros', 'damage-applied', true);

      // Post damage details to chat with the attacker as the speaker
      let targetName = damageButton.dataset.targetName || targetToken.name || "Target";
      let hitLocName = damageButton.dataset.hitLocationName || hitLocation.name || "Hit Location";
      let weaponName = damageButton.dataset.weaponName || "Weapon";

      let content = `
        <h3 style="border-bottom: 2px solid var(--color-border-dark-tertiary); margin-bottom: 4px;">Damage Applied</h3>
        <p><strong>Target:</strong> ${targetName} (${hitLocName})</p>
        <p><strong>Weapon:</strong> ${weaponName} (Rolled: ${rawDamage} dmg)</p>
        <p><strong>Armor Mitigated:</strong> ${maxAp} AP</p>
        <p><strong>Damage Applied:</strong> <span style="color: darkred; font-weight: bold;">${armorMitigatedDamage}</span> HP</p>
        <p><em>${hitLocName} current HP: ${updatedHp}</em></p>
      `;

      ChatMessage.create({
        speaker: messageDoc.speaker,
        content: content
      });

      // Update UI buttons in the chat card immediately
      chatButtons.forEach(btn => {
        btn.classList.add('damage-applied');
        btn.disabled = true;
      });
      if (revealButton) {
        revealButton.innerHTML = "Damage applied";
        revealButton.classList.add('damage-applied');
      }
    }

    for (let damageButton of chatButtons) {
      if (damageButton) {
        if (isClicked) {
          damageButton.classList.add('damage-applied');
          damageButton.disabled = true;
        }

        let buttonClass = damageButton.classList[0];

        switch (buttonClass) {
          case 'simple-damage':
            if (!isClicked) {
              damageButton.addEventListener("click", () => administerDamage(damageButton), { once: true });
            }
            break;
          case 'bypass-armor':
            if (!isClicked) {
              damageButton.addEventListener("click", () => administerDamage(damageButton, 0), { once: true });
            }
            break;
          case 'choose-location':
            if (!isClicked) {
              damageButton.addEventListener("click", async () => {
                if (!game.user.isGM) return;
                const targetTokenId = damageButton.dataset.targetToken;
                const targetToken = canvas.tokens.get(targetTokenId) || game.scenes.current?.tokens.get(targetTokenId);
                const targetActor = targetToken?.actor;
                if (!targetActor) return ui.notifications.warn("Target actor not found.");

                const hitLocations = targetActor.items.filter(loc => (loc.system?.rollRangeStart !== undefined) || (loc.rollRangeStart !== undefined));
                if (hitLocations.length === 0) return ui.notifications.warn("No hit locations found on target.");

                const options = hitLocations.map(loc => `<option value="${loc.id}">${loc.name} (${loc.system?.rollRangeStart ?? loc.rollRangeStart}-${loc.system?.rollRangeEnd ?? loc.rollRangeEnd})</option>`).join('');

                new Dialog({
                  title: "Choose Hit Location",
                  content: `<form><table style="width:100%;"><tr><th>Location</th><td><select id="chosenLocId" style="width:100%;">${options}</select></td></tr></table></form>`,
                  buttons: {
                    apply: {
                      label: "Apply Damage",
                      callback: async (html) => {
                        const chosenId = html.find('#chosenLocId').val();
                        const chosenLoc = targetActor.items.get(chosenId);
                        if (!chosenLoc) return;

                        const equippedArmorAp = chosenLoc.equippedArmor ? chosenLoc.equippedArmor.map(a => a.ap).reduce((p, c) => p + c, 0) : 0;
                        
                        damageButton.dataset.hitLocationId = chosenLoc.id;
                        damageButton.dataset.hitLocationName = chosenLoc.name;
                        damageButton.dataset.armor = equippedArmorAp;
                        damageButton.dataset.naturalArmor = chosenLoc.naturalArmor || 0;

                        await administerDamage(damageButton);
                      }
                    },
                    cancel: { label: "Cancel" }
                  },
                  default: "apply"
                }).render(true);
              }, { once: true });
            }
            break;
          case 'impale':
            if (!isClicked) {
              damageButton.addEventListener("click", async () => {
                let secondRoll = new Roll(damageButton.dataset.damageFormula);
                await secondRoll.evaluate();
                let originalDamage = Number(damageButton.dataset.damage) || 0;
                let impaleDamage = Math.max(originalDamage, secondRoll.total);
                
                damageButton.dataset.damage = impaleDamage;
                await administerDamage(damageButton);

                ChatMessage.create({
                  speaker: messageDoc.speaker,
                  rolls: [secondRoll],
                  content: `<p><strong>Impale Extra Damage Roll:</strong> [[${secondRoll.total}]] (Max damage used: ${impaleDamage})</p>`
                });
              }, { once: true });
            }
            break;
        }
        if (!game.user.isGM) damageButton.style.display = 'none';
      }
    }
  }

  // -- 2. Parry, Evade, and Contest Button Listeners --
  let parryBtn = html[0].querySelector('.parry-button');
  let evadeBtn = html[0].querySelector('.evade-button');
  let contestBtn = html[0].querySelector('.contest-button');

  if (parryBtn) parryBtn.addEventListener('click', () => handleParryDialog(parryBtn.dataset.attackerRange, parryBtn.dataset.attackerSize, parryBtn.dataset.attackerResult, parryBtn.dataset.attackerName));
  if (evadeBtn) evadeBtn.addEventListener('click', () => handleEvadeDialog(evadeBtn.dataset.attackerResult, evadeBtn.dataset.attackerName));

  if (contestBtn) {
    contestBtn.addEventListener('click', () => {
      const controlled = canvas.tokens.controlled;
      if (controlled.length !== 1) {
        return ui.notifications.warn("Please select exactly one token to contest the roll.");
      }

      const defenderActor = controlled[0].actor;
      const defenderSheet = defenderActor.sheet;

      if (!defenderActor) return ui.notifications.warn("Selected token has no actor.");

      // Find a valid skill to initiate the contest roll
      const defaultSkill = defenderActor.items.contents.filter(i => ["standardSkill", "professionalSkill", "combatStyle", "passion", "magicSkill"].includes(i.type)).sort((a, b) => a.name.localeCompare(b.name))[0];

      if (!defaultSkill) {
        return ui.notifications.warn("No selectable skills found on the defending token.");
      }

      const attackerActorId = contestBtn.dataset.attackerActorId;
      // Fallback check if it's an unlinked synthetic token
      const attackerActor = game.actors.get(attackerActorId) || canvas.tokens.placeables.find(t => t.actor?.id === attackerActorId)?.actor;
      const attackerSkillId = contestBtn.dataset.attackerSkillId;
      const attackerSkill = attackerActor?.items.get(attackerSkillId);
      
      const contestedScore = Number(contestBtn.dataset.attackerScore);
      const contestedSuccess = contestBtn.dataset.attackerResult;
      const contestedRollDifficulty = Number(contestBtn.dataset.attackerDiff);
      const contestedRollAugmentation = contestBtn.dataset.attackerAug;

      if (defenderSheet && typeof defenderSheet.handleSkillRoll === 'function') {
        defenderSheet.handleSkillRoll(defaultSkill, {
          contestedActor: attackerActor,
          contestedSkill: attackerSkill,
          contestedScore: contestedScore,
          contestedSuccess: contestedSuccess,
          contestedRollDifficulty: contestedRollDifficulty,
          contestedRollAugmentation: contestedRollAugmentation || undefined
        });
      } else {
        ui.notifications.warn("Contest roll not supported on this sheet. Ensure you are using the Mythras system.");
      }
    });
  }

  // -- 3. Special Effects Button Listeners --
  let sfButtons = html[0].querySelectorAll('.special-effects-btn');
  sfButtons.forEach(btn => btn.addEventListener('click', () => renderSpecialEffectsDialog(btn.dataset.winner, btn.dataset.effects)));

  // -- 4. Fatigue Endurance Roll Handler --
  let enduranceBtn = html[0].querySelector('.roll-endurance-btn');
  if (enduranceBtn) {
    enduranceBtn.addEventListener('click', async () => {
      if (!game.user.isGM) return;
      const actorId = enduranceBtn.dataset.actorId;
      const actor = game.actors.get(actorId) || canvas.tokens.controlled.find(t => t.actor?.id === actorId)?.actor;
      if (!actor) return ui.notifications.warn("Actor not found for Endurance roll.");

      const enduranceSkill = actor.items.find(i => i.name.toLowerCase() === "endurance" && i.type === "standardSkill");
      if (!enduranceSkill) return ui.notifications.warn(`${actor.name} does not have the Endurance skill.`);

      let baseSkillVal = enduranceSkill.totalVal || enduranceSkill.system?.totalVal || 50;

      // Fetch Native Roll Modifiers
      let modText = "No Penalties";
      let isModTextVisible = false;
      if (enduranceSkill && actor.sheet?.roller?.getSkillRollModifiers) {
          try {
              const modifiersList = actor.sheet.roller.getSkillRollModifiers(enduranceSkill);
              if (modifiersList && modifiersList.length > 0) {
                  modText = modifiersList.map(m => `<strong>${m.name}:</strong><br/> ${m.value}`).join('<br/>');
                  isModTextVisible = true;
              }
          } catch(e) {
              console.warn("Could not retrieve roll modifiers", e);
          }
      }

      let modHtml = isModTextVisible ? `
      <div style="margin-bottom: 10px;">
          <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: darkred; font-weight: bold;">
              Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
          </span>
      </div>` : "";

      new Dialog({
        title: `Endurance Roll - ${actor.name}`,
        content: `
            ${modHtml}
            <table style="width: 100%; text-align: left;">
                <tr><th>Difficulty</th>
                    <td><select id="enduranceDiff" style="width: 100%;">
                        <option value="2">Very Easy</option><option value="1.5">Easy</option><option value="1" selected>Standard</option>
                        <option value="0.67">Hard</option><option value="0.5">Formidable</option><option value="0.1">Herculean</option>
                    </select></td>
                </tr>
            </table>`,
        buttons: {
            roll: {
                label: "Roll Endurance",
                callback: async (html) => {
                    const diffMult = Number(html.find('#enduranceDiff').val());
                    let skillVal = Math.ceil(baseSkillVal * diffMult);

                    let roll = new Roll("1d100");
                    await roll.evaluate();

                    let resultLabel = "Failure";
                    let formattedResult = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                    if (roll.result <= Math.ceil(skillVal * 0.1)) {
                        resultLabel = "Critical";
                        formattedResult = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                    } else if (roll.result == 99 || roll.result == 100) {
                        resultLabel = "Fumble";
                        formattedResult = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                    } else if (roll.result <= skillVal) {
                        resultLabel = "Success";
                        formattedResult = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                    }

                    let diffText = "Standard";
                    switch(String(diffMult)) {
                        case "2": diffText = "Very Easy"; break;
                        case "1.5": diffText = "Easy"; break;
                        case "1": diffText = "Standard"; break;
                        case "0.67": diffText = "Hard"; break;
                        case "0.5": diffText = "Formidable"; break;
                        case "0.1": diffText = "Herculean"; break;
                    }

                    let chatModHtml = isModTextVisible ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: darkred; font-weight: bold;">
                            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>` : "";

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ actor: actor }),
                        flavor: `${actor.name} rolls Endurance for fatigue check.`,
                        content: `${chatModHtml}<p style="text-align: center; font-size: 1.1em;"><strong>Endurance Roll (${diffText}):</strong> [[${roll.result}]] vs ${skillVal}% (${formattedResult})</p>`,
                        rolls: [roll]
                    });

                    // Reset completed rounds and clear prompted state for this specific combatant
                    const combat = game.combat;
                    if (combat) {
                        const combatant = combat.combatants.contents.find(c => c.actor?.id === actorId);
                        if (combatant) {
                            await combatant.setFlag("world", "completedRounds", 0);
                            await combatant.setFlag("world", "promptedThisRound", false);
                        }
                    }

                    enduranceBtn.disabled = true;
                    enduranceBtn.innerText = "Rolled";
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "roll"
    }).render(true);

    }, { once: true });
  }
});

// Helper Function: Calculate Differential Success
function calculateDifferentialSuccess(attackerResult, defenderResult) {
    const successValues = { "Critical": 3, "Success": 2, "Failure": 1, "Fumble": 0 };
    const atkVal = successValues[attackerResult] || 1;
    const defVal = successValues[defenderResult] || 1;
    
    let diff = atkVal - defVal;
    let winner = diff > 0 ? "attacker" : (diff < 0 ? "defender" : "none");
    let count = Math.abs(diff);

    return { winner, count, atkVal, defVal };
}

// -- Parry Dialog --
function handleParryDialog(attackerRange, attackerSize, attackerResult, attackerName = "Attacker") {
    const controlled = canvas.tokens.controlled[0];
    if (!controlled) return ui.notifications.warn("Please select a token to parry with.");

    const skillArray = controlled.actor.items.filter(skill => skill.type === "combatStyle" || (skill.type === "standardSkill" && skill.name.toLowerCase() === "unarmed"));
    const weaponArray = controlled.actor.items.filter(weapon => weapon.type === "melee-weapon" || weapon.type === "shield");
    const augArray = controlled.actor.items.filter(skill => 
        skill.type === "standardSkill" ||
        skill.type === "professionalSkill" ||
        skill.type === "combatStyle" ||
        skill.type === "magicSkill" ||
        skill.type === "passion");

    const skillOptions = skillArray.map(i => `<option value="${i.id}">${i.name}</option>`);
    const weaponOptions = weaponArray.map(i => `<option value="${i.id}">${i.name}</option>`);
    const augOptions = augArray.map(i => `<option>${i.name}</option>`);

    // Fetch Native Roll Modifiers for the default selected style
    const initialStyle = skillArray.length > 0 ? skillArray[0] : null;
    let modText = "No Penalties";
    let isModTextVisible = false;

    if (initialStyle && controlled.actor?.sheet?.roller?.getSkillRollModifiers) {
        try {
            const modifiersList = controlled.actor.sheet.roller.getSkillRollModifiers(initialStyle);
            if (modifiersList && modifiersList.length > 0) {
                modText = modifiersList.map(m => `<strong>${m.name}:</strong><br/> ${m.value}`).join('<br/>');
                isModTextVisible = true;
            }
        } catch(e) {
            console.warn("Could not retrieve roll modifiers", e);
        }
    }

    let modHtml = isModTextVisible ? `
    <div style="margin-bottom: 10px;">
        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: darkred; font-weight: bold;">
            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
        </span>
    </div>` : "";

    const dialogContent = `
        <div style="margin-bottom: 10px;">
            <p><strong>Attacker's Range:</strong> ${attackerRange} | <strong>Size:</strong> ${attackerSize}</p>
            <p><strong>Attacker's Result:</strong> ${attackerResult}</p>
        </div>
        <hr>
        ${modHtml}
        <div style="margin-bottom: 10px;">
            <label><input type="checkbox" id="doNotParry"> <strong>Do Not Parry (Grant Auto Success)</strong></label>
        </div>
        <table style="width: 100%; text-align: left;">
            <tr><th>Difficulty</th>
                <td><select id="parryDiff" style="width: 100%;">
                    <option value="2">Very Easy</option><option value="1.5">Easy</option><option value="1" selected>Standard</option>
                    <option value="0.67">Hard</option><option value="0.5">Formidable</option><option value="0.1">Herculean</option>
                </select></td>
            </tr>
            <tr><th>Combat Style</th><td><select id="parryStyle" style="width: 100%;">${skillOptions.join("")}</select></td></tr>
            <tr><th>Weapon/Shield</th><td><select id="parryWeapon" style="width: 100%;">${weaponOptions.join("")}</select></td></tr>
            <tr>
                <th>Augment combat style?</th>
                <td><input type="checkbox" id="parryAugment"></td>
            </tr>
            <tr>
                <th>Augment with</th>
                <td><select id="parryAugSkill" style="width: 100%;">${augOptions.join("")}</select></td>
            </tr>
            <tr>
                <th>Custom Augment Value:</th>
                <td><input type="number" value="0" id="parryCustomAugment" style="width: 100%; text-align: center;"></td>
            </tr>
        </table>
    `;

    new Dialog({
        title: `Parry - ${controlled.name}`,
        content: dialogContent,
        buttons: {
            roll: {
                label: "Roll Parry",
                callback: async (html) => {
                    const doNotParry = html.find('#doNotParry').is(':checked');
                    if (doNotParry) {
                        const diffObj = calculateDifferentialSuccess(attackerResult, "Failure");
                        return ChatMessage.create({
                            speaker: ChatMessage.getSpeaker({ token: controlled.document }),
                            content: `<h3>Parry Forfeited</h3><p>Defender chose not to parry.</p>
                            <p><strong>Winner:</strong> Attacker gets ${diffObj.count} Special Effect(s).</p>
                            <button class="special-effects-btn" data-winner="attacker" data-effects="${diffObj.count}">Special Effects</button>`
                        });
                    }

                    const actor = controlled.actor;
                    let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
                    if (currentAP === undefined) {
                        currentAP = foundry.utils.getProperty(actor, "system.currentActionPoints") ?? 0;
                    }
                    currentAP = Number(currentAP);

                    if (currentAP <= 0) {
                        ui.notifications.info(`${controlled.name} has no Action Points left to parry!`);
                        return;
                    }

                    const newAP = currentAP - 1;
                    await actor.update({ 
                        "system.trackedStats.actionPoints.value": String(newAP),
                        "system.currentActionPoints": newAP,
                        "system.attributes.actionPoints.value": newAP 
                    });

                    const styleId = html.find('#parryStyle').val();
                    const weaponId = html.find('#parryWeapon').val();
                    const diffMult = Number(html.find('#parryDiff').val());
                    const style = controlled.actor.items.get(styleId);
                    const weapon = controlled.actor.items.get(weaponId);

                    const cb = html.find('#parryAugment').is(':checked');
                    const augSkillName = html.find('#parryAugSkill').val();
                    const augSkill = controlled.actor.items.find(i => i.name === augSkillName);
                    const customValue = Number(html.find('#parryCustomAugment').val());

                    let styleName = style ? style.name : "Combat Style";
                    let weaponName = weapon ? weapon.name : (styleName.toLowerCase() === 'unarmed' ? "Unarmed" : "Weapon");
                    let weaponReach = weapon?.system?.reach || (styleName.toLowerCase() === 'unarmed' ? "Touch" : "Short");
                    let weaponSize = weapon?.system?.size || (styleName.toLowerCase() === 'unarmed' ? "Small" : "Medium");

                    let baseSkillVal = style.totalVal;
                    if (cb) {
                        if (customValue !== 0) baseSkillVal += customValue;
                        else baseSkillVal += Math.ceil(augSkill.totalVal * 0.2);
                    }

                    let skillVal = Math.ceil(baseSkillVal * diffMult);
                    let parryRoll = new Roll("1d100");
                    await parryRoll.evaluate();
                    
                    let resultLabel = "Failure";
                    let formattedResult = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                    if (parryRoll.result <= Math.ceil(skillVal * 0.1)) {
                        resultLabel = "Critical";
                        formattedResult = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                    } else if (parryRoll.result == 99 || parryRoll.result == 100) {
                        resultLabel = "Fumble";
                        formattedResult = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                    } else if (parryRoll.result <= skillVal) {
                        resultLabel = "Success";
                        formattedResult = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                    }

                    const diffObj = calculateDifferentialSuccess(attackerResult, resultLabel);
                    
                    let winnerText = diffObj.winner === "none" 
                        ? "<strong>Tie!</strong> No Special Effects awarded." 
                        : `<strong>Winner:</strong> <span style="text-transform:capitalize;">${diffObj.winner}</span> gets ${diffObj.count} Special Effect(s).`;

                    let sfButtonHTML = diffObj.winner !== "none" 
                        ? `<button class="special-effects-btn" data-winner="${diffObj.winner}" data-effects="${diffObj.count}" style="margin-top: 5px;">Special Effects</button>` 
                        : "";

                    let flavorText = `Defending against ${attackerName} with ${weaponName} using ${styleName}`;
                    let augString = '';
                    if (cb) {
                        let augVal = customValue !== 0 ? customValue : Math.ceil(augSkill.totalVal * 0.2);
                        let augLabel = customValue !== 0 ? "Custom" : augSkillName;
                        augString = ` (Augmented by ${augLabel}: +${augVal})`;
                        flavorText += augString;
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

                    let chatModHtml = isModTextVisible ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: darkred; font-weight: bold;">
                            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>` : "";

                    let content = `
                        <div style="font-size: 0.9em; margin-bottom: 5px; border-bottom: 1px solid var(--color-border-dark-tertiary); padding-bottom: 4px;">
                            <strong>Range:</strong> ${attackerRange} | <strong>Reach:</strong> ${weaponReach} | <strong>Size:</strong> ${weaponSize}
                        </div>
                        ${chatModHtml}
                        <p style="font-size: 1.1em; text-align: center; margin-bottom: 4px;">
                            <strong>Roll (${diffText}):</strong> [[${parryRoll.result}]] vs ${skillVal}% (${formattedResult})
                        </p>
                        <hr>
                        <p>${winnerText}</p>
                        ${sfButtonHTML}                        
                        <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${style.id}" data-attacker-score="${parryRoll.result}" data-attacker-result="${resultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}">Contest</button>
                    `;

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: controlled.document }),
                        flavor: flavorText,
                        content: content,
                        rolls: [parryRoll]
                    });
                }
            }
        },
        default: "roll",
        render: (html) => {
            const augmentCheckbox = html.find('#parryAugment');
            const augSkillRow = html.find('#parryAugSkill').closest('tr');
            const customAugRow = html.find('#parryCustomAugment').closest('tr');

            function updateVisibility() {
                if (augmentCheckbox.is(':checked')) {
                    augSkillRow.show();
                    customAugRow.show();
                } else {
                    augSkillRow.hide();
                    customAugRow.hide();
                }
            }
            augmentCheckbox.on('change', updateVisibility);
            updateVisibility();
        }
    }, { width: 425, height: 400, resizable: true }).render(true);
}

// -- Evade Dialog --
function handleEvadeDialog(attackerResult, attackerName = "Attacker") {
    const controlled = canvas.tokens.controlled[0];
    if (!controlled) return ui.notifications.warn("Please select a token to evade with.");

    const evadeSkill = controlled.actor.items.find(skill => skill.name.toLowerCase() === "evade");
    if (!evadeSkill) return ui.notifications.warn("Token does not have the Evade skill.");

    const augArray = controlled.actor.items.filter(skill => 
        skill.type === "standardSkill" ||
        skill.type === "professionalSkill" ||
        skill.type === "combatStyle" ||
        skill.type === "magicSkill" ||
        skill.type === "passion");
    const augOptions = augArray.map(i => `<option>${i.name}</option>`);

    // Fetch Native Roll Modifiers for Evade
    let modText = "No Penalties";
    let isModTextVisible = false;

    if (evadeSkill && controlled.actor?.sheet?.roller?.getSkillRollModifiers) {
        try {
            const modifiersList = controlled.actor.sheet.roller.getSkillRollModifiers(evadeSkill);
            if (modifiersList && modifiersList.length > 0) {
                modText = modifiersList.map(m => `<strong>${m.name}:</strong><br/> ${m.value}`).join('<br/>');
                isModTextVisible = true;
            }
        } catch(e) {
            console.warn("Could not retrieve roll modifiers", e);
        }
    }

    let modHtml = isModTextVisible ? `
    <div style="margin-bottom: 10px;">
        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: darkred; font-weight: bold;">
            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
        </span>
    </div>` : "";

    new Dialog({
        title: `Evade - ${controlled.name}`,
        content: `
            <p><strong>Attacker's Result:</strong> ${attackerResult}</p>
            ${modHtml}
            <table style="width: 100%; text-align: left;">
                <tr><th>Difficulty</th>
                    <td><select id="evadeDiff" style="width: 100%;">
                        <option value="2">Very Easy</option><option value="1.5">Easy</option><option value="1" selected>Standard</option>
                        <option value="0.67">Hard</option><option value="0.5">Formidable</option><option value="0.1">Herculean</option>
                    </select></td>
                </tr>
                <tr>
                    <th>Augment evade?</th>
                    <td><input type="checkbox" id="evadeAugment"></td>
                </tr>
                <tr>
                    <th>Augment with</th>
                    <td><select id="evadeAugSkill" style="width: 100%;">${augOptions.join("")}</select></td>
                </tr>
                <tr>
                    <th>Custom Augment Value:</th>
                    <td><input type="number" value="0" id="evadeCustomAugment" style="width: 100%; text-align: center;"></td>
                </tr>
            </table>`,
        buttons: {
            roll: {
                label: "Roll Evade",
                callback: async (html) => {
                    const diffMult = Number(html.find('#evadeDiff').val());
                    
                    const cb = html.find('#evadeAugment').is(':checked');
                    const augSkillName = html.find('#evadeAugSkill').val();
                    const augSkill = controlled.actor.items.find(i => i.name === augSkillName);
                    const customValue = Number(html.find('#evadeCustomAugment').val());

                    let baseSkillVal = evadeSkill.totalVal;
                    if (cb) {
                        if (customValue !== 0) baseSkillVal += customValue;
                        else baseSkillVal += Math.ceil(augSkill.totalVal * 0.2);
                    }

                    let skillVal = Math.ceil(baseSkillVal * diffMult);

                    let evadeRoll = new Roll("1d100");
                    await evadeRoll.evaluate();
                    
                    let resultLabel = "Failure";
                    let formattedResult = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                    if (evadeRoll.result <= Math.ceil(skillVal * 0.1)) {
                        resultLabel = "Critical";
                        formattedResult = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                    } else if (evadeRoll.result == 99 || evadeRoll.result == 100) {
                        resultLabel = "Fumble";
                        formattedResult = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                    } else if (evadeRoll.result <= skillVal) {
                        resultLabel = "Success";
                        formattedResult = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                    }

                    const diffObj = calculateDifferentialSuccess(attackerResult, resultLabel);
                    
                    let flavorText = `Evading attack from ${attackerName}.`;
                    if (cb) {
                        let augVal = customValue !== 0 ? customValue : Math.ceil(augSkill.totalVal * 0.2);
                        let augLabel = customValue !== 0 ? "Custom" : augSkillName;
                        flavorText += ` (Augmented by ${augLabel}: +${augVal})`;
                    }

                    let diffText = "Standard";
                    switch(String(diffMult)) {
                        case "2": diffText = "Very Easy"; break;
                        case "1.5": diffText = "Easy"; break;
                        case "1": diffText = "Standard"; break;
                        case "0.67": diffText = "Hard"; break;
                        case "0.5": diffText = "Formidable"; break;
                        case "0.1": diffText = "Herculean"; break;
                    }

                    let chatModHtml = isModTextVisible ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: darkred; font-weight: bold;">
                            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>` : "";

                    let content = `
                    ${chatModHtml}
                    <p style="font-size: 1.1em; text-align: center; margin-bottom: 4px; margin-top: 4px;"><strong>Roll (${diffText}):</strong> [[${evadeRoll.result}]] vs ${skillVal}% (${formattedResult})</p>
                    `;

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: controlled.document }),
                        flavor: flavorText,
                        content: content,
                        rolls: [evadeRoll]
                    });
                }
            }
        },
        default: "roll",
        render: (html) => {
            const augmentCheckbox = html.find('#evadeAugment');
            const augSkillRow = html.find('#evadeAugSkill').closest('tr');
            const customAugRow = html.find('#evadeCustomAugment').closest('tr');

            function updateVisibility() {
                if (augmentCheckbox.is(':checked')) {
                    augSkillRow.show();
                    customAugRow.show();
                } else {
                    augSkillRow.hide();
                    customAugRow.hide();
                }
            }
            augmentCheckbox.on('change', updateVisibility);
            updateVisibility();
        }
    }, { width: 425, height: 400, resizable: true }).render(true);
}

// -- Special Effects Data & Filtering Rendering --
const specialEffectsData = {
  offensive: [
    { name: "Bash", tags: ["melee", "bludgeoning", "shield"], desc: `The attacker deliberately bashes the opponent off balance. How far the defender totters back or sideward depends on the weapon being used. Shields knock an opponent back one metre per for every two points of damage rolled (prior to any subtractions due to armour, parries, and so forth), whereas bludgeoning weapons knock back one metre per for every three points. Bashing works only on creatures up to twice the attacker's SIZ. If the recipient is forced backwards into an obstacle, then they must make a Hard Athletics or Acrobatics skill roll to avoid falling or tripping over.` },
    { name: "Bleed", tags: ["melee", "cutting"], desc: `The attacker can attempt to cut open a major blood vessel. If the blow overcomes Armour Points and injures the target, the defender must make an opposed roll of Endurance against the original attack roll. If the defender fails, then they begin to bleed profusely. At the start of each Combat Round the recipient loses one level of Fatigue, until they collapse and possibly die. Bleeding wounds can be staunched by passing a First Aid skill roll, but the recipient can no longer perform any strenuous or violent action without re-opening the wound.` },
    { name: "Bypass Armour", tags: ["critical", "stackable", "melee", "ranged"], desc: `On a critical the attacker finds a gap in the defender's natural or worn armour. If the defender is wearing armour above natural protection, then the attacker must decide which of the two is bypassed. This effect can be stacked to bypass both. For the purposes of this effect, physical protection gained from magic is considered as being worn armour.` },
    { name: "Choose Location", tags: ["melee", "ranged"], desc: `When using hand-to-hand melee weapons the attacker may freely select the location where the blow lands, as long as that location is normally within reach. If using ranged weapons Choose Location is a Critical Success only, unless the target is within close range, and is either stationary or unaware of the attacker.` },
    { name: "Circumvent Cover", tags: ["critical", "ranged"], desc: `Assuming that the shooter is using some high-tech weaponry, they can fire around the target's cover. In most cases this will require something along the lines of self guided ammunition. If used as a trick shot, for example bouncing a laser blast off a mirror or ricocheting a bullet off a wall, then the special effect should be treated as a Critical Success only with a commensurate reduction in damage.` },
    { name: "Circumvent Parry", tags: ["critical", "melee", "ranged"], desc: `On a critical the attacker may completely bypass an otherwise successful parry.` },
    { name: "Close Range", tags: ["melee"], desc: `Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the shorter weapon.` },
    { name: "Compel Surrender", tags: ["melee", "ranged"], desc: `Allows the character a chance to force the surrender of a helpless or disadvantaged opponent; for example someone who has been disarmed, is lying prone unable to regain his footing, has suffered a serious (or worse) wound, and so on. Damage is not inflicted on the target, they are only threatened. Assuming the target is sapient and able to understand the demand, the target must make an opposed roll of Willpower against the original attack or parry roll. If the target fails, they capitulate. Games Masters may wish to reserve Compel Surrender for use against non-player characters only.` },
    { name: "Damage Weapon", tags: ["melee", "ranged"], desc: `Permits the character to damage his opponent's weapon as part of an attack or parry. If attacking, the character aims specifically at the defender's parrying weapon and applies his damage roll to it, rather than the wielder. The targeted weapon uses its own Armour Points for resisting the damage. If reduced to zero Hit Points the weapon breaks.` },
    { name: "Disarm Opponent", tags: ["melee", "ranged"], desc: `The character knocks, yanks or twists the opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original roll. If the recipient of the disarm loses, his weapon is flung a distance equal to the roll of the disarmer's Damage Modifier in metres. If there is no Damage Modifier then the weapon drops at the disarmed person's feet. The comparative size of the weapons affects the roll. Each step that the disarming character's weapon is larger increases the difficulty of the opponent's roll by one grade. Conversely each step the disarming character's weapon is smaller, makes the difficulty one grade easier. Disarming works only on creatures of up to twice the attacker's STR.` },
    { name: "Drop Foe", tags: ["ranged", "siege", "firearms"], desc: `Assuming the target suffers at least a minor wound from a siege weapon, firearms shot or similar, they are forced to make an Opposed Test of their Endurance against the attacker's hit roll. Failure indicates that the target succumbs to shock and pain, becoming incapacitated and unable to continue fighting. Recovery from incapacitation can be performed with a successful First Aid check or using some form of magic or narcotic stimulant if such exists in the campaign. Otherwise the temporary incapacitation lasts for a period equal to one hour divided by the Healing Rate of the target.` },
    { name: "Duck Back", tags: ["ranged"], desc: `This special effect allows the shooter to immediately duck back into cover, without needing to wait for their next Turn to use the Take Cover action. The character must be already standing or crouching adjacent to some form of cover to use Duck Back.` },
    { name: "Entangle", tags: ["trait", "melee", "ranged"], desc: `Allows a character wielding an entangling weapon, such as a whip or net, to immobilise the location struck. An entangled arm cannot use whatever it is holding; a snared leg prevents the target from moving; whilst an enmeshed head, chest or abdomen makes all skill rolls one grade harder. On his following turn the wielder may spend an Action Point to make an automatic Trip Opponent attempt. An entangled victim can attempt to free himself on his turn by either attempting an opposed roll using Brawn to yank free, or win a Special Effect and select Damage Weapon, Disarm Opponent or Slip Free.` },
    { name: "Flurry", tags: ["stackable", "melee", "unarmed"], desc: `An unarmed creature or attacker can make an immediate follow-up attack using a different limb or body part, without needing to wait for its next turn. A human attacker might follow up a punch to the abdomen with a knee to the face for example. The additional attack still costs an Action Point, but potentially allows several attacks in sequence before the defender can respond offensively.` },
    { name: "Force Failure", tags: ["opponent-fumble", "melee", "ranged"], desc: `Used when an opponent fumbles, the character can combine Force Failure with any other Special Effect which requires an opposed roll to work. Force Failure causes the opponent to fail his resistance roll by default - thereby automatically be disarmed, tripped, etc.` },
    { name: "Grip", tags: ["melee", "unarmed"], desc: `Provided the opponent is within the attacker's Unarmed Combat reach, he may use an empty hand (or similar limb capable of gripping such as claws, tails or tentacles) to hold onto the opponent, preventing them from being able to change weapon range or disengage from combat. The opponent may attempt to break free on his turn, requiring an opposed roll of either Brawn or Unarmed against whichever of the two skills the gripper prefers. If the gripped victim wins, they manage to break free. Note that some attackers using Brawn may be so strong that no amount of brute force or cunning technique can overcome their grip.` },
    { name: "Impale", tags: ["trait", "melee", "ranged"], desc: `The attacker can attempt to drive an impaling weapon deep into the defender. Roll weapon damage twice, with the attacker choosing which of the two results to use for the attack. If armour is penetrated and causes a wound, then the attacker has the option of leaving the weapon in the wound, or yanking it free on their next turn. Leaving the weapon in the wound inflicts a difficulty grade on the victim's future skill attempts. The severity of the penalty depends on the size of both the creature and the weapon impaling it, as listed on the Impale Effects Table above. For simplicity's sake, further impalements with the same sized weapon inflict no additional penalties. To withdraw an impaled weapon during melee requires use of the Ready Weapon combat action. The wielder must pass an unopposed Brawn roll (or win an opposed Brawn roll if the opponent resists). Success pulls the weapon free, causing further injury to the same location equal to half the normal damage roll for that weapon, but without any damage modifier. Failure implies that the weapon remained stuck in the wound with no further effect, although the wielder may try again on their next turn. Specifically barbed weapons (such as harpoons) inflict normal damage. Armour does not reduce withdrawal damage. Whilst it remains impaled, the attacker cannot use his impaling weapon for parrying.` },
    { name: "Kill Silently", tags: ["trait", "melee", "ranged"], desc: `Restricted to those trained in a Combat Style with the Assassination benefit. It allows the attacker to neutralise a victim in complete silence, covering their mouth or grasping them about the neck whilst simultaneously stabbing, cutting or garrotting them. This prevents the victim from crying out or otherwise raising an alarm for the entire round. In addition, if during this time the attacks inflict a Serious or Major Wound, the victim will automatically fail its Endurance roll. Kill Silently can only be used on a surprised opponent, and only on the first attack against them.` },
    { name: "Marksman", tags: ["ranged"], desc: `Permits the shooter to move the Hit Location struck by his shot by one step, to an immediately adjoining body area. Physiology has an effect on what can be re-targeted, and common sense should be applied. Thus using this special effect on a humanoid would permit an attacker who rolled a leg shot, to move it up to the abdomen instead. Conversely shooting a griffin in the chest would permit selection of the forelegs, wings or head.` },
    { name: "Maximise Damage", tags: ["critical", "stackable", "melee", "ranged"], desc: `On a critical the character may substitute one of his weapon's damage dice for its full value. For example a Hatchet which normally does 1d6 damage would instead be treated as a 6, whereas a great club with 2d6 damage would instead inflict 1d6+6 damage. This special effect may be stacked. Although it can also be used for natural weapons, Maximise Damage does not affect the Damage Modifier of the attacker, which must be rolled normally.` },
    { name: "Open Range", tags: ["melee"], desc: `Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the longer weapon.` },
    { name: "Overpenetration", tags: ["trait", "critical", "ranged"], desc: `On a critical, if shooting at lineally positioned opponents or into a densely packed group, this special effect allows the shot to travel completely through the first victim to strike a second behind them, assuming that it overcomes the first target's body armour. The second victim however, only suffers half damage due to attenuation or slowing down of the shot. Overpenetration is generally of more use with high powered weapons that inflict large amounts of damage or those which have some sort of armour piercing ability. Any other special effects inflicted on the first target are not applied to the second.` },
    { name: "Pin Down", tags: ["stackable", "ranged"], desc: `This special effect forces the target to make an Opposed Test of their Willpower against the attacker's hit roll. Failure means that the target hunkers down behind whatever cover is available, and cannot return fire on their next Turn. Note that Pin Down works even if no actual damage is inflicted on the target (perhaps due to a successful evasion or shots striking their cover instead), as it relies on the intimidation effect of projectiles passing very close by. Although a pinned victim is unable to fire back for the requisite time, they can perform other actions provided they don't expose themselves to fire in the process, such as crawling away to new cover, communicating with others, reloading a weapon, and so on.` },
    { name: "Pin Weapon", tags: ["critical", "melee", "ranged"], desc: `On a critical the character can pin one of his opponent's weapons or shield, using his body or positioning to hold it in place. On his turn the opponent may attempt to wrestle or manoeuvre the pinned item free. This costs an Action Point and works as per the Grip special effect. Failure means that the pinned item remains unusable. In the meantime, an opponent lacking a weapon or shield in the other hand may only avoid an attack by evading, using his Unarmed skill or disengaging completely.` },
    { name: "Press Advantage", tags: ["melee"], desc: `The attacker pressures his opponent, so that his foe is forced to remain on the defensive, and cannot attack on their next turn. This allows the attacker to potentially establish an unbroken sequence of attacks whilst the defender desperately blocks. It is only effective against foes concerned with defending themselves. Foes that find themselves constantly locked under an unceasing sequence of Press Advantage will likely disengage from the combat, call for help, or use Prepare Counter to give attackers a nasty surprise.` },
    { name: "Rapid Reload", tags: ["stackable", "ranged"], desc: `When using a ranged weapon, the attacker reduces the reload time for the next shot by one. This effect can be stacked.` },
    { name: "Remise", tags: ["melee"], desc: `The attacker performs a sequential follow-up attack with a weapon of size Small on his opponent's next turn, which forces the foe to change their proactive action into a reactive one.` },
    { name: "Re-roll Damage", tags: ["melee", "ranged"], desc: `The attacker re-rolls their damage di(c)e and chooses the higher result to apply.<br/><br/><em style="font-size:0.75em">This is a homebrew special effect.</em>` },
    { name: "Scar Foe", tags: ["melee", "ranged"], desc: `The opponent is given a scar that will disfigure them for the rest of their life, for example a slice across the face, or an artfully inscribed letter across the chest.` },
    { name: "Spoil Spell", tags: ["melee", "ranged"], desc: `The character automatically ruins any spell in the process of being cast, providing the blow overcomes Armour Points and injures the target.` },
    { name: "Stun Location", tags: ["melee", "bludgeoning"], desc: `The attacker can use a bludgeoning weapon to temporarily stun the body part struck. If the blow overcomes Armour Points and injures the target, the defender must make an opposed roll of Endurance vs. the original attack roll. If the defender fails, then the Hit Location is incapacitated for a number of turns equal to the damage inflicted. A blow to the torso causes the defender to stagger winded, only able to defend. A head shot renders the foe briefly insensible.` },
    { name: "Sunder", tags: ["trait", "melee"], desc: `The attacker may use a suitable weapon to damage the armour or natural protection of an opponent. Any weapon damage, after reductions for parrying or magic, is applied against the Armour Point value of the protection. Surplus damage in excess of its Armour Points is then used to reduce the AP value of that armour(ed) location - ripping straps, bursting rings, creasing plates or tearing away the hide, scales or chitin of monsters. If any damage remains after the protection has been reduced to zero AP, it carries over onto the Hit Points of the location struck.` },
    { name: "Take Weapon", tags: ["melee", "unarmed"], desc: `Allows an unarmed character to yank or twist an opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original Unarmed roll. If the target loses, his weapon is taken and from that moment on, may be used by the character instead. Take Weapon differs from Disarm Opponent in that the size of the weapon is largely irrelevant. However, the technique only works on creatures of up to twice the attacker's STR.` },
    { name: "Trip Opponent", tags: ["melee", "ranged"], desc: `The character attempts to overbalance or throw his opponent to the ground. The opponent must make an opposed roll of his Brawn, Evade or Acrobatics against the character's original roll. If the target fails, he falls prone. Quadruped opponents (or creatures with even more legs) may substitute their Athletics skill for Evade, and treat the roll as one difficulty grade easier.` }
  ],
  defensive: [
    { name: "Accidental Injury", tags: ["opponent-fumble"], desc: `The defender deflects or twists an opponent's attack in such a way that he fumbles, injuring himself. The attacker must roll damage against himself in a random hit location using the weapon used to strike. If unarmed he tears or breaks something internal, the damage roll ignoring any armour.` },
    { name: "Arise", tags: ["melee", "ranged"], desc: `Allows the defender to use a momentary opening to roll back up to their feet.` },
    { name: "Blind Opponent", tags: ["critical", "melee"], desc: `On a critical the defender briefly blinds his opponent by throwing sand, reflecting sunlight off his shield, or some other tactic which briefly interferes with the attacker's vision. The attacker must make an opposed roll of his Evade skill (or Weapon style if using a shield) against the defender's original parry roll. If the attacker fails he suffers the Blindness situational modifier for the next 1d3 turns.` },
    { name: "Close Range", tags: ["melee"], desc: `Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the shorter weapon.` },
    { name: "Compel Surrender", tags: ["melee", "ranged"], desc: `Allows the character a chance to force the surrender of a helpless or disadvantaged opponent; for example someone who has been disarmed, is lying prone unable to regain his footing, has suffered a serious (or worse) wound, and so on. Damage is not inflicted on the target, they are only threatened. Assuming the target is sapient and able to understand the demand, the target must make an opposed roll of Willpower against the original attack or parry roll. If the target fails, they capitulate. Games Masters may wish to reserve Compel Surrender for use against non-player characters only.` },
    { name: "Damage Weapon", tags: ["melee"], desc: `Permits the character to damage his opponent's weapon as part of an attack or parry. If attacking, the character aims specifically at the defender's parrying weapon and applies his damage roll to it, rather than the wielder. The targeted weapon uses its own Armour Points for resisting the damage. If reduced to zero Hit Points the weapon breaks.` },
    { name: "Disarm Opponent", tags: ["melee", "ranged"], desc: `The character knocks, yanks or twists the opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original roll. If the recipient of the disarm loses, his weapon is flung a distance equal to the roll of the disarmer's Damage Modifier in metres. If there is no Damage Modifier then the weapon drops at the disarmed person's feet. The comparative size of the weapons affects the roll. Each step that the disarming character's weapon is larger increases the difficulty of the opponent's roll by one grade. Conversely each step the disarming character's weapon is smaller, makes the difficulty one grade easier. Disarming works only on creatures of up to twice the attacker's STR.` },
    { name: "Enhance Parry", tags: ["critical", "melee", "ranged"], desc: `On a critical the defender manages to deflect the entire force of an attack, no matter the Size of his weapon.` },
    { name: "Entangle", tags: ["trait", "melee", "ranged"], desc: `Allows a character wielding an entangling weapon, such as a whip or net, to immobilise the location struck. An entangled arm cannot use whatever it is holding; a snared leg prevents the target from moving; whilst an enmeshed head, chest or abdomen makes all skill rolls one grade harder. On his following turn the wielder may spend an Action Point to make an automatic Trip Opponent attempt. An entangled victim can attempt to free himself on his turn by either attempting an opposed roll using Brawn to yank free, or win a Special Effect and select Damage Weapon, Disarm Opponent or Slip Free.` },
    { name: "Force Failure", tags: ["melee", "ranged"], desc: `Used when an opponent fumbles, the character can combine Force Failure with any other Special Effect which requires an opposed roll to work. Force Failure causes the opponent to fail his resistance roll by default - thereby automatically be disarmed, tripped, etc.` },
    { name: "Open Range", tags: ["melee"], desc: `Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the longer weapon.` },
    { name: "Overextend Opponent", tags: ["stackable", "melee", "ranged"], desc: `The defender sidesteps or retreats at an inconvenient moment, causing the attacker to overreach himself. Opponent cannot attack on his next turn. This special effect can be stacked.` },
    { name: "Pin Weapon", tags: ["critical", "melee", "ranged"], desc: `On a critical the character can pin one of his opponent's weapons or shield, using his body or positioning to hold it in place. On his turn the opponent may attempt to wrestle or manoeuvre the pinned item free. This costs an Action Point and works as per the Grip special effect. Failure means that the pinned item remains unusable. In the meantime, an opponent lacking a weapon or shield in the other hand may only avoid an attack by evading, using his Unarmed skill or disengaging completely.` },
    { name: "Prepare Counter", tags: ["stackable", "melee", "ranged"], desc: `The defender reads the patterns of his foe and pre-plans a counter against a specific Special Effect (which should be noted down in secret). If his opponent attempts to inflict the chosen Special Effect upon him during the fight, the defender instantly substitutes the attackers effect with an offensive or defensive one of his own, which succeeds automatically.` },
    { name: "Scar Foe", tags: ["melee", "ranged"], desc: `The opponent is given a scar that will disfigure them for the rest of their life, for example a slice across the face, or an artfully inscribed letter across the chest.` },
    { name: "Select Target", tags: ["melee", "ranged"], desc: `When an attacker fumbles, the defender may manoeuvre or deflect the blow in such a way that it hits an adjacent bystander instead. This requires that the new target is within reach of the attacker's close combat weapon, or in the case of a ranged attack, is standing along the line of fire. The new victim is taken completely by surprise by the unexpected accident, and has no chance to avoid the attack which automatically hits. In compensation however, they suffer no special effect.` },
    { name: "Slip Free", tags: ["critical", "melee", "ranged"], desc: `On a critical the defender can automatically escape being Entangled, Gripped, or Pinned.` },
    { name: "Spoil Spell", tags: ["melee", "ranged"], desc: `The character automatically ruins any spell in the process of being cast, providing the blow overcomes Armour Points and injures the target.` },
    { name: "Stand Fast", tags: ["melee", "ranged"], desc: `The defender braces himself against the force of an attack, allowing them to avoid the Knockback effects of any damage received.` },
    { name: "Take Weapon", tags: ["melee", "unarmed"], desc: `Allows an unarmed character to yank or twist an opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original Unarmed roll. If the target loses, his weapon is taken and from that moment on, may be used by the character instead. Take Weapon differs from Disarm Opponent in that the size of the weapon is largely irrelevant. However, the technique only works on creatures of up to twice the attacker's STR.` },
    { name: "Trip Opponent", tags: ["melee", "ranged"], desc: `The character attempts to overbalance or throw his opponent to the ground. The opponent must make an opposed roll of his Brawn, Evade or Acrobatics against the character's original roll. If the target fails, he falls prone. Quadruped opponents (or creatures with even more legs) may substitute their Athletics skill for Evade, and treat the roll as one difficulty grade easier.` },
    { name: "Weapon Malfunction", tags: ["opponent-fumble", "melee", "ranged", "firearms"], desc: `The attacker's weapon malfunctions in such a way that it is rendered useless until time can be spent repairing it.` },
    { name: "Withdraw", tags: ["melee"], desc: `The defender may automatically withdraw out of reach, breaking off engagement with that particular opponent.` },
  ]
};

const tagList = ["critical", "opponent-fumble", "trait", "stackable", "melee", "ranged", "bludgeoning", "cutting", "shield", "unarmed", "firearms", "siege"];

function renderSpecialEffectsDialog(winner, effectsCount) {
  function buildSFHTML(actionList, category) {
    return actionList.map(action => `
      <details class="action-pill" data-category="${category}" data-name="${action.name}" data-tags="${action.tags.join(',')}">
        <summary>${action.name} <span style="font-size:0.75em; color:#555; font-style:italic;">(${action.tags.join(', ')})</span></summary>
        <div style="margin-top:4px; padding-left:10px; border-left: 2px solid var(--color-border-dark-tertiary);">${action.desc}</div>
      </details>
    `).join('');
  }

  const htmlContent = `
    <style>
      .sf-container { display: flex; height: 400px; gap: 10px; }
      .sf-sidebar { width: 150px; overflow-y: auto; border-right: 1px solid var(--color-border-dark-tertiary); padding-right: 5px; }
      .sf-main { flex: 1; overflow-y: auto; padding-right: 5px; }
      .sf-header-bar { background: var(--color-bg-option); padding: 8px; text-align: center; font-weight: bold; margin-bottom: 10px; border-radius: 5px;}
      .tag-btn { display: block; width: 100%; text-align: left; padding: 4px; margin-bottom: 4px; border: 1px solid #ccc; cursor: pointer; border-radius: 3px; background: #eee; user-select: none; }
      .tag-btn.include { background: #d4edda; border-color: #c3e6cb; color: #155724; }
      .tag-btn.exclude { background: #f8d7da; border-color: #f5c6cb; color: #721c24; }
      .action-pill { background: rgba(255,255,255,0.5); border: 1px solid var(--color-border-dark); border-radius: 6px; margin-bottom: 8px; padding: 8px; cursor: pointer; }
      .action-pill.selected-pill { border-color: var(--color-text-dark-primary); box-shadow: 0 0 5px var(--color-shadow-highlight); background: rgba(0,0,0,0.1); }
      .action-pill summary { font-weight: bold; outline: none; }
    </style>
    <div class="sf-header-bar">
        Winner: <span style="text-transform: capitalize;">${winner}</span> | Effects Available: ${effectsCount}
    </div>
    <div class="sf-container">
        <div class="sf-sidebar">
            <h4 style="margin: 0 0 5px 0; border-bottom: 1px solid #ccc;">Weapon Filters</h4>
            ${tagList.map(tag => `<button class="tag-btn" data-tag="${tag}">&#9898; ${tag}</button>`).join('')}
            <div style="font-size: 0.75em; color: #666; margin-top: 10px; line-height: 1.2;">
                <i>Click to cycle:<br>Grey = Ignore<br>Green = Include<br>Red = Exclude</i>
            </div>
        </div>
        <div class="sf-main">
            <div id="sf-list">
                ${winner === 'attacker' ? buildSFHTML(specialEffectsData.offensive, 'offensive') : buildSFHTML(specialEffectsData.defensive, 'defensive')}
            </div>
        </div>
    </div>
  `;

  new Dialog({
    title: "Special Effects Selection",
    content: htmlContent,
    buttons: {
      post: {
        icon: '<i class="fas fa-comment"></i>',
        label: "Post Selected Effect",
        callback: (html) => {
          const selectedPill = $(html).find('.action-pill.selected-pill');
          if (!selectedPill.length) return ui.notifications.warn("Select a Special Effect first.");
          
          const category = selectedPill.data('category');
          const sfName = selectedPill.data('name');
          const sfObj = specialEffectsData[category].find(e => e.name === sfName);

          ChatMessage.create({
            content: `<h3 style="border-bottom: 2px solid var(--color-border-dark-tertiary); margin-bottom: 6px;"><i class="fas fa-bolt"></i> <strong>${sfObj.name}</strong></h3><p style="margin-top: 0;">${sfObj.desc}</p>`
          });
        }
      },
      close: { label: "Close" }
    },
    default: "post",
    render: (html) => {
      let filters = { include: [], exclude: [] };

      function applyFilters() {
        html.find('.action-pill').each(function() {
          const pill = $(this);
          const tags = pill.data('tags').split(',');
          
          let show = true;
          if (filters.include.length > 0) {
              let hasInclude = filters.include.every(inc => tags.includes(inc));
              if (!hasInclude) show = false;
          }
          if (filters.exclude.length > 0) {
              let hasExclude = filters.exclude.some(exc => tags.includes(exc));
              if (hasExclude) show = false;
          }

          show ? pill.show() : pill.hide();
        });
      }

      html.find('.tag-btn').on('click', function(e) {
        e.preventDefault();
        const btn = $(this);
        const tag = btn.data('tag');

        if (btn.hasClass('include')) {
            btn.removeClass('include').addClass('exclude');
            btn.html(`&#10006; Exclude ${tag}`);
            filters.include = filters.include.filter(t => t !== tag);
            filters.exclude.push(tag);
        } else if (btn.hasClass('exclude')) {
            btn.removeClass('exclude');
            btn.html(`&#9898; ${tag}`);
            filters.exclude = filters.exclude.filter(t => t !== tag);
        } else {
            btn.addClass('include');
            btn.html(`&#10004; Include ${tag}`);
            filters.include.push(tag);
        }
        applyFilters();
      });

      html.find('.action-pill').on('click', function() {
        html.find('.action-pill').removeClass('selected-pill');
        $(this).addClass('selected-pill');
      });
    }
  }, { width: 600,  height: 540, resizable: true }).render(true);
}

// -- 5. Mythras Round-Based Fatigue Tracker Hook --
if (!globalThis.mythrasFatigueHookInitialized) {
    globalThis.mythrasFatigueHookInitialized = true;

    Hooks.on("updateCombat", async (combat, update, options, userId) => {
        console.log("Mythras Fatigue | updateCombat fired. GM:", game.user.isGM, "Round:", combat.round);
        if (!game.user.isGM) return;

        const currentRound = combat.round || 1;
        
        // Fetch last processed round from a flat combat document flag (persists through refreshes)
        let lastProcessedRound = combat.getFlag("mythras-angrygorillas-custom-macros", "lastRound");
        if (lastProcessedRound === undefined) {
            lastProcessedRound = currentRound;
            await combat.setFlag("mythras-angrygorillas-custom-macros", "lastRound", currentRound);
        }

        // If the global combat round has advanced, increment completed rounds for all combatants
        if (currentRound > lastProcessedRound) {
            const diff = currentRound - lastProcessedRound;
            console.log(`Mythras Fatigue | Round advanced from ${lastProcessedRound} to ${currentRound} (diff: ${diff})`);
            
            await combat.setFlag("mythras-angrygorillas-custom-macros", "lastRound", currentRound);

            for (let combatant of combat.combatants.contents) {
                let completed = combatant.getFlag("mythras-angrygorillas-custom-macros", "completedRounds") || 0;
                completed += diff;
                await combatant.setFlag("mythras-angrygorillas-custom-macros", "completedRounds", completed);
                await combatant.setFlag("mythras-angrygorillas-custom-macros", "promptedThisRound", false); // Reset prompt lock for new round cycle
                console.log(`Mythras Fatigue | Combatant ${combatant.name} completed rounds updated to: ${completed}`);
            }
        }

        // Evaluate the currently active combatant on their turn
        const combatant = combat.combatant;
        if (!combatant || !combatant.actor) {
            console.log("Mythras Fatigue | No active combatant or actor found.");
            return;
        }

        const actor = combatant.actor;
        
        // Characteristic path fallbacks for Mythras actor data structures
        const con = foundry.utils.getProperty(actor, "system.characteristics.con.value") ||
                    foundry.utils.getProperty(actor, "system.characteristics.CON.value") ||
                    foundry.utils.getProperty(actor, "system.con") || 10;
                    
        const fatigueInterval = Math.ceil(con / 5);

        let actorCompleted = combatant.getFlag("mythras-angrygorillas-custom-macros", "completedRounds") || 0;
        let promptedThisRound = combatant.getFlag("mythras-angrygorillas-custom-macros", "promptedThisRound") || false;

        console.log(`Mythras Fatigue | Checking ${actor.name} (CON: ${con}, Interval: ${fatigueInterval}, Completed Rounds: ${actorCompleted})`);

        // Prompt on the first turn of the round following completion of the interval
        if (actorCompleted >= fatigueInterval && !promptedThisRound) {
            console.log(`Mythras Fatigue | Triggering fatigue prompt for ${actor.name}!`);
            await combatant.setFlag("mythras-angrygorillas-custom-macros", "promptedThisRound", true);

            const content = `
                <div style="text-align: center;">
                    <p><strong>${combatant.name}</strong> has completed ${actorCompleted} rounds of exertion.</p>
                    <p><em>Time to roll Endurance for potential fatigue loss!</em></p>
                    <button class="roll-endurance-btn" data-actor-id="${actor.id}" style="margin-top: 5px; padding: 4px 8px; cursor: pointer;">Roll Endurance</button>
                </div>`;

            ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: actor }),
                content: content
            });
        }
    });

    console.log("Mythras Round-Based Fatigue Tracker hook initialized.");
}

// 6. Apply Wound Conditions for humanoids automatically if Condition Lab and Triggler is installed and enabled, and appropriately named conditions have been created. Register the hook only if Condition Lab / Triggler or CUB is active
// ==========================================
// Automated Humanoid Wound Conditions (Item-Based)
// ==========================================
Hooks.once("ready", () => {

    // Check if the relevant module setting is enabled
    const isEnabled = game.settings.get("mythras-angrygorillas-custom-macros", "enableWoundsIntegrationWithConditionLab");
    if (!isEnabled) return;

    const hasCLT = game.modules.get("condition-lab-triggler")?.active;
    const hasCUB = game.modules.get("combat-utility-belt")?.active;

    if (!hasCLT && !hasCUB) {
        console.warn("Mythras Wound Condition Hook | Condition Lab & Triggler or CUB not found as active.");
        ui.notifications.warn("Mythras Wound Condition Hook | Condition Lab & Triggler or CUB not found as active. Wound conditions will not be applied automatically.");
        return;
    }

    console.log("Mythras Wound Condition Hook | CUB or Condition Lab detected. Registering updateItem hook for wound conditions.");

    Hooks.on("updateItem", async (item, updateData, options, userId) => {
        if (userId !== game.user.id) return;

        if (item.type !== "hitLocation") return;
        
        const actor = item.actor;
        if (!actor) return;
        console.log(`Mythras Wound Condition Hook | updateItem triggered for actor: ${actor.name}, item: ${item.name}`);

        const severities = ["Minor Wound", "Serious Wound", "Major Wound"];


        const locName = item.name;
        const currentHp = Number(item.system.currentHp);
        const maxHp = Number(item.maxHp);
        const negativeMaxHp = maxHp * -1;

        if (locName === undefined || currentHp === undefined || maxHp === undefined)  {
          console.log("Mythras Wound Condition Hook | Missing required data for wound condition processing. Ensure hit location items have currentHp and maxHp defined.");          
          return;
        }

        let targetWound = null;

        if (currentHp > 0 && currentHp < maxHp) {
            targetWound = `Minor Wound - ${locName}`;
        } else if (currentHp <= 0 && currentHp > (negativeMaxHp)) {
            targetWound = `Serious Wound - ${locName}`;
        } else if (currentHp <= negativeMaxHp) {
            targetWound = `Major Wound - ${locName}`;
        }

        const existingEffects = actor.effects.filter(e => {              
            return severities.some(sev => e.name === `${sev} - ${locName}`);
        });

        const effectsToRemove = existingEffects.filter(e => e.name !== targetWound);
        const hasTargetEffect = existingEffects.some(e => e.name === targetWound);

        if (effectsToRemove.length > 0) {
            const idsToRemove = effectsToRemove.map(e => e.id);
            await actor.deleteEmbeddedDocuments("ActiveEffect", idsToRemove);
        }

        if (targetWound && !hasTargetEffect) {
            const statusEffectConfig = CONFIG.statusEffects.find(se => (se.label || se.name || se.id) === targetWound);
            
            if (statusEffectConfig) {
                const effectData = {
                    name: targetWound,
                    img: statusEffectConfig.icon || statusEffectConfig.img,
                    statuses: [statusEffectConfig.id]
                };
                await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
            }
        }
    });
});


// Automatic Fatigue Increase Hook if Character is Bleeding.
Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
    // Only execute this logic on the Game Master client when a new round starts
    if (!game.user.isGM) return;
    if (!updateData.round) return; // Only trigger when the round number changes
    
    // Check if the relevant module setting is enabled
    const isEnabled = game.settings.get("mythras-angrygorillas-custom-macros", "enableBleedingFatigue");
    if (!isEnabled) return;

    // Ordered sequence of Mythras fatigue states from best to worst
    const fatigueTrack = ['fresh', 'winded', 'tired', 'exhausted', 'debilitated', 'incapacitated'];

    for (let combatant of combat.combatants) {
        const actor = combatant.actor;
        if (!actor) continue;

        // Check if the actor currently has the "bleeding" status effect active
        const hasBleeding = actor.effects.some(e => {
            const nameMatch = e.name && e.name.toLowerCase() === "bleeding";
            const statusMatch = e.statuses && e.statuses.has("bleeding");
            return nameMatch || statusMatch;
        });

        if (!hasBleeding) continue;

        // Retrieve current fatigue value from the actor system data
        const currentFatigue = actor.system.attributes?.fatigue?.value?.toLowerCase();
        if (!currentFatigue) continue;

        const currentIndex = fatigueTrack.indexOf(currentFatigue);
        
        // If the current fatigue string is found and is not already at the worst level
        if (currentIndex !== -1 && currentIndex < fatigueTrack.length - 1) {
            const nextFatigue = fatigueTrack[currentIndex + 1];

            // Update the actor's fatigue attribute
            await actor.update({
                "system.attributes.fatigue.value": nextFatigue
            });

            // Post a formatted message to the chat log
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor: actor }),
                content: `
                    <div style="border: 1px solid #7a0000; border-radius: 4px; padding: 8px; background: rgba(122, 0, 0, 0.05);">
                        <h4 style="margin: 0 0 4px 0; border-bottom: 1px solid #7a0000; color: #7a0000;">🩸 Bleeding Fatigue Progression</h4>
                        <p style="margin: 4px 0 0 0;">
                            <strong>${actor.name}</strong> is bleeding and grows more exhausted. Their fatigue level drops to: <strong style="text-transform: uppercase;">${nextFatigue}</strong>
                        </p>
                    </div>
                `
            });
        }
    }
});

 
Hooks.once("ready", () => {
    if (!!game.settings.get("mythras-angrygorillas-custom-macros", "enableHoldingLocations")) {

        // -- 7. Item Sheet Hook for Weapon Holding Locations --
        Hooks.on("renderItemSheet", (app, html) => {
            const item = app.item;
            // Check if the item is a weapon (adjust type string based on Mythras system schema)
            if (item.type !== "melee-weapon" && item.type !== "ranged-weapon") return;

            const actor = item.actor;
            if (!actor) return; // Only applies to owned items inside an actor sheet

            // Get all hit locations on the actor
            const hitLocations = actor.items.filter(i => i.type === "hitLocation");
            
            // Retrieve currently selected location IDs from flags
            const currentLocations = item.getFlag("mythras-angrygorillas-custom-macros", "holdingLocations") || [];

            // Build HTML for a multi-select dropdown or checkbox group
            let optionsHtml = hitLocations.map(loc => {
                const selected = currentLocations.includes(loc.id) ? `selected style="font-weight:bold"` : "";
                return `<option value="${loc.id}" ${selected}>${loc.name}</option>`;
            }).join("");

            const multiSelectHtml = `
                <div class="weapon-piece">
                    <h3 class="core-info">Held Locations</h3>
                    <select id="held-locations" name="flags.mythras-angrygorillas-custom-macros.holdingLocations" multiple style="height: 60px;">
                        ${optionsHtml}
                    </select>
                </div>
            `;

            // Inject the HTML into the item sheet (e.g., inside the header or details tab)
            const targetElement = html.find(".weapon-core-section").first();
            if (targetElement.length) {
                targetElement.append(multiSelectHtml);
            }
        });

        Hooks.on("refreshToken", (token) => {
            // Ensure the token has an actor and it's a character token
            const actor = token.actor;
            if (!actor) return;

            // Remove old custom weapon overlay container if it exists to redraw fresh
            if (token.weaponOverlayContainer) {
                token.removeChild(token.weaponOverlayContainer);
                token.weaponOverlayContainer.destroy({ children: true });
                token.weaponOverlayContainer = null;
            }

            // Find all weapons being held (where holdingLocations flag is not empty)
            const heldWeapons = actor.items.filter(i => {
                if (i.type !== "melee-weapon" && i.type !== "ranged-weapon") return false;
                const locations = i.getFlag("mythras-angrygorillas-custom-macros", "holdingLocations");
                return Array.isArray(locations) && locations.length > 0;
            });

            if (heldWeapons.length === 0) return;

            // Create a new PIXI container for the weapon icons
            const overlayContainer = new PIXI.Container();
            token.weaponOverlayContainer = overlayContainer;
            token.addChild(overlayContainer);

            let index = 0;
            const iconSize = 24; // Size of the small weapon overlay icon

            heldWeapons.forEach(weapon => {
                if (!weapon.img) return;

                // Use Foundry's built-in texture loader helper for cached rendering
                loadTexture(weapon.img).then(texture => {
                    if (!overlayContainer.destroyed) {
                        const sprite = new PIXI.Sprite(texture);
                        sprite.width = iconSize;
                        sprite.height = iconSize;
                        
                        // Position along the bottom-right corner of the token
                        sprite.x = token.w - (iconSize * (index + 1)) - (2 * index);
                        sprite.y = token.h - iconSize - 5;

                        overlayContainer.addChild(sprite);
                        index++;
                    }
                });
            });
        });
    }
});