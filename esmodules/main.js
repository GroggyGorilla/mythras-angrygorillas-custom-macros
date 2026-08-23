// main.js
// Tested on Foundry v13


const MAGCM_MODULE_ID = "mythras-angrygorillas-custom-macros";
const MAGCM_ICONS_PATH = "modules/mythras-angrygorillas-custom-macros/images/icons/";

// Damaged/Broken indicator for weapons (HP) and armor (AP) against their homebrew-tracked original value
function getMAGCMConditionBadge(item, currentValue, originalField, statLabel) {
    try {
        if (!game.settings.get(MAGCM_MODULE_ID, "enableHomebrewRulesAndContent")) return null;
    } catch (e) {
        return null;
    }
    const customData = item.getFlag(MAGCM_MODULE_ID, "customData") || {};
    const original = Number(customData[originalField]);
    const current = Number(currentValue);
    if (!Number.isFinite(original) || original <= 0 || !Number.isFinite(current)) return null;
    if (current <= 0) return { level: "broken", label: "Broken", text: `Broken (0/${original} ${statLabel})`, icon: "fa-xmark", color: "#ff4444" };
    if (current < original) return { level: "damaged", label: "Damaged", text: `Damaged (${current}/${original} ${statLabel})`, icon: "fa-triangle-exclamation", color: "#ffb84d" };
    return null;
}

function getMAGCMSkillValue(item) {
    if (!item) return 0;
    return item.totalVal ?? item.system?.skillLevel ?? item.system?.value ?? 0;
}

function getMAGCMActorSizValue(actor) {
    const candidates = [
        actor?.characteristics?.siz,
        actor?.system?.characteristics?.siz?.value,
        actor?.system?.characteristics?.siz,
        actor?.statTracker?.characteristics?.siz?.value,
        actor?.statTracker?.characteristics?.siz
    ];
    for (const value of candidates) {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return null;
}

function getMAGCMHitLocationMaxHp(loc) {
    const derived = Number(loc?.maxHp);
    if (Number.isFinite(derived)) return derived;
    const candidates = [
        loc?.system?.maxHp,
        loc?.system?.hp?.max,
        loc?.system?.hpMax
    ];
    for (const value of candidates) {
        const n = Number(value);
        if (Number.isFinite(n)) return n;
    }
    return 0;
}

function normalizeMAGCMWeaponSizeRank(sizeLabel) {
    const normalized = String(sizeLabel || "").trim().toLowerCase();
    if (!normalized) return null;
    if (["s", "small"].includes(normalized)) return 0;
    if (["m", "medium"].includes(normalized)) return 1;
    if (["l", "large"].includes(normalized)) return 2;
    if (["h", "huge"].includes(normalized)) return 3;
    if (["e", "enormous", "be", "beyond enormous", "colossal"].includes(normalized)) return 4;
    return null;
}

function getMAGCMImpaledRollModifier(actor) {
    const hitLocations = actor?.items?.filter(i => i.type === "hitLocation") || [];
    const impaleRecords = [];
    for (const loc of hitLocations) {
        const stored = loc.getFlag(MAGCM_MODULE_ID, "impaledBy");
        if (!stored) continue;
        const records = Array.isArray(stored) ? stored : [stored];
        impaleRecords.push(...records);
    }
    if (impaleRecords.length === 0) return null;

    let largestRank = 0;
    for (const record of impaleRecords) {
        const rank = normalizeMAGCMWeaponSizeRank(record?.weaponSize);
        if (rank !== null) largestRank = Math.max(largestRank, rank);
    }

    const siz = getMAGCMActorSizValue(actor);
    if (!Number.isFinite(siz) || siz <= 0) {
        return { name: "Impaled", value: "No Effect" };
    }

    // Table progression: each +10 SIZ shifts the effective difficulty one step easier.
    const band = Math.floor((siz - 1) / 10);
    const severityIndex = Math.max(0, Math.min(4, largestRank + (2 - band)));
    const values = ["No Effect", "Hard Difficulty", "Formidable Difficulty", "Herculean Difficulty", "Incapacitated"];
    return { name: "Impaled", value: values[severityIndex] };
}

function getMAGCMEntangledRollModifier(actor) {
    const entangledLocations = actor?.items?.filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "entangledBy")) || [];
    const entangledOtherCount = Math.min(3, entangledLocations.filter(loc => !/arm/i.test(loc.name) && !/leg/i.test(loc.name)).length);
    if (entangledOtherCount <= 0) return null;
    const stepWord = ["", "One", "Two", "Three"][entangledOtherCount];
    return { name: "Entangled", value: `${stepWord} Step Penalty` };
}

function mergeMAGCMRollModifiers(baseModifiers, actor) {
    const merged = Array.isArray(baseModifiers) ? [...baseModifiers] : [];
    const existingNames = new Set(merged.map(m => String(m?.name || "").trim().toLowerCase()));
    const impaledModifier = getMAGCMImpaledRollModifier(actor);
    if (impaledModifier && !existingNames.has("impaled")) merged.push(impaledModifier);
    const entangledModifier = getMAGCMEntangledRollModifier(actor);
    if (entangledModifier && !existingNames.has("entangled")) merged.push(entangledModifier);
    return merged;
}

function getMAGCMSkillRollModifiers(actor, skill) {
    const nativeGet = actor?.sheet?.roller?.getSkillRollModifiers;
    if (typeof nativeGet !== "function") return mergeMAGCMRollModifiers([], actor);
    let nativeModifiers = [];
    try {
        nativeModifiers = nativeGet.call(actor.sheet.roller, skill) || [];
    } catch (e) {
        console.warn(`${MAGCM_MODULE_ID} | Could not retrieve native roll modifiers`, e);
    }
    return mergeMAGCMRollModifiers(nativeModifiers, actor);
}

function ensureMAGCMRollModifierInjection() {
    const rollers = [];
    for (const actor of game.actors ?? []) {
        const roller = actor?.sheet?.roller;
        if (roller && typeof roller.getSkillRollModifiers === "function") rollers.push(roller);
    }

    for (const roller of rollers) {
        const proto = Object.getPrototypeOf(roller);
        if (!proto || typeof proto.getSkillRollModifiers !== "function" || proto._magcmRollModifiersWrapped) continue;
        const originalGet = proto.getSkillRollModifiers;
        proto.getSkillRollModifiers = function (skill, ...args) {
            let nativeModifiers = [];
            try {
                nativeModifiers = originalGet.call(this, skill, ...args) || [];
            } catch (e) {
                console.warn(`${MAGCM_MODULE_ID} | Native getSkillRollModifiers failed`, e);
            }
            return mergeMAGCMRollModifiers(nativeModifiers, this.actor);
        };
        Object.defineProperty(proto, "_magcmRollModifiersWrapped", { value: true, configurable: true });
    }
}

globalThis.MAGCM_getSkillRollModifiers = getMAGCMSkillRollModifiers;

async function spendMAGCMLuckPoint(actor) {
    const luckPath = actor?.system?.trackedStats?.luckPoints;
    const currentLuck = Number(luckPath?.value ?? 0);
    if (currentLuck <= 0) {
        ui.notifications.warn("No Luck points available on character sheet!");
        return false;
    }

    await actor.update({ "system.trackedStats.luckPoints.value": currentLuck - 1 });
    ui.notifications.info(`Spent 1 Luck point for ${actor.name}. (${currentLuck - 1} remaining)`);
    return true;
}

globalThis.MAGCM_spendLuckPoint = spendMAGCMLuckPoint;

// Register toggleable settings when Foundry initializes
Hooks.once("init", () => {
    game.settings.register(MAGCM_MODULE_ID, "enableBleedingFatigue", {
        name: "Bleeding Fatigue Progression",
        hint: "Automatically degrades a character's fatigue level by one step at the start of each combat round if they have the bleeding status effect.",
        scope: "world", // World scope ensures it applies globally for all players managed by the GM
        config: true,   // true makes it show up in the Configure Settings menu
        type: Boolean,  // Defines it as a toggle switch
        default: true  // Default state when first installed
    });
    game.settings.register(MAGCM_MODULE_ID, "enableMovementStateControlInCombat", {
        name: "Movement State Control in Combat",
        hint: "Allows for the control of movement states during combat turns. Prompts will be posted in the chat automatically for each character on their first turn of every round to allow them to choose their movement state.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MAGCM_MODULE_ID, "enableReachMechanics", {
        name: "Reach Mechanics",
        hint: "Enables the use of reach and range-related macros and mechanics for melee engagements.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(MAGCM_MODULE_ID, "enableArmourOverlayIcons", {
        name: "Armour Overlay Icons",
        hint: "Displays an icon on tokens of characters with equipped armour. Hovering over the icon will show the armour pieces names and the hit locations they are currently equipped on.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(MAGCM_MODULE_ID, "enableEnduranceRollPromptsInCombat", {
        name: "Endurance Roll Prompts in Combat",
        hint: "Automatically prompts players to roll endurance checks on their first turn of a combat round if they meet the conditions.",
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(MAGCM_MODULE_ID, "enableHomebrewRulesAndContent", {
        name: "Angry Gorilla's Homebrew Rules and Content",
        hint: "This setting is used to toggle on or off small homebrew content and rules that may be added. (e.g. Homebrew special effect to re-roll damage.)",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MAGCM_MODULE_ID, "enableShowEquippedItemsOnToken", {
        name: "Show Equipped Items on Token",
        hint: `Enabling this will allow all users to Ctrl+Hover on a token to see a tooltip listing all of their items that have the storage set to "Equipped". If the item is a storage item, it will only show up in this list if they are currently being carried. The tooltip also provides filters.`,
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
});

Hooks.on("ready", () => {
    try {
        ensureMAGCMRollModifierInjection();
    } catch (e) {
        console.warn(`${MAGCM_MODULE_ID} | Failed to inject custom roll modifiers into Mythras roller`, e);
    }

    if (!game.settings.get(MAGCM_MODULE_ID, "enableMovementStateControlInCombat")) return;
    // -- MOVEMENT RELATED FUNCTIONALITY --
    // ==========================================
    // Movement State Configuration & Helpers
    // ==========================================
    console.log("MAGCM: Movement State Control in Combat is enabled. Movement state prompts will be posted in chat for each character on their first turn of every round.");
    const MOVEMENT_STATES = [
        "Movement - Walk",
        "Movement - Run",
        "Movement - Sprint",
        "Movement - Climb",
        "Movement - Swim"
    ];

    const MOVEMENT_ICONS = {
        "Movement - Walk": `${MAGCM_ICONS_PATH}movement/move_walk.svg`,
        "Movement - Run": `${MAGCM_ICONS_PATH}movement/move_run.svg`,
        "Movement - Sprint": `${MAGCM_ICONS_PATH}movement/move_sprint.svg`,
        "Movement - Climb": `${MAGCM_ICONS_PATH}movement/move_climb.svg`,
        "Movement - Swim": `${MAGCM_ICONS_PATH}movement/move_swim.svg`
    };

    /**
     * Removes any existing movement state Active Effect from a given actor.
     */
    async function clearActorMovementStates(actor) {
        if (!actor) return;
        const effectsToRemove = actor.effects
            .filter(e => MOVEMENT_STATES.includes(e.name))
            .map(e => e.id);
            
        if (effectsToRemove.length > 0) {
            await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
        }
    }

    /**
     * Applies a specified movement state to an actor, clearing existing ones first.
     */
    async function setActorMovementState(actor, stateName) {
        if (!actor) return;
        await clearActorMovementStates(actor);

        if (stateName && MOVEMENT_STATES.includes(stateName)) {
            const effectData = {
                name: stateName,
                img: MOVEMENT_ICONS[stateName] || "icons/svg/walk.svg",
                statuses: [stateName.toLowerCase().replace(/[^a-z0-9]+/g, '-')]
            };
            
            await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
        }
    }
    /**
     * Opens the Set Movement dialog for a given actor.
     */
    function openMovementDialog(actor) {
        if (!actor) {
            return ui.notifications.warn("No actor specified for movement state.");
        }

        const currentEffect = actor.effects.find(e => MOVEMENT_STATES.includes(e.name));
        const activeState = currentEffect ? currentEffect.name : "";

        const optionsHtml = MOVEMENT_STATES.map(st => {
            const selected = st === activeState ? "selected" : "";
            return `<option value="${st}" ${selected}>${st}</option>`;
        }).join("");

        new Dialog({
            title: `Set Movement State - ${actor.name}`,
            content: `
                <form style="margin-bottom: 10px;">
                    <p>Select a movement mode for <strong>${actor.name}</strong>:</p>
                    <div style="margin-top: 5px;">
                        <select id="movementSelect" style="width: 100%;">
                            <option value="">-- None / Clear --</option>
                            ${optionsHtml}
                        </select>
                    </div>
                </form>
            `,
            buttons: {
                apply: {
                    icon: '<i class="fas fa-check"></i>',
                    label: "Apply",
                    callback: async (html) => {
                        const chosenState = html.find('#movementSelect').val();
                        await setActorMovementState(actor, chosenState);
                        if (chosenState) {
                            ui.notifications.info(`${actor.name} movement set to: ${chosenState}`);
                        } else {
                            ui.notifications.info(`${actor.name} movement state cleared.`);
                        }
                    }
                },
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel"
                }
            },
            default: "apply"
        }).render(true);
    }

    /**
     * Clears movement states from literally ALL actors in the game world.
     */
    async function clearAllMovementStates() {
        let clearedCount = 0;
        for (let actor of game.actors) {
            const effectsToRemove = actor.effects
                .filter(e => MOVEMENT_STATES.includes(e.name))
                .map(e => e.id);
            if (effectsToRemove.length > 0) {
                await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
                clearedCount++;
            }
        }
        ui.notifications.info(`Cleared movement states from ${clearedCount} character(s).`);
    }

    // Combat Turn Movement Prompt
    Hooks.on("updateCombat", async (combat, changed, options, userId) => {
        // Execute only on the active GM client to prevent duplicate prompts
        if (game.user !== game.users.activeGM) return;

        // Check if combat has started and turn or round changed
        const turnChanged = "turn" in changed || "round" in changed;
        if (!combat.started || !turnChanged) return;

        const combatant = combat.combatant;
        const actor = combatant?.actor;
        if (!combatant || !actor) return;

        // Check if this specific combatant was already prompted this round
        const lastPromptedRound = combatant.getFlag("world", "lastPromptedRound");
        if (lastPromptedRound === combat.round) return;

        // Mark this combatant as prompted for the current round
        await combatant.setFlag("world", "lastPromptedRound", combat.round);

        const currentEffect = actor.effects.find(e => MOVEMENT_STATES.includes(e.name));
        const currentMode = currentEffect ? currentEffect.name : "None / Unset";

        const content = `
            <div class="movement-prompt-card">
                <p><strong>Round ${combat.round}</strong></p>
                <p><strong>${actor.name}</strong>'s turn (Current Mode: <strong>${currentMode}</strong>).</p>
                <button class="btn-movement-dialog" data-actor-id="${actor.id}" style="margin-top: 5px;">
                    <i class="fas fa-running"></i> Set Movement State
                </button>
            </div>
        `;

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: content,
            flavor: `Round ${combat.round} - Movement Check`
        });
    });

    // Listener for chat card button clicks
    $(document).on("click", ".btn-movement-dialog", function(e) {
        e.preventDefault();
        const actorId = this.dataset.actorId;
        const actor = game.actors.get(actorId) || canvas.tokens.placeables.find(t => t.actor?.id === actorId)?.actor;
        
        if (actor) {
            openMovementDialog(actor);
        } else {
            ui.notifications.warn("Actor could not be found.");
        }
    });

    // Global Exports for Macro Usage
    globalThis.openMovementDialog = openMovementDialog;
    globalThis.clearActorMovementStates = clearActorMovementStates;
    globalThis.setActorMovementState = setActorMovementState;
    globalThis.clearAllMovementStates = clearAllMovementStates;
    // ==========================================
});

Hooks.on("renderActorSheet", () => {
    try {
        ensureMAGCMRollModifierInjection();
    } catch (e) {
        console.warn(`${MAGCM_MODULE_ID} | Failed to refresh roller injection`, e);
    }
});

// Maximise Damage (special effect): substitutes 'stacks' worth of the weapon's leading dice term for its maximum face value
function applyMaximiseDamage(formula, stacks) {
    const count = Number(stacks) || 0;
    if (count <= 0) return formula;
    const match = String(formula).trim().match(/^(\d*)d(\d+)/i);
    if (!match) return formula;
    const diceCount = parseInt(match[1] || "1", 10);
    const sides = parseInt(match[2], 10);
    const applied = Math.min(count, diceCount);
    const remainingCount = diceCount - applied;
    const rest = String(formula).trim().slice(match[0].length);
    const maximisedFlat = applied * sides;
    const remainingTerm = remainingCount > 0 ? `${remainingCount}d${sides}` : "";
    return remainingTerm ? `${maximisedFlat}+${remainingTerm}${rest}` : `${maximisedFlat}${rest}`;
}

// Describes each individual die/flat term of an evaluated Roll (e.g. "2d6: 4, 5 | +3") so the attack card can
// show a hover tooltip clarifying which rolls added up to the displayed damage total. When weaponFormula is
// supplied, the leading segments (matching the weapon/base formula's own term count) are labeled separately
// from any trailing segments contributed by the character's Damage Modifier.
function countMAGCMFormulaSegments(formula) {
    if (!formula) return 0;
    const matches = String(formula).match(/(\d*d\d+|\d+)/gi);
    return matches ? matches.length : 0;
}

function describeMAGCMRollBreakdown(roll, weaponFormula = "", modifierFormula = "") {
    if (!roll || !Array.isArray(roll.terms)) return "";
    const segments = [];
    for (const term of roll.terms) {
        if (Array.isArray(term.results) && term.results.length > 0) {
            const values = term.results.map(r => r.result).join(", ");
            segments.push(`${term.number}d${term.faces}: ${values}`);
        } else if (typeof term.number === "number") {
            segments.push(`${term.number >= 0 ? "+" : ""}${term.number}`);
        }
    }

    if (!weaponFormula && !modifierFormula) return segments.join("  ");

    const weaponSegmentCount = countMAGCMFormulaSegments(weaponFormula);
    const weaponSegments = segments.slice(0, weaponSegmentCount);
    const modifierSegments = segments.slice(weaponSegmentCount);

    const lines = [];
    if (weaponSegments.length > 0) lines.push(`<strong>Weapon (${weaponFormula}):</strong> ${weaponSegments.join("  ")}`);
    if (modifierSegments.length > 0) lines.push(`<strong>Damage Modifier (${modifierFormula}):</strong> ${modifierSegments.join("  ")}`);
    return lines.length > 0 ? lines.join("<br/>") : segments.join("  ");
}

const MAGCM_SKILL_TYPE_PRIORITY = {
    standardSkill: 0,
    professionalSkill: 1,
    combatStyle: 2,
    magicSkill: 3,
    passion: 4
};

function getMAGCMSkillTypePriority(skill) {
    if (!skill?.type) return 99;
    return MAGCM_SKILL_TYPE_PRIORITY[skill.type] ?? 99;
}

function getMAGCMActorSkillOptions(actor) {
    if (!actor?.items) return [];
    return actor.items
        .filter(skill => ["standardSkill", "professionalSkill", "combatStyle", "magicSkill", "passion"].includes(skill.type))
        .sort((a, b) => {
            const typeDelta = getMAGCMSkillTypePriority(a) - getMAGCMSkillTypePriority(b);
            if (typeDelta !== 0) return typeDelta;
            return (a.name || "").localeCompare(b.name || "");
        });
}

function getMAGCMSelectableAugmentSkills(targetActors = []) {
    const actors = (targetActors || []).filter(Boolean);
    const options = [];
    for (const actor of actors) {
        const skills = getMAGCMActorSkillOptions(actor);
        for (const skill of skills) {
            const value = Number(getMAGCMSkillValue(skill)) || 0;
            options.push({
                actor,
                skill,
                label: `${actor.name} — ${skill.name} (${value}%)`,
                valueKey: `${actor.id}:${skill.id}`,
                skillValue: value
            });
        }
    }
    return options;
}

function getMAGCMAugmentActorOptions(actor, targetActors = []) {
    const actors = [actor, ...(targetActors || [])].filter(Boolean);
    return [...new Map(actors.map(candidate => [candidate.id, candidate])).values()];
}

function getMAGCMAugmentOptionsForActor(actor) {
    return getMAGCMSelectableAugmentSkills(actor ? [actor] : []);
}

function buildMAGCMAugmentActorOptions(actorOptions, selectedActorId) {
    return actorOptions.map(candidate => `<option value="${candidate.id}" ${candidate.id === selectedActorId ? "selected" : ""}>${candidate.name}</option>`).join("");
}

function buildMAGCMAugmentSkillOptions(skillOptions, emptyLabel = "No skills available") {
    return skillOptions.length > 0
        ? skillOptions.map(option => `<option value="${option.valueKey}">${option.skill.name} (${option.skillValue}%)</option>`).join("")
        : `<option value="">${emptyLabel}</option>`;
}

// Tracked via a WeakSet (not a DOM attribute) since Foundry re-parses a brand new element from the
// stored chat message HTML on every re-render - a serialized "already attached" marker would persist
// into that fresh markup and permanently skip attaching listeners to it.
const magcmInfoTooltipElements = new WeakSet();

// Generic hover-tooltip attacher shared by every "info pill" on the attack card (damage, hit location,
// worn armour, etc.) so they all share one consistent look. `titleHtml` is static per-element, while
// `getBodyHtml` is re-evaluated on every hover so the tooltip always reflects the element's latest state
// (e.g. after Choose Location or a damage re-roll updates the element's dataset). `getThemeClass` (string
// or function) tints the shared tooltip box to match the colour of the pill that triggered it.
function attachMAGCMInfoTooltip(element, titleHtml, getBodyHtml, getThemeClass) {
    if (!element || magcmInfoTooltipElements.has(element)) return;
    magcmInfoTooltipElements.add(element);

    const tooltipId = "magcm-damage-tooltip";
    let tooltip = document.getElementById(tooltipId);
    if (!tooltip) {
        tooltip = document.createElement("div");
        tooltip.id = tooltipId;
        tooltip.className = "magcm-damage-tooltip";
        tooltip.hidden = true;
        document.body.appendChild(tooltip);
    }

    // Keep the tooltip fully on-screen; the info pill often sits near the chat log's edge.
    const moveTooltip = event => {
        const margin = 8;
        const maxLeft = window.innerWidth - tooltip.offsetWidth - margin;
        const maxTop = window.innerHeight - tooltip.offsetHeight - margin;
        tooltip.style.left = `${Math.max(margin, Math.min(event.clientX + 14, maxLeft))}px`;
        tooltip.style.top = `${Math.max(margin, Math.min(event.clientY - 12, maxTop))}px`;
    };
    const showTooltip = event => {
        const body = typeof getBodyHtml === "function" ? getBodyHtml() : "";
        if (!body) return;
        const themeClass = typeof getThemeClass === "function" ? getThemeClass() : (getThemeClass || "");
        tooltip.className = ["magcm-damage-tooltip", themeClass].filter(Boolean).join(" ");
        tooltip.innerHTML = `<div class="magcm-damage-tooltip__title">${titleHtml}</div><div class="magcm-damage-tooltip__body">${body}</div>`;
        tooltip.hidden = false;
        moveTooltip(event);
    };
    const hideTooltip = () => {
        tooltip.hidden = true;
    };

    // No native "title" attribute is ever set on these elements, and pointer events are stopped from bubbling
    // so no other module/core listener (e.g. Foundry's own [data-tooltip] tooltip manager) can also react to
    // the same hover and layer a second, unrelated tooltip on top of ours.
    element.removeAttribute("title");
    element.addEventListener("pointerenter", event => { showTooltip(event); event.stopPropagation(); });
    element.addEventListener("pointermove", event => { moveTooltip(event); event.stopPropagation(); });
    element.addEventListener("pointerleave", event => { hideTooltip(); event.stopPropagation(); });
}

function attachMAGCMDamageTooltip(element, getBreakdown) {
    attachMAGCMInfoTooltip(element, '<i class="fas fa-dice-d20"></i> Damage Breakdown', getBreakdown, "magcm-theme-damage");
}

// Gathers everything the attack card's Hit Location / Worn Armor tooltips need to show for a given
// rolled or chosen hit location: HP + wound tier, natural armour, worn armour breakdown, cover, and wards.
function buildMAGCMHitLocationCardData(targetActor, hitLocationItem) {
    const armorPieces = Array.isArray(hitLocationItem.equippedArmor)
        ? hitLocationItem.equippedArmor.map(armor => ({ name: armor.name || armor.label || "Armor", ap: Number(armor.ap) || 0 }))
        : [];
    const equippedArmorAp = armorPieces.reduce((sum, piece) => sum + piece.ap, 0);
    const equippedArmorName = equippedArmorAp > 0 && hitLocationItem.equippedArmorNames
        ? hitLocationItem.equippedArmorNames
        : "None";

    const maxHp = Number(getMAGCMHitLocationMaxHp(hitLocationItem));
    const currentHp = Number(hitLocationItem.system?.currentHp ?? hitLocationItem.system?.hp?.value ?? maxHp);

    let woundLabel = "Healthy";
    if (Number.isFinite(maxHp) && maxHp > 0 && Number.isFinite(currentHp)) {
        if (currentHp <= -maxHp) woundLabel = "Major Wound";
        else if (currentHp <= 0) woundLabel = "Serious Wound";
        else if (currentHp < maxHp) woundLabel = "Minor Wound";
    }

    const inCover = Boolean(hitLocationItem.getFlag?.(MAGCM_MODULE_ID, "inCover"));
    const blockingWeaponId = hitLocationItem.getFlag?.(MAGCM_MODULE_ID, "blockingWeapon");
    const blockingWeapon = blockingWeaponId ? targetActor?.items.get(blockingWeaponId) : null;

    return {
        armor: equippedArmorAp,
        armorName: equippedArmorName,
        armorPieces,
        naturalArmor: hitLocationItem.naturalArmor || 0,
        totalArmor: hitLocationItem.totalAp || 0,
        currentHp,
        maxHp,
        woundLabel,
        inCover,
        wardedWeaponName: blockingWeapon?.name || null,
        wardedWeaponSize: blockingWeapon?.system?.size || null
    };
}

function renderMAGCMHitLocationResultText(location) {
    return location.name;
}

function renderMAGCMHitLocationTooltipHtml(location) {
    const hasHp = Number.isFinite(location.maxHp) && location.maxHp > 0;
    const hpLine = hasHp ? `${location.currentHp}/${location.maxHp} HP` : "Unknown HP";
    const woundSuffix = location.woundLabel && location.woundLabel !== "Healthy" ? ` (${location.woundLabel})` : "";
    const rollLine = location.chosen ? "Chosen" : (location.roll ?? "Unknown");
    const lines = [
        `<strong>Roll:</strong> ${rollLine}`,
        `<strong>HP:</strong> ${hpLine}${woundSuffix}`,
        `<strong>Natural Armor:</strong> ${location.naturalArmor || 0} AP`
    ];
    if (location.inCover) lines.push(`<strong style="color:#7fd17f;">Behind Cover</strong>`);
    if (location.wardedWeaponName) {
        const sizeSuffix = location.wardedWeaponSize ? ` (${location.wardedWeaponSize})` : "";
        lines.push(`<strong>Warded by:</strong> ${location.wardedWeaponName}${sizeSuffix}`);
    }
    return lines.join("<br/>");
}

function renderMAGCMLocationArmorTooltipHtml(location) {
    const pieces = Array.isArray(location.armorPieces) ? location.armorPieces.filter(p => p.ap > 0) : [];
    if (pieces.length === 0) {
        return location.armor > 0 ? `<strong>${location.armorName}:</strong> ${location.armor} AP` : "No worn armor equipped.";
    }
    const lines = pieces.map(p => `${p.name}: <strong>${p.ap} AP</strong>`);
    lines.push(`<strong>Total:</strong> ${location.armor} AP`);
    return lines.join("<br/>");
}

// Shared by every dialog (Attack/Parry/Evade) that embeds computed HTML inside an attribute value.
function escapeMAGCMTooltipAttr(text) {
    return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Skill Roll pill tooltip (Attack/Parry/Evade): shows what actually produced the target% used to resolve
// the roll, including any augmenting/capping skill and character, so the number on the card is never a
// mystery in hindsight.
function renderMAGCMSkillRollTooltipHtml({ skillName, effectiveSkillValue, diffText, targetValue, augmentLine }) {
    return [
        `<strong>Skill:</strong> ${skillName}`,
        `<strong>Effective Skill:</strong> ${effectiveSkillValue}%`,
        `<strong>Difficulty:</strong> ${diffText} (Target: ${targetValue}%)`,
        `<strong>Augment:</strong> ${augmentLine}`
    ].join("<br/>");
}

// Maps a roll's outcome label to the CSS theme class shared by the pill (via [data-result]) and its
// hover tooltip, so a Critical/Success/Failure/Fumble result is colour-consistent everywhere it appears.
function getMAGCMRollResultThemeClass(resultLabel) {
    const themes = {
        Critical: "magcm-theme-roll-critical",
        Success: "magcm-theme-roll-success",
        Failure: "magcm-theme-roll-failure",
        Fumble: "magcm-theme-roll-fumble"
    };
    return themes[resultLabel] || "";
}

// Builds the hoverable "roll result" pill used by the Attack/Parry/Evade chat cards: a coloured badge
// showing the raw roll and outcome word, with a tooltip detailing the skill/difficulty/augment behind it.
function buildMAGCMRollResultPillHtml({ rollTotal, resultLabel, skillName, effectiveSkillValue, diffText, targetValue, augmentLine }) {
    const tooltipHtml = escapeMAGCMTooltipAttr(renderMAGCMSkillRollTooltipHtml({ skillName, effectiveSkillValue, diffText, targetValue, augmentLine }));
    return `<div class="attack-roll-result-value attack-info-pill" data-result="${resultLabel}" data-magcm-tooltip="${tooltipHtml}"><span class="attack-roll-result-value__roll">${rollTotal}</span><span class="attack-roll-result-value__sep">-</span><span class="attack-roll-result-value__label">${resultLabel}</span></div>`;
}

// Builds the "Attacker vs Defender/Target" header row shared by the Attack/Parry/Evade chat cards.
function buildMAGCMCombatantsRowHtml(leftName, leftLabel, rightName, rightLabel) {
    return `
        <div class="attack-card-combatants">
            <div class="attack-card-combatant attack-card-combatant--left">
                <span class="attack-card-combatant__label">${leftLabel}</span>
                <span class="attack-card-combatant__name">${leftName}</span>
            </div>
            <div class="attack-card-combatant__vs">vs</div>
            <div class="attack-card-combatant attack-card-combatant--right">
                <span class="attack-card-combatant__label">${rightLabel}</span>
                <span class="attack-card-combatant__name">${rightName}</span>
            </div>
        </div>`;
}

// Builds the row of small stat pills (Weapon, Range, Combat Effects, etc.) shared by the Attack/Parry/Evade
// chat card headers, from a plain array of { label, value } entries.
function buildMAGCMStatsRowHtml(items) {
    if (!Array.isArray(items) || items.length === 0) return "";
    const statsHtml = items.map(item => `<span class="attack-card-stat"><span class="attack-card-stat__label">${item.label}</span><span class="attack-card-stat__value">${item.value}</span></span>`).join("");
    return `<div class="attack-card-stats-row">${statsHtml}</div>`;
}

function formatMAGCMSignedValue(value) {
    const numeric = Number(value) || 0;
    return `${numeric >= 0 ? "+" : ""}${numeric}`;
}

function getMAGCMEffectiveSkillWithCap(baseSkillValue, capSkillItem) {
    if (!capSkillItem) return baseSkillValue;
    const capValue = Number(getMAGCMSkillValue(capSkillItem)) || 0;
    return Math.min(Number(baseSkillValue) || 0, capValue);
}

// Stun Location (special effect): mirrors the wound icon naming scheme, defaulting non-humanoid locations to abdomen
function getStunLocationIconPath(locName) {
    let normalized = String(locName || "").replace(/ /g, "-").toLowerCase();
    const humanoidHitLocations = ["head", "chest", "abdomen", "right-arm", "left-arm", "right-leg", "left-leg"];
    if (!humanoidHitLocations.includes(normalized)) normalized = "abdomen";
    return `${MAGCM_ICONS_PATH}conditions/stun/stun_${normalized}.svg`;
}

// Weapon/armour overlay tooltips cache their HTML keyed off item state and only rebuild on refreshToken,
// so any HP/AP/condition change (from macros, sockets, or manual item-sheet edits) must force that refresh.
Hooks.on("updateItem", (item, changes) => {
    if (!["melee-weapon", "ranged-weapon", "armor"].includes(item.type)) return;
    const relevant = foundry.utils.hasProperty(changes, "system.hp")
        || foundry.utils.hasProperty(changes, "system.ap")
        || foundry.utils.hasProperty(changes, `flags.${MAGCM_MODULE_ID}.customData`);
    if (!relevant) return;

    const actor = item.actor;
    if (!actor) return;
    canvas.tokens.placeables.filter(t => t.actor?.id === actor.id).forEach(t => t.refresh());
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

    // Attack damage and hit location are rolled as explicit stages on the same card.
    const hitLocationRollButton = html[0].querySelector('.roll-hit-location');
    const attackDamageRollButton = html[0].querySelector('.roll-attack-damage');
    const attackDamageRerollButton = html[0].querySelector('.reroll-attack-damage');
    const damageResultSpan = html[0].querySelector('.attack-damage-result');
    const hitLocationResultEl = html[0].querySelector('.attack-hit-location-result');
    const locationArmorEl = html[0].querySelector('.attack-location-armor');
    const attackRollResultEl = html[0].querySelector('.attack-roll-result-value');
    const bypassWornArmorToggle = html[0].querySelector('.attack-bypass-worn-armor');
    const bypassNaturalArmorToggle = html[0].querySelector('.attack-bypass-natural-armor');
    const halfDamageToggle = html[0].querySelector('.attack-half-damage');
    const impaleToggle = html[0].querySelector('.attack-impale-toggle');
    const sunderToggle = html[0].querySelector('.attack-sunder-toggle');
    const entangleToggle = html[0].querySelector('.attack-entangle-toggle');
    const stunLocationToggle = html[0].querySelector('.attack-stun-location-toggle');
    const attackHitLocationRolled = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location-rolled');
    const attackHitLocationChosen = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location-chosen');
    const attackDamageRolled = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-rolled');
    const attackContentElement = html[0].querySelector('.message-content') || html[0];
    const attackerUserId = html[0].querySelector('[data-attacker-user-id]')?.dataset.attackerUserId;
    const canControlAttack = game.user.isGM
        || attackerUserId === game.user.id
        || messageDoc.author?.id === game.user.id
        || messageDoc.user?.id === game.user.id;

    attachMAGCMDamageTooltip(damageResultSpan, () => damageResultSpan?.dataset.breakdown || damageResultSpan?.getAttribute('title') || "");
    attachMAGCMInfoTooltip(hitLocationResultEl, '<i class="fas fa-crosshairs"></i> Location Details', () => hitLocationResultEl?.dataset.magcmTooltip || "", "magcm-theme-location");
    attachMAGCMInfoTooltip(locationArmorEl, '<i class="fas fa-shield-alt"></i> Armour Breakdown', () => locationArmorEl?.dataset.magcmTooltip || "", "magcm-theme-armor");
    attachMAGCMInfoTooltip(attackRollResultEl, '<i class="fas fa-dice-d20"></i> Roll Details', () => attackRollResultEl?.dataset.magcmTooltip || "", () => getMAGCMRollResultThemeClass(attackRollResultEl?.dataset.result));

    async function playAttackRoll(roll) {
        if (!roll) return;
        if (roll && typeof game.dice3d?.showForRoll === 'function') {
            console.log("Rolling animation.");
            await game.dice3d.showForRoll(roll, game.user, true);
        }
    }

    async function updateAttackCard(flagUpdates = {}) {
        const updateData = { content: attackContentElement.innerHTML };
        for (const [flagName, flagValue] of Object.entries(flagUpdates)) {
            updateData[`flags.${MAGCM_MODULE_ID}.${flagName}`] = flagValue;
        }

        await messageDoc.update(updateData);
    }

    async function updateHitLocationHp(targetToken, targetActor, hitLocationId, updatedHp, sourceUuid = null) {
        const updateData = [{
            _id: hitLocationId,
            "system.currentHp": updatedHp,
            [`flags.${MAGCM_MODULE_ID}.lastDamageOrigin`]: sourceUuid
        }];
        if (targetActor.canUserModify(game.user, "update")) {
            await targetActor.updateEmbeddedDocuments("Item", updateData);
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateHitLocationHp",
                targetTokenId: targetToken.id,
                hitLocationId,
                updatedHp,
                sourceUuid
            });
        }
    }

    // Generic embedded-Item field updater (armor AP, natural armor, entangle flags, etc.), relayed via GM socket if unowned
    async function updateItemField(targetToken, targetActor, itemId, fields) {
        if (targetActor.canUserModify(game.user, "update")) {
            await targetActor.updateEmbeddedDocuments("Item", [{ _id: itemId, ...fields }]);
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateItemFields",
                targetTokenId: targetToken.id,
                itemId,
                fields
            });
        }
    }

    // Sunder (special effect): surplus damage beyond a location's Armour Points reduces that armour's AP, then any excess carries over to HP
    async function applySunder(targetToken, targetActor, hitLocation, totalDamage, wornArmorAp, naturalArmorAp) {
        const totalArmor = wornArmorAp + naturalArmorAp;
        const usedArmor = Math.min(totalDamage, totalArmor);
        const hpDamage = Math.max(0, totalDamage - totalArmor);

        const equippedArmorItems = targetActor.items.filter(i => i.type === "armor" && i.system?.equipped
            && (i.system?.location || []).includes(hitLocation.id));

        let remaining = usedArmor;
        const wornReductions = [];
        for (const armorItem of equippedArmorItems) {
            if (remaining <= 0) break;
            const currentAp = Number(armorItem.system?.ap) || 0;
            const reduceBy = Math.min(currentAp, remaining);
            if (reduceBy > 0) {
                await updateItemField(targetToken, targetActor, armorItem.id, { "system.ap": currentAp - reduceBy });
                wornReductions.push({ name: armorItem.name, reduceBy, newAp: currentAp - reduceBy });
                remaining -= reduceBy;
            }
        }

        let naturalReduceBy = 0;
        let newNaturalArmor = naturalArmorAp;
        if (remaining > 0 && naturalArmorAp > 0) {
            naturalReduceBy = Math.min(naturalArmorAp, remaining);
            newNaturalArmor = naturalArmorAp - naturalReduceBy;
            await updateItemField(targetToken, targetActor, hitLocation.id, { "system.naturalArmor": newNaturalArmor });
        }

        return { hpDamage, usedArmor, wornReductions, naturalReduceBy, newNaturalArmor };
    }

    // Entangle (special effect): flags the struck location as entangled, mirroring the impaledBy data shape
    async function applyEntangle(targetToken, targetActor, hitLocation, attackerActor, weapon) {
        const entangleData = {
            attackerActorId: attackerActor?.id || null,
            attackerName: attackerActor?.name || "Unknown",
            weaponId: weapon?.id || null,
            weaponName: weapon?.name || "Weapon"
        };
        await updateItemField(targetToken, targetActor, hitLocation.id, { [`flags.${MAGCM_MODULE_ID}.entangledBy`]: entangleData });
        return entangleData;
    }

    const getImpaleRecords = (hitLocation) => {
        const stored = hitLocation?.getFlag(MAGCM_MODULE_ID, "impaledBy");
        if (Array.isArray(stored)) return stored;
        return stored ? [stored] : [];
    };

    async function updateImpaleState(targetToken, targetActor, hitLocation, attackerActor, weapon, impaledData, impaleId = null) {
        const isProjectile = impaledData?.isProjectile || weapon?.type === "ranged-weapon";
        const isRemovingImpale = !impaledData;
        const canUpdateDirectly = targetActor.canUserModify(game.user, "update")
            && (isRemovingImpale || isProjectile || attackerActor?.canUserModify(game.user, "update"));
        if (canUpdateDirectly) {
            if (isProjectile) {
                const records = getImpaleRecords(hitLocation);
                const remaining = impaledData
                    ? [...records, impaledData]
                    : records.filter(record => record.impaleId !== impaleId);
                if (remaining.length) await hitLocation.setFlag(MAGCM_MODULE_ID, "impaledBy", remaining);
                else await hitLocation.unsetFlag(MAGCM_MODULE_ID, "impaledBy");
            } else if (impaledData) {
                await hitLocation.setFlag(MAGCM_MODULE_ID, "impaledBy", impaledData);
                await weapon.setFlag(MAGCM_MODULE_ID, "impaled", impaledData);
            } else {
                await hitLocation.unsetFlag(MAGCM_MODULE_ID, "impaledBy");
                await weapon.unsetFlag(MAGCM_MODULE_ID, "impaled");
            }
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateImpaleState",
                targetTokenId: targetToken.id,
                targetLocationId: hitLocation.id,
                attackerActorId: attackerActor.id,
                weaponId: weapon.id,
                impaledData,
                impaleId
            });
        }
    }

    function updateDamageActionState() {
        const ready = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location-rolled'))
            && Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-rolled'));
        html[0].querySelectorAll('.submit-damage:not(.choose-location), .attack-impale-button, .attack-stun-location-button').forEach(button => {
            button.disabled = !ready;
        });
        const chooseLocationButton = html[0].querySelector('.choose-location');
        if (chooseLocationButton) chooseLocationButton.disabled = isClicked || !canControlAttack;
        if (attackDamageRerollButton) {
            attackDamageRerollButton.disabled = !Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-rolled'))
                || isClicked
                || !canControlAttack;
        }
        if (hitLocationRollButton && !canControlAttack) hitLocationRollButton.disabled = true;
        if (attackDamageRollButton && !canControlAttack) attackDamageRollButton.disabled = true;
        if (bypassWornArmorToggle) {
            bypassWornArmorToggle.checked = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-bypass-worn-armor'));
            bypassWornArmorToggle.disabled = !canControlAttack || isClicked;
        }
        if (bypassNaturalArmorToggle) {
            bypassNaturalArmorToggle.checked = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-bypass-natural-armor'));
            bypassNaturalArmorToggle.disabled = !canControlAttack || isClicked;
        }
        for (const toggle of [
            { el: halfDamageToggle, flag: 'attack-half-damage' },
            { el: impaleToggle, flag: 'attack-impale-toggle' },
            { el: sunderToggle, flag: 'attack-sunder-toggle' },
            { el: entangleToggle, flag: 'attack-entangle-toggle' },
            { el: stunLocationToggle, flag: 'attack-stun-location-toggle' }
        ]) {
            if (!toggle.el) continue;
            toggle.el.checked = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, toggle.flag));
            toggle.el.disabled = !canControlAttack || isClicked;
        }
    }

    if (hitLocationRollButton && !attackHitLocationRolled && !attackHitLocationChosen) {
        hitLocationRollButton.addEventListener('click', async () => {
            if (!canControlAttack) return;
            const targetToken = canvas.tokens.get(hitLocationRollButton.dataset.targetToken)
                || game.scenes.current?.tokens.get(hitLocationRollButton.dataset.targetToken);
            const targetActor = targetToken?.actor;
            if (!targetActor) return ui.notifications.warn("Target token not found for hit location roll.");

            const hitLocationRoll = await new Roll('1d20').evaluate();
            const targetHitLocation = targetActor.items.find(loc => {
                const start = loc.system?.rollRangeStart ?? loc.rollRangeStart;
                const end = loc.system?.rollRangeEnd ?? loc.rollRangeEnd;
                return start !== undefined && end !== undefined && hitLocationRoll.total >= start && hitLocationRoll.total <= end;
            });
            if (!targetHitLocation) return ui.notifications.warn("Could not resolve the rolled hit location.");

            const locationCardData = buildMAGCMHitLocationCardData(targetActor, targetHitLocation);
            const hitLocationData = {
                id: targetHitLocation.id,
                name: targetHitLocation.name,
                roll: hitLocationRoll.total,
                ...locationCardData
            };

            await playAttackRoll(hitLocationRoll);
            hitLocationResultEl.innerHTML = renderMAGCMHitLocationResultText(hitLocationData);
            hitLocationResultEl.dataset.magcmTooltip = renderMAGCMHitLocationTooltipHtml(hitLocationData);
            locationArmorEl.innerHTML = `${locationCardData.armor} AP`;
            locationArmorEl.dataset.magcmTooltip = renderMAGCMLocationArmorTooltipHtml(locationCardData);
            html[0].querySelectorAll('.submit-damage, .attack-impale-button, .attack-stun-location-button').forEach(button => {
                button.dataset.hitLocationId = targetHitLocation.id;
                button.dataset.hitLocationName = targetHitLocation.name;
                button.dataset.armor = locationCardData.armor;
                button.dataset.naturalArmor = locationCardData.naturalArmor;
            });
            hitLocationRollButton.disabled = true;
            hitLocationRollButton.innerText = 'Hit Location Rolled';
            await updateAttackCard({
                'attack-hit-location-rolled': true,
                'attack-hit-location': hitLocationData
            });
        });
    } else if (hitLocationRollButton) {
        hitLocationRollButton.disabled = true;
        hitLocationRollButton.innerText = attackHitLocationChosen ? 'Location Chosen' : 'Hit Location Rolled';
    }

    if (attackDamageRollButton && !attackDamageRolled) {
        attackDamageRollButton.addEventListener('click', async () => {
            if (!canControlAttack) return;
            const maximiseSelect = html[0].querySelector('.maximise-damage-select');
            const maximiseStacks = maximiseSelect ? Number(maximiseSelect.value) || 0 : 0;
            const formula = applyMaximiseDamage(attackDamageRollButton.dataset.damageFormula || '1d3', maximiseStacks);
            const damageRoll = await new Roll(formula).evaluate();
            const damage = Math.max(0, Number(damageRoll.total));

            await playAttackRoll(damageRoll);
            damageResultSpan.innerHTML = `<strong>${damage}</strong>`;
            const weaponFormula = attackDamageRollButton.dataset.weaponFormula || "";
            const modifierFormula = attackDamageRollButton.dataset.modifierFormula || "";
            const maximisedWeaponFormula = weaponFormula ? applyMaximiseDamage(weaponFormula, maximiseStacks) : weaponFormula;
            damageResultSpan.dataset.breakdown = describeMAGCMRollBreakdown(damageRoll, maximisedWeaponFormula, modifierFormula);
            damageResultSpan.removeAttribute('title');
            html[0].querySelectorAll('.submit-damage, .attack-stun-location-button').forEach(button => {
                button.dataset.damage = damage;
            });
            attackDamageRollButton.disabled = true;
            attackDamageRollButton.innerText = 'Damage Rolled';
            if (maximiseSelect) maximiseSelect.disabled = true;
            await updateAttackCard({
                'attack-damage-rolled': true,
                'attack-damage': damage,
                'attack-maximise-stacks': maximiseStacks
            });
        });
    } else if (attackDamageRollButton) {
        attackDamageRollButton.disabled = true;
        attackDamageRollButton.innerText = 'Damage Rolled';
        const maximiseSelect = html[0].querySelector('.maximise-damage-select');
        if (maximiseSelect) maximiseSelect.disabled = true;
    }

    if (attackDamageRerollButton) {
        attackDamageRerollButton.addEventListener('click', async () => {
            if (!canControlAttack) return;

            // Re-roll Damage (homebrew special effect): re-roll the damage die/dice and keep whichever of
            // the two results is higher, rather than blindly overwriting the earlier (possibly better) roll.
            const previousDamage = Number(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage')) || 0;
            const previousBreakdown = damageResultSpan.dataset.breakdown || "";
            const previousMaximiseStacks = Number(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-maximise-stacks')) || 0;

            const maximiseSelect = html[0].querySelector('.maximise-damage-select');
            const maximiseStacks = maximiseSelect ? Number(maximiseSelect.value) || 0 : previousMaximiseStacks;
            const formula = applyMaximiseDamage(attackDamageRerollButton.dataset.damageFormula || '1d3', maximiseStacks);
            const damageRoll = await new Roll(formula).evaluate();
            const rerolledDamage = Math.max(0, Number(damageRoll.total));

            await playAttackRoll(damageRoll);

            const keepReroll = rerolledDamage > previousDamage;
            const damage = keepReroll ? rerolledDamage : previousDamage;
            const finalMaximiseStacks = keepReroll ? maximiseStacks : previousMaximiseStacks;

            let breakdown = previousBreakdown;
            if (keepReroll) {
                const weaponFormula = attackDamageRerollButton.dataset.weaponFormula || "";
                const modifierFormula = attackDamageRerollButton.dataset.modifierFormula || "";
                const maximisedWeaponFormula = weaponFormula ? applyMaximiseDamage(weaponFormula, maximiseStacks) : weaponFormula;
                breakdown = describeMAGCMRollBreakdown(damageRoll, maximisedWeaponFormula, modifierFormula);
            }

            damageResultSpan.innerHTML = `<strong>${damage}</strong>`;
            damageResultSpan.dataset.breakdown = breakdown;
            damageResultSpan.removeAttribute('title');
            html[0].querySelectorAll('.submit-damage, .attack-stun-location-button').forEach(button => {
                button.dataset.damage = damage;
            });
            await updateAttackCard({
                'attack-damage-rolled': true,
                'attack-damage': damage,
                'attack-maximise-stacks': finalMaximiseStacks
            });
        });
    }

    if (attackDamageRolled) {
        const damage = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage');
        damageResultSpan.innerHTML = `<strong>${damage}</strong>`;
        html[0].querySelectorAll('.submit-damage, .attack-stun-location-button').forEach(button => {
            button.dataset.damage = damage;
        });
        const maximiseSelect = html[0].querySelector('.maximise-damage-select');
        if (maximiseSelect) {
            const storedStacks = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-maximise-stacks');
            if (storedStacks !== undefined) maximiseSelect.value = String(storedStacks);
            maximiseSelect.disabled = true;
        }
    }
    if (attackHitLocationRolled) {
        const location = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location');
        if (location) {
            hitLocationResultEl.innerHTML = renderMAGCMHitLocationResultText(location);
            hitLocationResultEl.dataset.magcmTooltip = renderMAGCMHitLocationTooltipHtml(location);
            locationArmorEl.innerHTML = `${location.armor} AP`;
            locationArmorEl.dataset.magcmTooltip = renderMAGCMLocationArmorTooltipHtml(location);
            html[0].querySelectorAll('.submit-damage, .attack-impale-button, .attack-stun-location-button').forEach(button => {
                button.dataset.hitLocationId = location.id;
                button.dataset.hitLocationName = location.name;
                button.dataset.armor = location.armor;
                button.dataset.naturalArmor = location.naturalArmor;
            });
        }
    }
    updateDamageActionState();

    if (bypassWornArmorToggle) {
        bypassWornArmorToggle.addEventListener('change', async () => {
            if (!canControlAttack) return;
            await updateAttackCard({ 'attack-bypass-worn-armor': bypassWornArmorToggle.checked });
        });
    }
    if (bypassNaturalArmorToggle) {
        bypassNaturalArmorToggle.addEventListener('change', async () => {
            if (!canControlAttack) return;
            await updateAttackCard({ 'attack-bypass-natural-armor': bypassNaturalArmorToggle.checked });
        });
    }
    for (const toggle of [
        { el: halfDamageToggle, flag: 'attack-half-damage' },
        { el: impaleToggle, flag: 'attack-impale-toggle' },
        { el: sunderToggle, flag: 'attack-sunder-toggle' },
        { el: entangleToggle, flag: 'attack-entangle-toggle' },
        { el: stunLocationToggle, flag: 'attack-stun-location-toggle' }
    ]) {
        if (!toggle.el) continue;
        toggle.el.addEventListener('change', async () => {
            if (!canControlAttack) return;
            await updateAttackCard({ [toggle.flag]: toggle.el.checked });
        });
    }

  // Handle damage buttons if they exist
  if (chatButtons.length > 0) {
    
    async function administerDamage(damageButton, overrideArmor = null) {
            if (!canControlAttack) return;
      
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
    const bypassWornArmor = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-bypass-worn-armor'));
    const bypassNaturalArmor = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-bypass-natural-armor'));
    const halfDamage = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-half-damage'));
    const useImpale = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-impale-toggle'));
    const useSunder = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-sunder-toggle'));
    const useEntangle = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-entangle-toggle'));
    const useStunLocation = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-stun-location-toggle'));
    let armorPoints = bypassWornArmor || overrideArmor !== null ? 0 : (Number(damageButton.dataset.armor) || 0);
    let naturalArmor = bypassNaturalArmor || overrideArmor !== null ? 0 : (Number(damageButton.dataset.naturalArmor) || 0);
      let maxAp = Math.max(armorPoints, naturalArmor);

      // Impale: roll a second damage die and keep the higher of the two RAW rolls, before any halving
      let impaleRoll = null;
      let keptRawDamage = rawDamage;
      if (useImpale) {
        impaleRoll = await new Roll(damageButton.dataset.damageFormula || "1d3").evaluate();
        keptRawDamage = Math.max(rawDamage, Number(impaleRoll.total));
      }

      // Half Damage halves whichever raw value ends up being used (the original, or the higher Impale roll), before armour mitigation
      const mitigatableDamage = halfDamage ? Math.round(keptRawDamage / 2) : keptRawDamage;

      let currentHp = hitLocation.system.currentHp ?? hitLocation.system.hp?.value ?? 0;
      let armorMitigatedDamage;
      let sunderResult = null;
      if (useSunder && maxAp > 0) {
        sunderResult = await applySunder(targetToken, targetActor, hitLocation, mitigatableDamage, armorPoints, naturalArmor);
        armorMitigatedDamage = sunderResult.hpDamage;
      } else {
        armorMitigatedDamage = Math.max(0, mitigatableDamage - maxAp);
      }
      let updatedHp = currentHp - armorMitigatedDamage;

      // Update HP on the embedded hit location item (allowing negative HP)
            await updateHitLocationHp(targetToken, targetActor, hitLocationId, updatedHp, damageButton.dataset.attackerUuid || null);

      // Post damage details to chat with the attacker as the speaker
      let targetName = damageButton.dataset.targetName || targetToken.name || "Target";
      let hitLocName = damageButton.dataset.hitLocationName || hitLocation.name || "Hit Location";
      let weaponName = damageButton.dataset.weaponName || "Weapon";

      const attackerActor = canvas.tokens.get(damageButton.dataset.attackerToken)?.actor
        || game.actors.get(damageButton.dataset.attackerActorId);
      const weapon = attackerActor?.items.get(damageButton.dataset.weaponId);

      // Impale: lodge the weapon if the kept (post-halving) damage overcame the location's original combined armour
      let impaledApplied = false;
      if (useImpale && weapon && mitigatableDamage > maxAp) {
        const impaledData = {
            impaleId: foundry.utils.randomID(),
            attackerActorId: attackerActor.id,
            attackerName: attackerActor.name,
            weaponId: weapon.id,
            weaponName: weapon.name,
            weaponSize: damageButton.dataset.weaponSize || "Unknown",
            isProjectile: weapon.type === "ranged-weapon",
            damageFormula: damageButton.dataset.damageFormula || weapon.damageRoll || weapon.system?.damage || "1d3",
            isBarbed: /barbed/i.test(String(weapon.system?.["combat-effects"] ?? weapon.system?.combatEffects ?? "")),
            appliedDamage: armorMitigatedDamage,
            targetId: targetToken.id,
            targetActorId: targetActor.id,
            targetName: targetToken.name,
            hitLocationId: hitLocation.id,
            hitLocationName: hitLocation.name
        };
        await updateImpaleState(targetToken, targetActor, hitLocation, attackerActor, weapon, impaledData);
        impaledApplied = true;
      }

      // Entangle: flag the location as entangled whenever the weapon strikes home; Mythras' Entangle special
      // effect has no requirement that the blow actually overcome armour or cause HP damage to take hold
      let entangleApplied = false;
      if (useEntangle) {
        await applyEntangle(targetToken, targetActor, hitLocation, attackerActor, weapon);
        entangleApplied = true;
      }

      // Stun Location: incapacitate the struck location for a number of the victim's own turns equal to the damage inflicted
      let stunEffectDesc = null;
      let stunTurns = 0;
      if (useStunLocation && armorMitigatedDamage > 0) {
        const locNameLower = hitLocName.toLowerCase();
        if (locNameLower.includes("head")) {
            stunEffectDesc = `${targetName} is briefly rendered insensible.`;
        } else if (locNameLower.includes("chest") || locNameLower.includes("torso") || locNameLower.includes("abdomen")) {
            stunEffectDesc = `${targetName} staggers winded, only able to defend.`;
        } else {
            stunEffectDesc = `${targetName}'s ${hitLocName} is incapacitated.`;
        }

        stunTurns = armorMitigatedDamage;

        // Stun is now tracked as a plain flag on the hit location (mirrors entangledBy/impaledBy) instead of an
        // ActiveEffect, so the custom stun icon overlay (see refreshToken hook) can render a 16x16 status icon.
        // turnsRemaining counts only the stunned actor's OWN turns (see the "Stun Location duration progression"
        // updateCombat hook, which decrements it solely when it becomes that actor's turn in combat).
        const stunData = {
            attackerActorId: attackerActor?.id || null,
            attackerName: attackerActor?.name || "Unknown",
            weaponId: weapon?.id || null,
            weaponName: weaponName,
            turnsRemaining: stunTurns
        };
        await updateItemField(targetToken, targetActor, hitLocation.id, { [`flags.${MAGCM_MODULE_ID}.stunnedBy`]: stunData });
      }

      // Set flag so message locks / shows applied
      await messageDoc.setFlag('mythras-angrygorillas-custom-macros', 'damage-applied', true);

      let content = `
        <h3 style="border-bottom: 2px solid var(--color-border-dark-tertiary); margin-bottom: 4px;">Damage Applied</h3>
        <p><strong>Target:</strong> ${targetName} (${hitLocName})</p>
        <p><strong>Weapon:</strong> ${weaponName} (Rolled: ${rawDamage} dmg${useImpale ? `, Impale Roll: ${impaleRoll.total} dmg, Kept: ${keptRawDamage} dmg` : ""})</p>
        ${halfDamage ? `<p><strong>Half Damage:</strong> ${keptRawDamage} halved to ${mitigatableDamage}</p>` : ""}
        <p><strong>Worn Armor:</strong> ${bypassWornArmor ? "Bypassed" : `${armorPoints} AP`} | <strong>Natural Armor:</strong> ${bypassNaturalArmor ? "Bypassed" : `${naturalArmor} AP`}</p>
        ${sunderResult ? `<p><strong>Sunder:</strong> ${sunderResult.usedArmor} AP consumed (${sunderResult.wornReductions.map(r => `${r.name}: -${r.reduceBy} AP (now ${r.newAp})`).join(", ") || "no worn armor reduced"}${sunderResult.naturalReduceBy > 0 ? `, Natural Armor: -${sunderResult.naturalReduceBy} AP (now ${sunderResult.newNaturalArmor})` : ""})</p>` : ""}
        <p><strong>Damage Applied:</strong> <span style="color: darkred; font-weight: bold;">${armorMitigatedDamage}</span> HP</p>
        <p><em>${hitLocName} current HP: ${updatedHp}</em></p>
        ${impaledApplied ? `<p>${weaponName} is now impaled in ${targetName}'s ${hitLocName}.</p>` : ""}
        ${entangleApplied ? `<p>${targetName}'s ${hitLocName} is now entangled.</p>` : ""}
        ${stunEffectDesc ? `<p><strong>Stun Location:</strong> ${hitLocName} is stunned for ${stunTurns} of ${targetName}'s own turn(s).</p><p>${stunEffectDesc}</p>` : ""}
      `;

      ChatMessage.create({
        speaker: messageDoc.speaker,
        rolls: impaleRoll ? [impaleRoll] : [],
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
                damageButton.style.display = '';
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
          case 'choose-location':
                        if (!isClicked && canControlAttack) {
              damageButton.addEventListener("click", async () => {
                                if (!canControlAttack) return;
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
                                            label: "Choose Location",
                                            callback: async (chooseHtml) => {
                                                const chosenId = chooseHtml.find('#chosenLocId').val();
                        const chosenLoc = targetActor.items.get(chosenId);
                        if (!chosenLoc) return;

                        const locationCardData = buildMAGCMHitLocationCardData(targetActor, chosenLoc);
                                                const chosenLocationData = {
                                                    id: chosenLoc.id,
                                                    name: chosenLoc.name,
                                                    chosen: true,
                                                    ...locationCardData
                                                };

                                                hitLocationResultEl.innerHTML = renderMAGCMHitLocationResultText(chosenLocationData);
                                                hitLocationResultEl.dataset.magcmTooltip = renderMAGCMHitLocationTooltipHtml(chosenLocationData);
                                                locationArmorEl.innerHTML = `${locationCardData.armor} AP`;
                                                locationArmorEl.dataset.magcmTooltip = renderMAGCMLocationArmorTooltipHtml(locationCardData);
                                                html[0].querySelectorAll('.submit-damage, .attack-impale-button, .attack-stun-location-button').forEach(button => {
                                                    button.dataset.hitLocationId = chosenLoc.id;
                                                    button.dataset.hitLocationName = chosenLoc.name;
                                                    button.dataset.armor = locationCardData.armor;
                                                    button.dataset.naturalArmor = locationCardData.naturalArmor;
                                                });

                                                if (hitLocationRollButton) {
                                                    hitLocationRollButton.disabled = true;
                                                    hitLocationRollButton.innerText = 'Location Chosen';
                                                }

                                                updateDamageActionState();
                                                await updateAttackCard({
                                                    'attack-hit-location-rolled': true,
                                                    'attack-hit-location-chosen': true,
                                                    'attack-hit-location': chosenLocationData
                                                });
                      }
                    },
                    cancel: { label: "Cancel" }
                  },
                  default: "apply"
                }).render(true);
              });
            }
            break;
          case 'impale':
                        if (!isClicked && canControlAttack) {
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
      }
    }
  }


    const impaleButton = html[0].querySelector('.apply-impale-damage');
    if (impaleButton && !messageDoc.getFlag(MAGCM_MODULE_ID, 'impale-applied')) {
        impaleButton.addEventListener('click', async () => {
            if (!canControlAttack) return;

            const targetToken = canvas.tokens.get(impaleButton.dataset.targetToken) || game.scenes.current?.tokens.get(impaleButton.dataset.targetToken);
            const targetActor = targetToken?.actor;
            const hitLocation = targetActor?.items.get(impaleButton.dataset.hitLocationId);
            const attackerActor = game.actors.get(impaleButton.dataset.attackerActorId)
                || canvas.tokens.placeables.find(token => token.actor?.id === impaleButton.dataset.attackerActorId)?.actor;
            const weapon = attackerActor?.items.get(impaleButton.dataset.weaponId);
            if (!targetActor || !hitLocation || !weapon) return ui.notifications.warn("The impale target, hit location, or weapon could not be found.");

            const rawDamage = Number(impaleButton.dataset.damage) || 0;
            const bypassWornArmor = impaleButton.dataset.bypassWornArmor === "true";
            const bypassNaturalArmor = impaleButton.dataset.bypassNaturalArmor === "true";
            const wornArmor = bypassWornArmor ? 0 : Number(impaleButton.dataset.armor) || 0;
            const naturalArmor = bypassNaturalArmor ? 0 : Number(impaleButton.dataset.naturalArmor) || 0;
            const mitigatedDamage = Math.max(0, rawDamage - Math.max(wornArmor, naturalArmor));
            const currentHp = Number(hitLocation.system.currentHp ?? hitLocation.system.hp?.value ?? 0);
            const updatedHp = currentHp - mitigatedDamage;

            await updateHitLocationHp(targetToken, targetActor, hitLocation.id, updatedHp, attackerActor.uuid || null);

            if (rawDamage > Math.max(wornArmor, naturalArmor)) {
                const impaledData = {
                    impaleId: foundry.utils.randomID(),
                    attackerActorId: attackerActor.id,
                    attackerName: attackerActor.name,
                    weaponId: weapon.id,
                    weaponName: weapon.name,
                    weaponSize: impaleButton.dataset.weaponSize || "Unknown",
                    isProjectile: weapon.type === "ranged-weapon",
                    damageFormula: impaleButton.dataset.damageFormula || weapon.damageRoll || weapon.system?.damage || "1d3",
                    isBarbed: /barbed/i.test(String(weapon.system?.["combat-effects"] ?? weapon.system?.combatEffects ?? "")),
                    appliedDamage: mitigatedDamage,
                    targetId: targetToken.id,
                      targetActorId: targetActor.id,
                    targetName: targetToken.name,
                    hitLocationId: hitLocation.id,
                    hitLocationName: hitLocation.name
                };
                await updateImpaleState(targetToken, targetActor, hitLocation, attackerActor, weapon, impaledData);
            }

            await messageDoc.setFlag(MAGCM_MODULE_ID, 'impale-applied', true);
            impaleButton.disabled = true;
            impaleButton.innerText = "Impale Damage Applied";
            canvas.tokens.placeables.forEach(t => t.refresh());
            ChatMessage.create({
                speaker: messageDoc.speaker,
                content: `<p><strong>Impale damage applied:</strong> ${mitigatedDamage} HP to ${hitLocation.name} (${updatedHp} HP remaining).</p>${rawDamage > Math.max(wornArmor, naturalArmor) ? `<p>${weapon.name} is now impaled in ${targetToken.name}'s ${hitLocation.name}.</p>` : "<p>The blow did not penetrate the combined armour protection.</p>"}`
            });
        });
    }

    const unimpaleButton = html[0].querySelector('.apply-unimpale-damage');
    if (unimpaleButton && !messageDoc.getFlag(MAGCM_MODULE_ID, 'unimpale-applied')) {
        unimpaleButton.addEventListener('click', async () => {
            if (!canControlAttack && unimpaleButton.dataset.allowAnyUser !== "true") return;

            const targetToken = canvas.tokens.get(unimpaleButton.dataset.targetToken) || game.scenes.current?.tokens.get(unimpaleButton.dataset.targetToken);
            const targetActor = targetToken?.actor;
            const hitLocation = targetActor?.items.get(unimpaleButton.dataset.hitLocationId);
            const attackerActor = game.actors.get(unimpaleButton.dataset.attackerActorId)
                || canvas.tokens.placeables.find(token => token.actor?.id === unimpaleButton.dataset.attackerActorId)?.actor;
            const weapon = attackerActor?.items.get(unimpaleButton.dataset.weaponId);
            if (!targetActor || !hitLocation || !attackerActor || !weapon) return ui.notifications.warn("The impaled weapon, target, or hit location could not be found.");

            const damage = Number(unimpaleButton.dataset.damage) || 0;
            const safeUnimpale = unimpaleButton.dataset.safe === "true";
            const currentHp = Number(hitLocation.system.currentHp ?? hitLocation.system.hp?.value ?? 0);
            const updatedHp = safeUnimpale ? currentHp : currentHp - damage;
            if (!safeUnimpale) await updateHitLocationHp(targetToken, targetActor, hitLocation.id, updatedHp, attackerActor.uuid || null);
            await updateImpaleState(targetToken, targetActor, hitLocation, attackerActor, weapon, null, unimpaleButton.dataset.impaleId || null);
            await messageDoc.setFlag(MAGCM_MODULE_ID, 'unimpale-applied', true);
            unimpaleButton.disabled = true;
            unimpaleButton.innerText = "Unimpale Damage Applied";
            canvas.tokens.placeables.forEach(t => t.refresh());
            ChatMessage.create({
                speaker: messageDoc.speaker,
                content: safeUnimpale
                    ? `<p><strong>Unimpaled safely:</strong> ${hitLocation.name} took no damage.</p>`
                    : `<p><strong>Unimpale damage applied:</strong> ${damage} HP to ${hitLocation.name} (${updatedHp} HP remaining).</p>`
            });
        });
    }

  // -- 2. Parry, Evade, and Contest Button Listeners --
  let parryBtn = html[0].querySelector('.parry-button');
  let evadeBtn = html[0].querySelector('.evade-button');
  let contestBtn = html[0].querySelector('.contest-button');

  if (parryBtn) parryBtn.addEventListener('click', () => handleParryDialog(parryBtn.dataset.attackerRange, parryBtn.dataset.attackerSize, parryBtn.dataset.attackerResult, parryBtn.dataset.attackerName, parryBtn.dataset.attackerWeaponType, parryBtn.dataset.attackerWeaponTraits, parryBtn.dataset.attackerStyleTraits));
  if (evadeBtn) evadeBtn.addEventListener('click', () => handleEvadeDialog(evadeBtn.dataset.attackerResult, evadeBtn.dataset.attackerName, evadeBtn.dataset.attackerWeaponType, evadeBtn.dataset.attackerWeaponTraits, evadeBtn.dataset.attackerStyleTraits));

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
  sfButtons.forEach(btn => btn.addEventListener('click', () => renderSpecialEffectsDialog(btn.dataset.winner, btn.dataset.effects, btn.dataset.weaponType, btn.dataset.traits, btn.dataset.isCritical, btn.dataset.isOpponentFumble)));

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
              const modifiersList = getMAGCMSkillRollModifiers(actor, enduranceSkill);
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
          <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: #e1a100; font-weight: bold;">
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
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; font-weight: bold;">
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

  // -- 4b. Serious/Major Wound Endurance Roll Handler --
  // Opens the same skill-roll dialog the character sheet uses (actor.sheet.handleSkillRoll), defaulted to
  // Endurance, rather than a bespoke roll implementation (see the Serious/Major Wound automation hook).
  let woundEnduranceBtn = html[0].querySelector('.magcm-wound-endurance-btn');
  if (woundEnduranceBtn) {
    woundEnduranceBtn.addEventListener('click', () => {
      const actorId = woundEnduranceBtn.dataset.actorId;
      const actor = game.actors.get(actorId) || canvas.tokens.placeables.find(t => t.actor?.id === actorId)?.actor;
      if (!actor) return ui.notifications.warn("Actor not found for Endurance roll.");

      const enduranceSkill = actor.items.find(i => i.type === "standardSkill" && i.name.toLowerCase() === "endurance");
      if (!enduranceSkill) return ui.notifications.warn(`${actor.name} does not have the Endurance skill.`);

      if (typeof actor.sheet?.handleSkillRoll === "function") {
        actor.sheet.handleSkillRoll(enduranceSkill);
      } else {
        ui.notifications.error("Could not open the Endurance roll dialog for this actor's sheet.");
      }
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
function handleParryDialog(attackerRange, attackerSize, attackerResult, attackerName = "Attacker", attackerWeaponType = "melee", attackerWeaponTraits = "", attackerStyleTraits = "") {
    const controlled = canvas.tokens.controlled[0];
    if (!controlled) return ui.notifications.warn("Please select a token to parry with.");

    const skillArray = controlled.actor.items.filter(skill => skill.type === "combatStyle" || (skill.type === "standardSkill" && skill.name.toLowerCase() === "unarmed")).sort((a, b) => {
        // If types match (e.g. both are combatStyles), sort alphabetically
        if (a.type === b.type) {
            return a.name.localeCompare(b.name);
        }
        // Force combatStyle (-1) to come before Unarmed (1)
        return a.type === "combatStyle" ? -1 : 1;
    });
    
    // Only MELEE weapons or SHIELDS currently held in at least one hit location
    const weaponArray = controlled.actor.items.filter(weapon => {
        if (weapon.type !== "melee-weapon") return false;
        const locs = weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations");
        return (Array.isArray(locs) && locs.length > 0) || Boolean(weapon.system?.equipped ?? weapon.system?.isEquipped);
    });

    // Entangled arms block parrying with weapons wielded there; other entangled locations only add a Roll Modifiers penalty
    const entangledLocations = controlled.actor.items.filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "entangledBy"));
    const entangledArmIds = new Set(entangledLocations.filter(loc => /arm/i.test(loc.name)).map(loc => loc.id));
    // Stunned locations are tracked via a hit-location flag (see stunnedBy icon overlay) rather than an ActiveEffect
    const stunnedLocationIds = new Set(
        controlled.actor.items
            .filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "stunnedBy"))
            .map(i => i.id)
    );
    weaponArray.forEach(weapon => {
        const holdingLocations = weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
        weapon._pinned = Boolean(weapon.getFlag(MAGCM_MODULE_ID, "pinned"));
        weapon._impaled = Boolean(weapon.getFlag(MAGCM_MODULE_ID, "impaled"));
        weapon._entangledBlocked = holdingLocations.some(locId => entangledArmIds.has(locId));
        weapon._stunnedBlocked = holdingLocations.some(locId => stunnedLocationIds.has(locId));
        const hpValue = weapon.system?.hp;
        weapon._broken = hpValue !== undefined && hpValue !== "" && Number(hpValue) <= 0;
    });

    const getParryWeaponDisableReasons = (weapon) => {
        const reasons = [];
        if (weapon?._broken) reasons.push("Broken");
        if (weapon?._pinned) reasons.push("Pinned");
        if (weapon?._impaled) reasons.push("Impaling another target");
        if (weapon?._entangledBlocked) reasons.push("Entangled arm");
        if (weapon?._stunnedBlocked) reasons.push("Stunned limb");
        return reasons;
    };

    const getSizeRank = (sizeName) => {
        const mapped = normalizeMAGCMWeaponSizeRank(sizeName);
        return mapped === null ? 1 : mapped;
    };

    const getParryNegationInfo = (defenderSizeName) => {
        const attackerRank = getSizeRank(attackerSize);
        const defenderRank = getSizeRank(defenderSizeName);
        const delta = attackerRank - defenderRank;
        if (delta >= 2) return { text: "No damage negated", ratio: 0 };
        if (delta === 1) return { text: "Half damage negated", ratio: 0.5 };
        return { text: "Full damage negated", ratio: 1 };
    };

    const augArray = getMAGCMActorSkillOptions(controlled.actor);

    const skillOptions = skillArray.map(i => `<option value="${i.id}">${i.name}</option>`);
    const augmentActors = getMAGCMAugmentActorOptions(controlled.actor, [...game.user.targets].map(t => t.actor));
    const defaultAugmentActor = controlled.actor;
    const augmentSkillOptions = getMAGCMAugmentOptionsForActor(defaultAugmentActor);
    const parryAugSkillOptions = buildMAGCMAugmentSkillOptions(augmentSkillOptions);
    
    const initialStyleIsUnarmed = skillArray.length > 0 && skillArray[0].type === "standardSkill" && skillArray[0].name.toLowerCase() === "unarmed";
    const defaultUsableWeapon = weaponArray.find(w => getParryWeaponDisableReasons(w).length === 0);

    // Unarmed is always a valid fallback (broken/entangled/unheld weapons shouldn't strand the defender with no options)
    let weaponOptions = weaponArray.map(i => {
        const reasons = getParryWeaponDisableReasons(i);
        const blocked = reasons.length > 0;
        const reason = blocked ? `Cannot parry: ${reasons.join(", ")}.` : "";
        const suffix = blocked ? ` (${reasons.join(", ")})` : "";
        const selected = !initialStyleIsUnarmed && !blocked && defaultUsableWeapon && i.id === defaultUsableWeapon.id ? "selected" : "";
        return `<option value="${i.id}" data-base-name="${i.name}" ${blocked ? "disabled" : ""} ${selected} title="${reason}">${i.name}${suffix}</option>`;
    });
    const noneSelected = initialStyleIsUnarmed || !defaultUsableWeapon ? "selected" : "";
    weaponOptions.unshift(`<option value="" ${noneSelected}>-- Unarmed/Improvised --</option>`);

    const augOptions = augArray.map(i => `<option>${i.name}</option>`);

    // Fetch Native Roll Modifiers for the default selected style
    const initialStyle = skillArray.length > 0 ? skillArray[0] : null;
    let modText = "No Penalties";
    let isModTextVisible = false;

    if (initialStyle && controlled.actor?.sheet?.roller?.getSkillRollModifiers) {
        try {
            const modifiersList = getMAGCMSkillRollModifiers(controlled.actor, initialStyle);
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
        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: #e1a100; font-weight: bold;">
            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
        </span>
    </div>` : "";

    const dialogContent = `
        <form style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
        <div class="magcm-dialog-body" style="flex: 1; overflow-y: auto; padding-right: 4px;">
            <div style="margin-bottom: 10px; padding: 8px; background: rgba(100, 100, 100, 0.15); border-radius: 3px;">
                <p style="margin: 0 0 4px 0; font-size: 0.9em;"><strong>Attacker's Range:</strong> ${attackerRange} | <strong>Size:</strong> ${attackerSize}</p>
                <p style="margin: 0; font-size: 0.9em;"><strong>Attacker's Result:</strong> ${attackerResult}</p>
            </div>
            ${modHtml}
            <div style="margin-bottom: 8px;">
                <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" id="doNotParry"> <strong>Do Not Parry</strong></label>
            </div>

            <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Combat Setup</legend>
                <table style="width: 100%; text-align: left; font-size: 0.9em;">
                    <tr><th>Difficulty</th>
                        <td><select id="parryDiff" style="width: 100%;">
                            <option value="2">Very Easy</option><option value="1.5">Easy</option><option value="1" selected>Standard</option>
                            <option value="0.67">Hard</option><option value="0.5">Formidable</option><option value="0.1">Herculean</option>
                        </select></td>
                    </tr>
                    <tr><th>Combat Style</th><td><select id="parryStyle" style="width: 100%;">${skillOptions.join("")}</select></td></tr>
                    <tr><th>Weapon/Shield</th><td><select id="parryWeapon" style="width: 100%;">${weaponOptions.join("")}</select></td></tr>
                    <tr id="parryUnarmedReachRow" style="display:none;">
                        <th>Reach</th>
                        <td>
                            <select id="parryUnarmedReach">
                                <option value="T" selected>Touch</option>
                                <option value="S">Short</option>
                                <option value="M">Medium</option>
                                <option value="L">Long</option>
                                <option value="VL">Very Long</option>
                            </select>
                        </td>
                    </tr>
                    <tr id="parryUnarmedSizeRow" style="display:none;">
                        <th>Size</th>
                        <td>
                            <select id="parryUnarmedSize">
                                <option value="S" selected>Small</option>
                                <option value="M">Medium</option>
                                <option value="L">Large</option>
                                <option value="H">Huge</option>
                                <option value="E">Enormous</option>
                                <option value="BE">Beyond Enormous</option>
                            </select>
                        </td>
                    </tr>
                    <tr id="parryUnarmedCombatEffectsRow" style="display:none;">
                        <th>Combat Effects</th>
                        <td><input type="text" id="parryUnarmedCombatEffects" placeholder="e.g. Bash, Stun Location" style="width: 100%;"></td>
                    </tr>
                </table>
            </fieldset>

            <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Modifiers & Mechanics</legend>
                <table style="width: 100%; text-align: left; font-size: 0.9em;">
                    <tr>
                        <th>Damage Negated</th>
                        <td id="parryNegationValue" style="font-weight: bold;">Full damage negated</td>
                    </tr>
                    <tr>
                        <th>Spend AP</th>
                        <td><input type="checkbox" id="spend-ap" checked></td>
                    </tr>
                    <tr>
                        <th>Spend Luck Point</th>
                        <td><input type="checkbox" id="parrySpendLuck"></td>
                    </tr>
                </table>
            </fieldset>

            <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Augmentation</legend>
                <table style="width: 100%; text-align: left; font-size: 0.9em;">
                    <tr>
                        <th>Augment skill?</th>
                        <td><input type="checkbox" id="parryAugment"></td>
                    </tr>
                    <tr>
                        <th>Augment character</th>
                        <td><select id="parryAugCharacter" style="width: 100%;">${buildMAGCMAugmentActorOptions(augmentActors, defaultAugmentActor.id)}</select></td>
                    </tr>
                    <tr>
                        <th>Augment with</th>
                        <td><select id="parryAugSkill" style="width: 100%;">${parryAugSkillOptions}</select></td>
                    </tr>
                    <tr>
                        <th>Cap by own skill?</th>
                        <td><input type="checkbox" id="parryCapSkillToggle"></td>
                    </tr>
                    <tr>
                        <th>Cap skill</th>
                        <td><select id="parryCapSkill" style="width: 100%;">${augArray.map(i => `<option value="${i.id}">${i.name} (${getMAGCMSkillValue(i)}%)</option>`).join("")}</select></td>
                    </tr>
                    <tr>
                        <th>Custom Augment Value:</th>
                        <td><input type="number" value="0" id="parryCustomAugment" style="width: 100%; text-align: center;"></td>
                    </tr>
                </table>
            </fieldset>
        </div>
        </form>
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
                            content: `
                            <div class="magcm-defense-card">
                            <div class="attack-card-header">
                                ${buildMAGCMCombatantsRowHtml(attackerName, "Attacker", controlled.name, "Defender")}
                                <div class="attack-card-notice"><i class="fas fa-ban"></i> Defender chose not to parry.</div>
                            </div>
                            <p><strong>Winner:</strong> Attacker gets ${diffObj.count} Special Effect(s).</p>
                            <button class="special-effects-btn" data-winner="attacker" data-effects="${diffObj.count}" data-weapon-type="${attackerWeaponType}" data-traits="${[attackerWeaponTraits, attackerStyleTraits].filter(Boolean).join(", ")}" data-is-critical="${attackerResult === 'Critical'}" data-is-opponent-fumble = "false">Special Effects</button>
                            </div>`
                        });
                    }

                    const actor = controlled.actor;
                    let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
                    if (currentAP === undefined) {
                        currentAP = foundry.utils.getProperty(actor, "system.currentActionPoints") ?? 0;
                    }
                    currentAP = Number(currentAP);
                    let newAP = currentAP;
                    const spendAP = html.find(`[id="spend-ap"]`)[0].checked;
                    const spendLuck = html.find('#parrySpendLuck').is(':checked');

                    if (currentAP <= 0 && spendAP) {
                        ui.notifications.info(`${controlled.name} has no Action Points left to parry!`);
                        return;
                    }                    

                    if (spendLuck && !await spendMAGCMLuckPoint(actor)) return;

                    let actionPointReducedLabel = "";
                    if (spendAP) {
                        newAP = currentAP - 1;
                        actionPointReducedLabel = `<p style="font-size: 0.85em; color: var(--color-text-dark-secondary); margin-top: 4px;">Action Points reduced by 1. ${newAP} Action Points remaining.</p>`;
                        await actor.update({ 
                            "system.trackedStats.actionPoints.value": String(newAP),
                            "system.currentActionPoints": newAP,
                            "system.attributes.actionPoints.value": newAP 
                        });
                    }

                    const styleId = html.find('#parryStyle').val();
                    const weaponId = html.find('#parryWeapon').val();
                    const diffMult = Number(html.find('#parryDiff').val());
                    const style = controlled.actor.items.get(styleId);
                    const weapon = controlled.actor.items.get(weaponId);
                    if (weapon) {
                        const reasons = getParryWeaponDisableReasons(weapon);
                        if (reasons.length > 0) {
                            ui.notifications.warn(`${weapon.name} cannot be used to parry (${reasons.join(", ")}).`);
                            return;
                        }
                    }

                    const cb = html.find('#parryAugment').is(':checked');
                    const parryAugSkillValue = html.find('#parryAugSkill').val();
                    const selectedAugmentActor = augmentActors.find(candidate => candidate.id === html.find('#parryAugCharacter').val()) || defaultAugmentActor;
                    const selectedAugmentSkillOptions = getMAGCMAugmentOptionsForActor(selectedAugmentActor);
                    const parryAugSkillEntry = selectedAugmentSkillOptions.find(option => option.valueKey === parryAugSkillValue) || null;
                    const augSkill = parryAugSkillEntry ? parryAugSkillEntry.skill : null;
                    const customValue = Number(html.find('#parryCustomAugment').val());
                    const useCap = html.find('#parryCapSkillToggle').is(':checked');
                    const capSkillId = html.find('#parryCapSkill').val();
                    const capSkillItem = controlled.actor.items.get(capSkillId) || null;

                    let styleName = style ? style.name : "Combat Style";
                    let weaponName = weapon ? weapon.name : "Unarmed/Improvised";
                    const unarmedReachCode = html.find('#parryUnarmedReach').val() || "T";
                    const unarmedSizeCode = html.find('#parryUnarmedSize').val() || "S";
                    const reachDisplay = { T: "Touch", S: "Short", M: "Medium", L: "Long", VL: "Very Long" };
                    const sizeDisplay = { S: "Small", M: "Medium", L: "Large", H: "Huge", E: "Enormous", BE: "Beyond Enormous" };
                    let weaponReach = weapon?.system?.reach || reachDisplay[unarmedReachCode] || "Touch";
                    let weaponSize = weapon?.system?.size || sizeDisplay[unarmedSizeCode] || "Small";
                    const unarmedCombatEffects = weapon ? "" : String(html.find('#parryUnarmedCombatEffects').val() || "");
                    const negationInfo = getParryNegationInfo(weaponSize);

                    let baseSkillVal = getMAGCMSkillValue(style);
                    if (cb) {
                        if (customValue !== 0) baseSkillVal += customValue;
                        else if (augSkill) baseSkillVal += Math.ceil(getMAGCMSkillValue(augSkill) * 0.2);
                    }
                    if (useCap) {
                        baseSkillVal = getMAGCMEffectiveSkillWithCap(baseSkillVal, capSkillItem);
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

                    const defenderResult = resultLabel;

                    const diffObj = calculateDifferentialSuccess(attackerResult, defenderResult);
                    
                    let winnerType = "melee";
                    let winnerTraits = "";
                    let winnerIsCritical = false;
                    let loserIsFumble = false;

                    if (diffObj.winner === "attacker") {
                        winnerType = attackerWeaponType;
                        winnerTraits = [attackerWeaponTraits, attackerStyleTraits].filter(Boolean).join(", ");
                        winnerIsCritical = attackerResult === "Critical";
                        loserIsFumble = defenderResult === "Fumble";
                    } else if (diffObj.winner === "defender") {
                        winnerType = weapon ? (weapon.type === "ranged-weapon" ? "ranged" : "melee") : "melee";
                        winnerTraits = [weapon ? weapon.system?.['combat-effects'] : unarmedCombatEffects, style?.system?.traits].filter(Boolean).join(", ");
                        winnerIsCritical = defenderResult === "Critical";
                        loserIsFumble = attackerResult === "Fumble";
                    }

                    let winnerText = diffObj.winner === "none" 
                        ? "<strong>Tie!</strong> No Special Effects awarded." 
                        : `<strong>Winner:</strong> <span style="text-transform:capitalize;">${diffObj.winner}</span> gets ${diffObj.count} Special Effect(s).`;

                    let sfButtonHTML = diffObj.winner !== "none" 
                        ? `<button class="special-effects-btn" data-winner="${diffObj.winner}" data-effects="${diffObj.count}" data-weapon-type="${winnerType}" data-traits="${winnerTraits}" data-is-critical="${winnerIsCritical}" data-is-opponent-fumble = "${defenderResult === 'Fumble'}" style="margin-top: 5px;">Special Effects</button>` 
                        : "";

                    let flavorText = `Defending against ${attackerName} with ${weaponName} using ${styleName}`;
                    let augString = '';
                    if (cb) {
                        const augVal = customValue !== 0 ? customValue : (augSkill ? Math.ceil(getMAGCMSkillValue(augSkill) * 0.2) : 0);
                        const augLabel = customValue !== 0 ? "Custom" : (parryAugSkillEntry ? `${parryAugSkillEntry.actor.name}'s ${parryAugSkillEntry.skill.name}` : "Selected skill");
                        augString = ` (Augmented by ${augLabel}: ${formatMAGCMSignedValue(augVal)})`;
                        flavorText += augString;
                    }
                    if (useCap && capSkillItem) {
                        const capLabel = `${capSkillItem.name} (${getMAGCMSkillValue(capSkillItem)}%)`;
                        augString += ` | Capped by ${capLabel}`;
                        flavorText += ` | Capped by ${capLabel}`;
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

                    // Clean augment/cap summary for the roll pill's tooltip (kept separate from augString,
                    // which retains its original " (Augmented by ...)" shape for flavorText/Contest button).
                    let parryAugmentTooltipLine = "None";
                    if (cb) {
                        const augVal = customValue !== 0 ? customValue : (augSkill ? Math.ceil(getMAGCMSkillValue(augSkill) * 0.2) : 0);
                        const augLabel = customValue !== 0 ? "Custom Value" : (parryAugSkillEntry ? `${parryAugSkillEntry.actor.name}'s ${parryAugSkillEntry.skill.name}` : "Selected skill");
                        parryAugmentTooltipLine = `Augmented by ${augLabel}: ${formatMAGCMSignedValue(augVal)}`;
                    }
                    if (useCap && capSkillItem) {
                        const capLabel = `${capSkillItem.name} (${getMAGCMSkillValue(capSkillItem)}%)`;
                        parryAugmentTooltipLine = parryAugmentTooltipLine === "None" ? `Capped by ${capLabel}` : `${parryAugmentTooltipLine} | Capped by ${capLabel}`;
                    }

                    const luckNotice = spendLuck ? `<div class="attack-card-notice"><i class="fas fa-clover"></i> Spent a Luck Point.</div>` : "";

                    let chatModHtml = isModTextVisible ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; font-weight: bold;">
                            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>` : "";

                    const parryRollPillHtml = buildMAGCMRollResultPillHtml({
                        rollTotal: parryRoll.result,
                        resultLabel,
                        skillName: styleName,
                        effectiveSkillValue: baseSkillVal,
                        diffText,
                        targetValue: skillVal,
                        augmentLine: parryAugmentTooltipLine
                    });

                    let content = `
                        <div class="magcm-defense-card">
                        <div class="attack-card-header">
                            ${buildMAGCMCombatantsRowHtml(attackerName, "Attacker", controlled.name, "Defender")}
                            ${buildMAGCMStatsRowHtml([
                                { label: "Combat Style", value: styleName },
                                { label: "Weapon", value: weaponName },
                                { label: "Range", value: attackerRange },
                                { label: "Reach", value: weaponReach },
                                { label: "Size", value: weaponSize },
                                { label: "Damage Negated", value: negationInfo.text }
                            ])}
                            ${luckNotice}
                            ${chatModHtml}
                            <div class="attack-card-roll">
                                <div class="attack-card-roll__label">Parry Roll<span class="attack-card-roll__diff"> (${diffText})</span></div>
                                ${parryRollPillHtml}
                            </div>
                        </div>
                        ${actionPointReducedLabel || ""}
                        <hr>
                        <p>${winnerText}</p>
                        ${sfButtonHTML}                        
                        <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${style.id}" data-attacker-score="${parryRoll.result}" data-attacker-result="${resultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}">Contest</button>
                        </div>
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
            const augmentCharacterSelect = html.find('#parryAugCharacter');
            const augmentCharacterRow = augmentCharacterSelect.closest('tr');
            const augSkillRow = html.find('#parryAugSkill').closest('tr');
            const capToggle = html.find('#parryCapSkillToggle');
            const capSkillRow = html.find('#parryCapSkill').closest('tr');
            const customAugRow = html.find('#parryCustomAugment').closest('tr');
            const parryWeaponSelect = html.find('#parryWeapon');
            const parryStyleSelect = html.find('#parryStyle');
            const unarmedReachRow = html.find('#parryUnarmedReachRow');
            const unarmedSizeRow = html.find('#parryUnarmedSizeRow');
            const unarmedSizeSelect = html.find('#parryUnarmedSize');
            const unarmedCombatEffectsRow = html.find('#parryUnarmedCombatEffectsRow');
            const negationValue = html.find('#parryNegationValue');

            function updateVisibility() {
                if (augmentCheckbox.is(':checked')) {
                    augmentCharacterRow.show();
                    augSkillRow.show();
                    customAugRow.show();
                } else {
                    augmentCharacterRow.hide();
                    augSkillRow.hide();
                    customAugRow.hide();
                }
                const showCap = capToggle.is(':checked');
                capSkillRow.toggle(showCap);

                const isUnarmed = !parryWeaponSelect.val();
                unarmedReachRow.toggle(isUnarmed);
                unarmedSizeRow.toggle(isUnarmed);
                unarmedCombatEffectsRow.toggle(isUnarmed);

                const selectedWeapon = controlled.actor.items.get(parryWeaponSelect.val());
                const selectedSize = selectedWeapon?.system?.size || unarmedSizeSelect.val() || "S";
                negationValue.text(getParryNegationInfo(selectedSize).text);
            }
            function updateAugmentSkills() {
                const augmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMAugmentOptionsForActor(augmentActor);
                html.find('#parryAugSkill').html(buildMAGCMAugmentSkillOptions(options, `No skills available for ${augmentActor.name}`));
                html.find('#parryAugSkill').val(options[0]?.valueKey || "");
            }
            augmentCheckbox.on('change', updateVisibility);
            capToggle.on('change', updateVisibility);
            parryWeaponSelect.on('change', updateVisibility);
            unarmedSizeSelect.on('change', updateVisibility);
            augmentCharacterSelect.on('change', updateAugmentSkills);
            updateAugmentSkills();
            parryStyleSelect.on('change', () => {
                const selectedStyle = controlled.actor.items.get(parryStyleSelect.val());
                if (selectedStyle && selectedStyle.type === "standardSkill" && selectedStyle.name.toLowerCase() === "unarmed") {
                    parryWeaponSelect.val('');
                }
                updateVisibility();
            });
            // Choosing not to parry, or spending a Luck Point instead, makes spending an Action Point redundant
            html.find('#doNotParry').on('change', (event) => {
                if (event.currentTarget.checked) html.find('#spend-ap').prop('checked', false);
            });
            html.find('#parrySpendLuck').on('change', (event) => {
                if (event.currentTarget.checked) html.find('#spend-ap').prop('checked', false);
            });
            updateVisibility();
        }
    }, { width: 425, height: 400, resizable: true }).render(true);
}

// -- Evade Dialog --
function handleEvadeDialog(attackerResult, attackerName = "Attacker", attackerWeaponType = "melee", attackerWeaponTraits = "", attackerStyleTraits = "") {
    const controlled = canvas.tokens.controlled[0];
    if (!controlled) return ui.notifications.warn("Please select a token to evade with.");

    const evadeSkill = controlled.actor.items.find(skill => skill.name.toLowerCase() === "evade");
    if (!evadeSkill) return ui.notifications.warn("Token does not have the Evade skill.");

    const entangledLocations = controlled.actor.items.filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "entangledBy"));
    if (entangledLocations.some(loc => /leg/i.test(loc.name))) {
        return ui.notifications.warn(`${controlled.name} cannot evade because one or more legs are entangled.`);
    }

    const augArray = getMAGCMActorSkillOptions(controlled.actor);
    const augmentActors = getMAGCMAugmentActorOptions(controlled.actor, [...game.user.targets].map(t => t.actor));
    const defaultAugmentActor = controlled.actor;
    const augmentSkillOptions = getMAGCMAugmentOptionsForActor(defaultAugmentActor);
    const evadeAugSkillOptions = buildMAGCMAugmentSkillOptions(augmentSkillOptions);
    const augOptions = augArray.map(i => `<option value="${i.id}">${i.name} (${getMAGCMSkillValue(i)}%)</option>`);

    // Fetch Native Roll Modifiers for Evade
    let modText = "No Penalties";
    let isModTextVisible = false;

    if (evadeSkill && controlled.actor?.sheet?.roller?.getSkillRollModifiers) {
        try {
            const modifiersList = getMAGCMSkillRollModifiers(controlled.actor, evadeSkill);
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
        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; font-weight: bold;">
            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
        </span>
    </div>` : "";

    new Dialog({
        title: `Evade - ${controlled.name}`,
        content: `
            <form style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
            <div class="magcm-dialog-body" style="flex: 1; overflow-y: auto; padding-right: 4px;">
                <div style="margin-bottom: 10px; padding: 8px; background: rgba(100, 100, 100, 0.15); border-radius: 3px;">
                    <p style="margin: 0; font-size: 0.9em;"><strong>Attacker's Result:</strong> ${attackerResult}</p>
                </div>
                ${modHtml}

                <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                    <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Combat Setup</legend>
                    <table style="width: 100%; text-align: left; font-size: 0.9em;">
                        <tr><th>Difficulty</th>
                            <td><select id="evadeDiff" style="width: 100%;">
                                <option value="2">Very Easy</option><option value="1.5">Easy</option><option value="1" selected>Standard</option>
                                <option value="0.67">Hard</option><option value="0.5">Formidable</option><option value="0.1">Herculean</option>
                            </select></td>
                        </tr>
                    </table>
                </fieldset>

                <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                    <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Modifiers & Mechanics</legend>
                    <table style="width: 100%; text-align: left; font-size: 0.9em;">
                        <tr>
                            <th>Spend AP</th>
                            <td><input type="checkbox" id="spend-ap" checked></td>
                        </tr>
                        <tr>
                            <th>Spend Luck Point</th>
                            <td><input type="checkbox" id="evadeSpendLuck"></td>
                        </tr>
                    </table>
                </fieldset>

                <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                    <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Augmentation</legend>
                    <table style="width: 100%; text-align: left; font-size: 0.9em;">
                        <tr>
                            <th>Augment evade?</th>
                            <td><input type="checkbox" id="evadeAugment"></td>
                        </tr>
                        <tr>
                            <th>Augment character</th>
                            <td><select id="evadeAugCharacter" style="width: 100%;">${buildMAGCMAugmentActorOptions(augmentActors, defaultAugmentActor.id)}</select></td>
                        </tr>
                        <tr>
                            <th>Augment with</th>
                            <td><select id="evadeAugSkill" style="width: 100%;">${evadeAugSkillOptions}</select></td>
                        </tr>
                        <tr>
                            <th>Cap by own skill?</th>
                            <td><input type="checkbox" id="evadeCapSkillToggle"></td>
                        </tr>
                        <tr>
                            <th>Cap skill</th>
                            <td><select id="evadeCapSkill" style="width: 100%;">${augOptions.join("")}</select></td>
                        </tr>
                        <tr>
                            <th>Custom Augment Value:</th>
                            <td><input type="number" value="0" id="evadeCustomAugment" style="width: 100%; text-align: center;"></td>
                        </tr>
                    </table>
                </fieldset>
            </div>
            </form>
        `,
        buttons: {
            roll: {
                label: "Roll Evade",
                callback: async (html) => {
                    const diffMult = Number(html.find('#evadeDiff').val());
                    
                    const actor = controlled.actor;
                    let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
                    if (currentAP === undefined) {
                        currentAP = foundry.utils.getProperty(actor, "system.currentActionPoints") ?? 0;
                    }
                    currentAP = Number(currentAP);
                    let newAP = currentAP;
                    const spendAP = html.find(`[id="spend-ap"]`)[0].checked;
                    const spendLuck = html.find('#evadeSpendLuck').is(':checked');

                    if (currentAP <= 0 && spendAP) {
                        ui.notifications.info(`${controlled.name} has no Action Points left to parry!`);
                        return;
                    }

                    if (spendLuck && !await spendMAGCMLuckPoint(actor)) return;

                    let actionPointReducedLabel = "";
                    if (spendAP) {
                        newAP = currentAP - 1;                        
                        actionPointReducedLabel = `<p style="font-size: 0.85em; color: var(--color-text-dark-secondary); margin-top: 4px;">Action Points reduced by 1. ${newAP} Action Points remaining.</p>`;
                        await actor.update({ 
                            "system.trackedStats.actionPoints.value": String(newAP),
                            "system.currentActionPoints": newAP,
                            "system.attributes.actionPoints.value": newAP 
                        });
                    }
                    
                    const cb = html.find('#evadeAugment').is(':checked');
                    const evadeAugSkillValue = html.find('#evadeAugSkill').val();
                    const selectedAugmentActor = augmentActors.find(candidate => candidate.id === html.find('#evadeAugCharacter').val()) || defaultAugmentActor;
                    const selectedAugmentSkillOptions = getMAGCMAugmentOptionsForActor(selectedAugmentActor);
                    const evadeAugSkillEntry = selectedAugmentSkillOptions.find(option => option.valueKey === evadeAugSkillValue) || null;
                    const augSkill = evadeAugSkillEntry ? evadeAugSkillEntry.skill : null;
                    const customValue = Number(html.find('#evadeCustomAugment').val());
                    const useCap = html.find('#evadeCapSkillToggle').is(':checked');
                    const capSkillId = html.find('#evadeCapSkill').val();
                    const capSkillItem = controlled.actor.items.get(capSkillId) || null;

                    let baseSkillVal = getMAGCMSkillValue(evadeSkill);
                    if (cb) {
                        if (customValue !== 0) baseSkillVal += customValue;
                        else if (augSkill) baseSkillVal += Math.ceil(getMAGCMSkillValue(augSkill) * 0.2);
                    }
                    if (useCap) {
                        baseSkillVal = getMAGCMEffectiveSkillWithCap(baseSkillVal, capSkillItem);
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

                    const defenderResult = resultLabel;
                    const diffObj = calculateDifferentialSuccess(attackerResult, defenderResult);
                    
                    let winnerType = "melee";
                    let winnerTraits = "";
                    let winnerIsCritical = false;
                    let loserIsFumble = false;

                    if (diffObj.winner === "attacker") {
                        winnerType = attackerWeaponType;
                        winnerTraits = [attackerWeaponTraits, attackerStyleTraits].filter(Boolean).join(", ");
                        winnerIsCritical = attackerResult === "Critical";
                        loserIsFumble = defenderResult === "Fumble";
                    } else if (diffObj.winner === "defender") {
                        winnerType = "unarmed";
                        winnerTraits = evadeSkill?.system?.traits || "";
                        winnerIsCritical = defenderResult === "Critical";
                        loserIsFumble = attackerResult === "Fumble";
                    }

                    let winnerText = diffObj.winner === "none" 
                        ? "<strong>Tie!</strong> No Special Effects awarded." 
                        : `<strong>Winner:</strong> <span style="text-transform:capitalize;">${diffObj.winner}</span> gets ${diffObj.count} Special Effect(s).`;

                    let sfButtonHTML = diffObj.winner !== "none" 
                        ? `<button class="special-effects-btn" data-winner="${diffObj.winner}" data-effects="${diffObj.count}" data-weapon-type="${winnerType}" data-traits="${winnerTraits}" data-is-critical="${winnerIsCritical}" data-is-opponent-fumble = "${defenderResult === 'Fumble'}" style="margin-top: 5px;">Special Effects</button>` 
                        : "";

                    let flavorText = `Evading attack from ${attackerName}.`;
                    let augString = '';
                    if (cb) {
                        const augVal = customValue !== 0 ? customValue : (augSkill ? Math.ceil(getMAGCMSkillValue(augSkill) * 0.2) : 0);
                        const augLabel = customValue !== 0 ? "Custom" : (evadeAugSkillEntry ? `${evadeAugSkillEntry.actor.name}'s ${evadeAugSkillEntry.skill.name}` : "Selected skill");
                        augString = ` (Augmented by ${augLabel}: ${formatMAGCMSignedValue(augVal)})`;
                        flavorText += augString;
                    }
                    if (useCap && capSkillItem) {
                        const capLabel = `${capSkillItem.name} (${getMAGCMSkillValue(capSkillItem)}%)`;
                        augString += ` | Capped by ${capLabel}`;
                        flavorText += ` | Capped by ${capLabel}`;
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

                    // Clean augment/cap summary for the roll pill's tooltip (kept separate from augString,
                    // which retains its original " (Augmented by ...)" shape for flavorText/Contest button).
                    let evadeAugmentTooltipLine = "None";
                    if (cb) {
                        const augVal = customValue !== 0 ? customValue : (augSkill ? Math.ceil(getMAGCMSkillValue(augSkill) * 0.2) : 0);
                        const augLabel = customValue !== 0 ? "Custom Value" : (evadeAugSkillEntry ? `${evadeAugSkillEntry.actor.name}'s ${evadeAugSkillEntry.skill.name}` : "Selected skill");
                        evadeAugmentTooltipLine = `Augmented by ${augLabel}: ${formatMAGCMSignedValue(augVal)}`;
                    }
                    if (useCap && capSkillItem) {
                        const capLabel = `${capSkillItem.name} (${getMAGCMSkillValue(capSkillItem)}%)`;
                        evadeAugmentTooltipLine = evadeAugmentTooltipLine === "None" ? `Capped by ${capLabel}` : `${evadeAugmentTooltipLine} | Capped by ${capLabel}`;
                    }

                    const luckNotice = spendLuck ? `<div class="attack-card-notice attack-card-notice--info"><i class="fas fa-clover"></i> Spent a Luck Point.</div>` : "";
                    const proneNotice = `<div class="attack-card-notice attack-card-notice--info"><i class="fas fa-person-falling"></i> Evading leaves ${controlled.name} prone, unless mitigated by other factors.</div>`;

                    let chatModHtml = isModTextVisible ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; font-weight: bold;">
                            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>` : "";

                    const evadeRollPillHtml = buildMAGCMRollResultPillHtml({
                        rollTotal: evadeRoll.result,
                        resultLabel,
                        skillName: evadeSkill.name,
                        effectiveSkillValue: baseSkillVal,
                        diffText,
                        targetValue: skillVal,
                        augmentLine: evadeAugmentTooltipLine
                    });

                    let content = `
                        <div class="magcm-defense-card">
                        <div class="attack-card-header">
                            ${buildMAGCMCombatantsRowHtml(attackerName, "Attacker", controlled.name, "Defender")}
                            ${buildMAGCMStatsRowHtml([{ label: "Skill", value: evadeSkill.name }])}
                            ${luckNotice}
                            ${proneNotice}
                            ${chatModHtml}
                            <div class="attack-card-roll">
                                <div class="attack-card-roll__label">Evade Roll<span class="attack-card-roll__diff"> (${diffText})</span></div>
                                ${evadeRollPillHtml}
                            </div>
                        </div>
                        ${actionPointReducedLabel || ""}
                        <hr>
                        <p>${winnerText}</p>
                        ${sfButtonHTML}
                        <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${evadeSkill.id}" data-attacker-score="${evadeRoll.result}" data-attacker-result="${resultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}">Contest</button>
                        </div>
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
            const augmentCharacterSelect = html.find('#evadeAugCharacter');
            const augmentCharacterRow = augmentCharacterSelect.closest('tr');
            const augSkillRow = html.find('#evadeAugSkill').closest('tr');
            const capToggle = html.find('#evadeCapSkillToggle');
            const capSkillRow = html.find('#evadeCapSkill').closest('tr');
            const customAugRow = html.find('#evadeCustomAugment').closest('tr');

            function updateVisibility() {
                if (augmentCheckbox.is(':checked')) {
                    augmentCharacterRow.show();
                    augSkillRow.show();
                    customAugRow.show();
                } else {
                    augmentCharacterRow.hide();
                    augSkillRow.hide();
                    customAugRow.hide();
                }
                capSkillRow.toggle(capToggle.is(':checked'));
            }
            function updateAugmentSkills() {
                const augmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMAugmentOptionsForActor(augmentActor);
                html.find('#evadeAugSkill').html(buildMAGCMAugmentSkillOptions(options, `No skills available for ${augmentActor.name}`));
                html.find('#evadeAugSkill').val(options[0]?.valueKey || "");
            }
            augmentCheckbox.on('change', updateVisibility);
            capToggle.on('change', updateVisibility);
            // Spending a Luck Point instead makes spending an Action Point redundant
            html.find('#evadeSpendLuck').on('change', (event) => {
                if (event.currentTarget.checked) html.find('#spend-ap').prop('checked', false);
            });
            augmentCharacterSelect.on('change', updateAugmentSkills);
            updateAugmentSkills();
            updateVisibility();
        }
    }, { width: 425, height: 400, resizable: true }).render(true);
}

// -- Special Effects Data & Filtering Rendering --
const specialEffectsData = {
  // [Leaving the arrays identical to your original code to save space]
  // Note: Only the rendering logic below is altered.
  offensive: [
    { name: "Bash", tags: ["melee", "trait_bash"], desc: `The attacker deliberately bashes the opponent off balance. How far the defender totters back or sideward depends on the weapon being used. Shields knock an opponent back one metre per for every two points of damage rolled (prior to any subtractions due to armour, parries, and so forth), whereas bludgeoning weapons knock back one metre per for every three points. Bashing works only on creatures up to twice the attacker's SIZ. If the recipient is forced backwards into an obstacle, then they must make a Hard Athletics or Acrobatics skill roll to avoid falling or tripping over.` },
    { name: "Bleed", tags: ["melee", "trait_bleed"], desc: `The attacker can attempt to cut open a major blood vessel. If the blow overcomes Armour Points and injures the target, the defender must make an opposed roll of Endurance against the original attack roll. If the defender fails, then they begin to bleed profusely. At the start of each Combat Round the recipient loses one level of Fatigue, until they collapse and possibly die. Bleeding wounds can be staunched by passing a First Aid skill roll, but the recipient can no longer perform any strenuous or violent action without re-opening the wound.` },
    { name: "Bypass Armour", tags: ["critical", "stackable", "melee", "ranged"], desc: `On a critical the attacker finds a gap in the defender's natural or worn armour. If the defender is wearing armour above natural protection, then the attacker must decide which of the two is bypassed. This effect can be stacked to bypass both. For the purposes of this effect, physical protection gained from magic is considered as being worn armour.` },
    { name: "Choose Location", tags: ["melee", "ranged"], desc: `When using hand-to-hand melee weapons the attacker may freely select the location where the blow lands, as long as that location is normally within reach. If using ranged weapons Choose Location is a Critical Success only, unless the target is within close range, and is either stationary or unaware of the attacker.` },
    { name: "Circumvent Cover", tags: ["critical", "ranged"], desc: `Assuming that the shooter is using some high-tech weaponry, they can fire around the target's cover. In most cases this will require something along the lines of self guided ammunition. If used as a trick shot, for example bouncing a laser blast off a mirror or ricocheting a bullet off a wall, then the special effect should be treated as a Critical Success only with a commensurate reduction in damage.` },
    { name: "Circumvent Parry", tags: ["critical", "melee", "ranged"], desc: `On a critical the attacker may completely bypass an otherwise successful parry.` },
    { name: "Close Range", tags: ["melee"], desc: `Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the shorter weapon.` },
    { name: "Compel Surrender", tags: ["melee", "ranged"], desc: `Allows the character a chance to force the surrender of a helpless or disadvantaged opponent; for example someone who has been disarmed, is lying prone unable to regain his footing, has suffered a serious (or worse) wound, and so on. Damage is not inflicted on the target, they are only threatened. Assuming the target is sapient and able to understand the demand, the target must make an opposed roll of Willpower against the original attack or parry roll. If the target fails, they capitulate. Games Masters may wish to reserve Compel Surrender for use against non-player characters only.` },
    { name: "Damage Weapon", tags: ["melee", "ranged"], desc: `Permits the character to damage his opponent's weapon as part of an attack or parry. If attacking, the character aims specifically at the defender's parrying weapon and applies his damage roll to it, rather than the wielder. The targeted weapon uses its own Armour Points for resisting the damage. If reduced to zero Hit Points the weapon breaks.` },
    { name: "Disarm Opponent", tags: ["melee", "ranged"], desc: `The character knocks, yanks or twists the opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original roll. If the recipient of the disarm loses, his weapon is flung a distance equal to the roll of the disarmer's Damage Modifier in metres. If there is no Damage Modifier then the weapon drops at the disarmed person's feet. The comparative size of the weapons affects the roll. Each step that the disarming character's weapon is larger increases the difficulty of the opponent's roll by one grade. Conversely each step the disarming character's weapon is smaller, makes the difficulty one grade easier. Disarming works only on creatures of up to twice the attacker's STR.` },
    { name: "Drop Foe", tags: ["ranged", "trait_siege", "trait_firearm"], desc: `Assuming the target suffers at least a minor wound from a siege weapon, firearms shot or similar, they are forced to make an Opposed Test of their Endurance against the attacker's hit roll. Failure indicates that the target succumbs to shock and pain, becoming incapacitated and unable to continue fighting. Recovery from incapacitation can be performed with a successful First Aid check or using some form of magic or narcotic stimulant if such exists in the campaign. Otherwise the temporary incapacitation lasts for a period equal to one hour divided by the Healing Rate of the target.` },
    { name: "Duck Back", tags: ["ranged"], desc: `This special effect allows the shooter to immediately duck back into cover, without needing to wait for their next Turn to use the Take Cover action. The character must be already standing or crouching adjacent to some form of cover to use Duck Back.` },
    { name: "Entangle", tags: ["trait_entangle", "melee", "ranged"], desc: `Allows a character wielding an entangling weapon, such as a whip or net, to immobilise the location struck. An entangled arm cannot use whatever it is holding; a snared leg prevents the target from moving; whilst an enmeshed head, chest or abdomen makes all skill rolls one grade harder. On his following turn the wielder may spend an Action Point to make an automatic Trip Opponent attempt. An entangled victim can attempt to free himself on his turn by either attempting an opposed roll using Brawn to yank free, or win a Special Effect and select Damage Weapon, Disarm Opponent or Slip Free.` },
    { name: "Flurry", tags: ["stackable", "melee", "unarmed"], desc: `An unarmed creature or attacker can make an immediate follow-up attack using a different limb or body part, without needing to wait for its next turn. A human attacker might follow up a punch to the abdomen with a knee to the face for example. The additional attack still costs an Action Point, but potentially allows several attacks in sequence before the defender can respond offensively.` },
    { name: "Force Failure", tags: ["opponent-fumble", "melee", "ranged"], desc: `Used when an opponent fumbles, the character can combine Force Failure with any other Special Effect which requires an opposed roll to work. Force Failure causes the opponent to fail his resistance roll by default - thereby automatically be disarmed, tripped, etc.` },
    { name: "Grip", tags: ["melee", "unarmed"], desc: `Provided the opponent is within the attacker's Unarmed Combat reach, he may use an empty hand (or similar limb capable of gripping such as claws, tails or tentacles) to hold onto the opponent, preventing them from being able to change weapon range or disengage from combat. The opponent may attempt to break free on his turn, requiring an opposed roll of either Brawn or Unarmed against whichever of the two skills the gripper prefers. If the gripped victim wins, they manage to break free. Note that some attackers using Brawn may be so strong that no amount of brute force or cunning technique can overcome their grip.` },
    { name: "Impale", tags: ["trait_impale", "melee", "ranged"], desc: `The attacker can attempt to drive an impaling weapon deep into the defender. Roll weapon damage twice, with the attacker choosing which of the two results to use for the attack. If armour is penetrated and causes a wound, then the attacker has the option of leaving the weapon in the wound, or yanking it free on their next turn. Leaving the weapon in the wound inflicts a difficulty grade on the victim's future skill attempts. The severity of the penalty depends on the size of both the creature and the weapon impaling it, as listed on the Impale Effects Table above. For simplicity's sake, further impalements with the same sized weapon inflict no additional penalties. To withdraw an impaled weapon during melee requires use of the Ready Weapon combat action. The wielder must pass an unopposed Brawn roll (or win an opposed Brawn roll if the opponent resists). Success pulls the weapon free, causing further injury to the same location equal to half the normal damage roll for that weapon, but without any damage modifier. Failure implies that the weapon remained stuck in the wound with no further effect, although the wielder may try again on their next turn. Specifically barbed weapons (such as harpoons) inflict normal damage. Armour does not reduce withdrawal damage. Whilst it remains impaled, the attacker cannot use his impaling weapon for parrying.` },
    { name: "Kill Silently", tags: ["trait_assassination", "melee", "ranged"], desc: `Restricted to those trained in a Combat Style with the Assassination benefit. It allows the attacker to neutralise a victim in complete silence, covering their mouth or grasping them about the neck whilst simultaneously stabbing, cutting or garrotting them. This prevents the victim from crying out or otherwise raising an alarm for the entire round. In addition, if during this time the attacks inflict a Serious or Major Wound, the victim will automatically fail its Endurance roll. Kill Silently can only be used on a surprised opponent, and only on the first attack against them.` },
    { name: "Marksman", tags: ["ranged"], desc: `Permits the shooter to move the Hit Location struck by his shot by one step, to an immediately adjoining body area. Physiology has an effect on what can be re-targeted, and common sense should be applied. Thus using this special effect on a humanoid would permit an attacker who rolled a leg shot, to move it up to the abdomen instead. Conversely shooting a griffin in the chest would permit selection of the forelegs, wings or head.` },
    { name: "Maximise Damage", tags: ["critical", "stackable", "melee", "ranged"], desc: `On a critical the character may substitute one of his weapon's damage dice for its full value. For example a Hatchet which normally does 1d6 damage would instead be treated as a 6, whereas a great club with 2d6 damage would instead inflict 1d6+6 damage. This special effect may be stacked. Although it can also be used for natural weapons, Maximise Damage does not affect the Damage Modifier of the attacker, which must be rolled normally.` },
    { name: "Open Range", tags: ["melee"], desc: `Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the longer weapon.` },
    { name: "Overpenetration", tags: ["trait_overpenetration", "critical", "ranged"], desc: `On a critical, if shooting at lineally positioned opponents or into a densely packed group, this special effect allows the shot to travel completely through the first victim to strike a second behind them, assuming that it overcomes the first target's body armour. The second victim however, only suffers half damage due to attenuation or slowing down of the shot. Overpenetration is generally of more use with high powered weapons that inflict large amounts of damage or those which have some sort of armour piercing ability. Any other special effects inflicted on the first target are not applied to the second.` },
    { name: "Pin Down", tags: ["stackable", "ranged"], desc: `This special effect forces the target to make an Opposed Test of their Willpower against the attacker's hit roll. Failure means that the target hunkers down behind whatever cover is available, and cannot return fire on their next Turn. Note that Pin Down works even if no actual damage is inflicted on the target (perhaps due to a successful evasion or shots striking their cover instead), as it relies on the intimidation effect of projectiles passing very close by. Although a pinned victim is unable to fire back for the requisite time, they can perform other actions provided they don't expose themselves to fire in the process, such as crawling away to new cover, communicating with others, reloading a weapon, and so on.` },
    { name: "Pin Weapon", tags: ["critical", "melee", "ranged"], desc: `On a critical the character can pin one of his opponent's weapons or shield, using his body or positioning to hold it in place. On his turn the opponent may attempt to wrestle or manoeuvre the pinned item free. This costs an Action Point and works as per the Grip special effect. Failure means that the pinned item remains unusable. In the meantime, an opponent lacking a weapon or shield in the other hand may only avoid an attack by evading, using his Unarmed skill or disengaging completely.` },
    { name: "Press Advantage", tags: ["melee"], desc: `The attacker pressures his opponent, so that his foe is forced to remain on the defensive, and cannot attack on their next turn. This allows the attacker to potentially establish an unbroken sequence of attacks whilst the defender desperately blocks. It is only effective against foes concerned with defending themselves. Foes that find themselves constantly locked under an unceasing sequence of Press Advantage will likely disengage from the combat, call for help, or use Prepare Counter to give attackers a nasty surprise.` },
    { name: "Rapid Reload", tags: ["stackable", "ranged"], desc: `When using a ranged weapon, the attacker reduces the reload time for the next shot by one. This effect can be stacked.` },
    { name: "Remise", tags: ["melee"], desc: `The attacker performs a sequential follow-up attack with a weapon of size Small on his opponent's next turn, which forces the foe to change their proactive action into a reactive one.` },
    { name: "Re-roll Damage", tags: ["melee", "ranged", "homebrew"], desc: `The attacker re-rolls their damage di(c)e and chooses the higher result to apply.<br/><br/><em style="font-size:0.75em">This is a homebrew special effect.</em>` },
    { name: "Scar Foe", tags: ["melee", "ranged"], desc: `The opponent is given a scar that will disfigure them for the rest of their life, for example a slice across the face, or an artfully inscribed letter across the chest.` },
    { name: "Spoil Spell", tags: ["melee", "ranged"], desc: `The character automatically ruins any spell in the process of being cast, providing the blow overcomes Armour Points and injures the target.` },
    { name: "Stun Location", tags: ["melee", "trait_stun-location"], desc: `The attacker can use a bludgeoning weapon to temporarily stun the body part struck. If the blow overcomes Armour Points and injures the target, the defender must make an opposed roll of Endurance vs. the original attack roll. If the defender fails, then the Hit Location is incapacitated for a number of turns equal to the damage inflicted. A blow to the torso causes the defender to stagger winded, only able to defend. A head shot renders the foe briefly insensible.` },
    { name: "Sunder", tags: ["trait_sunder", "melee"], desc: `The attacker may use a suitable weapon to damage the armour or natural protection of an opponent. Any weapon damage, after reductions for parrying or magic, is applied against the Armour Point value of the protection. Surplus damage in excess of its Armour Points is then used to reduce the AP value of that armour(ed) location - ripping straps, bursting rings, creasing plates or tearing away the hide, scales or chitin of monsters. If any damage remains after the protection has been reduced to zero AP, it carries over onto the Hit Points of the location struck.` },
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
    { name: "Entangle", tags: ["trait_entangle", "melee", "ranged"], desc: `Allows a character wielding an entangling weapon, such as a whip or net, to immobilise the location struck. An entangled arm cannot use whatever it is holding; a snared leg prevents the target from moving; whilst an enmeshed head, chest or abdomen makes all skill rolls one grade harder. On his following turn the wielder may spend an Action Point to make an automatic Trip Opponent attempt. An entangled victim can attempt to free himself on his turn by either attempting an opposed roll using Brawn to yank free, or win a Special Effect and select Damage Weapon, Disarm Opponent or Slip Free.` },
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
    { name: "Weapon Malfunction", tags: ["opponent-fumble", "melee", "ranged", "trait_firearm"], desc: `The attacker's weapon malfunctions in such a way that it is rendered useless until time can be spent repairing it.` },
    { name: "Withdraw", tags: ["melee"], desc: `The defender may automatically withdraw out of reach, breaking off engagement with that particular opponent.` },
  ]
};

const generalTags = ["critical", "opponent-fumble", "stackable", "melee", "ranged", "unarmed", "homebrew"];
const traitTags = ["trait_impale", "trait_bleed", "trait_entangle", "trait_sunder", "trait_assassination", "trait_bash", "trait_stun-location", "trait_overpenetration", "trait_siege", "trait_firearm"];

// Helper to format tags into display text
function formatTag(tag) {
    let text = tag.replace('trait_', '').replace(/-/g, ' ');
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function renderSpecialEffectsDialog(winner, effectsCount, weaponType = "", traitsStr = "", isCritical = "false", isOpponentFumble = "false") {
  function buildSFHTML(actionList, category) {
    return actionList.map(action => `
      <details class="action-pill" data-category="${category}" data-name="${action.name}" data-tags="${action.tags.join(',')}">
        <summary>${action.name} <span style="font-size:0.75em; color:#555; font-style:italic;">(${action.tags.map(formatTag).join(', ')})</span></summary>
        <div style="margin-top:4px; padding-left:10px; border-left: 2px solid var(--color-border-dark-tertiary);">${action.desc}</div>
      </details>
    `).join('');
  }

  const htmlContent = `
    <style>
      .sf-container { display: flex; height: 400px; gap: 10px; }
      .sf-sidebar { width: 175px; overflow-y: auto; border-right: 1px solid var(--color-border-dark-tertiary); padding-right: 5px; }
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
            <h4 style="margin: 0 0 5px 0; border-bottom: 1px solid #ccc;">General Filters</h4>
            ${generalTags.map(tag => `<button class="tag-btn" data-tag="${tag}">&#9898; ${formatTag(tag)}</button>`).join('')}
            <h4 style="margin: 10px 0 5px 0; border-bottom: 1px solid #ccc;">Trait Filters</h4>
            ${traitTags.map(tag => `<button class="tag-btn" data-tag="${tag}">&#9898; ${formatTag(tag)}</button>`).join('')}
            <div style="font-size: 0.75em; color: #666; margin-top: 10px; line-height: 1.2;">
                <i>Click to cycle:<br>Grey = Ignore<br>Green = Must Include<br>Red = Must Exclude</i>
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

      // Helper function to click buttons during auto setup
      function setFilter(tag, state) {
        const btn = html.find(`.tag-btn[data-tag="${tag}"]`);
        if (!btn.length) return;
        
        if (state === 'include') {
            btn.addClass('include').removeClass('exclude').html(`&#10004; Include ${formatTag(tag)}`);
            if (!filters.include.includes(tag)) filters.include.push(tag);
            filters.exclude = filters.exclude.filter(t => t !== tag);
        } else if (state === 'exclude') {
            btn.addClass('exclude').removeClass('include').html(`&#10006; Exclude ${formatTag(tag)}`);
            if (!filters.exclude.includes(tag)) filters.exclude.push(tag);
            filters.include = filters.include.filter(t => t !== tag);
        }
      }

      function applyFilters() {
        html.find('.action-pill').each(function() {
          const pill = $(this);
          const tags = pill.data('tags').split(',');
          
          let show = true;
          
          if (filters.exclude.length > 0) {
              if (filters.exclude.some(exc => tags.includes(exc))) show = false;
          }

          if (show && filters.include.length > 0) {
              const incGenerics = filters.include.filter(t => !t.startsWith('trait_'));
              if (incGenerics.length > 0 && !incGenerics.every(inc => tags.includes(inc))) show = false;

              const incTraits = filters.include.filter(t => t.startsWith('trait_'));
              const effectTraits = tags.filter(t => t.startsWith('trait_'));
              
              if (show && incTraits.length > 0 && effectTraits.length > 0) {
                  if (!effectTraits.some(t => incTraits.includes(t))) show = false;
              }
          }

          show ? pill.show() : pill.hide();
        });
      }

      // Auto-filter based on roll state variables
      if (weaponType) {
          setFilter(weaponType, 'include');
      }

      if (String(isCritical) !== 'true') {
          setFilter('critical', 'exclude');
      }

      if (String(isOpponentFumble) !== 'true') {
          setFilter('opponent-fumble', 'exclude');
      }

      if (!game.settings.get(MAGCM_MODULE_ID, "enableHomebrewRulesAndContent")) {
        setFilter('homebrew', 'exclude');
      }

      const activeTraits = traitsStr ? traitsStr.toLowerCase().split(',').map(s => 'trait_' + s.trim().replace(/\s+/g, '-')) : [];
      traitTags.forEach(tag => {
          if (activeTraits.includes(tag)) {
              setFilter(tag, 'include');
          } else {
              setFilter(tag, 'exclude');
          }
      });
      applyFilters();

      html.find('.tag-btn').on('click', function(e) {
        e.preventDefault();
        const btn = $(this);
        const tag = btn.data('tag');

        if (btn.hasClass('include')) {
            btn.removeClass('include').addClass('exclude');
            btn.html(`&#10006; Exclude ${formatTag(tag)}`);
            filters.include = filters.include.filter(t => t !== tag);
            filters.exclude.push(tag);
        } else if (btn.hasClass('exclude')) {
            btn.removeClass('exclude');
            btn.html(`&#9898; ${formatTag(tag)}`);
            filters.exclude = filters.exclude.filter(t => t !== tag);
        } else {
            btn.addClass('include');
            btn.html(`&#10004; Include ${formatTag(tag)}`);
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

// -- 5. Mythras Round-Based Endurance Roll Prompts --
Hooks.once("ready", () => {
    if (!game.settings.get(MAGCM_MODULE_ID, "enableEnduranceRollPromptsInCombat")) return;
    if (!globalThis.mythrasEnduranceRollPromptsHookInitialized) {
        globalThis.mythrasEnduranceRollPromptsHookInitialized = true;

        Hooks.on("updateCombat", async (combat, update, options, userId) => {
            console.log("Mythras Fatigue | updateCombat fired. GM:", game.user.isGM, "Round:", combat.round);
            if (!game.user.isGM) return;

            const currentRound = combat.round || 1;

            // Fetch last processed round from a flat combat document flag (persists through refreshes)
            let lastProcessedRound = combat.getFlag(MAGCM_MODULE_ID, "lastRound");
            if (lastProcessedRound === undefined) {
                lastProcessedRound = currentRound;
                await combat.setFlag(MAGCM_MODULE_ID, "lastRound", currentRound);
            }

            // If the global combat round has advanced, increment completed rounds for all combatants
            if (currentRound > lastProcessedRound) {
                const diff = currentRound - lastProcessedRound;
                console.log(`Mythras Fatigue | Round advanced from ${lastProcessedRound} to ${currentRound} (diff: ${diff})`);

                await combat.setFlag(MAGCM_MODULE_ID, "lastRound", currentRound);

                for (let combatant of combat.combatants.contents) {
                    let completed = combatant.getFlag(MAGCM_MODULE_ID, "completedRounds") || 0;
                    completed += diff;
                    await combatant.setFlag(MAGCM_MODULE_ID, "completedRounds", completed);
                    await combatant.setFlag(MAGCM_MODULE_ID, "promptedThisRound", false); // Reset prompt lock for new round cycle
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

            let actorCompleted = combatant.getFlag(MAGCM_MODULE_ID, "completedRounds") || 0;
            let promptedThisRound = combatant.getFlag(MAGCM_MODULE_ID, "promptedThisRound") || false;

            console.log(`Mythras Fatigue | Checking ${actor.name} (CON: ${con}, Interval: ${fatigueInterval}, Completed Rounds: ${actorCompleted})`);

            // Prompt on the first turn of the round following every completion of the interval
            if (actorCompleted > 0 && actorCompleted % fatigueInterval === 0 && !promptedThisRound) {
                console.log(`Mythras Fatigue | Triggering fatigue prompt for ${actor.name}!`);
                await combatant.setFlag(MAGCM_MODULE_ID, "promptedThisRound", true);

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
});

// Wound overlays depend on hit-location HP and max-HP changes; refresh relevant tokens whenever those fields change.
Hooks.on("updateItem", (item, changes) => {
    if (item.type !== "hitLocation") return;
    const relevant = foundry.utils.hasProperty(changes, "system.currentHp")
        || foundry.utils.hasProperty(changes, "system.maxHp")
        || foundry.utils.hasProperty(changes, "system.hp.max")
        || foundry.utils.hasProperty(changes, "system.mod")
        || foundry.utils.hasProperty(changes, "maxHp");
    if (!relevant) return;

    const actor = item.actor;
    if (!actor) return;
    canvas.tokens.placeables.filter(token => token.actor?.id === actor.id).forEach(token => token.refresh());
});

// Serious/Major Wound automation: capture the hit location's HP just before it changes so the paired
// updateItem hook below can detect when a location newly crosses into a worse wound tier.
Hooks.on("preUpdateItem", (item, changes, options) => {
    if (item.type !== "hitLocation") return;
    if (!foundry.utils.hasProperty(changes, "system.currentHp")) return;
    options.magcmPreviousHitLocationHp = Number(item.system?.currentHp ?? item.system?.hp?.value ?? 0);
});

// Best-effort summaries of each Mythras hit-location group's Serious/Major Wound consequences. No rulebook
// file was found in this repository to quote verbatim, so these are paraphrased for flavor only - correct
// the wording here if it doesn't match your table's printing.
const MAGCM_WOUND_LOCATION_DESCRIPTIONS = {
    head: {
        serious: "A serious wound to the head leaves the character dazed and bleeding, struggling to keep their wits about them.",
        major: "A major wound to the head threatens to knock the character out cold on top of any other injury."
    },
    chest: {
        serious: "A serious wound to the chest makes every breath ragged and painful, hampering further exertion.",
        major: "A major wound to the chest risks catastrophic internal damage and could prove fatal without swift aid."
    },
    abdomen: {
        serious: "A serious wound to the abdomen doubles the character over in agony, risking a deeper internal injury.",
        major: "A major wound to the abdomen risks severe internal bleeding and organ damage."
    },
    arm: {
        serious: "A serious wound to the arm leaves it weak and clumsy, hampering anything held in that hand.",
        major: "A major wound to the arm leaves it useless, and anything held in it may be dropped."
    },
    leg: {
        serious: "A serious wound to the leg makes standing and moving painfully difficult.",
        major: "A major wound to the leg leaves the character unable to stand without aid, and likely to collapse."
    }
};

function getMAGCMWoundLocationCategory(locName) {
    const name = String(locName || "").toLowerCase();
    if (name.includes("head")) return "head";
    if (name.includes("chest") || name.includes("torso")) return "chest";
    if (name.includes("abdomen")) return "abdomen";
    if (name.includes("arm")) return "arm";
    if (name.includes("leg")) return "leg";
    return null;
}

// Serious/Major Wound automation: whenever a hit location newly crosses into a Serious or Major wound
// (i.e. it wasn't already at that tier or worse), post a description of that wound plus an Endurance Roll
// prompt to chat. Only the active GM posts, to avoid duplicate messages from every connected client.
Hooks.on("updateItem", async (item, changes, options) => {
    if (item.type !== "hitLocation") return;
    if (!foundry.utils.hasProperty(changes, "system.currentHp")) return;
    if (game.user !== game.users.activeGM) return;

    const actor = item.actor;
    if (!actor) return;

    const maxHp = Number(getMAGCMHitLocationMaxHp(item));
    if (!Number.isFinite(maxHp) || maxHp <= 0) return;

    const rankOf = (hp) => {
        if (hp <= -maxHp) return 2; // Major Wound
        if (hp <= 0) return 1; // Serious Wound
        return 0; // Healthy or Minor Wound
    };

    const newHp = Number(item.system?.currentHp ?? item.system?.hp?.value ?? 0);
    const oldHp = Number(options?.magcmPreviousHitLocationHp ?? newHp);
    const oldRank = rankOf(oldHp);
    const newRank = rankOf(newHp);
    if (newRank <= oldRank || newRank === 0) return;

    const severityLabel = newRank === 2 ? "Major Wound" : "Serious Wound";
    const category = getMAGCMWoundLocationCategory(item.name);
    const description = category
        ? MAGCM_WOUND_LOCATION_DESCRIPTIONS[category][newRank === 2 ? "major" : "serious"]
        : `${actor.name} suffers a ${severityLabel.toLowerCase()} to their ${item.name}.`;

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
            <div style="border: 1px solid #7a0000; border-radius: 4px; padding: 8px; background: rgba(122, 0, 0, 0.05);">
                <h4 style="margin: 0 0 4px 0; border-bottom: 1px solid #7a0000; color: #7a0000;">${severityLabel}: ${item.name}</h4>
                <p style="margin: 4px 0;"><strong>${actor.name}</strong> ${description}</p>
                <button class="magcm-wound-endurance-btn" data-actor-id="${actor.id}" style="margin-top: 5px;">Roll Endurance</button>
            </div>
        `
    });
});

// Stun Location overlays depend on the hit-location's stunnedBy flag; refresh relevant tokens whenever it changes.
Hooks.on("updateItem", (item, changes) => {
    if (item.type !== "hitLocation") return;
    if (!foundry.utils.hasProperty(changes, `flags.${MAGCM_MODULE_ID}.stunnedBy`)) return;

    const actor = item.actor;
    if (!actor) return;
    canvas.tokens.placeables.filter(token => token.actor?.id === actor.id).forEach(token => token.refresh());
});

// A weapon's held/pinned/impaled state describes where and how it is being wielded by its CURRENT owner,
// so if it is created on an actor carrying over those flags (e.g. transferred/traded from another actor,
// which Foundry implements as delete-then-recreate rather than reparenting the same document), the flags
// are stale and must be cleared rather than silently referencing another actor's hit locations/records.
Hooks.on("createItem", async (item, options, userId) => {
    if (game.user.id !== userId) return; // only the client performing the transfer should clean it up
    if (item.type !== "melee-weapon" && item.type !== "ranged-weapon") return;
    if (!item.actor) return;

    const hasStaleFlags = item.getFlag(MAGCM_MODULE_ID, "holdingLocations") !== undefined
        || item.getFlag(MAGCM_MODULE_ID, "pinned") !== undefined
        || item.getFlag(MAGCM_MODULE_ID, "impaled") !== undefined;
    if (!hasStaleFlags) return;

    await item.update({
        [`flags.${MAGCM_MODULE_ID}.-=holdingLocations`]: null,
        [`flags.${MAGCM_MODULE_ID}.-=pinned`]: null,
        [`flags.${MAGCM_MODULE_ID}.-=impaled`]: null
    });
});

// Fatigue overlays depend on the actor's fatigue attribute; refresh relevant tokens whenever it changes.
Hooks.on("updateActor", (actor, changes) => {
    if (!foundry.utils.hasProperty(changes, "system.attributes.fatigue.value")) return;
    canvas.tokens.placeables.filter(token => token.actor?.id === actor.id).forEach(token => token.refresh());
});

// Actor IDs in this set skip the next "manual fatigue change" chat announcement below, because the change
// was actually caused by the Bleeding Fatigue Progression hook, which already posts its own chat message.
const magcmSkipFatigueChatActorIds = new Set();

// preUpdateActor fires before the fatigue value actually changes, so this is the only place we can still
// read the OLD value to report "changed from X to Y" in the manual-change chat announcement below.
Hooks.on("preUpdateActor", (actor, changes, options) => {
    if (!foundry.utils.hasProperty(changes, "system.attributes.fatigue.value")) return;
    options.magcmPreviousFatigueValue = actor.system.attributes?.fatigue?.value;
});

// Announce manual fatigue changes (GM adjusting the field directly, or any non-Bleeding source) in chat,
// including how long it would take the character to recover back to Fresh (mirrors the character sheet's
// own actor.fatigue.recoveryTime calculation).
Hooks.on("updateActor", async (actor, changes, options) => {
    if (!foundry.utils.hasProperty(changes, "system.attributes.fatigue.value")) return;
    if (game.user !== game.users.activeGM) return;

    if (magcmSkipFatigueChatActorIds.has(actor.id)) {
        magcmSkipFatigueChatActorIds.delete(actor.id);
        return;
    }

    const previousValue = options?.magcmPreviousFatigueValue;
    const newValue = actor.system.attributes?.fatigue?.value;
    if (!previousValue || !newValue || previousValue === newValue) return;

    const format = (value) => String(value).replace(/\w+/g, w => w.charAt(0).toUpperCase() + w.slice(1));
    const recoveryTime = actor.fatigue?.recoveryTime;

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
            <div style="border: 1px solid #444; border-radius: 4px; padding: 8px; background: rgba(255, 255, 255, 0.04);">
                <h4 style="margin: 0 0 4px 0; border-bottom: 1px solid #444;">Fatigue Changed</h4>
                <p style="margin: 4px 0;">
                    <strong>${actor.name}</strong>'s fatigue changed from <strong>${format(previousValue)}</strong> to <strong>${format(newValue)}</strong>.
                </p>
                ${recoveryTime ? `<p style="margin: 4px 0; font-size: 0.9em; color: #aaa;">Recovery to Fresh: ${recoveryTime}</p>` : ""}
            </div>
        `
    });
});

// Automatic Fatigue Increase Hook if Character is Bleeding.
Hooks.on("updateCombat", async (combat, updateData, options, userId) => {
    // Only execute this logic on the Game Master client when a new round starts
    if (!game.user.isGM) return;
    if (!updateData.round) return; // Only trigger when the round number changes
    
    // Check if the relevant module setting is enabled
    const isEnabled = game.settings.get(MAGCM_MODULE_ID, "enableBleedingFatigue");
    if (!isEnabled) return;

    // Ordered sequence of Mythras fatigue states from best to worst
    const fatigueTrack = ['fresh', 'winded', 'tired', 'wearied', 'exhausted', 'debilitated', 'incapacitated', 'semi-conscious', 'comatose', 'dead'];

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

            // Skip the "manual fatigue change" announcement above - this Bleeding-specific message covers it
            magcmSkipFatigueChatActorIds.add(actor.id);

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

// Stun Location duration progression: stun now only ever counts the STUNNED actor's own turns (not every
// combatant's turn in the encounter, and no multiplier), so this hook decrements turnsRemaining by exactly
// 1 only when combat advances to that actor's own turn - i.e. once per turn actually taken by them.
Hooks.on("updateCombat", async (combat, updateData) => {
    if (!game.user.isGM) return;
    if (!("turn" in updateData) && !("round" in updateData)) return;

    const actor = combat.combatant?.actor;
    if (!actor) return;

    const stunnedLocations = actor.items.filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "stunnedBy"));
    if (stunnedLocations.length === 0) return;

    const itemUpdates = [];
    for (const loc of stunnedLocations) {
        const stunData = loc.getFlag(MAGCM_MODULE_ID, "stunnedBy");
        const remainingTurns = Number(stunData?.turnsRemaining) - 1;
        if (remainingTurns > 0) {
            itemUpdates.push({ _id: loc.id, [`flags.${MAGCM_MODULE_ID}.stunnedBy`]: { ...stunData, turnsRemaining: remainingTurns } });
        } else {
            itemUpdates.push({ _id: loc.id, [`flags.${MAGCM_MODULE_ID}.-=stunnedBy`]: null });
        }
    }
    if (itemUpdates.length > 0) await actor.updateEmbeddedDocuments("Item", itemUpdates);
});

// Disable Attack duration progression: Press Advantage/Pin Down/Overextend Opponent also only count
// the disabled actor's OWN turns, mirroring the Stun Location hook above. The flag lives on the actor
// itself (not a hit location) since these effects disable the whole character's attacks, not a limb.
Hooks.on("updateCombat", async (combat, updateData) => {
    if (!game.user.isGM) return;
    if (!("turn" in updateData) && !("round" in updateData)) return;

    const actor = combat.combatant?.actor;
    if (!actor) return;

    const disableData = actor.getFlag(MAGCM_MODULE_ID, "attackDisabledBy");
    if (!disableData) return;

    const remainingTurns = Number(disableData.turnsRemaining) - 1;
    if (remainingTurns > 0) {
        await actor.setFlag(MAGCM_MODULE_ID, "attackDisabledBy", { ...disableData, turnsRemaining: remainingTurns });
    } else {
        await actor.unsetFlag(MAGCM_MODULE_ID, "attackDisabledBy");
    }
});

// --- Take Cover Icons ---
Hooks.once("ready", () => {
    // Standard humanoid locations and their spatial grid areas
    const HUMANOID_SLOTS = {
        "Head":      { area: "head", label: "Head" },
        "Chest":     { area: "chest", label: "Chest" },
        "Abdomen":   { area: "abdo", label: "Abdomen" },
        "Right Arm": { area: "rarm", label: "R. Arm" },
        "Left Arm":  { area: "larm", label: "L. Arm" },
        "Right Leg": { area: "rleg", label: "R. Leg" },
        "Left Leg":  { area: "lleg", label: "L. Leg" }
    };

    // Helper: Build HTML for Covered Locations Tooltip (Paperdoll Layout)
    const buildCoverTooltipHTML = (actor, coveredLocations) => {
        const allHitLocations = actor.items.filter(i => i.type === "hitLocation");
        const actorBodyParts = {};
        allHitLocations.forEach(loc => {
            const name = loc.name.toLowerCase().trim();
            if (name.includes("head")) actorBodyParts.head = true;
            else if (name.includes("chest")) actorBodyParts.chest = true;
            else if (name.includes("abdomen")) actorBodyParts.abdomen = true;
            else if (name.includes("right arm")) actorBodyParts.rightArm = true;
            else if (name.includes("left arm")) actorBodyParts.leftArm = true;
            else if (name.includes("right leg")) actorBodyParts.rightLeg = true;
            else if (name.includes("left leg")) actorBodyParts.leftLeg = true;
        });

        const hasAllHumanoidSlots = actorBodyParts.head && actorBodyParts.chest && actorBodyParts.abdomen &&
                                    actorBodyParts.rightArm && actorBodyParts.leftArm && 
                                    actorBodyParts.rightLeg && actorBodyParts.leftLeg;

        const humanoidCover = new Map();
        const otherCover = [];

        coveredLocations.forEach(loc => {
            const data = { location: loc };
            if (HUMANOID_SLOTS[loc.name] && !humanoidCover.has(loc.name)) {
                humanoidCover.set(loc.name, data);
            } else {
                otherCover.push(data);
            }
        });

        const isHumanoid = hasAllHumanoidSlots;
        let bodyContent = "";
        const coverImg = `${MAGCM_ICONS_PATH}overlays/in-cover.svg`;

        if (isHumanoid) {
            const gridCells = Object.entries(HUMANOID_SLOTS).map(([locName, slot]) => {
                const coverData = humanoidCover.get(locName);
                if (coverData) {
                    return `
                        <div style="grid-area: ${slot.area}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(46, 139, 87, 0.15); border: 1px solid #2e8b57; border-radius: 4px; padding: 3px 2px; text-align: center;">
                            <img src="${coverImg}" style="width: 20px; height: 20px; border: none; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));" />
                            <span style="font-size: 8px; line-height: 1.1; margin-top: 2px; font-weight: bold; color: #e0ffe0;">In Cover</span>
                        </div>`;
                } else {
                    return `
                        <div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; padding: 2px; opacity: 0.35;">
                            <span style="font-size: 8px; color: #aaa;">${slot.label}</span>
                        </div>`;
                }
            }).join("");

            bodyContent += `
                <div style="display: grid; grid-template-columns: repeat(3, minmax(65px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px; margin-top: 4px;">
                    ${gridCells}
                </div>`;
        }

        if (otherCover.length > 0 || !isHumanoid) {
            const listItems = (isHumanoid ? otherCover : coveredLocations.map(loc => ({
                location: loc
            }))).map(c => `
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 3px; border: 1px solid #444;">
                    <img src="${coverImg}" style="width: 18px; height: 18px; border: none; object-fit: contain;" />
                    <span style="font-size: 10px; font-weight: 500;">In Cover</span>
                    <span style="font-size: 9px; color: #aaa; margin-left: auto;">(${c.location.name})</span>
                </div>
            `).join("");

            bodyContent += `
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: ${isHumanoid ? "6px" : "4px"};">
                    ${isHumanoid ? `<div style="font-size: 9px; color: #888; text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 1px;">Other Covered Locations</div>` : ""}
                    ${listItems}
                </div>`;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 210px; max-width: 260px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #80ffcc;">
                    Hit Locations in Cover
                </div>
                ${bodyContent}
            </div>`;
    };

    // Helper to bind standard Foundry tooltips with pre-rendered HTML support
    const attachTooltip = (sprite, htmlContent) => {
        sprite.eventMode = "static";
        sprite.interactive = true;
        sprite.cursor = "pointer";

        const showTooltip = (event) => {
            const nativeEvent = event.nativeEvent || event.data?.originalEvent;
            const clientX = nativeEvent?.clientX ?? event.global?.x;
            const clientY = nativeEvent?.clientY ?? event.global?.y;

            if (clientX !== undefined && clientY !== undefined) {
                const topEl = document.elementFromPoint(clientX, clientY);
                const isCanvas = topEl && (topEl.tagName === "CANVAS" || Boolean(topEl.closest("#board")));

                if (!isCanvas) {
                    game.tooltip.deactivate();
                    return;
                }
            }

            game.tooltip.activate(canvas.app.canvas || canvas.app.view, {
                text: " ",
                direction: "UP"
            });

            const tooltipEl = document.getElementById("tooltip");
            if (tooltipEl && htmlContent) {
                tooltipEl.innerHTML = htmlContent;

                if (clientX !== undefined && clientY !== undefined) {
                    tooltipEl.style.left = `${clientX}px`;
                    tooltipEl.style.top = `${clientY - 12}px`;
                }
            }
        };

        sprite.on("pointerover", showTooltip);
        sprite.on("pointermove", showTooltip);
        sprite.on("pointerout", () => {
            game.tooltip.deactivate();
        });
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const coveredLocations = actor.items.filter(i => {
            if (i.type !== "hitLocation") return false;
            return Boolean(i.getFlag(MAGCM_MODULE_ID, "inCover"));
        });

        const coveredKey = coveredLocations.map(l => {
            return `${l.id}:${l.getFlag(MAGCM_MODULE_ID, "inCover")}`;
        }).join("|");

        if (coveredLocations.length === 0) {
            if (token.coverOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.coverOverlayContainer);
                token.coverOverlayContainer.destroy({ children: true });
                token.coverOverlayContainer = null;
                token._coveredLocationsKey = null;
            }
            return;
        }

        if (token.coverOverlayContainer && token._coveredLocationsKey === coveredKey) {
            return;
        }

        if (token.coverOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.coverOverlayContainer);
            token.coverOverlayContainer.destroy({ children: true });
            token.coverOverlayContainer = null;
        }

        token._coveredLocationsKey = coveredKey;

        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.coverOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const iconSize = 16;
        const coverImg = `${MAGCM_ICONS_PATH}overlays/in-cover.svg`;
        const coverTooltipHTML = buildCoverTooltipHTML(actor, coveredLocations);

        loadTexture(coverImg).then(texture => {
            if (!overlayContainer.destroyed) {
                const coverSprite = new PIXI.Sprite(texture);
                coverSprite.width = iconSize;
                coverSprite.height = iconSize;
                coverSprite.alpha = 0.3;

                // Middle-right edge of the token
                coverSprite.x = 0;
                coverSprite.y = (token.h - iconSize) / 2;

                attachTooltip(coverSprite, coverTooltipHTML);

                overlayContainer.addChild(coverSprite);
            }
        });
    });
});

// --- Equipped Weapon Icons ---
Hooks.once("ready", () => {
    // Helper: Build HTML for individual Weapon Tooltips (Stat Card Layout)
    const buildWeaponTooltipHTML = (actor, weapon) => {
        const sys = weapon.system || {};
        
        // Extract basic weapon statistics
        const damage = sys.damage || "—";
        const isRanged = weapon.type === "ranged-weapon";

        const locationIds = weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
        const locationNames = locationIds
            .map(id => actor.items.get(id)?.name)
            .filter(Boolean)
            .join(", ") || "Unspecified Location";
        const pinned = weapon.getFlag(MAGCM_MODULE_ID, "pinned");
        const impaled = weapon.getFlag(MAGCM_MODULE_ID, "impaled");
        const stateHtml = pinned
            ? `<span style="font-size: 9px; color: #ff8888;">Pinned: cannot attack or parry</span>`
            : impaled && !isRanged
                ? `<span style="font-size: 9px; color: #ffdd80;">Impaling: ${impaled.targetName || "Target"} (${impaled.hitLocationName || "Location"})</span>`
                : "";

        let statsGridHTML = "";

        if (isRanged) {
            const force = sys.force || "—";
            const impale = sys["impale-size"] ?? sys.impaleSize ?? "—";
            const totalLoad = sys.load ?? "—";
            const currentLoad = weapon.getFlag(MAGCM_MODULE_ID, "loadProgress") ?? totalLoad;
            const loadText = (currentLoad !== "—" || totalLoad !== "—") ? `${currentLoad}/${totalLoad}` : "—";
            const ammo = sys.ammo ?? "—";
            const ap = sys.ap ?? sys.armourPoints ?? "—";
            const hp = sys.hp ?? sys.hitPoints ?? "—";
            const apHp = (ap !== "—" || hp !== "—") ? `${ap}/${hp}` : "—";
            const conditionBadge = getMAGCMConditionBadge(weapon, hp, "originalHp", "HP");

            statsGridHTML = `
                <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 4px; text-align: center;">
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">Damage</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${damage}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">Force</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${force}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">Impale</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${impale}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">Load</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${loadText}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">Ammo</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${ammo}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">AP/HP</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${apHp}</div>
                    </div>
                </div>${conditionBadge ? `<div style="text-align: center; margin-top: 4px;"><span style="font-size: 9px; color: ${conditionBadge.color};"><i class="fas ${conditionBadge.icon}"></i> ${conditionBadge.text}</span></div>` : ""}`;
        } else {
            const reach = sys.reach || "—";
            const size = sys.size || "—";
            
            const ap = sys.ap ?? sys.armourPoints ?? "—";
            const hp = sys.hp ?? sys.hitPoints ?? "—";
            const apHp = (ap !== "—" || hp !== "—") ? `${ap}/${hp}` : "—";
            const conditionBadge = getMAGCMConditionBadge(weapon, hp, "originalHp", "HP");

            statsGridHTML = `
                <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; text-align: center;">
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">Damage</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${damage}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">Reach</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${reach}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">Size</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${size}</div>
                    </div>
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">AP/HP</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${apHp}</div>
                    </div>
                </div>${conditionBadge ? `<div style="text-align: center; margin-top: 4px;"><span style="font-size: 9px; color: ${conditionBadge.color};"><i class="fas ${conditionBadge.icon}"></i> ${conditionBadge.text}</span></div>` : ""}`;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 6px; min-width: 210px; padding: 2px;">
                <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">
                    <img src="${weapon.img}" style="width: 28px; height: 28px; border: none; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));" />
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 11px; font-weight: bold; color: #ffdd80;">${weapon.name}</span>
                        <span style="font-size: 9px; color: #aaa;">Held: ${locationNames}</span>
                        ${stateHtml}
                    </div>
                </div>
                ${statsGridHTML}
            </div>`;
    };

    // Helper to bind standard Foundry tooltips with pre-rendered HTML support
    const attachTooltip = (sprite, htmlContent) => {
        sprite.eventMode = "static";
        sprite.interactive = true;
        sprite.cursor = "pointer";

        const showTooltip = (event) => {
            const nativeEvent = event.nativeEvent || event.data?.originalEvent;
            const clientX = nativeEvent?.clientX ?? event.global?.x;
            const clientY = nativeEvent?.clientY ?? event.global?.y;

            if (clientX !== undefined && clientY !== undefined) {
                const topEl = document.elementFromPoint(clientX, clientY);
                const isCanvas = topEl && (topEl.tagName === "CANVAS" || Boolean(topEl.closest("#board")));

                if (!isCanvas) {
                    game.tooltip.deactivate();
                    return;
                }
            }

            game.tooltip.activate(canvas.app.canvas || canvas.app.view, {
                text: " ",
                direction: "UP"
            });

            const tooltipEl = document.getElementById("tooltip");
            if (tooltipEl && htmlContent) {
                tooltipEl.innerHTML = htmlContent;

                if (clientX !== undefined && clientY !== undefined) {
                    tooltipEl.style.left = `${clientX}px`;
                    tooltipEl.style.top = `${clientY - 12}px`;
                }
            }
        };

        sprite.on("pointerover", showTooltip);
        sprite.on("pointermove", showTooltip);
        sprite.on("pointerout", () => {
            game.tooltip.deactivate();
        });
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const heldWeapons = actor.items.filter(i => {
            if (i.type !== "melee-weapon" && i.type !== "ranged-weapon") return false;
            const locations = i.getFlag(MAGCM_MODULE_ID, "holdingLocations");
            return Array.isArray(locations) && locations.length > 0;
        });

        const weaponsKey = heldWeapons.map(w => {
            const locs = w.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
            const load = w.getFlag(MAGCM_MODULE_ID, "loadProgress") ?? "";
            const ammo = w.system?.ammo ?? "";
            const pinned = w.getFlag(MAGCM_MODULE_ID, "pinned") ? "pinned" : "";
            const impaled = w.getFlag(MAGCM_MODULE_ID, "impaled");
            const hp = w.system?.hp ?? "";
            return `${w.id}:${locs.join(",")}:${load}:${ammo}:${pinned}:${impaled?.targetId || ""}:${impaled?.hitLocationId || ""}:${hp}`;
        }).join("|");

        if (heldWeapons.length === 0) {
            if (token.weaponOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.weaponOverlayContainer);
                token.weaponOverlayContainer.destroy({ children: true });
                token.weaponOverlayContainer = null;
                token._heldWeaponsKey = null;
            }
            return;
        }

        if (token.weaponOverlayContainer && token._heldWeaponsKey === weaponsKey) {
            return;
        }

        if (token.weaponOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.weaponOverlayContainer);
            token.weaponOverlayContainer.destroy({ children: true });
            token.weaponOverlayContainer = null;
        }

        token._heldWeaponsKey = weaponsKey;

        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.weaponOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const iconSize = 16;
        let weaponIndex = 0;

        heldWeapons.forEach(weapon => {
            if (!weapon.img) return;

            const weaponTooltipHTML = buildWeaponTooltipHTML(actor, weapon);

            loadTexture(weapon.img).then(texture => {
                if (!overlayContainer.destroyed) {
                    const sprite = new PIXI.Sprite(texture);
                    sprite.width = iconSize;
                    sprite.height = iconSize;
                    sprite.alpha = 0.5;

                    sprite.x = token.w - (iconSize * (weaponIndex + 1)) - (2 * weaponIndex);
                    sprite.y = token.h - iconSize;

                    attachTooltip(sprite, weaponTooltipHTML);

                    overlayContainer.addChild(sprite);
                    weaponIndex++;
                }
            });
        });
    });
});

// --- Impaled Location Icons ---
Hooks.once("ready", () => {
    const HUMANOID_SLOTS = {
        "Head":      { area: "head", label: "Head" },
        "Chest":     { area: "chest", label: "Chest" },
        "Abdomen":   { area: "abdo", label: "Abdomen" },
        "Right Arm": { area: "rarm", label: "R. Arm" },
        "Left Arm":  { area: "larm", label: "L. Arm" },
        "Right Leg": { area: "rleg", label: "R. Leg" },
        "Left Leg":  { area: "lleg", label: "L. Leg" }
    };

    const isActorHumanoid = (actor) => {
        const bodyPartMap = {};
        actor.items.filter(i => i.type === "hitLocation").forEach(loc => {
            const name = loc.name.toLowerCase().trim();
            if (name.includes("head")) bodyPartMap.head = true;
            else if (name.includes("chest")) bodyPartMap.chest = true;
            else if (name.includes("abdomen")) bodyPartMap.abdomen = true;
            else if (name.includes("right arm")) bodyPartMap.rightArm = true;
            else if (name.includes("left arm")) bodyPartMap.leftArm = true;
            else if (name.includes("right leg")) bodyPartMap.rightLeg = true;
            else if (name.includes("left leg")) bodyPartMap.leftLeg = true;
        });
        return Boolean(bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
            bodyPartMap.rightArm && bodyPartMap.leftArm && bodyPartMap.rightLeg && bodyPartMap.leftLeg);
    };

    // Shared humanoid-grid tooltip builder for impaled / entangled location overlays
    const buildLocationTooltipHTML = (actor, flaggedLocations, { title, accentColor, renderRecords }) => {
        const isHumanoid = isActorHumanoid(actor);
        const humanoidMap = new Map();
        const otherLocations = [];
        flaggedLocations.forEach(item => {
            if (isHumanoid && HUMANOID_SLOTS[item.name] && !humanoidMap.has(item.name)) humanoidMap.set(item.name, item);
            else otherLocations.push(item);
        });

        let bodyContent = "";
        if (isHumanoid) {
            const gridCells = Object.entries(HUMANOID_SLOTS).map(([locName, slot]) => {
                const item = humanoidMap.get(locName);
                if (item) {
                    return `
                        <div style="grid-area: ${slot.area}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${accentColor.bg}; border: 1px solid ${accentColor.border}; border-radius: 4px; padding: 3px 2px; text-align: center;">
                            <span style="font-size: 9px; font-weight: bold; color: ${accentColor.text};">${locName}</span>
                            ${renderRecords(item)}
                        </div>`;
                }
                return `
                    <div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; padding: 2px; opacity: 0.35;">
                        <span style="font-size: 8px; color: #aaa;">${slot.label}</span>
                    </div>`;
            }).join("");
            bodyContent += `
                <div style="display: grid; grid-template-columns: repeat(3, minmax(65px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px; margin-top: 4px;">
                    ${gridCells}
                </div>`;
        }

        if (otherLocations.length > 0 || !isHumanoid) {
            const listItems = (isHumanoid ? otherLocations : flaggedLocations).map(item => `
                <div style="background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 3px; border: 1px solid #444; margin-top: 3px;">
                    <span style="font-size: 10px; font-weight: 500;">${item.name}</span>
                    ${renderRecords(item)}
                </div>
            `).join("");
            bodyContent += `
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: ${isHumanoid ? "6px" : "4px"};">
                    ${isHumanoid ? `<div style="font-size: 9px; color: #888; text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 1px;">Other ${title}</div>` : ""}
                    ${listItems}
                </div>`;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 210px; max-width: 260px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: ${accentColor.text};">
                    ${title}
                </div>
                ${bodyContent}
            </div>`;
    };

    const attachOverlayTooltip = (sprite, getTooltipHtml) => {
        sprite.eventMode = "static";
        sprite.interactive = true;
        sprite.cursor = "pointer";
        const showTooltip = (event) => {
            const nativeEvent = event.nativeEvent || event.data?.originalEvent;
            const clientX = nativeEvent?.clientX ?? event.global?.x;
            const clientY = nativeEvent?.clientY ?? event.global?.y;

            if (clientX !== undefined && clientY !== undefined) {
                const topElement = document.elementFromPoint(clientX, clientY);
                const isCanvasVisible = topElement
                    && (topElement.tagName === "CANVAS" || Boolean(topElement.closest("#board")));
                if (!isCanvasVisible) {
                    game.tooltip.deactivate();
                    return;
                }
            }

            game.tooltip.activate(canvas.app.canvas || canvas.app.view, { text: " ", direction: "UP" });
            const tooltip = document.getElementById("tooltip");
            if (tooltip) {
                tooltip.innerHTML = getTooltipHtml();
                if (clientX !== undefined && clientY !== undefined) {
                    tooltip.style.left = `${clientX}px`;
                    tooltip.style.top = `${clientY - 12}px`;
                }
            }
        };
        sprite.on("pointerover", showTooltip);
        sprite.on("pointermove", showTooltip);
        sprite.on("pointerout", () => game.tooltip.deactivate());
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const impaledLocations = actor.items.filter(item => item.type === "hitLocation" && item.getFlag(MAGCM_MODULE_ID, "impaledBy"));
        const impaledKey = impaledLocations.map(item => {
            const stored = item.getFlag(MAGCM_MODULE_ID, "impaledBy");
            const records = Array.isArray(stored) ? stored : [stored];
            return records.map(data => `${item.id}:${data.impaleId || "legacy"}:${data.weaponId}:${data.weaponSize}`).join("|");
        }).sort().join("|");

        if (impaledLocations.length === 0) {
            if (token.impaledOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.impaledOverlayContainer);
                token.impaledOverlayContainer.destroy({ children: true });
                token.impaledOverlayContainer = null;
                token._impaledLocationsKey = null;
            }
            return;
        }

        if (token.impaledOverlayContainer && token._impaledLocationsKey === impaledKey) return;
        if (token.impaledOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.impaledOverlayContainer);
            token.impaledOverlayContainer.destroy({ children: true });
        }

        token._impaledLocationsKey = impaledKey;
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.impaledOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const getImpaledRecords = item => {
            const stored = item.getFlag(MAGCM_MODULE_ID, "impaledBy");
            return Array.isArray(stored) ? stored : (stored ? [stored] : []);
        };
        const renderRecords = item => getImpaledRecords(item).map(data => {
            const sourceName = data.isProjectile ? `${data.weaponName} projectile` : data.weaponName;
            return `<div style="font-size:10px;">${sourceName} (${data.weaponSize})<br><span style="color:#aaa;">By ${data.attackerName}</span></div>`;
        }).join("");
        const getTooltipHtml = () => buildLocationTooltipHTML(actor, impaledLocations, {
            title: "Impaled Locations",
            accentColor: { bg: "rgba(255,80,80,0.12)", border: "#ff8888", text: "#ff8888" },
            renderRecords
        });

        loadTexture(`${MAGCM_ICONS_PATH}conditions/impaled.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = 16;
            sprite.height = 16;
            sprite.alpha = 0.3;
            sprite.x = (token.w - sprite.width) / 4;
            sprite.y = token.h - sprite.height;
            attachOverlayTooltip(sprite, getTooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });

    const WOUND_SEVERITIES = [
        { key: "minor-wound", label: "Minor Wound", rank: 1 },
        { key: "serious-wound", label: "Serious Wound", rank: 2 },
        { key: "major-wound", label: "Major Wound", rank: 3 }
    ];
    const WOUND_STYLE = {
        "minor-wound": { hex: "#fff000", border: "#d9c800", text: "#ffffff" },
        "serious-wound": { hex: "#ff8a00", border: "#d96d00", text: "#ffffff" },
        "major-wound": { hex: "#ff0000", border: "#cc0000", text: "#ffffff" }
    };

    const hexToRgba = (hex, alpha) => {
        const cleaned = String(hex || "").replace("#", "");
        if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return `rgba(180,40,40,${alpha})`;
        const r = parseInt(cleaned.slice(0, 2), 16);
        const g = parseInt(cleaned.slice(2, 4), 16);
        const b = parseInt(cleaned.slice(4, 6), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };

    const getWoundSeverityData = (loc) => {
        const maxHp = Number(getMAGCMHitLocationMaxHp(loc));
        if (!Number.isFinite(maxHp) || maxHp <= 0) return null;
        const currentHp = Number(loc?.system?.currentHp ?? loc?.system?.hp?.value ?? maxHp);
        if (!Number.isFinite(currentHp)) return null;
        if (currentHp > 0 && currentHp < maxHp) return WOUND_SEVERITIES[0];
        if (currentHp <= 0 && currentHp > -maxHp) return WOUND_SEVERITIES[1];
        if (currentHp <= -maxHp) return WOUND_SEVERITIES[2];
        return null;
    };

    const getWoundLocationIconPath = (severityData, locName, isHumanoid) => {
        if (!severityData) return "";
        if (!isHumanoid) return `${MAGCM_ICONS_PATH}conditions/wounds/${severityData.key}.svg`;
        const normalized = String(locName || "").trim().toLowerCase().replace(/\s+/g, "-");
        return `${MAGCM_ICONS_PATH}conditions/wounds/${severityData.key}_${normalized}.svg`;
    };

    const buildWoundTooltipHTML = (actor, woundEntries) => {
        const isHumanoid = isActorHumanoid(actor);
        const hitLocations = actor.items.filter(i => i.type === "hitLocation");
        const woundableByName = new Map(
            hitLocations
                .filter(loc => Number(getMAGCMHitLocationMaxHp(loc)) > 0)
                .map(loc => [loc.name, loc])
        );
        const woundById = new Map(woundEntries.map(entry => [entry.location.id, entry]));

        let bodyContent = "";
        if (isHumanoid) {
            const gridCells = Object.entries(HUMANOID_SLOTS).map(([locName, slot]) => {
                const loc = woundableByName.get(locName);
                if (!loc) return `<div style="grid-area: ${slot.area};"></div>`;

                const wound = woundById.get(loc.id);
                if (!wound) {
                    return `
                        <div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; padding: 2px; opacity: 0.35;">
                            <span style="font-size: 8px; color: #aaa;">${slot.label}</span>
                        </div>`;
                }

                const iconPath = getWoundLocationIconPath(wound.severity, locName, true);
                const style = WOUND_STYLE[wound.severity.key] || WOUND_STYLE["major-wound"];
                return `
                    <div style="grid-area: ${slot.area}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${hexToRgba(style.hex, 0.18)}; border: 1px solid ${style.border}; border-radius: 4px; padding: 3px 2px; text-align: center;">
                        <img src="${iconPath}" style="width: 20px; height: 20px; border: none; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));" />
                        <span style="font-size: 8px; line-height: 1.1; margin-top: 2px; font-weight: bold; color: ${style.text};">${locName}</span>
                        <span style="font-size: 8px; color: ${style.text};">${wound.severity.label}</span>
                    </div>`;
            }).join("");

            bodyContent += `
                <div style="display: grid; grid-template-columns: repeat(3, minmax(65px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px; margin-top: 4px;">
                    ${gridCells}
                </div>`;
        }

        const listEntries = isHumanoid
            ? woundEntries.filter(entry => !HUMANOID_SLOTS[entry.location.name])
            : [...woundEntries].sort((a, b) => {
                if (b.severity.rank !== a.severity.rank) return b.severity.rank - a.severity.rank;
                return String(a.location?.name || "").localeCompare(String(b.location?.name || ""));
            });
        if (listEntries.length > 0 || !isHumanoid) {
            const listItems = listEntries.map(entry => {
                const iconPath = getWoundLocationIconPath(entry.severity, entry.location.name, false);
                const style = WOUND_STYLE[entry.severity.key] || WOUND_STYLE["major-wound"];
                return `
                    <div style="display: flex; align-items: center; gap: 6px; background: ${hexToRgba(style.hex, 0.05)}; padding: 3px 6px; border-radius: 3px; border: 1px solid ${style.border};">
                        <img src="${iconPath}" style="width: 18px; height: 18px; border: none; object-fit: contain;" />
                        <span style="font-size: 10px; font-weight: 500; color: ${style.text};">${entry.severity.label}</span>
                        <span style="font-size: 9px; color: #aaa; margin-left: auto;">(${entry.location.name})</span>
                    </div>`;
            }).join("");

            bodyContent += `
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: ${isHumanoid ? "6px" : "4px"};">
                    ${isHumanoid ? `<div style="font-size: 9px; color: #888; text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 1px;">Other Wounds</div>` : ""}
                    ${listItems}
                </div>`;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 210px; max-width: 260px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #ff9d9d;">
                    Wounds
                </div>
                ${bodyContent}
            </div>`;
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const woundEntries = [];
        const hitLocations = actor.items.filter(item => item.type === "hitLocation");
        for (const loc of hitLocations) {
            const maxHp = Number(getMAGCMHitLocationMaxHp(loc));
            if (!Number.isFinite(maxHp) || maxHp <= 0) continue;
            const severity = getWoundSeverityData(loc);
            if (severity) woundEntries.push({ location: loc, severity });
        }

        const woundKey = hitLocations.map(loc => {
            const maxHp = Number(getMAGCMHitLocationMaxHp(loc));
            const currentHp = Number(loc?.system?.currentHp ?? loc?.system?.hp?.value ?? 0);
            const severity = getWoundSeverityData(loc)?.key || "healthy";
            return `${loc.id}:${maxHp}:${currentHp}:${severity}`;
        }).sort().join("|");

        if (woundEntries.length === 0) {
            if (token.woundOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.woundOverlayContainer);
                token.woundOverlayContainer.destroy({ children: true });
                token.woundOverlayContainer = null;
                token._woundLocationsKey = null;
            }
            return;
        }

        if (token.woundOverlayContainer && token._woundLocationsKey === woundKey) return;
        if (token.woundOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.woundOverlayContainer);
            token.woundOverlayContainer.destroy({ children: true });
        }

        const highestWound = woundEntries.reduce((current, entry) => {
            if (!current) return entry;
            return entry.severity.rank > current.severity.rank ? entry : current;
        }, null);

        token._woundLocationsKey = woundKey;
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.woundOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const tooltipHtml = buildWoundTooltipHTML(actor, woundEntries);
        const iconPath = `${MAGCM_ICONS_PATH}conditions/wounds/${highestWound.severity.key}.svg`;

        loadTexture(iconPath).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = 16;
            sprite.height = 16;
            sprite.alpha = 0.3;
            sprite.x = 0;
            sprite.y = (token.h - sprite.height) / 2;
            attachOverlayTooltip(sprite, () => tooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });

    // --- Entangled Location Icons ---
    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const entangledLocations = actor.items.filter(item => item.type === "hitLocation" && item.getFlag(MAGCM_MODULE_ID, "entangledBy"));
        const entangledKey = entangledLocations.map(item => {
            const data = item.getFlag(MAGCM_MODULE_ID, "entangledBy") || {};
            return `${item.id}:${data.weaponId || ""}:${data.attackerActorId || ""}`;
        }).sort().join("|");

        if (entangledLocations.length === 0) {
            if (token.entangledOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.entangledOverlayContainer);
                token.entangledOverlayContainer.destroy({ children: true });
                token.entangledOverlayContainer = null;
                token._entangledLocationsKey = null;
            }
            return;
        }

        if (token.entangledOverlayContainer && token._entangledLocationsKey === entangledKey) return;
        if (token.entangledOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.entangledOverlayContainer);
            token.entangledOverlayContainer.destroy({ children: true });
        }

        token._entangledLocationsKey = entangledKey;
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.entangledOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const renderRecords = item => {
            const data = item.getFlag(MAGCM_MODULE_ID, "entangledBy") || {};
            return `<div style="font-size:10px;">${data.weaponName || "Unknown"}<br><span style="color:#aaa;">By ${data.attackerName || "Unknown"}</span></div>`;
        };
        const getTooltipHtml = () => buildLocationTooltipHTML(actor, entangledLocations, {
            title: "Entangled Locations",
            accentColor: { bg: "rgba(120,140,255,0.14)", border: "#8899ff", text: "#a3b3ff" },
            renderRecords
        });

        loadTexture(`${MAGCM_ICONS_PATH}conditions/entangled.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = 16;
            sprite.height = 16;
            sprite.alpha = 0.3;
            sprite.x = (token.w - sprite.width) / 2;
            sprite.y = (token.h - sprite.height) / 2;
            attachOverlayTooltip(sprite, getTooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });

    // --- Stun Location Icons (replaces the old ActiveEffect-based "Stunned - <location>" effects) ---
    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const stunnedLocations = actor.items.filter(item => item.type === "hitLocation" && item.getFlag(MAGCM_MODULE_ID, "stunnedBy"));
        const stunnedKey = stunnedLocations.map(item => {
            const data = item.getFlag(MAGCM_MODULE_ID, "stunnedBy") || {};
            return `${item.id}:${data.weaponId || ""}:${data.attackerActorId || ""}:${data.turnsRemaining}`;
        }).sort().join("|");

        if (stunnedLocations.length === 0) {
            if (token.stunnedOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.stunnedOverlayContainer);
                token.stunnedOverlayContainer.destroy({ children: true });
                token.stunnedOverlayContainer = null;
                token._stunnedLocationsKey = null;
            }
            return;
        }

        if (token.stunnedOverlayContainer && token._stunnedLocationsKey === stunnedKey) return;
        if (token.stunnedOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.stunnedOverlayContainer);
            token.stunnedOverlayContainer.destroy({ children: true });
        }

        token._stunnedLocationsKey = stunnedKey;
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.stunnedOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        // Each stunned location's tooltip entry shows its own location icon, remaining turns, and the source weapon/attacker
        const renderRecords = item => {
            const data = item.getFlag(MAGCM_MODULE_ID, "stunnedBy") || {};
            const iconPath = getStunLocationIconPath(item.name);
            const turnsLabel = data.turnsRemaining === 1 ? "1 turn" : `${data.turnsRemaining} turns`;
            return `
                <div style="display:flex; align-items:center; gap:5px; margin-top:2px;">
                    <img src="${iconPath}" style="width:16px; height:16px; border:none; object-fit:contain;" />
                    <div style="font-size:10px;">
                        <strong>${turnsLabel} remaining</strong><br>
                        <span style="color:#aaa;">${data.weaponName || "Unknown"} (${data.attackerName || "Unknown"})</span>
                    </div>
                </div>`;
        };
        const getTooltipHtml = () => buildLocationTooltipHTML(actor, stunnedLocations, {
            title: "Stunned Locations",
            accentColor: { bg: "rgba(255,220,80,0.14)", border: "#e0c04a", text: "#ffe38a" },
            renderRecords
        });

        loadTexture(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = 16;
            sprite.height = 16;
            sprite.alpha = 0.3;
            sprite.x = (token.w - sprite.width) / 2;
            sprite.y = 16;
            attachOverlayTooltip(sprite, getTooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });

    // --- Fatigue Icons (replaces the old ActiveEffect-based "Fatigue - <state>" effects) ---
    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const fatigueValue = foundry.utils.getProperty(actor, "system.attributes.fatigue.value")?.toLowerCase();
        const isFatigued = Boolean(fatigueValue) && fatigueValue !== "fresh";

        if (!isFatigued) {
            if (token.fatigueOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.fatigueOverlayContainer);
                token.fatigueOverlayContainer.destroy({ children: true });
                token.fatigueOverlayContainer = null;
                token._fatigueValueKey = null;
            }
            return;
        }

        if (token.fatigueOverlayContainer && token._fatigueValueKey === fatigueValue) return;
        if (token.fatigueOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.fatigueOverlayContainer);
            token.fatigueOverlayContainer.destroy({ children: true });
        }

        token._fatigueValueKey = fatigueValue;
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.fatigueOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const formattedFatigue = fatigueValue.replace(/\w+/g, word => word.charAt(0).toUpperCase() + word.slice(1));
        const tooltipHtml = `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 140px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #ffcf7d;">
                    Fatigue
                </div>
                <div style="text-align: center; font-size: 10px; margin-top: 4px;">${formattedFatigue}</div>
            </div>`;

        loadTexture(`${MAGCM_ICONS_PATH}conditions/fatigue/fatigue_${fatigueValue}.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = 16;
            sprite.height = 16;
            sprite.alpha = 0.3;
            sprite.x = token.w - sprite.width - 16;
            sprite.y = 0;
            attachOverlayTooltip(sprite, () => tooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });
});

// --- Warded Location Icons ---
Hooks.once("ready", () => {
    // Standard humanoid locations and their spatial grid areas
    const HUMANOID_SLOTS = {
        "Head":      { area: "head", label: "Head" },
        "Chest":     { area: "chest", label: "Chest" },
        "Abdomen":   { area: "abdo", label: "Abdomen" },
        "Right Arm": { area: "rarm", label: "R. Arm" },
        "Left Arm":  { area: "larm", label: "L. Arm" },
        "Right Leg": { area: "rleg", label: "R. Leg" },
        "Left Leg":  { area: "lleg", label: "L. Leg" }
    };

    // Helper: Build HTML for Warded Locations Tooltip (Paperdoll Layout)
    const buildWardTooltipHTML = (actor, blockedLocations) => {
        const allHitLocations = actor.items.filter(i => i.type === "hitLocation");
        const bodyPartMap = {};
        allHitLocations.forEach(loc => {
            const name = loc.name.toLowerCase().trim();
            if (name.includes("head")) bodyPartMap.head = true;
            else if (name.includes("chest")) bodyPartMap.chest = true;
            else if (name.includes("abdomen")) bodyPartMap.abdomen = true;
            else if (name.includes("right arm")) bodyPartMap.rightArm = true;
            else if (name.includes("left arm")) bodyPartMap.leftArm = true;
            else if (name.includes("right leg")) bodyPartMap.rightLeg = true;
            else if (name.includes("left leg")) bodyPartMap.leftLeg = true;
        });

        const isHumanoid = Boolean(
            bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
            bodyPartMap.rightArm && bodyPartMap.leftArm && 
            bodyPartMap.rightLeg && bodyPartMap.leftLeg
        );

        const humanoidWards = new Map();
        const otherWards = [];

        blockedLocations.forEach(loc => {
            const weaponRef = loc.getFlag(MAGCM_MODULE_ID, "blockingWeapon");
            const weaponItem = actor.items.get(weaponRef);
            const data = { location: loc, weapon: weaponItem, weaponRef };

            if (isHumanoid && HUMANOID_SLOTS[loc.name] && !humanoidWards.has(loc.name)) {
                humanoidWards.set(loc.name, data);
            } else {
                otherWards.push(data);
            }
        });

        let bodyContent = "";

        if (isHumanoid) {
            const gridCells = Object.entries(HUMANOID_SLOTS).map(([locName, slot]) => {
                const wardData = humanoidWards.get(locName);
                if (wardData) {
                    const weaponImg = wardData.weapon?.img || "icons/svg/shield.svg";
                    const weaponName = wardData.weapon?.name || "Warded";

                    return `
                        <div style="grid-area: ${slot.area}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(75, 140, 255, 0.12); border: 1px solid #4a90e2; border-radius: 4px; padding: 3px 2px; text-align: center;">
                            <img src="${weaponImg}" style="width: 20px; height: 20px; border: none; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));" />
                            <span style="font-size: 8px; line-height: 1.1; margin-top: 2px; font-weight: bold; color: #e0f0ff;">${weaponName}</span>
                        </div>`;
                } else {
                    return `
                        <div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; padding: 2px; opacity: 0.35;">
                            <span style="font-size: 8px; color: #aaa;">${slot.label}</span>
                        </div>`;
                }
            }).join("");

            bodyContent += `
                <div style="display: grid; grid-template-columns: repeat(3, minmax(65px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px; margin-top: 4px;">
                    ${gridCells}
                </div>`;
        }

        if (otherWards.length > 0 || !isHumanoid) {
            const listItems = (isHumanoid ? otherWards : blockedLocations.map(loc => ({
                location: loc,
                weapon: actor.items.get(loc.getFlag(MAGCM_MODULE_ID, "blockingWeapon"))
            }))).map(w => `
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 3px; border: 1px solid #444;">
                    <img src="${w.weapon?.img || 'icons/svg/shield.svg'}" style="width: 18px; height: 18px; border: none; object-fit: contain;" />
                    <span style="font-size: 10px; font-weight: 500;">${w.weapon?.name || 'Warded'}</span>
                    <span style="font-size: 9px; color: #aaa; margin-left: auto;">(${w.location.name})</span>
                </div>
            `).join("");

            bodyContent += `
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: ${isHumanoid ? "6px" : "4px"};">
                    ${isHumanoid ? `<div style="font-size: 9px; color: #888; text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 1px;">Other Warded Locations</div>` : ""}
                    ${listItems}
                </div>`;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 210px; max-width: 260px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #ffdd80;">
                    Warded Locations
                </div>
                ${bodyContent}
            </div>`;
    };

    // Helper to bind standard Foundry tooltips with pre-rendered HTML support
    const attachTooltip = (sprite, htmlContent) => {
        sprite.eventMode = "static";
        sprite.interactive = true;
        sprite.cursor = "pointer";

        const showTooltip = (event) => {
            const nativeEvent = event.nativeEvent || event.data?.originalEvent;
            const clientX = nativeEvent?.clientX ?? event.global?.x;
            const clientY = nativeEvent?.clientY ?? event.global?.y;

            if (clientX !== undefined && clientY !== undefined) {
                const topEl = document.elementFromPoint(clientX, clientY);
                const isCanvas = topEl && (topEl.tagName === "CANVAS" || Boolean(topEl.closest("#board")));

                if (!isCanvas) {
                    game.tooltip.deactivate();
                    return;
                }
            }

            game.tooltip.activate(canvas.app.canvas || canvas.app.view, {
                text: " ",
                direction: "UP"
            });

            const tooltipEl = document.getElementById("tooltip");
            if (tooltipEl && htmlContent) {
                tooltipEl.innerHTML = htmlContent;

                if (clientX !== undefined && clientY !== undefined) {
                    tooltipEl.style.left = `${clientX}px`;
                    tooltipEl.style.top = `${clientY - 12}px`;
                }
            }
        };

        sprite.on("pointerover", showTooltip);
        sprite.on("pointermove", showTooltip);
        sprite.on("pointerout", () => {
            game.tooltip.deactivate();
        });
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const blockedLocations = actor.items.filter(i => {
            if (i.type !== "hitLocation") return false;
            const blockingWeapon = i.getFlag(MAGCM_MODULE_ID, "blockingWeapon");
            return Boolean(blockingWeapon);
        });

        const blockedKey = blockedLocations.map(l => {
            return `${l.id}:${l.getFlag(MAGCM_MODULE_ID, "blockingWeapon")}`;
        }).join("|");

        if (blockedLocations.length === 0) {
            if (token.wardOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.wardOverlayContainer);
                token.wardOverlayContainer.destroy({ children: true });
                token.wardOverlayContainer = null;
                token._blockedLocationsKey = null;
            }
            return;
        }

        if (token.wardOverlayContainer && token._blockedLocationsKey === blockedKey) {
            return;
        }

        if (token.wardOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.wardOverlayContainer);
            token.wardOverlayContainer.destroy({ children: true });
            token.wardOverlayContainer = null;
        }

        token._blockedLocationsKey = blockedKey;

        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.wardOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const iconSize = 16;
        const shieldImg = "icons/svg/shield.svg";
        const wardTooltipHTML = buildWardTooltipHTML(actor, blockedLocations);

        loadTexture(shieldImg).then(texture => {
            if (!overlayContainer.destroyed) {
                const shieldSprite = new PIXI.Sprite(texture);
                shieldSprite.width = iconSize;
                shieldSprite.height = iconSize;
                shieldSprite.alpha = 0.3;

                shieldSprite.x = 0;
                shieldSprite.y = token.h - iconSize;

                attachTooltip(shieldSprite, wardTooltipHTML);

                overlayContainer.addChild(shieldSprite);
            }
        });
    });
});

// --- Disable Attack Icons (Press Advantage / Pin Down / Overextend Opponent) ---
Hooks.once("ready", () => {
    const CANNOT_ATTACK_LABELS = {
        "Press Advantage": "Pressed - cannot attack",
        "Pin Down": "Pinned Down - cannot attack",
        "Overextend Opponent": "Overextended - cannot attack"
    };

    const buildCannotAttackTooltipHTML = (data) => {
        const turnsLabel = Number(data.turnsRemaining) === 1 ? "1 turn" : `${data.turnsRemaining} turns`;
        const statusLabel = CANNOT_ATTACK_LABELS[data.effectType] || "Cannot Attack";
        return `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 180px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #ff9d9d;">
                    Cannot Attack
                </div>
                <div style="text-align: center; margin-top: 4px;">
                    <span style="font-size: 10px; font-weight: bold; color: #ffdddd;">${statusLabel}</span><br/>
                    <span style="font-size: 9px; color: #aaa;">${turnsLabel} remaining</span><br/>
                    <span style="font-size: 9px; color: #aaa;">By ${data.attackerName || "Unknown"}</span>
                </div>
            </div>`;
    };

    const attachTooltip = (sprite, htmlContent) => {
        sprite.eventMode = "static";
        sprite.interactive = true;
        sprite.cursor = "pointer";

        const showTooltip = (event) => {
            const nativeEvent = event.nativeEvent || event.data?.originalEvent;
            const clientX = nativeEvent?.clientX ?? event.global?.x;
            const clientY = nativeEvent?.clientY ?? event.global?.y;

            if (clientX !== undefined && clientY !== undefined) {
                const topEl = document.elementFromPoint(clientX, clientY);
                const isCanvas = topEl && (topEl.tagName === "CANVAS" || Boolean(topEl.closest("#board")));
                if (!isCanvas) {
                    game.tooltip.deactivate();
                    return;
                }
            }

            game.tooltip.activate(canvas.app.canvas || canvas.app.view, { text: " ", direction: "UP" });
            const tooltipEl = document.getElementById("tooltip");
            if (tooltipEl && htmlContent) {
                tooltipEl.innerHTML = htmlContent;
                if (clientX !== undefined && clientY !== undefined) {
                    tooltipEl.style.left = `${clientX}px`;
                    tooltipEl.style.top = `${clientY - 12}px`;
                }
            }
        };

        sprite.on("pointerover", showTooltip);
        sprite.on("pointermove", showTooltip);
        sprite.on("pointerout", () => game.tooltip.deactivate());
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const data = actor.getFlag(MAGCM_MODULE_ID, "attackDisabledBy");
        const currentKey = data ? `${data.attackerActorId}:${data.effectType}:${data.turnsRemaining}` : null;

        if (!data) {
            if (token.cannotAttackOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.cannotAttackOverlayContainer);
                token.cannotAttackOverlayContainer.destroy({ children: true });
                token.cannotAttackOverlayContainer = null;
                token._cannotAttackKey = null;
            }
            return;
        }

        if (token.cannotAttackOverlayContainer && token._cannotAttackKey === currentKey) return;
        if (token.cannotAttackOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.cannotAttackOverlayContainer);
            token.cannotAttackOverlayContainer.destroy({ children: true });
        }

        token._cannotAttackKey = currentKey;
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.cannotAttackOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const tooltipHtml = buildCannotAttackTooltipHTML(data);

        loadTexture(`${MAGCM_ICONS_PATH}conditions/cannot-attack.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = 16;
            sprite.height = 16;
            sprite.alpha = 0.3;
            sprite.x = 0;
            sprite.y = 0;
            attachTooltip(sprite, tooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });
});

Hooks.once("ready", () => {
    if (!game.settings.get(MAGCM_MODULE_ID, "enableArmourOverlayIcons")) return;

    // Standard humanoid locations and their spatial grid areas
    const HUMANOID_SLOTS = {
        "Head":      { area: "head", label: "Head" },
        "Chest":     { area: "chest", label: "Chest" },
        "Abdomen":   { area: "abdo", label: "Abdomen" },
        "Right Arm": { area: "rarm", label: "R. Arm" },
        "Left Arm":  { area: "larm", label: "L. Arm" },
        "Right Leg": { area: "rleg", label: "R. Leg" },
        "Left Leg":  { area: "lleg", label: "L. Leg" }
    };

    // Helper to generate pre-cached HTML for the paperdoll / rich tooltip
    const buildArmourTooltipHTML = (equippedArmour, actor) => {
        const allHitLocations = actor.items.filter(i => i.type === "hitLocation");
        const bodyPartMap = {};
        allHitLocations.forEach(loc => {
            const name = loc.name.toLowerCase().trim();
            if (name.includes("head")) bodyPartMap.head = true;
            else if (name.includes("chest")) bodyPartMap.chest = true;
            else if (name.includes("abdomen")) bodyPartMap.abdomen = true;
            else if (name.includes("right arm")) bodyPartMap.rightArm = true;
            else if (name.includes("left arm")) bodyPartMap.leftArm = true;
            else if (name.includes("right leg")) bodyPartMap.rightLeg = true;
            else if (name.includes("left leg")) bodyPartMap.leftLeg = true;
        });

        const isHumanoid = Boolean(
            bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
            bodyPartMap.rightArm && bodyPartMap.leftArm && 
            bodyPartMap.rightLeg && bodyPartMap.leftLeg
        );

        const humanoidMap = new Map();
        const otherArmour = [];

        equippedArmour.forEach(a => {
            if (isHumanoid && HUMANOID_SLOTS[a.locationName] && !humanoidMap.has(a.locationName)) {
                humanoidMap.set(a.locationName, a);
            } else {
                otherArmour.push(a);
            }
        });

        let bodyContent = "";

        if (isHumanoid) {
            // Render 3x4 paperdoll CSS grid
            const gridCells = Object.entries(HUMANOID_SLOTS).map(([locName, slot]) => {
                const armourData = humanoidMap.get(locName);
                if (armourData) {
                    const badge = getMAGCMConditionBadge(armourData.item, armourData.item.system?.ap, "originalAp", "AP");
                    return `
                        <div style="grid-area: ${slot.area}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: rgba(255,255,255,0.08); border: 1px solid #666; border-radius: 4px; padding: 3px 2px; text-align: center;">
                            <img src="${armourData.item.img}" style="width: 20px; height: 20px; border: none; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));" />
                            <span style="font-size: 9px; line-height: 1.1; margin-top: 2px; font-weight: bold; color: #f0f0f0;">${armourData.item.name}${badge ? ` <i class="fas ${badge.icon}" style="color: ${badge.color};" title="${badge.text}"></i>` : ""}</span>
                        </div>`;
                } else {
                    // Empty placeholder to maintain the silhouette shape
                    return `
                        <div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; padding: 2px; opacity: 0.35;">
                            <span style="font-size: 8px; color: #aaa;">${slot.label}</span>
                        </div>`;
                }
            }).join("");

            bodyContent += `
                <div style="display: grid; grid-template-columns: repeat(3, minmax(65px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px; margin-top: 4px;">
                    ${gridCells}
                </div>`;
        }

        // Render additional or non-humanoid items below grid (or as primary list)
        if (otherArmour.length > 0 || !isHumanoid) {
            const listItems = (isHumanoid ? otherArmour : equippedArmour).map(a => {
                const badge = getMAGCMConditionBadge(a.item, a.item.system?.ap, "originalAp", "AP");
                return `
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 3px; border: 1px solid #444;">
                    <img src="${a.item.img}" style="width: 18px; height: 18px; border: none; object-fit: contain;" />
                    <span style="font-size: 10px; font-weight: 500;">${a.item.name}${badge ? ` <i class="fas ${badge.icon}" style="color: ${badge.color};" title="${badge.text}"></i>` : ""}</span>
                    <span style="font-size: 9px; color: #aaa; margin-left: auto;">(${a.locationName})</span>
                </div>
            `;
            }).join("");

            bodyContent += `
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: ${isHumanoid ? "6px" : "4px"};">
                    ${isHumanoid ? `<div style="font-size: 9px; color: #888; text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 1px;">Other Equipment</div>` : ""}
                    ${listItems}
                </div>`;
        }

        return `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 210px; max-width: 260px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #ffdd80;">
                    Equipped Armour
                </div>
                ${bodyContent}
            </div>`;
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const locationOrder = ["Head", "Chest", "Abdomen", "Right Arm", "Left Arm", "Right Leg", "Left Leg"];

        // 1. Gather equipped armour and map location names
        const equippedArmour = actor.items
            .filter(i => i.type === "armor" && i.system?.equipped)
            .map(item => {
                const locationId = item.system.location?.[0];
                const locationItem = locationId ? actor.items.get(locationId) : null;
                const locationName = locationItem ? locationItem.name : "Unspecified Location";
                return { item, locationId, locationName };
            });

        // 2. Sort armour according to hit location hierarchy
        equippedArmour.sort((a, b) => {
            const indexA = locationOrder.indexOf(a.locationName);
            const indexB = locationOrder.indexOf(b.locationName);

            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
            if (indexA !== -1) return -1;
            if (indexB !== -1) return 1;
            return a.locationName.localeCompare(b.locationName);
        });

        // 3. Generate fingerprint key for equipped armour state
        const currentKey = equippedArmour.map(a => `${a.item.id}:${a.locationId}:${a.item.system?.ap ?? ""}`).join("|");

        // 4. Handle case where no armour is equipped
        if (equippedArmour.length === 0) {
            if (token.armourOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.armourOverlayContainer);
                token.armourOverlayContainer.destroy({ children: true });
                token.armourOverlayContainer = null;
                token._equippedArmourKey = null;
                token._armourTooltipHTML = null;
            }
            return;
        }

        // 5. Prevent rebuild if state hasn't changed
        if (token.armourOverlayContainer && token._equippedArmourKey === currentKey) {
            return;
        }

        // 6. Clean up old container when state changes
        if (token.armourOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.armourOverlayContainer);
            token.armourOverlayContainer.destroy({ children: true });
            token.armourOverlayContainer = null;
        }

        // Cache state key and pre-build the HTML string
        token._equippedArmourKey = currentKey;
        token._armourTooltipHTML = buildArmourTooltipHTML(equippedArmour, actor);

        // 7. Build PIXI overlay container
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.armourOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const iconSize = 16;

        // Helper to bind standard Foundry tooltips with HTML support & canvas checking
        const attachTooltip = (sprite) => {
            sprite.eventMode = "static";
            sprite.interactive = true;
            sprite.cursor = "pointer";

            const showTooltip = (event) => {
                const nativeEvent = event.nativeEvent || event.data?.originalEvent;
                const clientX = nativeEvent?.clientX ?? event.global?.x;
                const clientY = nativeEvent?.clientY ?? event.global?.y;

                // Check if cursor is over canvas or blocked by a sheet/UI element
                if (clientX !== undefined && clientY !== undefined) {
                    const topEl = document.elementFromPoint(clientX, clientY);
                    const isCanvas = topEl && (topEl.tagName === "CANVAS" || Boolean(topEl.closest("#board")));

                    if (!isCanvas) {
                        game.tooltip.deactivate();
                        return;
                    }
                }

                game.tooltip.activate(canvas.app.canvas || canvas.app.view, {
                    text: " ",
                    direction: "UP"
                });

                const tooltipEl = document.getElementById("tooltip");
                if (tooltipEl && token._armourTooltipHTML) {
                    tooltipEl.innerHTML = token._armourTooltipHTML;

                    if (clientX !== undefined && clientY !== undefined) {
                        tooltipEl.style.left = `${clientX}px`;
                        tooltipEl.style.top = `${clientY - 12}px`;
                    }
                }
            };

            sprite.on("pointerover", showTooltip);
            sprite.on("pointermove", showTooltip);
            sprite.on("pointerout", () => {
                game.tooltip.deactivate();
            });
        };

        // 8. Render Armour Icon (Top-Right Corner)
        const armourImg = `${MAGCM_ICONS_PATH}overlays/armour.png`;

        loadTexture(armourImg).then(texture => {
            if (!overlayContainer.destroyed) {
                const sprite = new PIXI.Sprite(texture);
                sprite.width = iconSize;
                sprite.height = iconSize;
                sprite.alpha = 0.3;

                // Position at top-right corner of the token
                sprite.x = token.w - iconSize;
                sprite.y = 0;

                attachTooltip(sprite);

                overlayContainer.addChild(sprite);
            }
        });
    });
});

Hooks.on("deleteCombat", async (combat) => {
    if (!game.settings.get(MAGCM_MODULE_ID, "enableReachMechanics")) return;
    for (let combatant of combat.combatants) {
        if (combatant.actor) {
            await combatant.actor.unsetFlag(MAGCM_MODULE_ID, "engagements");
        }
    }
});

Hooks.on("refreshToken", (token) => {
    const actor = token.actor;
    if (!actor) return;

    if (!game.settings.get(MAGCM_MODULE_ID, "enableReachMechanics")) return;

    const engagements = actor.getFlag(MAGCM_MODULE_ID, "engagements") || {};
    const engagementEntries = Object.entries(engagements);

    // Generate fingerprint key for engagement state
    const currentKey = engagementEntries
        .map(([id, data]) => `${id}:${data.range}`)
        .sort()
        .join("|");

    // Clean up overlay if no engagements exist
    if (engagementEntries.length === 0) {
        if (token.meleeOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.meleeOverlayContainer);
            token.meleeOverlayContainer.destroy({ children: true });
            token.meleeOverlayContainer = null;
            token._meleeEngagementKey = null;
            token._meleeTooltipHTML = null;
        }
        return;
    }

    // Skip rebuild if state is unchanged
    if (token.meleeOverlayContainer && token._meleeEngagementKey === currentKey) {
        return;
    }

    // Clean up old container state
    if (token.meleeOverlayContainer) {
        game.tooltip.deactivate();
        token.removeChild(token.meleeOverlayContainer);
        token.meleeOverlayContainer.destroy({ children: true });
        token.meleeOverlayContainer = null;
    }

    // Helper to generate tooltip HTML for melee opponents
    const buildMeleeTooltipHTML = (entries) => {
        const listItems = entries.map(([id, data]) => `
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 4px 6px; border-radius: 4px; border: 1px solid #444;">
                <img src="${data.img || "icons/svg/mystery-man.svg"}" style="width: 20px; height: 20px; border: none; object-fit: cover; border-radius: 2px;" />
                <span style="font-size: 11px; font-weight: 600; color: #f0f0f0; flex-grow: 1;">${data.name}</span>
                <span style="font-size: 10px; font-weight: bold; background: #7a1c1c; color: #ffdddd; padding: 1px 6px; border-radius: 3px; border: 1px solid #993333;">${data.range}</span>
            </div>
        `).join("");

        return `
            <div style="display: flex; flex-direction: column; gap: 4px; min-width: 210px; max-width: 260px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #ff8888;">
                    Melee Engagements
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 2px;">
                    ${listItems}
                </div>
            </div>`;
    };

    // Cache state key and generated HTML
    token._meleeEngagementKey = currentKey;
    token._meleeTooltipHTML = buildMeleeTooltipHTML(engagementEntries);

    // Build PIXI container
    const overlayContainer = new PIXI.Container();
    overlayContainer.eventMode = "passive";
    token.meleeOverlayContainer = overlayContainer;
    token.addChild(overlayContainer);

    const iconSize = 16;

    const attachTooltip = (sprite) => {
        sprite.eventMode = "static";
        sprite.interactive = true;
        sprite.cursor = "pointer";

        const showTooltip = (event) => {
            const nativeEvent = event.nativeEvent || event.data?.originalEvent;
            const clientX = nativeEvent?.clientX ?? event.global?.x;
            const clientY = nativeEvent?.clientY ?? event.global?.y;

            if (clientX !== undefined && clientY !== undefined) {
                const topEl = document.elementFromPoint(clientX, clientY);
                const isCanvas = topEl && (topEl.tagName === "CANVAS" || Boolean(topEl.closest("#board")));

                if (!isCanvas) {
                    game.tooltip.deactivate();
                    return;
                }
            }

            game.tooltip.activate(canvas.app.canvas || canvas.app.view, {
                text: " ",
                direction: "UP"
            });

            const tooltipEl = document.getElementById("tooltip");
            if (tooltipEl && token._meleeTooltipHTML) {
                tooltipEl.innerHTML = token._meleeTooltipHTML;

                if (clientX !== undefined && clientY !== undefined) {
                    tooltipEl.style.left = `${clientX}px`;
                    tooltipEl.style.top = `${clientY - 12}px`;
                }
            }
        };

        sprite.on("pointerover", showTooltip);
        sprite.on("pointermove", showTooltip);
        sprite.on("pointerout", () => {
            game.tooltip.deactivate();
        });
    };

    const meleeImg = typeof MAGCM_ICONS_PATH !== "undefined" ? `${MAGCM_ICONS_PATH}overlays/melee.svg` : "icons/svg/sword.svg";

    loadTexture(meleeImg).then(texture => {
        if (!overlayContainer.destroyed) {
            const sprite = new PIXI.Sprite(texture);
            sprite.width = iconSize;
            sprite.height = iconSize;
            sprite.alpha = 0.3;

            // Position at top-middle edge of the token
            sprite.x = (token.w - iconSize) / 2;
            sprite.y = 0;

            attachTooltip(sprite);
            overlayContainer.addChild(sprite);
        }
    });
});

Hooks.once("ready", () => {
    game.socket.on(`module.${MAGCM_MODULE_ID}`, async (data) => {
        if (!game.user.isGM) return;

        if (data.action === "updateHitLocationHp") {
            const targetToken = canvas.tokens.get(data.targetTokenId)
                || game.scenes.current?.tokens.get(data.targetTokenId);
            const targetActor = targetToken?.actor;
            if (!targetActor || !data.hitLocationId) return;

            await targetActor.updateEmbeddedDocuments("Item", [{
                _id: data.hitLocationId,
                "system.currentHp": data.updatedHp,
                [`flags.${MAGCM_MODULE_ID}.lastDamageOrigin`]: data.sourceUuid ?? null
            }]);
            return;
        }

        if (data.action === "updateImpaleState") {
            const targetToken = canvas.tokens.get(data.targetTokenId)
                || game.scenes.current?.tokens.get(data.targetTokenId);
            const targetActor = targetToken?.actor;
            const attackerActor = game.actors.get(data.attackerActorId)
                || canvas.tokens.placeables.find(token => token.actor?.id === data.attackerActorId)?.actor;
            const hitLocation = targetActor?.items.get(data.targetLocationId);
            const weapon = attackerActor?.items.get(data.weaponId);
            if (!hitLocation || !weapon) return;

            const isProjectile = data.impaledData?.isProjectile || weapon.type === "ranged-weapon";
            if (isProjectile) {
                const stored = hitLocation.getFlag(MAGCM_MODULE_ID, "impaledBy");
                const records = Array.isArray(stored) ? stored : (stored ? [stored] : []);
                const remaining = data.impaledData
                    ? [...records, data.impaledData]
                    : records.filter(record => record.impaleId !== data.impaleId);
                if (remaining.length) await hitLocation.setFlag(MAGCM_MODULE_ID, "impaledBy", remaining);
                else await hitLocation.unsetFlag(MAGCM_MODULE_ID, "impaledBy");
            } else if (data.impaledData) {
                await hitLocation.setFlag(MAGCM_MODULE_ID, "impaledBy", data.impaledData);
                await weapon.setFlag(MAGCM_MODULE_ID, "impaled", data.impaledData);
            } else {
                await hitLocation.unsetFlag(MAGCM_MODULE_ID, "impaledBy");
                await weapon.unsetFlag(MAGCM_MODULE_ID, "impaled");
            }
            canvas.tokens.placeables.forEach(token => token.refresh());
            return;
        }

        if (data.action === "updateWeaponFlag") {
            const actor = game.actors.get(data.actorId);
            const weapon = actor?.items.get(data.weaponId);
            if (!weapon) return;
            if (data.value === null) await weapon.unsetFlag(MAGCM_MODULE_ID, data.flag);
            else await weapon.setFlag(MAGCM_MODULE_ID, data.flag, data.value);
            canvas.tokens.placeables.filter(token => token.actor?.id === actor.id).forEach(token => token.refresh());
            return;
        }

        if (data.action === "updateActorFlag") {
            const actor = game.actors.get(data.actorId);
            if (!actor) return;
            if (data.value === null) await actor.unsetFlag(MAGCM_MODULE_ID, data.flag);
            else await actor.setFlag(MAGCM_MODULE_ID, data.flag, data.value);
            canvas.tokens.placeables.filter(token => token.actor?.id === actor.id).forEach(token => token.refresh());
            return;
        }

        if (data.action === "updateItemFields") {
            const targetToken = canvas.tokens.get(data.targetTokenId)
                || game.scenes.current?.tokens.get(data.targetTokenId);
            const targetActor = targetToken?.actor;
            if (!targetActor || !data.itemId || !data.fields) return;
            await targetActor.updateEmbeddedDocuments("Item", [{ _id: data.itemId, ...data.fields }]);
            canvas.tokens.placeables.forEach(t => t.refresh());
            return;
        }

        if (data.action !== "updateEngagement") return;
        if (!game.settings.get(MAGCM_MODULE_ID, "enableReachMechanics")) return;
        
        const actor = game.actors.get(data.actorId);
        if (!actor) return;

        if (data.flagData === null) {
            await actor.unsetFlag(MAGCM_MODULE_ID, `engagements.${data.targetId}`);
            const remaining = actor.getFlag(MAGCM_MODULE_ID, "engagements") || {};
            if (Object.keys(remaining).length === 0) {
                await actor.unsetFlag(MAGCM_MODULE_ID, "engagements");
            }
        } else {
            let engagements = duplicate(actor.getFlag(MAGCM_MODULE_ID, "engagements") || {});
            engagements[data.targetId] = data.flagData;
            await actor.setFlag(MAGCM_MODULE_ID, "engagements", engagements);
        }
    });
});

Hooks.on("renderItemSheet", (app, html, data) => {
    if (!game.settings.get(MAGCM_MODULE_ID, "enableHomebrewRulesAndContent")) return;

    const item = app.item;
    if (!item) return;

    const type = item.type;
    const equipmentType = item.system?.equipmentType;

    const isArmor = type === "armor";
    const isClothingOrTrinket = type === "equipment" && (equipmentType === "MYTHRAS.Clothing" || equipmentType === "MYTHRAS.Trinkets");
    const isWearable = isArmor || isClothingOrTrinket;
    
    const hasValuesAndQualities = ["armor", "equipment", "melee-weapon", "ranged-weapon"].includes(type);
    const hasOriginalAp = isArmor || type === "melee-weapon" || type === "ranged-weapon";
    const hasOriginalHp = type === "melee-weapon" || type === "ranged-weapon";

    if (!isWearable && !hasValuesAndQualities) return;

    // Retrieve stored flag data or defaults
    const customData = item.getFlag(MAGCM_MODULE_ID, "customData") || {};
    const fittingSiz = customData.fittingSiz ?? "N/A";
    const fittingFrame = customData.fittingFrame ?? "N/A";
    const fittingBodyPart = customData.fittingBodyPart ?? "";
    const originalValue = customData.originalValue ?? "";
    const originalQuality = customData.originalQuality ?? "Reasonable";
    const currentQuality = customData.currentQuality ?? "Reasonable";
    const originalAp = customData.originalAp ?? "";
    const originalHp = customData.originalHp ?? "";

    const qualities = ["Awful", "Cheap", "Reasonable", "Superior", "Exemplary"];
    const frames = ["N/A", "Lithe", "Medium", "Heavy"];

    const el = html instanceof jQuery ? html : $(html);

    // 1. Inject Quality directly into the native equipment-core next to system.value
    if (hasValuesAndQualities) {
        const valueInput = el.find('input[name="system.value"]');
        if (valueInput.length) {
            const valueSection = valueInput.closest('.equip-core-section');
            if (valueSection.length && !valueSection.parent().find('select[name$="customData.currentQuality"]').length) {
                const qualityHtml = `
                    <div class="equip-core-section">
                        <div>
                            <h3 class="core-info">Quality</h3>
                            <select name="flags.${MAGCM_MODULE_ID}.customData.currentQuality">
                                ${qualities.map(q => `<option value="${q}" ${currentQuality === q ? "selected" : ""}>${q}</option>`).join("")}
                            </select>
                        </div>
                    </div>
                `;
                valueSection.after(qualityHtml);
            }
        }
    }

    // 2. Build the lower custom section for Fitting, Body Part, and Original stats
    let htmlContent = `
    <div class="equip-section custom-module-section">
        <div class="weapon-core">
            <h3 class="core-info" style="margin-bottom: 6px; border-bottom: 1px solid var(--color-border-light-2, #ccc); padding-bottom: 4px;">Homebrew Statistics</h3>
    `;

        const hasOriginalSection = hasValuesAndQualities || hasOriginalAp || hasOriginalHp;
    if (hasOriginalSection) {
        htmlContent += `
            <fieldset style="border: 1px solid var(--color-border-light-2, #ccc); padding: 8px; margin-top: 6px;">
                <legend style="font-weight: bold; padding: 0 4px;">Original Condition</legend>
                <div class="weapon-core-section" style="display: flex; flex-wrap: wrap; gap: 8px;">
        `;

        if (hasValuesAndQualities) {
            htmlContent += `
                    <div class="weapon-piece">
                        <h3 class="core-info">Value</h3>
                        <input type="number" name="flags.${MAGCM_MODULE_ID}.customData.originalValue" value="${originalValue}" />
                    </div>
                    <div class="weapon-piece">
                        <h3 class="core-info">Quality</h3>
                        <select name="flags.${MAGCM_MODULE_ID}.customData.originalQuality">
                            ${qualities.map(q => `<option value="${q}" ${originalQuality === q ? "selected" : ""}>${q}</option>`).join("")}
                        </select>
                    </div>
            `;
        }

        if (hasOriginalAp) {
            htmlContent += `
                    <div class="weapon-piece">
                        <h3 class="core-info">AP</h3>
                        <input type="number" name="flags.${MAGCM_MODULE_ID}.customData.originalAp" value="${originalAp}" />
                    </div>
            `;
        }

        if (hasOriginalHp) {
            htmlContent += `
                    <div class="weapon-piece">
                        <h3 class="core-info">HP</h3>
                        <input type="number" name="flags.${MAGCM_MODULE_ID}.customData.originalHp" value="${originalHp}" />
                    </div>
            `;
        }

        htmlContent += `
                </div>
            </fieldset>
        `;
    }

    if (isWearable || isArmor) {
        htmlContent += `
            <fieldset style="border: 1px solid var(--color-border-light-2, #ccc); padding: 8px; margin-top: 6px;">
                <legend style="font-weight: bold; padding: 0 4px;">Fitting</legend>
                <div class="weapon-core-section" style="display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px;">
        `;

        if (isWearable) {
            htmlContent += `
                <div class="weapon-piece" style="flex: 1; min-width: 110px;">
                    <h3 class="core-info">SIZ</h3>
                    <input type="text" name="flags.${MAGCM_MODULE_ID}.customData.fittingSiz" value="${fittingSiz}" placeholder="N/A or Number" />
                </div>
                <div class="weapon-piece" style="flex: 1; min-width: 110px;">
                    <h3 class="core-info">Frame</h3>
                    <select name="flags.${MAGCM_MODULE_ID}.customData.fittingFrame">
                        ${frames.map(f => `<option value="${f}" ${fittingFrame === f ? "selected" : ""}>${f}</option>`).join("")}
                    </select>
                </div>
            `;
        }

        if (isArmor) {
            htmlContent += `
                <div class="weapon-piece" style="flex: 1; min-width: 110px;">
                    <h3 class="core-info">Body Part</h3>
                    <input type="text" name="flags.${MAGCM_MODULE_ID}.customData.fittingBodyPart" value="${fittingBodyPart}" placeholder="e.g. Chest" />
                </div>
            `;
        }

        htmlContent += `
            </div>
         </fieldset>
        `;
    }

    htmlContent += `
        </div>
    </div>
    `;

    const sheetBody = el.find('.sheet-body');
    if (sheetBody.length) {
        const descHeading = sheetBody.find('h2');
        if (descHeading.length) {
            descHeading.before(htmlContent);
        } else {
            sheetBody.append(htmlContent);
        }
    } else {
        el.find('form').append(htmlContent);
    }
});

// =====================================================================================
// MACRO ENTRY POINTS
// =====================================================================================
// Every macro shipped in this module's compendium is a thin trigger file living under src/
// (copy-pasted by the end user into their world's Macro compendium). All of the *actual*
// logic for each macro lives here instead, one function per macro, exposed on `globalThis`
// so the compendium macro files never need to be re-pasted when this module updates -
// only this file needs to change. Each function keeps the same parameters the original
// macro received from Foundry's macro execution scope (typically `token`), and each is
// self-contained (its own local consts/lets), so they can be read/edited independently
// without worrying about clashing with other code in this file.
// =====================================================================================

/**
 * Set Movement State macro: resolves the selected token or assigned character and opens the
 * movement-state dialog when the corresponding world setting is enabled.
 */
function magcmOpenSetMovementStateDialog() {
    if (!game.settings.get(MAGCM_MODULE_ID, "enableMovementStateControlInCombat")) {
        return ui.notifications.warn("Movement State Control in Combat is disabled in the module settings.");
    }

    const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
    if (!actor) {
        return ui.notifications.warn("Please select a token or assign a character first.");
    }
    if (typeof globalThis.openMovementDialog !== "function") {
        return ui.notifications.error("Movement state controls are not loaded in main.js.");
    }

    globalThis.openMovementDialog(actor);
}
globalThis.magcmOpenSetMovementStateDialog = magcmOpenSetMovementStateDialog;

/**
 * Restore AP macro: resets the Action Points of every currently-selected token to its maximum.
 */
async function magcmRestoreActionPoints() {
    for (const token of canvas.tokens.controlled) {
        const maxAP = token.actor?.maxActionPoints;
        if (!maxAP) continue;
        await token.actor.update({ "system.trackedStats.actionPoints.value": maxAP });
        ui.notifications.info(`${token.actor.name} AP has been reset.`);
    }
}
globalThis.magcmRestoreActionPoints = magcmRestoreActionPoints;

/**
 * Restore Luck Points macro: restores every non-GM player's assigned character's Luck Points to its maximum.
 */
async function magcmRestoreLuckPoints() {
    for (const user of game.users) {
        if (user.isGM || user.name === "Gamemaster (Disabled)") continue;
        if (!user.character) {
            ui.notifications.info(`The user ${user.name} does not have a character assigned to them.`);
            continue;
        }
        const character = user.character;
        const maxLuckPoints = character.statTracker?.actor.maxLuckPoints;
        if (!maxLuckPoints) continue;
        await character.update({ "system.trackedStats.luckPoints.value": maxLuckPoints });
        ui.notifications.info(`${character.name} luck points have been restored.`);
    }
}
globalThis.magcmRestoreLuckPoints = magcmRestoreLuckPoints;

/**
 * Manage Currency macro: lets the acting token's owner pay out or receive any of their currency items.
 */
async function magcmManageCurrency(token) {
    const currencies = token.actor.items.filter(item => item.type === "currency");
    const characterName = token.actor.name;

    let currencyRows = ``;

    function convertTextToHtmlId(text) {
        return text.toLowerCase().replace(/\W+/g, "-");
    }

    for (const currency of currencies) {
        const currencyId = convertTextToHtmlId(currency.name);
        currencyRows += `<tr>
                            <th style="text-align:right; padding-right:5px">${currency.name}<img src="${currency.img}" height="16" width="16" style="vertical-align:middle;border:none;margin-left:2px"/></th>
                            <td><input type="number" id="${currencyId}" value="${currency.system.quantity}" disabled style="text-align: center; width: 100px;"/></td>
                            <td><input type="number" id="${currencyId}-changeby" value="0" min="0" style="text-align: center; width: 100px;"/></td>
                            <td><input type="checkbox" id="${currencyId}-pay" checked></td>
                          </tr>`;
    }

    const d = new Dialog({
        title: "Manage Currency",
        content: `
        <h2 style="float: top;">${characterName}</h2>
            <table>
                <tr>
                    <th style="text-align:right; padding-right:10px">Currency</th>
                    <th>Current</th>
                    <th>Change By</th>
                    <th>Pay?</th>
                </tr>
                ${currencyRows}
            </table>
            <div><label for="currencyChangeReason" style="font-weight:bold;">Reason:</label><textarea id="currencyChangeReason" style="margin-bottom:10px"></textarea></div>`,
        buttons: {
            one: {
                label: "Transact",
                callback: html => {
                    const reason = html.find(`[id="currencyChangeReason"]`).val();

                    let notEnoughCoin = false;
                    let message = ``;
                    let oldBalance = ``;
                    let received = ``;
                    let paid = ``;
                    let newBalance = ``;
                    for (const currency of currencies) {
                        const currencyId = convertTextToHtmlId(currency.name);
                        const currentAmount = parseInt(currency.system.quantity);
                        const changeBy = parseInt(html.find(`[id="${currencyId}-changeby"]`).val());
                        const pay = html.find(`[id="${currencyId}-pay"]`)[0].checked;
                        const currencyImg = `<img src="${currency.img}" height="16" width="16" style="vertical-align:middle;border:none;margin-left:2px"/>`;

                        if (!!pay && currentAmount < changeBy) {
                            message += `<p>Not enough ${currencyImg} to pay the required amount of ${changeBy}.</p>`;
                            notEnoughCoin = true;
                        }
                    }
                    if (!notEnoughCoin) {
                        for (const currency of currencies) {
                            const currencyId = convertTextToHtmlId(currency.name);
                            const currentAmount = parseInt(currency.system.quantity);
                            const changeBy = parseInt(html.find(`[id="${currencyId}-changeby"]`).val());
                            const pay = html.find(`[id="${currencyId}-pay"]`)[0].checked;
                            const currencyImg = `<img title="${currency.name}" src="${currency.img}" height="16" width="16" style="vertical-align:middle;border:none;margin-left:2px;display:inline"/>`;

                            const newAmount = (!!pay) ? currentAmount - changeBy : currentAmount + changeBy;

                            if (currentAmount > 0) {
                                oldBalance += `${currentAmount}${currencyImg}&nbsp;&nbsp;`;
                            }

                            if (currentAmount > 0 && !!pay && newAmount <= 0) {
                                newBalance += `<strong>${newAmount}</strong>${currencyImg}&nbsp;&nbsp;`;
                            }

                            if (newAmount > 0) {
                                newBalance += `<strong>${newAmount}</strong>${currencyImg}&nbsp;&nbsp;`;
                            }

                            if (changeBy > 0) {
                                if (!!pay) {
                                    paid += `<strong style="color:red">${changeBy}</strong>${currencyImg}&nbsp;&nbsp;`;
                                } else {
                                    received += `<strong style="color:green">${changeBy}</strong>${currencyImg}&nbsp;&nbsp;`;
                                }
                                currency.update({ 'system.quantity': newAmount });
                            }

                        }
                        message = `
                        <table class="low-padding-table">
                        <colgroup>
                            <col style="width:35%">
                            <col style="width:65%">
                        </colgroup>
                        <tr><th>Old Balance</th><td>${oldBalance}</td></tr>
                        ${received == `` ? `` : `<tr><th>Received</th><td>${received}</td></tr>`}
                        ${paid == `` ? `` : `<tr><th>Paid</th><td>${paid}</td></tr>`}
                        <tr><th>New Balance</th><td>${newBalance}</td></<tr>
                        </table>
                        `;

                    } else {
                        message += `<strong style="color:red">Transaction cancelled.</strong>`;
                    }


                    ChatMessage.create({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker(),
                        flavor: `Transacting currency for: ${reason}`,
                        content: `<h2 style='font-size: large'>${token.actor.name}</h2>
                                ${message}`
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
    });

    d.render(true);
}
globalThis.magcmManageCurrency = magcmManageCurrency;

/**
 * Upgrade Skill macro: for every selected token, spends an Experience Roll (or a custom value) to
 * attempt to upgrade the chosen skill.
 */
async function magcmUpgradeSkill(token) {
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
                callback: async (html) => {

                    canvas.tokens.controlled.forEach(rollToken);
                    async function rollToken(token) {

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

                            let skillUpgradeSuccessDiceRoll = new Roll(`1d100 + @INT`, { INT: intelligence });
                            await skillUpgradeSuccessDiceRoll.evaluate();
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

                            let contentString = `<table class="low-padding-table">
                                        <tr>
                                            <th>Roll (d100+INT)</th>
                                            <th>Upgrade Threshold</th>
                                            <th>Result</th> 
                                        </tr>
                                        ${resultRow}
                                    </table>`;

                            let skillUpgradeValueDiceRoll = new Roll(`1d4+1`);
                            await skillUpgradeValueDiceRoll.evaluate();
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
    });

    d.render(true);
}
globalThis.magcmUpgradeSkill = magcmUpgradeSkill;

/**
 * Pin/Unpin Weapon macro: run without a target on yourself to unpin one of your own pinned weapons,
 * or run with an enemy targeted to pin one of their equipped weapons (denying them its use).
 */
async function magcmPinWeapon() {
    const controlledToken = canvas.tokens.controlled[0];
    const targetToken = game.user.targets.first();

    if (!controlledToken?.actor) {
        return ui.notifications.warn("Please select a token first.");
    }
    if (!targetToken?.actor) {
        return ui.notifications.warn("Please target a token first.");
    }

    const targetActor = targetToken.actor;
    const equippedWeapons = targetActor.items.filter(item => {
        if (item.type !== "melee-weapon" && item.type !== "ranged-weapon") return false;
        const holdingLocations = item.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
        return holdingLocations.length > 0;
    });
    const pinnableWeapons = equippedWeapons.filter(w => !w.getFlag(MAGCM_MODULE_ID, "pinned"));
    const pinnedWeapons = equippedWeapons.filter(w => w.getFlag(MAGCM_MODULE_ID, "pinned"));

    if (equippedWeapons.length === 0) {
        return ui.notifications.info(`${targetActor.name} has no equipped weapons.`);
    }

    // Helper: apply/clear the "pinned" flag, relaying through a GM socket if the current user lacks permission
    async function setPinnedFlag(weapon, pinned) {
        if (targetActor.canUserModify(game.user, "update")) {
            if (pinned) await weapon.setFlag(MAGCM_MODULE_ID, "pinned", true);
            else await weapon.unsetFlag(MAGCM_MODULE_ID, "pinned");
        } else if (game.socket) {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateWeaponFlag",
                actorId: targetActor.id,
                weaponId: weapon.id,
                flag: "pinned",
                value: pinned ? true : null
            });
        } else {
            throw new Error("You do not have permission to change this weapon.");
        }
    }

    const describeLocations = (weapon) => (weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [])
        .map(id => targetActor.items.get(id)?.name)
        .filter(Boolean)
        .join(", ") || "Held";

    const pinOptionsHtml = pinnableWeapons
        .map(weapon => `<option value="${weapon.id}">${weapon.name} - ${describeLocations(weapon)}</option>`)
        .join("") || `<option value="">-- No eligible weapons --</option>`;

    // Unpin field mirrors the Impale macro's Unimpale checklist: pick one or more currently pinned weapons to free
    const unpinChecklistHtml = pinnedWeapons.length > 0
        ? pinnedWeapons.map(weapon => `
            <label style="display:flex; align-items:center; gap:6px; margin-bottom:4px;">
                <input type="checkbox" class="unpin-checkbox" value="${weapon.id}" checked>
                ${weapon.name} - ${describeLocations(weapon)}
            </label>`).join("")
        : `<p style="font-size:11px; color:#888;">No pinned weapons found on this target.</p>`;

    new Dialog({
        title: `Pin / Unpin Weapon - ${targetActor.name}`,
        content: `
            <form>
                <div style="margin-bottom:8px;">
                    <label>Action</label>
                    <select id="pinAction" style="width:100%;">
                        <option value="pin" ${pinnableWeapons.length ? "" : "disabled"}>Pin a Weapon</option>
                        <option value="unpin" ${pinnedWeapons.length ? "" : "disabled"}>Unpin Weapon(s)</option>
                    </select>
                </div>
                <div id="pinFields">
                    <p>Choose an equipped weapon on the targeted token to pin.</p>
                    <select id="pinWeaponId" style="width:100%;">${pinOptionsHtml}</select>
                </div>
                <div id="unpinFields" style="display:none;">
                    <p>Choose one or more pinned weapons on the targeted token to unpin.</p>
                    ${unpinChecklistHtml}
                </div>
            </form>`,
        buttons: {
            apply: {
                label: "Apply",
                callback: async html => {
                    const action = html.find("#pinAction").val();

                    if (action === "unpin") {
                        const selected = html.find(".unpin-checkbox:checked").toArray();
                        if (selected.length === 0) return ui.notifications.info("No pinned weapons were selected.");

                        const names = [];
                        for (const el of selected) {
                            const weapon = targetActor.items.get(el.value);
                            if (!weapon) continue;
                            await setPinnedFlag(weapon, false);
                            names.push(weapon.name);
                        }

                        canvas.tokens.placeables.filter(t => t.actor?.id === targetActor.id).forEach(t => t.refresh());
                        return ui.notifications.info(`${targetActor.name} - weapon is no longer pinned: ${names.join(", ") || "none"}.`);
                    }

                    const weapon = targetActor.items.get(html.find("#pinWeaponId").val());
                    if (!weapon) return ui.notifications.warn("Weapon not found.");

                    try {
                        await setPinnedFlag(weapon, true);
                    } catch (e) {
                        return ui.notifications.error(e.message);
                    }

                    canvas.tokens.placeables.filter(t => t.actor?.id === targetActor.id).forEach(t => t.refresh());
                    ui.notifications.info(`${weapon.name} is now pinned.`);
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "apply",
        render: html => {
            html.find("#pinAction").on("change", event => {
                const isUnpin = event.currentTarget.value === "unpin";
                html.find("#pinFields").toggle(!isUnpin);
                html.find("#unpinFields").toggle(isUnpin);
            });
        }
    }, { width: 420 }).render(true);
}
globalThis.magcmPinWeapon = magcmPinWeapon;

/**
 * Disable Attack macro: implements the Press Advantage, Pin Down, and Overextend Opponent special
 * effects, which all prevent the targeted character from attacking for a number of their own turns.
 */
async function magcmDisableAttack() {
    const controlledToken = canvas.tokens.controlled[0];
    const targetToken = game.user.targets.first();

    if (!controlledToken?.actor) {
        return ui.notifications.warn("Please select the token disabling the attack first.");
    }
    if (!targetToken?.actor) {
        return ui.notifications.warn("Please target the token whose attack you wish to disable.");
    }

    const sourceActor = controlledToken.actor;
    const targetActor = targetToken.actor;

    const effectPhrasing = {
        "Press Advantage": (attacker, target) => `${attacker} presses the advantage against ${target}, forcing them onto the defensive.`,
        "Pin Down": (attacker, target) => `${attacker} pins ${target} down, suppressing their next attack.`,
        "Overextend Opponent": (attacker, target) => `${attacker} causes ${target} to overextend, leaving them unable to attack.`
    };

    async function setDisabledFlag(disableData) {
        if (targetActor.canUserModify(game.user, "update")) {
            await targetActor.setFlag(MAGCM_MODULE_ID, "attackDisabledBy", disableData);
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateActorFlag",
                actorId: targetActor.id,
                flag: "attackDisabledBy",
                value: disableData
            });
        }
    }

    new Dialog({
        title: `Disable Attack - ${targetActor.name}`,
        content: `
            <form style="padding: 4px;">
                <div class="form-group" style="margin-bottom: 8px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 4px;">Special Effect</label>
                    <select id="disableEffectType" style="width: 100%;">
                        <option value="Press Advantage">Press Advantage</option>
                        <option value="Pin Down">Pin Down</option>
                        <option value="Overextend Opponent">Overextend Opponent</option>
                    </select>
                </div>
                <div class="form-group">
                    <label style="font-weight: bold; display: block; margin-bottom: 4px;">Duration (target's turns)</label>
                    <input type="number" id="disableTurns" value="1" min="1" style="width: 100%; text-align: center;" />
                </div>
            </form>
        `,
        buttons: {
            apply: {
                icon: '<i class="fas fa-hand-paper"></i>',
                label: "Apply",
                callback: async (html) => {
                    const effectType = html.find("#disableEffectType").val();
                    const turns = Math.max(1, Number(html.find("#disableTurns").val()) || 1);

                    const disableData = {
                        attackerActorId: sourceActor.id,
                        attackerName: sourceActor.name,
                        effectType,
                        turnsRemaining: turns
                    };

                    await setDisabledFlag(disableData);
                    canvas.tokens.placeables.filter(t => t.actor?.id === targetActor.id).forEach(t => t.refresh());

                    const turnsLabel = turns === 1 ? "1 turn" : `${turns} turns`;
                    const description = effectPhrasing[effectType]?.(sourceActor.name, targetActor.name)
                        || `${sourceActor.name} disables ${targetActor.name}'s attack.`;

                    await ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: controlledToken.document }),
                        content: `<h3 style="border-bottom: 2px solid var(--color-border-dark-tertiary); margin-bottom: 4px;">${effectType}</h3><p>${description}</p><p><strong>${targetActor.name}</strong> cannot attack for their next ${turnsLabel}.</p>`
                    });
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "apply"
    }, { width: 380 }).render(true);
}
globalThis.magcmDisableAttack = magcmDisableAttack;

/**
 * Reload / Unload macro: spends Load actions on a selected token's equipped/held ranged weapon,
 * tracking progress via the "loadProgress" flag (see the "Not loaded" attack-dialog check).
 */
async function magcmReload(token) {
    if (!token || !token.actor) {
        return ui.notifications.warn("Please select a token to reload a weapon.");
    }

    const actor = token.actor;
    const rangedWeapons = actor.items.filter(item => {
        if (item.type !== "ranged-weapon") return false;
        const holdingLocations = item.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
        return holdingLocations.length > 0 || Boolean(item.system?.equipped ?? item.system?.isEquipped);
    });

    if (rangedWeapons.length === 0) {
        return ui.notifications.warn(`${actor.name} has no equipped or held ranged weapons.`);
    }

    const weaponOptions = rangedWeapons.map(w => {
        const requiredLoad = Number(w.system?.load) ?? 1;
        const currentLoad = w.getFlag(MAGCM_MODULE_ID, "loadProgress") ?? 0;
        const status = currentLoad >= requiredLoad ? "LOADED" : `${currentLoad}/${requiredLoad}`;
        return `<option value="${w.id}">${w.name} (${status})</option>`;
    }).join("");

    new Dialog({
        title: "Reload / Unload Ranged Weapon",
        content: `
            <form style="margin: 5px; padding: 5px;">
                <div style="margin-bottom: 10px;">
                    <label><strong>Ranged Weapon:</strong></label>
                    <select id="selectedWeapon" style="width: 100%; margin-top: 4px;">
                        ${weaponOptions}
                    </select>
                </div>
                <div style="margin-bottom: 10px;">
                    <label><strong>Load Actions to Spend:</strong></label>
                    <input type="number" id="loadActions" value="1" min="1" style="width: 100%; margin-top: 4px; text-align: center;">
                </div>
            </form>`,
        buttons: {
            load: {
                label: "Apply Load",
                callback: async (html) => {
                    const weaponId = html.find('#selectedWeapon').val();
                    const weapon = actor.items.get(weaponId);
                    if (!weapon) return;

                    const actionsSpent = Math.max(1, Number(html.find('#loadActions').val()) || 1);
                    const requiredLoad = Number(weapon.system?.load) ?? 1;
                    const currentLoad = weapon.getFlag(MAGCM_MODULE_ID, "loadProgress") ?? 0;

                    if (requiredLoad === 0) {
                        ui.notifications.info(`${weapon.name} does not require loading.`);
                        return;
                    }

                    if (currentLoad >= requiredLoad) {
                        ui.notifications.info(`${weapon.name} is already fully reloaded.`);
                        return;
                    }

                    const newLoad = Math.min(requiredLoad, currentLoad + actionsSpent);
                    await weapon.setFlag(MAGCM_MODULE_ID, "loadProgress", newLoad);

                    const isFullyLoaded = newLoad >= requiredLoad;
                    const statusMessage = isFullyLoaded
                        ? `<p style="color: green; font-weight: bold;">${weapon.name} is now fully reloaded and ready to fire!</p>`
                        : `<p>${weapon.name} Reload progress: <strong>${newLoad}/${requiredLoad}</strong> actions.</p>`;

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ actor: actor }),
                        content: `
                            <div style="text-align: center; padding: 4px;">
                                <p><strong>${actor.name}</strong> spent ${actionsSpent} action(s) reloading <strong>${weapon.name}</strong>.</p>
                                ${statusMessage}
                            </div>`
                    });
                }
            },
            unload: {
                label: "Unload",
                callback: async (html) => {
                    const weaponId = html.find('#selectedWeapon').val();
                    const weapon = actor.items.get(weaponId);
                    if (!weapon) return;

                    const requiredLoad = Number(weapon.system?.load) ?? 1;
                    if (requiredLoad === 0) {
                        ui.notifications.info(`${weapon.name} does not require loading.`);
                        return;
                    }

                    const currentLoad = weapon.getFlag(MAGCM_MODULE_ID, "loadProgress") ?? 0;
                    if (currentLoad === 0) {
                        ui.notifications.info(`${weapon.name} is already unloaded.`);
                        return;
                    }

                    await weapon.setFlag(MAGCM_MODULE_ID, "loadProgress", 0);

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ actor: actor }),
                        content: `
                            <div style="text-align: center; padding: 4px;">
                                <p><strong>${actor.name}</strong> unloaded <strong>${weapon.name}</strong>.</p>
                            </div>`
                    });
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "load"
    }).render(true);
}
globalThis.magcmReload = magcmReload;

/**
 * Damage Weapon macro: implements the "Damage Weapon" special effect against the targeted token's
 * equipped weapon - damage is first resisted by the weapon's own Armour Points, with any surplus
 * reducing its Hit Points. A weapon reduced to 0 HP breaks.
 */
async function magcmDamageWeapon() {
    const targetToken = game.user.targets.first();
    const targetActor = targetToken?.actor;

    if (!targetActor) {
        return ui.notifications.warn("Please target the token whose weapon you wish to damage.");
    }

    const isEquipped = item => {
        const holdingLocations = item.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
        return holdingLocations.length > 0 || Boolean(item.system?.equipped ?? item.system?.isEquipped);
    };

    const weapons = targetActor.items.filter(item => (item.type === "melee-weapon" || item.type === "ranged-weapon") && isEquipped(item));

    if (weapons.length === 0) {
        return ui.notifications.warn(`${targetActor.name} has no equipped weapons.`);
    }

    // Helper: update the weapon's HP locally, or relay via GM socket if the current user lacks permission
    async function updateWeaponHp(weapon, newHp) {
        if (targetActor.canUserModify(game.user, "update")) {
            await targetActor.updateEmbeddedDocuments("Item", [{ _id: weapon.id, "system.hp": newHp }]);
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateItemFields",
                targetTokenId: targetToken.id,
                itemId: weapon.id,
                fields: { "system.hp": newHp }
            });
        }
    }

    const weaponOptions = weapons.map(w => `<option value="${w.id}">${w.name} (AP: ${Number(w.system?.ap) || 0} / HP: ${Number(w.system?.hp) || 0})</option>`).join("");

    new Dialog({
        title: `Damage Weapon - ${targetActor.name}`,
        content: `
            <form style="padding: 4px;">
                <div class="form-group" style="margin-bottom: 8px;">
                    <label style="font-weight: bold; display: block; margin-bottom: 4px;">Target Weapon</label>
                    <select id="damage-weapon-select" style="width: 100%;">${weaponOptions}</select>
                </div>
                <div id="damage-weapon-stats" style="font-size: 11px; color: #555; margin-bottom: 10px;"></div>
                <div class="form-group">
                    <label style="font-weight: bold; display: block; margin-bottom: 4px;">Damage Amount</label>
                    <input type="number" id="damage-weapon-amount" value="1" step="1" style="width: 100%; text-align: center;" />
                </div>
            </form>
        `,
        buttons: {
            apply: {
                icon: '<i class="fas fa-hammer"></i>',
                label: "Apply Damage to Weapon",
                callback: async (html) => {
                    const weaponId = html.find("#damage-weapon-select").val();
                    const weapon = targetActor.items.get(weaponId);
                    if (!weapon) return ui.notifications.warn("Selected weapon not found.");

                    const rawInput = html.find("#damage-weapon-amount").val();
                    const damage = Number(rawInput);
                    if (!Number.isInteger(damage) || damage === 0) {
                        return ui.notifications.warn(`"${rawInput}" is not a valid damage amount. Please enter a non-zero whole number.`);
                    }

                    const ap = Number(weapon.system?.ap) || 0;
                    const currentHp = Number(weapon.system?.hp) || 0;
                    const mitigatedDamage = Math.max(0, damage - ap);
                    const newHp = Math.max(0, currentHp - mitigatedDamage);
                    const broken = newHp <= 0 && currentHp > 0;

                    await updateWeaponHp(weapon, newHp);

                    const content = `
                        <h3 style="border-bottom: 2px solid var(--color-border-dark-tertiary); margin-bottom: 4px;">Damage Weapon</h3>
                        <p><strong>Target:</strong> ${targetActor.name}'s ${weapon.name}</p>
                        <p><strong>Weapon AP:</strong> ${ap} | <strong>Damage Rolled:</strong> ${damage} | <strong>After AP:</strong> ${mitigatedDamage}</p>
                        <p><strong>Weapon HP:</strong> ${currentHp} &rarr; ${newHp}</p>
                        ${broken ? `<p style="color: darkred; font-weight: bold;">${weapon.name} has broken!</p>` : ""}
                    `;

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: targetToken.document }),
                        content
                    });
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "apply",
        render: (html) => {
            const select = html.find("#damage-weapon-select");
            const statsEl = html.find("#damage-weapon-stats");

            function updateStats() {
                const weapon = targetActor.items.get(select.val());
                if (!weapon) return statsEl.text("");
                statsEl.html(`Current <strong>AP:</strong> ${Number(weapon.system?.ap) || 0} | Current <strong>HP:</strong> ${Number(weapon.system?.hp) || 0}`);
            }

            select.on("change", updateStats);
            updateStats();
        }
    }, { width: 400, resizable: true }).render(true);
}
globalThis.magcmDamageWeapon = magcmDamageWeapon;

/**
 * Equip Weapon macro: lets the selected token's owner assign which hit location(s) are holding each
 * of their melee/ranged weapons (arms first, then other hit locations).
 */
async function magcmEquipWeapon() {
    // 1. Token & Permission Checks
    const token = canvas.tokens.controlled[0];
    if (!token) {
        return ui.notifications.warn("Please select a token first.");
    }

    const actor = token.actor;
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
        return ui.notifications.error("You do not have permission to manage weapons for this actor.");
    }

    // 2. Fetch Weapons & Hit Locations
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");
    const weapons = actor.items.filter(i => i.type === "melee-weapon" || i.type === "ranged-weapon");

    if (hitLocations.length === 0) {
        return ui.notifications.warn(`${actor.name} has no hit location items.`);
    }

    // Helper: Find which weapon currently holds a given location ID
    const getHeldWeaponForLocation = (locId) => {
        return weapons.find(w => {
            const locs = w.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
            return locs.includes(locId);
        });
    };

    // 3. Separate Primary Arms from Other Locations
    const primaryLocations = [];
    const otherLocations = [];

    hitLocations.forEach(loc => {
        const nameLower = loc.name.toLowerCase();
        if (nameLower.includes("right arm") || nameLower.includes("left arm")) {
            primaryLocations.push(loc);
        } else {
            otherLocations.push(loc);
        }
    });

    // Ensure Right Arm appears before Left Arm
    primaryLocations.sort((a, b) => {
        if (a.name.toLowerCase().includes("right") && b.name.toLowerCase().includes("left")) return -1;
        if (a.name.toLowerCase().includes("left") && b.name.toLowerCase().includes("right")) return 1;
        return 0;
    });

    // 4. Render HTML Location Rows
    const renderLocationRow = (loc) => {
        const currentHeldWeapon = getHeldWeaponForLocation(loc.id);
        const currentWeaponId = currentHeldWeapon ? currentHeldWeapon.id : "";

        let optionsHtml = `<option value="">-- None --</option>`;
        optionsHtml += weapons.map(w => {
            const selected = w.id === currentWeaponId ? "selected" : "";
            return `<option value="${w.id}" ${selected}>${w.name}</option>`;
        }).join("");

        return `
            <div class="form-group" style="display: flex; align-items: center; margin-bottom: 6px;">
                <label style="flex: 1; font-weight: bold; font-size: 13px;">${loc.name}:</label>
                <select class="loc-weapon-select" data-loc-id="${loc.id}" style="flex: 1.2; height: 26px;">
                    ${optionsHtml}
                </select>
            </div>
        `;
    };

    let dialogContent = `<form class="equip-weapons-form" style="padding: 4px;">`;

    if (primaryLocations.length > 0) {
        dialogContent += `
            <fieldset style="margin-bottom: 12px; border: 1px solid #7a0000; border-radius: 4px; padding: 8px; background: rgba(122, 0, 0, 0.03);">
                <legend style="font-weight: bold; color: #7a0000; padding: 0 6px;">Arms</legend>
        `;
        primaryLocations.forEach(loc => {
            dialogContent += renderLocationRow(loc);
        });
        dialogContent += `</fieldset>`;
    }

    if (otherLocations.length > 0) {
        dialogContent += `
            <fieldset style="margin-bottom: 8px; border: 1px solid #4b4b4b; border-radius: 4px; padding: 8px;">
                <legend style="font-weight: bold; padding: 0 6px;">Other Hit Locations</legend>
        `;
        otherLocations.forEach(loc => {
            dialogContent += renderLocationRow(loc);
        });
        dialogContent += `</fieldset>`;
    }

    dialogContent += `</form>`;

    // 5. Open Dialog
    new Dialog({
        title: `Equip Weapons: ${actor.name}`,
        content: dialogContent,
        buttons: {
            equip: {
                icon: '<i class="fas fa-shield-alt"></i>',
                label: "Equip",
                callback: async (html) => {
                    // Map weapons to their new list of assigned hit location IDs
                    const weaponHoldingMap = {};
                    weapons.forEach(w => weaponHoldingMap[w.id] = []);

                    // Gather user selections from all dropdowns
                    html.find(".loc-weapon-select").each((i, el) => {
                        const locId = el.dataset.locId;
                        const chosenWeaponId = el.value;
                        if (chosenWeaponId && weaponHoldingMap[chosenWeaponId]) {
                            weaponHoldingMap[chosenWeaponId].push(locId);
                        }
                    });

                    // Update flags for all weapons
                    for (let weapon of weapons) {
                        const newLocs = weaponHoldingMap[weapon.id];
                        const oldLocs = weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];

                        // Only write flag updates if something changed
                        const isChanged = newLocs.length !== oldLocs.length || !newLocs.every(id => oldLocs.includes(id));
                        if (isChanged) {
                            await weapon.setFlag(MAGCM_MODULE_ID, "holdingLocations", newLocs);
                        }
                    }

                    // Force token redraw to instantly reflect icon overlays
                    token.draw();
                    ui.notifications.info(`Updated equipped weapons for ${actor.name}.`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "equip"
    }, { width: 400, resizable: true }).render(true);
}
globalThis.magcmEquipWeapon = magcmEquipWeapon;

/**
 * Set Melee Engagement Range macro: sets (or clears) the reciprocal melee engagement range flag
 * between the selected token and every currently targeted token.
 */
async function magcmSetMeleeRange() {
    const sourceToken = canvas.tokens.controlled[0];
    const targetTokens = Array.from(game.user.targets);

    if (!sourceToken) {
        return ui.notifications.warn("Please select a character token first.");
    }
    if (targetTokens.length === 0) {
        return ui.notifications.warn("Please target at least one token to set engagement.");
    }

    const entangledLegLocations = sourceToken.actor.items.filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "entangledBy") && /leg/i.test(i.name));
    if (entangledLegLocations.length > 0) {
        return ui.notifications.warn(`${sourceToken.name} cannot set melee engagement range because one or more legs are entangled.`);
    }

    // Helper function to process updates locally or emit to GM if unowned
    async function setEngagementFlag(actor, targetId, flagData) {
        if (actor.canUserModify(game.user, "update")) {
            if (flagData === null) {
                await actor.unsetFlag(MAGCM_MODULE_ID, `engagements.${targetId}`);
                const remaining = actor.getFlag(MAGCM_MODULE_ID, "engagements") || {};
                if (Object.keys(remaining).length === 0) {
                    await actor.unsetFlag(MAGCM_MODULE_ID, "engagements");
                }
            } else {
                let engagements = foundry.utils.duplicate(actor.getFlag(MAGCM_MODULE_ID, "engagements") || {});
                engagements[targetId] = flagData;
                await actor.setFlag(MAGCM_MODULE_ID, "engagements", engagements);
            }
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateEngagement",
                actorId: actor.id,
                targetId: targetId,
                flagData: flagData
            });
        }
    }

    new Dialog({
        title: "Set Melee Engagement Range",
        content: `
            <form style="padding: 4px;">
                <div class="form-group">
                    <label style="font-weight: bold;">Select Engagement Range:</label>
                    <select id="range-select" style="width: 100%; margin-top: 4px;">
                        <option value="Touch">Touch</option>
                        <option value="Short">Short</option>
                        <option value="Medium">Medium</option>
                        <option value="Long">Long</option>
                        <option value="Very Long">Very Long</option>
                        <option value="CLEAR">-- Clear Engagement --</option>
                    </select>
                </div>
            </form>
        `,
        buttons: {
            apply: {
                icon: '<i class="fas fa-swords"></i>',
                label: "Apply Range",
                callback: async (html) => {
                    const selectedRange = html.find("#range-select").val();
                    const sourceActor = sourceToken.actor;
                    if (!sourceActor) return;

                    const chatLogLines = [];

                    if (selectedRange === "CLEAR") {
                        for (const targetToken of targetTokens) {
                            const targetActor = targetToken.actor;
                            if (!targetActor) continue;

                            const existingData = sourceActor.getFlag(MAGCM_MODULE_ID, `engagements.${targetActor.id}`);
                            const oldRange = typeof existingData === "object" ? existingData?.range : existingData;

                            await setEngagementFlag(sourceActor, targetActor.id, null);
                            await setEngagementFlag(targetActor, sourceActor.id, null);

                            if (oldRange) {
                                chatLogLines.push(`<li>Cleared engagement between <strong>${sourceToken.name}</strong> and <strong>${targetToken.name}</strong> (was <i>${oldRange}</i>).</li>`);
                            } else {
                                chatLogLines.push(`<li>Cleared engagement between <strong>${sourceToken.name}</strong> and <strong>${targetToken.name}</strong>.</li>`);
                            }
                        }
                    } else {
                        for (const targetToken of targetTokens) {
                            const targetActor = targetToken.actor;
                            if (!targetActor) continue;

                            const sourceEngagements = sourceActor.getFlag(MAGCM_MODULE_ID, "engagements") || {};
                            const existingData = sourceEngagements[targetActor.id];
                            const oldRange = typeof existingData === "object" ? existingData?.range : existingData;

                            const sourceData = {
                                name: targetToken.name || targetActor.name,
                                img: targetToken.document.texture.src || targetActor.img,
                                range: selectedRange
                            };
                            const targetData = {
                                name: sourceToken.name || sourceActor.name,
                                img: sourceToken.document.texture.src || sourceActor.img,
                                range: selectedRange
                            };

                            await setEngagementFlag(sourceActor, targetActor.id, sourceData);
                            await setEngagementFlag(targetActor, sourceActor.id, targetData);

                            if (!oldRange) {
                                chatLogLines.push(`<li><strong>${sourceToken.name}</strong> engaged <strong>${targetToken.name}</strong> at <strong>${selectedRange}</strong> range.</li>`);
                            } else if (oldRange !== selectedRange) {
                                chatLogLines.push(`<li>Engagement between <strong>${sourceToken.name}</strong> and <strong>${targetToken.name}</strong> changed from <i>${oldRange}</i> to <strong>${selectedRange}</strong>.</li>`);
                            } else {
                                chatLogLines.push(`<li>Engagement between <strong>${sourceToken.name}</strong> and <strong>${targetToken.name}</strong> maintained at <strong>${selectedRange}</strong>.</li>`);
                            }
                        }
                    }

                    if (chatLogLines.length > 0) {
                        const content = `
                            <div style="font-size: 0.9em; padding: 2px;">
                                <ul style="margin: 0; padding-left: 15px;">
                                    ${chatLogLines.join("")}
                                </ul>
                            </div>
                        `;
                        await ChatMessage.create({
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({ token: sourceToken.document }),
                            flavor: "Engagement Range Update",
                            content: content
                        });
                    }

                    canvas.tokens.placeables.forEach(t => t.refresh());
                }
            },
            cancel: {
                label: "Cancel"
            }
        },
        default: "apply"
    }).render(true);
}
globalThis.magcmSetMeleeRange = magcmSetMeleeRange;

/**
 * Take Cover macro: lets the selected token's owner mark which of their hit locations are currently
 * behind cover (drives the "In Cover" token overlay).
 */
async function magcmTakeCover() {
    // 1. Token & Permission Verification
    const token = canvas.tokens.controlled[0];
    if (!token) {
        return ui.notifications.warn("Please select a token first.");
    }

    const actor = token.actor;
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
        return ui.notifications.error("You do not have permission to configure this actor.");
    }

    // 2. Fetch Hit Locations
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");

    if (hitLocations.length === 0) {
        return ui.notifications.warn(`${actor.name} has no hit location items.`);
    }

    // Helper: Build the checkbox HTML for a hit location
    const renderCheckbox = (locItem) => {
        const isInCover = locItem.getFlag(MAGCM_MODULE_ID, "inCover") ?? true;
        const checkedAttr = isInCover ? "checked" : "";

        return `
            <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                <input type="checkbox" class="cover-checkbox" data-loc-id="${locItem.id}" ${checkedAttr} style="width: 16px; height: 16px; cursor: pointer;" />
                <span style="font-size: 11px; color: #333;">In Cover</span>
            </div>
        `;
    };

    // 3. Identify Humanoid Body Layout Parts
    const bodyPartMap = {};
    hitLocations.forEach(loc => {
        const name = loc.name.toLowerCase().trim();
        if (name.includes("head")) bodyPartMap.head = loc;
        else if (name.includes("chest")) bodyPartMap.chest = loc;
        else if (name.includes("abdomen")) bodyPartMap.abdomen = loc;
        else if (name.includes("right arm")) bodyPartMap.rightArm = loc;
        else if (name.includes("left arm")) bodyPartMap.leftArm = loc;
        else if (name.includes("right leg")) bodyPartMap.rightLeg = loc;
        else if (name.includes("left leg")) bodyPartMap.leftLeg = loc;
    });

    const isStandardHumanoid = bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
                               bodyPartMap.rightArm && bodyPartMap.leftArm && 
                               bodyPartMap.rightLeg && bodyPartMap.leftLeg;

    // Check if all hit locations are currently in cover to set initial master checkbox state
    const allInitiallyInCover = hitLocations.every(loc => (loc.getFlag(MAGCM_MODULE_ID, "inCover") ?? true));

    let dialogContent = `<form class="cover-form" style="padding: 4px;">`;

    // Master Toggle All Checkbox Header
    dialogContent += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.06); padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #ccc;">
            <label style="font-weight: bold; font-size: 12px; color: #222; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%;">
                <input type="checkbox" id="toggle-all-cover" ${allInitiallyInCover ? "checked" : ""} style="width: 16px; height: 16px; cursor: pointer;" />
                <span>Toggle All Hit Locations</span>
            </label>
        </div>
    `;

    if (isStandardHumanoid) {
        // Human Body Diagram Layout using CSS Grid
        dialogContent += `
            <style>
                .body-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr 1fr;
                    gap: 8px;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.04);
                    border: 1px solid #2e8b57;
                    border-radius: 6px;
                    padding: 10px;
                }
                .body-cell {
                    background: rgba(255, 255, 255, 0.85);
                    border: 1px solid #b5b5b5;
                    border-radius: 4px;
                    padding: 5px;
                    text-align: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .body-cell label {
                    font-weight: bold;
                    font-size: 11px;
                    display: block;
                    margin-bottom: 3px;
                    color: #2e8b57;
                }
                .grid-head  { grid-column: 2; grid-row: 1; }
                .grid-rarm  { grid-column: 1; grid-row: 2; }
                .grid-chest { grid-column: 2; grid-row: 2; }
                .grid-larm  { grid-column: 3; grid-row: 2; }
                .grid-abdo  { grid-column: 2; grid-row: 3; }
                .grid-rleg  { grid-column: 1; grid-row: 4; }
                .grid-lleg  { grid-column: 3; grid-row: 4; }
            </style>
            
            <div class="body-grid">
                <div class="body-cell grid-head">
                    <label>${bodyPartMap.head.name}</label>
                    ${renderCheckbox(bodyPartMap.head)}
                </div>
                <div class="body-cell grid-rarm">
                    <label>${bodyPartMap.rightArm.name}</label>
                    ${renderCheckbox(bodyPartMap.rightArm)}
                </div>
                <div class="body-cell grid-chest">
                    <label>${bodyPartMap.chest.name}</label>
                    ${renderCheckbox(bodyPartMap.chest)}
                </div>
                <div class="body-cell grid-larm">
                    <label>${bodyPartMap.leftArm.name}</label>
                    ${renderCheckbox(bodyPartMap.leftArm)}
                </div>
                <div class="body-cell grid-abdo">
                    <label>${bodyPartMap.abdomen.name}</label>
                    ${renderCheckbox(bodyPartMap.abdomen)}
                </div>
                <div class="body-cell grid-rleg">
                    <label>${bodyPartMap.rightLeg.name}</label>
                    ${renderCheckbox(bodyPartMap.rightLeg)}
                </div>
                <div class="body-cell grid-lleg">
                    <label>${bodyPartMap.leftLeg.name}</label>
                    ${renderCheckbox(bodyPartMap.leftLeg)}
                </div>
            </div>
        `;
    } else {
        // Fallback layout for non-humanoid monsters/creatures
        dialogContent += `<div style="max-height: 400px; overflow-y: auto; padding-right: 4px;">`;
        hitLocations.forEach(loc => {
            dialogContent += `
                <div class="form-group" style="display: flex; align-items: center; margin-bottom: 6px;">
                    <label style="flex: 1; font-weight: bold; font-size: 12px;">${loc.name}:</label>
                    <div style="flex: 1.5;">
                        ${renderCheckbox(loc)}
                    </div>
                </div>
            `;
        });
        dialogContent += `</div>`;
    }

    dialogContent += `</form>`;

    // 4. Render Dialog
    const dialog = new Dialog({
        title: `Take Cover Setup: ${actor.name}`,
        content: dialogContent,
        buttons: {
            save: {
                icon: '<i class="fas fa-shield-alt"></i>',
                label: "Update Cover Status",
                callback: async (html) => {
                    for (let el of html.find(".cover-checkbox").toArray()) {
                        const locId = el.dataset.locId;
                        const isChecked = el.checked;
                        const locItem = actor.items.get(locId);

                        if (locItem) {
                            const currentFlag = locItem.getFlag(MAGCM_MODULE_ID, "inCover") || false;
                            if (currentFlag !== isChecked) {
                                await locItem.setFlag(MAGCM_MODULE_ID, "inCover", isChecked);
                            }
                        }
                    }
                    ui.notifications.info(`Updated cover status for ${actor.name}.`);
                }
            },
            exit: {
                icon: '<i class="fas fa-ban"></i>',
                label: "Exit Cover",
                callback: async () => {
                    for (let locItem of hitLocations) {
                        await locItem.setFlag(MAGCM_MODULE_ID, "inCover", false);
                    }
                    ui.notifications.info(`${actor.name} has exited cover.`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "save"
    }, { width: isStandardHumanoid ? 600 : 420, resizable: true });

    const hookId = Hooks.on("renderDialog", (app, html) => {
        if (app.title === `Take Cover Setup: ${actor.name}`) {
            html.find("#toggle-all-cover").on("change", (event) => {
                const isChecked = event.currentTarget.checked;
                html.find(".cover-checkbox").prop("checked", isChecked);
            });
            Hooks.off("renderDialog", hookId);
        }
    });

    dialog.render(true);
}
globalThis.magcmTakeCover = magcmTakeCover;

/**
 * Unentangle macro: lets the selected token's owner clear the entangledBy flag from one or more of
 * their currently entangled hit locations.
 */
async function magcmUnentangle() {
    // 1. Token & Permission Verification
    const token = canvas.tokens.controlled[0];
    if (!token) {
        return ui.notifications.warn("Please select a token first.");
    }

    const actor = token.actor;
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
        return ui.notifications.error("You do not have permission to configure this actor.");
    }

    // 2. Fetch Hit Locations
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");

    if (hitLocations.length === 0) {
        return ui.notifications.warn(`${actor.name} has no hit location items.`);
    }

    const entangledLocations = hitLocations.filter(loc => loc.getFlag(MAGCM_MODULE_ID, "entangledBy"));
    if (entangledLocations.length === 0) {
        return ui.notifications.info(`${actor.name} has no entangled hit locations.`);
    }

    // Helper: Build the checkbox HTML for a hit location (only entangled locations are actionable)
    const renderCheckbox = (locItem) => {
        const entangleData = locItem.getFlag(MAGCM_MODULE_ID, "entangledBy");
        if (!entangleData) {
            return `<div style="display: flex; align-items: center; justify-content: center; opacity: 0.35;"><span style="font-size: 11px; color: #333;">Not Entangled</span></div>`;
        }

        return `
            <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 3px;">
                <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                    <input type="checkbox" class="unentangle-checkbox" data-loc-id="${locItem.id}" checked style="width: 16px; height: 16px; cursor: pointer;" />
                    <span style="font-size: 11px; color: #333;">Entangled</span>
                </label>
                <span style="font-size: 9px; color: #666;">${entangleData.weaponName || "Unknown"} (${entangleData.attackerName || "Unknown"})</span>
            </div>
        `;
    };

    // 3. Identify Humanoid Body Layout Parts
    const bodyPartMap = {};
    hitLocations.forEach(loc => {
        const name = loc.name.toLowerCase().trim();
        if (name.includes("head")) bodyPartMap.head = loc;
        else if (name.includes("chest")) bodyPartMap.chest = loc;
        else if (name.includes("abdomen")) bodyPartMap.abdomen = loc;
        else if (name.includes("right arm")) bodyPartMap.rightArm = loc;
        else if (name.includes("left arm")) bodyPartMap.leftArm = loc;
        else if (name.includes("right leg")) bodyPartMap.rightLeg = loc;
        else if (name.includes("left leg")) bodyPartMap.leftLeg = loc;
    });

    const isStandardHumanoid = bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
                               bodyPartMap.rightArm && bodyPartMap.leftArm &&
                               bodyPartMap.rightLeg && bodyPartMap.leftLeg;

    let dialogContent = `<form class="unentangle-form" style="padding: 4px;">`;

    // Master "Unentangle All" toggle
    dialogContent += `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.06); padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #ccc;">
            <label style="font-weight: bold; font-size: 12px; color: #222; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%;">
                <input type="checkbox" id="toggle-all-unentangle" checked style="width: 16px; height: 16px; cursor: pointer;" />
                <span>Unentangle All Selected Locations</span>
            </label>
        </div>
    `;

    if (isStandardHumanoid) {
        dialogContent += `
            <style>
                .body-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr 1fr;
                    gap: 8px;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.04);
                    border: 1px solid #4a5fc1;
                    border-radius: 6px;
                    padding: 10px;
                }
                .body-cell {
                    background: rgba(255, 255, 255, 0.85);
                    border: 1px solid #b5b5b5;
                    border-radius: 4px;
                    padding: 5px;
                    text-align: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .body-cell label.loc-label {
                    font-weight: bold;
                    font-size: 11px;
                    display: block;
                    margin-bottom: 3px;
                    color: #4a5fc1;
                }
                .grid-head  { grid-column: 2; grid-row: 1; }
                .grid-rarm  { grid-column: 1; grid-row: 2; }
                .grid-chest { grid-column: 2; grid-row: 2; }
                .grid-larm  { grid-column: 3; grid-row: 2; }
                .grid-abdo  { grid-column: 2; grid-row: 3; }
                .grid-rleg  { grid-column: 1; grid-row: 4; }
                .grid-lleg  { grid-column: 3; grid-row: 4; }
            </style>

            <div class="body-grid">
                <div class="body-cell grid-head">
                    <label class="loc-label">${bodyPartMap.head.name}</label>
                    ${renderCheckbox(bodyPartMap.head)}
                </div>
                <div class="body-cell grid-rarm">
                    <label class="loc-label">${bodyPartMap.rightArm.name}</label>
                    ${renderCheckbox(bodyPartMap.rightArm)}
                </div>
                <div class="body-cell grid-chest">
                    <label class="loc-label">${bodyPartMap.chest.name}</label>
                    ${renderCheckbox(bodyPartMap.chest)}
                </div>
                <div class="body-cell grid-larm">
                    <label class="loc-label">${bodyPartMap.leftArm.name}</label>
                    ${renderCheckbox(bodyPartMap.leftArm)}
                </div>
                <div class="body-cell grid-abdo">
                    <label class="loc-label">${bodyPartMap.abdomen.name}</label>
                    ${renderCheckbox(bodyPartMap.abdomen)}
                </div>
                <div class="body-cell grid-rleg">
                    <label class="loc-label">${bodyPartMap.rightLeg.name}</label>
                    ${renderCheckbox(bodyPartMap.rightLeg)}
                </div>
                <div class="body-cell grid-lleg">
                    <label class="loc-label">${bodyPartMap.leftLeg.name}</label>
                    ${renderCheckbox(bodyPartMap.leftLeg)}
                </div>
            </div>
        `;
    } else {
        dialogContent += `<div style="max-height: 400px; overflow-y: auto; padding-right: 4px;">`;
        hitLocations.forEach(loc => {
            dialogContent += `
                <div class="form-group" style="display: flex; align-items: center; margin-bottom: 6px;">
                    <label style="flex: 1; font-weight: bold; font-size: 12px;">${loc.name}:</label>
                    <div style="flex: 1.5;">
                        ${renderCheckbox(loc)}
                    </div>
                </div>
            `;
        });
        dialogContent += `</div>`;
    }

    dialogContent += `</form>`;

    const dialog = new Dialog({
        title: `Unentangle: ${actor.name}`,
        content: dialogContent,
        buttons: {
            save: {
                icon: '<i class="fas fa-unlink"></i>',
                label: "Unentangle Selected",
                callback: async (html) => {
                    const idsToClear = html.find(".unentangle-checkbox:checked").toArray().map(el => el.dataset.locId);
                    if (idsToClear.length === 0) {
                        return ui.notifications.info("No entangled locations were selected.");
                    }

                    const names = [];
                    for (const locId of idsToClear) {
                        const locItem = actor.items.get(locId);
                        if (locItem?.getFlag(MAGCM_MODULE_ID, "entangledBy")) {
                            await locItem.unsetFlag(MAGCM_MODULE_ID, "entangledBy");
                            names.push(locItem.name);
                        }
                    }

                    canvas.tokens.placeables.forEach(t => t.refresh());
                    ui.notifications.info(`${actor.name} unentangled: ${names.join(", ") || "none"}.`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "save"
    }, { width: isStandardHumanoid ? 600 : 420, resizable: true });

    const hookId = Hooks.on("renderDialog", (app, html) => {
        if (app.title === `Unentangle: ${actor.name}`) {
            html.find("#toggle-all-unentangle").on("change", (event) => {
                const isChecked = event.currentTarget.checked;
                html.find(".unentangle-checkbox").prop("checked", isChecked);
            });
            Hooks.off("renderDialog", hookId);
        }
    });

    dialog.render(true);
}
globalThis.magcmUnentangle = magcmUnentangle;

/**
 * Ward Location macro: lets the selected token's owner assign one of their held melee weapons to
 * passively block (ward) each hit location.
 */
async function magcmWardLocation() {
    // 1. Token & Permission Verification
    const token = canvas.tokens.controlled[0];
    if (!token) {
        return ui.notifications.warn("Please select a token first.");
    }

    const actor = token.actor;
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
        return ui.notifications.error("You do not have permission to configure this actor.");
    }

    // 2. Fetch Hit Locations & Held Melee Weapons
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");

    // Only MELEE weapons currently held in at least one hit location can passively block
    const heldMeleeWeapons = actor.items.filter(i => {
        if (i.type !== "melee-weapon") return false;
        const locs = i.getFlag(MAGCM_MODULE_ID, "holdingLocations");
        return Array.isArray(locs) && locs.length > 0;
    });

    if (hitLocations.length === 0) {
        return ui.notifications.warn(`${actor.name} has no hit location items.`);
    }

    // Helper: Build the dropdown & image preview HTML for a hit location
    const renderDropdown = (locItem) => {
        const currentBlockingWeaponId = locItem.getFlag(MAGCM_MODULE_ID, "blockingWeapon") || "";
        const currentWeapon = heldMeleeWeapons.find(w => w.id === currentBlockingWeaponId);
        const imgSrc = currentWeapon?.img || "icons/svg/shield.svg";

        let options = `<option value="">-- None --</option>`;
        options += heldMeleeWeapons.map(w => {
            const selected = w.id === currentBlockingWeaponId ? "selected" : "";
            return `<option value="${w.id}" ${selected}>${w.name}</option>`;
        }).join("");

        return `
            <div style="display: flex; align-items: center; gap: 4px;">
                <img class="passive-block-img" data-loc-id="${locItem.id}" src="${imgSrc}" style="width: 24px; height: 24px; border: 1px solid #7a0000; border-radius: 3px; object-fit: cover; background: rgba(0, 0, 0, 0.1);" />
                <select class="passive-block-select" data-loc-id="${locItem.id}" style="flex: 1; font-size: 11px; height: 24px; text-overflow: ellipsis;">
                    ${options}
                </select>
            </div>
        `;
    };

    // 3. Identify Humanoid Body Layout Parts
    const bodyPartMap = {};
    hitLocations.forEach(loc => {
        const name = loc.name.toLowerCase().trim();
        if (name.includes("head")) bodyPartMap.head = loc;
        else if (name.includes("chest")) bodyPartMap.chest = loc;
        else if (name.includes("abdomen")) bodyPartMap.abdomen = loc;
        else if (name.includes("right arm")) bodyPartMap.rightArm = loc;
        else if (name.includes("left arm")) bodyPartMap.leftArm = loc;
        else if (name.includes("right leg")) bodyPartMap.rightLeg = loc;
        else if (name.includes("left leg")) bodyPartMap.leftLeg = loc;
    });

    const isStandardHumanoid = bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
                               bodyPartMap.rightArm && bodyPartMap.leftArm && 
                               bodyPartMap.rightLeg && bodyPartMap.leftLeg;

    let dialogContent = `<form class="passive-block-form" style="padding: 4px;">`;

    if (isStandardHumanoid) {
        // Human Body Diagram Layout using CSS Grid
        dialogContent += `
            <style>
                .body-grid {
                    display: grid;
                    grid-template-columns: 1fr 1.2fr 1fr;
                    gap: 8px;
                    align-items: center;
                    background: rgba(0, 0, 0, 0.04);
                    border: 1px solid #7a0000;
                    border-radius: 6px;
                    padding: 10px;
                }
                .body-cell {
                    background: rgba(255, 255, 255, 0.85);
                    border: 1px solid #b5b5b5;
                    border-radius: 4px;
                    padding: 5px;
                    text-align: center;
                    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
                }
                .body-cell label {
                    font-weight: bold;
                    font-size: 11px;
                    display: block;
                    margin-bottom: 3px;
                    color: #7a0000;
                }
                .grid-head  { grid-column: 2; grid-row: 1; }
                .grid-rarm  { grid-column: 1; grid-row: 2; }
                .grid-chest { grid-column: 2; grid-row: 2; }
                .grid-larm  { grid-column: 3; grid-row: 2; }
                .grid-abdo  { grid-column: 2; grid-row: 3; }
                .grid-rleg  { grid-column: 1; grid-row: 4; }
                .grid-lleg  { grid-column: 3; grid-row: 4; }
            </style>
            
            <div class="body-grid">
                <div class="body-cell grid-head">
                    <label>${bodyPartMap.head.name}</label>
                    ${renderDropdown(bodyPartMap.head)}
                </div>
                <div class="body-cell grid-rarm">
                    <label>${bodyPartMap.rightArm.name}</label>
                    ${renderDropdown(bodyPartMap.rightArm)}
                </div>
                <div class="body-cell grid-chest">
                    <label>${bodyPartMap.chest.name}</label>
                    ${renderDropdown(bodyPartMap.chest)}
                </div>
                <div class="body-cell grid-larm">
                    <label>${bodyPartMap.leftArm.name}</label>
                    ${renderDropdown(bodyPartMap.leftArm)}
                </div>
                <div class="body-cell grid-abdo">
                    <label>${bodyPartMap.abdomen.name}</label>
                    ${renderDropdown(bodyPartMap.abdomen)}
                </div>
                <div class="body-cell grid-rleg">
                    <label>${bodyPartMap.rightLeg.name}</label>
                    ${renderDropdown(bodyPartMap.rightLeg)}
                </div>
                <div class="body-cell grid-lleg">
                    <label>${bodyPartMap.leftLeg.name}</label>
                    ${renderDropdown(bodyPartMap.leftLeg)}
                </div>
            </div>
        `;
    } else {
        // Fallback layout for non-humanoid monsters/creatures
        dialogContent += `<div style="max-height: 400px; overflow-y: auto; padding-right: 4px;">`;
        hitLocations.forEach(loc => {
            dialogContent += `
                <div class="form-group" style="display: flex; align-items: center; margin-bottom: 6px;">
                    <label style="flex: 1; font-weight: bold; font-size: 12px;">${loc.name}:</label>
                    <div style="flex: 1.5;">
                        ${renderDropdown(loc)}
                    </div>
                </div>
            `;
        });
        dialogContent += `</div>`;
    }

    dialogContent += `</form>`;

    // 4. Render Dialog
    new Dialog({
        title: `Warded Location(s) Setup: ${actor.name}`,
        content: dialogContent,
        render: (html) => {
            // Dynamically update weapon icon preview when selection changes
            html.find(".passive-block-select").on("change", (event) => {
                const selectEl = event.currentTarget;
                const locId = selectEl.dataset.locId;
                const weaponId = selectEl.value;
                const weapon = actor.items.get(weaponId);
                const imgSrc = weapon?.img || "icons/svg/shield.svg";

                html.find(`img.passive-block-img[data-loc-id="${locId}"]`).attr("src", imgSrc);
            });
        },
        buttons: {
            save: {
                icon: '<i class="fas fa-shield-alt"></i>',
                label: "Ward Selected Location(s)",
                callback: async (html) => {
                    for (let el of html.find(".passive-block-select").toArray()) {
                        const locId = el.dataset.locId;
                        const selectedWeaponId = el.value;
                        const locItem = actor.items.get(locId);

                        if (locItem) {
                            const currentFlag = locItem.getFlag(MAGCM_MODULE_ID, "blockingWeapon") || "";
                            if (currentFlag !== selectedWeaponId) {
                                await locItem.setFlag(MAGCM_MODULE_ID, "blockingWeapon", selectedWeaponId);
                            }
                        }
                    }
                    ui.notifications.info(`Updated passive block weapons for ${actor.name}.`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "save"
    }, { width: isStandardHumanoid ? 600 : 420, resizable: true }).render(true);
}
globalThis.magcmWardLocation = magcmWardLocation;

/**
 * Impale / Unimpale macro: rolls (or removes) an Impale special effect between the selected attacker
 * token and the currently targeted victim.
 */
async function magcmImpale() {
    const targetToken = game.user.targets.first();
    const targetActor = targetToken?.actor;
    const attackerToken = canvas.tokens.controlled[0];
    const attackerActor = attackerToken?.actor;

    if (!targetActor) {
        return ui.notifications.warn("Please target the actor you wish to impale or unimpale first.");
    }

    const getCombatEffects = item => {
        const effects = item.system?.["combat-effects"] ?? item.system?.combatEffects ?? "";
        return Array.isArray(effects) ? effects.join(",") : String(effects);
    };
    const isEquipped = item => {
        const holdingLocations = item.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
        return holdingLocations.length > 0 || Boolean(item.system?.equipped ?? item.system?.isEquipped);
    };
    const weapons = attackerActor?.items.filter(item => {
        if (item.type !== "melee-weapon" && item.type !== "ranged-weapon") return false;
        return isEquipped(item) && !item.getFlag(MAGCM_MODULE_ID, "pinned") && /impale/i.test(getCombatEffects(item));
    });
    const hitLocations = targetActor?.items.filter(item => {
        const start = item.system?.rollRangeStart ?? item.rollRangeStart;
        const end = item.system?.rollRangeEnd ?? item.rollRangeEnd;
        return item.type === "hitLocation" || (start !== undefined && end !== undefined);
    });

    const impaleRecordsFor = item => {
        const stored = item.getFlag(MAGCM_MODULE_ID, "impaledBy");
        return Array.isArray(stored) ? stored : (stored ? [stored] : []);
    };
    const unimpaleLocations = hitLocations?.filter(item => impaleRecordsFor(item).length > 0) || [];

    const weaponOptions = (weapons || []).map(item => `<option value="${item.id}">${item.name} (${item.system?.size || item.system?.["impale-size"] || "Unknown size"})</option>`).join("");
    const locationOptions = (hitLocations || []).map(item => {
        const start = item.system?.rollRangeStart ?? item.rollRangeStart;
        const end = item.system?.rollRangeEnd ?? item.rollRangeEnd;
        const range = start !== undefined && end !== undefined ? ` (${start}-${end})` : "";
        return `<option value="${item.id}">${item.name}${range}</option>`;
    }).join("");

    // Helper: Build the checkbox HTML for a hit location's impaled record(s), organized like the unentangle grid
    const renderUnimpaleCell = (locItem) => {
        const records = impaleRecordsFor(locItem);
        if (records.length === 0) {
            return `<div style="display: flex; align-items: center; justify-content: center; opacity: 0.35;"><span style="font-size: 11px; color: #333;">Not Impaled</span></div>`;
        }
        return `
            <div style="display: flex; flex-direction: column; gap: 4px;">
                ${records.map(record => {
                    const source = record.isProjectile ? `${record.weaponName} projectile` : record.weaponName;
                    return `
                        <label style="display: flex; align-items: center; gap: 6px; cursor: pointer;">
                            <input type="checkbox" class="unimpale-checkbox" data-loc-id="${locItem.id}" data-impale-id="${record.impaleId || "legacy"}" checked style="width: 16px; height: 16px; cursor: pointer;" />
                            <span style="font-size: 10px; color: #333;">${source}</span>
                        </label>
                    `;
                }).join("")}
            </div>
        `;
    };

    // Identify humanoid body layout for the Unimpale grid, matching the ward/take-cover/unentangle grids
    const bodyPartMap = {};
    (hitLocations || []).forEach(loc => {
        const name = loc.name.toLowerCase().trim();
        if (name.includes("head")) bodyPartMap.head = loc;
        else if (name.includes("chest")) bodyPartMap.chest = loc;
        else if (name.includes("abdomen")) bodyPartMap.abdomen = loc;
        else if (name.includes("right arm")) bodyPartMap.rightArm = loc;
        else if (name.includes("left arm")) bodyPartMap.leftArm = loc;
        else if (name.includes("right leg")) bodyPartMap.rightLeg = loc;
        else if (name.includes("left leg")) bodyPartMap.leftLeg = loc;
    });
    const isStandardHumanoid = Boolean(bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
        bodyPartMap.rightArm && bodyPartMap.leftArm && bodyPartMap.rightLeg && bodyPartMap.leftLeg);

    let unimpaleFieldsHtml = `<label style="display:block; margin-bottom:6px;">Impaled Locations on ${targetActor?.name || "Target"}</label>`;
    if (unimpaleLocations.length === 0) {
        unimpaleFieldsHtml += `<p style="font-size:11px; color:#888;">No impaled locations found on this target.</p>`;
    } else if (isStandardHumanoid) {
        unimpaleFieldsHtml += `
            <style>
                .unimpale-grid { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 8px; align-items: center; background: rgba(0,0,0,0.04); border: 1px solid #7a0000; border-radius: 6px; padding: 10px; }
                .unimpale-cell { background: rgba(255,255,255,0.85); border: 1px solid #b5b5b5; border-radius: 4px; padding: 5px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .unimpale-cell label.loc-label { font-weight: bold; font-size: 11px; display: block; margin-bottom: 3px; color: #7a0000; }
                .u-grid-head  { grid-column: 2; grid-row: 1; }
                .u-grid-rarm  { grid-column: 1; grid-row: 2; }
                .u-grid-chest { grid-column: 2; grid-row: 2; }
                .u-grid-larm  { grid-column: 3; grid-row: 2; }
                .u-grid-abdo  { grid-column: 2; grid-row: 3; }
                .u-grid-rleg  { grid-column: 1; grid-row: 4; }
                .u-grid-lleg  { grid-column: 3; grid-row: 4; }
            </style>
            <div class="unimpale-grid">
                <div class="unimpale-cell u-grid-head"><label class="loc-label">${bodyPartMap.head.name}</label>${renderUnimpaleCell(bodyPartMap.head)}</div>
                <div class="unimpale-cell u-grid-rarm"><label class="loc-label">${bodyPartMap.rightArm.name}</label>${renderUnimpaleCell(bodyPartMap.rightArm)}</div>
                <div class="unimpale-cell u-grid-chest"><label class="loc-label">${bodyPartMap.chest.name}</label>${renderUnimpaleCell(bodyPartMap.chest)}</div>
                <div class="unimpale-cell u-grid-larm"><label class="loc-label">${bodyPartMap.leftArm.name}</label>${renderUnimpaleCell(bodyPartMap.leftArm)}</div>
                <div class="unimpale-cell u-grid-abdo"><label class="loc-label">${bodyPartMap.abdomen.name}</label>${renderUnimpaleCell(bodyPartMap.abdomen)}</div>
                <div class="unimpale-cell u-grid-rleg"><label class="loc-label">${bodyPartMap.rightLeg.name}</label>${renderUnimpaleCell(bodyPartMap.rightLeg)}</div>
                <div class="unimpale-cell u-grid-lleg"><label class="loc-label">${bodyPartMap.leftLeg.name}</label>${renderUnimpaleCell(bodyPartMap.leftLeg)}</div>
            </div>
        `;
    } else {
        unimpaleFieldsHtml += `<div style="max-height: 300px; overflow-y: auto; padding-right: 4px;">`;
        unimpaleLocations.forEach(loc => {
            unimpaleFieldsHtml += `
                <div class="form-group" style="display: flex; align-items: center; margin-bottom: 6px;">
                    <label style="flex: 1; font-weight: bold; font-size: 12px;">${loc.name}:</label>
                    <div style="flex: 1.5;">${renderUnimpaleCell(loc)}</div>
                </div>
            `;
        });
        unimpaleFieldsHtml += `</div>`;
    }
    unimpaleFieldsHtml += `<label style="display:block; margin-top:8px;"><input type="checkbox" id="unimpaleSafely"> Unimpale all selected safely (no damage)</label>`;

    function addDamageModifier(formula, weapon) {
        if (!attackerActor.damageMod || !weapons.length) return formula;
        if (!weapon?.system?.damageModifier) return formula;
        const modifier = String(attackerActor.damageMod).trim();
        if (!modifier) return formula;
        return `${formula}${modifier.startsWith("+") || modifier.startsWith("-") ? modifier : `+${modifier}`}`;
    }

    function damageFormula(weapon) {
        return weapon.damageRoll || weapon.system?.damage || weapon.system?.damageFormula || "1d3";
    }

    new Dialog({
        title: `Impale / Unimpale - ${targetActor.name}${attackerActor ? ` (Attacker: ${attackerActor.name})` : ""}`,
        content: `
            <form>
                <div style="margin-bottom:8px;"><label>Action</label><select id="impaleAction" style="width:100%;">
                    <option value="impale">Impale Target</option>
                    <option value="unimpale" ${unimpaleLocations.length ? "" : "disabled"}>Unimpale Target Location(s)</option>
                </select></div>
                <div id="impaleFields">
                    <div style="margin-bottom:8px;"><label>Weapon</label><select id="impaleWeaponId" style="width:100%;">${weaponOptions || `<option value="">-- No eligible Impale weapons --</option>`}</select></div>
                    <div><label>Hit Location</label><select id="impaleLocationId" style="width:100%;">${locationOptions}</select></div>
                </div>
                <div id="unimpaleFields" style="display:none;">
                    ${unimpaleFieldsHtml}
                </div>
            </form>`,
        buttons: {
            impale: {
                label: "Roll Impale",
                callback: async html => {
                    if (html.find("#impaleAction").val() === "unimpale") {
                        const selected = html.find(".unimpale-checkbox:checked").toArray();
                        if (selected.length === 0) {
                            return ui.notifications.info("No impaled locations were selected to unimpale.");
                        }
                        const unimpaleSafely = html.find("#unimpaleSafely").is(":checked");

                        const buttonsHtml = [];
                        const summaryLines = [];
                        for (const el of selected) {
                            const locationId = el.dataset.locId;
                            const impaleId = el.dataset.impaleId;
                            const location = targetActor?.items.get(locationId);
                            const impaledRecords = impaleRecordsFor(location);
                            const impaled = impaledRecords.find(record => (record.impaleId || "legacy") === impaleId);
                            if (!location || !impaled) continue;

                            const source = impaled.isProjectile ? `${impaled.weaponName} projectile` : impaled.weaponName;
                            const damage = Math.round(Number(impaled.appliedDamage || 0) / 2);
                            if (!unimpaleSafely && (!Number.isFinite(damage) || damage <= 0)) {
                                summaryLines.push(`<li>${location.name} (${source}): skipped, missing original applied damage.</li>`);
                                continue;
                            }

                            summaryLines.push(`<li><strong>${location.name}</strong>: ${source} - ${unimpaleSafely ? "no damage (safe)" : `half of original damage applied (${damage})`}</li>`);
                            buttonsHtml.push(`<button type="button" class="apply-unimpale-damage" data-allow-any-user="true" data-safe="${unimpaleSafely}" data-impale-id="${impaled.impaleId || "legacy"}" data-target-token="${targetToken.id}" data-hit-location-id="${location.id}" data-attacker-actor-id="${impaled.attackerActorId}" data-weapon-id="${impaled.weaponId}" data-damage="${unimpaleSafely ? 0 : damage}">Apply Unimpale: ${location.name} (${source})</button>`);
                        }

                        if (buttonsHtml.length === 0) {
                            return ui.notifications.warn("None of the selected impalements could be processed.");
                        }

                        return ChatMessage.create({
                            speaker: ChatMessage.getSpeaker({ token: targetToken.document }),
                            flavor: `${canvas.tokens?.controlled[0] ? canvas.tokens.controlled[0].name : game.user.name} prepares to unimpale ${targetActor.name}.`,
                            content: `<ul style="margin:0 0 8px 15px; padding:0;">${summaryLines.join("")}</ul><div style="display:flex; flex-direction:column; gap:4px;">${buttonsHtml.join("")}</div>`
                        });
                    }

                    if (!attackerActor) return ui.notifications.warn("Please select an attacking token first.");
                    if (!targetActor) return ui.notifications.warn("Please target a victim before rolling an impale.");
                    if (!weapons?.length) return ui.notifications.warn("You have no equipped, unpinned weapon with the Impale combat effect.");
                    const weapon = attackerActor.items.get(html.find("#impaleWeaponId").val());
                    const hitLocation = targetActor.items.get(html.find("#impaleLocationId").val());
                    if (!weapon || !hitLocation) return ui.notifications.warn("Weapon or hit location not found.");
                    if (weapon.getFlag(MAGCM_MODULE_ID, "pinned") || (weapon.type === "melee-weapon" && weapon.getFlag(MAGCM_MODULE_ID, "impaled"))) return ui.notifications.warn(`${weapon.name} cannot be used for this impale.`);

                    const formula = addDamageModifier(damageFormula(weapon), weapon);
                    const firstRoll = await new Roll(formula).evaluate();
                    const secondRoll = await new Roll(formula).evaluate();
                    const kept = Math.max(Number(firstRoll.total), Number(secondRoll.total));
                    const wornArmor = hitLocation.equippedArmor ? hitLocation.equippedArmor.reduce((sum, armor) => sum + (Number(armor.ap) || 0), 0) : 0;
                    const naturalArmor = Number(hitLocation.naturalArmor) || 0;
                    const mitigation = Math.max(wornArmor, naturalArmor);
                    const damage = Math.max(0, kept - mitigation);
                    const weaponSize = weapon.system?.size || weapon.system?.["impale-size"] || "Unknown";

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: attackerToken.document }),
                        flavor: `${attackerActor.name} impales ${targetActor.name} with ${weapon.type === "ranged-weapon" ? `${weapon.name}'s projectile` : weapon.name}.`,
                        rolls: [firstRoll, secondRoll],
                        content: `
                            <p><strong>Impale:</strong> ${weapon.type === "ranged-weapon" ? `${weapon.name}'s projectile` : weapon.name} into ${targetActor.name}'s ${hitLocation.name}</p>
                            <p>Damage rolls: [[${firstRoll.total}]] and [[${secondRoll.total}]]</p>
                            <p><strong>Kept:</strong> ${kept} | Worn AP: ${wornArmor} | Natural AP: ${naturalArmor} | Applied after AP: ${damage}</p>
                            <button type="button" class="apply-impale-damage"
                                data-target-token="${targetToken.id}" data-target-name="${targetToken.name}"
                                data-hit-location-id="${hitLocation.id}" data-hit-location-name="${hitLocation.name}"
                                data-attacker-actor-id="${attackerActor.id}" data-weapon-id="${weapon.id}"
                                data-weapon-size="${weaponSize}" data-damage="${kept}"
                                data-armor="${wornArmor}" data-natural-armor="${naturalArmor}">Apply Impale Damage</button>`
                    });
                }
            },
            cancel: { label: "Cancel" }
        },
        default: "impale",
        render: html => {
            html.find("#impaleAction").on("change", event => {
                const isUnimpale = event.currentTarget.value === "unimpale";
                html.find("#impaleFields").toggle(!isUnimpale);
                html.find("#unimpaleFields").toggle(isUnimpale);
                html.closest(".dialog").find(".dialog-button:first").text(isUnimpale ? "Prepare Unimpale" : "Roll Impale");
            });
        }
    }, { width: 425, resizable: true }).render(true);
}
globalThis.magcmImpale = magcmImpale;

/**
 * Add Armour macro: GM-only convenience tool that equips a full matching armour set (or a
 * per-location custom mix) from the "world.armour" compendium onto every selected NPC token.
 */
async function magcmAddArmour(armourSetType, armourRightLeg, armourLeftLeg, armourAbdomen, armourChest, armourRightArm, armourLeftArm, armourHead) {
    async function addArmour(token, armourSetType, armourRightLeg, armourLeftLeg, armourAbdomen, armourChest, armourRightArm, armourLeftArm, armourHead) {
        let currentActor = token.actor;

        // Define the explicit ordering for hit locations
        const locationOrder = ["Head", "Chest", "Abdomen", "Right Arm", "Left Arm", "Right Leg", "Left Leg"];

        let allHitLocations = currentActor.items
            .filter(i => i.type === 'hitLocation')
            .sort((a, b) => locationOrder.indexOf(a.name) - locationOrder.indexOf(b.name));

        const customArmourSelections = {
            "Head": armourHead,
            "Chest": armourChest,
            "Abdomen": armourAbdomen,
            "Right Arm": armourRightArm,
            "Left Arm": armourLeftArm,
            "Right Leg": armourRightLeg,
            "Left Leg": armourLeftLeg
        };

        async function findMatchingArmourPiece(hitLocationName, armourTypeId) {
            const armourTypeNames = {
                1: "Cured armour",
                2: "Padded Armour",
                3: "Laminated Armour",
                4: "Scaled Armour",
                5: "Half plate armour",
                6: "Mail",
                7: "Plated Mail",
                8: "Articulated Plate"
            };

            const armourPartHitLocationMapping = {
                "Head": "[Head]",
                "Chest": "[Chest]",
                "Abdomen": "[Ab.]",
                "Right Arm": "[R.Arm]",
                "Left Arm": "[L.Arm]",
                "Right Leg": "[R.Leg]",
                "Left Leg": "[L.Leg]"
            };

            const typeName = armourTypeNames[armourTypeId];
            if (!typeName) return null;

            const pack = game.packs.get("world.armour");
            const armourItems = await pack.getDocuments();
            const matchingArmour = armourItems.find(item => item.name.toLowerCase() === `${typeName} ${armourPartHitLocationMapping[hitLocationName]}`.toLowerCase());
            return matchingArmour || null;
        }

        const armourCodes = {
            1: "G6U1Ps4pHD6FDmtO",
            2: "MqfTaMaOIObeyeSS",
            3: "Z6sJg7nt4kAAC7jo",
            4: "NlJJrcoJ3q23wIWD",
            5: "fp4DuXG3LoKXBRAz",
            6: "4nI649wUcGzdbXZj",
            7: "WqlcXKZwTdfdPiix",
            8: "1qzWLfg2oI5sXvas"
        }

        if (!!token.actor.hasPlayerOwner) {

            ui.notifications.warn(`Armour cannot be added using this macro for ${token.actor.name} as it is owned by a player.`);

        } else if (armourSetType != 0) {

            let pack = game.packs.get("world.armour");
            let armour = await pack.getDocument(armourCodes[armourSetType]);
            for (let hitLoc of allHitLocations) {
                let armourExistsForHitLocation = (currentActor.items.filter(i => i.type === 'armor' && i.system.location.length == 1 && i.system.location[0] == hitLoc.id).length > 0);
                if (!armourExistsForHitLocation) {
                    let addedArmour = (await currentActor.createEmbeddedDocuments('Item', [armour]))[0];
                    let latestArmour = currentActor.items.filter(i => i.id == addedArmour.id)[0];
                    await latestArmour.update({ 'system.location': [hitLoc.id], 'system.equipped': true });
                }
            }
            ui.notifications.info(`${armour.name} set equipped for ${token.actor.name}.`);

        } else {
            let pack = game.packs.get("world.armour");
            for (let hitLoc of allHitLocations) {
                const selectedTypeId = customArmourSelections[hitLoc.name];

                if (!selectedTypeId || selectedTypeId == 0) continue;

                const armour = await findMatchingArmourPiece(hitLoc.name, selectedTypeId);

                const armourExistsForHitLocation = (currentActor.items.filter(i => i.type === 'armor' && i.system.location.length == 1 && i.system.location[0] == hitLoc.id).length > 0);
                if (!armourExistsForHitLocation && armour != null) {
                    let addedArmour = (await currentActor.createEmbeddedDocuments('Item', [armour]))[0];
                    let latestArmour = currentActor.items.filter(i => i.id == addedArmour.id)[0];
                    await latestArmour.update({ 'system.location': [hitLoc.id], 'system.equipped': true });
                } else if (!armourExistsForHitLocation && armour == null) {
                    ui.notifications.warn(`No matching armour found for ${hitLoc.name} on ${token.actor.name}.`);
                }
            }
            ui.notifications.info(`Custom armour set equipped for ${token.actor.name}.`);
        }
    }

    for (let token of canvas.tokens.controlled) {
        await addArmour(token, armourSetType, armourRightLeg, armourLeftLeg, armourAbdomen, armourChest, armourRightArm, armourLeftArm, armourHead);
    }
}

/**
 * Opens the Add Armour dialog and, on confirmation, hands the selections off to magcmAddArmour().
 */
function magcmOpenAddArmourDialog() {
    const d = new Dialog({
        title: "Add Armour",
        content: `
            <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
                <em>
                    <p>Adds armour of chosen type(s) to selected tokens and equips them to hit locations. Custom Set only works on humans and humanoids with the same hit locations as humans. For this macro to work properly, ensure that an "Armour" compendium exists with individual armour pieces for each of the selectable armour types.</p>
                    <p>The armour pieces must be named according to their hit location and armour type using the following naming scheme: "Cured armour [Head]", "Cured Armour [Chest]", "Padded Armour [Ab.]", "Laminated Armour [R.Arm]", "Half plat armour [L.Leg]"</p>
                </em>
            </div>
            <table>
                <tr>
                    <th style="text-align:right; padding-right:10px">Armour Set Type</th>
                    <td><select name="drpArmourSetType" id="drpArmourSetType">
                    <option value="0" selected>Custom</option>
                    <option value="1">Cured</option>
                    <option value="2">Padded</option>
                    <option value="3">Laminated</option>
                    <option value="4">Scaled</option>
                    <option value="5">Half Plate</option>
                    <option value="6">Mail</option>
                    <option value="7">Plated Mail</option>
                    <option value="8">Articulated Plate</option>
                    </select>
                </tr>
                <tr>
                    <th colspan="2">Hit Locations</th>
                </tr>
                <tr>
                    <th style="text-align:right; padding-right:10px">Head</th>
                    <td><select name="drpArmourHead" id="drpArmourHead">
                    <option value="0">None</option>
                    <option value="1">Cured</option>
                    <option value="2" selected>Padded</option>
                    <option value="3">Laminated</option>
                    <option value="4">Scaled</option>
                    <option value="5">Half Plate</option>
                    <option value="6">Mail</option>
                    <option value="7">Plated Mail</option>
                    <option value="8">Articulated Plate</option>
                    </select>
                </tr>
                <tr>
                    <th style="text-align:right; padding-right:10px">Chest</th>
                    <td><select name="drpArmourChest" id="drpArmourChest">
                    <option value="0">None</option>
                    <option value="1">Cured</option>
                    <option value="2" selected>Padded</option>
                    <option value="3">Laminated</option>
                    <option value="4">Scaled</option>
                    <option value="5">Half Plate</option>
                    <option value="6">Mail</option>
                    <option value="7">Plated Mail</option>
                    <option value="8">Articulated Plate</option>
                    </select>
                </tr>
                <tr>
                    <th style="text-align:right; padding-right:10px">Abdomen</th>
                    <td><select name="drpArmourAbdomen" id="drpArmourAbdomen">
                    <option value="0">None</option>
                    <option value="1">Cured</option>
                    <option value="2" selected>Padded</option>
                    <option value="3">Laminated</option>
                    <option value="4">Scaled</option>
                    <option value="5">Half Plate</option>
                    <option value="6">Mail</option>
                    <option value="7">Plated Mail</option>
                    <option value="8">Articulated Plate</option>
                    </select>
                </tr>
                <tr>
                    <th style="text-align:right; padding-right:10px">Right Arm</th>
                    <td><select name="drpArmourRightArm" id="drpArmourRightArm">
                    <option value="0">None</option>
                    <option value="1">Cured</option>
                    <option value="2" selected>Padded</option>
                    <option value="3">Laminated</option>
                    <option value="4">Scaled</option>
                    <option value="5">Half Plate</option>
                    <option value="6">Mail</option>
                    <option value="7">Plated Mail</option>
                    <option value="8">Articulated Plate</option>
                    </select>
                </tr>
                <tr>
                    <th style="text-align:right; padding-right:10px">Left Arm</th>
                    <td><select name="drpArmourLeftArm" id="drpArmourLeftArm">
                    <option value="0">None</option>
                    <option value="1">Cured</option>
                    <option value="2" selected>Padded</option>
                    <option value="3">Laminated</option>
                    <option value="4">Scaled</option>
                    <option value="5">Half Plate</option>
                    <option value="6">Mail</option>
                    <option value="7">Plated Mail</option>
                    <option value="8">Articulated Plate</option>
                    </select>
                </tr>
                <tr>
                    <th style="text-align:right; padding-right:10px">Right Leg</th>
                    <td><select name="drpArmourRightLeg" id="drpArmourRightLeg">
                    <option value="0">None</option>
                    <option value="1">Cured</option>
                    <option value="2" selected>Padded</option>
                    <option value="3">Laminated</option>
                    <option value="4">Scaled</option>
                    <option value="5">Half Plate</option>
                    <option value="6">Mail</option>
                    <option value="7">Plated Mail</option>
                    <option value="8">Articulated Plate</option>
                    </select>
                </tr>
                <tr>
                    <th style="text-align:right; padding-right:10px">Left Leg</th>
                    <td><select name="drpArmourLeftLeg" id="drpArmourLeftLeg">
                    <option value="0">None</option>
                    <option value="1">Cured</option>
                    <option value="2" selected>Padded</option>
                    <option value="3">Laminated</option>
                    <option value="4">Scaled</option>
                    <option value="5">Half Plate</option>
                    <option value="6">Mail</option>
                    <option value="7">Plated Mail</option>
                    <option value="8">Articulated Plate</option>
                    </select>
                </tr>
            </table>`,
        buttons: {
            one: {
                label: "Add and Equip",
                callback: html => {
                    magcmAddArmour(html.find(`[id="drpArmourSetType"]`).val(), html.find(`[id="drpArmourRightLeg"]`).val(), html.find(`[id="drpArmourLeftLeg"]`).val(), html.find(`[id="drpArmourAbdomen"]`).val(), html.find(`[id="drpArmourChest"]`).val(), html.find(`[id="drpArmourRightArm"]`).val(), html.find(`[id="drpArmourLeftArm"]`).val(), html.find(`[id="drpArmourHead"]`).val())
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
}
globalThis.magcmOpenAddArmourDialog = magcmOpenAddArmourDialog;

/**
 * Clean Up Combat Flags macro: lets the GM bulk-clear this module's homebrew flags (engagements,
 * movement states, wards, cover, held/pinned/impaled weapons, entangled and stunned locations, and
 * Disable Attack effects (Press Advantage/Pin Down/Overextend Opponent)) from either the selected
 * tokens or every actor in the world.
 */
async function magcmCleanUpCombatFlags() {
    const MOVEMENT_STATES = [
        "Movement - Walk",
        "Movement - Run",
        "Movement - Sprint",
        "Movement - Climb",
        "Movement - Swim"
    ];

    // Read game settings safely
    let enableReach = false;
    try {
        enableReach = game.settings.get(MAGCM_MODULE_ID, "enableReachMechanics");
    } catch (e) {
        enableReach = false;
    }

    let enableMovement = false;
    try {
        enableMovement = game.settings.get(MAGCM_MODULE_ID, "enableMovementStateControlInCombat");
    } catch (e) {
        enableMovement = false;
    }

    // Build dialog UI dynamically based on active settings
    let dialogContent = `<form style="margin-bottom: 10px;">`;

    if (enableReach) {
        dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-engagements" style="font-weight: bold;">Clear Melee Engagements</label>
            <input type="checkbox" id="clear-engagements" checked />
        </div>`;
    }

    if (enableMovement) {
        dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-movement" style="font-weight: bold;">Clear Movement States</label>
            <input type="checkbox" id="clear-movement" checked />
        </div>`;
    }

    dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-wards" style="font-weight: bold;">Clear Warded Locations</label>
            <input type="checkbox" id="clear-wards" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-cover" style="font-weight: bold;">Clear Cover Status</label>
            <input type="checkbox" id="clear-cover" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-weapons" style="font-weight: bold;">Clear Equipped / Held Weapons</label>
            <input type="checkbox" id="clear-weapons" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-pinned" style="font-weight: bold;">Clear Pinned Weapons</label>
            <input type="checkbox" id="clear-pinned" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-impaled" style="font-weight: bold;">Clear Impaled Weapons and Locations</label>
            <input type="checkbox" id="clear-impaled" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-entangled" style="font-weight: bold;">Clear Entangled Locations</label>
            <input type="checkbox" id="clear-entangled" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-stunned" style="font-weight: bold;">Clear Stunned Locations</label>
            <input type="checkbox" id="clear-stunned" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-disable-attack" style="font-weight: bold;">Clear Disabled Attack Statuses</label>
            <input type="checkbox" id="clear-disable-attack" checked />
        </div>
    </form>`;

    new Dialog({
        title: "Clean Up Actor Data & Flags",
        content: dialogContent,
        buttons: {
            cleanup: {
                icon: '<i class="fas fa-broom"></i>',
                label: "Clean Up",
                callback: async (html) => {
                    const doEngagements = enableReach && html.find("#clear-engagements").is(":checked");
                    const doMovement = enableMovement && html.find("#clear-movement").is(":checked");
                    const doWards = html.find("#clear-wards").is(":checked");
                    const doCover = html.find("#clear-cover").is(":checked");
                    const doWeapons = html.find("#clear-weapons").is(":checked");
                    const doPinned = html.find("#clear-pinned").is(":checked");
                    const doImpaled = html.find("#clear-impaled").is(":checked");
                    const doEntangled = html.find("#clear-entangled").is(":checked");
                    const doStunned = html.find("#clear-stunned").is(":checked");
                    const doDisableAttack = html.find("#clear-disable-attack").is(":checked");

                    if (!doEngagements && !doMovement && !doWards && !doCover && !doWeapons && !doPinned && !doImpaled && !doEntangled && !doStunned && !doDisableAttack) {
                        return ui.notifications.info("No cleanup options were selected.");
                    }

                    let processedActors = 0;
                    let clearedItemsCount = 0;
                    let clearedEffectsCount = 0;
                    const selectedActors = (canvas.tokens.controlled || [])
                        .map(token => token.actor)
                        .filter(Boolean);
                    const actorsToClean = selectedActors.length > 0
                        ? [...new Map(selectedActors.map(actor => [actor.uuid, actor])).values()]
                        : [...game.actors];

                    for (const actor of actorsToClean) {
                        let actorUpdated = false;

                        // 1. Clear Active Effect movement states
                        if (doMovement) {
                            const effectsToRemove = actor.effects
                                .filter(e => MOVEMENT_STATES.includes(e.name))
                                .map(e => e.id);

                            if (effectsToRemove.length > 0) {
                                await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
                                clearedEffectsCount += effectsToRemove.length;
                                actorUpdated = true;
                            }
                        }

                        // 2. Clear Engagements flag on Actor
                        if (doEngagements && actor.getFlag(MAGCM_MODULE_ID, "engagements") !== undefined) {
                            await actor.unsetFlag(MAGCM_MODULE_ID, "engagements");
                            actorUpdated = true;
                        }

                        // 2b. Clear Disable Attack flag on Actor (Press Advantage/Pin Down/Overextend Opponent)
                        if (doDisableAttack && actor.getFlag(MAGCM_MODULE_ID, "attackDisabledBy") !== undefined) {
                            await actor.unsetFlag(MAGCM_MODULE_ID, "attackDisabledBy");
                            actorUpdated = true;
                        }

                        // 3. Prepare batch updates for items
                        const itemUpdates = [];

                        for (const item of actor.items) {
                            const updateObj = { _id: item.id };
                            let itemNeedsUpdate = false;

                            // Hit Location flags (Wards & Cover)
                            if (item.type === "hitLocation") {
                                if (doWards && item.getFlag(MAGCM_MODULE_ID, "blockingWeapon") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=blockingWeapon`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doCover && item.getFlag(MAGCM_MODULE_ID, "inCover") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=inCover`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doImpaled && item.getFlag(MAGCM_MODULE_ID, "impaledBy") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=impaledBy`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doEntangled && item.getFlag(MAGCM_MODULE_ID, "entangledBy") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=entangledBy`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doStunned && item.getFlag(MAGCM_MODULE_ID, "stunnedBy") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=stunnedBy`] = null;
                                    itemNeedsUpdate = true;
                                }
                            }

                            // Equipped / Held Weapons - each checkbox below is independent of "Clear Equipped / Held
                            // Weapons" so, e.g., Clear Pinned Weapons works even if holding locations aren't cleared.
                            if (item.type === "melee-weapon" || item.type === "ranged-weapon") {
                                if (doWeapons && item.getFlag(MAGCM_MODULE_ID, "holdingLocations") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=holdingLocations`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doWeapons && item.getFlag(MAGCM_MODULE_ID, "loadProgress") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=loadProgress`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doPinned && item.getFlag(MAGCM_MODULE_ID, "pinned") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=pinned`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doImpaled && item.getFlag(MAGCM_MODULE_ID, "impaled") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=impaled`] = null;
                                    itemNeedsUpdate = true;
                                }
                            }

                            if (itemNeedsUpdate) {
                                itemUpdates.push(updateObj);
                            }
                        }

                        // Apply embedded item changes in a single batch per actor
                        if (itemUpdates.length > 0) {
                            await actor.updateEmbeddedDocuments("Item", itemUpdates);
                            clearedItemsCount += itemUpdates.length;
                            actorUpdated = true;
                        }

                        if (actorUpdated) processedActors++;
                    }

                    ui.notifications.info(`Cleanup complete! Processed ${processedActors} actor(s) (${clearedEffectsCount} active effects removed, ${clearedItemsCount} item flags cleared).`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "cleanup"
    }).render(true);
}
globalThis.magcmCleanUpCombatFlags = magcmCleanUpCombatFlags;

/**
 * Combat Actions macro: opens a reference/quick-post dialog of every Mythras proactive/reactive/free
 * combat action, letting the user filter by tag and post the selected action's description to chat
 * (optionally spending an Action Point).
 */
function magcmOpenCombatActionsDialog() {
    const actionData = {
        proactive: [
            { name: "Attack", type: "proactive", tags: ["melee", "ranged"], desc: `The character can attempt to strike an opponent using a hand-to-hand or ranged weapon. As movement takes place after performing an action, attackers will have to be strategic when closing with an opponent. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk if moving into engagement range or making a ranged attack. The exception is the rules for Charging (page 104 of MYTHRAS).` },
            { name: "Charge", type: "proactive", tags: ["melee"], desc: `The character can attempt to strike an opponent using a hand-to-hand or ranged weapon. As movement takes place after performing an action, attackers will have to be strategic when closing with an opponent. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character must be running or sprinting.` },
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
        <label><input type="checkbox" class="spend-ap" value="spend-ap">Spend AP</label>
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
                const activeFilters = checkboxes.filter(':checked').map(function () {
                    return this.value;
                }).get();

                pills.each(function () {
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
            html.find('.action-pill summary').on('click', function () {
                html.find('.action-pill').removeClass('selected-pill');
                $(this).parent('.action-pill').addClass('selected-pill');
            });
        }
    }, { width: 550, height: 775, resizable: true }).render(true);
}
globalThis.magcmOpenCombatActionsDialog = magcmOpenCombatActionsDialog;

/**
 * Randomize Build macro: GM-only tool that rolls new characteristics and skill training values for
 * every selected NPC token, scaled by the chosen power level per skill category.
 */
async function magcmRandomizeBuild(skillLevel, physicalSkillLevel, utilitySkillLevel, deceptionSkillLevel, socialSkillLevel, combatSkillLevel) {
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
            await rollStr.evaluate();
            rollCon = new Roll(rollCon);    // CON
            await rollCon.evaluate();
            rollSiz = new Roll(rollSiz);    // SIZ
            await rollSiz.evaluate();
            rollDex = new Roll(rollDex);    // DEX
            await rollDex.evaluate();
            rollInt = new Roll(rollInt);    // INT
            await rollInt.evaluate();
            rollPow = new Roll(rollPow);    // POW
            await rollPow.evaluate();
            rollCha = new Roll(rollCha);    // CHA
            await rollCha.evaluate();

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
                    await physicalSkillsRoll.evaluate();
                    skill.update({
                        'system.trainingVal': Number(physicalSkillsRoll.total)
                    });
                }
                if (utilitySkills.includes(skill.name.toLowerCase())) {
                    let utilitySkillsRoll = new Roll(rollUtilitySkills);    // Utility Skills
                    await utilitySkillsRoll.evaluate();
                    skill.update({
                        'system.trainingVal': Number(utilitySkillsRoll.total)
                    });
                }
                if (deceptionSkills.includes(skill.name.toLowerCase())) {
                    let deceptionSkillsRoll = new Roll(rollDeceptionSkills);// Deception Skills
                    await deceptionSkillsRoll.evaluate();
                    skill.update({
                        'system.trainingVal': Number(deceptionSkillsRoll.total)
                    });
                }
                if (socialSkills.includes(skill.name.toLowerCase())) {
                    let socialSkillsRoll = new Roll(rollSocialSkills);      // Social Skills
                    await socialSkillsRoll.evaluate();
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
                    await combatSkillsRoll.evaluate();
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

    for (let tok of canvas.tokens.controlled) {
        await randomizeBuild(tok, skillLevel, physicalSkillLevel, utilitySkillLevel, deceptionSkillLevel, socialSkillLevel, combatSkillLevel);
    }
}

/**
 * Opens the Randomize Build dialog and, on confirmation, hands the selections off to magcmRandomizeBuild().
 */
function magcmOpenRandomizeBuildDialog() {
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
                    magcmRandomizeBuild(html.find(`[id="drpBuildSkillLevel"]`).val(), html.find(`[id="drpBuildPhysicalSkillLevel"]`).val(), html.find(`[id="drpBuildUtilitySkillLevel"]`).val(), html.find(`[id="drpBuildDeceptionSkillLevel"]`).val(), html.find(`[id="drpBuildSocialSkillLevel"]`).val(), html.find(`[id="drpBuildCombatSkillLevel"]`).val())
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
}
globalThis.magcmOpenRandomizeBuildDialog = magcmOpenRandomizeBuildDialog;

/**
 * Contested Roll (1v1) macro (deprecated by Mythras' built-in opposed rolls, kept for legacy use):
 * rolls an opposed skill check between the selected token's actor and the currently targeted actor.
 */
function magcmOpenContestedRoll1v1Dialog() {
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
        title: "Contested Roll (Deprecated)",
        content: `<script>
                </script>
                <form>
                    <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
                        <div>
                            <i>
                                <p><strong>This macro is now deprecated as its functionality is now integrated into the default Mythras rolls.</strong></p>
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
                            firstCharacterDiffMult = 2 / 3;
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
                            secondCharacterDiffMult = 2 / 3;
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
                        let skillValueToSubtract = (firstCharacterSkillRollValue > secondCharacterSkillRollValue) ? (firstCharacterSkillRollValue - 100) : (secondCharacterSkillRollValue - 100);
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

                    if (firstCharacterDiceRoll.result <= firstCharacterSkillRollValue * 0.1) {
                        firstCharacterResult = result.CRITICAL;
                        firstCharacterResultLabel = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                    } else if (firstCharacterDiceRoll.result == 99 || firstCharacterDiceRoll.result == 100) {
                        firstCharacterResult = result.FUMBLE;
                        firstCharacterResultLabel = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                    } else if ((firstCharacterDiceRoll.result <= firstCharacterSkillRollValue && firstCharacterDiceRoll.result < 96) || (firstCharacterDiceRoll.result <= 5 && firstCharacterDiceRoll.result > firstCharacterSkillRollValue)) {
                        firstCharacterResult = result.SUCCESS;
                        firstCharacterResultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                    } else if (firstCharacterDiceRoll.result > firstCharacterSkillRollValue && firstCharacterDiceRoll.result > 5 || firstCharacterDiceRoll.result >= 96 && firstCharacterDiceRoll.result <= firstCharacterSkillRollValue) {
                        firstCharacterResult = result.FAILURE;
                        firstCharacterResultLabel = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                    }

                    if (secondCharacterDiceRoll.result <= secondCharacterSkillRollValue * 0.1) {
                        secondCharacterResult = result.CRITICAL;
                        secondCharacterResultLabel = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                    } else if (secondCharacterDiceRoll.result == 99 || secondCharacterDiceRoll.result == 100) {
                        secondCharacterResult = result.FUMBLE;
                        secondCharacterResultLabel = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                    } else if ((secondCharacterDiceRoll.result <= secondCharacterSkillRollValue && secondCharacterDiceRoll.result < 96) || (secondCharacterDiceRoll.result <= 5 && secondCharacterDiceRoll.result > secondCharacterSkillRollValue)) {
                        secondCharacterResult = result.SUCCESS;
                        secondCharacterResultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                    } else if (secondCharacterDiceRoll.result > secondCharacterSkillRollValue && secondCharacterDiceRoll.result > 5 || secondCharacterDiceRoll.result >= 96 && secondCharacterDiceRoll.result <= secondCharacterSkillRollValue) {
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

                    let contentString = `
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
                        speaker: ChatMessage.getSpeaker({ token: canvas.tokens.controlled[0] }),
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
    }, { width: 600, resizable: true });

    d.render(true);
}
globalThis.magcmOpenContestedRoll1v1Dialog = magcmOpenContestedRoll1v1Dialog;

/**
 * Tavern Menu Generator macro: opens a configuration dialog for culinary region, tier, settlement
 * scarcity, and economy multiplier, then posts a randomly-generated (GM-blind) food & drink menu.
 */
function magcmOpenFoodMenuGeneratorDialog() {
    // --- MASTER MENU DATABASE ---
    const MENU_DATA = {
        food: [
            // === FERRENTINE (Gulf Coast / Capital Farmlands) ===
            { name: "Salt-Cod Porridge with Leeks", regions: ["Ferrentine"], tier: "Cheap", baseCost: 1.0, description: "Oily little sprats and cod scraps from the Gulf of Swansey boiled into a thick oat mash." },
            { name: "Cabbage & Turnip Pottage", regions: ["Ferrentine"], tier: "Cheap", baseCost: 0.8, description: "The standard urban laborer's fuel, thick with over-boiled root vegetables." },
            { name: "Boiled Gulf Mussels", regions: ["Ferrentine"], tier: "Cheap", baseCost: 1.2, description: "Salty local shellfish simmered in watered down small beer with wild garlic scraps." },
            { name: "Peasenhall Gruel with Lard", regions: ["Ferrentine"], tier: "Cheap", baseCost: 0.9, description: "Yellow field peas boiled to a paste and enriched with a single dollop of salted rendering pork fat." },
            { name: "Pickled Sprat Skewers", regions: ["Ferrentine"], tier: "Cheap", baseCost: 1.1, description: "Briney, sharp little estuary fish preserved in sour vinegar, served on a sharpened twig." },

            { name: "Smoked Herring with White Rye", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 3.0, description: "Oak-smoked coastal catch served with a generous slab of salted butter and fresh bread." },
            { name: "Ferrignus Mutton Hand-Pie", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 2.8, description: "Diced hill mutton seasoned with rosemary, baked inside a sturdy, portable lard crust." },
            { name: "Braised Pork Shoulder", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 3.4, description: "Slow-cooked in dark capital ale, served alongside sweet roasted parsnips." },
            { name: "Baked Whiting with Mustard", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 3.1, description: "Freshly caught coastal whiting baked whole and slathered in a coarse, stone-ground seed mustard." },
            { name: "Guildman's Beef & Onion Stew", regions: ["Ferrentine"], tier: "Reasonable", baseCost: 3.2, description: "A thick, comforting tavern bowl brimming with cubed beef flank, sweet onions, and pot herbs." },

            { name: "Oakland Boar Tenderloin", regions: ["Ferrentine"], tier: "Superior", baseCost: 8.0, description: "Prime wild boar from the neighboring woods, roasted with a rich wine reduction." },
            { name: "Spiced Swan Pastry", regions: ["Ferrentine"], tier: "Superior", baseCost: 9.5, description: "A high-noble capital showpiece featuring delicate swan breast flavored with rare, costly nutmeg." },
            { name: "Poached Sturgeon in Fine Wine", regions: ["Ferrentine"], tier: "Superior", baseCost: 8.5, description: "Prized gulf sturgeon simmered slowly in a refined, acidic vintage with bay leaves." },
            { name: "Venison Pasty with Gilded Crust", regions: ["Ferrentine"], tier: "Superior", baseCost: 9.0, description: "Choice deer loin baked with rich calf marrow, enclosed in a fine wheat pastry lightly egg-washed." },
            { name: "Roast Heron with Galingale", regions: ["Ferrentine"], tier: "Superior", baseCost: 8.8, description: "A highly prized marsh bird stuffed with sage and basted with an exotic, aromatic ginger-like glaze." },

            // === VINMARCH (Northern Gulf Vineyards) ===
            { name: "Vinegar-Braised Sprats", regions: ["Vinmarch"], tier: "Cheap", baseCost: 0.9, description: "Small coastal catches preserved in sharp wine-vinegar and cracked barley." },
            { name: "Grape-Leaf Grain Wraps", regions: ["Vinmarch"], tier: "Cheap", baseCost: 1.1, description: "Farmed grape leaves stuffed with spiced barley mash and wild field onion scraps." },
            { name: "Sour-Wine Onion Broth", regions: ["Vinmarch"], tier: "Cheap", baseCost: 0.8, description: "A thin winter soup made from scorched orchard onions simmered in re-pressed grape pressings." },
            { name: "Salted Curd Mash", regions: ["Vinmarch"], tier: "Cheap", baseCost: 1.0, description: "Leftover goat milk whey curds beaten smooth with wild chives and coarse salt grains." },
            { name: "Cracked Spelt Loaf with Lees", regions: ["Vinmarch"], tier: "Cheap", baseCost: 0.7, description: "Heavy dark bread risen using thick wine yeast, offering a distinctively sour, dense crumb." },

            { name: "Honey-Glazed Capon", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 3.2, description: "Plump fattened rooster roasted over open grape-wood fires, dripping with honey." },
            { name: "Vineyard Snail Ragout", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 2.7, description: "Plump snails harvested from the vines, simmered in garlic, butter, and white wine." },
            { name: "Plum-Stuffed Pork Loin", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 3.5, description: "Lean coastal pig roasted with sweet plums from the nearby orchard estates." },
            { name: "Braised Rabbit in Verjuice", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 3.0, description: "Wild hillside rabbit slow-simmered in the sour, unfermented juice of green vineyard grapes." },
            { name: "Savory Fennel Tart", regions: ["Vinmarch"], tier: "Reasonable", baseCost: 2.8, description: "A light open pastry filled with sweet caramelized wild fennel bulbs and goat cheese." },

            { name: "Wine-Reduced Capon Stew", regions: ["Vinmarch"], tier: "Superior", baseCost: 8.0, description: "An aristocratic favorite, slow-simmered for hours in an entire bottle of reserve red." },
            { name: "Almond-Crusted Quail", regions: ["Vinmarch"], tier: "Superior", baseCost: 8.8, description: "Delicate songbirds stuffed with dried currents and roasted over fruitwood coals." },
            { name: "Roasted Pheasant with Fig Glaze", regions: ["Vinmarch"], tier: "Superior", baseCost: 8.4, description: "Plump forest game bird basted in a rich, sticky reduction of imported figs and sweet white wine." },
            { name: "Saffron Estate Blancmange", regions: ["Vinmarch"], tier: "Superior", baseCost: 8.2, description: "A shredded capon breast dish beaten with almond milk, sugar, and heavy strands of real saffron." },
            { name: "Venison Loin with Cherry Mortress", regions: ["Vinmarch"], tier: "Superior", baseCost: 9.0, description: "Thick cuts of prime venison served with a dense, thick puree of dark cherries and red wine." },

            // === GIANT'S TRACK (Central Plains / Iron Highway) ===
            { name: "Spelt & Barley Porridge", regions: ["Giant's Track"], tier: "Cheap", baseCost: 0.7, description: "Thick grain mush served hot, sustained solely by a pinch of coarse highway salt." },
            { name: "Tallow & Field Onion Broth", regions: ["Giant's Track"], tier: "Cheap", baseCost: 1.0, description: "Boiling water enriched with leftover beef fat and chopped plains onions." },
            { name: "Dry-Salted Beef Scraps", regions: ["Giant's Track"], tier: "Cheap", baseCost: 1.1, description: "Tough ribbons of cured cattle meat, heavily salted for caravan travel and reboiled to soften." },
            { name: "Roasted Turnip Wedges", regions: ["Giant's Track"], tier: "Cheap", baseCost: 0.8, description: "Coarse root vegetables pulled from highway ditches, charred over open cattle-dung fire pits." },
            { name: "Hard Traveler's Biscuit", regions: ["Giant's Track"], tier: "Cheap", baseCost: 0.6, description: "A thrice-baked, bone-dry grain biscuit made to endure months on the open trade trails." },

            { name: "Iron Highway Beef Hand-Pie", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 3.0, description: "The quintessential traveler's meal. Minced beef wrapped in a heavy, protective spelt crust." },
            { name: "Slow-Roasted Beef Brisket", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 3.3, description: "Tough cattle cut made tender by a twelve-hour smoke over pit coals along the highway." },
            { name: "Barley & Mutton Stew", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 2.9, description: "A dense, stick-to-your-ribs meal teeming with unhulled grain and fat mutton chunks." },
            { name: "Spiced Ox-Tail Pottage", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 3.1, description: "A rich, gelatinous stew made from long-simmered ox tails, heavy with cracked black pepper." },
            { name: "Grid-Iron Pork Cutlets", regions: ["Giant's Track"], tier: "Reasonable", baseCost: 3.2, description: "Thick steaks beaten flat, seared over blazing hardwood charcoal with dried plains sage." },

            { name: "Slow-Roasted Prime Ox-Slab", regions: ["Giant's Track"], tier: "Superior", baseCost: 8.0, description: "The absolute choice cut of grain-fed draft beasts, dripping with rich tallow gravy." },
            { name: "Plains Venison & Marrow Pie", regions: ["Giant's Track"], tier: "Superior", baseCost: 8.5, description: "A massive pie layered with choice deer loin, wild leeks, and a rich bone-marrow crust lid." },
            { name: "Cinnamon-Crusted Roast Veal", regions: ["Giant's Track"], tier: "Superior", baseCost: 8.7, description: "Tender milk-fed calf loin rubbed with costly cinnamon, cloves, and ginger, roasted rare." },
            { name: "Whole Spit-Roasted Suckling Pig", regions: ["Giant's Track"], tier: "Superior", baseCost: 9.2, description: "A tavern centerpiece featuring crackling, blistered skin, basted in spiced wine and honey." },
            { name: "Jugged Hare in Rich Blood Sauce", regions: ["Giant's Track"], tier: "Superior", baseCost: 8.4, description: "Wild plains hare stewed inside an earthen jug with red wine, dynamic spices, and its own rich sauce." },

            // === THE STONELANDS (West Coast Scrublands / Greymeddon) ===
            { name: "Dense Stonebread & Water", regions: ["Stonelands"], tier: "Cheap", baseCost: 0.8, description: "An incredibly dense, tooth-breaking barley bread that requires soaking in broth or water." },
            { name: "Foraged Wood-Ear Mash", regions: ["Stonelands"], tier: "Cheap", baseCost: 0.7, description: "A bitter, dark pottage made entirely from scrubland tree-fungus and wild weed roots." },
            { name: "Westford River Minnows", regions: ["Stonelands"], tier: "Cheap", baseCost: 1.1, description: "A handful of tiny, bony freshwater fish from the Westford River fried whole in lard." },
            { name: "Boiled Scrub Thistle Roots", regions: ["Stonelands"], tier: "Cheap", baseCost: 0.6, description: "Tough, stringy wild roots dug out of the rocky clay, boiled with salt to a stringy paste." },
            { name: "Dried Mutton Tallow Scrapings", regions: ["Stonelands"], tier: "Cheap", baseCost: 0.9, description: "The hardened fat rendering scraped from mutton curing hooks, boiled into hot water." },

            { name: "Tough Scrub-Mutton Scraps", regions: ["Stonelands"], tier: "Reasonable", baseCost: 2.8, description: "Bony joints of stringy, wild rangeland sheep boiled endlessly to make it chewable." },
            { name: "Salted Westford Perch", regions: ["Stonelands"], tier: "Reasonable", baseCost: 3.0, description: "Bony river fish preserved heavily in coarse salt, rehydrated over a smoky brush fire." },
            { name: "Smoked Heather-Hen", regions: ["Stonelands"], tier: "Reasonable", baseCost: 2.9, description: "A small, lean wild scrub bird dry-smoked over aromatic mountain heather shrubs." },
            { name: "Clay-Baked Moor-Fowl", regions: ["Stonelands"], tier: "Reasonable", baseCost: 3.1, description: "Wild game birds encased in wet river clay and roasted directly in the hearth coals." },
            { name: "Rangeland Onion and Cheese Pie", regions: ["Stonelands"], tier: "Reasonable", baseCost: 2.7, description: "A dense pie containing strong, sharp curd cheese and bitter foraged scrub onions." },

            { name: "Roasted Mountain Hare", regions: ["Stonelands"], tier: "Superior", baseCost: 7.5, description: "A lean, athletic rangeland rabbit roasted whole over scrub-brush with wild mountain sage." },
            { name: "Salt-Cured Ram Flank", regions: ["Stonelands"], tier: "Superior", baseCost: 8.0, description: "The best winter reserve cut from a hardy rangeland ram, heavily seasoned with mountain herbs." },
            { name: "Braised Red Deer with Juniper", regions: ["Stonelands"], tier: "Superior", baseCost: 8.6, description: "Rich crag-dwelling stag venison simmered slow with wild dark juniper berries and small beer." },
            { name: "Spiced Badger Galantine", regions: ["Stonelands"], tier: "Superior", baseCost: 8.2, description: "Fat mountain badger meat boned, pressed, and heavily spiced with black pepper and mountain mint." },
            { name: "Roasted Ram Testicles", regions: ["Stonelands"], tier: "Superior", baseCost: 7.8, description: "A local rugged delicacy, sliced thin, pan-fried with wild leeks, and deglazed with sour cider." },

            // === THUNDERMARK (West Coast Woods & Farmland) ===
            { name: "Millet Mash & Salted Lard", regions: ["Thundermark"], tier: "Cheap", baseCost: 0.9, description: "Coarse ground millet boiled dry and topped with a single smear of preserved pork fat." },
            { name: "Boiled Sea-Kale & Oats", regions: ["Thundermark"], tier: "Cheap", baseCost: 0.8, description: "Salty, bitter greens gathered from the craggy coastal cliffs boiled into an unseasoned oat mash." },
            { name: "Smoked Dogfish Scraps", regions: ["Thundermark"], tier: "Cheap", baseCost: 1.0, description: "Tough, oily ribbons of cheap coastal shark meat dried over a wood-scrap smolder." },
            { name: "Rye Broth with Wild Mustard", regions: ["Thundermark"], tier: "Cheap", baseCost: 0.7, description: "Thin water pottage flavored with ground rye meal and stinging yellow hedgerow seeds." },
            { name: "Salted Herring Tails", regions: ["Thundermark"], tier: "Cheap", baseCost: 1.1, description: "The leftover brined trimmings from the fishing docks, re-boiled with cracked barley grains." },

            { name: "Pan-Seared Coast Mackerel", regions: ["Thundermark"], tier: "Reasonable", baseCost: 3.1, description: "Fresh saltwater catch from the rough Norngale Sea, quick-fried with field herbs." },
            { name: "Thundermark Beef Pillage-Stew", regions: ["Thundermark"], tier: "Reasonable", baseCost: 3.4, description: "A rustic, robust stew of coastal cattle cuts, thick turnips, and old small beer." },
            { name: "Woodland Hen with Leeks", regions: ["Thundermark"], tier: "Reasonable", baseCost: 3.0, description: "A barnyard fowl simmered gently in a clay pot with sweet, fat forest-grown leeks." },
            { name: "Baked Skate Wing in Butter", regions: ["Thundermark"], tier: "Reasonable", baseCost: 3.2, description: "Broad coastal flatfish pan-fried over wood coals, dripping with melted salted butter." },
            { name: "Salt-Pork and Pea Pudding", regions: ["Thundermark"], tier: "Reasonable", baseCost: 2.9, description: "Diced salt-cured belly pork embedded within a dense, heavily steamed yellow pea mash." },

            { name: "Thundermark Venison Steak", regions: ["Thundermark"], tier: "Superior", baseCost: 8.2, description: "Thick, tender cut of prime buck loin, seared with crushed juniper and served with wild leeks." },
            { name: "Roasted Norngale Salmon", regions: ["Thundermark"], tier: "Superior", baseCost: 8.5, description: "A massive sea-run salmon roasted over green birch wood, brushed with wild berry syrup." },
            { name: "Spiced Goose with Crabapples", regions: ["Thundermark"], tier: "Superior", baseCost: 8.8, description: "A rich, fat coastal goose roasted crisp and tartly balanced with wild orchard crabapples." },
            { name: "Baked Turbot in Almond Milk", regions: ["Thundermark"], tier: "Superior", baseCost: 8.6, description: "Prized, firm-fleshed whitefish poached elegantly in a thick sauce of crushed almonds and white wine." },
            { name: "Boar Head with Mustard Glaze", regions: ["Thundermark"], tier: "Superior", baseCost: 9.5, description: "A grand feast piece; a half-head of wild boar roasted until dark and crusted with sweet honey-mustard." },

            // === THE GREYWOLD (Forest Hills & Wild Game) ===
            { name: "Roasted Acorn Broth", regions: ["Greywold"], tier: "Cheap", baseCost: 0.8, description: "Earthy, dark broth made from dried mushrooms and ground, leached acorns." },
            { name: "Wild Wood-Leek Gruel", regions: ["Greywold"], tier: "Cheap", baseCost: 0.7, description: "Oat grains boiled thin, sharp with the green tops of foraged forest floor leeks." },
            { name: "Dried Crow Pottage", regions: ["Greywold"], tier: "Cheap", baseCost: 0.9, description: "Stringy, dark wild bird meat simmered with forest weeds and a handful of cracked spelt." },
            { name: "Charred Beech-Nuts & Barley", regions: ["Greywold"], tier: "Cheap", baseCost: 0.8, description: "Earthy barley mash tossed with dynamic handfuls of roasted forest floor beech-nuts." },
            { name: "Boiled Puffball Mushrooms", regions: ["Greywold"], tier: "Cheap", baseCost: 1.0, description: "Thick slices of spongy wild puffballs boiled down in plain water with a pinch of salt." },

            { name: "Stewed Wood-Rabbit", regions: ["Greywold"], tier: "Reasonable", baseCost: 2.9, description: "Foraged forest rabbit simmered slowly with wild garlic, wild onions, and root vegetables." },
            { name: "Smoked Squirrel Skewers", regions: ["Greywold"], tier: "Reasonable", baseCost: 2.6, description: "Lean, active forest game skewers glazed with a dark molasses and wild herb rub." },
            { name: "Forest Pigeon Pie", regions: ["Greywold"], tier: "Reasonable", baseCost: 3.0, description: "Dark, rich wild pigeon breasts baked inside a shortcrust with wild mushrooms." },
            { name: "Venison Meatballs with Sage", regions: ["Greywold"], tier: "Reasonable", baseCost: 3.2, description: "Minced deer trimmings rolled with breadcrumbs and dried forest sage, fried in deep lard." },
            { name: "Pan-Fried Brook Trout", regions: ["Greywold"], tier: "Reasonable", baseCost: 3.1, description: "Dappled fresh freshwater trout pulled from forest streams, quick-cooked with wild thyme." },

            { name: "Roast Pheasant with Chanterelles", regions: ["Greywold"], tier: "Superior", baseCost: 8.0, description: "Plump wild game bird roasted with a rich stuffing of foraged golden chanterelle mushrooms." },
            { name: "Greywold Stag Loin Roast", regions: ["Greywold"], tier: "Superior", baseCost: 8.9, description: "The definitive forest prize; an exquisite cut of deep red venison roasted rare with a wood-berry jus." },
            { name: "Spiced Woodcock on Toast", regions: ["Greywold"], tier: "Superior", baseCost: 8.4, description: "Highly prized tiny game birds roasted whole with their rich interiors and served over fried rye." },
            { name: "Braised Bear Paw with Honey", regions: ["Greywold"], tier: "Superior", baseCost: 9.8, description: "A legendary frontier feast item, slow-stewed for days until gelatinous, sweet, and incredibly rich." },
            { name: "Roasted Badger Pastry", regions: ["Greywold"], tier: "Superior", baseCost: 8.2, description: "A decorative pie containing spiced forest badger fat and choice chunks of wild boar loin." },

            // === THE WHITE CURTAIN (Cold Southern Coast) ===
            { name: "Boiled Tallow & Oats Porridge", regions: ["The White Curtain"], tier: "Cheap", baseCost: 0.9, description: "High-fat winter oats boiled into a dense sludge with rendered mutton suet to stave off the southern cold." },
            { name: "Salt-Whale Blubber Strips", regions: ["The White Curtain"], tier: "Cheap", baseCost: 1.1, description: "Chewy, incredibly oily strips of cured marine blubber, cold-smoked and intensely salty." },
            { name: "Dried Kelp & Barley Water", regions: ["The White Curtain"], tier: "Cheap", baseCost: 0.7, description: "Dark winter sea-ribbons boiled with hull-less barley, forming a slick, iodine-rich broth." },
            { name: "Frozen Turnip Shavings", regions: ["The White Curtain"], tier: "Cheap", baseCost: 0.8, description: "Rock-hard root vegetables thawed near the hearth, mashed rough with rancid sheep butter." },
            { name: "Boiled Penguin Wings", regions: ["The White Curtain"], tier: "Cheap", baseCost: 1.0, description: "Oily, tough coastal waterfowl wings simmered endlessly in heavily brackish water." },

            { name: "Dried Suthend Cod Skewers", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 3.0, description: "Deep-sea fish caught in the freezing southern sea, wind-dried and salted hard." },
            { name: "Winter Seal Stew", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 3.3, description: "Dark, rich, and oily marine meat cubed and stewed with heavy black parsnips and dried onions." },
            { name: "Mutton Broth with Hardtack", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 2.9, description: "A steaming bowl of fatty sheep neck broth, poured directly over broken hard sea biscuits." },
            { name: "Salt-Beef Carbonnade", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 3.4, description: "Brined caravan beef sliced thin and braised with dark, bitter southern winter ale." },
            { name: "Baked Ice-Bay Haddie", regions: ["The White Curtain"], tier: "Reasonable", baseCost: 3.1, description: "Cold-water haddock thick-salted and baked over charcoal, served with parsnip mash." },

            { name: "Roast Mountain Goat", regions: ["The White Curtain"], tier: "Superior", baseCost: 8.4, description: "Tender flank from a crag goat, roasted long with a sticky glaze of pine-needle reduction." },
            { name: "Prime Salt-Whale Tongue", regions: ["The White Curtain"], tier: "Superior", baseCost: 8.8, description: "The absolute choice delicacy of the southern whaling ships, boiled tender with winter spices." },
            { name: "Glazed Elk Loin with Cranberries", regions: ["The White Curtain"], tier: "Superior", baseCost: 9.1, description: "Massive northern elk steak seared rare, smothered in a tart, preserved wild berry compote." },
            { name: "Puffin Pastry with Sweet Wine", regions: ["The White Curtain"], tier: "Superior", baseCost: 8.5, description: "Delicate arctic seabirds baked whole inside a lard pastry with sweet, imported fortified wine." },
            { name: "Spiced Reindeer Tongue Pie", regions: ["The White Curtain"], tier: "Superior", baseCost: 8.9, description: "A rich winter masterpiece, layering finely sliced cured tongue, cloves, and suet." },

            // === SHADOW HAUNT (The Great Swamplands) ===
            { name: "Muck-Eel Broth", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 0.8, description: "Muddy, gelatinous soup made from small fen-eels and boiled marsh roots." },
            { name: "Boiled Duck Eggs", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 1.0, description: "Two strong-tasting, oil-rich waterfowl eggs pulled from the reeds and hard-boiled." },
            { name: "Salted Frog Legs", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 0.9, description: "Tiny, bony swamp-frog limbs quick-fried in heavy grease and crusted with gray fen-salt." },
            { name: "Marsh-Grass Gruel", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 0.7, description: "A watery slime made from pounded wild reed seeds and bitter bog-onion tops." },
            { name: "Smoked Mud-Carp Scraps", regions: ["Shadow Haunt"], tier: "Cheap", baseCost: 1.1, description: "Bony, bottom-feeding swamp fish dried over a smoky peat fire to mask the muddy rot taste." },

            { name: "Spiced Swamp Turtle Soup", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 2.9, description: "Thick, dark snapping turtle stew spiced heavily with fen-mustard seeds." },
            { name: "Fen-Duck with Bog-Berries", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 3.3, description: "Greasy wild waterfowl roasted over peat charcoal, served with a sharp, sour crimson sauce." },
            { name: "Fried Catfish with Wild Rice", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 3.1, description: "Thick, muddy catfish fillets dredged in rye meal and fried crisp, alongside dark swamp rice." },
            { name: "Swamp-Hare Ragout", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 3.0, description: "A dark, peppery stew containing stringy marsh rabbit and slow-boiled root tubers." },
            { name: "Crawfish and Leek Pottage", regions: ["Shadow Haunt"], tier: "Reasonable", baseCost: 2.8, description: "Dozens of small mud-crabs shelled and thrown into a creamy porridge of wild swamp leeks." },

            { name: "Braised Wild Swamp Boar", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 8.1, description: "Tough, aggressive tusked boar flank tenderized by hours of braising with sweet bog-berries." },
            { name: "Great Fen Heron Pastry", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 8.6, description: "A huge showcase pie containing layered heron breast, wild spices, and rich duck liver paste." },
            { name: "Spiced Alligator Tail Steak", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 9.0, description: "White, firm reptilian muscle cut thick, seared with imported black pepper and wild fen-garlic." },
            { name: "Jugged Bittern with Ginger", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 8.4, description: "A rare marsh-wading bird slow-steamed inside an airtight clay vessel with rare capital spices." },
            { name: "Marrow-Stuffed Swamp Pike", regions: ["Shadow Haunt"], tier: "Superior", baseCost: 8.7, description: "A giant, predatory freshwater fish stuffed with rich ox marrow and baked with white wine." },

            // === OAKLAND (Farmlands & Oaken Woods) ===
            { name: "Pork Scraps & Cabbage Hash", regions: ["Oakland"], tier: "Cheap", baseCost: 1.1, description: "Leftover pig trimmings fried on a flat iron sheet with shredded green cabbage." },
            { name: "Boiled Beans with Bacon Rind", regions: ["Oakland"], tier: "Cheap", baseCost: 0.9, description: "Broad white field beans simmered slow with the tough outer skin of smoked bacon." },
            { name: "Oatmeal Bannock Loaf", regions: ["Oakland"], tier: "Cheap", baseCost: 0.7, description: "A heavy, unleavened griddle cake made from coarse mill-dust and water, baked on the stones." },
            { name: "Scorched Onion Stew", regions: ["Oakland"], tier: "Cheap", baseCost: 0.8, description: "A dark brown, sweet but watery pottage made from caramelized winter onions and stale rye crusts." },
            { name: "Whey Barley Pottage", regions: ["Oakland"], tier: "Cheap", baseCost: 1.0, description: "Unhulled barley boiled directly in the sour liquid byproduct of dairy cheesemaking." },

            { name: "Spiced Pork Hand-Pie", regions: ["Oakland"], tier: "Reasonable", baseCost: 3.0, description: "Ground woodland hog seasoned with crushed sage and baked inside a dense wheat crust." },
            { name: "Roasted Barnyard Capon", regions: ["Oakland"], tier: "Reasonable", baseCost: 3.2, description: "A plump, corn-fed gelded rooster roasted crisp over oak logs with farmstead butter." },
            { name: "Beef & Mushroom Pasty", regions: ["Oakland"], tier: "Reasonable", baseCost: 3.4, description: "Diced beef chuck and earthy brown field mushrooms enclosed in a rich, crimped lard crust." },
            { name: "Oak-Smoked Bacon Slab", regions: ["Oakland"], tier: "Reasonable", baseCost: 3.1, description: "Thick, salty rashers of belly pork carved straight from the chimney rack, served with white cabbage." },
            { name: "Farmhouse Cheese and Ham Tart", regions: ["Oakland"], tier: "Reasonable", baseCost: 2.9, description: "A deep pastry shell holding baked egg curd, sharp gold cheese, and diced cured pig flank." },

            { name: "Honey-Glazed Ham Skewers", regions: ["Oakland"], tier: "Superior", baseCost: 8.3, description: "Prime choice cuts of acorn-fattened swine, heavily basted with wild woodland honey." },
            { name: "Roast Venison with Blackberry Jus", regions: ["Oakland"], tier: "Superior", baseCost: 8.8, description: "A magnificent buck loin roasted over charcoal, served with a sticky sauce of wild briar berries." },
            { name: "Spiced Ox-Cheek Pastry", regions: ["Oakland"], tier: "Superior", baseCost: 8.5, description: "Tough muscle rendered completely tender by twelve hours of braising, baked with costly nutmeg and mace." },
            { name: "Whole Roasted Mallard Duck", regions: ["Oakland"], tier: "Superior", baseCost: 8.7, description: "Rich, dark wild waterfowl roasted until the skin crackles, stuffed with sage and wild apples." },
            { name: "Almond-Cream Chicken Pie", regions: ["Oakland"], tier: "Superior", baseCost: 9.0, description: "An elite recipe featuring tender poultry meat swimming in a sweet sauce of crushed almonds and white wine." }
        ],
        drinks: [
            // === CHEAP QUALITY DRINKS ===
            { name: "Sour Whey & Small Beer", type: "Ale/Beer", tier: "Cheap", baseCost: 1.0, description: "Weak, cloudy dregs with very low alcohol content; safe to drink, if sour." },
            { name: "Grist-Mill Dishwater Ale", type: "Ale/Beer", tier: "Cheap", baseCost: 0.9, description: "Thin, unhopped watery ale brewed from the secondary wash of scorched barley grains." },
            { name: "Fermented Turnip Cider", type: "Ale/Beer", tier: "Cheap", baseCost: 1.0, description: "A pungent, watery press of winter turnips. Bitterly alcoholic and highly unrefined." },
            { name: "Watered Vine-Scrappings", type: "Wine/Spirits", tier: "Cheap", baseCost: 2.0, description: "Thin, sharp vinegar-wine squeezed from leftover rotten grape skins and heavily diluted." },
            { name: "Skimming-House Perry", type: "Wine/Spirits", tier: "Cheap", baseCost: 1.8, description: "A harsh, cloudy pear-waste liquor prone to leaving a heavy ache in the morning." },
            { name: "Ditch-Herb Small Grog", type: "Wine/Spirits", tier: "Cheap", baseCost: 2.1, description: "Watered down grain spirit mask with wild field mint to hide the stinging burn." },

            // === REASONABLE QUALITY DRINKS ===
            { name: "Common Bitter Porter", type: "Ale/Beer", tier: "Reasonable", baseCost: 1.5, description: "A dark, hearty malted ale brewed locally and served cool in wooden tankards." },
            { name: "Oat-Malt Amber Ale", type: "Ale/Beer", tier: "Reasonable", baseCost: 1.4, description: "Smooth, nutty ale with a dense foam head, boasting balanced tones of roasted field oats." },
            { name: "Greywold Crisp Apple Cider", type: "Ale/Beer", tier: "Reasonable", baseCost: 1.5, description: "A tart, golden brew pressed from wild orchard apples gathered along the forest edges." },
            { name: "Rough Red Table Wine", type: "Wine/Spirits", tier: "Reasonable", baseCost: 4.0, description: "A solid, unaged vintage carrying a strong berry bite; standard tavern fare." },
            { name: "Hill-Country Spiced Mead", type: "Wine/Spirits", tier: "Reasonable", baseCost: 4.2, description: "Sweet fermented clover honey balanced with wild thyme and a sharp finish." },
            { name: "Clarified White Currant Cordial", type: "Wine/Spirits", tier: "Reasonable", baseCost: 4.5, description: "A bright, clean fortified fruit wine with an acidic bite that cuts through grease." },

            // === SUPERIOR QUALITY DRINKS ===
            { name: "Imported Heavy Mountain Stout", type: "Ale/Beer", tier: "Superior", baseCost: 3.0, description: "Jet black, creamy ale carried out of the southern peaks; packs a fierce punch." },
            { name: "Double-Brewed Abbey Barleywine", type: "Ale/Beer", tier: "Superior", baseCost: 3.2, description: "A massive, deep mahogany ale aged in toasted casks, rich with sweet syrup tones." },
            { name: "Spiced Winter Braggot", type: "Ale/Beer", tier: "Superior", baseCost: 2.8, description: "A heavy, warm blend of dark tavern ale and fine honey-mead, infused with whole cloves." },
            { name: "Aged Vinmarch Vintage Reserve", type: "Wine/Spirits", tier: "Superior", baseCost: 6.0, description: "Perfectly clarified white or deep crimson vintage hauled out of the northern vineyard estates." },
            { name: "Fortified Honey Sack-Wine", type: "Wine/Spirits", tier: "Superior", baseCost: 6.5, description: "A velvety, heavy dessert wine enriched with clean honey spirits and sweet botanical oils." },
            { name: "Royal Aquavitae infusion", type: "Wine/Spirits", tier: "Superior", baseCost: 7.0, description: "Triple-distilled wine spirit clean enough to catch fire, subtly scented with imported anise." }
        ]
    };

    // --- CONFIGURATION DIALOG WITH MODERN CSS TOGGLE CHIPS ---
    const uniqueRegions = [...new Set(MENU_DATA.food.flatMap(item => item.regions))];

    const regionChipsHtml = uniqueRegions.map(r => `
        <label class="region-chip">
          <input type="checkbox" name="region-selection" value="${r}" style="display:none;">
          <span>${r}</span>
        </label>
    `).join("");

    const dialogContent = `
        <style>
          .region-chip-container {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 6px;
            margin-bottom: 12px;
          }
          .region-chip {
            cursor: pointer;
            margin: 0 !important;
          }
          .region-chip span {
            display: block;
            padding: 6px 8px;
            background: #e2d7c7;
            border: 1px solid #bda88f;
            border-radius: 4px;
            text-align: center;
            font-size: 0.88em;
            font-weight: normal;
            color: #4a3c31;
            transition: all 0.15s ease-in-out;
          }
          .region-chip input:checked + span {
            background: #7a1d1d;
            color: #ffffff;
            border-color: #5c1414;
            box-shadow: inset 0 1px 3px rgba(0,0,0,0.3);
            font-weight: bold;
          }
          .region-chip span:hover {
            background: #d3c4b1;
          }
          .region-chip input:checked + span:hover {
            background: #8c2525;
          }
        </style>

        <form class="tavern-menu-form">
          <div class="form-group">
            <label style="font-weight: bold; display: block; margin-bottom: 6px;">Select Culinary Regions (Toggle multiple):</label>
            <div class="region-chip-container">
              ${regionChipsHtml}
            </div>
          </div>
          <div class="form-group">
            <label style="font-weight: bold;">Tavern Quality Tier:</label>
            <select id="tier" name="tier">
              <option value="Cheap">Cheap (1sf Meals / 1-2sf Drinks)</option>
              <option value="Reasonable">Reasonable (3sf Meals / 1.5-4sf Drinks)</option>
              <option value="Superior">Superior (8sf Meals / 3-6sf Drinks)</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: bold;">Settlement Level (Scarcity Scaling):</label>
            <select id="settlement" name="settlement">
              <option value="City">City (Abundant Variety / Normal Prices)</option>
              <option value="Town">Town (Moderate Variety / +10% Price Inflation)</option>
              <option value="Village">Village (Scarce Isolation / +25% Price Inflation)</option>
            </select>
          </div>
          <div class="form-group">
            <label style="font-weight: bold;">Flat Economy Multiplier:</label>
            <input type="number" id="multiplier" name="multiplier" value="1.0" step="0.1" min="0.1">
          </div>
          <div class="form-group" style="display: flex; gap: 10px;">
            <div style="flex: 1;">
              <label style="font-weight: bold;">Food Options:</label>
              <input type="number" id="foodCount" name="foodCount" value="3" min="1" max="8">
            </div>
            <div style="flex: 1;">
              <label style="font-weight: bold;">Drink Options:</label>
              <input type="number" id="drinkCount" name="drinkCount" value="2" min="1" max="6">
            </div>
          </div>
        </form>
    `;

    new Dialog({
        title: "Tavern Menu Generator",
        content: dialogContent,
        buttons: {
            generate: {
                icon: '<i class="fas fa-utensils"></i>',
                label: "Generate Menu",
                callback: (html) => {
                    const selectedRegions = [];
                    html.find('input[name="region-selection"]:checked').each(function () {
                        selectedRegions.push($(this).val());
                    });

                    const chosenTier = html.find('#tier').val();
                    const settlement = html.find('#settlement').val();
                    const userMultiplier = parseFloat(html.find('#multiplier').val()) || 1.0;
                    const foodCount = parseInt(html.find('#foodCount').val(), 10) || 3;
                    const drinkCount = parseInt(html.find('#drinkCount').val(), 10) || 2;

                    if (selectedRegions.length === 0) {
                        ui.notifications.warn("You must select at least one culinary region!");
                        return;
                    }

                    // --- ECONOMIC SCALING CALCULATIONS ---
                    let settlementMod = 1.0;
                    let availabilityChance = 1.0;

                    if (settlement === "Town") {
                        settlementMod = 1.10;
                        availabilityChance = 0.85;
                    } else if (settlement === "Village") {
                        settlementMod = 1.25;
                        availabilityChance = 0.65;
                    }

                    const finalMultiplier = userMultiplier * settlementMod;

                    const formatPrice = (base) => {
                        let final = base * finalMultiplier;
                        return `${final.toFixed(1).replace('.0', '')} sf`;
                    };

                    // --- FILTER POOLS (Fixed to guarantee input counts) ---
                    let foodPool = MENU_DATA.food.filter(item =>
                        item.tier === chosenTier &&
                        item.regions.some(r => selectedRegions.includes(r))
                    );

                    let drinkPool = MENU_DATA.drinks.filter(item => item.tier === chosenTier);

                    // Pull dynamic counts directly from the full pool
                    let selectedFood = foodPool.sort(() => 0.5 - Math.random()).slice(0, Math.min(foodCount, foodPool.length));
                    let selectedDrinks = drinkPool.sort(() => 0.5 - Math.random()).slice(0, Math.min(drinkCount, drinkPool.length));

                    // --- CHAT CARD HTML GENERATION ---
                    let regionsDisplay = selectedRegions.join(", ");
                    let cardHtml = `
                        <div style="font-family: 'Signika', sans-serif;">
                          <h3 style="border-bottom: 2px solid #7a1d1d; color: #7a1d1d; padding-bottom: 4px; margin-bottom: 4px; font-size: 1.15em; font-weight: bold;">
                            📋 ${settlement} Tavern Menu
                          </h3>
                          <div style="font-size: 0.82em; color: #555; margin-bottom: 10px; line-height: 1.2;">
                            <strong>Regions:</strong> ${regionsDisplay}<br>
                            <strong>Tier:</strong> ${chosenTier} Establishment | <strong>Price Mod:</strong> x${finalMultiplier.toFixed(2)}
                          </div>
                          
                          <div style="background: #f4eae1; padding: 4px 8px; font-weight: bold; font-size: 0.9em; margin-bottom: 6px; border-radius: 3px; color: #5c1d1d;">TODAY'S FARE</div>
                          <ul style="list-style: none; padding: 0; margin: 0 0 12px 0;">
                    `;

                    selectedFood.forEach(item => {
                        let isImport = selectedRegions.length > 1 ? `<span style="font-size:0.7em; background:#e2e8f0; color:#4a5568; padding:1px 3px; border-radius:2px; margin-left:4px;">${item.regions[0]}</span>` : '';
                        cardHtml += `
                          <li style="margin-bottom: 8px; padding-bottom: 6px; border-bottom: 1px dashed #dcd1c4;">
                            <div style="display: flex; justify-content: space-between; align-items: baseline;">
                              <strong style="color: #1a202c; font-size: 0.92em;">${item.name}</strong>
                              <span style="color: #b45f06; font-weight: bold; font-family: monospace; font-size: 0.92em;">${formatPrice(item.baseCost)}</span>
                            </div>
                            <div style="font-size: 0.78em; color: #718096; margin: 1px 0;">
                              <em>Nutrition: ${item.tier === "Cheap" ? "Poor/Standard" : item.tier === "Reasonable" ? "Good" : "Excellent"}</em>${isImport}
                            </div>
                            <div style="font-size: 0.85em; font-style: italic; color: #4a5568; line-height: 1.25;">
                              "${item.description}"
                            </div>
                          </li>
                        `;
                    });

                    cardHtml += `
                          </ul>
                          <div style="background: #e9e1f4; padding: 4px 8px; font-weight: bold; font-size: 0.9em; margin-bottom: 6px; border-radius: 3px; color: #3d1d5c;">THE INTENT/DRINK MENU</div>
                          <ul style="list-style: none; padding: 0; margin: 0;">
                    `;

                    selectedDrinks.forEach(item => {
                        cardHtml += `
                          <li style="margin-bottom: 6px; padding-bottom: 4px; border-bottom: 1px dashed #d6cbdc; display: flex; justify-content: space-between; align-items: top;">
                            <div style="padding-right: 10px;">
                              <strong style="color: #1a202c; font-size: 0.9em; display: block;">${item.name}</strong>
                              <span style="font-size: 0.8em; color: #6b46c1; font-style: italic;">${item.description}</span>
                            </div>
                            <span style="color: #b45f06; font-weight: bold; font-family: monospace; font-size: 0.92em; white-space: nowrap;">${formatPrice(item.baseCost)}</span>
                          </li>
                        `;
                    });

                    cardHtml += `</ul></div>`;

                    // --- PRIVATE GM ROLL ---
                    ChatMessage.create({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker({ alias: "Food and Drinks" }),
                        content: cardHtml,
                        whisper: ChatMessage.getWhisperRecipients("GM"),
                        blind: true
                    });
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "generate"
    }, { width: 440 }).render(true);
}
globalThis.magcmOpenFoodMenuGeneratorDialog = magcmOpenFoodMenuGeneratorDialog;

/**
 * Alcoholize macro: supports a homebrew magical craft skill ("Aberration (Alcoholize)") for brewing
 * alcohol over multiple magic-point-spending rounds, with quality tiers, target-skill augmenting,
 * Luck Point re-rolls, and "Next Round" chat-card continuation buttons.
 */
async function magcmOpenAlcoholizeDialog() {
    // 1. Target Actor & Skill Resolution
    const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
    if (!actor) {
        return ui.notifications.warn("Please select a token or assign a default character.");
    }

    const skillName = "Aberration (Alcoholize)";
    const skillItem = actor.items.find(i => i.name.toLowerCase() === skillName.toLowerCase());
    if (!skillItem) {
        return ui.notifications.warn(`Selected character does not have the "${skillName}" skill.`);
    }

    const getSkillValue = (item) => {
        if (!item) return 0;
        return item.totalVal ?? item.system?.skillLevel ?? item.system?.value ?? 0;
    };

    const baseSkillValue = getSkillValue(skillItem);

    // Retrieve Skills for Cap / Augment Dropdowns
    const getActorSkills = (a) => {
        if (!a) return [];
        return a.items.filter(i =>
            i.type === "standardSkill" ||
            i.type === "professionalSkill" ||
            i.type === "combatStyle" ||
            i.type === "magicSkill" ||
            i.type === "passion"
        ).sort((a, b) => a.name.localeCompare(b.name));
    };

    // 2. Helper Functions
    const getTimeInSeconds = (mp, units) => {
        const baseSeconds = mp === 1 ? 300 : mp === 2 ? 60 : 10;
        return baseSeconds * units;
    };

    const formatTime = (totalSeconds) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        let parts = [];
        if (hrs > 0) parts.push(`${hrs}h`);
        if (mins > 0) parts.push(`${mins}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        return parts.join(" ");
    };

    const getQualityTier = (ss) => {
        if (ss < 50) return { name: "Fail", gradePenalty: 0 };
        if (ss < 75) return { name: "Awful", gradePenalty: 0 };
        if (ss < 100) return { name: "Cheap", gradePenalty: 0 };
        if (ss < 125) return { name: "Reasonable", gradePenalty: 0 };
        if (ss < 150) return { name: "Superior", gradePenalty: 1 };
        return { name: "Exemplary", gradePenalty: 2 };
    };

    const getDifficultyMultiplier = (baseDiff, gradePenalty) => {
        const grades = ["Standard", "Hard", "Formidable", "Herculean"];
        let baseIndex = baseDiff === "Beer" ? 0 : 1; // Beer = Standard (0), Wine/Spirits = Hard (1)
        let finalIndex = Math.min(baseIndex + gradePenalty, grades.length - 1);

        const multipliers = { "Standard": 1.0, "Hard": 0.66, "Formidable": 0.5, "Herculean": 0.1 };
        return { label: grades[finalIndex], mult: multipliers[grades[finalIndex]] };
    };

    // 3. Dialog Builder
    const openBrewDialog = (state = {}) => {
        const currentActor = state.actorId
            ? (game.actors.get(state.actorId) || canvas.tokens.placeables.find(t => t.actor?.id === state.actorId)?.actor)
            : actor;

        if (!currentActor) {
            ui.notifications.warn("Could not resolve actor for crafting dialog.");
            return;
        }

        const currentSkillItem = currentActor.items.find(i => i.name.toLowerCase() === skillName.toLowerCase());
        const currentBaseSkillValue = getSkillValue(currentSkillItem);

        const isContinuation = state.round > 1;
        const isReroll = !!state.isReroll;
        const currentRound = state.round || 1;

        const prevMp = state.prevMp ?? 0;
        const prevTime = state.prevTime ?? 0;
        const prevSS = state.prevSS ?? 0;

        const selectedType = state.type || "Beer";
        const selectedUnits = state.units || 1;

        const selfSkills = getActorSkills(currentActor);
        const targetToken = game.user.targets.first();
        const targetActor = targetToken?.actor;
        const targetSkills = getActorSkills(targetActor);

        const selfSkillsOptions = selfSkills.map(s => `<option value="${s.id}">${s.name} (${getSkillValue(s)}%)</option>`).join("");
        const targetSkillsOptions = targetSkills.map(s => `<option value="${s.id}">${s.name} (${getSkillValue(s)}%)</option>`).join("");

        const dialogContent = `
            <form style="display: flex; flex-direction: column; gap: 8px;">
            <div style="background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px;">
                <strong>Actor:</strong> ${currentActor.name} | <strong>Base Skill:</strong> ${currentBaseSkillValue}%<br>
                <strong>Task Round:</strong> #${currentRound} ${isReroll ? "<em>(Luck Re-roll)</em>" : ""} | <strong>Current Score:</strong> ${prevSS} (${getQualityTier(prevSS).name})
            </div>

            <div class="form-group">
                <label>Alcohol Type:</label>
                <select id="brew-type" ${isContinuation ? "disabled" : ""}>
                    <option value="Beer" ${selectedType === "Beer" ? "selected" : ""}>Beer (Standard)</option>
                    <option value="Spirits" ${selectedType === "Spirits" ? "selected" : ""}>Spirits (Hard)</option>
                    <option value="Wine" ${selectedType === "Wine" ? "selected" : ""}>Wine (Hard)</option>
                </select>
            </div>

            <div class="form-group">
                <label>Units of Brew:</label>
                <input type="number" id="brew-units" value="${selectedUnits}" min="1" ${isContinuation ? "disabled" : ""}/>
            </div>

            <div class="form-group">
                <label>Magic Points Spent (This Round):</label>
                <select id="brew-mp">
                    <option value="1">1 MP (5 min/unit)</option>
                    <option value="2">2 MP (1 min/unit)</option>
                    <option value="3">3 MP (10 sec/unit)</option>
                </select>
            </div>

            <div class="form-group">
                <label>Initial Success Score Offset:</label>
                <input type="number" id="brew-ss" value="${prevSS}" ${isContinuation ? "disabled" : ""}/>
            </div>

            <fieldset style="border: 1px solid #7a7a7a; border-radius: 4px; padding: 6px 8px; margin-top: 4px;">
                <legend style="font-weight: bold; padding: 0 4px;">Augment / Cap Options</legend>
                
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <input type="radio" id="aug-none" name="augmentMode" value="none" checked>
                    <label for="aug-none" style="font-weight: normal; cursor: pointer;">None</label>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <input type="radio" id="aug-cap" name="augmentMode" value="cap">
                    <label for="aug-cap" style="min-width: 100px; font-weight: normal; cursor: pointer;">Cap With:</label>
                    <select id="brew-cap-skill" style="flex: 1;" disabled>
                        ${selfSkillsOptions}
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <input type="radio" id="aug-self" name="augmentMode" value="augmentSelf">
                    <label for="aug-self" style="min-width: 100px; font-weight: normal; cursor: pointer;">Augment By:</label>
                    <select id="brew-aug-self-skill" style="flex: 1;" disabled>
                        ${selfSkillsOptions}
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <input type="radio" id="aug-custom" name="augmentMode" value="custom">
                    <label for="aug-custom" style="min-width: 100px; font-weight: normal; cursor: pointer;">Custom Bonus:</label>
                    <input type="number" id="brew-custom-val" value="0" style="width: 80px;" disabled placeholder="e.g. 10">
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="radio" id="aug-target" name="augmentMode" value="augmentTarget" ${targetActor ? "" : "disabled"}>
                    <label for="aug-target" style="min-width: 100px; font-weight: normal; cursor: pointer;">
                        ${targetActor ? `Augment By (${targetActor.name}):` : "Augment By Target:"}
                    </label>
                    <select id="brew-aug-target-skill" style="flex: 1;" disabled>
                        ${targetSkillsOptions.length > 0 ? targetSkillsOptions : `<option value="">No Target Selected</option>`}
                    </select>
                </div>
            </fieldset>

            <hr style="margin: 4px 0;">
            <div style="font-weight: bold; color: #2b580c;" id="brew-dynamic-info">
                Calculating duration and target difficulty...
            </div>
            </form>
        `;

        new Dialog({
            title: `Aberration (Alcoholize) - Round #${currentRound}`,
            content: dialogContent,
            render: (html) => {
                const updateDynamicFields = () => {
                    const mode = html.find('input[name="augmentMode"]:checked').val();

                    html.find("#brew-cap-skill").prop("disabled", mode !== "cap");
                    html.find("#brew-aug-self-skill").prop("disabled", mode !== "augmentSelf");
                    html.find("#brew-custom-val").prop("disabled", mode !== "custom");
                    html.find("#brew-aug-target-skill").prop("disabled", mode !== "augmentTarget" || !targetActor);

                    let effectiveSkill = currentBaseSkillValue;
                    let augmentDesc = "";

                    if (mode === "cap") {
                        const capId = html.find("#brew-cap-skill").val();
                        const capItem = selfSkills.find(i => i.id === capId);
                        if (capItem) {
                            const capVal = getSkillValue(capItem);
                            if (currentBaseSkillValue > capVal) {
                                effectiveSkill = capVal;
                                augmentDesc = `Capped by ${capItem.name} (${capVal}%)`;
                            } else {
                                augmentDesc = `Cap: ${capItem.name} (${capVal}%)`;
                            }
                        }
                    } else if (mode === "augmentSelf") {
                        const augId = html.find("#brew-aug-self-skill").val();
                        const augItem = selfSkills.find(i => i.id === augId);
                        if (augItem) {
                            const augVal = getSkillValue(augItem);
                            const bonus = Math.round(augVal * 0.2);
                            effectiveSkill = currentBaseSkillValue + bonus;
                            augmentDesc = `Augmented by ${augItem.name} (+${bonus}%)`;
                        }
                    } else if (mode === "custom") {
                        const bonus = parseInt(html.find("#brew-custom-val").val()) || 0;
                        effectiveSkill = currentBaseSkillValue + bonus;
                        augmentDesc = `Custom Augment (${bonus >= 0 ? "+" : ""}${bonus}%)`;
                    } else if (mode === "augmentTarget" && targetActor) {
                        const augId = html.find("#brew-aug-target-skill").val();
                        const augItem = targetSkills.find(i => i.id === augId);
                        if (augItem) {
                            const augVal = getSkillValue(augItem);
                            const bonus = Math.round(augVal * 0.2);
                            effectiveSkill = currentBaseSkillValue + bonus;
                            augmentDesc = `Augmented by ${targetActor.name}'s ${augItem.name} (+${bonus}%)`;
                        }
                    }

                    const type = html.find("#brew-type").val();
                    const units = parseInt(html.find("#brew-units").val()) || 1;
                    const mp = parseInt(html.find("#brew-mp").val()) || 1;
                    const startSS = parseInt(html.find("#brew-ss").val()) || 0;

                    const roundSeconds = getTimeInSeconds(mp, units);
                    const estimatedTotalTime = prevTime + roundSeconds;
                    const tier = getQualityTier(startSS);
                    const diff = getDifficultyMultiplier(type, tier.gradePenalty);
                    const targetSkill = Math.round(effectiveSkill * diff.mult);

                    html.find("#brew-dynamic-info").html(`
                        <strong>Effective Skill:</strong> ${effectiveSkill}% ${augmentDesc ? `<span style="font-size:0.9em; color:#555;">(${augmentDesc})</span>` : ""}<br>
                        <strong>Round Time:</strong> ${formatTime(roundSeconds)} (Total: ${formatTime(estimatedTotalTime)})<br>
                        <strong>Effective Difficulty:</strong> ${diff.label} (${targetSkill}% target)
                    `);
                };

                html.find('input[name="augmentMode"], #brew-type, #brew-units, #brew-mp, #brew-ss, #brew-cap-skill, #brew-aug-self-skill, #brew-custom-val, #brew-aug-target-skill').on("change input", updateDynamicFields);
                updateDynamicFields();
            },
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice-d100"></i>',
                    label: "Brew",
                    callback: async (html) => {
                        const type = html.find("#brew-type").val();
                        const units = parseInt(html.find("#brew-units").val()) || 1;
                        const mp = parseInt(html.find("#brew-mp").val()) || 1;
                        const startSS = parseInt(html.find("#brew-ss").val()) || 0;
                        const mode = html.find('input[name="augmentMode"]:checked').val();

                        let effectiveSkill = currentBaseSkillValue;
                        let augmentDesc = "";

                        if (mode === "cap") {
                            const capId = html.find("#brew-cap-skill").val();
                            const capItem = selfSkills.find(i => i.id === capId);
                            if (capItem) {
                                const capVal = getSkillValue(capItem);
                                if (currentBaseSkillValue > capVal) {
                                    effectiveSkill = capVal;
                                    augmentDesc = `Capped by ${capItem.name} (${capVal}%)`;
                                } else {
                                    augmentDesc = `Cap: ${capItem.name} (${capVal}%)`;
                                }
                            }
                        } else if (mode === "augmentSelf") {
                            const augId = html.find("#brew-aug-self-skill").val();
                            const augItem = selfSkills.find(i => i.id === augId);
                            if (augItem) {
                                const augVal = getSkillValue(augItem);
                                const bonus = Math.round(augVal * 0.2);
                                effectiveSkill = currentBaseSkillValue + bonus;
                                augmentDesc = `Augmented by ${augItem.name} (+${bonus}%)`;
                            }
                        } else if (mode === "custom") {
                            const bonus = parseInt(html.find("#brew-custom-val").val()) || 0;
                            effectiveSkill = currentBaseSkillValue + bonus;
                            augmentDesc = `Custom Augment (${bonus >= 0 ? "+" : ""}${bonus}%)`;
                        } else if (mode === "augmentTarget" && targetActor) {
                            const augId = html.find("#brew-aug-target-skill").val();
                            const augItem = targetSkills.find(i => i.id === augId);
                            if (augItem) {
                                const augVal = getSkillValue(augItem);
                                const bonus = Math.round(augVal * 0.2);
                                effectiveSkill = currentBaseSkillValue + bonus;
                                augmentDesc = `Augmented by ${targetActor.name}'s ${augItem.name} (+${bonus}%)`;
                            }
                        }

                        await executeBrewRoll({
                            actor: currentActor,
                            baseSkillValue: currentBaseSkillValue,
                            effectiveSkill,
                            augmentDesc,
                            round: currentRound,
                            type,
                            units,
                            mpThisRound: mp,
                            prevMp,
                            prevTime,
                            prevSS: startSS,
                            isReroll
                        });
                    }
                },
                cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
            },
            default: "roll"
        }).render(true);
    };

    // 4. Roll Processing & Output
    async function executeBrewRoll(data) {
        // Automatic MP Deduction (Skipped on Luck Re-rolls)
        if (!data.isReroll && data.mpThisRound > 0) {
            const currentMp = parseInt(data.actor.system.trackedStats?.magicPoints?.value);
            if (typeof currentMp === "number") {
                const newMp = Math.max(0, currentMp - data.mpThisRound);
                await data.actor.update({ "system.trackedStats.magicPoints.value": newMp });
                ui.notifications.info(`Spent ${data.mpThisRound} MP. (${newMp} MP remaining)`);
            } else {
                ui.notifications.warn("Could not locate system.trackedStats.magicPoints.value on character sheet.");
            }
        }

        const totalMp = data.prevMp + data.mpThisRound;
        const roundTime = getTimeInSeconds(data.mpThisRound, data.units);
        const totalTime = data.prevTime + roundTime;

        const tier = getQualityTier(data.prevSS);
        const diff = getDifficultyMultiplier(data.type, tier.gradePenalty);
        const targetSkill = Math.round(data.effectiveSkill * diff.mult);

        const roll = await new Roll("1d100").evaluate({ async: true });
        const rollVal = roll.total;
        const critThreshold = Math.max(1, Math.ceil(targetSkill / 10));
        const fumbleThreshold = targetSkill < 100 ? 99 : 100;

        let resultText = "";
        let ssDelta = 0;

        if (rollVal <= critThreshold) {
            resultText = `<span style="font-weight: bold; color:goldenrod">CRITICAL SUCCESS!</span>`;
            ssDelta = 50;
        } else if (rollVal <= targetSkill && rollVal <= 95) {
            resultText = `<span style="font-weight: bold; color:green">Success</span>`;
            ssDelta = 25;
        } else if (rollVal >= fumbleThreshold) {
            resultText = `<span style="font-weight: bold; color:darkred">FUMBLE!</span>`;
            ssDelta = -25;
        } else {
            resultText = `<span style="font-weight: bold; color:red">Failure</span>`;
            ssDelta = 0;
        }

        const newSS = Math.max(0, data.prevSS + ssDelta);
        const newTier = getQualityTier(newSS);
        let newTierLabelColor = "darkred";
        switch (newTier.name.toLowerCase()) {
            case "exemplary":
                newTierLabelColor = "purple";
                break;
            case "superior":
                newTierLabelColor = "goldenrod";
                break;
            case "reasonable":
                newTierLabelColor = "green";
                break;
            case "cheap":
                newTierLabelColor = "red";
                break;
        }
        const newTierLabel = `<span style="font-weight:bold; color:${newTierLabelColor}">${newTier.name}</span>`;

        const content = `
            <div class="mythras-brew-card" 
                data-actor-id="${data.actor.id}" 
                data-round="${data.round}" 
                data-type="${data.type}" 
                data-units="${data.units}" 
                data-total-mp="${totalMp}" 
                data-total-time="${totalTime}" 
                data-ss="${newSS}"
                data-prev-mp="${data.prevMp}"
                data-prev-time="${data.prevTime}"
                data-prev-ss="${data.prevSS}"
                data-effective-skill="${data.effectiveSkill}"
                data-augment-desc="${data.augmentDesc || ""}"
                data-mp-this-round="${data.mpThisRound}">
            <h3 style="border-bottom: 2px solid #555; margin-bottom: 4px;">Aberration (Alcoholize) - Round #${data.round}${data.isReroll ? " (Luck Re-roll)" : ""}</h3>
            <p><strong>Brew:</strong> ${data.units} unit(s) of ${data.type}</p>
            <p><strong>Effective Skill:</strong> ${data.effectiveSkill}% ${data.augmentDesc ? `<span style="font-size:0.9em;">(${data.augmentDesc})</span>` : ""}</p>
            <p><strong>Target Skill:</strong> ${targetSkill}% (${diff.label}) | <strong>Roll:</strong> <span style="font-size:1.1em; font-weight:bold;">${rollVal}</span> (${resultText})</p>
            <hr style="margin: 4px 0;">
            <p><strong>Progress:</strong> ${newSS} SS (${ssDelta >= 0 ? "+" : ""}${ssDelta} this round)</p>
            <p><strong>Quality:</strong> ${newTierLabel}</p>
            <p><strong>Total Magic Points Spent:</strong> ${totalMp} MP</p>
            <p><strong>Total Time Elapsed:</strong> ${formatTime(totalTime)}</p>
            
            <div style="display: flex; gap: 4px; margin-top: 8px;">
                <button class="btn-brew-continue" style="flex: 1;"><i class="fas fa-arrow-right"></i> Next Round</button>
                ${data.isReroll ? "" : `
                <button class="btn-brew-luck" style="flex: 1;"><i class="fas fa-clover"></i> Spend Luck</button>` }
            </div>
            </div>
        `;

        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: data.actor }),
            content: content,
            rolls: [roll]
        });
    }

    // 5. Global Action Hooks for Chat Buttons (guarded so re-running the macro doesn't attach duplicate listeners)
    if (!window.brewMacroHooksAttached) {
        window.brewMacroHooksAttached = true;

        Hooks.on("renderChatMessage", (message, html) => {
            html.find(".btn-brew-continue").click(async (e) => {
                const card = $(e.currentTarget).closest(".mythras-brew-card");
                const state = {
                    round: parseInt(card.data("round")) + 1,
                    type: card.data("type"),
                    units: parseInt(card.data("units")),
                    prevMp: parseInt(card.data("total-mp")),
                    prevTime: parseInt(card.data("total-time")),
                    prevSS: parseInt(card.data("ss")),
                    actorId: card.data("actor-id"),
                    isReroll: false
                };
                openBrewDialog(state);
            });

            html.find(".btn-brew-luck").click(async (e) => {
                const card = $(e.currentTarget).closest(".mythras-brew-card");
                const actorId = card.data("actor-id");
                const cardActor = game.actors.get(actorId) || canvas.tokens.placeables.find(t => t.actor?.id === actorId)?.actor;

                if (!cardActor) {
                    ui.notifications.warn("Could not locate actor for Spend Luck.");
                    return;
                }

                const luckPath = cardActor.system.trackedStats?.luckPoints;
                if (luckPath && luckPath.value > 0) {
                    await cardActor.update({ "system.trackedStats.luckPoints.value": luckPath.value - 1 });
                    ui.notifications.info(`Spent 1 Luck point for ${cardActor.name}. (${luckPath.value - 1} remaining)`);
                } else {
                    ui.notifications.warn("No Luck points available on character sheet!");
                    return;
                }

                const cardSkillItem = cardActor.items.find(i => i.name.toLowerCase() === skillName.toLowerCase());
                const cardBaseSkillValue = cardSkillItem ? (cardSkillItem.totalVal ?? cardSkillItem.system?.skillLevel ?? cardSkillItem.system?.value ?? 0) : 0;

                await executeBrewRoll({
                    actor: cardActor,
                    baseSkillValue: cardBaseSkillValue,
                    effectiveSkill: parseInt(card.data("effective-skill")) || cardBaseSkillValue,
                    augmentDesc: card.data("augment-desc") || "",
                    round: parseInt(card.data("round")),
                    type: card.data("type"),
                    units: parseInt(card.data("units")),
                    mpThisRound: parseInt(card.data("mp-this-round")) || 1,
                    prevMp: parseInt(card.data("prev-mp")) || 0,
                    prevTime: parseInt(card.data("prev-time")) || 0,
                    prevSS: parseInt(card.data("prev-ss")) || 0,
                    isReroll: true
                });
            });
        });
    }

    // Execute initial prompt
    openBrewDialog();
}
globalThis.magcmOpenAlcoholizeDialog = magcmOpenAlcoholizeDialog;

/**
 * Attack Roll macro: the main combat dialog for a token, letting the user pick a combat style/skill,
 * weapon, difficulty, augments, charging, and various homebrew toggles, then posting an attack-roll
 * chat card whose "Roll Hit Location" / "Roll Damage" / "Apply Damage" buttons are handled by the
 * renderChatMessage listener elsewhere in this file.
 */
function magcmOpenAttackDialog(token) {
    const getSkillValue = (item) => item?.totalVal ?? item?.system?.skillLevel ?? item?.system?.value ?? 0;

    // A stunned head/chest/torso/abdomen location leaves the character insensible or only able to defend
    // (per the Stun Location special effect), so they cannot use this macro to attack at all while so stunned.
    // Stunned limbs are handled separately - they just disable that specific weapon (see _stunnedBlocked below).
    const defendOnlyStunnedLocation = token.actor.items.find(i => i.type === "hitLocation"
        && i.getFlag(MAGCM_MODULE_ID, "stunnedBy")
        && /head|chest|torso|abdomen/i.test(i.name));
    if (defendOnlyStunnedLocation) {
        return ui.notifications.warn(`${token.actor.name} cannot attack while their ${defendOnlyStunnedLocation.name} is stunned; they can only defend.`);
    }

    // Press Advantage/Pin Down/Overextend Opponent all disable the whole character's attack (not just a
    // limb/weapon), mirroring the torso/head Stun Location block above - see the Disable Attack macro.
    const attackDisabledData = token.actor.getFlag(MAGCM_MODULE_ID, "attackDisabledBy");
    if (attackDisabledData && Number(attackDisabledData.turnsRemaining) > 0) {
        const turnsLabel = Number(attackDisabledData.turnsRemaining) === 1 ? "1 turn" : `${attackDisabledData.turnsRemaining} turns`;
        return ui.notifications.warn(`${token.actor.name} cannot attack: ${attackDisabledData.effectType} by ${attackDisabledData.attackerName || "an opponent"} (${turnsLabel} remaining).`);
    }

    // Helper function to handle engagement updates locally or delegate via socket to GM
    async function setEngagementFlag(actorObj, targetId, flagData) {
        if (actorObj.canUserModify(game.user, "update")) {
            if (flagData === null) {
                await actorObj.unsetFlag(MAGCM_MODULE_ID, `engagements.${targetId}`);
                const remaining = actorObj.getFlag(MAGCM_MODULE_ID, "engagements") || {};
                if (Object.keys(remaining).length === 0) {
                    await actorObj.unsetFlag(MAGCM_MODULE_ID, "engagements");
                }
            } else {
                let engagements = foundry.utils.duplicate(actorObj.getFlag(MAGCM_MODULE_ID, "engagements") || {});
                engagements[targetId] = flagData;
                await actorObj.setFlag(MAGCM_MODULE_ID, "engagements", engagements);
            }
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateEngagement",
                actorId: actorObj.id,
                targetId: targetId,
                flagData: flagData
            });
        }
    }

    // Retrieve module setting for reach mechanics (defaulting to false if unregistered)
    let enableReach = false;
    try {
        enableReach = game.settings.get(MAGCM_MODULE_ID, "enableReachMechanics") ?? false;
    } catch (e) {
        console.warn(`${MAGCM_MODULE_ID} | 'enableReachMechanics' setting not found. Defaulting reach mechanics to disabled.`);
    }

    const targetTokens = [...game.user.targets].filter(t => t?.actor);
    const targetToken = targetTokens[0] || game.user.targets.first();
    const targetActors = targetTokens.map(t => t.actor).filter(Boolean);
    const defaultTargetActor = targetActors.length > 1 ? targetActors[1] : (targetActors[0] || token.actor);
    const augmentActors = getMAGCMAugmentActorOptions(token.actor, targetActors);
    const defaultAugmentActor = token.actor;
    const augmentSkillEntries = getMAGCMAugmentOptionsForActor(defaultAugmentActor);

    const skillArray = token.actor.items.filter(skill => skill.type === "combatStyle" || (skill.type === "standardSkill" && skill.name.toLowerCase() === "unarmed")).sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === "combatStyle" ? -1 : 1;
    });

    const augArray = getMAGCMActorSkillOptions(token.actor);
    const augmentSkillOptionsHtml = augmentSkillEntries.length > 0
        ? buildMAGCMAugmentSkillOptions(augmentSkillEntries)
        : `<option value="">No target skills available</option>`;

    const weaponArray = token.actor.items.filter(weapon => {
        if (weapon.type !== "melee-weapon" && weapon.type !== "ranged-weapon") return false;
        const holdingLocations = weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations") || [];
        return holdingLocations.length > 0 || Boolean(weapon.system?.equipped ?? weapon.system?.isEquipped);
    });

    // Entangled arms block attacking with weapons held there; other entangled locations only add a Roll Modifiers penalty
    const entangledLocations = token.actor.items.filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "entangledBy"));
    const entangledArmIds = new Set(entangledLocations.filter(loc => /arm/i.test(loc.name)).map(loc => loc.id));
    // Stunned locations are tracked via a hit-location flag (see stunnedBy icon overlay) rather than an ActiveEffect
    const stunnedLocationIds = new Set(
        token.actor.items
            .filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "stunnedBy"))
            .map(i => i.id)
    );
    weaponArray.forEach(weapon => {
        const holdingLocations = weapon.getFlag?.(MAGCM_MODULE_ID, "holdingLocations") || [];
        weapon._pinned = Boolean(weapon.getFlag?.(MAGCM_MODULE_ID, "pinned"));
        weapon._impaled = weapon.type === "melee-weapon" && Boolean(weapon.getFlag?.(MAGCM_MODULE_ID, "impaled"));
        weapon._entangledBlocked = holdingLocations.some(locId => entangledArmIds.has(locId));
        weapon._stunnedBlocked = holdingLocations.some(locId => stunnedLocationIds.has(locId));
        const hpValue = weapon.system?.hp;
        weapon._broken = hpValue !== undefined && hpValue !== "" && Number(hpValue) <= 0;
        weapon._rangeBlocked = false;

        // Ranged weapons must be fully loaded (current load progress >= required load) before they can be selected to attack
        if (weapon.type === "ranged-weapon") {
            const requiredLoad = Number(weapon.system?.load) || 0;
            const currentLoad = Number(weapon.getFlag?.(MAGCM_MODULE_ID, "loadProgress")) || 0;
            weapon._notLoaded = requiredLoad > 0 && currentLoad < requiredLoad;
        } else {
            weapon._notLoaded = false;
        }
    });

    function getWeaponDisableReasons(weapon) {
        if (!weapon) return [];
        const reasons = [];
        if (weapon._broken) reasons.push("Broken");
        if (weapon._pinned) reasons.push("Pinned");
        if (weapon._impaled) reasons.push("Impaling another target");
        if (weapon._entangledBlocked) reasons.push("Entangled arm");
        if (weapon._stunnedBlocked) reasons.push("Stunned limb");
        if (weapon._rangeBlocked) reasons.push("Reach too short");
        if (weapon._notLoaded) reasons.push("Not loaded");
        return reasons;
    }

    // Unarmed is always a valid fallback (broken/entangled/unheld weapons shouldn't strand the attacker with no options)
    const hasUsableWeapon = weaponArray.some(w => !w._entangledBlocked && !w._broken);
    const unarmedFallback = {
        name: "Unarmed/Improvised",
        type: "melee-weapon",
        damageRoll: token.actor.damageMod || "1d3",
        system: { reach: "T", size: "S", force: "S" }
    };
    unarmedFallback._entangledBlocked = false;
    unarmedFallback._broken = false;
    weaponArray.push(unarmedFallback);

    const skillOptions = skillArray.map(i => {
        const isUnarmedSkill = i.type === "standardSkill" && i.name.toLowerCase() === "unarmed";
        const selected = !hasUsableWeapon && isUnarmedSkill ? "selected" : "";
        return `<option ${selected}>${i.name}</option>`;
    });
    const augOptions = augArray.map(i => `<option>${i.name}</option>`);
    const weaponOptions = weaponArray.map(i => {
        const reasons = getWeaponDisableReasons(i);
        const blocked = reasons.length > 0;
        const reason = blocked ? `Cannot attack: ${reasons.join(", ")}.` : "";
        const suffix = blocked ? ` (${reasons.join(", ")})` : "";
        const selected = !hasUsableWeapon && i === unarmedFallback ? "selected" : "";
        return `<option data-base-name="${i.name}" ${blocked ? "disabled" : ""} ${selected} title="${reason}">${i.name}${suffix}</option>`;
    });

    const rangeScale = { "T": 0, "S": 1, "M": 2, "L": 3, "VL": 4, "Touch": 0, "Short": 1, "Medium": 2, "Long": 3, "Very Long": 4 };
    const rangeDisplay = { "T": "Touch", "S": "Short", "M": "Medium", "L": "Long", "VL": "Very Long", "Touch": "Touch", "Short": "Short", "Medium": "Medium", "Long": "Long", "Very Long": "Very Long" };

    const sizeScale = ["S", "M", "L", "H", "E", "BE"];
    const sizeMap = { "S": 0, "M": 1, "L": 2, "H": 3, "E": 4, "BE": 5, "Small": 0, "Medium": 1, "Large": 2, "Huge": 3, "Enormous": 4, "Colossal": 5 };
    const sizeDisplay = { "S": "Small", "M": "Medium", "L": "Large", "H": "Huge", "E": "Enormous", "BE": "Beyond Enormous", "Small": "Small", "Medium": "Medium", "Large": "Large", "Huge": "Huge", "Enormous": "Enormous", "Colossal": "Colossal" };

    const initialSkill = skillArray.length > 0 ? skillArray[0] : null;
    let modText = "No Penalties";
    let isModTextVisible = false;

    if (initialSkill && token.actor?.sheet?.roller?.getSkillRollModifiers) {
        try {
            const modifiersList = typeof globalThis.MAGCM_getSkillRollModifiers === "function"
                ? globalThis.MAGCM_getSkillRollModifiers(token.actor, initialSkill)
                : token.actor.sheet.roller.getSkillRollModifiers(initialSkill);
            if (modifiersList && modifiersList.length > 0) {
                modText = modifiersList.map(m => `<strong>${m.name}:</strong><br/> ${m.value}`).join('<br/>');
                isModTextVisible = true;
            }
        } catch (e) {
            console.warn("Could not retrieve roll modifiers", e);
        }
    }

    // Combines the sheet's own roll modifiers with the Charging note added by this module
    function composeModifiersText(chargingActive) {
        const parts = [];
        if (isModTextVisible) parts.push(modText);
        if (chargingActive) parts.push(`<strong>Charging:</strong><br /> One Step Penalty`);
        return parts.length > 0 ? parts.join('<br/>') : "No Penalties";
    }
    const escapeTooltip = escapeMAGCMTooltipAttr;

    let chatModHtml = "";
    // Must be a plain div (not a <tr>): it is spliced directly into a <div>, and a <tr> outside of a
    // <table> is dropped by the HTML parser, silently breaking the dynamic Charging modifier note below.
    const modHtml = `
        <div id="rollModifiersRow" style="${isModTextVisible ? "" : "display:none;"} margin-bottom: 8px;">
            <span class="tooltip rollModifiers" data-tooltip="${escapeTooltip(composeModifiersText(false))}" style="cursor: help; color: #e1a100; font-weight: bold;">
                Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
            </span>
        </div>`;

    // Conditionally render the Range Row in the dialog table as a static display label
    const rangeRowHtml = enableReach ? `
    <tr id="rangeRow">
        <th>Current Range</th>
        <td id="combatRangeValue" style="font-weight: bold;">-</td>
    </tr>` : "";

    const d = new Dialog({
        title: "Attack Roll",
        content: `<form style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
                    <div class="magcm-dialog-body" style="flex: 1; overflow-y: auto; padding-right: 4px; padding-left: 5px; padding-top: 5px;">
                        ${modHtml}
                        <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                            <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Target & Style</legend>
                            <table style="width: 100%; text-align: left; font-size: 0.9em;">
                                ${targetTokens.length > 1 ? `<tr><th>Target Token</th><td><select id="attackTargetToken" style="width: 100%;">${targetTokens.map((t, index) => `<option value="${t.id}" ${index === 0 ? "selected" : ""}>${t.name}</option>`).join("")}</select></td></tr>` : ""}
                                <tr><th>Target</th><td id="targetNameValue" style="font-weight: bold;">${targetToken?.name || "-"}</td></tr>
                                <tr><th>Combat Style</th><td><select id="skillToRoll" style="width: 100%;">${skillOptions.join("")}</select></td></tr>
                            </table>
                        </fieldset>

                        <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                            <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Weapon & Difficulty</legend>
                            <table style="width: 100%; text-align: left; font-size: 0.9em;">
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
                                <tr id="unarmedDamageRow" style="display:none;">
                                    <th>Damage Formula</th>
                                    <td><input type="text" id="unarmedDamageFormula" value="1d3" style="width: 100px;"></td>
                                </tr>
                                <tr id="unarmedReachRow" style="display:none;">
                                    <th>Reach</th>
                                    <td>
                                        <select id="unarmedReach">
                                            <option value="T" selected>Touch</option>
                                            <option value="S">Short</option>
                                            <option value="M">Medium</option>
                                            <option value="L">Long</option>
                                            <option value="VL">Very Long</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr id="unarmedSizeRow" style="display:none;">
                                    <th>Size</th>
                                    <td>
                                        <select id="unarmedSize">
                                            <option value="S" selected>Small</option>
                                            <option value="M">Medium</option>
                                            <option value="L">Large</option>
                                            <option value="H">Huge</option>
                                            <option value="E">Enormous</option>
                                            <option value="BE">Beyond Enormous</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr id="unarmedCombatEffectsRow" style="display:none;">
                                    <th>Combat Effects</th>
                                    <td><input type="text" id="unarmedCombatEffects" placeholder="e.g. Bash, Stun Location" style="width: 100%;"></td>
                                </tr>
                                <tr id="rangedStatsRow">
                                    <th>Ranged Status</th>
                                    <td id="rangedStatsValue" style="font-weight: bold;">-</td>
                                </tr>
                                ${rangeRowHtml}
                            </table>
                        </fieldset>

                        <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                            <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Modifiers & Resources</legend>
                            <table style="width: 100%; text-align: left; font-size: 0.9em;">
                                <tr>
                                    <th>Spend AP</th>
                                    <td><input type="checkbox" id="spend-ap"></td>
                                </tr>
                                <tr>
                                    <th>Spend Luck Point</th>
                                    <td><input type="checkbox" id="spend-luck"></td>
                                </tr>
                                <tr>
                                    <th>Reduce Ammo by 1</th>
                                    <td><input id="ammoReduction" type="checkbox" checked></td>
                                </tr>
                                <tr>
                                    <th>Charging?</th>
                                    <td><input type="checkbox" id="isCharging"></td>
                                </tr>
                                <tr id="chargeTypeRow" style="display:none;">
                                    <th>Charge Type</th>
                                    <td>
                                        <select id="chargeType">
                                            <option value="contact">Into Contact</option>
                                            <option value="through">Through Contact</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr id="chargeDamageStepRow" style="display:none;">
                                    <th>Damage Mod. Increase</th>
                                    <td>
                                        <select id="chargeDamageStep">
                                            <option value="1">One Step</option>
                                            <option value="2">Two Steps</option>
                                        </select>
                                    </td>
                                </tr>
                                <tr>
                                    <th>Damage Mod. Substitute?</th>
                                    <td><input type="checkbox" id="damageModSubToggle"></td>
                                </tr>
                                <tr id="damageModSubRow" style="display:none;">
                                    <th>Substitute Value</th>
                                    <td><input type="text" id="damageModSubValue" placeholder="e.g. 1d4+2" style="width: 100px;"></td>
                                </tr>
                            </table>
                        </fieldset>

                        <fieldset style="border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                            <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Augmentation</legend>
                            <table style="width: 100%; text-align: left; font-size: 0.9em;">
                                <tr>
                                    <th>Augment combat style</th>
                                    <td><input type="checkbox" id="Augment"></td>
                                </tr>
                                <tr>
                                    <th>Augment character</th>
                                    <td><select id="augCharacter" style="width: 100%;">${buildMAGCMAugmentActorOptions(augmentActors, defaultAugmentActor.id)}</select></td>
                                </tr>
                                <tr>
                                    <th>Augment with</th>
                                    <td><select id="augSkill" style="width: 100%;">${augmentSkillOptionsHtml}</select></td>
                                </tr>
                                <tr>
                                    <th>Cap by own skill?</th>
                                    <td><input type="checkbox" id="attackCapSkillToggle"></td>
                                </tr>
                                <tr>
                                    <th>Cap skill</th>
                                    <td><select id="attackCapSkill" style="width: 100%;">${augArray.map(i => `<option value="${i.id}">${i.name} (${getMAGCMSkillValue(i)}%)</option>`).join("")}</select></td>
                                </tr>
                                <tr>
                                    <th>Custom Augment Value:</th>
                                    <td><input type="number" value="0" id="custom-augment" style="width: 100%; text-align: center;"></td>
                                </tr>
                            </table>
                        </fieldset>
                    </div>
                  </form>`,
        buttons: {
            one: {
                label: "Roll Attack",
                callback: async (html) => {
                    const actor = token.actor;
                    const selectedTargetId = html.find('#attackTargetToken').val() || game.user.targets.first()?.id;
                    const activeTarget = game.user.targets.find(t => t.id === selectedTargetId) || game.user.targets.first();
                    if (!activeTarget) return ui.notifications.info("Please target the token that you wish to attack.");

                    let weaponName = html.find(`[id="weaponToRoll"]`).val();
                    const weapon = weaponArray.find(i => i.name === weaponName) || weaponArray[0];

                    const staticDisableReasons = getWeaponDisableReasons(weapon).filter(reason => reason !== "Reach too short for current range");
                    if (staticDisableReasons.length > 0) {
                        ui.notifications.warn(`${weapon.name} cannot be used to attack (${staticDisableReasons.join(", ")}).`);
                        return;
                    }

                    if (weapon.type === "ranged-weapon") {
                        const requiredLoad = Number(weapon.system?.load) ?? 1;
                        const currentLoad = weapon.getFlag(MAGCM_MODULE_ID, "loadProgress") ?? 0;
                        if (requiredLoad > 0 && currentLoad < requiredLoad) {
                            ui.notifications.warn(`${weapon.name} is not loaded (${currentLoad}/${requiredLoad} Load actions completed). Use Load Weapon first!`);
                            return;
                        }
                    }

                    let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
                    if (currentAP === undefined) {
                        currentAP = foundry.utils.getProperty(actor, "system.currentActionPoints") ?? 0;
                    }
                    currentAP = Number(currentAP);
                    let newAP = currentAP;

                    if (currentAP <= 0) {
                        ui.notifications.warn(`${token.name} has no Action Points left to attack!`);
                        return;
                    }

                    const reduceAmmo = html.find(`[id="ammoReduction"]`)[0].checked;
                    let remainingAmmo = weapon.system?.ammo ?? 0;

                    if (weapon.type === "ranged-weapon" && reduceAmmo) {
                        if (remainingAmmo <= 0) {
                            ui.notifications.info("You are out of ammunition for this weapon, please select another weapon.");
                            return;
                        }
                        remainingAmmo -= 1;
                        await weapon.update({ "system.ammo": remainingAmmo });
                    }

                    const skillToRollName = html.find(`[id="skillToRoll"]`).val();
                    const skillToRoll = skillArray.find(i => i.name === skillToRollName);
                    const augSkillValueKey = html.find(`[id="augSkill"]`).val();
                    const selectedAugmentActor = augmentActors.find(candidate => candidate.id === html.find('#augCharacter').val()) || defaultAugmentActor;
                    const selectedAugmentSkillEntries = getMAGCMAugmentOptionsForActor(selectedAugmentActor);
                    const augSkillEntry = selectedAugmentSkillEntries.find(option => option.valueKey === augSkillValueKey) || null;
                    const augSkill = augSkillEntry ? augSkillEntry.skill : null;
                    const cb = html.find(`[id="Augment"]`)[0].checked;
                    const customValue = Number(html[0].querySelector('#custom-augment').value);
                    const useCap = html.find('#attackCapSkillToggle').is(':checked');
                    const capSkillItem = token.actor.items.get(html.find('#attackCapSkill').val()) || null;
                    const spendLuck = html.find(`[id="spend-luck"]`).is(':checked');

                    if (spendLuck && !await globalThis.MAGCM_spendLuckPoint(actor)) return;

                    const isCharging = html.find(`[id="isCharging"]`).is(':checked');
                    const chargeType = html.find(`[id="chargeType"]`).val();
                    const chargeDamageStep = Number(html.find(`[id="chargeDamageStep"]`).val()) || 1;
                    const useDamageModSub = html.find(`[id="damageModSubToggle"]`).is(':checked');
                    const damageModSubRaw = String(html.find(`[id="damageModSubValue"]`).val() || "").trim();

                    const damageModifierPattern = /^[+-]?(\d*d\d+|\d+)([+-](\d*d\d+|\d+))*$/i;
                    if (useDamageModSub && !damageModifierPattern.test(damageModSubRaw)) {
                        ui.notifications.warn(`Invalid Damage Modifier Substitute value: "${damageModSubRaw}". Expected a format like "1d4+2" or "2d6".`);
                        return;
                    }

                    let attackerRangeName = "Medium";
                    let hasExistingEngagementRange = false;
                    if (enableReach) {
                        attackerRangeName = html.find('#combatRangeValue').text() || "Medium";
                        const engagements = actor.getFlag(MAGCM_MODULE_ID, "engagements") || {};
                        const targetActorId = activeTarget?.actor?.id;
                        const engagementData = targetActorId ? engagements[targetActorId] : (activeTarget ? engagements[activeTarget.id] : null);
                        const rawExistingRange = typeof engagementData === "object" ? engagementData?.range : engagementData;
                        hasExistingEngagementRange = Boolean(rawExistingRange);

                        // Charging through contact carries the attacker past the target, so no lasting engagement is formed
                        if (!(isCharging && chargeType === 'through') && activeTarget?.actor && (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed')) {
                            const targetActor = activeTarget.actor;
                            const sourceEngagements = engagements;

                            if (!sourceEngagements[targetActor.id]) {
                                const sourceData = {
                                    name: activeTarget.name || targetActor.name,
                                    img: activeTarget.document?.texture?.src || activeTarget.texture?.src || targetActor.img,
                                    range: attackerRangeName
                                };
                                const targetData = {
                                    name: token.name || actor.name,
                                    img: token.document?.texture?.src || token.texture?.src || actor.img,
                                    range: attackerRangeName
                                };

                                await setEngagementFlag(actor, targetActor.id, sourceData);
                                await setEngagementFlag(targetActor, actor.id, targetData);

                                canvas.tokens.placeables.forEach(t => t.refresh());
                            }
                        }
                    }

                    if (enableReach && hasExistingEngagementRange && weapon?.id && weapon.type === "melee-weapon") {
                        const rangeVal = rangeScale[attackerRangeName] ?? 1;
                        const reachVal = rangeScale[weapon.system?.reach || "S"] ?? 1;
                        if (rangeVal > reachVal + 1) {
                            ui.notifications.warn(`${weapon.name} cannot be used to attack at ${attackerRangeName} range because its reach is too short.`);
                            return;
                        }
                    }

                    const diffMult = Number(html.find(`[id="rollDifficulty"]`).val());
                    const spendAP = html.find(`[id="spend-ap"]`)[0].checked;
                    let actionPointReducedLabel = "";

                    if (spendAP) {
                        newAP = currentAP - 1;
                        actionPointReducedLabel = `<p style="font-size: 0.85em; color: var(--color-text-dark-secondary); margin-top: 4px;">Action Points reduced by 1. ${newAP} Action Points remaining.</p>`;
                        await actor.update({
                            "system.trackedStats.actionPoints.value": String(newAP),
                            "system.currentActionPoints": newAP,
                            "system.attributes.actionPoints.value": newAP
                        });
                    }

                    let combatStyleValue = getSkillValue(skillToRoll);
                    if (cb) {
                        if (customValue !== 0) combatStyleValue = Number(getSkillValue(skillToRoll) + customValue);
                        else if (augSkill) combatStyleValue = Number(Math.ceil(getSkillValue(augSkill) * 0.2) + getSkillValue(skillToRoll));
                    }
                    if (useCap) {
                        combatStyleValue = getMAGCMEffectiveSkillWithCap(combatStyleValue, capSkillItem);
                    }

                    let diffValue = Math.ceil(combatStyleValue * diffMult);

                    // Damage Modifier Substitute takes priority; otherwise a charge temporarily bumps the actor's damage mod steps
                    let effectiveDamageModifierStr = actor.damageMod;
                    if (useDamageModSub) {
                        effectiveDamageModifierStr = damageModSubRaw;
                    } else if (isCharging) {
                        const originalDamageModStep = foundry.utils.getProperty(actor, "system.attributes.damageMod.mod");
                        await actor.update({ "system.attributes.damageMod.mod": Number(originalDamageModStep || 0) + chargeDamageStep });
                        effectiveDamageModifierStr = actor.damageMod;
                        await actor.update({ "system.attributes.damageMod.mod": originalDamageModStep });
                    }

                    // Track the weapon-only portion of the damage formula separately from the Damage Modifier
                    // portion so the attack card's damage tooltip can clearly label which dice belong to which.
                    let weaponBaseFormula = weapon.system?.damageModifier ? weapon.system.damage : weapon.damageRoll;
                    let modifierFormulaStr = weapon.system?.damageModifier ? (effectiveDamageModifierStr || "") : "";
                    let weaponDamage = modifierFormulaStr ? `${weaponBaseFormula}+${modifierFormulaStr}` : weaponBaseFormula;
                    let weaponReachName = weapon.system?.reach || "S";
                    let weaponSizeName = weapon.system?.size || "M";
                    let weaponForceName = weapon.system?.force || "S";
                    let weaponImpaleSizeName = weapon.system?.["impale-size"] || "S";

                    // No usable weapon selected: use the custom damage/reach/size fields instead of the weapon's own stats
                    if (!weapon.id) {
                        const customDamageFormula = String(html.find(`[id="unarmedDamageFormula"]`).val() || "").trim();
                        weaponBaseFormula = customDamageFormula || "1d3";
                        modifierFormulaStr = effectiveDamageModifierStr ? String(effectiveDamageModifierStr).trim() : "";
                        weaponDamage = modifierFormulaStr
                            ? `${weaponBaseFormula}${modifierFormulaStr.startsWith("+") || modifierFormulaStr.startsWith("-") ? modifierFormulaStr : `+${modifierFormulaStr}`}`
                            : weaponBaseFormula;
                        weaponReachName = html.find(`[id="unarmedReach"]`).val() || "T";
                        weaponSizeName = html.find(`[id="unarmedSize"]`).val() || "S";
                    }

                    // If the Unarmed skill is chosen while a real weapon is still selected, treat the attack as bare-handed;
                    // when the Unarmed fallback itself is selected, its custom damage/reach/size fields already apply above.
                    if (skillToRollName.toLowerCase() === 'unarmed' && weapon.id) {
                        weaponName = `Unarmed/Improvised`;
                        weaponBaseFormula = "";
                        modifierFormulaStr = effectiveDamageModifierStr || "";
                        weaponDamage = effectiveDamageModifierStr;
                        weaponReachName = "T";
                        weaponSizeName = "S";
                    }

                    let rangeVal = rangeScale[attackerRangeName] ?? 1;
                    let reachVal = rangeScale[weaponReachName] ?? 1;
                    let sizeVal = sizeMap[weaponSizeName] ?? 1;
                    if (isCharging) sizeVal = Math.min(sizeScale.length - 1, sizeVal + 1);

                    let effectiveDamage = weaponDamage;
                    let effectiveWeaponFormula = weaponBaseFormula;
                    let effectiveModifierFormula = modifierFormulaStr;
                    let effectiveSizeName = isCharging ? (sizeScale[sizeVal] ?? weaponSizeName) : weaponSizeName;
                    let reachPenaltyTriggered = false;

                    // Only evaluate reach penalties if reach mechanics are enabled
                    if (enableReach && (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed')) {
                        if (rangeVal < reachVal - 1) {
                            reachPenaltyTriggered = true;
                            const dmod = effectiveDamageModifierStr ? String(effectiveDamageModifierStr).trim() : "";
                            const baseDmg = "1d3+1";
                            effectiveWeaponFormula = baseDmg;
                            effectiveModifierFormula = dmod;
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
                    await combatRoll.evaluate();

                    let resultLabel = "";
                    let baseResultLabel = "";

                    if (combatRoll.result <= Math.ceil(diffValue * 0.1)) {
                        resultLabel = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                        baseResultLabel = "Critical";
                    } else if (combatRoll.result == 99 || combatRoll.result == 100) {
                        resultLabel = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                        baseResultLabel = "Fumble";
                    } else if (combatRoll.result <= diffValue && combatRoll.result <= 95) {
                        resultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                        baseResultLabel = "Success";
                    } else {
                        resultLabel = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                        baseResultLabel = "Failure";
                    }

                    function createDamageButton(className, label) {
                        return `<button type="button" class="${className} submit-damage" disabled
                                  data-target-token="${activeTarget.id}"
                                  data-target-name="${activeTarget.name}"
                                  data-attacker-name="${token.name}"
                                  data-attacker-uuid="${actor.uuid}"
                                  data-attacker-actor-id="${actor.id}"
                                  data-attacker-token="${token.id}"
                                  data-hit-location-name="Unknown Location"
                                  data-weapon-name="${weaponName}"
                                  data-weapon-id="${weapon.id || ""}"
                                  data-weapon-size="${weapon.system?.size || weapon.system?.["impale-size"] || "Unknown"}"
                                  data-damage-modifier="${weapon.system?.damageModifier === true}"
                                  data-damage=""
                                  data-damage-formula="${effectiveDamage}"
                                  data-armor="0"
                                  data-natural-armor="0"
                                  data-hit-location-id="">
                                  ${label}
                              </button>`;
                    }

                    const combatEffects = weapon.id
                        ? (weapon.system?.["combat-effects"] ?? weapon.system?.combatEffects ?? "")
                        : String(html.find(`[id="unarmedCombatEffects"]`).val() || "");
                    const combatEffectsText = (Array.isArray(combatEffects) ? combatEffects.join(",") : String(combatEffects)).toLowerCase();
                    const canImpale = combatEffectsText.includes("impale");
                    const canSunder = combatEffectsText.includes("sunder");
                    const canEntangle = combatEffectsText.includes("entangle");
                    const canStunLocation = combatEffectsText.includes("stun location");
                    let applyDamageButton = createDamageButton('simple-damage', 'Apply Damage');
                    let chooseLocationButton = createDamageButton('choose-location', 'Choose Location');
                    let penaltyNotice = reachPenaltyTriggered
                        ? `<div class="attack-card-notice"><i class="fas fa-triangle-exclamation"></i> Weapon inside Reach limit: Damage reduced to 1d3+1. Size reduced by steps.</div>` : "";

                    let chargeNotice = isCharging
                        ? `<div class="attack-card-notice"><i class="fas fa-triangle-exclamation"></i> Charging ${chargeType === 'through' ? 'Through' : 'Into'} Contact (Damage Modifier +${chargeDamageStep} Step${chargeDamageStep > 1 ? 's' : ''}, Size +1 Step).</div>`
                        : "";
                    let damageModSubNotice = useDamageModSub
                        ? `<div class="attack-card-notice"><i class="fas fa-triangle-exclamation"></i> Damage Modifier Substituted: ${damageModSubRaw}</div>`
                        : "";

                    chatModHtml = (isModTextVisible || isCharging) ? `
                        <div style="text-align: center; margin-bottom: 5px;">
                            <span class="tooltip rollModifiers" data-tooltip="${escapeTooltip(composeModifiersText(isCharging))}" style="cursor: help; color: #e1a100; font-weight: bold;">
                                Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                            </span>
                        </div>` : "";

                    let displayReach = rangeDisplay[weaponReachName] || weaponReachName;
                    let displaySize = sizeDisplay[effectiveSizeName] || effectiveSizeName;
                    let displayForce = sizeDisplay[weaponForceName] || weaponForceName;
                    let displayImpaleSize = sizeDisplay[weaponImpaleSizeName] || weaponImpaleSizeName;

                    // Maximise Damage (special effect) only applies to the weapon's own leading dice term, and only on a Critical
                    const leadingDiceMatch = String(effectiveDamage).trim().match(/^(\d*)d(\d+)/i);
                    const maxDiceStacks = leadingDiceMatch ? (parseInt(leadingDiceMatch[1] || "1", 10)) : 0;
                    let maximiseDamageHtml = "";
                    if (baseResultLabel === "Critical" && maxDiceStacks > 0) {
                        const stackOptions = Array.from({ length: maxDiceStacks + 1 }, (_, i) => `<option value="${i}">${i}</option>`).join("");
                        maximiseDamageHtml = `
                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 5px;">
                            <label for="maximise-damage-select" style="font-size: 0.85em;">Maximise Damage (dice):</label>
                            <select class="maximise-damage-select" id="maximise-damage-select" data-max-stacks="${maxDiceStacks}">${stackOptions}</select>
                        </div>`;
                    }

                    let statsInfoItems = [];
                    const combatEffectsDisplay = (Array.isArray(combatEffects) ? combatEffects.join(", ") : String(combatEffects)).trim();
                    statsInfoItems.push({ label: "Combat Style", value: skillToRoll.name });
                    statsInfoItems.push({ label: "Weapon", value: weaponName });
                    if (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed') {
                        if (enableReach) {
                            statsInfoItems.push({ label: "Range", value: attackerRangeName });
                            statsInfoItems.push({ label: "Reach", value: displayReach });
                        }
                        statsInfoItems.push({ label: "Size", value: displaySize });
                    } else if (weapon.type === "ranged-weapon") {
                        statsInfoItems.push({ label: "Force", value: displayForce });
                        statsInfoItems.push({ label: "Impale Size", value: displayImpaleSize });
                        statsInfoItems.push({ label: "Ammo Left", value: remainingAmmo });
                    }
                    statsInfoItems.push({ label: "Combat Effects", value: combatEffectsDisplay || "None" });
                    const statsInfoHtml = buildMAGCMStatsRowHtml(statsInfoItems);

                    let diffText = "Standard";
                    let diffIndex = 2;
                    switch (String(diffMult)) {
                        case "2": diffText = "Very Easy"; diffIndex = 0; break;
                        case "1.5": diffText = "Easy"; diffIndex = 1; break;
                        case "1": diffText = "Standard"; diffIndex = 2; break;
                        case "0.67": diffText = "Hard"; diffIndex = 3; break;
                        case "0.5": diffText = "Formidable"; diffIndex = 4; break;
                        case "0.1": diffText = "Herculean"; diffIndex = 5; break;
                    }

                    let augString = "";
                    if (cb) {
                        const augValue = customValue !== 0 ? customValue : (augSkill ? Math.ceil(getSkillValue(augSkill) * 0.2) : 0);
                        const augLabel = customValue !== 0 ? `Custom Value (${customValue})` : (augSkillEntry ? `${augSkillEntry.actor.name}'s ${augSkillEntry.skill.name}` : "Selected skill");
                        augString = `Augmented by ${augLabel}: ${formatMAGCMSignedValue(augValue)}`;
                    }
                    if (useCap && capSkillItem) {
                        augString += ` | Capped by ${capSkillItem.name} (${getSkillValue(capSkillItem)}%)`;
                    }
                    // augString may start with a stray " | " when only a cap (no augment) was applied - strip that for display purposes
                    const augmentTooltipLine = augString.replace(/^\s*\|\s*/, "").trim() || "None";

                    // Gather properties for parry/evade specific effects pass
                    let attackerWeaponType = weapon.type === "ranged-weapon" ? "ranged" : "melee";
                    let attackerWeaponTraits = combatEffectsText;
                    let attackerStyleTraits = skillToRoll.system?.traits || "";

                    const attackRollPillHtml = buildMAGCMRollResultPillHtml({
                        rollTotal: combatRoll.result,
                        resultLabel: baseResultLabel,
                        skillName: skillToRoll.name,
                        effectiveSkillValue: combatStyleValue,
                        diffText,
                        targetValue: diffValue,
                        augmentLine: augmentTooltipLine
                    });

                    let contentString = `
                        <div class="attack-card" data-attacker-user-id="${game.user.id}">
                        <div class="attack-card-header">
                            ${buildMAGCMCombatantsRowHtml(token.name, "Attacker", activeTarget.name, "Target")}
                            ${statsInfoHtml}
                            ${penaltyNotice}
                            ${chargeNotice}
                            ${damageModSubNotice}
                            ${chatModHtml}
                            <div class="attack-card-roll">
                                <div class="attack-card-roll__label">Attack Roll<span class="attack-card-roll__diff"> (${diffText})</span></div>
                                ${attackRollPillHtml}
                            </div>
                        </div>
                        <div style="margin: 0 0 5px 0;">
                            <div class="attack-staging-controls" style="display: flex; justify-content: center; gap: 5px; flex-wrap: wrap;">
                                <button type="button" class="roll-hit-location" data-target-token="${activeTarget.id}">Roll Hit Location</button>
                                <button type="button" class="roll-attack-damage" data-damage-formula="${effectiveDamage}" data-weapon-formula="${effectiveWeaponFormula}" data-modifier-formula="${effectiveModifierFormula}">Roll Damage</button>                                
                                ${chooseLocationButton}
                                <button type="button" class="reroll-attack-damage" data-damage-formula="${effectiveDamage}" data-weapon-formula="${effectiveWeaponFormula}" data-modifier-formula="${effectiveModifierFormula}" disabled>Re-roll Damage</button>
                            </div>
                            ${maximiseDamageHtml}
                        </div>

                        <div class="damageElement revealed" style="display: flex; flex-direction: column; justify-content: center; gap: 5px; padding: 5px 0 0 0;">
                            <div class="attack-info-row">
                                <div class="attack-info-row__label">Hit Location:</div>
                                <div class="attack-hit-location-result attack-info-pill attack-location-result-value" data-magcm-tooltip="">Not rolled</div>
                            </div>
                            <div class="attack-info-row">
                                <div class="attack-info-row__label">Worn Armor:</div>
                                <div class="attack-location-armor attack-info-pill attack-armor-result-value" data-magcm-tooltip="">Not rolled</div>
                            </div>
                            <div class="attack-info-row">
                                <div class="attack-info-row__label">Weapon Damage:</div>
                                <div><span class="attack-damage-result">Not rolled</span></div>
                            </div>
                            <div class="attack-toggle-grid">
                                ${baseResultLabel === "Critical" ? `<label class="attack-toggle-chip"><input type="checkbox" class="attack-bypass-worn-armor"> Bypass Worn Armor</label>` : ""}
                                ${baseResultLabel === "Critical" ? `<label class="attack-toggle-chip"><input type="checkbox" class="attack-bypass-natural-armor"> Bypass Natural Armor</label>` : ""}
                                <label class="attack-toggle-chip"><input type="checkbox" class="attack-half-damage"> Half Damage</label>
                                ${canImpale ? `<label class="attack-toggle-chip"><input type="checkbox" class="attack-impale-toggle"> Impale</label>` : ""}
                                ${canSunder ? `<label class="attack-toggle-chip"><input type="checkbox" class="attack-sunder-toggle"> Sunder</label>` : ""}
                                ${canEntangle ? `<label class="attack-toggle-chip"><input type="checkbox" class="attack-entangle-toggle"> Entangle</label>` : ""}
                                ${canStunLocation ? `<label class="attack-toggle-chip"><input type="checkbox" class="attack-stun-location-toggle"> Stun Location</label>` : ""}
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 4px;">
                                ${applyDamageButton}
                            </div>
                        </div>
                        ${actionPointReducedLabel}
                        <hr>                    
                        <div style="display: flex; gap: 5px; margin-top: 10px;">
                            <button type="button" class="parry-button" data-attacker-name="${token.name}" data-attacker-range="${attackerRangeName}" data-attacker-size="${effectiveSizeName}" data-attacker-result="${baseResultLabel}" data-attacker-weapon-type="${attackerWeaponType}" data-attacker-weapon-traits="${attackerWeaponTraits}" data-attacker-style-traits="${attackerStyleTraits}">Parry</button>
                            <button type="button" class="evade-button" data-attacker-name="${token.name}" data-attacker-result="${baseResultLabel}" data-attacker-weapon-type="${attackerWeaponType}" data-attacker-weapon-traits="${attackerWeaponTraits}" data-attacker-style-traits="${attackerStyleTraits}">Evade</button>
                            <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${skillToRoll.id}" data-attacker-score="${combatRoll.result}" data-attacker-result="${baseResultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}">Contest</button>
                        </div>
                        </div>`;

                    let flavortext = `Attacking ${activeTarget.name} with ${weaponName} using ${skillToRollName}`;
                    if (cb) {
                        const augVal = customValue !== 0 ? customValue : (augSkill ? Math.ceil(getSkillValue(augSkill) * 0.2) : 0);
                        const augLabel = customValue !== 0 ? "Custom" : (augSkillEntry ? `${augSkillEntry.actor.name}'s ${augSkillEntry.skill.name}` : "Selected skill");
                        flavortext += ` (${formatMAGCMSignedValue(augVal)} via ${augLabel})`;
                    }
                    if (useCap && capSkillItem) {
                        flavortext += ` (Capped by ${capSkillItem.name})`;
                    }

                    if (weapon.type === "ranged-weapon") {
                        await weapon.setFlag(MAGCM_MODULE_ID, "loadProgress", 0);
                    }

                    ChatMessage.create({ user: game.user.id, speaker: ChatMessage.getSpeaker(), flavor: flavortext, content: contentString, rolls: [combatRoll] });
                }
            },
            two: { label: "Cancel" }
        },
        default: "one",
        render: (html) => {
            const augmentCheckbox = html.find('#Augment');
            const augmentCharacterSelect = html.find('#augCharacter');
            const augmentCharacterRow = augmentCharacterSelect.closest('tr');
            const augSkillRow = html.find('#augSkill').closest('tr');
            const capToggle = html.find('#attackCapSkillToggle');
            const capSkillRow = html.find('#attackCapSkill').closest('tr');
            const customAugRow = html.find('#custom-augment').closest('tr');
            const ammoCheckbox = html.find('#ammoReduction');
            const ammoRow = ammoCheckbox.closest('tr');
            const rangeRow = html.find('#rangeRow');
            const rangedStatsRow = html.find('#rangedStatsRow');
            const rangedStatsValue = html.find('#rangedStatsValue');
            const weaponSelect = html.find('#weaponToRoll');
            const skillSelect = html.find('#skillToRoll');
            const chargingCheckbox = html.find('#isCharging');
            const chargeTypeRow = html.find('#chargeTypeRow');
            const chargeDamageStepRow = html.find('#chargeDamageStepRow');
            const damageModSubToggle = html.find('#damageModSubToggle');
            const damageModSubRow = html.find('#damageModSubRow');
            const rollModifiersRow = html.find('#rollModifiersRow');
            const rollModifiersSpan = html.find('.rollModifiers');
            const unarmedDamageRow = html.find('#unarmedDamageRow');
            const unarmedReachRow = html.find('#unarmedReachRow');
            const unarmedSizeRow = html.find('#unarmedSizeRow');
            const unarmedCombatEffectsRow = html.find('#unarmedCombatEffectsRow');

            function updateVisibility() {
                const activeTarget = game.user.targets.first();
                const targetNameHtml = activeTarget
                    ? activeTarget.name
                    : `<span style="color: darkred; font-weight: normal; font-style: italic;">No target selected</span>`;
                html.find('#targetNameValue').html(targetNameHtml);

                if (augmentCheckbox.is(':checked')) {
                    augmentCharacterRow.show();
                    augSkillRow.show();
                    customAugRow.show();
                } else {
                    augmentCharacterRow.hide();
                    augSkillRow.hide();
                    customAugRow.hide();
                }
                capSkillRow.toggle(capToggle.is(':checked'));

                const selectedWeaponName = weaponSelect.val();
                const selectedWeapon = weaponArray.find(i => i.name === selectedWeaponName) || weaponArray[0];
                const skillToRollName = skillSelect.val() || "";
                const engagements = token.actor.getFlag(MAGCM_MODULE_ID, "engagements") || {};
                const targetActorId = activeTarget?.actor?.id;
                const engagementData = targetActorId ? engagements[targetActorId] : (activeTarget ? engagements[activeTarget.id] : null);
                const rawRange = typeof engagementData === "object" ? engagementData?.range : engagementData;
                const hasExistingRange = Boolean(rawRange);
                const rangeForChecks = rawRange || "Medium";

                weaponArray.forEach(weapon => {
                    weapon._rangeBlocked = Boolean(enableReach && hasExistingRange && weapon?.id && weapon.type === "melee-weapon"
                        && ((rangeScale[rangeForChecks] ?? 1) > ((rangeScale[weapon.system?.reach || "S"] ?? 1) + 1)));
                });

                weaponSelect.find('option').each(function () {
                    const option = $(this);
                    const baseName = String(option.data('baseName') || option.text()).replace(/\s*\([^)]*\)\s*$/, "");
                    const weapon = weaponArray.find(i => i.name === baseName);
                    if (!weapon) return;
                    const reasons = getWeaponDisableReasons(weapon);
                    const blocked = reasons.length > 0;
                    const suffix = blocked ? ` (${reasons.join(", ")})` : "";
                    option.prop('disabled', blocked);
                    option.attr('title', blocked ? `Cannot attack: ${reasons.join(", ")}.` : "");
                    option.text(`${baseName}${suffix}`);
                });

                if (selectedWeapon && getWeaponDisableReasons(selectedWeapon).length > 0) {
                    const firstUsable = weaponArray.find(w => getWeaponDisableReasons(w).length === 0);
                    if (firstUsable) weaponSelect.val(firstUsable.name);
                }

                const activeWeaponName = weaponSelect.val();
                const activeWeapon = weaponArray.find(i => i.name === activeWeaponName) || weaponArray[0];

                const isUnarmedFallback = Boolean(activeWeapon && !activeWeapon.id);
                unarmedDamageRow.toggle(isUnarmedFallback);
                unarmedReachRow.toggle(isUnarmedFallback);
                unarmedSizeRow.toggle(isUnarmedFallback);
                unarmedCombatEffectsRow.toggle(isUnarmedFallback);

                if (activeWeapon && activeWeapon.type === "ranged-weapon") {
                    ammoRow.show();
                    if (enableReach) rangeRow.hide();
                    rangedStatsRow.show();
                    const requiredLoad = Number(activeWeapon.system?.load) ?? 1;
                    const currentLoad = activeWeapon.getFlag(MAGCM_MODULE_ID, "loadProgress") ?? 0;
                    const ammo = activeWeapon.system?.ammo ?? 0;
                    rangedStatsValue.text(`Load: ${currentLoad}/${requiredLoad} | Ammo: ${ammo}`);
                } else {
                    ammoRow.hide();
                    rangedStatsRow.hide();

                    if (enableReach) {
                        rangeRow.show();
                        if (rawRange) {
                            const formattedRange = rangeDisplay[rawRange] || rawRange;
                            html.find('#combatRangeValue').text(formattedRange);
                        } else {
                            let rawReach = activeWeapon.system?.reach || "M";
                            if (skillToRollName.toLowerCase() === 'unarmed') rawReach = "T";
                            const defaultRange = rangeDisplay[rawReach] || "Medium";
                            html.find('#combatRangeValue').text(defaultRange);
                        }
                    } else {
                        rangeRow.hide();
                    }
                }

                if (chargingCheckbox.is(':checked')) {
                    chargeTypeRow.show();
                    chargeDamageStepRow.show();
                } else {
                    chargeTypeRow.hide();
                    chargeDamageStepRow.hide();
                }

                damageModSubRow.toggle(damageModSubToggle.is(':checked'));

                const chargingActive = chargingCheckbox.is(':checked');
                rollModifiersSpan.attr('data-tooltip', escapeTooltip(composeModifiersText(chargingActive)));
                rollModifiersRow.toggle(isModTextVisible || chargingActive);
            }

            function updateAugmentSkills() {
                const augmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMAugmentOptionsForActor(augmentActor);
                html.find('#augSkill').html(buildMAGCMAugmentSkillOptions(options, `No skills available for ${augmentActor.name}`));
                html.find('#augSkill').val(options[0]?.valueKey || "");
            }

            weaponSelect.on('change', () => {
                const selectedWeaponName = weaponSelect.val();
                const selectedWeapon = weaponArray.find(i => i.name === selectedWeaponName);
                if (selectedWeapon && selectedWeapon.type === "ranged-weapon") {
                    ammoCheckbox.prop('checked', true);
                }
                updateVisibility();
            });

            skillSelect.on('change', () => {
                if (skillSelect.val().toLowerCase() === 'unarmed') {
                    weaponSelect.val('Unarmed/Improvised');
                }
                updateVisibility();
            });
            augmentCheckbox.on('change', updateVisibility);
            capToggle.on('change', updateVisibility);
            chargingCheckbox.on('change', updateVisibility);
            damageModSubToggle.on('change', updateVisibility);
            augmentCharacterSelect.on('change', updateAugmentSkills);
            updateAugmentSkills();
            html.find('#attackTargetToken').on('change', () => {
                const pickedId = html.find('#attackTargetToken').val();
                const selectedToken = [...game.user.targets].find(t => t.id === pickedId);
                if (selectedToken) {
                    html.find('#targetNameValue').text(selectedToken.name);
                }
            });
            updateVisibility();
        }
    }, { width: 425, height: 600, resizable: true });

    d.render(true);
}
globalThis.magcmOpenAttackDialog = magcmOpenAttackDialog;

/**
 * Mythras Unstored Items Token Popover
 * Opens a scrollable popover of unstored inventory items when Ctrl + Hovering a token.
 * Gated behind the "enableShowEquippedItemsOnToken" module setting.
 */

(function () {
    if (window._mythrasUnstoredPopoverInitialized) {
        return;
    }
    window._mythrasUnstoredPopoverInitialized = true;

    const moduleId = typeof MAGCM_MODULE_ID !== "undefined" ? MAGCM_MODULE_ID : "mythras-angrygorillas-custom-macros";
    const popoverId = "mythras-unstored-token-popover";
    
    let popoverEl = document.getElementById(popoverId);
    if (!popoverEl) {
        popoverEl = document.createElement("div");
        popoverEl.id = popoverId;
        popoverEl.style.cssText = `
            position: absolute;
            display: none;
            z-index: 100000;
            background: rgba(25, 24, 19, 0.95);
            border: 1px solid #c4a46a;
            border-radius: 4px;
            padding: 10px 12px;
            color: #f0f0e0;
            font-size: 12px;
            box-shadow: 0 6px 16px rgba(0, 0, 0, 0.6);
            max-height: 320px;
            flex-direction: column;
            overflow: hidden;
            min-width: 250px;
            box-sizing: border-box;
            pointer-events: auto;
        `;
        document.body.appendChild(popoverEl);
    }

    let activeToken = null;
    let hideTimeout = null;

    // Filter state tracking (persists while the game session is active)
    if (!window._mythrasPopoverFilterState) {
        window._mythrasPopoverFilterState = {
            "storage": true,
            "weapons": true,
            "clothing": true,
            "trinkets": true,
            "equipment": true,
            "armor": false
        };
    }
    const filterState = window._mythrasPopoverFilterState;

    const typeOrder = {
        "storage": 1,
        "melee-weapon": 2,
        "ranged-weapon": 3,
        "equipment": 4,
        "armor": 5
    };

    const equipmentTypeOrder = {
        "MYTHRAS.Trinkets": 1,
        "MYTHRAS.Clothing": 2
    };

    const allowedTypes = ["storage", "melee-weapon", "ranged-weapon", "equipment", "armor"];

    function isFeatureEnabled() {
        try {
            return game.settings.get(moduleId, "enableShowEquippedItemsOnToken");
        } catch (e) {
            return true;
        }
    }

    function showPopover() {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
        popoverEl.style.display = "flex";
    }

    function hidePopover() {
        popoverEl.style.display = "none";
        activeToken = null;
    }

    function scheduleHidePopover() {
        hideTimeout = setTimeout(() => {
            hidePopover();
        }, 300); 
    }

    popoverEl.addEventListener("mouseenter", () => {
        if (hideTimeout) {
            clearTimeout(hideTimeout);
            hideTimeout = null;
        }
    });

    popoverEl.addEventListener("mouseleave", () => {
        hidePopover();
    });

    function positionPopover(event, token) {
        const globalPos = token.toGlobal({ x: token.w, y: 0 });
        const rect = canvas.app.view.getBoundingClientRect();
        
        popoverEl.style.left = `${rect.left + globalPos.x + 10}px`;
        popoverEl.style.top = `${rect.top + globalPos.y}px`;
    }

    // Helper to map an item to its specific filter category
    function getFilterCategory(item) {
        if (item.type === "melee-weapon" || item.type === "ranged-weapon") return "weapons";
        if (item.type === "equipment") {
            if (item.system?.equipmentType === "MYTHRAS.Clothing") return "clothing";
            if (item.system?.equipmentType === "MYTHRAS.Trinkets") return "trinkets";
            return "equipment";
        }
        return item.type;
    }

    function updatePopoverContent(token) {
        if (!isFeatureEnabled() || !token || !token.actor || (token.actor.getFlag("item-piles", "data")?.enabled && token.actor.getFlag("item-piles", "data").type === "container")) {
            hidePopover();
            return false;
        }

        const actor = token.actor;
        
        // 1. Gather all eligible items the actor possesses
        const eligibleItems = actor.items.filter(item => {
            if (!allowedTypes.includes(item.type)) return false;
            
            // Filter out items stored inside other containers
            if (item.storedIn) return false;         

            // Storage items must explicitly be carried at the root level
            if (item.type === "storage" && item.isCarried !== true) {
                return false;
            }

            return true;
        });

        if (eligibleItems.length === 0) {
            hidePopover();
            return false;
        }

        // 2. Filter the eligible items based on the active toggles
        const displayItems = eligibleItems.filter(item => {
            const cat = getFilterCategory(item);
            return filterState[cat] !== false;
        });

        displayItems.sort((a, b) => {
            const orderA = typeOrder[a.type] || 99;
            const orderB = typeOrder[b.type] || 99;
            if (orderA !== orderB) return orderA - orderB;

            if (a.type === "equipment" && b.type === "equipment") {
                const eqA = a.system?.equipmentType || "";
                const eqB = b.system?.equipmentType || "";
                const subA = equipmentTypeOrder[eqA] || 3;
                const subB = equipmentTypeOrder[eqB] || 3;
                if (subA !== subB) return subA - subB;
            }

            return a.name.localeCompare(b.name);
        });

        // 3. Build the Header and Interactive Filter Pills (Fixed Top)
        let html = `
            <div style="flex-shrink: 0;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(196, 164, 106, 0.4); margin-bottom: 6px; padding-bottom: 4px;">
                    <span style="font-weight: bold; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; color: #e0d0b0;">Equipped Items</span>
                </div>
        `;

        const filterOptions = [
            { id: "storage", label: "Storage" },
            { id: "weapons", label: "Weapons" },
            { id: "clothing", label: "Clothing" },
            { id: "trinkets", label: "Trinkets" },
            { id: "equipment", label: "Gear" },
            { id: "armor", label: "Armour" }
        ];

        html += `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px;">`;
        for (const opt of filterOptions) {
            const isActive = filterState[opt.id];
            const bg = isActive ? "rgba(196, 164, 106, 0.3)" : "transparent";
            const border = isActive ? "#c4a46a" : "rgba(255, 255, 255, 0.15)";
            const color = isActive ? "#f0f0e0" : "#777";
            
            html += `
                <div class="mythras-filter-btn" data-filter="${opt.id}" 
                     style="cursor: pointer; padding: 2px 6px; border: 1px solid ${border}; border-radius: 3px; background: ${bg}; color: ${color}; font-size: 9px; font-weight: bold; text-transform: uppercase; user-select: none;">
                    ${opt.label}
                </div>
            `;
        }
        html += `</div></div>`;

        // 4. Build the Scrollable Item List Container
        html += `<div style="flex-grow: 1; overflow-y: auto; min-height: 0;">`;

        if (displayItems.length === 0) {
            html += `<div style="text-align: center; padding: 10px 0; font-style: italic; color: #777; font-size: 11px;">All items filtered out.</div>`;
        } else {
            html += `<ul style="list-style: none; margin: 0; padding: 0;">`;
            for (const item of displayItems) {
                const imgUrl = item.img || "icons/svg/item-bag.svg";
                const conditionBadge = item.type === "armor"
                    ? getMAGCMConditionBadge(item, item.system?.ap, "originalAp", "AP")
                    : (item.type === "melee-weapon" || item.type === "ranged-weapon")
                        ? getMAGCMConditionBadge(item, item.system?.hp, "originalHp", "HP")
                        : null;
                html += `
                    <li style="display: flex; align-items: center; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255, 255, 255, 0.1);">
                        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
                            <img src="${imgUrl}" style="width: 20px; height: 20px; object-fit: contain; border-radius: 3px; border: 1px solid rgba(196, 164, 106, 0.5); flex-shrink: 0;" />
                            <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${item.name}">${item.name}</span>
                            ${conditionBadge ? `<i class="fas ${conditionBadge.icon}" style="color: ${conditionBadge.color}; flex-shrink: 0;" title="${conditionBadge.text}"></i>` : ""}
                        </div>
                        ${ (item.type === "armor" && item.isEquipped === false) ? `
                        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
                            <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">(Carried)</span>
                        </div>` : `` }
                        ${ ((item.type === "melee-weapon" || item.type === "ranged-weapon") && !item.getFlag(MAGCM_MODULE_ID, "holdingLocations")?.length) ? `
                        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
                            <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">(Stowed)</span>
                        </div>` : `` }                        
                    </li>
                `;
            }
            html += `</ul>`;
        }
        html += `</div>`;

        popoverEl.innerHTML = html;

        // 5. Attach click events to the filter pills
        popoverEl.querySelectorAll('.mythras-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const filterId = e.currentTarget.dataset.filter;
                // Toggle the state
                filterState[filterId] = !filterState[filterId];
                // Immediately refresh the popover content
                updatePopoverContent(activeToken);
            });
        });

        activeToken = token;
        return true;
    }

    if (!foundry.canvas.placeables.Token.prototype._originalOnHoverInForUnstoredPopover) {
        foundry.canvas.placeables.Token.prototype._originalOnHoverInForUnstoredPopover = foundry.canvas.placeables.Token.prototype._onHoverIn;
        foundry.canvas.placeables.Token.prototype._onHoverIn = function (event, options) {
            const isCtrl = game.keyboard?.isModifierActive("CONTROL") || (event && event.ctrlKey);

            if (isFeatureEnabled() && isCtrl) {
                if (updatePopoverContent(this)) {
                    positionPopover(event, this);
                    showPopover();
                }
            }
            return foundry.canvas.placeables.Token.prototype._originalOnHoverInForUnstoredPopover.call(this, event, options);
        };
    }

    if (!foundry.canvas.placeables.Token.prototype._originalOnHoverOutForUnstoredPopover) {
        foundry.canvas.placeables.Token.prototype._originalOnHoverOutForUnstoredPopover = foundry.canvas.placeables.Token.prototype._onHoverOut;
        foundry.canvas.placeables.Token.prototype._onHoverOut = function (event) {
            if (activeToken === this) {
                scheduleHidePopover();
            }
            return foundry.canvas.placeables.Token.prototype._originalOnHoverOutForUnstoredPopover.call(this, event);
        };
    }

    const refreshIfActive = (changedDoc) => {
        if (!activeToken || !isFeatureEnabled()) return;

        const targetActorId = activeToken.actor?.id;
        if (!targetActorId) return;

        let matches = false;
        if (changedDoc.documentName === "Actor" && changedDoc.id === targetActorId) {
            matches = true;
        } else if (changedDoc.documentName === "Item" && changedDoc.actor?.id === targetActorId) {
            matches = true;
        }

        if (matches) {
            updatePopoverContent(activeToken);
        }
    };

    Hooks.on("updateItem", refreshIfActive);
    Hooks.on("createItem", refreshIfActive);
    Hooks.on("deleteItem", refreshIfActive);
    Hooks.on("updateActor", refreshIfActive);

    if (!window._mythrasCtrlKeyListenerRegistered) {
        window._mythrasCtrlKeyListenerRegistered = true;
        document.addEventListener("keydown", (event) => {
            if ((event.key === "Control" || event.key === "Meta") && isFeatureEnabled()) {
                const hoveredToken = canvas?.ready ? canvas.tokens.hover : null;
                
                if (hoveredToken) {
                    if (updatePopoverContent(hoveredToken)) {
                        positionPopover(null, hoveredToken);
                        showPopover();
                    }
                }
            }
        });
    }
})();