// main.js
// Tested on Foundry v13 (Mythras Round-Based Fatigue Tracker)

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
    }).render(true);
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
    }).render(true);
}

// -- Special Effects Data & Filtering Rendering --
const specialEffectsData = {
  offensive: [
    { name: "Bash", tags: ["bludgeoning", "shield"], desc: "Used with shields and blunt weapons. Knocks the opponent back and can cause them to fall prone or drop their guard." },
    { name: "Bleed", tags: ["cutting", "impale"], desc: "Causes a wound that continues to bleed, draining hit points or causing fatigue until treated." },
    { name: "Blind Opponent", tags: ["ranged", "unarmed"], desc: "Temporarily impairs the opponent's vision by throwing dirt, striking the head, or using glare." },
    { name: "Choose Location", tags: ["cutting", "bludgeoning", "impale", "ranged", "unarmed"], desc: "Allows the attacker to precisely select which hit location is struck." },
    { name: "Damage Weapon", tags: ["cutting", "bludgeoning"], desc: "Directs the attack against the opponent's weapon or shield, dealing damage to its structure." },
    { name: "Disarm", tags: ["cutting", "bludgeoning", "unarmed"], desc: "Knocks or twists the opponent's weapon from their grasp." },
    { name: "Entangle", tags: ["entangle"], desc: "Traps the opponent's weapon or limbs, restricting their movement and combat options." },
    { name: "Impale", tags: ["impale"], desc: "Weapon lodges deeply into the target, maximizing damage and causing further injury if withdrawn recklessly." },
    { name: "Knockback", tags: ["bludgeoning", "shield"], desc: "Drives the opponent backwards, potentially knocking them over or forcing them into hazards." },
    { name: "Sunder", tags: ["two-handed", "bludgeoning"], desc: "Smashes through armor, permanently reducing its Armor Points." },
    { name: "Trip Opponent", tags: ["unarmed", "entangle"], desc: "Knocks the opponent's legs out from under them, rendering them prone." }
  ],
  defensive: [
    { name: "Blind Opponent", tags: ["unarmed"], desc: "Uses the parry motion to flick dirt, blood, or glare into the attacker's eyes." },
    { name: "Damage Weapon", tags: ["cutting", "bludgeoning", "shield"], desc: "Uses a sturdy parrying item to deliberately damage the incoming attacking weapon." },
    { name: "Disarm", tags: ["cutting", "bludgeoning", "unarmed"], desc: "Wrenches the attacking weapon from the opponent's grip using a parry or specialized catch." },
    { name: "Entangle", tags: ["entangle"], desc: "Wraps the incoming weapon or limb, rendering it temporarily unusable." },
    { name: "Grip", tags: ["unarmed"], desc: "Grabs the attacker's weapon arm or body directly during the parry." },
    { name: "Stand Fast", tags: ["shield", "two-handed"], desc: "Braces against the attack to completely negate any Knockback or Bash special effects." },
    { name: "Trip Opponent", tags: ["unarmed", "entangle"], desc: "Uses the parry motion to sweep the attacker's legs, knocking them prone." }
  ]
};

const tagList = ["bludgeoning", "cutting", "entangle", "firearms", "impale", "ranged", "shield", "two-handed", "unarmed"];

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
              let hasInclude = filters.include.some(inc => tags.includes(inc));
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
  }, { width: 600,  height: 775, resizable: true }).render(true);
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