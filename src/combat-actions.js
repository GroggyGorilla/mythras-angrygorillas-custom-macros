// Mythras Combat Actions
// Tested with Foundry VTT v13

const actionData = {
  proactive: [
    { name: "Attack", type: "proactive", tags: ["melee", "ranged"], desc: `The character can attempt to strike an opponent using a hand-to-hand or ranged weapon. As movement takes place after performing an action, attackers will have to be strategic when closing with an opponent. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk if moving into engagement range or making a ranged attack. The exception is the rules for Charging (page 104 of MYTHRAS).` },
    { name: "Brace", type: "proactive", tags: ["melee"], desc: `The character braces by taking a firm stance and leaning into the direction of a forthcoming attack. For the purposes of resisting Knockback or Leaping Attacks, the character's SIZ is treated as 50% bigger. Against the Bash special effect, SIZ is doubled. Other actions may be possible; however, the benefits of bracing are lost once characters move away from the place where they planted themselves. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: No movement possible.` },
    { name: "Cast Magic", type: "proactive", tags: ["magic"], desc: `The character can attempt to cast a spell, invoke a talent, or produce some other magical effect. Complex magics may require several actions in order to complete the casting. Once concluded, the magic can be released at any moment up until the caster's next Turn - at which point it can be held for later effect, but this requires the Hold Magic action (see below) to maintain it in preparation for later release. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
    { name: "Change Range", type: "proactive", tags: ["movement"], desc: `The character can attempt to close on or retreat from an opponent, changing the range at which the fighting is taking place in order take best advantage of a weapon's reach or retreat from engagement entirely. See Weapon Reach - Closing and Opening Range in MYTHRAS.
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
    { name: "Delay", type: "proactive", tags: ["general"], desc: `The character conserves one or more actions in order to perform reactive actions at a later time, such as Interrupt or Parry. The Action Point costs of delaying is covered by whatever acts are finally performed. If the delayed actions are not taken before the character's next Turn (on the following cycle), then the character is considered to have Dithered and the Action Points are lost. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: As determined when the delayed actions are taken.` },
    { name: "Dither", type: "proactive", tags: ["general"], desc: `A character can decide to do nothing, i.e., abort on action, by simply spending all of the character's Action Points and wasting that Turn doing nothing useful. 
      <br/><br/> 
      <strong>Movement Restrictions</strong>: While opting not to take an action, the character may move at any gait.` },
    { name: "Hold Magic", type: "proactive", tags: ["magic"], desc: `Once casting is complete, the character may hold a spell in temporary check, awaiting the best moment to release it. The magic may be held back for as long as the character continues to take this action on subsequent Turns, but allows free use of the Counter Spell reaction if pertinent to the spell. The actual skill roll to cast the held spell is not made until it is actually cast. 
      <br/><br/> 
      <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
    { name: "Mount", type: "proactive", tags: ["movement"], desc: `The character can mount or dismount a riding beast. Particularly large or difficult mounts may require several Turns to complete.
       <br/><br/>
       <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
    { name: "Outmanoeuvre", type: "proactive", tags: ["melee", "movement"], desc: `The character can engage multiple opponents in a group opposed roll of Evade skills. Those who fail to beat the character's roll cannot attack that character in that Combat Round. If the character beats all of the opponents, the character may disengage from combat. Outmanoeuvre may not be attempted by a prone combatant. See Outmanoeuvring in MYTHRAS. 
      <br/><br/> 
      <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk. If successful at outmanoeuvring, the defender may move up to half Walking speed, with the Games Master repositioning the trailing group of opponents so as to reflect the new situation. The character may change to any facing after moving.` },
    { name: "Ready", type: "proactive", tags: ["general", "ranged"], desc: `The character may retrieve, draw, sheath, withdraw, or reload a weapon or other object. Retrieving a nearby dropped object requires 2 actions: one to move and reach down for the object and a second to return to a readied stance. Some missile weapons require several actions to reload.
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk, but must make a successful Athletics roll unless standing still or fail to retrieve the object. On a Fumble, the item is kicked 1d3x1.5 metres (1d3x5 feet) away.` },
    { name: "Regain Footing", type: "proactive", tags: ["movement"], desc: `If unengaged with an opponent, characters can automatically regain their footing from being tripped or knocked down. If engaged, the character must win an opposed test of Brawn or Athletics with the opponent before standing. A character with Acrobatics may, instead, attempt a kick-up manoeuvre, kicking up from prone to standing with a Standard Acrobatics roll. A failed roll leaves the character prone. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
    { name: "Struggle", type: "proactive", tags: ["melee"], desc: `If the victim of a certain types of attack or Special Effect, the character may attempt to disengage from the situation, for example, breaking free from a Grapple or Pin Weapon. 
      <br/><br/> 
      <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk, assuming the character breaks free to begin with.` },
    { name: "Take Cover", type: "proactive", tags: ["ranged", "magic", "movement"], desc: `Take Cover is a proactive action which allows a the character to duck behind available cover in their immediate vicinity, thereby gaining some degree of protection against ranged attacks and spells. Unlike Evade it does not leave the user prone, but does rely on some form of cover being available; for example ducking back around a corner in a corridor or crouching down behind a table in a tavern. Depending on circumstances, the available cover may or may not be enough to completely protect the character. The type of cover will also determine its protective qualities. A thick iron door, for instance may prove impenetrable to arrows and bullets, whereas a thin wooden wall might only provide 4 Armour Points. For general guidelines concerning the protective qualities of certain materials, see the 'Inanimate Objects Armour and Hit Points' table on page 81 of MYTHRAS. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at any gait other than Sprint.` }
  ],
  reactive: [
    { name: "Counter Spell", type: "reactive", tags: ["magic"], desc: `The character can attempt to dismiss or counter an incoming spell. This assumes the countering magic has a casting time of 1 Action Point; otherwise, it must be prepared in advance and temporarily withheld using the Hold Magic action. Successfully intercepting magic in this manner is assumed to negate the entire spell, even those with multiple targets or areas of effect. 
      <br/><br/>      
      <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Walk.` },
    { name: "Evade", type: "reactive", tags: ["melee", "ranged", "movement"], desc: `The character can attempt to dive or roll clear of threats such as incoming missiles or a charging attack. Using Evade leaves the character prone, unless mitigated by some special consequence or class ability. Thus, the character's next Turn is usually spent taking the Regain Footing action. A character that has been rendered prone due to evading may end up in the same square, or if using Battlemats with a scale of 1.5 metres (5 feet), an adjacent square. When evading breath weapons or other Area of Effect (AoE) attacks, if within 3 metres (10 feet) of the edge of the AoE, a successful Evade will allow you to dive to safety and take no damage instead of half. This will still leave you prone, regardless of any special consequence that can negate that penalty. If using miniatures, place your character prone and just outside of the AoE regardless of whether the roll was successful or not.
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at any gait other than Sprint.` },
    { name: "Interrupt", type: "reactive", tags: ["general"], desc: `This reactive action halts an opponent's Turn at any point in order to take a delayed Turn action. Assuming no change in the tactical situation, the opponent continues the Turn after the character's is completed. If unable to still achieve the original declaration, the opponent's Action Point is wasted. An interrupt can also be used against anyone passing close by the delaying character within weapon's reach. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: As per that of the interrupting action.` },
    { name: "Parry", type: "reactive", tags: ["melee"], desc: `The character can attempt to deflect an incoming attack using a combination of parrying, blocking, leaning, and footwork to stop the blow. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Walk if unengaged or Hold Ground otherwise.` }
  ],
  free: [
    { name: "Assess Situation", type: "free", tags: ["general"], desc: `If unengaged, a character can make a Perception roll at no Action Point cost. A Success reveals any relevant changes in the tactical situation (such a spotting a foe beginning a charge). 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than Walk or Run (running results in a Formidable Perception roll).` },
    { name: "Change Facing", type: "free", tags: ["movement"], desc: `As a free action, after the results of an attack are applied, the defender may change facing to better defend against any further strikes. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Walk.` },
    { name: "Drop Weapon", type: "free", tags: ["general"], desc: `Dropping a weapon is a Free Action. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Run.` },
    { name: "Signal", type: "free", tags: ["general"], desc: `If unengaged, gesturing or signalling to one or more participants (as long as they can perceive the sign) is a Free Action. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Walk.` },
    { name: "Speak", type: "free", tags: ["general"], desc: `A character can speak at any time during combat, but what is said should be limited to short phrases that can be uttered in 5 seconds or less, for example, 'Time to die!', 'Look out behind you!' or 'Long live Gygax!' 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Run.` },
    { name: "Use Luck Point", type: "free", tags: ["general"], desc: `Using a Luck Point - to re-roll a particular result, for example - is a Free Action. 
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character suffers no movement restrictions.` },
    { name: "Ward Location", type: "free", tags: ["melee"], desc: `The character guards a particular Hit Location from being hit by dedicating one weapons to statically cover the area. Any blow that lands on that location has its damage automatically downgraded as per normal for a parrying weapon of its SIZ. The ward continues until the dedicated weapon is used to attack or actively parry. Establishing a ward or changing the Hit Location covered must be performed prior to an opponent rolling to attack the character. Due to their design, shields can cover multiple areas. For further explanation, see Passive Blocking in MYTHRAS.
      <br/><br/>
      <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Run.` }
  ]
};

// Helper function to generate HTML for the action pills
function buildActionHTML(actionList) {
  return actionList.map(action => `
    <details class="action-pill" data-name="${action.name}" data-desc="${action.desc}" data-tags="${action.tags.join(' ')}" data-action-type="${action.type || 'free'}">
      <summary>${action.name} <span class="tag-hint">(${action.tags.join(', ')})</span></summary>
      <p class="action-desc">${action.desc}</p>
    </details>
  `).join('');
}

const htmlContent = `
<style>
  .mythras-macro { font-family: var(--font-primary); color: var(--color-text-dark-primary); display: flex; flex-direction: column; height: 100%; }
  .mythras-filters { display: flex; flex-wrap: wrap; gap: 10px; background: rgba(0, 0, 0, 0.1); padding: 10px; border-radius: 5px; margin-bottom: 10px; border: 1px solid var(--color-border-dark); flex-shrink: 0; }
  .mythras-filters label { cursor: pointer; font-weight: bold; display: flex; align-items: center; gap: 4px; }
  
  .mythras-tabs { display: flex; gap: 5px; border-bottom: 2px solid var(--color-border-dark-tertiary); margin-bottom: 10px; flex-shrink: 0; }
  .mythras-tab-btn { background: rgba(0, 0, 0, 0.05); border: 1px solid var(--color-border-dark-tertiary); border-bottom: none; padding: 8px 12px; cursor: pointer; border-radius: 5px 5px 0 0; font-weight: bold; transition: all 0.2s; }
  .mythras-tab-btn.active { background: rgba(0, 0, 0, 0.2); box-shadow: inset 0 0 5px rgba(0,0,0,0.5); }
  
  .mythras-tab-content { display: none; flex: 1; overflow-y: auto; padding-right: 5px; min-height: 250px; }
  .mythras-tab-content.active { display: block; }
  
  .action-pill { background: rgba(255, 255, 255, 0.5); border: 1px solid var(--color-border-dark); border-radius: 6px; margin-bottom: 8px; padding: 8px; transition: all 0.2s; }
  .action-pill:hover { background: rgba(255, 255, 255, 0.8); }
  .action-pill.selected-pill { border-color: var(--color-text-dark-primary); box-shadow: 0 0 5px var(--color-shadow-highlight); background: rgba(0, 0, 0, 0.1); }
  .action-pill summary { font-weight: bold; font-size: 1.1em; cursor: pointer; outline: none; list-style-position: inside; }
  .action-pill .tag-hint { font-size: 0.75em; color: #555; font-weight: normal; font-style: italic; }
  .action-pill .action-desc { margin: 8px 0 0 0; font-size: 0.95em; padding-left: 15px; border-left: 2px solid var(--color-border-dark-tertiary); }
</style>

<div class="mythras-macro">
  <div class="mythras-filters">
    <span><strong>Filters:</strong></span>
    <label><input type="checkbox" class="filter-cb" value="melee"> Melee</label>
    <label><input type="checkbox" class="filter-cb" value="ranged"> Ranged</label>
    <label><input type="checkbox" class="filter-cb" value="magic"> Magic</label>
    <label><input type="checkbox" class="filter-cb" value="movement"> Movement</label>
    <label><input type="checkbox" class="filter-cb" value="general"> General</label>
  </div>

  <div class="mythras-tabs">
    <div class="mythras-tab-btn active" data-tab="proactive">Proactive</div>
    <div class="mythras-tab-btn" data-tab="reactive">Reactive</div>
    <div class="mythras-tab-btn" data-tab="free">Free</div>
    <label><input type="checkbox" class="spend-ap" value="spend-ap" checked>Spend AP</label>
  </div>

  <div id="tab-proactive" class="mythras-tab-content active">
    ${buildActionHTML(actionData.proactive)}
  </div>
  <div id="tab-reactive" class="mythras-tab-content">
    ${buildActionHTML(actionData.reactive)}
  </div>
  <div id="tab-free" class="mythras-tab-content">
    ${buildActionHTML(actionData.free)}
  </div>
</div>
`;

new Dialog({
  title: "Combat Actions",
  content: htmlContent,
  buttons: {
    post: {
      icon: '<i class="fas fa-comment"></i>',
      label: "Post to Chat",
      callback: async (html) => {
        // Find the selected pill inside the dialog content
        const selectedPill = $(html).find('.action-pill.selected-pill');
        const spendAP = $(html).find('.spend-ap').is(':checked');
        
        if (!selectedPill.length) {
          ui.notifications.warn("Please select an action by clicking it first.");
          return false; // Prevents the dialog from closing when warning
        }

        const actionName = selectedPill.data('name');
        const actionDesc = selectedPill.data('desc');
        const actionType = selectedPill.data('action-type');

        const token = canvas.tokens.controlled[0];
        const actor = token?.actor;
        const targets = Array.from(game.user.targets);

        const speaker = ChatMessage.getSpeaker({ token: token?.document });
        const targetText = targets.length > 0 ? ` <span style="font-size: 0.8em; color: var(--color-text-dark-secondary);">Target(s): <strong>${targets.map(t => t.name).join(', ')}</strong></span>` : "";

        let chatContent = `
          <div class="mythras-chat-card" style="font-family: var(--font-primary);">
            <h3 style="border-bottom: 2px solid var(--color-border-dark-tertiary); padding-bottom: 4px; margin-bottom: 6px;">
              <i class="fas fa-khanda"></i> <strong>${actionName}</strong>
            </h3>
            <p style="font-size: 0.95em; color: var(--color-text-dark-primary); margin-top: 0;">
              ${targetText}
            </p>
            <p style="font-size: 0.95em; color: var(--color-text-dark-primary); margin-top: 0;">
              ${actionDesc}
            </p>
          </div>
        `;

        let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
        let newAp = currentAP - 1;
        if (newAp < 0) newAp = 0;

        if (spendAP && actionType !== "free") {
          const actionPointReducedLabel = `<p style="font-size: 0.85em; color: var(--color-text-dark-secondary); margin-top: 4px;">Action Points reduced by 1. ${newAp} Action Points remaining.</p>`;
          chatContent += `${actionPointReducedLabel}`; 
          await actor.update({ 
              "system.trackedStats.actionPoints.value": String(newAp),
              "system.currentActionPoints": newAp,
              "system.attributes.actionPoints.value": newAp 
          });
        }

        ChatMessage.create({
          speaker: speaker,
          content: chatContent
        });
        
        return false; // Keeps the dialog open so you can post multiple actions in a row
      }
    },
    close: {
      icon: '<i class="fas fa-times"></i>',
      label: "Close"
    }
  },
  default: "post",
  render: (html) => {
    // 1. Handle Tab Switching
    const tabBtns = html.find('.mythras-tab-btn');
    const tabContents = html.find('.mythras-tab-content');

    tabBtns.on('click', (e) => {
      tabBtns.removeClass('active');
      tabContents.removeClass('active');
      
      const target = $(e.currentTarget);
      target.addClass('active');
      html.find(`#tab-${target.data('tab')}`).addClass('active');
    });

    // 2. Handle Dynamic Tag Filtering
    const checkboxes = html.find('.filter-cb');
    const pills = html.find('.action-pill');

    checkboxes.on('change', () => {
      const activeFilters = checkboxes.filter(':checked').map(function() {
        return this.value;
      }).get();

      pills.each(function() {
        const pill = $(this);
        const tags = pill.data('tags').split(' ');

        if (activeFilters.length === 0) {
          pill.show();
        } else {
          const hasMatch = activeFilters.some(filter => tags.includes(filter));
          hasMatch ? pill.show() : pill.hide();
        }
      });
    });

    // 3. Handle Action Selection
    html.find('.action-pill summary').on('click', function() {
      html.find('.action-pill').removeClass('selected-pill');
      $(this).parent('.action-pill').addClass('selected-pill');
    });
  }
}, { width: 550, height: 775, resizable: true }).render(true);