// main.js
// Tested on Foundry v13


const MAGCM_MODULE_ID = "mythras-angrygorillas-custom-macros";
const MAGCM_ICONS_PATH = "modules/mythras-angrygorillas-custom-macros/images/icons/";
const MAGCM_OVERLAY_ICONS_SIZE = 16;
let MAGCM_OVERLAY_ICONS_ALPHA = 0.8;

Hooks.once("ready", () => {
    document.body.classList.toggle("magcm-is-gm", game.user.isGM);
    applyMAGCMTooltipScale();
    applyMAGCMOverlayIconsAlpha();
});

// The chat log can finish its initial render before the canvas does (see the try/catch around the HP
// owner-visibility lookup in renderChatMessage), so any already-rendered Attack cards would be stuck
// showing HP as GM-only until something else causes them to re-render. Re-rendering the chat log itself
// once canvas actually becomes available re-triggers renderChatMessage for every visible message, letting
// them recompute that visibility correctly - a one-time self-correction rather than a lingering gap.
Hooks.once("canvasReady", () => {
    try { ui.chat?.render(); } catch (e) { /* not worth failing over - the next natural card update still fixes it */ }
});

// Applies the "Tooltip Size" accessibility setting as a CSS custom property inherited by every tooltip
// surface (chat card info tooltips, the Ctrl+Hover popover, and the overlay icon/weapon-pill tooltips that
// reuse Foundry's native #tooltip element) - see the .magcm-damage-tooltip__scale/.magcm-popover-scale/
// .magcm-scalable-tooltip-inner rules in chat-styles.css.
function applyMAGCMTooltipScale() {
    let scale = game.settings.get(MAGCM_MODULE_ID, "tooltipScale") || "1";
    // Huge (1.5) was removed - too flimsy, tooltips overflowed with no way to scroll them. Clamp any
    // already-saved value down to the new max so old worlds don't get stuck on a now-unlisted choice.
    if (Number(scale) > 1.3) {
        scale = "1.3";
        game.settings.set(MAGCM_MODULE_ID, "tooltipScale", scale);
    }
    document.body.style.setProperty("--magcm-tooltip-scale", scale);
}

// Applies the "Token Overlay Icons Opacity" accessibility setting to the shared MAGCM_OVERLAY_ICONS_ALPHA
// value read by every token overlay icon (cover/impale/entangle/stun/ward/wound/armour/weapon, etc.) when
// its sprite is created. Only affects icons drawn AFTER this runs - already-drawn ones update next time
// their status changes or the scene/token is reloaded, same as this module's other per-client visual settings.
function applyMAGCMOverlayIconsAlpha() {
    MAGCM_OVERLAY_ICONS_ALPHA = Number(game.settings.get(MAGCM_MODULE_ID, "tokenOverlayIconsAlpha")) || 0.8;
}

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
        hint: "This setting is used to toggle on or off small homebrew content and rules that may be added. (e.g. Homebrew special effect to re-roll damage.) Also unlocks the non-standard Awful and Exemplary quality tiers when Quality Tracking is enabled.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MAGCM_MODULE_ID, "enableFittingTracking", {
        name: "Fitting",
        hint: "Adds Fitting fields to item sheets: SIZ and Frame for armour, clothing, and trinkets, plus a Body Part field for armour.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MAGCM_MODULE_ID, "enableQualityTracking", {
        name: "Quality Tracking",
        hint: "Adds a Quality field to armour, equipment, and weapon sheets.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MAGCM_MODULE_ID, "enableOriginalConditionTracking", {
        name: "Original Condition",
        hint: "Adds original AP/HP fields to armour and weapon sheets, letting the module compare current AP/HP against them to flag damaged/broken condition. If Quality Tracking is also enabled, this also adds fields for the item's original Value and Quality.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MAGCM_MODULE_ID, "enableCtrlHoverTokenTooltip", {
        name: "Show Character Status and Equipped Items on Token Hover",
        hint: `Enabling this will allow all users to Ctrl+Hover on a token to see a two-tab tooltip. One tab shows a summary of the character status with icons representing individual hit locations' condition. The other tab lists all of their items that have the storage set to "Equipped". If the item is a storage item, it will only show up in this list if it is set to be Carried. This tab also provides several filters.`,
        scope: "world",
        config: true,
        type: Boolean,
        default: true
    });
    game.settings.register(MAGCM_MODULE_ID, "enableFacingDirectionTileOverlay", {
        name: "Facing Direction Tile Overlay",
        hint: "Enables a tile overlay that shows the facing direction of characters when hovering over their tokens. This is only visible for active combatants during combat encounters. The facing rules are based on the Mythras Companion ruleset. Green for front, yellow for side, and red for back.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MAGCM_MODULE_ID, "enableShowExactHpValuesToPlayers", {
        name: "Show HP Values to Players",
        hint: "Enables players to see the exact HP values in the Token Status Tooltip (Ctrl+Hover Token Tooltip must be enabled), the Wound Tooltip, and in the Damage Applied chat cards upon resolving Attack damage.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
    game.settings.register(MAGCM_MODULE_ID, "tooltipScale", {
        name: "Tooltip Size",
        hint: "Accessibility option: scales the size of every hover tooltip this module adds (overlay icon tooltips, the Ctrl+Hover token popover, and chat card info tooltips).",
        scope: "client",
        config: true,
        type: String,
        choices: {
            "0.85": "Small",
            "1": "Normal (Default)",
            "1.15": "Large",
            "1.3": "Extra Large"
        },
        default: "1",
        onChange: () => applyMAGCMTooltipScale()
    });
    game.settings.register(MAGCM_MODULE_ID, "tokenOverlayIconsAlpha", {
        name: "Token Overlay Icons Opacity",
        hint: "Accessibility option: sets how opaque this module's token overlay icons (cover/impale/entangle/stun/ward/wound/armour/weapon, etc.) are drawn.",
        scope: "client",
        config: true,
        type: Number,
        range: { min: 0.1, max: 1.0, step: 0.05 },
        default: 0.8,
        onChange: () => applyMAGCMOverlayIconsAlpha()
    });
    game.settings.register(MAGCM_MODULE_ID, "enableAutoSelectActiveCombatant", {
        name: "Select Active Token in Combat Encounter for GM",
        hint: "During active combat encounters, whenever the turn changes to a combatant that isn't any player's assigned character (even if a player owns that token), clears the GM's current token selection and targets and selects that combatant's token instead.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false,
        onChange: () => applyMAGCMSettingsSubsettingVisibility()
    });
    game.settings.register(MAGCM_MODULE_ID, "enableAutoSelectPlayerCharacters", {
        name: "Also Select Player Characters' Own Turns",
        hint: "Only relevant if 'Select active token in combat encounter for GM' above is enabled. When enabled, the automatic selection also applies on a player's own assigned character's turn, not just non-player-character combatants.",
        scope: "world",
        config: true,
        type: Boolean,
        default: false
    });
});

// Purely cosmetic nesting of "Also Select Player Characters' Own Turns" under its parent setting in the
// Module Settings dialog - shows/indents it only while the parent is enabled. Both settings remain fully
// registered and functional regardless of this; if Foundry's settings-config markup ever changes shape,
// this just silently stops nesting rather than breaking anything, since it never touches setting values.
function applyMAGCMSettingsSubsettingVisibility(root = document) {
    try {
        const parentInput = root.querySelector(`[name="${MAGCM_MODULE_ID}.enableAutoSelectActiveCombatant"]`);
        const childInput = root.querySelector(`[name="${MAGCM_MODULE_ID}.enableAutoSelectPlayerCharacters"]`);
        const childRow = childInput?.closest(".form-group");
        if (!parentInput || !childRow) return;

        childRow.style.display = parentInput.checked ? "" : "none";
        childRow.style.marginLeft = "1.5em";
    } catch (e) { /* cosmetic only - never worth failing over */ }
}

Hooks.on("renderSettingsConfig", (app, html) => {
    try {
        const root = html instanceof jQuery ? html[0] : html;
        applyMAGCMSettingsSubsettingVisibility(root);
        root.querySelector(`[name="${MAGCM_MODULE_ID}.enableAutoSelectActiveCombatant"]`)
            ?.addEventListener("change", () => applyMAGCMSettingsSubsettingVisibility(root));
    } catch (e) { /* cosmetic only - never worth failing over */ }
});

// Shared humanoid hit-location layout: the 7 standard slots and their CSS grid-template-areas, used by
// every token overlay tooltip that renders a "paperdoll" of hit locations (Cover/Impale/Entangle/Stun/
// Ward/Wound, and the Ctrl+Hover popover's combined Hit Location Status tab).
const MAGCM_HUMANOID_SLOTS = {
    "Head": { area: "head", label: "Head" },
    "Chest": { area: "chest", label: "Chest" },
    "Abdomen": { area: "abdo", label: "Abdomen" },
    "Right Arm": { area: "rarm", label: "R. Arm" },
    "Left Arm": { area: "larm", label: "L. Arm" },
    "Right Leg": { area: "rleg", label: "R. Leg" },
    "Left Leg": { area: "lleg", label: "L. Leg" }
};

// Shared wound severity metadata/lookup, used by the Wound token overlay and the Ctrl+Hover popover's
// combined Hit Location Status tab.
const MAGCM_WOUND_SEVERITIES = [
    { key: "minor-wound", label: "Minor Wound", rank: 1 },
    { key: "serious-wound", label: "Serious Wound", rank: 2 },
    { key: "major-wound", label: "Major Wound", rank: 3 }
];
const MAGCM_WOUND_STYLE = {
    "minor-wound": { hex: "#fff000", border: "#d9c800", text: "#ffffff" },
    "serious-wound": { hex: "#ff8a00", border: "#d96d00", text: "#ffffff" },
    "major-wound": { hex: "#ff0000", border: "#cc0000", text: "#ffffff" }
};
const MAGCM_WEAPON_GRIP_REQUIREMENTS = {
    "1h": { label: "One-Handed" },
    "vh": { label: "Versatile" },
    "2h": { label: "Two-Handed" },
    "nat": { label: "Natural Weapon" }
};

// A weapon is a Natural Weapon when its Grip Requirement is set to "nat" (claws, bite, horns, etc.) -
// see the "Attached Hit Locations" picker that appears for that option on the item sheet below.
function isMAGCMNaturalWeapon(weapon) {
    return weapon?.getFlag(MAGCM_MODULE_ID, "gripRequirement") === "nat";
}
const MAGCM_WEAPON_SIZES = {
    "S": { label: "Small", rank: 0 },
    "M": { label: "Medium", rank: 1 },
    "L": { label: "Large", rank: 2 },
    "H": { label: "Huge", rank: 3 },
    "E": { label: "Enormous", rank: 4 },
    "BE": { label: "Beyond Enormous", rank: 5 }
}

// True only if the actor has EXACTLY the 7 standard humanoid hit locations (by name) - no fewer, and
// no extras (e.g. a Tail or Wings) - used to decide whether a per-location tooltip/grid should render
// the paperdoll layout or fall back to a plain list. A non-exact match (missing or additional locations)
// always falls back, since the paperdoll's fixed grid has no slot to place anything else.
function isMAGCMActorHumanoid(actor) {
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");
    if (hitLocations.length !== 7) return false;

    const bodyPartMap = {};
    hitLocations.forEach(loc => {
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
}

// Damaged/Broken indicator for weapons (HP) and armor (AP) against their tracked original value
function getMAGCMConditionBadge(item, currentValue, originalField, statLabel) {
    try {
        if (!game.settings.get(MAGCM_MODULE_ID, "enableOriginalConditionTracking")) return null;
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

// Shared damaged/broken -> cell colouring for anything built on a condition badge (weapon/armour overlay
// icons, their tooltips, and the Ctrl+Hover Status tab): red wins over yellow, neither overrides a neutral look.
function getMAGCMBadgeCellStyle(badge, neutralBg = "rgba(255,255,255,0.08)", neutralBorder = "#666") {
    if (badge?.level === "broken") return { bg: "rgba(255, 68, 68, 0.18)", border: "#ff4444", glowColor: "#ff4444" };
    if (badge?.level === "damaged") return { bg: "rgba(255, 184, 77, 0.16)", border: "#ffb84d", glowColor: "#ffb84d" };
    return { bg: neutralBg, border: neutralBorder, glowColor: null };
}

function getMAGCMInlineTintedIcon(svgFileName, color = "currentColor", extraStyle = "") {
    return `<span style="display:inline-block; width:1em; height:1em; vertical-align:-0.125em; background-color:${color}; -webkit-mask-image:url(${svgFileName}); mask-image:url(${svgFileName}); -webkit-mask-size:contain; mask-size:contain; -webkit-mask-repeat:no-repeat; mask-repeat:no-repeat; ${extraStyle}"></span>`;
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

function getMAGCMWeaponDamage(weapon, includeActorDamageModifier = false) {
    if (!weapon) return null;
    const gripRequirement = weapon.getFlag?.(MAGCM_MODULE_ID, "gripRequirement");
    const actor = weapon?.actor;
    if (gripRequirement === "vh") {
        const twoHandedDamage = weapon.getFlag(MAGCM_MODULE_ID, "twoHandedDamage");
        if (twoHandedDamage && weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations")?.length >= 2 && actor) {
            if (weapon.system?.damageModifier && includeActorDamageModifier) {
                return `${twoHandedDamage}+${actor.damageMod}`;
            }
            return twoHandedDamage;
        }
    }
    return (includeActorDamageModifier) ? weapon.damageRoll : weapon.system?.damage || "1d3";
}

function getMAGCMWeaponSize(weapon) {
    if (!weapon) return null;
    const gripRequirement = weapon.getFlag?.(MAGCM_MODULE_ID, "gripRequirement");
    if (gripRequirement === "vh") {
        if (weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations")?.length >= 2) {
            return weapon.getFlag(MAGCM_MODULE_ID, "twoHandedSize") || weapon.system?.size || "S";
        }
    }
    return weapon.system?.size || "S";
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
            <div class="magcm-chat-card">
            <div class="magcm-chat-card-title"><i class="fas fa-running"></i> Movement State Check</div>
            <div class="magcm-chat-card-header">
                ${buildMAGCMStatsRowHtml([
            { label: "Round", value: combat.round },
            { label: "Current Mode", value: currentMode }
        ])}
            </div>
            <div style="text-align: center; margin-top: 8px;">
                <button class="btn-movement-dialog" data-actor-id="${actor.id}"><i class="fas fa-running"></i> Set Movement State</button>
            </div>
            </div>
        `;

        await ChatMessage.create({
            speaker: ChatMessage.getSpeaker({ actor: actor }),
            content: content,
            flavor: `Round ${combat.round} - Movement Check`
        });
    });

    // Listener for chat card button clicks
    $(document).on("click", ".btn-movement-dialog", function (e) {
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
        tooltip.innerHTML = `<div class="magcm-damage-tooltip__scale"><div class="magcm-damage-tooltip__title">${titleHtml}</div><div class="magcm-damage-tooltip__body">${body}</div></div>`;
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
    // The location's own `equippedArmor` getter only carries name/ap - cross-reference the actor's real
    // armor Items (same lookup the Armour Overlay Icons feature uses) purely to pick up each piece's icon.
    const equippedArmorItems = targetActor?.items.filter(i => i.type === "armor" && i.system?.equipped
        && (i.system?.location || []).includes(hitLocationItem.id)) || [];
    const armorPieces = Array.isArray(hitLocationItem.equippedArmor)
        ? hitLocationItem.equippedArmor.map(armor => {
            const name = armor.name || armor.label || "Armour";
            return { name, ap: Number(armor.ap) || 0, img: equippedArmorItems.find(item => item.name === name)?.img || null };
        })
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
        wardedWeaponSize: (blockingWeapon) ? getMAGCMWeaponSize(blockingWeapon) : null
    };
}

function renderMAGCMHitLocationResultText(location) {
    return `${location.name}${buildMAGCMHitLocationPillIconsHtml(location)}`;
}

// Small inline icon cluster shown inside the Hit Location pill itself (not just the tooltip) as an at-a-glance
// cue that the location is chosen/warded/covered - full detail on hover.
function buildMAGCMHitLocationPillIconsHtml(location) {
    const icons = [];
    if (location.chosen) icons.push('<i class="fas fa-crosshairs"></i>');
    if (location.wardedWeaponName) icons.push(getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}overlays/warded.svg`));
    if (location.inCover) icons.push(getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}overlays/in-cover.svg`));

    const woundSeverity = getMAGCMWoundSeverityData(location);
    if (woundSeverity) icons.push(getMAGCMInlineTintedIcon(getMAGCMWoundLocationIconPath(woundSeverity, location.name, false), MAGCM_WOUND_STYLE[woundSeverity.key]?.hex || "currentColor"));

    if (icons.length === 0) return "";
    return `<span class="attack-hit-location-icons">${icons.join(" ")}</span>`;
}

function renderMAGCMHitLocationTooltipHtml(location, canSeeExactHp = false) {
    const hasHp = Number.isFinite(location.maxHp) && location.maxHp > 0;
    let hpLine = hasHp ? `${location.currentHp}/${location.maxHp} HP` : "Unknown HP";
    const woundSuffix = location.woundLabel && location.woundLabel !== "Healthy" ? ` (${location.woundLabel})` : "";
    const rollLine = location.chosen ? "Chosen" : (location.roll ?? "Unknown");
    if (!canSeeExactHp && !game.settings.get(MAGCM_MODULE_ID, "enableShowExactHpValuesToPlayers")) {
        hpLine = `<span class="magcm-gm-only">${hpLine}</span>`;
    }

    const lines = [
        `<strong>Roll:</strong> ${rollLine}`,
        `<strong>HP:</strong> ${hpLine}${woundSuffix}`,
        `<strong>Natural Armour:</strong> ${location.naturalArmor || 0} AP`
    ];
    if (location.inCover) lines.push(`<strong style="color:#7fd17f;">Behind Cover</strong>`);
    if (location.wardedWeaponName) {
        const sizeSuffix = location.wardedWeaponSize ? ` (${location.wardedWeaponSize})` : "";
        lines.push(`<strong>Warded by:</strong> ${location.wardedWeaponName}${sizeSuffix}`);
    }
    return lines.join("<br/>");
}

// True once a weapon's damage no longer exceeds the greater of the location's worn/natural armour (after
// any Bypass Armour toggles are accounted for) - i.e. the blow would be fully absorbed by armour alone.
function computeMAGCMArmorHoldsDamage(damage, wornArmor, naturalArmor, bypassWorn, bypassNatural) {
    if (!Number.isFinite(damage) || damage <= 0) return false;
    const effectiveWorn = bypassWorn ? 0 : (Number(wornArmor) || 0);
    const effectiveNatural = bypassNatural ? 0 : (Number(naturalArmor) || 0);
    return Math.max(effectiveWorn, effectiveNatural) >= damage;
}

// Small inline icon(s) shown inside the Weapon Damage pill flagging that the displayed value was produced
// via Maximise Damage and/or the Re-roll Damage homebrew effect, and/or that it doesn't exceed the current
// hit location's combined armour - with the specifics left to the tooltip.
function buildMAGCMDamagePillIconsHtml({ maximised, rerolled, armorHoldsDamage }) {
    const icons = [];
    if (maximised) icons.push('<i class="fas fa-maximize"></i>');
    if (rerolled) icons.push('<i class="fas fa-rotate-right"></i>');
    if (armorHoldsDamage) icons.push('<i class="fas fa-shield-heart"></i>');
    if (icons.length === 0) return "";
    return `<span class="attack-hit-location-icons">${icons.join(" ")}</span>`;
}

// Prefixes the damage tooltip's dice breakdown with a note explaining maximise/re-roll/armour, when applicable.
function buildMAGCMDamageNoteHtml({ maximisedStacks, rerolled, armorHoldsDamage }) {
    const notes = [];
    if (maximisedStacks > 0) notes.push(`<strong>Maximised Damage:</strong> ${maximisedStacks} weapon di${maximisedStacks === 1 ? "e" : "ce"} set to maximum face value.`);
    if (rerolled) notes.push(`<strong>Re-rolled Damage:</strong> kept the higher of two damage rolls.`);
    if (armorHoldsDamage) notes.push(`<strong style="color:#7fa8d1;">Damage does not exceed this location's combined armour.</strong>`);
    return notes.length > 0 ? `${notes.join("<br/>")}<br/>` : "";
}

function renderMAGCMLocationArmorTooltipHtml(location) {
    const pieces = Array.isArray(location.armorPieces) ? location.armorPieces.filter(p => p.ap > 0) : [];
    if (pieces.length === 0) {
        return location.armor > 0 ? `<strong>${location.armorName}:</strong> ${location.armor} AP` : "No worn armour equipped.";
    }
    const lines = pieces.map(p => {
        const imgHtml = p.img ? `<img src="${p.img}" style="width:14px;height:14px;vertical-align:middle;object-fit:contain;border:none;border-radius:2px;margin-right:4px;" />` : "";
        return `${imgHtml}${p.name}: <strong>${p.ap} AP</strong>`;
    });
    lines.push(`<strong>Total:</strong> ${location.armor} AP`);
    return lines.join("<br/>");
}

// Shared by every dialog (Attack/Parry/Evade) that embeds computed HTML inside an attribute value.
function escapeMAGCMTooltipAttr(text) {
    return String(text).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// Shared list of the 6 difficulty tiers used by every Attack/Parry/Evade dialog's Difficulty <select>,
// paired with the same colours used for the chat card's own difficulty label
// (.magcm-chat-card-roll__diff[data-difficulty]) so the tooltip's "All Difficulties" section matches.
const MAGCM_DIFFICULTY_TIERS = [
    { text: "Very Easy", mult: 2, color: "#4a90d9" },
    { text: "Easy", mult: 1.5, color: "#3f9c4c" },
    { text: "Standard", mult: 1, color: "#e0e0e0" }, // lightened from the chat card's #111111, illegible on the dark tooltip background
    { text: "Hard", mult: 0.67, color: "#caa53d" },
    { text: "Formidable", mult: 0.5, color: "#c23b3b" },
    { text: "Herculean", mult: 0.1, color: "#9b59b6" }
];

// Same Critical/Fumble/Success/Failure thresholds used by every Attack/Parry/Evade/Endurance roll (a
// Critical is always the bottom 1/10th of the target; 00 is always a Fumble, and 99 only fumbles if the
// character's raw skill - before difficulty, and before any over-100% opposed-roll adjustments - is 100%
// or less (Rulebook p.36); 96-00 is always a failure regardless of target, and 01-05 is always a success
// regardless of target (Rulebook p.37). The ONLY function that should ever compute a roll's result label -
// every roll-time dialog and every post-hoc rebuild/preview must call this rather than re-deriving it.
function getMAGCMResultLabelForRoll(rollTotal, targetValue, baseSkillValue) {
    if (rollTotal <= Math.ceil(targetValue * 0.1)) return "Critical";
    if (rollTotal === 100 || (rollTotal === 99 && Number(baseSkillValue) <= 100)) return "Fumble";
    if (rollTotal >= 96) return "Failure";
    if (rollTotal <= 5) return "Success";
    if (rollTotal <= targetValue) return "Success";
    return "Failure";
}

// Colours a result word the same as the roll-result pill (.attack-roll-result-value[data-result]).
const MAGCM_RESULT_COLORS = {
    Critical: "#caa53d",
    Success: "#3f9c4c",
    Failure: "#cc3b3b",
    Fumble: "#9f2323"
};

// Builds the tooltip's "All Difficulties" section: a neat, self-contained list showing what target% and
// result every difficulty tier would have produced against the SAME raw roll, so the section can be
// appended without disturbing the tooltip's existing skill/augment lines above it.
function buildMAGCMAllDifficultiesTooltipHtml(rollTotal, effectiveSkillValue) {
    const roll = Number(rollTotal);
    const skill = Number(effectiveSkillValue);
    if (!Number.isFinite(roll) || !Number.isFinite(skill)) return "";
    const rows = MAGCM_DIFFICULTY_TIERS.map(tier => {
        const target = Math.ceil(skill * tier.mult);
        const resultLabel = getMAGCMResultLabelForRoll(roll, target, skill);
        const resultColor = MAGCM_RESULT_COLORS[resultLabel] || "#f0f0e0";
        // Fixed-width columns (rather than justify-content:space-between) so the Target% column lines up
        // vertically across rows - space-between only keeps the first/last items pinned to the edges, and
        // lets the middle item drift based on the varying text width of the difficulty/result columns.
        return `<div style="display:flex; align-items:center; gap:6px; padding:1px 0;"><span style="flex:0 0 66px; color:${tier.color}; font-weight:600;">${tier.text}</span><span style="flex:0 0 34px; text-align:right; color:#ccc;">${target}%</span><span style="flex:1 0 auto; text-align:right; color:${resultColor}; font-weight:700;">${resultLabel}</span></div>`;
    }).join("");
    return `<div style="margin-top:6px; padding-top:5px; border-top:1px solid rgba(255,255,255,0.15);"><div style="font-weight:700; margin-bottom:2px;">All Difficulties</div>${rows}</div>`;
}

// Skill Roll pill tooltip (Attack/Parry/Evade): shows what actually produced the target% used to resolve
// the roll, including any augmenting/capping skill and character, so the number on the card is never a
// mystery in hindsight. Also appends an "All Difficulties" section showing what the result (and target%)
// would have been for every difficulty against this same raw roll.
function renderMAGCMSkillRollTooltipHtml({ rollTotal, skillName, effectiveSkillValue, diffText, targetValue, augmentLine, forced }) {
    const lines = [
        `<strong>Skill:</strong> ${skillName}`,
        `<strong>Effective Skill:</strong> ${effectiveSkillValue}%`,
        `<strong>Difficulty:</strong> ${diffText} (Target: ${targetValue}%)`,
        `<strong>Augment:</strong> ${augmentLine}`
    ];
    if (forced) lines.push(`<strong style="color:#e1a100;">Forced Result:</strong> This roll bypassed the dice and used a manually set value.`);
    return lines.join("<br/>") + buildMAGCMAllDifficultiesTooltipHtml(rollTotal, effectiveSkillValue);
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
function buildMAGCMRollResultPillHtml({ rollTotal, resultLabel, skillName, effectiveSkillValue, diffText, targetValue, augmentLine, forced }) {
    const tooltipHtml = escapeMAGCMTooltipAttr(renderMAGCMSkillRollTooltipHtml({ rollTotal, skillName, effectiveSkillValue, diffText, targetValue, augmentLine, forced }));
    const forcedIconHtml = forced ? `<span class="attack-roll-result-value__forced" title="Forced Result"><i class="fas fa-pen-to-square"></i></span>` : "";
    return `<div class="attack-roll-result-value attack-info-pill" data-result="${resultLabel}" data-magcm-tooltip="${tooltipHtml}"><span class="attack-roll-result-value__roll">${rollTotal}</span><span class="attack-roll-result-value__sep">-</span><span class="attack-roll-result-value__label">${resultLabel}</span>${forcedIconHtml}</div>`;
}

// Maps a difficulty select's raw multiplier value (e.g. "0.67") to its index into MAGCM_DIFFICULTY_TIERS.
// Used only by the post-hoc difficulty-change feature below - the original dialogs each keep their own
// long-standing switch statement (diffText/diffIndex) untouched to avoid disturbing working code.
function getMAGCMDifficultyTierIndex(diffMult) {
    const idx = MAGCM_DIFFICULTY_TIERS.findIndex(tier => String(tier.mult) === String(diffMult));
    return idx >= 0 ? idx : 2;
}

// Weapon-size comparison used by Parry to determine how much damage a successful parry negates. Hoisted
// out of handleParryDialog (which still exposes its own closure-bound getParryNegationInfo(defenderSizeName)
// wrapper calling this) so the post-hoc difficulty-change recompute can call it without a dialog in scope.
function getMAGCMParryNegationInfo(attackerSizeName, defenderSizeName) {
    const getSizeRank = (sizeName) => {
        const mapped = normalizeMAGCMWeaponSizeRank(sizeName);
        return mapped === null ? 1 : mapped;
    };
    const delta = getSizeRank(attackerSizeName) - getSizeRank(defenderSizeName);
    if (delta >= 2) return { text: "None", ratio: 0 };
    if (delta === 1) return { text: "Half", ratio: 0.5 };
    return { text: "Full", ratio: 1 };
}

// Builds the clickable "(Difficulty)" badge shown next to a roll label on Attack/Parry/Evade chat cards.
// Purely a function of the tier index - current game state (locked/unlocked, live tooltip) is layered on
// afterward by the renderChatMessageHTML wiring below, so this same markup works both at roll-creation
// time and when a later difficulty change rebuilds the card.
function buildMAGCMDifficultyBadgeHtml(diffIndex, originalDiffIndex = diffIndex) {
    const tier = MAGCM_DIFFICULTY_TIERS[diffIndex] || MAGCM_DIFFICULTY_TIERS[2];
    const changedIconHtml = diffIndex !== originalDiffIndex
        ? ` <i class="fas fa-clock-rotate-left magcm-difficulty-changed-icon"></i>`
        : "";
    return `<span class="magcm-chat-card-roll__diff magcm-roll-difficulty-badge" data-difficulty="${tier.text}"> (${tier.text})${changedIconHtml}</span>`;
}

// Tooltip shown when hovering a difficulty badge - names the original difficulty (not just "previous") when
// it has been changed after the fact, per the module's own convention of never hiding what a roll originally was.
function buildMAGCMDifficultyTooltipHtml(diffIndex, originalDiffIndex) {
    const tier = MAGCM_DIFFICULTY_TIERS[diffIndex] || MAGCM_DIFFICULTY_TIERS[2];
    const lines = [`<strong>Difficulty:</strong> ${tier.text}`];
    if (diffIndex !== originalDiffIndex) {
        const originalTier = MAGCM_DIFFICULTY_TIERS[originalDiffIndex] || MAGCM_DIFFICULTY_TIERS[2];
        lines.push(`<strong style="color:#e1a100;"><i class="fas fa-clock-rotate-left"></i> Changed:</strong> Originally rolled at ${originalTier.text}.`);
    }
    lines.push(`<em>Click to change this roll's difficulty.</em>`);
    return lines.join("<br/>");
}

// Re-derives what a message's own roll currently resolves to (its raw roll never changes, but its
// difficulty might have since been altered) straight from its stored "magcm-difficulty" flag data. Used so
// a Parry/Evade card recompute always reflects the ATTACKER's freshest result, even if the attacker's own
// difficulty was changed independently (possibly after this card was created).
function magcmGetLiveResultForMessage(messageId) {
    const messageDoc = messageId ? game.messages.get(messageId) : null;
    if (!messageDoc) return null;
    const data = messageDoc.getFlag(MAGCM_MODULE_ID, "magcm-difficulty");
    if (!data || data.rollTotal === null || data.rollTotal === undefined) return null;
    const tier = MAGCM_DIFFICULTY_TIERS[data.diffIndex] ?? MAGCM_DIFFICULTY_TIERS[2];
    const baseTargetValue = Math.ceil(Number(data.effectiveSkillValue) * tier.mult);
    // A defender's over-100% skill can retroactively shave this attacker's own target down (see
    // magcmApplyRetroactiveOver100ToAttack) - always fold that in so this stays the attacker's true live result.
    const targetValue = Math.max(0, baseTargetValue - (Number(data.retroactiveOver100Excess) || 0));
    return { resultLabel: getMAGCMResultLabelForRoll(Number(data.rollTotal), targetValue, Number(data.effectiveSkillValue)), targetValue, tier };
}

// Reads a dialog's "Force Roll Result" checkbox + number input; returns a clamped 1-100 integer when
// checked with a usable value, else null (meaning "roll normally").
function getMAGCMForcedRollValue(html, toggleSelector, valueSelector) {
    if (!html.find(toggleSelector).is(':checked')) return null;
    const raw = Number(html.find(valueSelector).val());
    if (!Number.isFinite(raw)) return null;
    return Math.min(100, Math.max(1, Math.round(raw)));
}

// Evaluates a 1d100 check, honouring a forced result override (bypasses the dice entirely) when supplied.
async function rollMAGCMD100(forcedValue) {
    const roll = new Roll(forcedValue !== null ? String(forcedValue) : "1d100");
    await roll.evaluate();
    return roll;
}


// Builds the "Attacker vs Defender/Target" header row shared by the Attack/Parry/Evade chat cards.
function buildMAGCMCombatantsRowHtml(leftName, leftLabel, rightName, rightLabel) {
    return `
        <div class="magcm-chat-card-combatants">
            <div class="magcm-chat-card-combatant magcm-chat-card-combatant--left">
                <span class="magcm-chat-card-combatant__label">${leftLabel}</span>
                <span class="magcm-chat-card-combatant__name">${leftName}</span>
            </div>
            <div class="magcm-chat-card-combatant__vs">vs</div>
            <div class="magcm-chat-card-combatant magcm-chat-card-combatant--right">
                <span class="magcm-chat-card-combatant__label">${rightLabel}</span>
                <span class="magcm-chat-card-combatant__name">${rightName}</span>
            </div>
        </div>`;
}

// Builds the row of small stat pills (Weapon, Range, Combat Effects, etc.) shared by the Attack/Parry/Evade
// chat card headers, from a plain array of { label, value, dataAttrs, tooltipHtml } entries. `dataAttrs` is
// an optional plain object of extra data-* attributes (e.g. { negation: "full" }) for CSS-driven pill
// colouring. `tooltipHtml`, if provided, makes the pill hoverable via the shared floating tooltip.
function buildMAGCMStatsRowHtml(items) {
    if (!Array.isArray(items) || items.length === 0) return "";
    const statsHtml = items.map(item => {
        const dataAttrString = item.dataAttrs
            ? Object.entries(item.dataAttrs).map(([key, value]) => ` data-${key}="${value}"`).join("")
            : "";
        const tooltipAttr = item.tooltipHtml ? ` data-magcm-tooltip="${escapeMAGCMTooltipAttr(item.tooltipHtml)}"` : "";
        const tooltipClass = item.tooltipHtml ? " magcm-chat-card-stat--tooltip" : "";
        return `<span class="magcm-chat-card-stat${tooltipClass}"${dataAttrString}${tooltipAttr}><span class="magcm-chat-card-stat__label">${item.label}</span><span class="magcm-chat-card-stat__value">${item.value}</span></span>`;
    }).join("");
    return `<div class="magcm-chat-card-stats-row">${statsHtml}</div>`;
}

function formatMAGCMSignedValue(value) {
    const numeric = Number(value) || 0;
    return `${numeric >= 0 ? "+" : ""}${numeric}`;
}

// Determines the display colour for a combatant's name in chat cards: a player's primary character
// (the actor assigned to them via Configure Player Character, not merely any actor they own) is
// coloured with that player's own colour; every other actor is coloured by its token's disposition.
function getMAGCMCombatantColor(actor, token) {
    if (actor) {
        const owningUser = game.users?.find(u => !u.isGM && u.character?.id === actor.id);
        if (owningUser) {
            const rawColor = owningUser.color;
            const colorCss = rawColor && typeof rawColor === "object" && "css" in rawColor ? rawColor.css : rawColor;
            if (colorCss) return colorCss;
        }
    }
    const disposition = token?.document?.disposition ?? token?.disposition ?? actor?.prototypeToken?.disposition ?? 0;
    if (disposition === CONST.TOKEN_DISPOSITIONS.FRIENDLY) return "#3f9c4c";
    if (disposition === CONST.TOKEN_DISPOSITIONS.HOSTILE) return "#c23b3b";
    if (disposition === CONST.TOKEN_DISPOSITIONS.SECRET) return "#9b59b6";
    return "#caa53d";
}

function getMAGCMCombatantNameHtml(name, color, actorId = null, tokenId = null, oppositeTokenId = null) {
    if (!actorId) return `<span style="color: ${color};">${name}</span>`;
    return `<span class="magcm-combatant-link" data-actor-id="${actorId}" data-token-id="${tokenId || ""}" data-opposite-token-id="${oppositeTokenId || ""}" style="color: ${color}; cursor: pointer;" title="${name}">${name}</span>`;
}

// Filters the offensive/defensive Special Effects list (see specialEffectsData further below) using the
// same tag rules as the Special Effects dialog's own filters, so the Parry/Evade "Winner" line can name
// the specific effects actually available given the winner's weapon type, traits/combat-effects, and
// critical/fumble state.
function getMAGCMAvailableSpecialEffectNames(category, weaponType, traitsStr, isCritical, isOpponentFumble, isInjuredTarget = false) {
    const list = specialEffectsData[category] || [];
    const activeTraits = traitsStr ? String(traitsStr).toLowerCase().split(",").map(s => `trait_${s.trim().replace(/\s+/g, "-")}`).filter(Boolean) : [];
    let homebrewEnabled = false;
    try { homebrewEnabled = game.settings.get(MAGCM_MODULE_ID, "enableHomebrewRulesAndContent"); } catch (e) { homebrewEnabled = false; }

    return list.filter(effect => {
        const tags = effect.tags;
        if (tags.includes("critical") && !isCritical) return false;
        if (tags.includes("opponent-fumble") && !isOpponentFumble) return false;
        if (tags.includes("homebrew") && !homebrewEnabled) return false;
        if (tags.includes("injured-target") && !isInjuredTarget) return false;
        // Unarmed Combat is a melee combat style - only a handful of effects carry an explicit "unarmed"
        // tag, always ADDITIONAL to "melee" rather than instead of it, so treat unarmed the same as melee
        // here instead of using it as its own restrictive category (which excluded almost every melee-tagged
        // effect for unarmed attacks/evades).
        const weaponTags = tags.filter(t => ["melee", "ranged", "unarmed"].includes(t));
        const effectiveWeaponType = weaponType === "unarmed" ? "melee" : weaponType;
        if (weaponTags.length > 0 && effectiveWeaponType && !weaponTags.includes(effectiveWeaponType)) return false;
        const traitTags = tags.filter(t => t.startsWith("trait_"));
        if (traitTags.length > 0 && !traitTags.some(t => activeTraits.includes(t))) return false;
        return true;
    }).map(effect => effect.name);
}

// Builds the themed "Winner" line shared by the Parry/Evade chat cards: the winner's coloured name plus
// a hoverable pill listing the specific Special Effects they have available. The effect list itself is
// NOT baked in here - it's recomputed live on hover (see the attachMAGCMInfoTooltip wiring in
// renderChatMessage) because "injured-target" tagged effects depend on the ORIGINAL Attack card's damage/
// hit-location, which is very often still unrolled at the moment this Parry/Evade card is created (Parry
// and Evade are resolved before damage is even rolled) - baking a stale "true" default in here permanently
// would keep showing Bleed/Stun Location/etc. even after the attacker later rolls damage that doesn't
// actually overcome armour.
function buildMAGCMWinnerLineHtml({ winner, count, winnerNameHtml, weaponType, traitsStr, isCritical, isOpponentFumble, attackMessageId }) {
    if (winner === "none") {
        return `<div class="magcm-chat-card-winner"><span class="magcm-chat-card-winner__tie">No Special Effects awarded.</span></div>`;
    }
    const category = winner === "attacker" ? "offensive" : "defensive";
    return `
        <div class="magcm-chat-card-winner">
            <span class="magcm-chat-card-winner__label">Winner:</span>
            <span class="magcm-chat-card-winner__name">${winnerNameHtml}</span>
            <span class="attack-info-pill attack-winner-effects-value" data-count="${count}" data-category="${category}" data-weapon-type="${weaponType || ""}" data-traits="${escapeMAGCMTooltipAttr(traitsStr || "")}" data-is-critical="${Boolean(isCritical)}" data-is-opponent-fumble="${Boolean(isOpponentFumble)}" data-attack-message-id="${attackMessageId || ""}">${count} Special Effect${count === 1 ? "" : "s"}</span>
        </div>`;
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

// Gathers every status this module tracks for one hit location - wound severity, impale/entangle/stun/ward/
// cover flags, held weapons, and equipped armor - all in one place. Used by the Ctrl+Hover popover's combined
// Hit Location Status tab (unlike the token overlay tooltips, which each track only their own single status).
function buildMAGCMHitLocationStatusEntry(actor, loc) {
    const maxHp = Number(getMAGCMHitLocationMaxHp(loc));
    const currentHp = Number(loc.system?.currentHp ?? loc.system?.hp?.value ?? maxHp);
    const woundSeverity = getMAGCMWoundSeverityData(loc);

    const impaledRaw = loc.getFlag(MAGCM_MODULE_ID, "impaledBy");
    const impaledRecords = Array.isArray(impaledRaw) ? impaledRaw : (impaledRaw ? [impaledRaw] : []);
    const stunnedData = loc.getFlag(MAGCM_MODULE_ID, "stunnedBy") || null;
    const entangledData = loc.getFlag(MAGCM_MODULE_ID, "entangledBy") || null;
    const wardWeaponId = loc.getFlag(MAGCM_MODULE_ID, "blockingWeapon");
    const wardWeapon = wardWeaponId ? actor.items.get(wardWeaponId) : null;
    const inCover = Boolean(loc.getFlag(MAGCM_MODULE_ID, "inCover"));

    const heldWeapons = actor.items.filter(i => {
        if (i.type !== "melee-weapon" && i.type !== "ranged-weapon") return false;
        if (isMAGCMNaturalWeapon(i)) return Boolean((i.getFlag(MAGCM_MODULE_ID, "naturalWeaponLocations") || {})[loc.id]);
        return (i.getFlag(MAGCM_MODULE_ID, "holdingLocations") || []).includes(loc.id);
    });
    const equippedArmor = actor.items.filter(i => i.type === "armor" && i.system?.equipped
        && (i.system?.location || []).includes(loc.id));

    return { location: loc, maxHp, currentHp, woundSeverity, impaledRecords, stunnedData, entangledData, wardWeapon, inCover, heldWeapons, equippedArmor, isOwner: Boolean(actor.isOwner) };
}

// Small icon chip used inside the combined Hit Location Status grid/list cells - a lightweight visual cue
// for one status, with the specifics left to its native `title` tooltip (this popover has no room for the
// floating rich tooltip used by the token overlay icons above). `badge`, if provided, pins the badge's own
// Font Awesome glyph (no backing shape) to the icon's bottom-right corner, rather than a glow/filter on
// the icon itself, so it never blends with or depends on the icon's own shape/transparency.
function buildMAGCMStatusIconHtml(iconSrc, title, badge = null) {
    const glyph = badge ? `<i class="fas ${badge.icon}" style="position: absolute; bottom: -2px; right: -2px; font-size: 8px; color: ${badge.color}; text-shadow: -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000;"></i>` : "";
    return `<span style="position: relative; display: inline-flex; width: 13px; height: 13px;"><img src="${iconSrc}" title="${String(title).replace(/"/g, "&quot;")}" style="width: 13px; height: 13px; object-fit: contain; border: none;" />${glyph}</span>`;
}

// Builds the icon row + HP line shown for one hit location in the combined Hit Location Status tab.
function buildMAGCMHitLocationStatusCellHtml(entry, isHumanoid) {
    const icons = [];
    if (entry.woundSeverity) {
        icons.push(buildMAGCMStatusIconHtml(getMAGCMWoundLocationIconPath(entry.woundSeverity, entry.location.name, isHumanoid), entry.woundSeverity.label));
    }
    if (entry.impaledRecords.length > 0) {
        const names = entry.impaledRecords.map(r => `${r.isProjectile ? `${r.weaponName} projectile` : r.weaponName} (by ${r.attackerName})`).join(", ");
        icons.push(buildMAGCMStatusIconHtml(`${MAGCM_ICONS_PATH}conditions/impaled.svg`, `Impaled: ${names}`));
    }
    if (entry.stunnedData) {
        const turnsLabel = entry.stunnedData.indefinite
            ? "Indefinitely (Serious Wound)"
            : (entry.stunnedData.turnsRemaining === 1 ? "1 turn remaining" : `${entry.stunnedData.turnsRemaining} turns remaining`);
        icons.push(buildMAGCMStatusIconHtml(getStunLocationIconPath(entry.location.name), `Stunned: ${turnsLabel} (${entry.stunnedData.weaponName || "Unknown"})`));
    }
    if (entry.entangledData) {
        icons.push(buildMAGCMStatusIconHtml(`${MAGCM_ICONS_PATH}conditions/entangled.svg`, `Entangled by ${entry.entangledData.weaponName || "Unknown"}`));
    }
    if (entry.wardWeapon) {
        icons.push(buildMAGCMStatusIconHtml(`${MAGCM_ICONS_PATH}overlays/warded.svg`, `Warded by ${entry.wardWeapon.name}`));
    }
    if (entry.inCover) {
        icons.push(buildMAGCMStatusIconHtml(`${MAGCM_ICONS_PATH}overlays/in-cover.svg`, "In Cover"));
    }
    for (const weapon of entry.heldWeapons) {
        const badge = getMAGCMConditionBadge(weapon, weapon.system?.hp, "originalHp", "HP");
        const naturalSuffix = isMAGCMNaturalWeapon(weapon) ? " (Natural)" : "";
        icons.push(buildMAGCMStatusIconHtml(weapon.img || "icons/svg/sword.svg", `${weapon.name}${naturalSuffix}${badge ? ` (${badge.text})` : ""}`, badge));
    }
    for (const armor of entry.equippedArmor) {
        const badge = getMAGCMConditionBadge(armor, armor.system?.ap, "originalAp", "AP");
        icons.push(buildMAGCMStatusIconHtml(armor.img || `${MAGCM_ICONS_PATH}overlays/warded.svg`, `${armor.name}${badge ? ` (${badge.text})` : ""}`, badge));
    }

    const hasMaxHp = Number.isFinite(entry.maxHp) && entry.maxHp > 0;
    let hpLine = hasMaxHp ? `<span style="font-size: 8px; color: #ddd;">${entry.currentHp}/${entry.maxHp} HP</span>` : "";
    if (!entry.isOwner && !game.settings.get(MAGCM_MODULE_ID, "enableShowExactHpValuesToPlayers")) {
        hpLine = `<span class="magcm-gm-only">${hpLine}</span>`;
    }
    const iconRow = icons.length > 0 ? `<div style="display: flex; flex-wrap: wrap; gap: 2px; justify-content: center; margin-top: 2px;">${icons.join("")}</div>` : "";
    return { hpLine, iconRow };
}

// Builds the "Status" tab body for the Ctrl+Hover popover: EVERY hit location is shown at
// once (unlike the token overlay tooltips above, which only show locations actively flagged with a
// status), each with its current/max HP and every tracked status icon (wound/impale/stun/entangle/ward/
// cover/held weapon/equipped armor, including damaged-weapon-or-armor condition badges).
function buildMAGCMTrackedStatsHtml(actor) {
    const stats = actor?.statTracker?.trackedStats;
    if (!stats) return "";

    const parseStat = (val) => {
        if (val === undefined || val === null || val === "") return null;
        const num = Number(val);
        return Number.isNaN(num) ? null : num;
    };

    const ap = parseStat(stats.actionPoints?.value);
    const lp = parseStat(stats.luckPoints?.value);
    const mp = parseStat(stats.magicPoints?.value);
    const tp = parseStat(stats.tenacity?.value ?? stats.tenacityPoints?.value);
    const dm = actor?.damageMod;

    const statItems = [];

    if (ap !== null) {
        statItems.push(`
            <div style="display: flex; flex-direction: column; align-items: center; min-width: 32px;">
                <span style="font-size: 8px; text-transform: uppercase; color: #aaa; font-weight: bold;">AP</span>
                <span style="font-size: 11px; font-weight: bold; color: #4ade80;">${ap}</span>
            </div>`);
    }

    if (dm !== undefined && dm !== null && dm !== "") {
        statItems.push(`
            <div style="display: flex; flex-direction: column; align-items: center; min-width: 32px;">
                <span style="font-size: 8px; text-transform: uppercase; color: #aaa; font-weight: bold;">Dmg Mod</span>
                <span style="font-size: 11px; font-weight: bold; color: #fb923c;">${dm}</span>
            </div>`);
    }

    if (lp !== null && lp > 0) {
        statItems.push(`
            <div style="display: flex; flex-direction: column; align-items: center; min-width: 32px;">
                <span style="font-size: 8px; text-transform: uppercase; color: #aaa; font-weight: bold;">Luck</span>
                <span style="font-size: 11px; font-weight: bold; color: #facc15;">${lp}</span>
            </div>`);
    }

    if (mp !== null && mp > 0) {
        statItems.push(`
            <div style="display: flex; flex-direction: column; align-items: center; min-width: 32px;">
                <span style="font-size: 8px; text-transform: uppercase; color: #aaa; font-weight: bold;">MP</span>
                <span style="font-size: 11px; font-weight: bold; color: #60a5fa;">${mp}</span>
            </div>`);
    }

    if (tp !== null && tp > 0) {
        statItems.push(`
            <div style="display: flex; flex-direction: column; align-items: center; min-width: 32px;">
                <span style="font-size: 8px; text-transform: uppercase; color: #aaa; font-weight: bold;">Tenacity</span>
                <span style="font-size: 11px; font-weight: bold; color: #f43f5e;">${tp}</span>
            </div>`);
    }

    if (statItems.length === 0) return "";

    return `
        <div style="display: flex; justify-content: space-around; align-items: center; background: rgba(0, 0, 0, 0.25); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 4px; padding: 4px; margin-bottom: 6px;">
            ${statItems.join("")}
        </div>`;
}

function buildMAGCMMovementStatsHtml(actor) {
    const movement = actor?.movement;
    if (!movement) return "";

    const parseStat = (val) => {
        if (val === undefined || val === null || val === "") return null;
        const num = Number(val);
        return Number.isNaN(num) ? val : num;
    };

    const movementMap = [
        { key: "walk", label: "Walk" },
        { key: "run", label: "Run" },
        { key: "sprint", label: "Sprint" },
        { key: "climb", label: "Climb" },
        { key: "swim", label: "Swim" },
        { key: "jumpHorizontal", label: "H. Jump" },
        { key: "jumpVertical", label: "V. Jump" }
    ];

    const statItems = [];

    for (const { key, label } of movementMap) {
        const val = parseStat(movement[key]);
        if (val !== null && (typeof val !== "number" || val > 0)) {
            statItems.push(`
                <div style="display: flex; flex-direction: column; align-items: center; min-width: 28px;">
                    <span style="font-size: 8px; text-transform: uppercase; color: #aaa; font-weight: bold;">${label}</span>
                    <span style="font-size: 10px; font-weight: bold; color: #38bdf8;">${val}</span>
                </div>`);
        }
    }

    if (statItems.length === 0) return "";

    return `
        <div style="display: flex; flex-wrap: wrap; justify-content: space-around; align-items: center; background: rgba(0, 0, 0, 0.2); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 4px; padding: 3px 4px; margin-bottom: 6px; gap: 4px;">
            ${statItems.join("")}
        </div>`;
}

function buildMAGCMHitLocationStatusTabHtml(actor, { includeTrackedStats = false, includeMovementStats = false } = {}) {
    const trackedStatsHtml = includeTrackedStats ? buildMAGCMTrackedStatsHtml(actor) : "";
    const movementStatsHtml = includeMovementStats ? buildMAGCMMovementStatsHtml(actor) : "";
    const headerHtml = `${trackedStatsHtml}${movementStatsHtml}`;

    const hitLocations = actor.items.filter(i => i.type === "hitLocation");
    if (hitLocations.length === 0) {
        return `
            ${headerHtml}
            <div style="text-align: center; padding: 10px 0; font-style: italic; color: #777; font-size: 11px;">No hit locations found.</div>`;
    }

    const entries = hitLocations.map(loc => buildMAGCMHitLocationStatusEntry(actor, loc));
    const isHumanoid = isMAGCMActorHumanoid(actor);

    let contentHtml = "";

    if (isHumanoid) {
        const entriesByName = new Map(entries.map(entry => [entry.location.name, entry]));
        const gridCells = Object.entries(MAGCM_HUMANOID_SLOTS).map(([locName, slot]) => {
            const entry = entriesByName.get(locName);
            if (!entry) {
                return `
                    <div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; padding: 2px; opacity: 0.35;">
                        <span style="font-size: 8px; color: #aaa;">${slot.label}</span>
                    </div>`;
            }
            const { hpLine, iconRow } = buildMAGCMHitLocationStatusCellHtml(entry, isHumanoid);
            const style = entry.woundSeverity ? MAGCM_WOUND_STYLE[entry.woundSeverity.key] : null;
            const bg = style ? hexToMAGCMRgba(style.hex, 0.16) : "rgba(255,255,255,0.05)";
            const border = style ? style.border : "#444";
            return `
                <div style="grid-area: ${slot.area}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${bg}; border: 1px solid ${border}; border-radius: 4px; padding: 3px 2px; text-align: center;">
                    <span style="font-size: 9px; font-weight: bold; color: #f0f0f0;">${locName}</span>
                    ${hpLine}
                    ${iconRow}
                </div>`;
        }).join("");

        contentHtml = `
            <div style="display: grid; grid-template-columns: repeat(3, minmax(70px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px;">
                ${gridCells}
            </div>`;
    } else {
        const listItems = entries.map(entry => {
            const { hpLine, iconRow } = buildMAGCMHitLocationStatusCellHtml(entry, isHumanoid);
            const style = entry.woundSeverity ? MAGCM_WOUND_STYLE[entry.woundSeverity.key] : null;
            const bg = style ? hexToMAGCMRgba(style.hex, 0.1) : "rgba(255,255,255,0.05)";
            const border = style ? style.border : "#444";
            return `
                <div style="background: ${bg}; border: 1px solid ${border}; border-radius: 3px; padding: 4px 6px; margin-bottom: 4px;">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <span style="font-size: 10px; font-weight: 500;">${entry.location.name}</span>
                        ${hpLine}
                    </div>
                    ${iconRow}
                </div>`;
        }).join("");

        contentHtml = `<div>${listItems}</div>`;
    }

    return `<div>${headerHtml}${contentHtml}</div>`;
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

// Migrated from the deprecated "renderChatMessage" hook (removed in FVTT v15) to its ApplicationV2-era
// replacement, which passes a raw HTMLElement instead of a jQuery-wrapped array - this handler already
// only ever indexed into html[0] to reach that raw element, so the only change needed throughout is
// dropping that [0] indexing wherever it appears below.

// Promoted out of the renderChatMessageHTML hook below (no closure dependencies) so the standalone
// Impale/Unimpale macro can also call them directly instead of only via the Attack card's own buttons.
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

async function updateImpaleState(targetToken, targetActor, hitLocation, attackerActor, weapon, impaledData, impaleId = null) {
    const isProjectile = impaledData?.isProjectile || weapon?.type === "ranged-weapon";
    const isRemovingImpale = !impaledData;
    const canUpdateDirectly = targetActor.canUserModify(game.user, "update")
        && (isRemovingImpale || isProjectile || attackerActor?.canUserModify(game.user, "update"));
    if (canUpdateDirectly) {
        if (isProjectile) {
            const stored = hitLocation.getFlag(MAGCM_MODULE_ID, "impaledBy");
            const records = Array.isArray(stored) ? stored : (stored ? [stored] : []);
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

// Mirrors the Damage Applied card's own wound-colour/GM-only HP gating (see administerDamage above),
// so the Impale/Unimpale cards look and behave identically instead of leaking raw HP to everyone.
function buildMAGCMImpaleHpStatusHtml(statusTargetActor, updatedHpValue, statusHitLocation) {
    const locMaxHp = Number(getMAGCMHitLocationMaxHp(statusHitLocation));
    let hpStatusLabel = "Healthy";
    let hpStatusColor = "#3f9c4c";
    if (Number.isFinite(locMaxHp) && locMaxHp > 0) {
        if (updatedHpValue <= -locMaxHp) { hpStatusLabel = "Major Wound"; hpStatusColor = MAGCM_WOUND_STYLE["major-wound"].hex; }
        else if (updatedHpValue <= 0) { hpStatusLabel = "Serious Wound"; hpStatusColor = MAGCM_WOUND_STYLE["serious-wound"].hex; }
        else if (updatedHpValue < locMaxHp) { hpStatusLabel = "Minor Wound"; hpStatusColor = MAGCM_WOUND_STYLE["minor-wound"].hex; }
    }
    let hpNumbers = Number.isFinite(locMaxHp) && locMaxHp > 0 ? ` (${updatedHpValue}/${locMaxHp} HP)` : ` (${updatedHpValue} HP)`;
    if (!game.settings.get(MAGCM_MODULE_ID, "enableShowExactHpValuesToPlayers")) {
        hpNumbers = `<span class="magcm-gm-only" data-hp-owner-actor="${statusTargetActor.id}">${hpNumbers}</span>`;
    }
    return `<div class="magcm-wound-label-row"><span class="magcm-wound-label" style="color: ${hpStatusColor};">${hpStatusLabel}${hpNumbers}</span></div>`;
}

// Applies an unimpale (withdraws a lodged weapon) - HP write (unless safe), clears the impale flag, refreshes
// token overlays, and posts the "Impaled Weapon Withdrawn" card. Shared by the standalone Impale/Unimpale
// macro (called directly, no intermediate "prepare" step) and the legacy .apply-unimpale-damage chat button.
async function magcmApplyUnimpale({ speaker, targetToken, targetActor, hitLocation, attackerActor, weapon, damage, safeUnimpale, impaleId }) {
    const currentHp = Number(hitLocation.system.currentHp ?? hitLocation.system.hp?.value ?? 0);
    const updatedHp = safeUnimpale ? currentHp : currentHp - damage;
    if (!safeUnimpale) await updateHitLocationHp(targetToken, targetActor, hitLocation.id, updatedHp, attackerActor.uuid || null);
    await updateImpaleState(targetToken, targetActor, hitLocation, attackerActor, weapon, null, impaleId || null);
    canvas.tokens.placeables.filter(t => t.actor?.id === targetActor.id || t.actor?.id === attackerActor?.id).forEach(t => t.refresh());

    const unimpAttackerToken = canvas.tokens.placeables.find(t => t.actor?.id === attackerActor?.id);
    const unimpAttackerNameHtml = getMAGCMCombatantNameHtml(attackerActor.name, getMAGCMCombatantColor(attackerActor, unimpAttackerToken), attackerActor.id, unimpAttackerToken?.id, targetToken.id);
    const unimpTargetNameHtml = getMAGCMCombatantNameHtml(targetToken.name, getMAGCMCombatantColor(targetActor, targetToken), targetActor.id, targetToken.id, unimpAttackerToken?.id);
    const damageRowHtml = safeUnimpale ? "" : `
                <div class="attack-info-row" style="border-bottom: none;">
                    <div class="attack-info-row__label">Damage Applied:</div>
                    <span class="attack-info-pill magcm-damage-applied-value" data-magcm-tooltip="${escapeMAGCMTooltipAttr(`Damage Applied: <strong>${damage}</strong> HP`)}">${damage}</span>
                </div>`;
    const unimpNoticeHtml = safeUnimpale
        ? `<hr><div class="magcm-chat-card-notice"><i class="fas fa-shield-heart"></i> Withdrawn safely - ${hitLocation.name} took no damage.</div>`
        : "";

    await ChatMessage.create({
        speaker,
        content: `
            <div class="magcm-attack-card magcm-chat-card magcm-damage-card">
            <div class="magcm-chat-card-title magcm-chat-card-title--damage">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/impaled.svg`)} Impaled Weapon Withdrawn</div>
            <div class="magcm-chat-card-header">
                ${buildMAGCMCombatantsRowHtml(unimpAttackerNameHtml, "Attacker", unimpTargetNameHtml, "Target")}
                ${buildMAGCMStatsRowHtml([{ label: "Weapon", value: weapon.name, tooltipHtml: buildMAGCMWeaponTooltipHTML(attackerActor, weapon) }])}
                <div class="attack-info-row" style="border-bottom: none;">
                    <div class="attack-info-row__label">Hit Location:</div>
                    <div class="attack-info-pill attack-location-result-value">${hitLocation.name}</div>
                </div>
                ${damageRowHtml}
                ${buildMAGCMImpaleHpStatusHtml(targetActor, updatedHp, hitLocation)}
            </div>
            ${unimpNoticeHtml}
            </div>
        `
    });
}

Hooks.on('renderChatMessageHTML', async (message, html, data) => {
    const messageDoc = game.messages.find(i => i.id == html.dataset.messageId);
    if (!messageDoc) return;

    // Baked "GM-only" HP values (e.g. the Damage Applied card) still reveal to the target's own token owner,
    // even when the "Show HP Values to Players" setting is off, since the shared HTML can't know the viewer
    // ahead of time - each client's own render pass here decides whether to lift the CSS-driven hiding.
    html.querySelectorAll('[data-hp-owner-actor]').forEach(el => {
        const owningActor = game.actors.get(el.dataset.hpOwnerActor);
        if (owningActor?.isOwner) el.classList.remove('magcm-gm-only');
    });

    // -- 1. Existing Damage Application Logic --
    let chatButtons = [...html.querySelectorAll('.submit-damage')];
    let revealButton = html.querySelector(".viewDamage");
    let damageElement = html.querySelector(".damageElement");
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
    const hitLocationRollButton = html.querySelector('.roll-hit-location');
    const attackDamageRollButton = html.querySelector('.roll-attack-damage');
    const attackDamageRerollButton = html.querySelector('.reroll-attack-damage');
    const damageResultSpan = html.querySelector('.attack-damage-result');
    const hitLocationResultEl = html.querySelector('.attack-hit-location-result');
    const locationArmorEl = html.querySelector('.attack-location-armor');
    const attackRollResultEl = html.querySelector('.attack-roll-result-value');
    const bypassWornArmorToggle = html.querySelector('.attack-bypass-worn-armor');
    const bypassNaturalArmorToggle = html.querySelector('.attack-bypass-natural-armor');
    const damageModeRadios = html.querySelectorAll('.attack-damage-mode-radio');
    const impaleToggle = html.querySelector('.attack-impale-toggle');
    const sunderToggle = html.querySelector('.attack-sunder-toggle');
    const entangleToggle = html.querySelector('.attack-entangle-toggle');
    const stunLocationToggle = html.querySelector('.attack-stun-location-toggle');
    const bleedToggle = html.querySelector('.attack-bleed-toggle');
    const gripToggle = html.querySelector('.attack-grip-toggle');
    const attackHitLocationRolled = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location-rolled');
    const attackHitLocationChosen = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location-chosen');
    const attackDamageRolled = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-rolled');
    const attackContentElement = html.querySelector('.message-content') || html;
    const attackerUserId = html.querySelector('[data-attacker-user-id]')?.dataset.attackerUserId;
    const canControlAttack = game.user.isGM
        || attackerUserId === game.user.id
        || messageDoc.author?.id === game.user.id
        || messageDoc.user?.id === game.user.id;

    // The target's token owner can see exact HP values on this card even if the "Show HP Values to Players"
    // setting is off (GMs already can, via the magcm-gm-only/body.magcm-is-gm CSS pairing used elsewhere).
    // Wrapped defensively: canvas.tokens can briefly be unavailable (e.g. right after a page reload, before
    // the canvas finishes initializing) - letting that throw here would abort this ENTIRE handler before
    // any of the button/tooltip wiring below ever runs, which is why cards intermittently "stopped working".
    let hpTargetActor = null;
    try {
        const hpTargetTokenId = hitLocationRollButton?.dataset.targetToken || html.querySelector('[data-target-token]')?.dataset.targetToken;
        if (hpTargetTokenId) {
            hpTargetActor = canvas.tokens?.get(hpTargetTokenId)?.actor || game.scenes?.current?.tokens.get(hpTargetTokenId)?.actor || null;
        }
    } catch (e) {
        console.warn(`${MAGCM_MODULE_ID} | Could not resolve target actor for HP visibility (canvas may not be ready yet)`, e);
    }
    const canSeeExactHp = Boolean(hpTargetActor?.isOwner);

    attachMAGCMDamageTooltip(damageResultSpan, () => {
        const rawBreakdown = damageResultSpan?.dataset.breakdown || damageResultSpan?.getAttribute('title') || "";
        const maximisedStacks = Number(damageResultSpan?.dataset.maximiseStacks) || 0;
        const rerolled = damageResultSpan?.dataset.rerolled === 'true';
        const armorHoldsDamage = computeMAGCMCurrentArmorHoldsDamage();
        return buildMAGCMDamageNoteHtml({ maximisedStacks, rerolled, armorHoldsDamage }) + rawBreakdown;
    });
    attachMAGCMInfoTooltip(hitLocationResultEl, '<i class="fas fa-crosshairs"></i> Location Details', () => hitLocationResultEl?.dataset.magcmTooltip || "", "magcm-theme-location");
    attachMAGCMInfoTooltip(locationArmorEl, '<i class="fas fa-shield-alt"></i> Armour Breakdown', () => locationArmorEl?.dataset.magcmTooltip || "", "magcm-theme-armor");
    attachMAGCMInfoTooltip(attackRollResultEl, '<i class="fas fa-dice-d20"></i> Roll Details', () => attackRollResultEl?.dataset.magcmTooltip || "", () => getMAGCMRollResultThemeClass(attackRollResultEl?.dataset.result));

    // Name-only tooltip (no description) so hovering one chip doesn't obscure the rest of the toggle grid.
    // Title is left blank - the CSS collapses an empty title bar - so the name renders as a single compact line.
    html.querySelectorAll('.attack-toggle-chip[data-effect-name]').forEach(chip => {
        const effectName = chip.dataset.effectName;
        attachMAGCMInfoTooltip(chip, "", () => `<strong><i class="fas fa-star"></i> ${effectName}</strong>`, "magcm-theme-special-effect");
    });

    // Resolve Damage requires the hit location, damage, AND a defensive reaction (Parry/Evade, any outcome)
    // to all be settled first - recomputed fresh on every hover so the checklist always reflects live state.
    // Attached to the button's wrapper (not the button itself): disabled buttons don't dispatch pointer
    // events, which would otherwise hide the very tooltip meant to explain why it's disabled.
    const resolveDamageWrapEl = html.querySelector('.magcm-resolve-damage-wrap');
    attachMAGCMInfoTooltip(resolveDamageWrapEl, '<i class="fas fa-lock"></i> Resolve Damage Requirements', () => {
        const requirements = [
            { label: "Hit Location determined", met: Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location-rolled')) },
            { label: "Damage rolled", met: Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-rolled')) },
            { label: "Parry or Evade resolved", met: Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-defense-resolved')) }
        ];
        return requirements.map(r => `<div style="display:flex; align-items:center; gap:6px;${r.met ? "" : " opacity:0.85;"}"><i class="fas ${r.met ? 'fa-circle-check' : 'fa-circle-xmark'}" style="display:inline-flex; align-items:center; justify-content:center; width:14px; color:${r.met ? '#3f9c4c' : '#cc3b3b'};"></i><span>${r.label}</span></div>`).join("");
    }, "magcm-theme-lock");

    const winnerEffectsEl = html.querySelector('.attack-winner-effects-value');
    // Recomputed fresh on every hover (rather than a tooltip baked in once at card-creation time) since
    // "injured-target" effects depend on the ORIGINAL Attack card's damage/hit-location, which is very
    // often still unrolled when this Parry/Evade card is first created - a baked-in list would keep
    // showing Bleed/Stun Location/etc. even after the attacker later rolls damage that doesn't overcome armour.
    attachMAGCMInfoTooltip(winnerEffectsEl, '<i class="fas fa-star"></i> Available Special Effects', () => {
        if (!winnerEffectsEl?.dataset.category) return "";
        const isInjuredTarget = computeMAGCMIsInjuredTarget(winnerEffectsEl.dataset.attackMessageId || null);
        const effectNames = getMAGCMAvailableSpecialEffectNames(
            winnerEffectsEl.dataset.category,
            winnerEffectsEl.dataset.weaponType,
            winnerEffectsEl.dataset.traits,
            winnerEffectsEl.dataset.isCritical === "true",
            winnerEffectsEl.dataset.isOpponentFumble === "true",
            isInjuredTarget
        );
        return effectNames.length > 0
            ? effectNames.map(n => `<i class="fas fa-star" style="font-size:0.7em;"></i> ${n}`).join("<br/>")
            : "None currently available";
    }, "magcm-theme-roll-critical");

    // Post-hoc difficulty change: clicking the "(Difficulty)" badge next to a roll pill lets whoever
    // controls this card re-pick its difficulty, rewriting the roll's result (and cascading into whichever
    // Parry/Evade card resolved against it, or vice versa) - see magcmApplyDifficultyChange. Locked once
    // damage has actually been applied (see magcmGetDifficultyLockInfo), since that step can't be undone.
    const difficultyData = messageDoc.getFlag(MAGCM_MODULE_ID, "magcm-difficulty");
    if (difficultyData) {
        const difficultyLockInfo = magcmGetDifficultyLockInfo(messageDoc, difficultyData);
        html.querySelectorAll('.magcm-roll-difficulty-badge').forEach(badgeEl => {
            if (difficultyLockInfo.locked) badgeEl.classList.add("magcm-difficulty-locked");
            attachMAGCMInfoTooltip(badgeEl, '<i class="fas fa-sliders"></i> Difficulty', () => {
                const baseTooltip = buildMAGCMDifficultyTooltipHtml(difficultyData.diffIndex, difficultyData.originalDiffIndex);
                return difficultyLockInfo.locked
                    ? `${baseTooltip.replace(/<br\/><em>.*<\/em>$/, "")}<br/><em style="color:#cc3b3b;">${difficultyLockInfo.reasonHtml}</em>`
                    : baseTooltip;
            }, "magcm-theme-lock");
            if (!difficultyLockInfo.locked && canControlAttack) {
                badgeEl.addEventListener('click', event => {
                    event.stopPropagation();
                    magcmShowDifficultyPicker(badgeEl, messageDoc.id, difficultyData.diffIndex);
                });
            }
        });
    }

    // Damage Applied card's final HP-damage pill (see administerDamage below)
    html.querySelectorAll('.magcm-damage-applied-value').forEach(el => {
        attachMAGCMInfoTooltip(el, '<i class="fas fa-heart-crack"></i> Damage Breakdown', () => el.dataset.magcmTooltip || "", "magcm-theme-damage");
    });

    // Any stat pill built with a pre-rendered tooltip (currently just the Weapon pill) shares this binding.
    html.querySelectorAll('.magcm-chat-card-stat--tooltip').forEach(statEl => {
        attachMAGCMWeaponPillTooltip(statEl, () => statEl.dataset.magcmTooltip || "");
    });

    // Attacker/Defender/Target/Winner names: single-click selects & pans to the token (if owned), while a
    // double-click opens the actor sheet (Foundry enforces permission on its own for the sheet). The single
    // click is delayed briefly so a following dblclick can cancel it - the standard click/dblclick disambiguation.
    html.querySelectorAll('.magcm-combatant-link[data-actor-id]').forEach(nameEl => {
        let clickTimeout = null;
        nameEl.addEventListener('click', () => {
            if (clickTimeout) return;
            clickTimeout = setTimeout(() => {
                clickTimeout = null;
                const linkedToken = canvas.tokens.get(nameEl.dataset.tokenId);
                if (linkedToken?.isOwner) {
                    linkedToken.control({ releaseOthers: true });
                    canvas.animatePan({ x: linkedToken.center.x, y: linkedToken.center.y });

                    // Clicking a name you own also re-targets the OTHER party named on the same card - a
                    // quick way to line up your next Attack/Parry/Evade against whoever this card involved.
                    const oppositeToken = canvas.tokens.get(nameEl.dataset.oppositeTokenId);
                    if (oppositeToken) oppositeToken.setTarget(true, { user: game.user, releaseOthers: true });
                }
            }, 250);
        });
        nameEl.addEventListener('dblclick', () => {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }
            const linkedActor = game.actors.get(nameEl.dataset.actorId);
            linkedActor?.sheet?.render(true);
        });
    });

    // Reads the currently rolled/chosen hit location (cached as JSON on the pill itself) combined with the
    // CURRENT damage/bypass state to determine whether armour alone would absorb the whole blow.
    function computeMAGCMCurrentArmorHoldsDamage() {
        const raw = hitLocationResultEl?.dataset.locationData;
        const damage = Number(damageResultSpan?.dataset.rawDamage);
        if (!raw || !Number.isFinite(damage)) return false;
        let location;
        try { location = JSON.parse(raw); } catch (e) { return false; }
        const bypassWorn = Boolean(bypassWornArmorToggle?.checked);
        const bypassNatural = Boolean(bypassNaturalArmorToggle?.checked);
        return computeMAGCMArmorHoldsDamage(damage, location.armor, location.naturalArmor, bypassWorn, bypassNatural);
    }

    // Re-renders the Hit Location pill's text/icons/tooltip, and the Weapon Damage pill's icon cluster, so
    // both stay in sync whenever the location changes, the damage is (re-)rolled, or a Bypass toggle flips.
    function refreshMAGCMHitLocationDisplay() {
        if (hitLocationResultEl?.dataset.locationData) {
            try {
                const location = JSON.parse(hitLocationResultEl.dataset.locationData);
                hitLocationResultEl.innerHTML = renderMAGCMHitLocationResultText(location);
                hitLocationResultEl.dataset.magcmTooltip = renderMAGCMHitLocationTooltipHtml(location, canSeeExactHp);
            } catch (e) { /* malformed cache - leave the pill untouched */ }
        }

        if (damageResultSpan && Number.isFinite(Number(damageResultSpan.dataset.rawDamage))) {
            const maximised = damageResultSpan.dataset.maximised === 'true';
            const rerolled = damageResultSpan.dataset.rerolled === 'true';
            const armorHoldsDamage = computeMAGCMCurrentArmorHoldsDamage();
            damageResultSpan.innerHTML = `<strong>${damageResultSpan.dataset.rawDamage}</strong>${buildMAGCMDamagePillIconsHtml({ maximised, rerolled, armorHoldsDamage })}`;
        }
    }

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

    // Bleed (special effect): flags the whole actor (not just the struck location) as bleeding, tracked via
    // a plain actor flag (see the Bleeding overlay icon and the Bleeding Fatigue Progression hook) rather than
    // a Foundry Active Effect. Applying it again (e.g. a fresh wound) resets the round counter to the newest source.
    async function applyBleeding(targetToken, targetActor, attackerActor, weapon) {
        const bleedData = {
            attackerActorId: attackerActor?.id || null,
            attackerName: attackerActor?.name || "Unknown",
            weaponId: weapon?.id || null,
            weaponName: weapon?.name || "Weapon",
            startRound: game.combat?.round ?? null
        };
        if (targetActor.canUserModify(game.user, "update")) {
            await targetActor.setFlag(MAGCM_MODULE_ID, "bleedingBy", bleedData);
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateActorFlag",
                actorId: targetActor.id,
                flag: "bleedingBy",
                value: bleedData
            });
        }
        return bleedData;
    }

    // Grip (always-available toggle - the GM decides whether gripping is contextually possible): flags the
    // whole actor (not a specific hit location) as gripped, tracked as an array on the actor rather than a
    // single record, since multiple attackers can be gripping the same character at once. Re-applying from
    // the same attacker replaces that attacker's own entry instead of stacking duplicates. Cleared per-source
    // via the Break Free macro.
    async function applyGrip(targetToken, targetActor, attackerActor, weapon) {
        const gripData = {
            gripId: foundry.utils.randomID(),
            attackerActorId: attackerActor?.id || null,
            attackerName: attackerActor?.name || "Unknown",
            weaponId: weapon?.id || null,
            weaponName: weapon?.name || "Unarmed"
        };
        if (targetActor.canUserModify(game.user, "update")) {
            const existing = Array.isArray(targetActor.getFlag(MAGCM_MODULE_ID, "grippedBy")) ? targetActor.getFlag(MAGCM_MODULE_ID, "grippedBy") : [];
            await targetActor.setFlag(MAGCM_MODULE_ID, "grippedBy", [...existing.filter(g => g.attackerActorId !== gripData.attackerActorId), gripData]);
        } else {
            game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
                action: "updateGripState",
                targetActorId: targetActor.id,
                gripData
            });
        }
        return gripData;
    }

    function updateDamageActionState() {
        const hitLocationAndDamageReady = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location-rolled'))
            && Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-rolled'));
        const defenseResolved = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-defense-resolved'));
        const resolveDamageReady = hitLocationAndDamageReady && defenseResolved;
        html.querySelectorAll('.submit-damage.simple-damage').forEach(button => {
            button.disabled = !resolveDamageReady;
        });
        html.querySelectorAll('.attack-impale-button, .attack-stun-location-button').forEach(button => {
            button.disabled = !hitLocationAndDamageReady;
        });
        const chooseLocationButton = html.querySelector('.choose-location');
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
        if (damageModeRadios.length > 0) {
            const storedDamageMode = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-mode') || 'full';
            damageModeRadios.forEach(radio => {
                radio.checked = radio.value === storedDamageMode;
                radio.disabled = !canControlAttack || isClicked;
            });
        }
        for (const toggle of [
            { el: impaleToggle, flag: 'attack-impale-toggle' },
            { el: sunderToggle, flag: 'attack-sunder-toggle' },
            { el: entangleToggle, flag: 'attack-entangle-toggle' },
            { el: stunLocationToggle, flag: 'attack-stun-location-toggle' },
            { el: bleedToggle, flag: 'attack-bleed-toggle' },
            { el: gripToggle, flag: 'attack-grip-toggle' }
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
            hitLocationResultEl.dataset.locationData = JSON.stringify(hitLocationData);
            refreshMAGCMHitLocationDisplay();
            locationArmorEl.innerHTML = `${locationCardData.armor} AP`;
            locationArmorEl.dataset.magcmTooltip = renderMAGCMLocationArmorTooltipHtml(locationCardData);
            html.querySelectorAll('.submit-damage, .attack-impale-button, .attack-stun-location-button').forEach(button => {
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

    // The click handler is always attached (not just while unrolled) so that changing Maximise Damage after
    // the fact - which only unlocks the button below rather than rolling immediately - can re-trigger it.
    if (attackDamageRollButton) {
        attackDamageRollButton.addEventListener('click', async () => {
            if (!canControlAttack || attackDamageRollButton.disabled) return;
            const maximiseSelect = html.querySelector('.maximise-damage-select');
            const maximiseStacks = maximiseSelect ? Number(maximiseSelect.value) || 0 : 0;
            const formula = applyMaximiseDamage(attackDamageRollButton.dataset.damageFormula || '1d3', maximiseStacks);
            const damageRoll = await new Roll(formula).evaluate();
            const damage = Math.max(0, Number(damageRoll.total));

            await playAttackRoll(damageRoll);
            const maximisedFlag = maximiseStacks > 0;
            damageResultSpan.innerHTML = `<strong>${damage}</strong>${buildMAGCMDamagePillIconsHtml({ maximised: maximisedFlag, rerolled: false, armorHoldsDamage: false })}`;
            const weaponFormula = attackDamageRollButton.dataset.weaponFormula || "";
            const modifierFormula = attackDamageRollButton.dataset.modifierFormula || "";
            const maximisedWeaponFormula = weaponFormula ? applyMaximiseDamage(weaponFormula, maximiseStacks) : weaponFormula;
            damageResultSpan.dataset.breakdown = describeMAGCMRollBreakdown(damageRoll, maximisedWeaponFormula, modifierFormula);
            damageResultSpan.dataset.rawDamage = String(damage);
            damageResultSpan.dataset.maximised = String(maximisedFlag);
            damageResultSpan.dataset.maximiseStacks = String(maximiseStacks);
            damageResultSpan.dataset.rerolled = 'false';
            damageResultSpan.removeAttribute('title');
            html.querySelectorAll('.submit-damage, .attack-stun-location-button').forEach(button => {
                button.dataset.damage = damage;
            });
            attackDamageRollButton.disabled = true;
            attackDamageRollButton.innerText = 'Damage Rolled';
            refreshMAGCMHitLocationDisplay();
            await updateAttackCard({
                'attack-damage-rolled': true,
                'attack-damage': damage,
                'attack-maximise-stacks': maximiseStacks,
                'attack-damage-rerolled': false
            });
        });
        attackDamageRollButton.disabled = !canControlAttack || attackDamageRolled;
        if (attackDamageRolled) attackDamageRollButton.innerText = 'Damage Rolled';
    }

    // Maximise Damage stays usable after Rolling Damage, but no longer re-rolls the instant it's changed -
    // it simply unlocks Roll Damage again so the player explicitly chooses to re-roll with the new value
    // (which the click handler above reads fresh, since it queries the select's current value each click).
    const maximiseDamageSelect = html.querySelector('.maximise-damage-select');
    if (maximiseDamageSelect) {
        maximiseDamageSelect.disabled = !canControlAttack || isClicked;
        if (attackDamageRollButton) {
            maximiseDamageSelect.addEventListener('change', () => {
                if (!canControlAttack || isClicked) return;
                if (!Number.isFinite(Number(damageResultSpan?.dataset.rawDamage))) return;
                attackDamageRollButton.disabled = false;
                attackDamageRollButton.innerText = 'Roll Damage';
            });
        }
    }

    if (attackDamageRerollButton) {
        attackDamageRerollButton.addEventListener('click', async () => {
            if (!canControlAttack) return;

            // Re-roll Damage (homebrew special effect): re-roll the damage die/dice and keep whichever of
            // the two results is higher, rather than blindly overwriting the earlier (possibly better) roll.
            const previousDamage = Number(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage')) || 0;
            const previousBreakdown = damageResultSpan.dataset.breakdown || "";
            const previousMaximiseStacks = Number(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-maximise-stacks')) || 0;

            const maximiseSelect = html.querySelector('.maximise-damage-select');
            const maximiseStacks = maximiseSelect ? Number(maximiseSelect.value) || 0 : previousMaximiseStacks;
            const formula = applyMaximiseDamage(attackDamageRerollButton.dataset.damageFormula || '1d3', maximiseStacks);
            const damageRoll = await new Roll(formula).evaluate();
            const rerolledDamage = Math.max(0, Number(damageRoll.total));

            await playAttackRoll(damageRoll);

            const keepReroll = rerolledDamage > previousDamage;
            const damage = keepReroll ? rerolledDamage : previousDamage;
            const finalMaximiseStacks = keepReroll ? maximiseStacks : previousMaximiseStacks;
            // Clicking Re-roll always counts as having used the effect, even if the new roll didn't beat the old one.
            const rerolledFlag = true;
            const maximisedFlag = finalMaximiseStacks > 0;

            let breakdown = previousBreakdown;
            if (keepReroll) {
                const weaponFormula = attackDamageRerollButton.dataset.weaponFormula || "";
                const modifierFormula = attackDamageRerollButton.dataset.modifierFormula || "";
                const maximisedWeaponFormula = weaponFormula ? applyMaximiseDamage(weaponFormula, maximiseStacks) : weaponFormula;
                breakdown = describeMAGCMRollBreakdown(damageRoll, maximisedWeaponFormula, modifierFormula);
            }

            damageResultSpan.innerHTML = `<strong>${damage}</strong>${buildMAGCMDamagePillIconsHtml({ maximised: maximisedFlag, rerolled: rerolledFlag, armorHoldsDamage: false })}`;
            damageResultSpan.dataset.breakdown = breakdown;
            damageResultSpan.dataset.rawDamage = String(damage);
            damageResultSpan.dataset.maximised = String(maximisedFlag);
            damageResultSpan.dataset.maximiseStacks = String(finalMaximiseStacks);
            damageResultSpan.dataset.rerolled = String(rerolledFlag);
            damageResultSpan.removeAttribute('title');
            html.querySelectorAll('.submit-damage, .attack-stun-location-button').forEach(button => {
                button.dataset.damage = damage;
            });
            refreshMAGCMHitLocationDisplay();
            await updateAttackCard({
                'attack-damage-rolled': true,
                'attack-damage': damage,
                'attack-maximise-stacks': finalMaximiseStacks,
                'attack-damage-rerolled': rerolledFlag
            });
        });
    }

    if (attackDamageRolled) {
        const damage = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage');
        const storedStacks = Number(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-maximise-stacks')) || 0;
        const rerolledFlag = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-rerolled'));
        const maximisedFlag = storedStacks > 0;
        damageResultSpan.dataset.rawDamage = String(damage);
        damageResultSpan.dataset.maximised = String(maximisedFlag);
        damageResultSpan.dataset.maximiseStacks = String(storedStacks);
        damageResultSpan.dataset.rerolled = String(rerolledFlag);
        html.querySelectorAll('.submit-damage, .attack-stun-location-button').forEach(button => {
            button.dataset.damage = damage;
        });
        const maximiseSelect = html.querySelector('.maximise-damage-select');
        if (maximiseSelect) {
            if (Number.isFinite(storedStacks)) maximiseSelect.value = String(storedStacks);
            maximiseSelect.disabled = !canControlAttack || isClicked;
        }
    }
    if (attackHitLocationRolled) {
        const location = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-hit-location');
        if (location) {
            hitLocationResultEl.dataset.locationData = JSON.stringify(location);
            locationArmorEl.innerHTML = `${location.armor} AP`;
            locationArmorEl.dataset.magcmTooltip = renderMAGCMLocationArmorTooltipHtml(location);
            html.querySelectorAll('.submit-damage, .attack-impale-button, .attack-stun-location-button').forEach(button => {
                button.dataset.hitLocationId = location.id;
                button.dataset.hitLocationName = location.name;
                button.dataset.armor = location.armor;
                button.dataset.naturalArmor = location.naturalArmor;
            });
        }
    }
    updateDamageActionState();
    refreshMAGCMHitLocationDisplay();

    if (bypassWornArmorToggle) {
        bypassWornArmorToggle.addEventListener('change', async () => {
            if (!canControlAttack) return;
            refreshMAGCMHitLocationDisplay();
            await updateAttackCard({ 'attack-bypass-worn-armor': bypassWornArmorToggle.checked });
        });
    }
    if (bypassNaturalArmorToggle) {
        bypassNaturalArmorToggle.addEventListener('change', async () => {
            if (!canControlAttack) return;
            refreshMAGCMHitLocationDisplay();
            await updateAttackCard({ 'attack-bypass-natural-armor': bypassNaturalArmorToggle.checked });
        });
    }
    damageModeRadios.forEach(radio => {
        radio.addEventListener('change', async () => {
            if (!canControlAttack || !radio.checked) return;
            await updateAttackCard({ 'attack-damage-mode': radio.value, 'attack-damage-mode-user-set': true });
        });
    });
    for (const toggle of [
        { el: impaleToggle, flag: 'attack-impale-toggle' },
        { el: sunderToggle, flag: 'attack-sunder-toggle' },
        { el: entangleToggle, flag: 'attack-entangle-toggle' },
        { el: stunLocationToggle, flag: 'attack-stun-location-toggle' },
        { el: bleedToggle, flag: 'attack-bleed-toggle' },
        { el: gripToggle, flag: 'attack-grip-toggle' }
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
            const damageMode = messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-damage-mode') || 'full';
            const useImpale = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-impale-toggle'));
            const useSunder = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-sunder-toggle'));
            const useEntangle = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-entangle-toggle'));
            const useStunLocation = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-stun-location-toggle'));
            const useBleed = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-bleed-toggle'));
            const useGrip = Boolean(messageDoc.getFlag(MAGCM_MODULE_ID, 'attack-grip-toggle'));
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

            // Damage Mode halves or zeroes whichever raw value ends up being used (the original, or the higher Impale roll), before armour mitigation
            const mitigatableDamage = damageMode === 'none' ? 0 : (damageMode === 'half' ? Math.round(keptRawDamage / 2) : keptRawDamage);

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
                } else if (locNameLower.includes("chest") || locNameLower.includes("torso") || locNameLower.includes("abdomen") || locNameLower.includes("thorax") || locNameLower.includes("body") || locNameLower.includes("quarters") || locNameLower.includes("length")) {
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

            // Bleed: a wound that actually breaks through armour (HP damage > 0) opens a bleeding injury on the target
            let bleedApplied = false;
            if (useBleed && armorMitigatedDamage > 0) {
                await applyBleeding(targetToken, targetActor, attackerActor, weapon);
                bleedApplied = true;
            }

            // Grip: purely a GM-adjudicated call (checking the box already implies gripping was contextually
            // possible), so - like Entangle - it applies whenever the card is resolved, regardless of whether
            // the blow overcame armour or dealt HP damage.
            let gripData = null;
            if (useGrip) {
                gripData = await applyGrip(targetToken, targetActor, attackerActor, weapon);
            }

            // Set flag so message locks / shows applied
            await messageDoc.setFlag('mythras-angrygorillas-custom-macros', 'damage-applied', true);

            // Themed like the Attack/Parry/Evade cards (see .magcm-chat-card in chat-styles.css): reuses the
            // same combatants row, stat-pill row, and notice styling instead of the old plain <h3>/<p> layout.
            const attackerToken = canvas.tokens.get(damageButton.dataset.attackerToken);
            const dmgAttackerColor = getMAGCMCombatantColor(attackerActor, attackerToken);
            const dmgTargetColor = getMAGCMCombatantColor(targetActor, targetToken);
            const dmgAttackerNameHtml = getMAGCMCombatantNameHtml(attackerActor?.name || damageButton.dataset.attackerName || "Attacker", dmgAttackerColor, attackerActor?.id, attackerToken?.id, targetToken?.id);
            const dmgTargetNameHtml = getMAGCMCombatantNameHtml(targetName, dmgTargetColor, targetActor?.id, targetToken?.id, attackerToken?.id);

            const weaponTooltipHtml = weapon ? buildMAGCMWeaponTooltipHTML(attackerActor, weapon) : null;
            let rolledValueText = useImpale ? `${rawDamage} / ${impaleRoll.total} (kept ${keptRawDamage})` : `${keptRawDamage}`;
            if (damageMode !== 'full') rolledValueText += ` → ${mitigatableDamage}`;
            const modeLabel = damageMode === 'none' ? "No Damage" : (damageMode === 'half' ? "Half Damage" : "Full Damage");

            const dmgStatsRowHtml = buildMAGCMStatsRowHtml([
                { label: "Weapon", value: weaponName, tooltipHtml: weaponTooltipHtml },
                { label: "Rolled", value: rolledValueText },
                { label: "Mode", value: modeLabel, dataAttrs: { mode: damageMode } },
                { label: "Worn Armour", value: bypassWornArmor ? "Bypassed" : `${armorPoints} AP` },
                { label: "Natural Armour", value: bypassNaturalArmor ? "Bypassed" : `${naturalArmor} AP` }
            ]);

            const sunderNoticeHtml = sunderResult ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-hammer"></i> Sunder: ${sunderResult.usedArmor} AP consumed (${sunderResult.wornReductions.map(r => `${r.name}: -${r.reduceBy} AP (now ${r.newAp})`).join(", ") || "no worn armour reduced"}${sunderResult.naturalReduceBy > 0 ? `, Natural Armour: -${sunderResult.naturalReduceBy} AP (now ${sunderResult.newNaturalArmor})` : ""}).</div>` : "";

            // Colour-code the resulting HP the same way the Wound overlay icon does (minor/serious/major wound)
            const locMaxHp = Number(getMAGCMHitLocationMaxHp(hitLocation));
            let hpStatusLabel = "Healthy";
            let hpStatusColor = "#3f9c4c";
            if (Number.isFinite(locMaxHp) && locMaxHp > 0) {
                if (updatedHp <= -locMaxHp) { hpStatusLabel = "Major Wound"; hpStatusColor = MAGCM_WOUND_STYLE["major-wound"].hex; }
                else if (updatedHp <= 0) { hpStatusLabel = "Serious Wound"; hpStatusColor = MAGCM_WOUND_STYLE["serious-wound"].hex; }
                else if (updatedHp < locMaxHp) { hpStatusLabel = "Minor Wound"; hpStatusColor = MAGCM_WOUND_STYLE["minor-wound"].hex; }
            }

            
            let hpNumbers = Number.isFinite(locMaxHp) && locMaxHp > 0 ? ` (${updatedHp}/${locMaxHp} HP)` : ` (${updatedHp} HP)`;
            if (!game.settings.get(MAGCM_MODULE_ID, "enableShowExactHpValuesToPlayers")) {
                // This content is baked once and shared by every viewer, so a data attribute (rather than a
                // direct isOwner check) lets each viewer's own render pass below reveal it if they own the target.
                hpNumbers = `<span class="magcm-gm-only" data-hp-owner-actor="${targetActor.id}">${hpNumbers}</span>`;
            }

            const hpResultText = `${hpStatusLabel}${hpNumbers}`;

            // Hoverable breakdown for the Damage Applied pill below, matching the themed floating tooltip used
            // by the Hit Location/Armour/Roll pills on the Attack card (see attachMAGCMInfoTooltip wiring).
            const damageBreakdownLines = [`Rolled: <strong>${rawDamage}</strong>${useImpale ? ` | Impale Roll: <strong>${impaleRoll.total}</strong> (kept ${keptRawDamage})` : ""}`];
            if (damageMode !== 'full') damageBreakdownLines.push(`${modeLabel}: ${keptRawDamage} &rarr; <strong>${mitigatableDamage}</strong>`);
            damageBreakdownLines.push(`Armour Mitigation: -<strong>${maxAp}</strong> AP${sunderResult ? " (Sunder)" : ""} (Worn: ${bypassWornArmor ? "Bypassed" : `${armorPoints} AP`}, Natural: ${bypassNaturalArmor ? "Bypassed" : `${naturalArmor} AP`})`);
            damageBreakdownLines.push(`Damage Applied: <strong>${armorMitigatedDamage}</strong> HP`);
            const damageBreakdownHtml = damageBreakdownLines.join("<br/>");

            const effectNotices = [];
            if (impaledApplied) effectNotices.push(`<div class="magcm-chat-card-notice magcm-chat-card-notice--info">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/impaled.svg`)} ${weaponName} is now impaled in ${targetName}'s ${hitLocName}.</div>`);
            if (entangleApplied) effectNotices.push(`<div class="magcm-chat-card-notice magcm-chat-card-notice--info"><i class="fas fa-link"></i> ${targetName}'s ${hitLocName} is now entangled.</div>`);
            if (stunEffectDesc) effectNotices.push(`<div class="magcm-chat-card-notice magcm-chat-card-notice--warn">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`)} Stun Location: ${hitLocName} stunned for ${stunTurns} of ${targetName}'s own turn(s) - ${stunEffectDesc}</div>`);
            if (bleedApplied) effectNotices.push(`<div class="magcm-chat-card-notice"><i class="fas fa-droplet"></i> ${targetName} is now bleeding.</div>`);
            if (gripData) effectNotices.push(`<div class="magcm-chat-card-notice magcm-chat-card-notice--info">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/gripped.svg`)} ${targetName} is now gripped by ${gripData.attackerName}.</div>`);
            const effectNoticesHtml = effectNotices.length > 0 ? `<hr>${effectNotices.join("")}` : "";

            let content = `
        <div class="magcm-attack-card magcm-chat-card magcm-damage-card">
        <div class="magcm-chat-card-title magcm-chat-card-title--damage"><i class="fas fa-droplet"></i> Damage Applied</div>
        <div class="magcm-chat-card-header">
            ${buildMAGCMCombatantsRowHtml(dmgAttackerNameHtml, "Attacker", dmgTargetNameHtml, "Target")}
            ${dmgStatsRowHtml}
            ${sunderNoticeHtml}
            <div class="attack-info-row">
                <div class="attack-info-row__label">Hit Location:</div>
                <div class="attack-info-pill attack-location-result-value">${hitLocName}</div>
            </div>
            <div class="attack-info-row" style="border-bottom: none;">
                <div class="attack-info-row__label">Damage Applied:</div>
                <span class="attack-info-pill magcm-damage-applied-value" data-magcm-tooltip="${escapeMAGCMTooltipAttr(damageBreakdownHtml)}">${armorMitigatedDamage}</span>
            </div>
            <div class="magcm-wound-label-row">
                <span class="magcm-wound-label" style="color: ${hpStatusColor};">${hpResultText}</span>
            </div>
        </div>
        ${effectNoticesHtml}
        </div>
      `;

            // Posted (and awaited) before the actual HP write below, so the Damage Applied card always
            // appears ahead of the Serious/Major Wound automation card that write triggers (see the
            // updateItem hook above) - otherwise that hook's own chat message could resolve first.
            await ChatMessage.create({
                speaker: messageDoc.speaker,
                rolls: impaleRoll ? [impaleRoll] : [],
                content: content
            });

            // Update HP on the embedded hit location item (allowing negative HP)
            await updateHitLocationHp(targetToken, targetActor, hitLocationId, updatedHp, damageButton.dataset.attackerUuid || null);

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

                                                hitLocationResultEl.dataset.locationData = JSON.stringify(chosenLocationData);
                                                refreshMAGCMHitLocationDisplay();
                                                locationArmorEl.innerHTML = `${locationCardData.armor} AP`;
                                                locationArmorEl.dataset.magcmTooltip = renderMAGCMLocationArmorTooltipHtml(locationCardData);
                                                html.querySelectorAll('.submit-damage, .attack-impale-button, .attack-stun-location-button').forEach(button => {
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
                                        cancel: {
                                            icon: '<i class="fas fa-times"></i>',
                                            label: "Cancel"
                                        }
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
                                    content: `
                                        <div class="magcm-chat-card">
                                        <div class="magcm-chat-card-title magcm-chat-card-title--damage"><i class="fas fa-dice-d20"></i> Impale Extra Damage Roll</div>
                                        <div class="magcm-chat-card-header">
                                            ${buildMAGCMStatsRowHtml([{ label: "Roll", value: `[[${secondRoll.total}]]` }, { label: "Max Damage Used", value: impaleDamage }])}
                                        </div>
                                        </div>
                                    `
                                });
                            }, { once: true });
                        }
                        break;
                }
            }
        }
    }


    const impaleButton = html.querySelector('.apply-impale-damage');
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

            const impaled = rawDamage > Math.max(wornArmor, naturalArmor);
            if (impaled) {
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

            const impAttackerToken = canvas.tokens.placeables.find(t => t.actor?.id === attackerActor?.id);
            const impAttackerNameHtml = getMAGCMCombatantNameHtml(attackerActor.name, getMAGCMCombatantColor(attackerActor, impAttackerToken), attackerActor.id, impAttackerToken?.id, targetToken.id);
            const impTargetNameHtml = getMAGCMCombatantNameHtml(targetToken.name, getMAGCMCombatantColor(targetActor, targetToken), targetActor.id, targetToken.id, impAttackerToken?.id);
            const impBreakdownHtml = [
                `Rolled: <strong>${rawDamage}</strong>`,
                `Armour Mitigation: -<strong>${Math.max(wornArmor, naturalArmor)}</strong> AP (Worn: ${bypassWornArmor ? "Bypassed" : `${wornArmor} AP`}, Natural: ${bypassNaturalArmor ? "Bypassed" : `${naturalArmor} AP`})`,
                `Damage Applied: <strong>${mitigatedDamage}</strong> HP`
            ].join("<br/>");
            const impNoticeHtml = impaled
                ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--info">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/impaled.svg`)} ${weapon.name} is now impaled in ${targetToken.name}'s ${hitLocation.name}.</div>`
                : `<div class="magcm-chat-card-notice"><i class="fas fa-shield-heart"></i> The blow did not penetrate the combined armour protection.</div>`;

            ChatMessage.create({
                speaker: messageDoc.speaker,
                content: `
                    <div class="magcm-attack-card magcm-chat-card magcm-damage-card">
                    <div class="magcm-chat-card-title magcm-chat-card-title--damage">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/impaled.svg`)} Impale Damage Applied</div>
                    <div class="magcm-chat-card-header">
                        ${buildMAGCMCombatantsRowHtml(impAttackerNameHtml, "Attacker", impTargetNameHtml, "Target")}
                        ${buildMAGCMStatsRowHtml([{ label: "Weapon", value: weapon.name, tooltipHtml: buildMAGCMWeaponTooltipHTML(attackerActor, weapon) }])}
                        <div class="attack-info-row">
                            <div class="attack-info-row__label">Hit Location:</div>
                            <div class="attack-info-pill attack-location-result-value">${hitLocation.name}</div>
                        </div>
                        <div class="attack-info-row" style="border-bottom: none;">
                            <div class="attack-info-row__label">Damage Applied:</div>
                            <span class="attack-info-pill magcm-damage-applied-value" data-magcm-tooltip="${escapeMAGCMTooltipAttr(impBreakdownHtml)}">${mitigatedDamage}</span>
                        </div>
                        ${buildMAGCMImpaleHpStatusHtml(targetActor, updatedHp, hitLocation)}
                    </div>
                    <hr>
                    ${impNoticeHtml}
                    </div>
                `
            });
        });
    }

    const unimpaleButton = html.querySelector('.apply-unimpale-damage');
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

            await magcmApplyUnimpale({
                speaker: messageDoc.speaker,
                targetToken,
                targetActor,
                hitLocation,
                attackerActor,
                weapon,
                damage,
                safeUnimpale,
                impaleId: unimpaleButton.dataset.impaleId || null
            });

            await messageDoc.setFlag(MAGCM_MODULE_ID, 'unimpale-applied', true);
            unimpaleButton.disabled = true;
            unimpaleButton.innerText = "Unimpale Damage Applied";
        });
    }

    // -- 2. Parry, Evade, and Contest Button Listeners --
    let parryBtn = html.querySelector('.parry-button');
    let evadeBtn = html.querySelector('.evade-button');
    let contestBtn = html.querySelector('.contest-button');

    if (parryBtn) parryBtn.addEventListener('click', () => handleParryDialog(parryBtn.dataset.attackerRange, parryBtn.dataset.attackerSize, parryBtn.dataset.attackerResult, parryBtn.dataset.attackerName, parryBtn.dataset.attackerWeaponType, parryBtn.dataset.attackerWeaponTraits, parryBtn.dataset.attackerStyleTraits, parryBtn.dataset.attackerTokenId, parryBtn.dataset.attackerActorId, messageDoc.id));
    if (evadeBtn) evadeBtn.addEventListener('click', () => handleEvadeDialog(evadeBtn.dataset.attackerResult, evadeBtn.dataset.attackerName, evadeBtn.dataset.attackerWeaponType, evadeBtn.dataset.attackerWeaponTraits, evadeBtn.dataset.attackerStyleTraits, evadeBtn.dataset.attackerTokenId, evadeBtn.dataset.attackerActorId, messageDoc.id));

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
    let sfButtons = html.querySelectorAll('.special-effects-button');
    sfButtons.forEach(btn => btn.addEventListener('click', () => renderSpecialEffectsDialog(btn.dataset.winner, btn.dataset.effects, btn.dataset.weaponType, btn.dataset.traits, btn.dataset.isCritical, btn.dataset.isOpponentFumble, btn.dataset.attackMessageId)));

    // -- 4. Fatigue Endurance Roll Handler --
    let enduranceBtn = html.querySelector('.roll-endurance-btn');
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
                } catch (e) {
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

                            let resultLabel = getMAGCMResultLabelForRoll(roll.result, skillVal, baseSkillVal);

                            let diffText = "Standard";
                            switch (String(diffMult)) {
                                case "2": diffText = "Very Easy"; break;
                                case "1.5": diffText = "Easy"; break;
                                case "1": diffText = "Standard"; break;
                                case "0.67": diffText = "Hard"; break;
                                case "0.5": diffText = "Formidable"; break;
                                case "0.1": diffText = "Herculean"; break;
                            }

                            let chatModHtml = isModTextVisible ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: #e1a100; font-weight: bold;">
                            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
                        </span>
                    </div>` : "";

                            const enduranceRollPillHtml = buildMAGCMRollResultPillHtml({
                                rollTotal: roll.result,
                                resultLabel,
                                skillName: "Endurance",
                                effectiveSkillValue: baseSkillVal,
                                diffText,
                                targetValue: skillVal,
                                augmentLine: "None",
                                forced: false
                            });

                            ChatMessage.create({
                                speaker: ChatMessage.getSpeaker({ actor: actor }),
                                flavor: `${actor.name} rolls Endurance for fatigue check.`,
                                content: `
                                    <div class="magcm-chat-card">
                                    <div class="magcm-chat-card-title"><i class="fas fa-heart-pulse"></i> Endurance Roll</div>
                                    <div class="magcm-chat-card-header">
                                        ${buildMAGCMStatsRowHtml([{ label: "Character", value: actor.name }])}
                                        ${chatModHtml}
                                        <div class="magcm-chat-card-roll">
                                            <div class="magcm-chat-card-roll__label">Endurance Roll<span class="magcm-chat-card-roll__diff" data-difficulty="${diffText}"> (${diffText})</span></div>
                                            ${enduranceRollPillHtml}
                                        </div>
                                    </div>
                                    </div>
                                `,
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
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel"
                    }
                },
                default: "roll"
            }).render(true);

        }, { once: true });
    }

    // -- 4b. Serious/Major Wound Endurance Roll Handler --
    // Opens the same skill-roll dialog the character sheet uses (actor.sheet.handleSkillRoll), defaulted to
    // Endurance, rather than a bespoke roll implementation (see the Serious/Major Wound automation hook).
    let woundEnduranceBtn = html.querySelector('.magcm-wound-endurance-btn');
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

    // -- 4c. Serious Wound "Stun Location" Handler --
    // Applies an indefinite Stun Location (no turnsRemaining - see the turn-progression hook's guard and the
    // recovery-clear branch in the Serious/Major Wound automation hook above) to the wounded location itself.
    let woundStunBtn = html.querySelector('.magcm-wound-stun-btn');
    if (woundStunBtn) {
        const stunActorId = woundStunBtn.dataset.actorId;
        const stunLocationId = woundStunBtn.dataset.locationId;
        const stunTargetActor = game.actors.get(stunActorId) || canvas.tokens.placeables.find(t => t.actor?.id === stunActorId)?.actor;
        const alreadyIndefinitelyStunned = Boolean(stunTargetActor?.items.get(stunLocationId)?.getFlag(MAGCM_MODULE_ID, "stunnedBy")?.indefinite);
        if (alreadyIndefinitelyStunned) {
            woundStunBtn.disabled = true;
            woundStunBtn.innerHTML = `${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`)} Location Stunned`;
        }

        woundStunBtn.addEventListener('click', () => {
            const locationName = woundStunBtn.dataset.locationName || "location";
            const attackerActorId = woundStunBtn.dataset.attackerActorId || null;
            const attackerName = woundStunBtn.dataset.attackerName || "Unknown";

            if (!stunTargetActor) return ui.notifications.warn("Actor not found for Stun Location.");

            const attackerActor = attackerActorId ? game.actors.get(attackerActorId) : null;
            const canUseButton = game.user.isGM || Boolean(stunTargetActor.isOwner) || Boolean(attackerActor?.isOwner);
            if (!canUseButton) {
                return ui.notifications.warn("Only the GM, the attacker, or the wounded character's owner may apply this Stun Location.");
            }

            new Dialog({
                title: "Confirm Stun Location",
                content: `<p>Apply an indefinite Stun Location to <strong>${locationName}</strong>?</p><p style="font-size: 0.9em; color: #aaa;">Unlike a Special Effect Stun Location, this has no turn counter - it persists until the wound heals back to a Minor Wound.</p>`,
                buttons: {
                    confirm: {
                        icon: getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`),
                        label: "Stun Location",
                        callback: async () => {
                            const stunData = {
                                attackerActorId,
                                attackerName,
                                weaponId: null,
                                weaponName: "Serious Wound",
                                indefinite: true
                            };
                            await magcmApplyIndefiniteStunLocation(stunTargetActor, stunLocationId, stunData);
                            woundStunBtn.disabled = true;
                            woundStunBtn.innerHTML = `${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`)} Location Stunned`;
                        }
                    },
                    cancel: {
                        icon: '<i class="fas fa-times"></i>',
                        label: "Cancel"
                    }
                },
                default: "cancel"
            }).render(true);
        }, { once: true });
    }
});

// Helper Function: Calculate Differential Success
function calculateDifferentialSuccess(attackerResult, defenderResult) {
    const successValues = { "Critical": 3, "Success": 2, "Failure": 1, "Fumble": 0 };
    // Use ?? rather than || - Fumble's value of 0 is falsy and must not be coerced to the "unknown result" fallback.
    const atkVal = successValues[attackerResult] ?? 1;
    const defVal = successValues[defenderResult] ?? 1;

    let diff = atkVal - defVal;
    let winner = diff > 0 ? "attacker" : (diff < 0 ? "defender" : "none");
    let count = Math.abs(diff);

    // A mere Failure never earns Special Effects, even against a Fumble - only a Success or better does,
    // since Special Effects represent actively exploiting an advantage, not just failing less badly.
    const winnerValue = winner === "attacker" ? atkVal : (winner === "defender" ? defVal : null);
    if (winnerValue !== null && winnerValue < successValues["Success"]) {
        winner = "none";
        count = 0;
    }

    return { winner, count, atkVal, defVal };
}

// Mythras rulebook (p.50, "Opposed Skills Over 100%"): the amount by which a skill exceeds 100% becomes a
// flat penalty applied to the OTHER side's effective skill in an Opposed/Differential Roll.
function getMAGCMOver100Excess(effectiveSkillValue) {
    return Math.max(0, Math.round(Number(effectiveSkillValue) || 0) - 100);
}

// Waits for Dice So Nice's animation (auto-triggered by ChatMessage.create when the message carries dice
// rolls) to finish for a specific message before resolving, so follow-up logic doesn't visibly race ahead
// of a roll the user is still watching land. Resolves immediately if Dice So Nice isn't active, and after
// a generous timeout as a safety net in case the hook never fires (e.g. a DSN version mismatch).
function waitForMAGCMDiceAnimation(messageId) {
    if (!game.dice3d || !messageId) return Promise.resolve();
    return new Promise(resolve => {
        const timeoutId = setTimeout(() => {
            Hooks.off("diceSoNiceRollComplete", hookId);
            resolve();
        }, 6000);
        const hookId = Hooks.on("diceSoNiceRollComplete", (completedMessageId) => {
            if (completedMessageId !== messageId) return;
            clearTimeout(timeoutId);
            Hooks.off("diceSoNiceRollComplete", hookId);
            resolve();
        });
    });
}

// Applies (or, with stunData === null, clears) the Serious Wound "Stun Location" button's indefinite stun
// flag directly on the wounded actor's hit location, relaying through the GM's socket if the current user
// (the attacker or the target, per the button's own permission check) lacks permission to edit that actor.
async function magcmApplyIndefiniteStunLocation(targetActor, locationId, stunData) {
    const location = targetActor?.items.get(locationId);
    if (!location) return;

    if (targetActor.canUserModify(game.user, "update")) {
        if (stunData === null) await location.unsetFlag(MAGCM_MODULE_ID, "stunnedBy");
        else await location.setFlag(MAGCM_MODULE_ID, "stunnedBy", stunData);
    } else {
        game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
            action: "applyIndefiniteStunLocation",
            actorId: targetActor.id,
            locationId,
            stunData
        });
    }
}

// Flags the ORIGINAL Attack chat card as having had a defensive reaction (Parry or Evade) resolved against
// it - regardless of that reaction's outcome (Do Not Parry, Failure, Success, Critical, or Fumble all count,
// since the defender has made their choice either way) - so the Resolve Damage button can require it before
// unlocking. Relayed through the GM's socket if the current user lacks permission to edit that chat message.
async function markMAGCMAttackDefenseResolved(attackMessageId, defenseType, defenseMessageId = null) {
    const attackMessage = attackMessageId ? game.messages.get(attackMessageId) : null;
    if (!attackMessage) return;

    if (attackMessage.canUserModify(game.user, "update")) {
        await attackMessage.update({
            content: attackMessage.content,
            [`flags.${MAGCM_MODULE_ID}.attack-defense-resolved`]: true,
            [`flags.${MAGCM_MODULE_ID}.attack-defense-type`]: defenseType,
            [`flags.${MAGCM_MODULE_ID}.attack-defense-message-id`]: defenseMessageId
        });
    } else {
        game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
            action: "markAttackDefenseResolved",
            messageId: attackMessageId,
            defenseType,
            defenseMessageId
        });
    }
}

// Reflects a successful Parry's negated-damage outcome back onto the ORIGINAL Attack chat card's damage-mode
// radios (bakes the "checked" attribute directly so it survives content serialization), relaying through the
// GM's socket if the current user lacks permission to edit that chat message.
async function applyMAGCMAttackDamageModeUpdate(attackMessageId, damageMode) {
    const attackMessage = game.messages.get(attackMessageId);
    if (!attackMessage) return;

    if (attackMessage.canUserModify(game.user, "update")) {
        const wrapper = document.createElement("div");
        wrapper.innerHTML = attackMessage.content;
        wrapper.querySelectorAll(".attack-damage-mode-radio").forEach(radio => {
            if (radio.value === damageMode) radio.setAttribute("checked", "");
            else radio.removeAttribute("checked");
        });
        await attackMessage.update({
            content: wrapper.innerHTML,
            [`flags.${MAGCM_MODULE_ID}.attack-damage-mode`]: damageMode
        });
    } else {
        game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
            action: "updateAttackDamageMode",
            messageId: attackMessageId,
            damageMode
        });
    }
}

// -- Post-hoc Difficulty Change (Attack/Parry/Evade) --
// A roll's difficulty can be changed after the fact by clicking the "(Difficulty)" badge next to its roll
// pill on the chat card (wired in the renderChatMessageHTML hook below). Every Attack/Parry/Evade/
// "Do Not Parry" message stores a `magcm-difficulty` flag object (see each dialog's ChatMessage.create) with
// everything needed to redo its own success/failure math from scratch, plus enough cross-referencing
// (attackMessageId / attack-defense-message-id) to cascade a change through into whichever other card
// resolved against it - so changing an Attack's difficulty after a Parry/Evade already happened rewrites
// that Parry/Evade card's differential success and Special Effects too, and vice versa.
//
// Deliberately NOT re-derived: once damage has actually been applied to a target's HP (the one truly
// irreversible step in this whole sequence), the difficulty badge is locked on both the Attack card and
// whichever Parry/Evade card resolved it - see magcmGetDifficultyLockInfo.

// Central entry point: looks up the message's own stored diffIndex if newDiffIndex isn't supplied (used to
// just refresh a card - e.g. a Parry card whose attacker's result changed - without altering its own pick).
async function magcmApplyDifficultyChange(messageId, newDiffIndex = null) {
    const messageDoc = messageId ? game.messages.get(messageId) : null;
    if (!messageDoc) return;

    if (!messageDoc.canUserModify(game.user, "update")) {
        game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
            action: "magcmRecomputeDifficulty",
            messageId,
            newDiffIndex
        });
        return;
    }

    const data = messageDoc.getFlag(MAGCM_MODULE_ID, "magcm-difficulty");
    if (!data) return;
    const effectiveDiffIndex = (newDiffIndex === null || newDiffIndex === undefined) ? data.diffIndex : newDiffIndex;

    switch (data.type) {
        case "attack": return magcmRebuildAttackCardForDifficulty(messageDoc, data, effectiveDiffIndex);
        case "parry": return magcmRebuildParryCardForDifficulty(messageDoc, data, effectiveDiffIndex);
        case "evade": return magcmRebuildEvadeCardForDifficulty(messageDoc, data, effectiveDiffIndex);
        case "parry-declined": return magcmRefreshParryDeclinedCard(messageDoc, data);
        default: return;
    }
}

// Determines whether a card's difficulty badge is currently editable. Damage having already been applied
// to the target's HP is the one step in this sequence that can't be safely undone by recomputation, so it
// freezes both the Attack card itself and whichever Parry/Evade/Do-Not-Parry card resolved against it.
function magcmGetDifficultyLockInfo(messageDoc, data) {
    if (data.type === "attack") {
        if (messageDoc.getFlag(MAGCM_MODULE_ID, "damage-applied")) {
            return { locked: true, reasonHtml: "Damage from this attack has already been applied - the difficulty can no longer be changed." };
        }
    } else if (data.attackMessageId) {
        const attackMessage = game.messages.get(data.attackMessageId);
        if (attackMessage?.getFlag(MAGCM_MODULE_ID, "damage-applied")) {
            return { locked: true, reasonHtml: "Damage from the original Attack has already been applied - the difficulty can no longer be changed." };
        }
    }
    return { locked: false };
}

// -- Retroactive Over-100% Skill Penalty (Parry/Evade vs Attack) --
// Mythras rulebook: "If the highest skilled participant in an Opposed or Differential Roll has a skill in
// excess of 100%, that participant subtracts the difference between 100 and his skill value from the skill
// of everyone in the contest" - and for Parry specifically, "Retroactive Parrying With a Skill over 100%"
// warns this can retroactively turn an attacker's hit into a miss, recommending it only be allowed if
// declared before the attacker rolls. This module resolves Parry/Evade reactively (after the attack), so
// per explicit design (GM discretion), a checkbox in the Parry/Evade dialog - shown only once the rolled
// skill actually exceeds 100% - lets the GM apply it retroactively anyway. This function performs that
// retroactive recompute of the ATTACK card.
//
// The new/old result labels are derived purely by reading the attack message's own flag data (no write
// permission needed for that part), so the caller always gets a correct answer for its own differential
// roll math immediately, even if the actual persisted rewrite of the Attack card has to be relayed through
// the GM's socket because the current user lacks permission to edit that chat message.
async function magcmApplyRetroactiveOver100ToAttack(attackMessageId, excess, sourceLabel) {
    const attackMessage = attackMessageId ? game.messages.get(attackMessageId) : null;
    if (!attackMessage) return null;
    const data = attackMessage.getFlag(MAGCM_MODULE_ID, "magcm-difficulty");
    if (!data || data.rollTotal === null || data.rollTotal === undefined) return null;

    const tier = MAGCM_DIFFICULTY_TIERS[data.diffIndex] ?? MAGCM_DIFFICULTY_TIERS[2];
    const baseTargetValue = Math.ceil(Number(data.effectiveSkillValue) * tier.mult);
    const priorExcess = Number(data.retroactiveOver100Excess) || 0;
    const originalResultLabel = getMAGCMResultLabelForRoll(Number(data.rollTotal), Math.max(0, baseTargetValue - priorExcess), Number(data.effectiveSkillValue));
    const newResultLabel = getMAGCMResultLabelForRoll(Number(data.rollTotal), Math.max(0, baseTargetValue - excess), Number(data.effectiveSkillValue));
    const originalNoteText = data.retroactiveOver100OriginalNote
        || `Originally: ${originalResultLabel} (rolled ${data.rollTotal} vs ${Math.max(0, baseTargetValue - priorExcess)}%)`;

    const newData = { ...data, retroactiveOver100Excess: excess, retroactiveOver100Source: sourceLabel, retroactiveOver100OriginalNote: originalNoteText };
    if (attackMessage.canUserModify(game.user, "update")) {
        await magcmRebuildAttackCardForDifficulty(attackMessage, newData, data.diffIndex);
    } else {
        game.socket.emit(`module.${MAGCM_MODULE_ID}`, {
            action: "magcmApplyRetroactiveOver100",
            messageId: attackMessageId,
            excess, sourceLabel
        });
    }

    return { originalResultLabel, newResultLabel, excess, sourceLabel, originalNoteText, changed: originalResultLabel !== newResultLabel };
}

// Rebuilds an Attack card for a (possibly unchanged, if only cascading) new difficulty index: the roll pill,
// the badge, the Parry/Evade/Contest buttons' cached attacker-result data (so a FUTURE defensive roll reacts
// to the new result), the Critical-only Bypass Armour toggles and Maximise Damage select (added/removed live
// per explicit design choice), the damage-mode default (only while the player hasn't manually chosen one),
// and - if a Parry/Evade/Do-Not-Parry already resolved against this attack - cascades into that card too.
async function magcmRebuildAttackCardForDifficulty(messageDoc, data, newDiffIndex) {
    const tier = MAGCM_DIFFICULTY_TIERS[newDiffIndex] ?? MAGCM_DIFFICULTY_TIERS[2];
    const baseTargetValue = Math.ceil(Number(data.effectiveSkillValue) * tier.mult);

    // The attacker's own prospective over-100% self-cap is tied to THIS roll's own target, so it must be
    // recomputed against the new difficulty rather than reusing the excess baked in at the original roll.
    const prospectiveApplied = Number(data.prospectiveOver100Excess) > 0;
    const prospectiveExcess = prospectiveApplied ? getMAGCMOver100Excess(baseTargetValue) : 0;
    const retroExcess = Number(data.retroactiveOver100Excess) || 0;
    const targetValue = Math.max(0, baseTargetValue - prospectiveExcess - retroExcess);
    const resultLabel = getMAGCMResultLabelForRoll(Number(data.rollTotal), targetValue, Number(data.effectiveSkillValue));
    const isCriticalNow = resultLabel === "Critical";

    const wrapper = document.createElement("div");
    wrapper.innerHTML = messageDoc.content;

    const badgeEl = wrapper.querySelector(".magcm-roll-difficulty-badge");
    if (badgeEl) badgeEl.outerHTML = buildMAGCMDifficultyBadgeHtml(newDiffIndex, data.originalDiffIndex);

    const pillEl = wrapper.querySelector(".attack-roll-result-value");
    if (pillEl) {
        pillEl.outerHTML = buildMAGCMRollResultPillHtml({
            rollTotal: data.rollTotal, resultLabel, skillName: data.skillName, effectiveSkillValue: data.effectiveSkillValue,
            diffText: tier.text, targetValue, augmentLine: data.augmentLine, forced: data.forced
        });
    }

    // A Parry/Evade defender whose own skill exceeds 100% may retroactively apply that excess as a penalty
    // to this attack's target (see "Retroactive Parrying With a Skill over 100%", Mythras rulebook) - keep
    // that reflected as a standing notice, since it can silently downgrade what was originally a hit.
    const existingProspectiveNotice = wrapper.querySelector(".magcm-prospective-over100-notice");
    if (prospectiveExcess > 0) {
        const prospectiveSourceName = data.prospectiveOver100SourceName || data.skillName;
        const prospectiveNoticeHtml = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-prospective-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${prospectiveSourceName} (${baseTargetValue}%) exceeds 100% by ${prospectiveExcess}% - own target capped at 100%, and the defender's Parry/Evade target will be reduced by ${prospectiveExcess}%.</div>`;
        if (existingProspectiveNotice) existingProspectiveNotice.outerHTML = prospectiveNoticeHtml;
        else wrapper.querySelector(".magcm-chat-card-roll")?.insertAdjacentHTML("beforebegin", prospectiveNoticeHtml);
    } else {
        existingProspectiveNotice?.remove();
    }

    const existingOver100Notice = wrapper.querySelector(".magcm-over100-notice");
    if (retroExcess > 0) {
        const noticeHtml = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${data.retroactiveOver100OriginalNote || "Originally a different result"} - retroactively reduced by ${retroExcess}% because ${data.retroactiveOver100Source || "the defender's skill"} exceeds 100%.</div>`;
        if (existingOver100Notice) existingOver100Notice.outerHTML = noticeHtml;
        else wrapper.querySelector(".attack-roll-result-value")?.closest(".magcm-chat-card-roll")?.insertAdjacentHTML("afterend", noticeHtml);
    } else {
        existingOver100Notice?.remove();
    }

    const parryBtn = wrapper.querySelector(".parry-button");
    if (parryBtn) parryBtn.dataset.attackerResult = resultLabel;
    const evadeBtn = wrapper.querySelector(".evade-button");
    if (evadeBtn) evadeBtn.dataset.attackerResult = resultLabel;
    const contestBtn = wrapper.querySelector(".contest-button");
    if (contestBtn) {
        contestBtn.dataset.attackerResult = resultLabel;
        contestBtn.dataset.attackerDiff = String(newDiffIndex);
    }

    const flagUpdates = {};

    const toggleGrid = wrapper.querySelector(".attack-toggle-grid");
    const hasBypassToggle = Boolean(toggleGrid?.querySelector(".attack-bypass-worn-armor"));
    if (toggleGrid && isCriticalNow && !hasBypassToggle) {
        toggleGrid.insertAdjacentHTML("afterbegin",
            `<label class="attack-toggle-chip" data-effect-name="Bypass Armour"><input type="checkbox" class="attack-bypass-worn-armor"> Bypass Worn Armour</label>` +
            `<label class="attack-toggle-chip" data-effect-name="Bypass Armour"><input type="checkbox" class="attack-bypass-natural-armor"> Bypass Natural Armour</label>`);
    } else if (toggleGrid && !isCriticalNow && hasBypassToggle) {
        toggleGrid.querySelectorAll(".attack-bypass-worn-armor, .attack-bypass-natural-armor").forEach(el => el.closest(".attack-toggle-chip")?.remove());
        flagUpdates["attack-bypass-worn-armor"] = false;
        flagUpdates["attack-bypass-natural-armor"] = false;
    }

    const rollDamageBtn = wrapper.querySelector(".roll-attack-damage");
    const weaponFormula = String(rollDamageBtn?.dataset.weaponFormula || "").trim();
    const leadingDiceMatch = weaponFormula.match(/^(\d*)d(\d+)/i);
    const maxDiceStacks = leadingDiceMatch ? (parseInt(leadingDiceMatch[1] || "1", 10)) : 0;
    const existingMaximiseSelect = wrapper.querySelector(".maximise-damage-select");
    const stagingWrap = wrapper.querySelector(".attack-staging-controls")?.parentElement;
    if (!existingMaximiseSelect && isCriticalNow && maxDiceStacks > 0 && stagingWrap) {
        const stackOptions = Array.from({ length: maxDiceStacks + 1 }, (_, i) => `<option value="${i}">${i}</option>`).join("");
        stagingWrap.insertAdjacentHTML("beforeend", `
                        <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 5px;">
                            <label for="maximise-damage-select" style="font-size: 0.85em;">Maximise Damage (dice):</label>
                            <select class="maximise-damage-select" id="maximise-damage-select" data-max-stacks="${maxDiceStacks}">${stackOptions}</select>
                        </div>`);
    } else if (existingMaximiseSelect && !isCriticalNow) {
        existingMaximiseSelect.closest("div")?.remove();
        flagUpdates["attack-maximise-stacks"] = 0;
    }

    if (!messageDoc.getFlag(MAGCM_MODULE_ID, "attack-damage-mode-user-set")) {
        const impliedMode = (resultLabel === "Failure" || resultLabel === "Fumble") ? "none" : "full";
        wrapper.querySelectorAll(".attack-damage-mode-radio").forEach(radio => {
            if (radio.value === impliedMode) radio.setAttribute("checked", "");
            else radio.removeAttribute("checked");
        });
        flagUpdates["attack-damage-mode"] = impliedMode;
    }

    const flagPayload = { [`flags.${MAGCM_MODULE_ID}.magcm-difficulty.diffIndex`]: newDiffIndex };
    if (data.retroactiveOver100Excess !== undefined) {
        flagPayload[`flags.${MAGCM_MODULE_ID}.magcm-difficulty.retroactiveOver100Excess`] = data.retroactiveOver100Excess;
        flagPayload[`flags.${MAGCM_MODULE_ID}.magcm-difficulty.retroactiveOver100Source`] = data.retroactiveOver100Source;
        flagPayload[`flags.${MAGCM_MODULE_ID}.magcm-difficulty.retroactiveOver100OriginalNote`] = data.retroactiveOver100OriginalNote;
    }
    if (prospectiveApplied) {
        flagPayload[`flags.${MAGCM_MODULE_ID}.magcm-difficulty.prospectiveOver100Excess`] = prospectiveExcess;
        flagPayload[`flags.${MAGCM_MODULE_ID}.magcm-difficulty.prospectiveOver100Source`] = prospectiveExcess > 0 ? `${data.prospectiveOver100SourceName || data.skillName} (${baseTargetValue}%)` : null;
    }
    for (const [flagName, flagValue] of Object.entries(flagUpdates)) {
        flagPayload[`flags.${MAGCM_MODULE_ID}.${flagName}`] = flagValue;
    }
    await messageDoc.update({ content: wrapper.innerHTML, ...flagPayload });

    const defenseMessageId = messageDoc.getFlag(MAGCM_MODULE_ID, "attack-defense-message-id");
    if (defenseMessageId) await magcmApplyDifficultyChange(defenseMessageId, null);
}

// Rebuilds a rolled Parry card: its own roll pill/badge, the differential success (always re-fetching the
// ATTACKER's live current result, in case the attacker's own difficulty was changed separately), the Winner
// line/Special Effects button, the Damage Negated stat pill, and its own Contest button's cached data. A
// Success/Critical result also re-reflects the negation onto the Attack card's damage-mode, mirroring the
// one-time behaviour already performed right after the original roll.
async function magcmRebuildParryCardForDifficulty(messageDoc, data, newDiffIndex) {
    const tier = MAGCM_DIFFICULTY_TIERS[newDiffIndex] ?? MAGCM_DIFFICULTY_TIERS[2];

    // Mirrors the two-stage over-100% reduction applied at roll time (see the Parry dialog's roll
    // callback): the attacker's prospective excess reduces this roll's target first, then this Parry's
    // own excess (if the GM opted in) caps what's left - both recomputed against the new difficulty.
    const attackData = data.attackMessageId ? game.messages.get(data.attackMessageId)?.getFlag(MAGCM_MODULE_ID, "magcm-difficulty") : null;
    const prospectiveOver100Excess = Number(attackData?.prospectiveOver100Excess) || 0;
    const prospectiveOver100Source = attackData?.prospectiveOver100Source || "";
    const afterProspective = Math.max(0, Math.ceil(Number(data.effectiveSkillValue) * tier.mult) - prospectiveOver100Excess);
    const selfOver100Excess = data.selfOver100Applied ? getMAGCMOver100Excess(afterProspective) : 0;
    const targetValue = Math.max(0, afterProspective - selfOver100Excess);
    const resultLabel = getMAGCMResultLabelForRoll(Number(data.rollTotal), targetValue, Number(data.effectiveSkillValue));

    const attackerLive = magcmGetLiveResultForMessage(data.attackMessageId);
    const attackerResult = attackerLive?.resultLabel ?? data.attackerResultSnapshot ?? "Failure";

    const diffObj = calculateDifferentialSuccess(attackerResult, resultLabel);
    const negationInfo = (resultLabel === "Failure" || resultLabel === "Fumble")
        ? { text: "None", ratio: 0 }
        : getMAGCMParryNegationInfo(data.attackerSize, data.defenderWeaponSize);

    let winnerType = "melee", winnerTraits = "", winnerIsCritical = false, loserIsFumble = false;
    if (diffObj.winner === "attacker") {
        winnerType = data.attackerWeaponType;
        winnerTraits = [data.attackerWeaponTraits, data.attackerStyleTraits].filter(Boolean).join(", ");
        winnerIsCritical = attackerResult === "Critical";
        loserIsFumble = resultLabel === "Fumble";
    } else if (diffObj.winner === "defender") {
        winnerType = data.defenderWeaponType;
        winnerTraits = [data.defenderWeaponTraits, data.defenderStyleTraits].filter(Boolean).join(", ");
        winnerIsCritical = resultLabel === "Critical";
        loserIsFumble = attackerResult === "Fumble";
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = messageDoc.content;

    const badgeEl = wrapper.querySelector(".magcm-roll-difficulty-badge");
    if (badgeEl) badgeEl.outerHTML = buildMAGCMDifficultyBadgeHtml(newDiffIndex, data.originalDiffIndex);
    const pillEl = wrapper.querySelector(".attack-roll-result-value");
    if (pillEl) {
        pillEl.outerHTML = buildMAGCMRollResultPillHtml({
            rollTotal: data.rollTotal, resultLabel, skillName: data.skillName, effectiveSkillValue: data.effectiveSkillValue,
            diffText: tier.text, targetValue, augmentLine: data.augmentLine, forced: data.forced
        });
    }

    const negatedPillEl = wrapper.querySelector("[data-negation]");
    if (negatedPillEl) {
        // Only replace the value span's text - overwriting the pill's own textContent would also wipe out its label span.
        const negatedValueEl = negatedPillEl.querySelector(".magcm-chat-card-stat__value");
        if (negatedValueEl) negatedValueEl.textContent = negationInfo.text;
        negatedPillEl.dataset.negation = negationInfo.ratio === 1 ? "full" : (negationInfo.ratio === 0.5 ? "half" : "none");
    }

    const existingSelfNotice = wrapper.querySelector(".magcm-self-over100-notice");
    if (selfOver100Excess > 0) {
        const selfNoticeHtml = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-self-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${data.skillName} exceeds 100% by ${selfOver100Excess}% - this Parry's own target was capped at ${targetValue}%, and this excess was applied retroactively to the attacker's roll.</div>`;
        if (existingSelfNotice) existingSelfNotice.outerHTML = selfNoticeHtml;
        else wrapper.querySelector(".magcm-chat-card-roll")?.insertAdjacentHTML("beforebegin", selfNoticeHtml);
    } else {
        existingSelfNotice?.remove();
    }

    const existingReceivedNotice = wrapper.querySelector(".magcm-received-over100-notice");
    if (prospectiveOver100Excess > 0) {
        const receivedNoticeHtml = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-received-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${prospectiveOver100Source} exceeds 100% - this Parry's effective skill was reduced by ${prospectiveOver100Excess}% before rolling.</div>`;
        if (existingReceivedNotice) existingReceivedNotice.outerHTML = receivedNoticeHtml;
        else wrapper.querySelector(".magcm-chat-card-roll")?.insertAdjacentHTML("beforebegin", receivedNoticeHtml);
    } else {
        existingReceivedNotice?.remove();
    }

    const winnerNameHtml = diffObj.winner === "attacker"
        ? wrapper.querySelector(".magcm-chat-card-combatant--right .magcm-chat-card-combatant__name")?.innerHTML || ""
        : (diffObj.winner === "defender" ? wrapper.querySelector(".magcm-chat-card-combatant--left .magcm-chat-card-combatant__name")?.innerHTML || "" : "");
    const winnerEl = wrapper.querySelector(".magcm-chat-card-winner");
    if (winnerEl) {
        winnerEl.outerHTML = buildMAGCMWinnerLineHtml({
            winner: diffObj.winner, count: diffObj.count, winnerNameHtml, weaponType: winnerType, traitsStr: winnerTraits,
            isCritical: winnerIsCritical, isOpponentFumble: loserIsFumble, attackMessageId: data.attackMessageId
        });
    }

    const buttonsRow = wrapper.querySelector(".special-effects-button")?.parentElement
        || wrapper.querySelector(".contest-button")?.parentElement;
    let sfBtn = wrapper.querySelector(".special-effects-button");
    if (diffObj.winner === "none") {
        sfBtn?.remove();
    } else {
        const sfBtnHtml = `<button class="special-effects-button" data-winner="${diffObj.winner}" data-effects="${diffObj.count}" data-weapon-type="${winnerType}" data-traits="${winnerTraits}" data-is-critical="${winnerIsCritical}" data-is-opponent-fumble="${loserIsFumble}" data-attack-message-id="${data.attackMessageId || ""}"><i class="fas fa-star"></i> Special Effects</button>`;
        if (sfBtn) sfBtn.outerHTML = sfBtnHtml;
        else buttonsRow?.insertAdjacentHTML("afterbegin", sfBtnHtml);
    }

    const contestBtn = wrapper.querySelector(".contest-button");
    if (contestBtn) {
        contestBtn.dataset.attackerResult = resultLabel;
        contestBtn.dataset.attackerDiff = String(newDiffIndex);
    }

    await messageDoc.update({
        content: wrapper.innerHTML,
        [`flags.${MAGCM_MODULE_ID}.magcm-difficulty.diffIndex`]: newDiffIndex
    });

    const attackerFailed = attackerResult === "Failure" || attackerResult === "Fumble";
    if (data.attackMessageId && !attackerFailed && (resultLabel === "Success" || resultLabel === "Critical")) {
        const damageMode = negationInfo.ratio === 1 ? "none" : (negationInfo.ratio === 0.5 ? "half" : "full");
        await applyMAGCMAttackDamageModeUpdate(data.attackMessageId, damageMode);
    }

    // This Parry's own difficulty change may have altered its self-cap excess - keep whatever was already
    // pushed onto the attacker's roll (see magcmApplyRetroactiveOver100ToAttack) in sync, otherwise the
    // Attack card would keep showing a stale reduction/result from before this difficulty change. Guarded
    // by comparing against what's currently stored on the Attack card so a cascade-triggered refresh of
    // THIS card (triggered by the push below rebuilding the Attack card, which cascades back here) finds
    // the values already equal and stops instead of looping.
    if (data.selfOver100Applied && data.attackMessageId) {
        const currentAttackData = game.messages.get(data.attackMessageId)?.getFlag(MAGCM_MODULE_ID, "magcm-difficulty");
        const currentlyPushedExcess = Number(currentAttackData?.retroactiveOver100Excess) || 0;
        if (currentlyPushedExcess !== selfOver100Excess) {
            const sourceLabel = `${data.defenderTokenName || "The defender"}'s ${data.skillName} (${afterProspective}%)`;
            await magcmApplyRetroactiveOver100ToAttack(data.attackMessageId, selfOver100Excess, sourceLabel);
        }
    }
}

// Rebuilds a rolled Evade card: same shape as the Parry rebuild above, minus anything weapon-negation
// specific (Evade has no Damage Negated pill and never reflects back onto the Attack card's damage-mode).
async function magcmRebuildEvadeCardForDifficulty(messageDoc, data, newDiffIndex) {
    const tier = MAGCM_DIFFICULTY_TIERS[newDiffIndex] ?? MAGCM_DIFFICULTY_TIERS[2];

    // Mirrors the two-stage over-100% reduction applied at roll time (see the Evade dialog's roll
    // callback): the attacker's prospective excess reduces this roll's target first, then this Evade's
    // own excess (if the GM opted in) caps what's left - both recomputed against the new difficulty.
    const attackData = data.attackMessageId ? game.messages.get(data.attackMessageId)?.getFlag(MAGCM_MODULE_ID, "magcm-difficulty") : null;
    const prospectiveOver100Excess = Number(attackData?.prospectiveOver100Excess) || 0;
    const prospectiveOver100Source = attackData?.prospectiveOver100Source || "";
    const afterProspective = Math.max(0, Math.ceil(Number(data.effectiveSkillValue) * tier.mult) - prospectiveOver100Excess);
    const selfOver100Excess = data.selfOver100Applied ? getMAGCMOver100Excess(afterProspective) : 0;
    const targetValue = Math.max(0, afterProspective - selfOver100Excess);
    const resultLabel = getMAGCMResultLabelForRoll(Number(data.rollTotal), targetValue, Number(data.effectiveSkillValue));

    const attackerLive = magcmGetLiveResultForMessage(data.attackMessageId);
    const attackerResult = attackerLive?.resultLabel ?? data.attackerResultSnapshot ?? "Failure";
    const diffObj = calculateDifferentialSuccess(attackerResult, resultLabel);

    let winnerType = "melee", winnerTraits = "", winnerIsCritical = false, loserIsFumble = false;
    if (diffObj.winner === "attacker") {
        winnerType = data.attackerWeaponType;
        winnerTraits = [data.attackerWeaponTraits, data.attackerStyleTraits].filter(Boolean).join(", ");
        winnerIsCritical = attackerResult === "Critical";
        loserIsFumble = resultLabel === "Fumble";
    } else if (diffObj.winner === "defender") {
        winnerType = "unarmed";
        winnerTraits = data.evadeSkillTraits || "";
        winnerIsCritical = resultLabel === "Critical";
        loserIsFumble = attackerResult === "Fumble";
    }

    const wrapper = document.createElement("div");
    wrapper.innerHTML = messageDoc.content;

    const badgeEl = wrapper.querySelector(".magcm-roll-difficulty-badge");
    if (badgeEl) badgeEl.outerHTML = buildMAGCMDifficultyBadgeHtml(newDiffIndex, data.originalDiffIndex);
    const pillEl = wrapper.querySelector(".attack-roll-result-value");
    if (pillEl) {
        pillEl.outerHTML = buildMAGCMRollResultPillHtml({
            rollTotal: data.rollTotal, resultLabel, skillName: data.skillName, effectiveSkillValue: data.effectiveSkillValue,
            diffText: tier.text, targetValue, augmentLine: data.augmentLine, forced: data.forced
        });
    }

    const existingSelfNotice = wrapper.querySelector(".magcm-self-over100-notice");
    if (selfOver100Excess > 0) {
        const selfNoticeHtml = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-self-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${data.skillName} exceeds 100% by ${selfOver100Excess}% - this Evade's own target was capped at ${targetValue}%, and this excess was applied retroactively to the attacker's roll.</div>`;
        if (existingSelfNotice) existingSelfNotice.outerHTML = selfNoticeHtml;
        else wrapper.querySelector(".magcm-chat-card-roll")?.insertAdjacentHTML("beforebegin", selfNoticeHtml);
    } else {
        existingSelfNotice?.remove();
    }

    const existingReceivedNotice = wrapper.querySelector(".magcm-received-over100-notice");
    if (prospectiveOver100Excess > 0) {
        const receivedNoticeHtml = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-received-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${prospectiveOver100Source} exceeds 100% - this Evade's effective skill was reduced by ${prospectiveOver100Excess}% before rolling.</div>`;
        if (existingReceivedNotice) existingReceivedNotice.outerHTML = receivedNoticeHtml;
        else wrapper.querySelector(".magcm-chat-card-roll")?.insertAdjacentHTML("beforebegin", receivedNoticeHtml);
    } else {
        existingReceivedNotice?.remove();
    }

    const winnerNameHtml = diffObj.winner === "attacker"
        ? wrapper.querySelector(".magcm-chat-card-combatant--right .magcm-chat-card-combatant__name")?.innerHTML || ""
        : (diffObj.winner === "defender" ? wrapper.querySelector(".magcm-chat-card-combatant--left .magcm-chat-card-combatant__name")?.innerHTML || "" : "");
    const winnerEl = wrapper.querySelector(".magcm-chat-card-winner");
    if (winnerEl) {
        winnerEl.outerHTML = buildMAGCMWinnerLineHtml({
            winner: diffObj.winner, count: diffObj.count, winnerNameHtml, weaponType: winnerType, traitsStr: winnerTraits,
            isCritical: winnerIsCritical, isOpponentFumble: loserIsFumble, attackMessageId: data.attackMessageId
        });
    }

    const buttonsRow = wrapper.querySelector(".special-effects-button")?.parentElement
        || wrapper.querySelector(".contest-button")?.parentElement;
    let sfBtn = wrapper.querySelector(".special-effects-button");
    if (diffObj.winner === "none") {
        sfBtn?.remove();
    } else {
        const sfBtnHtml = `<button class="special-effects-button" data-winner="${diffObj.winner}" data-effects="${diffObj.count}" data-weapon-type="${winnerType}" data-traits="${winnerTraits}" data-is-critical="${winnerIsCritical}" data-is-opponent-fumble="${loserIsFumble}" data-attack-message-id="${data.attackMessageId || ""}"><i class="fas fa-star"></i> Special Effects</button>`;
        if (sfBtn) sfBtn.outerHTML = sfBtnHtml;
        else buttonsRow?.insertAdjacentHTML("afterbegin", sfBtnHtml);
    }

    const contestBtn = wrapper.querySelector(".contest-button");
    if (contestBtn) {
        contestBtn.dataset.attackerResult = resultLabel;
        contestBtn.dataset.attackerDiff = String(newDiffIndex);
    }

    await messageDoc.update({
        content: wrapper.innerHTML,
        [`flags.${MAGCM_MODULE_ID}.magcm-difficulty.diffIndex`]: newDiffIndex
    });

    // This Evade's own difficulty change may have altered its self-cap excess - keep whatever was already
    // pushed onto the attacker's roll (see magcmApplyRetroactiveOver100ToAttack) in sync, otherwise the
    // Attack card would keep showing a stale reduction/result from before this difficulty change. Guarded
    // by comparing against what's currently stored on the Attack card so a cascade-triggered refresh of
    // THIS card (triggered by the push below rebuilding the Attack card, which cascades back here) finds
    // the values already equal and stops instead of looping.
    if (data.selfOver100Applied && data.attackMessageId) {
        const currentAttackData = game.messages.get(data.attackMessageId)?.getFlag(MAGCM_MODULE_ID, "magcm-difficulty");
        const currentlyPushedExcess = Number(currentAttackData?.retroactiveOver100Excess) || 0;
        if (currentlyPushedExcess !== selfOver100Excess) {
            const sourceLabel = `${data.defenderTokenName || "The defender"}'s ${data.skillName} (${afterProspective}%)`;
            await magcmApplyRetroactiveOver100ToAttack(data.attackMessageId, selfOver100Excess, sourceLabel);
        }
    }
}

// Refreshes a "Do Not Parry" card - it has no roll/difficulty of its own, only reacting to the attacker's
// live result vs a fixed "Failure" defender - whenever the linked Attack's difficulty changes. Winner is
// intentionally always rebuilt as "attacker" (matching the original creation-time code exactly), even though
// calculateDifferentialSuccess may report "none" (0 Special Effects) when the attacker also fails/fumbles.
async function magcmRefreshParryDeclinedCard(messageDoc, data) {
    const attackerLive = magcmGetLiveResultForMessage(data.attackMessageId);
    const attackerResult = attackerLive?.resultLabel ?? data.attackerResultSnapshot ?? "Failure";
    const diffObj = calculateDifferentialSuccess(attackerResult, "Failure");

    const wrapper = document.createElement("div");
    wrapper.innerHTML = messageDoc.content;

    const winnerNameHtml = wrapper.querySelector(".magcm-chat-card-combatant--right .magcm-chat-card-combatant__name")?.innerHTML || "";
    const traitsStr = [data.attackerWeaponTraits, data.attackerStyleTraits].filter(Boolean).join(", ");
    const winnerEl = wrapper.querySelector(".magcm-chat-card-winner");
    if (winnerEl) {
        winnerEl.outerHTML = buildMAGCMWinnerLineHtml({
            winner: "attacker", count: diffObj.count, winnerNameHtml, weaponType: data.attackerWeaponType, traitsStr,
            isCritical: attackerResult === "Critical", isOpponentFumble: false, attackMessageId: data.attackMessageId
        });
    }
    const sfBtn = wrapper.querySelector(".special-effects-button");
    if (sfBtn) {
        sfBtn.dataset.effects = diffObj.count;
        sfBtn.dataset.isCritical = String(attackerResult === "Critical");
    }

    await messageDoc.update({ content: wrapper.innerHTML });
}

// Small floating popup of the 6 difficulty tiers (reusing the existing .magcm-difficulty-badge tier
// colours), anchored under the clicked badge. Selecting an option applies it via magcmApplyDifficultyChange;
// clicking anywhere else closes it without changing anything.
function magcmShowDifficultyPicker(anchorEl, messageId, currentDiffIndex) {
    document.getElementById("magcm-difficulty-picker")?.remove();

    const picker = document.createElement("div");
    picker.id = "magcm-difficulty-picker";
    picker.className = "magcm-difficulty-picker";
    picker.innerHTML = MAGCM_DIFFICULTY_TIERS.map((tier, idx) => `
        <button type="button" class="magcm-difficulty-badge magcm-difficulty-picker__option${idx === currentDiffIndex ? " magcm-difficulty-picker__option--current" : ""}" data-difficulty="${tier.text}" data-diff-index="${idx}">${tier.text}</button>
    `).join("");
    document.body.appendChild(picker);

    const anchorRect = anchorEl.getBoundingClientRect();
    const margin = 8;
    picker.style.left = `${Math.max(margin, Math.min(anchorRect.left, window.innerWidth - picker.offsetWidth - margin))}px`;
    picker.style.top = `${anchorRect.bottom + 4}px`;
    if (anchorRect.bottom + picker.offsetHeight + 4 > window.innerHeight) {
        picker.style.top = `${Math.max(margin, anchorRect.top - picker.offsetHeight - 4)}px`;
    }

    const closePicker = (event) => {
        if (picker.contains(event.target) || anchorEl.contains(event.target)) return;
        picker.remove();
        document.removeEventListener("click", closePicker, true);
    };
    // Deferred so the same click that opened the picker doesn't immediately close it again.
    setTimeout(() => document.addEventListener("click", closePicker, true), 0);

    picker.querySelectorAll("button[data-diff-index]").forEach(btn => {
        btn.addEventListener("click", async (event) => {
            event.stopPropagation();
            picker.remove();
            document.removeEventListener("click", closePicker, true);
            await magcmApplyDifficultyChange(messageId, Number(btn.dataset.diffIndex));
        });
    });
}

// -- Parry Dialog --
function handleParryDialog(attackerRange, attackerSize, attackerResult, attackerName = "Attacker", attackerWeaponType = "melee", attackerWeaponTraits = "", attackerStyleTraits = "", attackerTokenId = null, attackerActorId = null, attackMessageId = null) {
    const controlled = canvas.tokens.controlled[0];
    if (!controlled) return ui.notifications.warn("Please select a token to parry with.");

    const enableReach = game.settings.get(MAGCM_MODULE_ID, "enableReachMechanics");

    // Resolved once so both the "Do Not Parry" card and the rolled Parry card colour names identically.
    const attackerToken = attackerTokenId ? (canvas.tokens.get(attackerTokenId) || game.scenes.current?.tokens.get(attackerTokenId)) : null;
    const attackerActor = attackerToken?.actor || (attackerActorId ? game.actors.get(attackerActorId) : null);
    const attackerColor = getMAGCMCombatantColor(attackerActor, attackerToken);
    const defenderColor = getMAGCMCombatantColor(controlled.actor, controlled);
    const attackerNameHtml = getMAGCMCombatantNameHtml(attackerName, attackerColor, attackerActor?.id, attackerToken?.id, controlled.id);
    const defenderNameHtml = getMAGCMCombatantNameHtml(controlled.name, defenderColor, controlled.actor?.id, controlled.id, attackerToken?.id);

    const skillArray = controlled.actor.items.filter(skill => skill.type === "combatStyle" || (skill.type === "standardSkill" && skill.name.toLowerCase() === "unarmed")).sort((a, b) => {
        // If types match (e.g. both are combatStyles), sort alphabetically
        if (a.type === b.type) {
            return a.name.localeCompare(b.name);
        }
        // Force combatStyle (-1) to come before Unarmed (1)
        return a.type === "combatStyle" ? -1 : 1;
    });

    // Only MELEE weapons or SHIELDS currently held in at least one hit location (Natural Weapons are exempt)
    const weaponArray = controlled.actor.items.filter(weapon => {
        if (weapon.type !== "melee-weapon") return false;
        if (isMAGCMNaturalWeapon(weapon)) return true;
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
    const wardedLocationIds = new Set(
        controlled.actor.items
            .filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "blockingWeapon"))
            .map(i => i.id)
    );
    weaponArray.forEach(weapon => {
        const isNaturalWeapon = isMAGCMNaturalWeapon(weapon);
        const naturalWeaponLocationIds = isNaturalWeapon
            ? Object.entries(weapon.getFlag(MAGCM_MODULE_ID, "naturalWeaponLocations") || {}).filter(([, active]) => active).map(([locId]) => locId)
            : [];
        const holdingLocations = isNaturalWeapon ? naturalWeaponLocationIds : (weapon.getFlag(MAGCM_MODULE_ID, "holdingLocations") || []);
        weapon._pinned = Boolean(weapon.getFlag(MAGCM_MODULE_ID, "pinned"));
        weapon._impaled = Boolean(weapon.getFlag(MAGCM_MODULE_ID, "impaled"));
        weapon._entangledBlocked = holdingLocations.some(locId => entangledArmIds.has(locId));
        // A Natural Weapon is only stunned-blocked once EVERY hit location it's attached to is stunned;
        // a normally-held weapon is blocked if ANY of its (usually 1-2) holding locations is stunned.
        weapon._stunnedBlocked = isNaturalWeapon
            ? (holdingLocations.length > 0 && holdingLocations.every(locId => stunnedLocationIds.has(locId)))
            : holdingLocations.some(locId => stunnedLocationIds.has(locId));
        weapon._warding = holdingLocations.some(locId => wardedLocationIds.has(locId));
        const hpValue = weapon.system?.hp;
        weapon._broken = hpValue !== undefined && hpValue !== "" && Number(hpValue) <= 0;
        weapon._gripRequirementMet = (weapon.getFlag(MAGCM_MODULE_ID, "gripRequirement") === "2h") ? holdingLocations?.length >= 2 : true;
    });

    const getParryWeaponDisableReasons = (weapon) => {
        const reasons = [];
        if (weapon?._broken) reasons.push("Broken");
        if (weapon?._pinned) reasons.push("Pinned");
        if (weapon?._impaled) reasons.push("Impaling");
        if (weapon?._entangledBlocked) reasons.push("Entangled");
        if (weapon?._stunnedBlocked) reasons.push("Stunned");
        if (weapon?._warding) reasons.push("Warding");
        if (weapon?._gripRequirementMet === false) reasons.push("Weak Grip");
        return reasons;
    };

    // Delegates to the hoisted, dialog-independent getMAGCMParryNegationInfo (needed by the post-hoc
    // difficulty-change recompute, which runs with no dialog/attackerSize closure available).
    const getParryNegationInfo = (defenderSizeName) => getMAGCMParryNegationInfo(attackerSize, defenderSizeName);

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
        } catch (e) {
            console.warn("Could not retrieve roll modifiers", e);
        }
    }

    let modHtml = isModTextVisible ? `
    <div style="margin-bottom: 10px;">
        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: #e1a100; font-weight: bold;">
            Roll Modifiers <i class="fas fa-exclamation-triangle"></i>
        </span>
    </div>` : "";

    // Defaults "Do Not Parry" to checked (and Spend AP to unchecked to match) whenever parrying would be
    // pointless or impossible: no AP left to spend on it, the attack is ranged and the defender has no
    // usable "Ranged Parry" weapon (or their only one is currently warding a location instead), or the
    // rolled/chosen hit location is already warded or behind cover.
    let defenderAP = foundry.utils.getProperty(controlled.actor, "system.trackedStats.actionPoints.value");
    if (defenderAP === undefined) defenderAP = foundry.utils.getProperty(controlled.actor, "system.currentActionPoints") ?? 0;
    const noApLeft = !(Number(defenderAP) > 0);

    const getCombatEffectsText = (item) => String(item.system?.["combat-effects"] ?? item.system?.combatEffects ?? "");
    const hasUsableRangedParryWeapon = weaponArray.some(w => /ranged parry/i.test(getCombatEffectsText(w)) && !w._warding);
    const rangedAttackUnparryable = attackerWeaponType === "ranged" && !hasUsableRangedParryWeapon;

    let hitLocationCompromised = false;
    const attackMessageForDefaults = attackMessageId ? game.messages.get(attackMessageId) : null;
    const defaultsHitLocation = attackMessageForDefaults?.getFlag(MAGCM_MODULE_ID, 'attack-hit-location');
    if (defaultsHitLocation?.id) {
        const hitLocationItem = controlled.actor.items.get(defaultsHitLocation.id);
        if (hitLocationItem) {
            hitLocationCompromised = Boolean(hitLocationItem.getFlag(MAGCM_MODULE_ID, "blockingWeapon"))
                || Boolean(hitLocationItem.getFlag(MAGCM_MODULE_ID, "inCover"));
        }
    }

    // The attacker may have opted (Attack dialog checkbox) to apply their own over-100% excess prospectively
    // to this Parry - see "Opposed Skills Over 100%" (p.50): no causality issue here since the attack already
    // resolved before this dialog opened.
    const attackDifficultyDataForOver100 = attackMessageForDefaults?.getFlag(MAGCM_MODULE_ID, 'magcm-difficulty');
    const prospectiveOver100Excess = Number(attackDifficultyDataForOver100?.prospectiveOver100Excess) || 0;
    const prospectiveOver100Source = attackDifficultyDataForOver100?.prospectiveOver100Source || "";

    const defaultDoNotParry = noApLeft || rangedAttackUnparryable || hitLocationCompromised;

    const dialogContent = `
        <form style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
        <div class="magcm-dialog-body" style="flex: 1; overflow-y: auto; padding-right: 4px;">
            <div style="margin-bottom: 10px; padding: 8px; background: rgba(100, 100, 100, 0.15); border-radius: 3px;">
                <p style="margin: 0 0 4px 0; font-size: 0.9em;">
                ${enableReach ? `<strong>Attacker's Range:</strong> ${attackerRange} | ` : ""}<strong>Size:</strong> ${attackerSize}</p>
                <p style="margin: 0; font-size: 0.9em;"><strong>Attacker's Result:</strong> ${attackerResult}</p>
                ${prospectiveOver100Excess > 0 ? `<p style="margin: 4px 0 0 0; font-size: 0.9em; color: #e1a100;"><i class="fas fa-triangle-exclamation"></i> ${prospectiveOver100Source} exceeds 100% - your effective skill for this roll is reduced by ${prospectiveOver100Excess}%.</p>` : ""}
            </div>
            ${modHtml}
            <div style="margin-bottom: 8px;">
                <label style="display: flex; align-items: center; gap: 6px;"><input type="checkbox" id="doNotParry"${defaultDoNotParry ? " checked" : ""}> <strong>Do Not Parry</strong></label>
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
                        <th>Damage Negated (Upon Success)</th>
                        <td id="parryNegationValue" style="font-weight: bold;">Full</td>
                    </tr>
                    <tr id="parryOver100Row" style="display:none;">
                        <th>Skill exceeds 100%</th>
                        <td>
                            <label style="font-weight: normal;">
                                <input type="checkbox" id="parryOver100Penalty" style="vertical-align: middle; margin-right: 6px;">
                                Apply excess (<span id="parryOver100Value">0</span>%) retroactively to the attacker's roll
                            </label>
                        </td>
                    </tr>
                    <tr>
                        <th>Spend AP</th>
                        <td><input type="checkbox" id="spend-ap"${defaultDoNotParry ? "" : " checked"}></td>
                    </tr>
                    <tr>
                        <th>Spend Luck Point</th>
                        <td><input type="checkbox" id="parrySpendLuck"></td>
                    </tr>
                    <tr>
                        <th>Force Roll Result?</th>
                        <td><input type="checkbox" id="parryForceRollToggle"></td>
                    </tr>
                    <tr id="parryForceRollRow" style="display:none;">
                        <th>Forced Result (1-100)</th>
                        <td><input type="number" id="parryForceRollValue" min="1" max="100" style="width: 80px;"></td>
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
                        <th>Cap by skill?</th>
                        <td><input type="checkbox" id="parryCapSkillToggle"></td>
                    </tr>
                    <tr>
                        <th>Cap character</th>
                        <td><select id="parryCapCharacter" style="width: 100%;">${buildMAGCMAugmentActorOptions(augmentActors, defaultAugmentActor.id)}</select></td>
                    </tr>
                    <tr>
                        <th>Cap with</th>
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
                icon: '<i class="fas fa-shield-halved"></i>',
                label: "Roll Parry",
                callback: async (html) => {
                    const doNotParry = html.find('#doNotParry').is(':checked');
                    if (doNotParry) {
                        const diffObj = calculateDifferentialSuccess(attackerResult, "Failure");
                        const parryDeclinedMessage = await ChatMessage.create({
                            speaker: ChatMessage.getSpeaker({ token: controlled.document }),
                            content: `
                            <div class="magcm-chat-card">
                            <div class="magcm-chat-card-title magcm-chat-card-title--parry"><i class="fas fa-shield-halved"></i> Parry</div>
                            <div class="magcm-chat-card-header">
                                ${buildMAGCMCombatantsRowHtml(defenderNameHtml, "Defender", attackerNameHtml, "Attacker")}
                                <div class="magcm-chat-card-notice"><i class="fas fa-ban"></i> Defender could not, or chose not to parry.</div>
                            </div>
                            ${buildMAGCMWinnerLineHtml({ winner: "attacker", count: diffObj.count, winnerNameHtml: attackerNameHtml, weaponType: attackerWeaponType, traitsStr: [attackerWeaponTraits, attackerStyleTraits].filter(Boolean).join(", "), isCritical: attackerResult === "Critical", isOpponentFumble: false, attackMessageId })}
                            <button class="special-effects-button" data-winner="attacker" data-effects="${diffObj.count}" data-weapon-type="${attackerWeaponType}" data-traits="${[attackerWeaponTraits, attackerStyleTraits].filter(Boolean).join(", ")}" data-is-critical="${attackerResult === 'Critical'}" data-is-opponent-fumble = "false" data-attack-message-id="${attackMessageId || ""}"><i class="fas fa-star"></i> Special Effects</button>
                            </div>`,
                            flags: {
                                [MAGCM_MODULE_ID]: {
                                    "magcm-difficulty": {
                                        type: "parry-declined",
                                        attackMessageId,
                                        attackerWeaponType, attackerWeaponTraits, attackerStyleTraits,
                                        attackerResultSnapshot: attackerResult
                                    }
                                }
                            }
                        });
                        await markMAGCMAttackDefenseResolved(attackMessageId, 'parry', parryDeclinedMessage?.id ?? null);
                        return parryDeclinedMessage;
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
                        actionPointReducedLabel = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-hand-fist"></i> Action Points reduced by 1 (${newAP} remaining).</div>`;
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
                    const capActor = augmentActors.find(candidate => candidate.id === html.find('#parryCapCharacter').val()) || defaultAugmentActor;
                    const capSkillItem = capActor.items.get(html.find('#parryCapSkill').val()) || null;

                    let styleName = style ? style.name : "Combat Style";
                    let weaponName = weapon ? weapon.name : "Unarmed/Improvised";
                    const unarmedReachCode = html.find('#parryUnarmedReach').val() || "T";
                    const unarmedSizeCode = html.find('#parryUnarmedSize').val() || "S";
                    const reachDisplay = { T: "Touch", S: "Short", M: "Medium", L: "Long", VL: "Very Long" };
                    const sizeDisplay = { S: "Small", M: "Medium", L: "Large", H: "Huge", E: "Enormous", BE: "Beyond Enormous" };
                    let weaponReach = (weapon && (reachDisplay[weapon.system?.reach] || weapon.system?.reach)) || reachDisplay[unarmedReachCode] || "Touch";
                    let weaponSize = (weapon && (sizeDisplay[getMAGCMWeaponSize(weapon)] || weapon.system?.size)) || sizeDisplay[unarmedSizeCode] || "Small";
                    const unarmedCombatEffects = weapon ? "" : String(html.find('#parryUnarmedCombatEffects').val() || "");

                    let baseSkillVal = getMAGCMSkillValue(style);
                    if (cb) {
                        if (customValue !== 0) baseSkillVal += customValue;
                        else if (augSkill) baseSkillVal += Math.ceil(getMAGCMSkillValue(augSkill) * 0.2);
                    }
                    if (useCap) {
                        baseSkillVal = getMAGCMEffectiveSkillWithCap(baseSkillVal, capSkillItem);
                    }

                    let skillVal = Math.max(0, Math.ceil(baseSkillVal * diffMult) - prospectiveOver100Excess);

                    // -- Over-100% Skill Penalty --
                    // Per the Mythras rulebook (p.50, "Opposed Skills Over 100%"): the excess above 100% is
                    // subtracted from EVERYONE in the contest, including the participant who has it - so this
                    // Parry's own roll target is capped here (GM discretion via the checkbox, which only
                    // appears once the rolled skill actually exceeds 100%) BEFORE rolling, in addition to the
                    // retroactive penalty applied to the attacker's already-resolved roll further below.
                    const parryOver100Excess = getMAGCMOver100Excess(skillVal);
                    const applyParryOver100 = parryOver100Excess > 0 && html.find('#parryOver100Penalty').is(':checked');
                    const parryOver100OriginalSkillVal = skillVal;
                    if (applyParryOver100) skillVal = Math.max(0, skillVal - parryOver100Excess);

                    const parryForcedRollValue = getMAGCMForcedRollValue(html, '#parryForceRollToggle', '#parryForceRollValue');
                    let parryRoll = await rollMAGCMD100(parryForcedRollValue);

                    let resultLabel = getMAGCMResultLabelForRoll(parryRoll.result, skillVal, parryOver100OriginalSkillVal);

                    const defenderResult = resultLabel;
                    // A failed/fumbled Parry stops nothing, regardless of the weapon-size comparison.
                    const negationInfo = (resultLabel === "Failure" || resultLabel === "Fumble")
                        ? { text: "None", ratio: 0 }
                        : getParryNegationInfo(weaponSize);

                    // Retroactively apply this same excess as a penalty to the attacker's already-resolved
                    // roll (see magcmApplyRetroactiveOver100ToAttack) - necessarily after-the-fact since the
                    // Attack card was posted before this dialog opened.
                    let effectiveAttackerResult = attackerResult;
                    let over100RetroResult = null;
                    if (applyParryOver100 && attackMessageId) {
                        over100RetroResult = await magcmApplyRetroactiveOver100ToAttack(attackMessageId, parryOver100Excess, `${controlled.name}'s ${styleName} (${parryOver100OriginalSkillVal}%)`);
                        if (over100RetroResult) effectiveAttackerResult = over100RetroResult.newResultLabel;
                    }

                    const diffObj = calculateDifferentialSuccess(effectiveAttackerResult, defenderResult);

                    let winnerType = "melee";
                    let winnerTraits = "";
                    let winnerIsCritical = false;
                    let loserIsFumble = false;

                    if (diffObj.winner === "attacker") {
                        winnerType = attackerWeaponType;
                        winnerTraits = [attackerWeaponTraits, attackerStyleTraits].filter(Boolean).join(", ");
                        winnerIsCritical = effectiveAttackerResult === "Critical";
                        loserIsFumble = defenderResult === "Fumble";
                    } else if (diffObj.winner === "defender") {
                        winnerType = weapon ? (weapon.type === "ranged-weapon" ? "ranged" : "melee") : "melee";
                        winnerTraits = [weapon ? weapon.system?.['combat-effects'] : unarmedCombatEffects, style?.system?.traits].filter(Boolean).join(", ");
                        winnerIsCritical = defenderResult === "Critical";
                        loserIsFumble = effectiveAttackerResult === "Fumble";
                    }

                    const winnerNameHtmlForResult = diffObj.winner === "attacker" ? attackerNameHtml : (diffObj.winner === "defender" ? defenderNameHtml : "");
                    const winnerLineHtml = buildMAGCMWinnerLineHtml({ winner: diffObj.winner, count: diffObj.count, winnerNameHtml: winnerNameHtmlForResult, weaponType: winnerType, traitsStr: winnerTraits, isCritical: winnerIsCritical, isOpponentFumble: loserIsFumble, attackMessageId });

                    let sfButtonHTML = diffObj.winner !== "none"
                        ? `<button class="special-effects-button" data-winner="${diffObj.winner}" data-effects="${diffObj.count}" data-weapon-type="${winnerType}" data-traits="${winnerTraits}" data-is-critical="${winnerIsCritical}" data-is-opponent-fumble = "${loserIsFumble}" data-attack-message-id="${attackMessageId || ""}"><i class="fas fa-star"></i> Special Effects</button>`
                        : "";

                    let augString = '';
                    if (cb) {
                        const augVal = customValue !== 0 ? customValue : (augSkill ? Math.ceil(getMAGCMSkillValue(augSkill) * 0.2) : 0);
                        const augLabel = customValue !== 0 ? "Custom" : (parryAugSkillEntry ? `${parryAugSkillEntry.actor.name}'s ${parryAugSkillEntry.skill.name}` : "Selected skill");
                        augString = ` (Augmented by ${augLabel}: ${formatMAGCMSignedValue(augVal)})`;
                    }
                    if (useCap && capSkillItem) {
                        const capLabel = `${capSkillItem.name} (${getMAGCMSkillValue(capSkillItem)}%)`;
                        augString += ` | Capped by ${capLabel}`;
                    }

                    let diffText = "Standard";
                    let diffIndex = 2; // Default to Standard
                    switch (String(diffMult)) {
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

                    const luckNotice = spendLuck ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-clover"></i> Spent a Luck Point.</div>` : "";
                    const over100Notice = applyParryOver100
                        ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-self-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${styleName} (${parryOver100OriginalSkillVal}%) exceeds 100% by ${parryOver100Excess}% - this Parry's own target was capped at ${skillVal}%, and the same excess was applied retroactively to the attacker's roll${over100RetroResult ? ` (${over100RetroResult.originalNoteText}${over100RetroResult.changed ? `, now ${over100RetroResult.newResultLabel}` : ", no change to their result"})` : ""}.</div>`
                        : "";
                    const prospectiveOver100Notice = prospectiveOver100Excess > 0
                        ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-received-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${prospectiveOver100Source} exceeds 100% - this Parry's effective skill was reduced by ${prospectiveOver100Excess}% before rolling.</div>`
                        : "";

                    let chatModHtml = isModTextVisible ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: #e1a100; font-weight: bold;">
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
                        augmentLine: parryAugmentTooltipLine,
                        forced: parryForcedRollValue !== null
                    });

                    // Weapon-size comparison for the Size stat pill's colour - independent of whether the
                    // parry itself succeeded (unlike Damage Negated, which only applies on a successful parry).
                    const sizeCompareInfo = getParryNegationInfo(weaponSize);
                    const sizeCompareAttr = sizeCompareInfo.ratio === 1 ? "adequate" : (sizeCompareInfo.ratio === 0.5 ? "smaller" : "much-smaller");

                    
                    const isImprovisedWeapon = weaponName === "Unarmed/Improvised";
                    const weaponForTooltip = isImprovisedWeapon
                        ? { type: "melee-weapon", name: weaponName, system: { reach: weaponReach, size: weaponSize } }
                        : weapon;
                    const weaponTooltipHtml = buildMAGCMWeaponTooltipHTML(actor, weaponForTooltip, { improvised: isImprovisedWeapon });

                    let statsInfoItems = [];
                    statsInfoItems.push({ label: "Combat Style", value: styleName });
                    statsInfoItems.push({ label: "Weapon", value: weaponName, tooltipHtml: weaponTooltipHtml });
                    if (enableReach) {
                        statsInfoItems.push({ label: "Range", value: attackerRange });
                        statsInfoItems.push({ label: "Reach", value: weaponReach });
                    }
                    statsInfoItems.push({ label: "Size", value: weaponSize, dataAttrs: { sizecompare: sizeCompareAttr } });
                    statsInfoItems.push({ label: "Damage Negated", value: negationInfo.text, dataAttrs: { negation: negationInfo.ratio === 1 ? "full" : (negationInfo.ratio === 0.5 ? "half" : "none") } });

                    let content = `
                        <div class="magcm-chat-card">
                        <div class="magcm-chat-card-title magcm-chat-card-title--parry"><i class="fas fa-shield-halved"></i> Parry</div>
                        <div class="magcm-chat-card-header">
                            ${buildMAGCMCombatantsRowHtml(defenderNameHtml, "Defender", attackerNameHtml, "Attacker")}
                            ${buildMAGCMStatsRowHtml(statsInfoItems)}
                            ${luckNotice}
                            ${over100Notice}
                            ${prospectiveOver100Notice}
                            ${chatModHtml}
                            <div class="magcm-chat-card-roll">
                                <div class="magcm-chat-card-roll__label">Parry Roll${buildMAGCMDifficultyBadgeHtml(diffIndex)}</div>
                                ${parryRollPillHtml}
                            </div>
                        </div>
                        ${actionPointReducedLabel || ""}
                        <hr>
                        ${winnerLineHtml}
                        <div style="display: flex; gap: 5px; margin-top: 10px; flex-wrap: wrap;">
                            ${sfButtonHTML}
                            <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${style.id}" data-attacker-score="${parryRoll.result}" data-attacker-result="${resultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}"><i class="fas fa-hand-fist"></i> Contest</button>
                        </div>
                        </div>
                    `;

                    const parryMessage = await ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: controlled.document }),
                        content: content,
                        rolls: [parryRoll],
                        flags: {
                            [MAGCM_MODULE_ID]: {
                                "magcm-difficulty": {
                                    type: "parry",
                                    rollTotal: parryRoll.result,
                                    effectiveSkillValue: baseSkillVal,
                                    skillName: styleName,
                                    augmentLine: parryAugmentTooltipLine,
                                    forced: parryForcedRollValue !== null,
                                    diffIndex,
                                    originalDiffIndex: diffIndex,
                                    selfOver100Applied: applyParryOver100,
                                    defenderTokenName: controlled.name,
                                    attackMessageId,
                                    attackerResultSnapshot: effectiveAttackerResult,
                                    attackerSize,
                                    attackerWeaponType, attackerWeaponTraits, attackerStyleTraits,
                                    defenderWeaponSize: weaponSize,
                                    defenderWeaponType: weapon ? (weapon.type === "ranged-weapon" ? "ranged" : "melee") : "melee",
                                    defenderWeaponTraits: weapon ? weapon.system?.['combat-effects'] : unarmedCombatEffects,
                                    defenderStyleTraits: style?.system?.traits
                                }
                            }
                        }
                    });
                    await markMAGCMAttackDefenseResolved(attackMessageId, 'parry', parryMessage?.id ?? null);

                    // A successful (or Critical) Parry negates damage according to the parrying weapon's
                    // effective size relative to the attacker's - reflect that onto the source Attack card's
                    // damage-mode selection automatically instead of leaving it for manual adjustment, but
                    // only once the Parry roll's own Dice So Nice animation has finished playing out.
                    // A failed/fumbled attack was already locked to No Damage and can never cause damage,
                    // regardless of how the Parry roll turns out, so it's excluded here entirely.
                    const attackAlreadyFailed = effectiveAttackerResult === "Failure" || effectiveAttackerResult === "Fumble";
                    if (attackMessageId && !attackAlreadyFailed && (resultLabel === "Success" || resultLabel === "Critical")) {
                        const damageMode = negationInfo.ratio === 1 ? "none" : (negationInfo.ratio === 0.5 ? "half" : "full");
                        await waitForMAGCMDiceAnimation(parryMessage?.id);
                        await applyMAGCMAttackDamageModeUpdate(attackMessageId, damageMode);
                    }
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "roll",
        render: (html) => {
            const augmentCheckbox = html.find('#parryAugment');
            const augmentCharacterSelect = html.find('#parryAugCharacter');
            const augmentCharacterRow = augmentCharacterSelect.closest('tr');
            const augSkillRow = html.find('#parryAugSkill').closest('tr');
            const capToggle = html.find('#parryCapSkillToggle');
            const capCharacterSelect = html.find('#parryCapCharacter');
            const capCharacterRow = capCharacterSelect.closest('tr');
            const capSkillRow = html.find('#parryCapSkill').closest('tr');
            const customAugRow = html.find('#parryCustomAugment').closest('tr');
            const parryWeaponSelect = html.find('#parryWeapon');
            const parryStyleSelect = html.find('#parryStyle');
            const unarmedReachRow = html.find('#parryUnarmedReachRow');
            const unarmedSizeRow = html.find('#parryUnarmedSizeRow');
            const unarmedSizeSelect = html.find('#parryUnarmedSize');
            const unarmedCombatEffectsRow = html.find('#parryUnarmedCombatEffectsRow');
            const negationValue = html.find('#parryNegationValue');
            const forceRollToggle = html.find('#parryForceRollToggle');
            const forceRollRow = html.find('#parryForceRollRow');
            const parryDiffSelect = html.find('#parryDiff');
            const over100Row = html.find('#parryOver100Row');
            const over100Checkbox = html.find('#parryOver100Penalty');
            const over100Value = html.find('#parryOver100Value');

            // Live preview of the same baseSkillVal/diffMult math the roll callback uses, purely so the
            // over-100% checkbox row (and its displayed excess%) only appears once it would actually matter.
            function computeParryPreviewSkillVal() {
                const style = controlled.actor.items.get(parryStyleSelect.val());
                let baseSkillVal = getMAGCMSkillValue(style);
                if (augmentCheckbox.is(':checked')) {
                    const customValue = Number(html.find('#parryCustomAugment').val());
                    if (customValue !== 0) {
                        baseSkillVal += customValue;
                    } else {
                        const selectedAugmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                        const selectedAugmentSkillOptions = getMAGCMAugmentOptionsForActor(selectedAugmentActor);
                        const parryAugSkillEntry = selectedAugmentSkillOptions.find(option => option.valueKey === html.find('#parryAugSkill').val()) || null;
                        if (parryAugSkillEntry?.skill) baseSkillVal += Math.ceil(getMAGCMSkillValue(parryAugSkillEntry.skill) * 0.2);
                    }
                }
                if (capToggle.is(':checked')) {
                    const capActor = augmentActors.find(candidate => candidate.id === capCharacterSelect.val()) || defaultAugmentActor;
                    const capSkillItem = capActor.items.get(html.find('#parryCapSkill').val()) || null;
                    baseSkillVal = getMAGCMEffectiveSkillWithCap(baseSkillVal, capSkillItem);
                }
                return Math.max(0, Math.ceil(baseSkillVal * Number(parryDiffSelect.val())) - prospectiveOver100Excess);
            }

            function updateOver100Preview() {
                const excess = getMAGCMOver100Excess(computeParryPreviewSkillVal());
                over100Row.toggle(excess > 0);
                over100Value.text(excess);
                if (excess <= 0) over100Checkbox.prop('checked', false);
            }

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
                capCharacterRow.toggle(showCap);

                const isUnarmed = !parryWeaponSelect.val();
                unarmedReachRow.toggle(isUnarmed && enableReach);
                unarmedSizeRow.toggle(isUnarmed);
                unarmedCombatEffectsRow.toggle(isUnarmed);

                const selectedWeapon = controlled.actor.items.get(parryWeaponSelect.val());
                const selectedSize = getMAGCMWeaponSize(selectedWeapon) || unarmedSizeSelect.val() || "S";
                negationValue.text(getParryNegationInfo(selectedSize).text);

                forceRollRow.toggle(forceRollToggle.is(':checked'));

                updateOver100Preview();
            }
            function updateAugmentSkills() {
                const augmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMAugmentOptionsForActor(augmentActor);
                html.find('#parryAugSkill').html(buildMAGCMAugmentSkillOptions(options, `No skills available for ${augmentActor.name}`));
                html.find('#parryAugSkill').val(options[0]?.valueKey || "");
                updateOver100Preview();
            }
            function updateCapSkills() {
                const capActor = augmentActors.find(candidate => candidate.id === capCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMActorSkillOptions(capActor);
                html.find('#parryCapSkill').html(options.length > 0
                    ? options.map(i => `<option value="${i.id}">${i.name} (${getMAGCMSkillValue(i)}%)</option>`).join("")
                    : `<option value="">No skills available for ${capActor.name}</option>`);
                updateOver100Preview();
            }
            augmentCheckbox.on('change', updateVisibility);
            capToggle.on('change', updateVisibility);
            parryWeaponSelect.on('change', updateVisibility);
            unarmedSizeSelect.on('change', updateVisibility);
            forceRollToggle.on('change', updateVisibility);
            parryDiffSelect.on('change', updateOver100Preview);
            html.find('#parryCustomAugment').on('input', updateOver100Preview);
            html.find('#parryAugSkill').on('change', updateOver100Preview);
            html.find('#parryCapSkill').on('change', updateOver100Preview);
            augmentCharacterSelect.on('change', updateAugmentSkills);
            updateAugmentSkills();
            capCharacterSelect.on('change', updateCapSkills);
            updateCapSkills();
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
    }, { resizable: true }).render(true);
}

// -- Evade Dialog --
function handleEvadeDialog(attackerResult, attackerName = "Attacker", attackerWeaponType = "melee", attackerWeaponTraits = "", attackerStyleTraits = "", attackerTokenId = null, attackerActorId = null, attackMessageId = null) {
    const controlled = canvas.tokens.controlled[0];
    if (!controlled) return ui.notifications.warn("Please select a token to evade with.");

    const evadeSkill = controlled.actor.items.find(skill => skill.name.toLowerCase() === "evade");
    if (!evadeSkill) return ui.notifications.warn("Token does not have the Evade skill.");

    const entangledLocations = controlled.actor.items.filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "entangledBy"));
    if (entangledLocations.some(loc => /leg/i.test(loc.name))) {
        return ui.notifications.warn(`${controlled.name} cannot evade because one or more legs are entangled.`);
    }

    // Resolved once so the rolled Evade card colours names consistently with the Attack/Parry cards.
    const attackerToken = attackerTokenId ? (canvas.tokens.get(attackerTokenId) || game.scenes.current?.tokens.get(attackerTokenId)) : null;
    const attackerActor = attackerToken?.actor || (attackerActorId ? game.actors.get(attackerActorId) : null);
    const attackerColor = getMAGCMCombatantColor(attackerActor, attackerToken);
    const defenderColor = getMAGCMCombatantColor(controlled.actor, controlled);
    const attackerNameHtml = getMAGCMCombatantNameHtml(attackerName, attackerColor, attackerActor?.id, attackerToken?.id, controlled.id);
    const defenderNameHtml = getMAGCMCombatantNameHtml(controlled.name, defenderColor, controlled.actor?.id, controlled.id, attackerToken?.id);

    const augArray = getMAGCMActorSkillOptions(controlled.actor);
    const augmentActors = getMAGCMAugmentActorOptions(controlled.actor, [...game.user.targets].map(t => t.actor));
    const defaultAugmentActor = controlled.actor;
    const augmentSkillOptions = getMAGCMAugmentOptionsForActor(defaultAugmentActor);
    const evadeAugSkillOptions = buildMAGCMAugmentSkillOptions(augmentSkillOptions);
    const augOptions = augArray.map(i => `<option value="${i.id}">${i.name} (${getMAGCMSkillValue(i)}%)</option>`);

    // The attacker may have opted (Attack dialog checkbox) to apply their own over-100% excess prospectively
    // to this Evade - see "Opposed Skills Over 100%" (p.50): no causality issue here since the attack already
    // resolved before this dialog opened.
    const attackMessageForOver100 = attackMessageId ? game.messages.get(attackMessageId) : null;
    const attackDifficultyDataForOver100 = attackMessageForOver100?.getFlag(MAGCM_MODULE_ID, 'magcm-difficulty');
    const prospectiveOver100Excess = Number(attackDifficultyDataForOver100?.prospectiveOver100Excess) || 0;
    const prospectiveOver100Source = attackDifficultyDataForOver100?.prospectiveOver100Source || "";

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
        } catch (e) {
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
        title: `Evade - ${controlled.name}`,
        content: `
            <form style="display: flex; flex-direction: column; height: 100%; min-height: 0;">
            <div class="magcm-dialog-body" style="flex: 1; overflow-y: auto; padding-right: 4px;">
                <div style="margin-bottom: 10px; padding: 8px; background: rgba(100, 100, 100, 0.15); border-radius: 3px;">
                    <p style="margin: 0; font-size: 0.9em;"><strong>Attacker's Result:</strong> ${attackerResult}</p>
                    ${prospectiveOver100Excess > 0 ? `<p style="margin: 4px 0 0 0; font-size: 0.9em; color: #e1a100;"><i class="fas fa-triangle-exclamation"></i> ${prospectiveOver100Source} exceeds 100% - your effective skill for this roll is reduced by ${prospectiveOver100Excess}%.</p>` : ""}
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
                        <tr id="evadeOver100Row" style="display:none;">
                            <th>Skill exceeds 100%</th>
                            <td>
                                <label style="font-weight: normal;">
                                    <input type="checkbox" id="evadeOver100Penalty" style="vertical-align: middle; margin-right: 6px;">
                                    Apply excess (<span id="evadeOver100Value">0</span>%) retroactively to the attacker's roll
                                </label>
                            </td>
                        </tr>
                        <tr>
                            <th>Force Roll Result?</th>
                            <td><input type="checkbox" id="evadeForceRollToggle"></td>
                        </tr>
                        <tr id="evadeForceRollRow" style="display:none;">
                            <th>Forced Result (1-100)</th>
                            <td><input type="number" id="evadeForceRollValue" min="1" max="100" style="width: 80px;"></td>
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
                            <th>Cap by skill?</th>
                            <td><input type="checkbox" id="evadeCapSkillToggle"></td>
                        </tr>
                        <tr>
                            <th>Cap character</th>
                            <td><select id="evadeCapCharacter" style="width: 100%;">${buildMAGCMAugmentActorOptions(augmentActors, defaultAugmentActor.id)}</select></td>
                        </tr>
                        <tr>
                            <th>Cap with</th>
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
                icon: '<i class="fas fa-person-running"></i>',
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
                        actionPointReducedLabel = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-hand-fist"></i> Action Points reduced by 1 (${newAP} remaining).</div>`;
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
                    const capActor = augmentActors.find(candidate => candidate.id === html.find('#evadeCapCharacter').val()) || defaultAugmentActor;
                    const capSkillItem = capActor.items.get(html.find('#evadeCapSkill').val()) || null;

                    let baseSkillVal = getMAGCMSkillValue(evadeSkill);
                    if (cb) {
                        if (customValue !== 0) baseSkillVal += customValue;
                        else if (augSkill) baseSkillVal += Math.ceil(getMAGCMSkillValue(augSkill) * 0.2);
                    }
                    if (useCap) {
                        baseSkillVal = getMAGCMEffectiveSkillWithCap(baseSkillVal, capSkillItem);
                    }

                    let skillVal = Math.max(0, Math.ceil(baseSkillVal * diffMult) - prospectiveOver100Excess);

                    // -- Over-100% Skill Penalty --
                    // Per the Mythras rulebook (p.50, "Opposed Skills Over 100%"): the excess above 100% is
                    // subtracted from EVERYONE in the contest, including the participant who has it - so this
                    // Evade's own roll target is capped here (GM discretion via the checkbox, which only
                    // appears once the rolled skill actually exceeds 100%) BEFORE rolling, in addition to the
                    // retroactive penalty applied to the attacker's already-resolved roll further below.
                    const evadeOver100Excess = getMAGCMOver100Excess(skillVal);
                    const applyEvadeOver100 = evadeOver100Excess > 0 && html.find('#evadeOver100Penalty').is(':checked');
                    const evadeOver100OriginalSkillVal = skillVal;
                    if (applyEvadeOver100) skillVal = Math.max(0, skillVal - evadeOver100Excess);

                    const evadeForcedRollValue = getMAGCMForcedRollValue(html, '#evadeForceRollToggle', '#evadeForceRollValue');
                    let evadeRoll = await rollMAGCMD100(evadeForcedRollValue);

                    let resultLabel = getMAGCMResultLabelForRoll(evadeRoll.result, skillVal, evadeOver100OriginalSkillVal);

                    const defenderResult = resultLabel;

                    // Retroactively apply this same excess as a penalty to the attacker's already-resolved
                    // roll (see magcmApplyRetroactiveOver100ToAttack) - necessarily after-the-fact since the
                    // Attack card was posted before this dialog opened.
                    let effectiveAttackerResult = attackerResult;
                    let over100RetroResult = null;
                    if (applyEvadeOver100 && attackMessageId) {
                        over100RetroResult = await magcmApplyRetroactiveOver100ToAttack(attackMessageId, evadeOver100Excess, `${controlled.name}'s ${evadeSkill.name} (${evadeOver100OriginalSkillVal}%)`);
                        if (over100RetroResult) effectiveAttackerResult = over100RetroResult.newResultLabel;
                    }

                    const diffObj = calculateDifferentialSuccess(effectiveAttackerResult, defenderResult);

                    let winnerType = "melee";
                    let winnerTraits = "";
                    let winnerIsCritical = false;
                    let loserIsFumble = false;

                    if (diffObj.winner === "attacker") {
                        winnerType = attackerWeaponType;
                        winnerTraits = [attackerWeaponTraits, attackerStyleTraits].filter(Boolean).join(", ");
                        winnerIsCritical = effectiveAttackerResult === "Critical";
                        loserIsFumble = defenderResult === "Fumble";
                    } else if (diffObj.winner === "defender") {
                        winnerType = "unarmed";
                        winnerTraits = evadeSkill?.system?.traits || "";
                        winnerIsCritical = defenderResult === "Critical";
                        loserIsFumble = effectiveAttackerResult === "Fumble";
                    }

                    const winnerNameHtmlForResult = diffObj.winner === "attacker" ? attackerNameHtml : (diffObj.winner === "defender" ? defenderNameHtml : "");
                    const winnerLineHtml = buildMAGCMWinnerLineHtml({ winner: diffObj.winner, count: diffObj.count, winnerNameHtml: winnerNameHtmlForResult, weaponType: winnerType, traitsStr: winnerTraits, isCritical: winnerIsCritical, isOpponentFumble: loserIsFumble, attackMessageId });

                    let sfButtonHTML = diffObj.winner !== "none"
                        ? `<button class="special-effects-button" data-winner="${diffObj.winner}" data-effects="${diffObj.count}" data-weapon-type="${winnerType}" data-traits="${winnerTraits}" data-is-critical="${winnerIsCritical}" data-is-opponent-fumble = "${loserIsFumble}" data-attack-message-id="${attackMessageId || ""}"><i class="fas fa-star"></i> Special Effects</button>`
                        : "";

                    let augString = '';
                    if (cb) {
                        const augVal = customValue !== 0 ? customValue : (augSkill ? Math.ceil(getMAGCMSkillValue(augSkill) * 0.2) : 0);
                        const augLabel = customValue !== 0 ? "Custom" : (evadeAugSkillEntry ? `${evadeAugSkillEntry.actor.name}'s ${evadeAugSkillEntry.skill.name}` : "Selected skill");
                        augString = ` (Augmented by ${augLabel}: ${formatMAGCMSignedValue(augVal)})`;
                    }
                    if (useCap && capSkillItem) {
                        const capLabel = `${capSkillItem.name} (${getMAGCMSkillValue(capSkillItem)}%)`;
                        augString += ` | Capped by ${capLabel}`;
                    }

                    let diffText = "Standard";
                    let diffIndex = 2; // Default to Standard
                    switch (String(diffMult)) {
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

                    const luckNotice = spendLuck ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-clover"></i> Spent a Luck Point.</div>` : "";
                    const over100Notice = applyEvadeOver100
                        ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-self-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${evadeSkill.name} (${evadeOver100OriginalSkillVal}%) exceeds 100% by ${evadeOver100Excess}% - this Evade's own target was capped at ${skillVal}%, and the same excess was applied retroactively to the attacker's roll${over100RetroResult ? ` (${over100RetroResult.originalNoteText}${over100RetroResult.changed ? `, now ${over100RetroResult.newResultLabel}` : ", no change to their result"})` : ""}.</div>`
                        : "";
                    const prospectiveOver100Notice = prospectiveOver100Excess > 0
                        ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-received-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${prospectiveOver100Source} exceeds 100% - this Evade's effective skill was reduced by ${prospectiveOver100Excess}% before rolling.</div>`
                        : "";
                    const proneNotice = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-person-falling"></i> Evading leaves ${controlled.name} prone, unless mitigated by other factors.</div>`;

                    let chatModHtml = isModTextVisible ? `
                    <div style="text-align: center; margin-bottom: 5px;">
                        <span class="tooltip rollModifiers" data-tooltip="${modText.replace(/"/g, '&quot;').replace(/'/g, '&#39;')}" style="cursor: help; color: #e1a100; font-weight: bold;">
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
                        augmentLine: evadeAugmentTooltipLine,
                        forced: evadeForcedRollValue !== null
                    });

                    let content = `
                        <div class="magcm-chat-card">
                        <div class="magcm-chat-card-title magcm-chat-card-title--evade"><i class="fas fa-person-running"></i> Evade</div>
                        <div class="magcm-chat-card-header">
                            ${buildMAGCMCombatantsRowHtml(defenderNameHtml, "Defender", attackerNameHtml, "Attacker")}
                            ${buildMAGCMStatsRowHtml([{ label: "Skill", value: evadeSkill.name }])}
                            ${luckNotice}
                            ${over100Notice}
                            ${prospectiveOver100Notice}
                            ${proneNotice}
                            ${chatModHtml}
                            <div class="magcm-chat-card-roll">
                                <div class="magcm-chat-card-roll__label">Evade Roll${buildMAGCMDifficultyBadgeHtml(diffIndex)}</div>
                                ${evadeRollPillHtml}
                            </div>
                        </div>
                        ${actionPointReducedLabel || ""}
                        <hr>
                        ${winnerLineHtml}
                        <div style="display: flex; gap: 5px; margin-top: 10px; flex-wrap: wrap;">
                            ${sfButtonHTML}
                            <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${evadeSkill.id}" data-attacker-score="${evadeRoll.result}" data-attacker-result="${resultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}"><i class="fas fa-hand-fist"></i> Contest</button>
                        </div>
                        </div>
                    `;

                    const evadeMessage = await ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: controlled.document }),
                        content: content,
                        rolls: [evadeRoll],
                        flags: {
                            [MAGCM_MODULE_ID]: {
                                "magcm-difficulty": {
                                    type: "evade",
                                    rollTotal: evadeRoll.result,
                                    effectiveSkillValue: baseSkillVal,
                                    skillName: evadeSkill.name,
                                    augmentLine: evadeAugmentTooltipLine,
                                    forced: evadeForcedRollValue !== null,
                                    diffIndex,
                                    originalDiffIndex: diffIndex,
                                    selfOver100Applied: applyEvadeOver100,
                                    defenderTokenName: controlled.name,
                                    attackMessageId,
                                    attackerResultSnapshot: effectiveAttackerResult,
                                    attackerWeaponType, attackerWeaponTraits, attackerStyleTraits,
                                    evadeSkillTraits: evadeSkill?.system?.traits
                                }
                            }
                        }
                    });
                    await markMAGCMAttackDefenseResolved(attackMessageId, 'evade', evadeMessage?.id ?? null);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "roll",
        render: (html) => {
            const augmentCheckbox = html.find('#evadeAugment');
            const augmentCharacterSelect = html.find('#evadeAugCharacter');
            const augmentCharacterRow = augmentCharacterSelect.closest('tr');
            const augSkillRow = html.find('#evadeAugSkill').closest('tr');
            const capToggle = html.find('#evadeCapSkillToggle');
            const capCharacterSelect = html.find('#evadeCapCharacter');
            const capCharacterRow = capCharacterSelect.closest('tr');
            const capSkillRow = html.find('#evadeCapSkill').closest('tr');
            const customAugRow = html.find('#evadeCustomAugment').closest('tr');
            const forceRollToggle = html.find('#evadeForceRollToggle');
            const forceRollRow = html.find('#evadeForceRollRow');
            const evadeDiffSelect = html.find('#evadeDiff');
            const over100Row = html.find('#evadeOver100Row');
            const over100Checkbox = html.find('#evadeOver100Penalty');
            const over100Value = html.find('#evadeOver100Value');

            // Live preview of the same baseSkillVal/diffMult math the roll callback uses, purely so the
            // over-100% checkbox row (and its displayed excess%) only appears once it would actually matter.
            function computeEvadePreviewSkillVal() {
                let baseSkillVal = getMAGCMSkillValue(evadeSkill);
                if (augmentCheckbox.is(':checked')) {
                    const customValue = Number(html.find('#evadeCustomAugment').val());
                    if (customValue !== 0) {
                        baseSkillVal += customValue;
                    } else {
                        const selectedAugmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                        const selectedAugmentSkillOptions = getMAGCMAugmentOptionsForActor(selectedAugmentActor);
                        const evadeAugSkillEntry = selectedAugmentSkillOptions.find(option => option.valueKey === html.find('#evadeAugSkill').val()) || null;
                        if (evadeAugSkillEntry?.skill) baseSkillVal += Math.ceil(getMAGCMSkillValue(evadeAugSkillEntry.skill) * 0.2);
                    }
                }
                if (capToggle.is(':checked')) {
                    const capActor = augmentActors.find(candidate => candidate.id === capCharacterSelect.val()) || defaultAugmentActor;
                    const capSkillItem = capActor.items.get(html.find('#evadeCapSkill').val()) || null;
                    baseSkillVal = getMAGCMEffectiveSkillWithCap(baseSkillVal, capSkillItem);
                }
                return Math.max(0, Math.ceil(baseSkillVal * Number(evadeDiffSelect.val())) - prospectiveOver100Excess);
            }

            function updateOver100Preview() {
                const excess = getMAGCMOver100Excess(computeEvadePreviewSkillVal());
                over100Row.toggle(excess > 0);
                over100Value.text(excess);
                if (excess <= 0) over100Checkbox.prop('checked', false);
            }

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
                capCharacterRow.toggle(capToggle.is(':checked'));
                forceRollRow.toggle(forceRollToggle.is(':checked'));
                updateOver100Preview();
            }
            function updateAugmentSkills() {
                const augmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMAugmentOptionsForActor(augmentActor);
                html.find('#evadeAugSkill').html(buildMAGCMAugmentSkillOptions(options, `No skills available for ${augmentActor.name}`));
                html.find('#evadeAugSkill').val(options[0]?.valueKey || "");
                updateOver100Preview();
            }
            function updateCapSkills() {
                const capActor = augmentActors.find(candidate => candidate.id === capCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMActorSkillOptions(capActor);
                html.find('#evadeCapSkill').html(options.length > 0
                    ? options.map(i => `<option value="${i.id}">${i.name} (${getMAGCMSkillValue(i)}%)</option>`).join("")
                    : `<option value="">No skills available for ${capActor.name}</option>`);
                updateOver100Preview();
            }
            augmentCheckbox.on('change', updateVisibility);
            capToggle.on('change', updateVisibility);
            forceRollToggle.on('change', updateVisibility);
            evadeDiffSelect.on('change', updateOver100Preview);
            html.find('#evadeCustomAugment').on('input', updateOver100Preview);
            html.find('#evadeAugSkill').on('change', updateOver100Preview);
            html.find('#evadeCapSkill').on('change', updateOver100Preview);
            // Spending a Luck Point instead makes spending an Action Point redundant
            html.find('#evadeSpendLuck').on('change', (event) => {
                if (event.currentTarget.checked) html.find('#spend-ap').prop('checked', false);
            });
            augmentCharacterSelect.on('change', updateAugmentSkills);
            updateAugmentSkills();
            capCharacterSelect.on('change', updateCapSkills);
            updateCapSkills();
            updateVisibility();
        }
    }, { resizable: true }).render(true);
}

// -- Special Effects Data & Filtering Rendering --
const specialEffectsData = {
    // [Leaving the arrays identical to your original code to save space]
    // Note: Only the rendering logic below is altered.
offensive: [
        { name: "Bash", tags: ["melee", "trait_bash"], desc: `<p>The attacker deliberately bashes the opponent off balance. How far the defender totters back or sideward depends on the weapon being used.</p><p>Shields knock an opponent back one metre per for every two points of damage rolled (prior to any subtractions due to armour, parries, and so forth), whereas bludgeoning weapons knock back one metre per for every three points.</p><p>Bashing works only on creatures up to twice the attacker's SIZ. If the recipient is forced backwards into an obstacle, then they must make a Hard Athletics or Acrobatics skill roll to avoid falling or tripping over.</p>`},
        { name: "Bleed", tags: ["melee", "trait_bleed", "injured-target"], desc: `<p>The attacker can attempt to cut open a major blood vessel. If the blow overcomes Armour Points and injures the target, the defender must make an opposed roll of Endurance against the original attack roll. If the defender fails, then they begin to bleed profusely.</p><p>At the start of each Combat Round the recipient loses one level of Fatigue, until they collapse and possibly die. Bleeding wounds can be staunched by passing a First Aid skill roll, but the recipient can no longer perform any strenuous or violent action without re-opening the wound.</p>`},
        { name: "Bypass Armour", tags: ["critical", "stackable", "melee", "ranged"], desc: `<p>On a critical the attacker finds a gap in the defender's natural or worn armour.</p><p>If the defender is wearing armour above natural protection, then the attacker must decide which of the two is bypassed. This effect can be stacked to bypass both.</p><p>For the purposes of this effect, physical protection gained from magic is considered as being worn armour.</p>`},
        { name: "Choose Location", tags: ["melee", "ranged"], desc: `<p>When using hand-to-hand melee weapons the attacker may freely select the location where the blow lands, as long as that location is normally within reach.</p><p>If using ranged weapons Choose Location is a Critical Success only, unless the target is within close range, and is either stationary or unaware of the attacker.</p>`},
        { name: "Circumvent Cover", tags: ["critical", "ranged"], desc: `<p>Assuming that the shooter is using some high-tech weaponry, they can fire around the target's cover. In most cases this will require something along the lines of self guided ammunition.</p><p>If used as a trick shot, for example bouncing a laser blast off a mirror or ricocheting a bullet off a wall, then the special effect should be treated as a Critical Success only with a commensurate reduction in damage.</p>`},
        { name: "Circumvent Parry", tags: ["critical", "melee", "ranged"], desc: `<p>On a critical the attacker may completely bypass an otherwise successful parry.</p>`},
        { name: "Close Range", tags: ["melee"], desc: `<p>Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the shorter weapon.</p>`},
        { name: "Compel Surrender", tags: ["melee", "ranged"], desc: `<p>Allows the character a chance to force the surrender of a helpless or disadvantaged opponent; for example someone who has been disarmed, is lying prone unable to regain his footing, has suffered a serious (or worse) wound, and so on.</p><p>Damage is not inflicted on the target, they are only threatened. Assuming the target is sapient and able to understand the demand, the target must make an opposed roll of Willpower against the original attack or parry roll.</p><p>If the target fails, they capitulate. Games Masters may wish to reserve Compel Surrender for use against non-player characters only.</p>`},
        { name: "Damage Weapon", tags: ["melee", "ranged"], desc: `<p>Permits the character to damage his opponent's weapon as part of an attack or parry.</p><p>If attacking, the character aims specifically at the defender's parrying weapon and applies his damage roll to it, rather than the wielder. The targeted weapon uses its own Armour Points for resisting the damage.</p><p>If reduced to zero Hit Points the weapon breaks.</p>`},
        { name: "Disarm Opponent", tags: ["melee", "ranged"], desc: `<p>The character knocks, yanks or twists the opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original roll.</p><p>If the recipient of the disarm loses, his weapon is flung a distance equal to the roll of the disarmer's Damage Modifier in metres. If there is no Damage Modifier then the weapon drops at the disarmed person's feet.</p><p>The comparative size of the weapons affects the roll. Each step that the disarming character's weapon is larger increases the difficulty of the opponent's roll by one grade. Conversely each step the disarming character's weapon is smaller, makes the difficulty one grade easier.</p><p>Disarming works only on creatures of up to twice the attacker's STR.</p>`},
        { name: "Drop Foe", tags: ["ranged", "trait_siege", "trait_firearm", "injured-target"], desc: `<p>Assuming the target suffers at least a minor wound from a siege weapon, firearms shot or similar, they are forced to make an Opposed Test of their Endurance against the attacker's hit roll.</p><p>Failure indicates that the target succumbs to shock and pain, becoming incapacitated and unable to continue fighting.</p><p>Recovery from incapacitation can be performed with a successful First Aid check or using some form of magic or narcotic stimulant if such exists in the campaign. Otherwise the temporary incapacitation lasts for a period equal to one hour divided by the Healing Rate of the target.</p>`},
        { name: "Duck Back", tags: ["ranged"], desc: `<p>This special effect allows the shooter to immediately duck back into cover, without needing to wait for their next Turn to use the Take Cover action.</p><p>The character must be already standing or crouching adjacent to some form of cover to use Duck Back.</p>`},
        { name: "Entangle", tags: ["trait_entangle", "melee", "ranged"], desc: `<p>Allows a character wielding an entangling weapon, such as a whip or net, to immobilise the location struck. An entangled arm cannot use whatever it is holding; a snared leg prevents the target from moving; whilst an enmeshed head, chest or abdomen makes all skill rolls one grade harder.</p><p>On his following turn the wielder may spend an Action Point to make an automatic Trip Opponent attempt.</p><p>An entangled victim can attempt to free himself on his turn by either attempting an opposed roll using Brawn to yank free, or win a Special Effect and select Damage Weapon, Disarm Opponent or Slip Free.</p>`},
        { name: "Flurry", tags: ["stackable", "melee", "unarmed"], desc: `<p>An unarmed creature or attacker can make an immediate follow-up attack using a different limb or body part, without needing to wait for its next turn. A human attacker might follow up a punch to the abdomen with a knee to the face for example.</p><p>The additional attack still costs an Action Point, but potentially allows several attacks in sequence before the defender can respond offensively.</p>`},
        { name: "Force Failure", tags: ["opponent-fumble", "melee", "ranged"], desc: `<p>Used when an opponent fumbles, the character can combine Force Failure with any other Special Effect which requires an opposed roll to work.</p><p>Force Failure causes the opponent to fail his resistance roll by default - thereby automatically be disarmed, tripped, etc.</p>`},
        { name: "Grip", tags: ["melee", "unarmed"], desc: `<p>Provided the opponent is within the attacker's Unarmed Combat reach, he may use an empty hand (or similar limb capable of gripping such as claws, tails or tentacles) to hold onto the opponent, preventing them from being able to change weapon range or disengage from combat.</p><p>The opponent may attempt to break free on his turn, requiring an opposed roll of either Brawn or Unarmed against whichever of the two skills the gripper prefers. If the gripped victim wins, they manage to break free.</p><p>Note that some attackers using Brawn may be so strong that no amount of brute force or cunning technique can overcome their grip.</p>`},
        { name: "Impale", tags: ["trait_impale", "melee", "ranged", "injured-target"], desc: `<p>The attacker can attempt to drive an impaling weapon deep into the defender. Roll weapon damage twice, with the attacker choosing which of the two results to use for the attack.</p><p>If armour is penetrated and causes a wound, then the attacker has the option of leaving the weapon in the wound, or yanking it free on their next turn. Leaving the weapon in the wound inflicts a difficulty grade on the victim's future skill attempts. The severity of the penalty depends on the size of both the creature and the weapon impaling it, as listed on the Impale Effects Table above. For simplicity's sake, further impalements with the same sized weapon inflict no additional penalties.</p><p>To withdraw an impaled weapon during melee requires use of the Ready Weapon combat action. The wielder must pass an unopposed Brawn roll (or win an opposed Brawn roll if the opponent resists). Success pulls the weapon free, causing further injury to the same location equal to half the normal damage roll for that weapon, but without any damage modifier.</p><p>Failure implies that the weapon remained stuck in the wound with no further effect, although the wielder may try again on their next turn. Specifically barbed weapons (such as harpoons) inflict normal damage. Armour does not reduce withdrawal damage.</p><p>Whilst it remains impaled, the attacker cannot use his impaling weapon for parrying.</p>`},
        { name: "Kill Silently", tags: ["trait_assassination", "melee", "ranged"], desc: `<p>Restricted to those trained in a Combat Style with the Assassination benefit. It allows the attacker to neutralise a victim in complete silence, covering their mouth or grasping them about the neck whilst simultaneously stabbing, cutting or garrotting them.</p><p>This prevents the victim from crying out or otherwise raising an alarm for the entire round. In addition, if during this time the attacks inflict a Serious or Major Wound, the victim will automatically fail its Endurance roll.</p><p>Kill Silently can only be used on a surprised opponent, and only on the first attack against them.</p>`},
        { name: "Marksman", tags: ["ranged"], desc: `<p>Permits the shooter to move the Hit Location struck by his shot by one step, to an immediately adjoining body area.</p><p>Physiology has an effect on what can be re-targeted, and common sense should be applied. Thus using this special effect on a humanoid would permit an attacker who rolled a leg shot, to move it up to the abdomen instead. Conversely shooting a griffin in the chest would permit selection of the forelegs, wings or head.</p>`},
        { name: "Maximise Damage", tags: ["critical", "stackable", "melee", "ranged"], desc: `<p>On a critical the character may substitute one of his weapon's damage dice for its full value. For example a Hatchet which normally does 1d6 damage would instead be treated as a 6, whereas a great club with 2d6 damage would instead inflict 1d6+6 damage.</p><p>This special effect may be stacked.</p><p>Although it can also be used for natural weapons, Maximise Damage does not affect the Damage Modifier of the attacker, which must be rolled normally.</p>`},
        { name: "Open Range", tags: ["melee"], desc: `<p>Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the longer weapon.</p>`},
        { name: "Overpenetration", tags: ["trait_overpenetration", "critical", "ranged"], desc: `<p>On a critical, if shooting at lineally positioned opponents or into a densely packed group, this special effect allows the shot to travel completely through the first victim to strike a second behind them, assuming that it overcomes the first target's body armour.</p><p>The second victim however, only suffers half damage due to attenuation or slowing down of the shot. Overpenetration is generally of more use with high powered weapons that inflict large amounts of damage or those which have some sort of armour piercing ability.</p><p>Any other special effects inflicted on the first target are not applied to the second.</p>`},
        { name: "Pin Down", tags: ["stackable", "ranged"], desc: `<p>This special effect forces the target to make an Opposed Test of their Willpower against the attacker's hit roll. Failure means that the target hunkers down behind whatever cover is available, and cannot return fire on their next Turn.</p><p>Note that Pin Down works even if no actual damage is inflicted on the target (perhaps due to a successful evasion or shots striking their cover instead), as it relies on the intimidation effect of projectiles passing very close by.</p><p>Although a pinned victim is unable to fire back for the requisite time, they can perform other actions provided they don't expose themselves to fire in the process, such as crawling away to new cover, communicating with others, reloading a weapon, and so on.</p>`},
        { name: "Pin Weapon", tags: ["critical", "melee", "ranged"], desc: `<p>On a critical the character can pin one of his opponent's weapons or shield, using his body or positioning to hold it in place.</p><p>On his turn the opponent may attempt to wrestle or manoeuvre the pinned item free. This costs an Action Point and works as per the Grip special effect.</p><p>Failure means that the pinned item remains unusable. In the meantime, an opponent lacking a weapon or shield in the other hand may only avoid an attack by evading, using his Unarmed skill or disengaging completely.</p>`},
        { name: "Press Advantage", tags: ["melee"], desc: `<p>The attacker pressures his opponent, so that his foe is forced to remain on the defensive, and cannot attack on their next turn. This allows the attacker to potentially establish an unbroken sequence of attacks whilst the defender desperately blocks.</p><p>It is only effective against foes concerned with defending themselves. Foes that find themselves constantly locked under an unceasing sequence of Press Advantage will likely disengage from the combat, call for help, or use Prepare Counter to give attackers a nasty surprise.</p>`},
        { name: "Rapid Reload", tags: ["stackable", "ranged"], desc: `<p>When using a ranged weapon, the attacker reduces the reload time for the next shot by one. This effect can be stacked.</p>`},
        { name: "Remise", tags: ["melee"], desc: `<p>The attacker performs a sequential follow-up attack with a weapon of size Small on his opponent's next turn, which forces the foe to change their proactive action into a reactive one.</p>`},
        { name: "Re-roll Damage", tags: ["melee", "ranged", "homebrew"], desc: `<p>The attacker re-rolls their damage di(c)e and chooses the higher result to apply.<br/><br/><em style="font-size:0.75em">This is a homebrew special effect.</em></p>`},
        { name: "Scar Foe", tags: ["melee", "ranged"], desc: `<p>The opponent is given a scar that will disfigure them for the rest of their life, for example a slice across the face, or an artfully inscribed letter across the chest.</p>`},
        { name: "Spoil Spell", tags: ["melee", "ranged", "injured-target"], desc: `<p>The character automatically ruins any spell in the process of being cast, providing the blow overcomes Armour Points and injures the target.</p>`},
        { name: "Stun Location", tags: ["melee", "trait_stun-location", "injured-target"], desc: `<p>The attacker can use a bludgeoning weapon to temporarily stun the body part struck.</p><p>If the blow overcomes Armour Points and injures the target, the defender must make an opposed roll of Endurance vs. the original attack roll. If the defender fails, then the Hit Location is incapacitated for a number of turns equal to the damage inflicted.</p><p>A blow to the torso causes the defender to stagger winded, only able to defend. A head shot renders the foe briefly insensible.</p>`},
        { name: "Sunder", tags: ["trait_sunder", "melee"], desc: `<p>The attacker may use a suitable weapon to damage the armour or natural protection of an opponent.</p><p>Any weapon damage, after reductions for parrying or magic, is applied against the Armour Point value of the protection. Surplus damage in excess of its Armour Points is then used to reduce the AP value of that armour(ed) location - ripping straps, bursting rings, creasing plates or tearing away the hide, scales or chitin of monsters.</p><p>If any damage remains after the protection has been reduced to zero AP, it carries over onto the Hit Points of the location struck.</p>`},
        { name: "Take Weapon", tags: ["melee", "unarmed"], desc: `<p>Allows an unarmed character to yank or twist an opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original Unarmed roll.</p><p>If the target loses, his weapon is taken and from that moment on, may be used by the character instead.</p><p>Take Weapon differs from Disarm Opponent in that the size of the weapon is largely irrelevant. However, the technique only works on creatures of up to twice the attacker's STR.</p>`},
        { name: "Trip Opponent", tags: ["melee", "ranged"], desc: `<p>The character attempts to overbalance or throw his opponent to the ground. The opponent must make an opposed roll of his Brawn, Evade or Acrobatics against the character's original roll.</p><p>If the target fails, he falls prone. Quadruped opponents (or creatures with even more legs) may substitute their Athletics skill for Evade, and treat the roll as one difficulty grade easier.</p>`}
    ],
    defensive: [
        { name: "Accidental Injury", tags: ["opponent-fumble"], desc: `<p>The defender deflects or twists an opponent's attack in such a way that he fumbles, injuring himself.</p><p>The attacker must roll damage against himself in a random hit location using the weapon used to strike. If unarmed he tears or breaks something internal, the damage roll ignoring any armour.</p>`},
        { name: "Arise", tags: ["melee", "ranged"], desc: `<p>Allows the defender to use a momentary opening to roll back up to their feet.</p>`},
        { name: "Blind Opponent", tags: ["critical", "melee"], desc: `<p>On a critical the defender briefly blinds his opponent by throwing sand, reflecting sunlight off his shield, or some other tactic which briefly interferes with the attacker's vision.</p><p>The attacker must make an opposed roll of his Evade skill (or Weapon style if using a shield) against the defender's original parry roll. If the attacker fails he suffers the Blindness situational modifier for the next 1d3 turns.</p>`},
        { name: "Close Range", tags: ["melee"], desc: `<p>Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the shorter weapon.</p>`},
        { name: "Compel Surrender", tags: ["melee", "ranged"], desc: `<p>Allows the character a chance to force the surrender of a helpless or disadvantaged opponent; for example someone who has been disarmed, is lying prone unable to regain his footing, has suffered a serious (or worse) wound, and so on.</p><p>Damage is not inflicted on the target, they are only threatened. Assuming the target is sapient and able to understand the demand, the target must make an opposed roll of Willpower against the original attack or parry roll.</p><p>If the target fails, they capitulate. Games Masters may wish to reserve Compel Surrender for use against non-player characters only.</p>`},
        { name: "Damage Weapon", tags: ["melee"], desc: `<p>Permits the character to damage his opponent's weapon as part of an attack or parry.</p><p>If attacking, the character aims specifically at the defender's parrying weapon and applies his damage roll to it, rather than the wielder. The targeted weapon uses its own Armour Points for resisting the damage.</p><p>If reduced to zero Hit Points the weapon breaks.</p>`},
        { name: "Disarm Opponent", tags: ["melee", "ranged"], desc: `<p>The character knocks, yanks or twists the opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original roll.</p><p>If the recipient of the disarm loses, his weapon is flung a distance equal to the roll of the disarmer's Damage Modifier in metres. If there is no Damage Modifier then the weapon drops at the disarmed person's feet.</p><p>The comparative size of the weapons affects the roll. Each step that the disarming character's weapon is larger increases the difficulty of the opponent's roll by one grade. Conversely each step the disarming character's weapon is smaller, makes the difficulty one grade easier.</p><p>Disarming works only on creatures of up to twice the attacker's STR.</p>`},
        { name: "Enhance Parry", tags: ["critical", "melee", "ranged"], desc: `<p>On a critical the defender manages to deflect the entire force of an attack, no matter the Size of his weapon.</p>`},
        { name: "Entangle", tags: ["trait_entangle", "melee", "ranged"], desc: `<p>Allows a character wielding an entangling weapon, such as a whip or net, to immobilise the location struck. An entangled arm cannot use whatever it is holding; a snared leg prevents the target from moving; whilst an enmeshed head, chest or abdomen makes all skill rolls one grade harder.</p><p>On his following turn the wielder may spend an Action Point to make an automatic Trip Opponent attempt.</p><p>An entangled victim can attempt to free himself on his turn by either attempting an opposed roll using Brawn to yank free, or win a Special Effect and select Damage Weapon, Disarm Opponent or Slip Free.</p>`},
        { name: "Force Failure", tags: ["melee", "ranged"], desc: `<p>Used when an opponent fumbles, the character can combine Force Failure with any other Special Effect which requires an opposed roll to work.</p><p>Force Failure causes the opponent to fail his resistance roll by default - thereby automatically be disarmed, tripped, etc.</p>`},
        { name: "Open Range", tags: ["melee"], desc: `<p>Permits the character to automatically change the engagement range between himself and his opponent, so that they end up at the Range favoured by the longer weapon.</p>`},
        { name: "Overextend Opponent", tags: ["stackable", "melee", "ranged"], desc: `<p>The defender sidesteps or retreats at an inconvenient moment, causing the attacker to overreach himself. Opponent cannot attack on his next turn.</p><p>This special effect can be stacked.</p>`},
        { name: "Pin Weapon", tags: ["critical", "melee", "ranged"], desc: `<p>On a critical the character can pin one of his opponent's weapons or shield, using his body or positioning to hold it in place.</p><p>On his turn the opponent may attempt to wrestle or manoeuvre the pinned item free. This costs an Action Point and works as per the Grip special effect.</p><p>Failure means that the pinned item remains unusable. In the meantime, an opponent lacking a weapon or shield in the other hand may only avoid an attack by evading, using his Unarmed skill or disengaging completely.</p>`},
        { name: "Prepare Counter", tags: ["stackable", "melee", "ranged"], desc: `<p>The defender reads the patterns of his foe and pre-plans a counter against a specific Special Effect (which should be noted down in secret).</p><p>If his opponent attempts to inflict the chosen Special Effect upon him during the fight, the defender instantly substitutes the attackers effect with an offensive or defensive one of his own, which succeeds automatically.</p>`},
        { name: "Scar Foe", tags: ["melee", "ranged"], desc: `<p>The opponent is given a scar that will disfigure them for the rest of their life, for example a slice across the face, or an artfully inscribed letter across the chest.</p>`},
        { name: "Select Target", tags: ["melee", "ranged"], desc: `<p>When an attacker fumbles, the defender may manoeuvre or deflect the blow in such a way that it hits an adjacent bystander instead. This requires that the new target is within reach of the attacker's close combat weapon, or in the case of a ranged attack, is standing along the line of fire.</p><p>The new victim is taken completely by surprise by the unexpected accident, and has no chance to avoid the attack which automatically hits. In compensation however, they suffer no special effect.</p>`},
        { name: "Slip Free", tags: ["critical", "melee", "ranged"], desc: `<p>On a critical the defender can automatically escape being Entangled, Gripped, or Pinned.</p>`},
        { name: "Spoil Spell", tags: ["melee", "ranged", "injured-target"], desc: `<p>The character automatically ruins any spell in the process of being cast, providing the blow overcomes Armour Points and injures the target.</p>`},
        { name: "Stand Fast", tags: ["melee", "ranged"], desc: `<p>The defender braces himself against the force of an attack, allowing them to avoid the Knockback effects of any damage received.</p>`},
        { name: "Take Weapon", tags: ["melee", "unarmed"], desc: `<p>Allows an unarmed character to yank or twist an opponent's weapon out of his hand. The opponent must make an opposed roll of his Combat Style against the character's original Unarmed roll.</p><p>If the target loses, his weapon is taken and from that moment on, may be used by the character instead.</p><p>Take Weapon differs from Disarm Opponent in that the size of the weapon is largely irrelevant. However, the technique only works on creatures of up to twice the attacker's STR.</p>`},
        { name: "Trip Opponent", tags: ["melee", "ranged"], desc: `<p>The character attempts to overbalance or throw his opponent to the ground. The opponent must make an opposed roll of his Brawn, Evade or Acrobatics against the character's original roll.</p><p>If the target fails, he falls prone. Quadruped opponents (or creatures with even more legs) may substitute their Athletics skill for Evade, and treat the roll as one difficulty grade easier.</p>`},
        { name: "Weapon Malfunction", tags: ["opponent-fumble", "melee", "ranged", "trait_firearm"], desc: `<p>The attacker's weapon malfunctions in such a way that it is rendered useless until time can be spent repairing it.</p>`},
        { name: "Withdraw", tags: ["melee"], desc: `<p>The defender may automatically withdraw out of reach, breaking off engagement with that particular opponent.</p>`},
    ]
};

const generalTags = ["critical", "opponent-fumble", "stackable", "melee", "ranged", "unarmed", "homebrew", "injured-target"];
const traitTags = ["trait_impale", "trait_bleed", "trait_entangle", "trait_sunder", "trait_assassination", "trait_bash", "trait_stun-location", "trait_overpenetration", "trait_siege", "trait_firearm"];

// Determines whether the attack tied to attackMessageId would actually injure the target (armour is overcome
// and the selected Damage Mode still leaves damage against the hit location's HP), used to hide Special Effects
// tagged "injured-target" (e.g. Bleed, Stun Location) until that is actually true. Per the requirement these
// effects are EXCLUDED unless injury is confirmed, so every "we don't know yet" case (no message, damage/hit
// location not rolled yet) defaults to false (excluded) rather than assuming the best case.
function computeMAGCMIsInjuredTarget(attackMessageId) {
    const attackMessage = attackMessageId ? game.messages.get(attackMessageId) : null;
    if (!attackMessage) return false;
    const damageRolled = Boolean(attackMessage.getFlag(MAGCM_MODULE_ID, 'attack-damage-rolled'));
    const location = attackMessage.getFlag(MAGCM_MODULE_ID, 'attack-hit-location');
    if (!damageRolled || !location) return false;

    const rawDamage = Number(attackMessage.getFlag(MAGCM_MODULE_ID, 'attack-damage')) || 0;
    const damageMode = attackMessage.getFlag(MAGCM_MODULE_ID, 'attack-damage-mode') || 'full';
    const mitigatableDamage = damageMode === 'none' ? 0 : (damageMode === 'half' ? Math.round(rawDamage / 2) : rawDamage);
    if (mitigatableDamage <= 0) return false;

    const bypassWorn = Boolean(attackMessage.getFlag(MAGCM_MODULE_ID, 'attack-bypass-worn-armor'));
    const bypassNatural = Boolean(attackMessage.getFlag(MAGCM_MODULE_ID, 'attack-bypass-natural-armor'));
    return !computeMAGCMArmorHoldsDamage(mitigatableDamage, location.armor, location.naturalArmor, bypassWorn, bypassNatural);
}

// Helper to format tags into display text
function formatTag(tag) {
    let text = tag.replace('trait_', '').replace(/-/g, ' ');
    return text.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
}

function renderSpecialEffectsDialog(winner, effectsCount, weaponType = "", traitsStr = "", isCritical = "false", isOpponentFumble = "false", attackMessageId = null) {
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
                        content: `<div class="magcm-chat-card">
                        <div class="magcm-chat-card-title magcm-chat-card-title--special-effects"><i class="fas fa-star"></i> ${sfObj.name}</div>
                        <div lang="en" class="magcm-chat-card-content">
                       ${sfObj.desc}
                       </div>
                        </div>`
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
                html.find('.action-pill').each(function () {
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

            // Auto-filter based on roll state variables. Unarmed Combat is a melee combat style, and only a
            // few effects carry an explicit "unarmed" tag (always alongside "melee", never in its place) -
            // treating "unarmed" as its own restrictive category here excluded almost every melee-tagged
            // effect for unarmed attacks/evades, so it's normalised to "melee" instead.
            if (weaponType) {
                setFilter(weaponType === "unarmed" ? "melee" : weaponType, 'include');
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

            // Matches the Winner-line hover tooltip: injured-target effects (Bleed, Impale, etc.) are
            // excluded unless it's confirmed the rolled damage overcomes armour and deals HP damage.
            if (!computeMAGCMIsInjuredTarget(attackMessageId)) {
                setFilter('injured-target', 'exclude');
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

            html.find('.tag-btn').on('click', function (e) {
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

            html.find('.action-pill').on('click', function () {
                html.find('.action-pill').removeClass('selected-pill');
                $(this).addClass('selected-pill');
            });
        }
    }, { width: 600, height: 540, resizable: true }).render(true);
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
                    <div class="magcm-chat-card">
                    <div class="magcm-chat-card-title"><i class="fas fa-heart-pulse"></i> Exertion Check</div>
                    <div class="magcm-chat-card-header">
                        ${buildMAGCMStatsRowHtml([{ label: "Character", value: combatant.name }, { label: "Rounds of Exertion", value: actorCompleted }])}
                        <div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-triangle-exclamation"></i> Time to roll Endurance for potential fatigue loss!</div>
                    </div>
                    <div style="text-align: center; margin-top: 8px;">
                        <button class="roll-endurance-btn" data-actor-id="${actor.id}"><i class="fas fa-heart-pulse"></i> Roll Endurance</button>
                    </div>
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

// Serious/Major Wound consequences, quoted/paraphrased from the Mythras rulebook's "Damage and Wound
// Levels" section (pages 109-111): Arms/Legs and Abdomen/Chest/Head each have their own failure outcome,
// but both share the same "stunned/incapacitated + opposed Endurance roll" framing.
const MAGCM_WOUND_LOCATION_DESCRIPTIONS = {
    limb: {
        serious: (actorName, locName, isLeg) => `The ${locName?.toLowerCase()} is permanently scarred, and ${actorName} cannot attack or begin casting spells (though they may still parry or evade) for the next 1d3 turns. They must immediately make an opposed Endurance roll against the attacker's original attack roll - on a failure, the limb is rendered useless until healed back to positive Hit Points${isLeg ? ", and the character drops prone" : ", and they drop whatever is held in it (unless strapped on)"}. At the Game Master's discretion, tasks using the ${locName} may also suffer an ongoing one-grade difficulty penalty until it heals to a Minor Wound.`,
        major: (actorName, locName) => `The ${locName?.toLowerCase()} is severed, transfixed, shattered, or torn off. ${actorName} falls prone, physically incapacitated, and must immediately make an opposed Endurance roll against the attacker's original attack roll - on a failure, they fall unconscious from the agony. If the wound isn't treated within 5 times their Healing Rate (in minutes), they die of blood loss and shock.`
    },
    torso: {
        serious: (actorName, locName) => `The ${locName?.toLowerCase()} is permanently scarred, and ${actorName} cannot attack or begin casting spells (though they may still parry or evade) for the next 1d3 turns. They must immediately make an opposed Endurance roll against the attacker's original attack roll - on a failure, they fall unconscious for a number of minutes equal to the damage sustained. At the Game Master's discretion, tasks using the ${locName} may also suffer an ongoing one-grade difficulty penalty until it heals to a Minor Wound.`,
        major: (actorName) => `${actorName} falls unconscious, totally incapacitated, and must immediately make an opposed Endurance roll against the attacker's original attack roll - on a failure, they suffer an instant, gratuitous death. If they survive and the wound isn't treated within twice their Healing Rate (in Combat Rounds), they still die of blood loss and shock.`
    }
};

// Arms/Legs follow the "limb" consequences (a useless limb, or severed/incapacitated); Head/Chest/Abdomen
// follow the "torso" consequences (unconsciousness, or death) - Mythras draws no further distinction.
function getMAGCMWoundLocationCategory(locName) {
    const name = String(locName || "").toLowerCase();
    if (name.includes("arm") || name.includes("leg") || name.includes("wing") || name.includes("tentacle") || name.includes("limb") || name.includes("fin") || name.includes("tail")) return "limb";
    if (name.includes("head") || name.includes("chest") || name.includes("torso") || name.includes("abdomen") || name.includes("thorax") || name.includes("body") || name.includes("quarters") || name.includes("length")) return "torso";
    return null;
}

// Serious/Major Wound automation: whenever a hit location newly crosses into a Serious or Major wound
// (i.e. it wasn't already at that tier or worse), post a description of that wound plus an Endurance Roll
// prompt to chat. Also handles the reverse: clearing the "indefinite" Serious-Wound Stun Location (see the
// Stun Location button below) once the location heals back to a Minor Wound or better. Only the active GM
// posts/applies, to avoid duplicate messages or writes from every connected client.
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
    if (newRank === oldRank) return;

    // Recovered to a Minor Wound (or better) - clear any indefinite Stun Location this location's Serious
    // Wound prompt applied (a special-effect Stun Location has its own turnsRemaining countdown instead).
    if (newRank === 0 && oldRank > 0) {
        const stunData = item.getFlag(MAGCM_MODULE_ID, "stunnedBy");
        if (stunData?.indefinite) {
            await item.unsetFlag(MAGCM_MODULE_ID, "stunnedBy");
            await ChatMessage.create({
                speaker: ChatMessage.getSpeaker({ actor }),
                content: `
                    <div class="magcm-chat-card">
                    <div class="magcm-chat-card-title magcm-chat-card-title--condition">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`)} Stun Location Recovered</div>
                    <div class="magcm-chat-card-header">
                        ${buildMAGCMStatsRowHtml([{ label: "Character", value: actor.name }, { label: "Location", value: item.name }])}
                        <div class="magcm-chat-card-notice magcm-chat-card-notice--info">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`)} Healed enough that it is no longer stunned.</div>
                    </div>
                    </div>
                `
            });
        }
        return;
    }

    if (newRank <= oldRank || newRank === 0) return;

    const severityLabel = newRank === 2 ? "Major Wound" : "Serious Wound";
    const category = getMAGCMWoundLocationCategory(item.name);
    const isLeg = String(item.name || "").toLowerCase().includes("leg");
    const descriptionFn = category ? MAGCM_WOUND_LOCATION_DESCRIPTIONS[category][newRank === 2 ? "major" : "serious"] : null;
    const description = descriptionFn
        ? descriptionFn(actor.name, item.name, isLeg)
        : `${actor.name} suffers a ${severityLabel.toLowerCase()} to their ${item.name}.`;

    // A Serious Wound (not Major, which already leaves the character fully incapacitated) can optionally be
    // followed up with an indefinite Stun Location on this same location - see the magcm-wound-stun-btn
    // handler below. Attribute it to whoever last damaged this location, if known.
    let stunButtonHtml = "";
    if (newRank === 1) {
        const lastDamageOriginUuid = item.getFlag(MAGCM_MODULE_ID, "lastDamageOrigin");
        const attackerActor = lastDamageOriginUuid ? fromUuidSync(lastDamageOriginUuid) : null;
        stunButtonHtml = `<button class="magcm-wound-stun-btn" data-actor-id="${actor.id}" data-location-id="${item.id}" data-location-name="${item.name}" data-attacker-actor-id="${attackerActor?.id || ""}" data-attacker-name="${attackerActor?.name || "Unspecified"}" style="margin-top: 5px; margin-left: 6px;">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`)} Stun Location</button>`;
    }

    await ChatMessage.create({
        speaker: ChatMessage.getSpeaker({ actor }),
        content: `
            <div class="magcm-chat-card">
            <div class="magcm-chat-card-title magcm-chat-card-title--condition"><i class="fas fa-heart-crack"></i> ${severityLabel}</div>
            <div class="magcm-chat-card-header">
                ${buildMAGCMStatsRowHtml([{ label: "Character", value: actor.name }, { label: "Location", value: item.name }])}
                <p style="margin: 4px 0 0 0; font-size: 0.9em;">${description}</p>
            </div>
            ${stunButtonHtml ? `<div style="text-align: center; margin-top: 8px;">${stunButtonHtml}</div>` : ""}
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
            <div class="magcm-chat-card">
            <div class="magcm-chat-card-title magcm-chat-card-title--condition"><i class="fas fa-battery-quarter"></i> Fatigue Changed</div>
            <div class="magcm-chat-card-header">
                ${buildMAGCMStatsRowHtml([{ label: "Character", value: actor.name }, { label: "From", value: format(previousValue) }, { label: "To", value: format(newValue) }])}
                ${recoveryTime ? `<div class="magcm-chat-card-notice"><i class="fas fa-clock"></i> Recovery to Fresh: ${recoveryTime}</div>` : ""}
            </div>
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

        // Check if the actor is currently bleeding (a plain actor flag - see the Bleeding overlay icon - rather
        // than a Foundry Active Effect)
        const hasBleeding = Boolean(actor.getFlag(MAGCM_MODULE_ID, "bleedingBy"));

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
                    <div class="magcm-chat-card">
                    <div class="magcm-chat-card-title magcm-chat-card-title--condition"><i class="fas fa-droplet"></i> Bleeding Fatigue Progression</div>
                    <div class="magcm-chat-card-header">
                        ${buildMAGCMStatsRowHtml([{ label: "Character", value: actor.name }, { label: "New Fatigue", value: nextFatigue.charAt(0).toUpperCase() + nextFatigue.slice(1) }])}
                        <div class="magcm-chat-card-notice"><i class="fas fa-droplet"></i> Bleeding and growing more exhausted.</div>
                    </div>
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
        if (stunData?.indefinite) continue; // Serious Wound's indefinite stun has no turn counter to decrement
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

// Select active token in combat encounter for GM: a world-scoped, GM-only preference (no document writes,
// so every GM client still applies it independently rather than gating behind game.users.activeGM like the
// write-performing combat hooks above). Only fires for combatants that aren't any player's ASSIGNED character
// (Configure Player Character) - an NPC a player merely owns still counts as "not a player character" here.
Hooks.on("updateCombat", (combat, updateData) => {
    if (!game.user.isGM) return;
    if (!game.settings.get(MAGCM_MODULE_ID, "enableAutoSelectActiveCombatant")) return;
    if (!combat.started) return;
    if (!("turn" in updateData) && !("round" in updateData)) return;

    const combatant = combat.combatant;
    const actor = combatant?.actor;
    if (!actor) return;

    const isPlayerCharacter = game.users.some(u => !u.isGM && u.character?.id === actor.id);
    if (isPlayerCharacter && !game.settings.get(MAGCM_MODULE_ID, "enableAutoSelectPlayerCharacters")) return;

    const token = combatant.token?.object || canvas.tokens.get(combatant.tokenId);
    if (!token) return; // combatant's token isn't on the currently viewed scene

    Array.from(game.user.targets).forEach(t => t.setTarget(false, { user: game.user, releaseOthers: false }));
    token.control({ releaseOthers: true });
});

// Shared PIXI hover-tooltip binder for token overlay icon sprites, reusing Foundry's own floating tooltip
// element. `content` may be a pre-rendered HTML string, or a function returning one (evaluated per hover -
// use this form when the content can go stale between renders, e.g. it's cached on the token elsewhere).
function attachMAGCMPixiTooltip(sprite, content) {
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
        const htmlContent = typeof content === "function" ? content() : content;
        if (tooltipEl && htmlContent) {
            // Scaling an inner wrapper (rather than #tooltip itself, which Foundry/we position via left/top)
            // keeps that position math in un-scaled pixels - zooming #tooltip directly would multiply its
            // own left/top offset by the scale factor too, pushing it far from the cursor at larger sizes.
            tooltipEl.innerHTML = `<div class="magcm-scalable-tooltip-inner">${htmlContent}</div>`;
            if (clientX !== undefined && clientY !== undefined) {
                tooltipEl.style.left = `${clientX}px`;
                tooltipEl.style.top = `${clientY - 12}px`;
            }
        }
    };

    sprite.on("pointerover", showTooltip);
    sprite.on("pointermove", showTooltip);
    sprite.on("pointerout", () => game.tooltip.deactivate());
}

// Attack card's Weapon stat pill reuses Foundry's own native #tooltip element (same one the overlay icon
// above uses via attachMAGCMPixiTooltip), rather than the info-pill title+theme wrapper used by the other
// stat pills on the card, so its weapon-stat-grid content looks pixel-identical in both places.
function attachMAGCMWeaponPillTooltip(element, getBodyHtml) {
    if (!element || magcmInfoTooltipElements.has(element)) return;
    magcmInfoTooltipElements.add(element);

    const showTooltip = () => {
        const htmlContent = typeof getBodyHtml === "function" ? getBodyHtml() : getBodyHtml;
        if (!htmlContent) return;
        game.tooltip.activate(element, { text: " ", direction: "UP" });
        const tooltipEl = document.getElementById("tooltip");
        if (!tooltipEl) return;
        tooltipEl.innerHTML = `<div class="magcm-scalable-tooltip-inner">${htmlContent}</div>`;

        // Foundry positioned the tooltip based on the tiny placeholder text passed to activate() above -
        // reposition it now that the real (often much larger, and scale-zoomed) content is in, so it stays
        // fully on-screen instead of overflowing past the chat log's edge at larger Tooltip Size settings.
        const margin = 8;
        const elRect = element.getBoundingClientRect();
        const tipRect = tooltipEl.getBoundingClientRect();
        let left = elRect.left + (elRect.width - tipRect.width) / 2;
        let top = elRect.top - tipRect.height - 8;
        if (top < margin) top = elRect.bottom + 8;
        left = Math.max(margin, Math.min(left, window.innerWidth - tipRect.width - margin));
        top = Math.max(margin, Math.min(top, window.innerHeight - tipRect.height - margin));
        tooltipEl.style.left = `${left}px`;
        tooltipEl.style.top = `${top}px`;
    };

    element.removeAttribute("title");
    element.addEventListener("pointerenter", showTooltip);
    element.addEventListener("pointerleave", () => game.tooltip.deactivate());
}

// Shared "paperdoll" tooltip layout for token overlay icons whose per-location status reduces to a single
// icon plus one or two short text lines (Cover/Warded/Wound all fit this shape, as does the combined Hit
// Location Status tab). `items` is a caller-defined array of per-location entries (often the hitLocation
// Item itself, but can be a wrapper object) - `getLocationName`/`getCellData` both receive one such entry.
// `getCellData(item)` returns { bg, border, textColor, iconSrc, lines: [line1, line2?] }.
function buildMAGCMIconGridTooltipHtml(actor, items, { title, titleColor, getLocationName, getCellData, otherLabel } = {}) {
    const isHumanoid = isMAGCMActorHumanoid(actor);
    const humanoidMap = new Map();
    const otherItems = [];
    items.forEach(item => {
        const name = getLocationName(item);
        if (isHumanoid && MAGCM_HUMANOID_SLOTS[name] && !humanoidMap.has(name)) humanoidMap.set(name, item);
        else otherItems.push(item);
    });

    let bodyContent = "";
    if (isHumanoid) {
        const gridCells = Object.entries(MAGCM_HUMANOID_SLOTS).map(([locName, slot]) => {
            const item = humanoidMap.get(locName);
            if (!item) {
                return `
                        <div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; padding: 2px; opacity: 0.35;">
                            <span style="font-size: 8px; color: #aaa;">${slot.label}</span>
                        </div>`;
            }
            const cell = getCellData(item);
            const lineHtml = cell.lines.map((line, i) => i === 0
                ? `<span style="font-size: 8px; line-height: 1.1; margin-top: 2px; font-weight: bold; color: ${cell.textColor};">${line}</span>`
                : `<span style="font-size: 8px; color: ${cell.textColor};">${line}</span>`
            ).join("");
            const gridGlow = cell.glowColor ? ` drop-shadow(0 0 3px ${cell.glowColor})` : "";
            return `
                        <div style="grid-area: ${slot.area}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${cell.bg}; border: 1px solid ${cell.border}; border-radius: 4px; padding: 3px 2px; text-align: center;">
                            <img src="${cell.iconSrc}" style="width: 20px; height: 20px; border: none; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8))${gridGlow};" />
                            ${lineHtml}
                        </div>`;
        }).join("");
        bodyContent += `
                <div style="display: grid; grid-template-columns: repeat(3, minmax(65px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px; margin-top: 4px;">
                    ${gridCells}
                </div>`;
    }

    if (otherItems.length > 0 || !isHumanoid) {
        const listSource = isHumanoid ? otherItems : items;
        const listItems = listSource.map(item => {
            const cell = getCellData(item);
            const listGlow = cell.glowColor ? ` drop-shadow(0 0 3px ${cell.glowColor})` : "";
            return `
                <div style="display: flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.05); padding: 3px 6px; border-radius: 3px; border: 1px solid #444;">
                    <img src="${cell.iconSrc}" style="width: 18px; height: 18px; border: none; object-fit: contain; filter: drop-shadow(0 0 0 transparent)${listGlow};" />
                    <span style="font-size: 10px; font-weight: 500;">${cell.lines[0] || ""}</span>
                    <span style="font-size: 9px; color: #aaa; margin-left: auto;">(${getLocationName(item)})</span>
                </div>
            `;
        }).join("");
        bodyContent += `
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: ${isHumanoid ? "6px" : "4px"};">
                    ${isHumanoid ? `<div style="font-size: 9px; color: #888; text-transform: uppercase; border-bottom: 1px solid #444; padding-bottom: 1px;">${otherLabel || `Other ${title}`}</div>` : ""}
                    ${listItems}
                </div>`;
    }

    return `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 210px; max-width: 260px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: ${titleColor};">
                    ${title}
                </div>
                ${bodyContent}
            </div>`;
}

// Shared "paperdoll" tooltip layout for token overlay icons whose per-location status is a list of text
// records with no per-cell icon (Impale/Entangle/Stun). `renderRecords(item)` returns the inner HTML
// (below the location name) for one flagged hitLocation Item, shared identically between the grid and list.
function buildMAGCMRecordsGridTooltipHtml(actor, flaggedLocations, { title, accentColor, renderRecords }) {
    const isHumanoid = isMAGCMActorHumanoid(actor);
    const humanoidMap = new Map();
    const otherLocations = [];
    flaggedLocations.forEach(item => {
        if (isHumanoid && MAGCM_HUMANOID_SLOTS[item.name] && !humanoidMap.has(item.name)) humanoidMap.set(item.name, item);
        else otherLocations.push(item);
    });

    let bodyContent = "";
    if (isHumanoid) {
        const gridCells = Object.entries(MAGCM_HUMANOID_SLOTS).map(([locName, slot]) => {
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
}

function hexToMAGCMRgba(hex, alpha) {
    const cleaned = String(hex || "").replace("#", "");
    if (!/^[0-9a-fA-F]{6}$/.test(cleaned)) return `rgba(180,40,40,${alpha})`;
    const r = parseInt(cleaned.slice(0, 2), 16);
    const g = parseInt(cleaned.slice(2, 4), 16);
    const b = parseInt(cleaned.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// Null if the location isn't wounded (or has no tracked max HP at all), else one of MAGCM_WOUND_SEVERITIES.
function getMAGCMWoundSeverityData(loc) {
    const maxHp = Number(getMAGCMHitLocationMaxHp(loc));
    if (!Number.isFinite(maxHp) || maxHp <= 0) return null;
    const currentHp = Number(loc?.system?.currentHp ?? loc?.system?.hp?.value ?? loc?.currentHp ?? maxHp);
    if (!Number.isFinite(currentHp)) return null;
    if (currentHp > 0 && currentHp < maxHp) return MAGCM_WOUND_SEVERITIES[0];
    if (currentHp <= 0 && currentHp > -maxHp) return MAGCM_WOUND_SEVERITIES[1];
    if (currentHp <= -maxHp) return MAGCM_WOUND_SEVERITIES[2];
    return null;
}

function getMAGCMWoundLocationIconPath(severityData, locName, isHumanoid) {
    if (!severityData) return "";
    if (!isHumanoid) return `${MAGCM_ICONS_PATH}conditions/wounds/${severityData.key}.svg`;
    const normalized = String(locName || "").trim().toLowerCase().replace(/\s+/g, "-");
    return `${MAGCM_ICONS_PATH}conditions/wounds/${severityData.key}_${normalized}.svg`;
}

// --- Take Cover Icons ---
Hooks.once("ready", () => {
    // Helper: Build HTML for Covered Locations Tooltip (Paperdoll Layout)
    const buildCoverTooltipHTML = (actor, coveredLocations) => {
        const coverImg = `${MAGCM_ICONS_PATH}overlays/in-cover.svg`;
        const items = coveredLocations.map(loc => ({ location: loc }));
        return buildMAGCMIconGridTooltipHtml(actor, items, {
            title: "Hit Locations in Cover",
            titleColor: "#80ffcc",
            otherLabel: "Other Covered Locations",
            getLocationName: item => item.location.name,
            getCellData: () => ({ bg: "rgba(46, 139, 87, 0.15)", border: "#2e8b57", textColor: "#e0ffe0", iconSrc: coverImg, lines: ["In Cover"] })
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


        const coverImg = `${MAGCM_ICONS_PATH}overlays/in-cover.svg`;
        const coverTooltipHTML = buildCoverTooltipHTML(actor, coveredLocations);

        foundry.canvas.loadTexture(coverImg).then(texture => {
            if (!overlayContainer.destroyed) {
                const coverSprite = new PIXI.Sprite(texture);
                coverSprite.width = MAGCM_OVERLAY_ICONS_SIZE;
                coverSprite.height = MAGCM_OVERLAY_ICONS_SIZE;
                coverSprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;

                // Immediately right of the Warded Location icon (bottom-left), so it no longer overlaps
                // the Wound overlay icon which also occupies the middle-left edge of the token.
                coverSprite.x = MAGCM_OVERLAY_ICONS_SIZE;
                coverSprite.y = token.h - MAGCM_OVERLAY_ICONS_SIZE;

                attachMAGCMPixiTooltip(coverSprite, coverTooltipHTML);

                overlayContainer.addChild(coverSprite);
            }
        });
    });
});

// Builds the "stat card" tooltip shared by the held-weapon token overlay icon and the Attack card's
// Weapon stat pill. `weapon` may be a real Item, or (for unarmed/improvised attacks) a plain object
// shaped like one ({ type, name, system: { damage, reach, size } }, no img/getFlag) - pass `improvised:
// true` in that case to omit the icon, held-location/pinned/impaled state, and the AP/HP cell (none of
// which apply to an unarmed attack).
function buildMAGCMWeaponTooltipHTML(actor, weapon, { improvised = false } = {}) {
    const sys = weapon.system || {};
    const getFlag = (key) => (!improvised && typeof weapon.getFlag === "function") ? weapon.getFlag(MAGCM_MODULE_ID, key) : undefined;

    // Extract basic weapon statistics
    const damage = getMAGCMWeaponDamage(weapon) || "—";
    const isRanged = weapon.type === "ranged-weapon";
    const hp = sys.hp ?? sys.hitPoints ?? "—";
    const conditionBadge = improvised ? null : getMAGCMConditionBadge(weapon, hp, "originalHp", "HP");

    let stateHtml = "";
    if (!improvised) {
        const locationIds = getFlag("holdingLocations") || [];
        const locationNames = locationIds
            .map(id => actor.items.get(id)?.name)
            .filter(Boolean)
            .join(", ") || "Unspecified Location";
        const pinned = getFlag("pinned");
        const impaled = getFlag("impaled");
        stateHtml = `<span style="font-size: 9px; color: #aaa;">Held: ${locationNames}</span>` + (
            pinned
                ? `<span style="font-size: 9px; color: #ff8888;">Pinned: cannot attack or parry</span>`
                : impaled && !isRanged
                    ? `<span style="font-size: 9px; color: #ffdd80;">Impaling: ${impaled.targetName || "Target"} (${impaled.hitLocationName || "Location"})</span>`
                    : ""
        );
    }

    let statsGridHTML = "";

    if (isRanged) {
        const force = sys.force || "—";
        const impale = sys["impale-size"] ?? sys.impaleSize ?? "—";
        const totalLoad = sys.load ?? "—";
        // Default to 0 (unloaded), not totalLoad - the flag is unset until the weapon is reloaded at least once.
        const currentLoad = getFlag("loadProgress") ?? 0;
        const loadText = (currentLoad !== "—" || totalLoad !== "—") ? `${currentLoad}/${totalLoad}` : "—";
        const ammo = sys.ammo ?? "—";
        const ap = sys.ap ?? sys.armourPoints ?? "—";
        const apHp = (ap !== "—" || hp !== "—") ? `${ap}/${hp}` : "—";
        const apHpCellHtml = improvised ? "" : `
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">AP/HP</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${apHp}</div>
                    </div>`;

        statsGridHTML = `
                <div style="display: grid; grid-template-columns: repeat(${improvised ? 5 : 6}, 1fr); gap: 4px; text-align: center;">
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
                    </div>${apHpCellHtml}
                </div>${conditionBadge ? `<div style="text-align: center; margin-top: 4px;"><span style="font-size: 9px; color: ${conditionBadge.color};"><i class="fas ${conditionBadge.icon}"></i> ${conditionBadge.text}</span></div>` : ""}`;
    } else {
        const reach = sys.reach || "—";
        const size = getMAGCMWeaponSize(weapon) || "—";

        const ap = sys.ap ?? sys.armourPoints ?? "—";
        const apHp = (ap !== "—" || hp !== "—") ? `${ap}/${hp}` : "—";
        const apHpCellHtml = improvised ? "" : `
                    <div style="background: rgba(255,255,255,0.06); padding: 4px 2px; border-radius: 3px; border: 1px solid #444;">
                        <div style="font-size: 8px; color: #888; text-transform: uppercase;">AP/HP</div>
                        <div style="font-size: 10px; font-weight: bold; color: #fff; margin-top: 1px;">${apHp}</div>
                    </div>`;

        statsGridHTML = `
                <div style="display: grid; grid-template-columns: repeat(${improvised ? 3 : 4}, 1fr); gap: 4px; text-align: center;">
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
                    </div>${apHpCellHtml}
                </div>${conditionBadge ? `<div style="text-align: center; margin-top: 4px;"><span style="font-size: 9px; color: ${conditionBadge.color};"><i class="fas ${conditionBadge.icon}"></i> ${conditionBadge.text}</span></div>` : ""}`;
    }

    const headerImgHtml = improvised ? "" : `<img src="${weapon.img}" style="width: 28px; height: 28px; border: none; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8))${conditionBadge ? ` drop-shadow(0 0 3px ${conditionBadge.color})` : ""};" />`;

    return `
            <div style="display: flex; flex-direction: column; gap: 6px; min-width: 210px; padding: 2px;">
                <div style="display: flex; align-items: center; gap: 8px; border-bottom: 1px solid #555; padding-bottom: 4px;">
                    ${headerImgHtml}
                    <div style="display: flex; flex-direction: column;">
                        <span style="font-size: 11px; font-weight: bold; color: #ffdd80;">${weapon.name}</span>
                        ${stateHtml}
                    </div>
                </div>
                ${statsGridHTML}
            </div>`;
}

// --- Equipped Weapon Icons ---
Hooks.once("ready", () => {

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


        let weaponIndex = 0;

        heldWeapons.forEach(weapon => {
            if (!weapon.img) return;

            const weaponTooltipHTML = buildMAGCMWeaponTooltipHTML(actor, weapon);

            foundry.canvas.loadTexture(weapon.img).then(texture => {
                if (!overlayContainer.destroyed) {
                    const sprite = new PIXI.Sprite(texture);
                    sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
                    sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
                    sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA + 0.2;
                    sprite.x = token.w - (MAGCM_OVERLAY_ICONS_SIZE * (weaponIndex + 1)) - (2 * weaponIndex);
                    sprite.y = token.h - MAGCM_OVERLAY_ICONS_SIZE;

                    attachMAGCMPixiTooltip(sprite, weaponTooltipHTML);
                    overlayContainer.addChild(sprite);
                    weaponIndex++;
                }
            });
        });
    });
});

// --- Impaled Location Icons ---
Hooks.once("ready", () => {
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
        const getTooltipHtml = () => buildMAGCMRecordsGridTooltipHtml(actor, impaledLocations, {
            title: "Impaled Locations",
            accentColor: { bg: "rgba(255,80,80,0.12)", border: "#ff8888", text: "#ff8888" },
            renderRecords
        });

        foundry.canvas.loadTexture(`${MAGCM_ICONS_PATH}conditions/impaled.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;
            sprite.x = (token.w - sprite.width) / 4;
            sprite.y = token.h - sprite.height;
            attachMAGCMPixiTooltip(sprite, getTooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });

    const buildWoundTooltipHTML = (actor, woundEntries) => {
        const isHumanoid = isMAGCMActorHumanoid(actor);
        const hitLocations = actor.items.filter(i => i.type === "hitLocation");
        const woundableByName = new Map(
            hitLocations
                .filter(loc => Number(getMAGCMHitLocationMaxHp(loc)) > 0)
                .map(loc => [loc.name, loc])
        );
        const woundById = new Map(woundEntries.map(entry => [entry.location.id, entry]));

        let bodyContent = "";
        if (isHumanoid) {
            const gridCells = Object.entries(MAGCM_HUMANOID_SLOTS).map(([locName, slot]) => {
                const loc = woundableByName.get(locName);
                if (!loc) return `<div style="grid-area: ${slot.area};"></div>`;

                const wound = woundById.get(loc.id);
                if (!wound) {
                    return `
                        <div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center; border: 1px dashed rgba(255,255,255,0.15); border-radius: 4px; padding: 2px; opacity: 0.35;">
                            <span style="font-size: 8px; color: #aaa;">${slot.label}</span>
                        </div>`;
                }

                const iconPath = getMAGCMWoundLocationIconPath(wound.severity, locName, true);
                const style = MAGCM_WOUND_STYLE[wound.severity.key] || MAGCM_WOUND_STYLE["major-wound"];
                return `
                    <div style="grid-area: ${slot.area}; display: flex; flex-direction: column; align-items: center; justify-content: center; background: ${hexToMAGCMRgba(style.hex, 0.18)}; border: 1px solid ${style.border}; border-radius: 4px; padding: 3px 2px; text-align: center;">
                        <img src="${iconPath}" style="width: 20px; height: 20px; border: none; object-fit: contain; filter: drop-shadow(0 1px 2px rgba(0,0,0,0.8));" />
                        <span style="font-size: 8px; line-height: 1.1; margin-top: 2px; font-weight: bold; color: ${style.text};">${locName}</span>
                        <span style="font-size: 8px; color: ${style.text};">${wound.severity.label}</span>
                        <span ${(actor.isOwner || game.settings.get(MAGCM_MODULE_ID, "enableShowExactHpValuesToPlayers")) ? "" : `class="magcm-gm-only"`} style="font-size: 8px; color: ${style.text}">${loc.system?.currentHp || 0} / ${getMAGCMHitLocationMaxHp(loc)} HP</span>
                    </div>`;
            }).join("");

            bodyContent += `
                <div style="display: grid; grid-template-columns: repeat(3, minmax(65px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px; margin-top: 4px;">
                    ${gridCells}
                </div>`;
        }

        const listEntries = isHumanoid
            ? woundEntries.filter(entry => !MAGCM_HUMANOID_SLOTS[entry.location.name])
            : [...woundEntries].sort((a, b) => {
                if (b.severity.rank !== a.severity.rank) return b.severity.rank - a.severity.rank;
                return String(a.location?.name || "").localeCompare(String(b.location?.name || ""));
            });
        if (listEntries.length > 0 || !isHumanoid) {
            const listItems = listEntries.map(entry => {
                const iconPath = getMAGCMWoundLocationIconPath(entry.severity, entry.location.name, false);
                const style = MAGCM_WOUND_STYLE[entry.severity.key] || MAGCM_WOUND_STYLE["major-wound"];
                return `
                    <div style="display: flex; align-items: center; gap: 6px; background: ${hexToMAGCMRgba(style.hex, 0.05)}; padding: 3px 6px; border-radius: 3px; border: 1px solid ${style.border};">
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
            const severity = getMAGCMWoundSeverityData(loc);
            if (severity) woundEntries.push({ location: loc, severity });
        }

        const woundKey = hitLocations.map(loc => {
            const maxHp = Number(getMAGCMHitLocationMaxHp(loc));
            const currentHp = Number(loc?.system?.currentHp ?? loc?.system?.hp?.value ?? 0);
            const severity = getMAGCMWoundSeverityData(loc)?.key || "healthy";
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

        foundry.canvas.loadTexture(iconPath).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;
            sprite.x = 0;
            sprite.y = (token.h - sprite.height) / 2;
            attachMAGCMPixiTooltip(sprite, () => tooltipHtml);
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
        const getTooltipHtml = () => buildMAGCMRecordsGridTooltipHtml(actor, entangledLocations, {
            title: "Entangled Locations",
            accentColor: { bg: "rgba(120,140,255,0.14)", border: "#8899ff", text: "#a3b3ff" },
            renderRecords
        });

        foundry.canvas.loadTexture(`${MAGCM_ICONS_PATH}conditions/entangled.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;
            sprite.x = (token.w - sprite.width) / 2;
            sprite.y = (token.h - sprite.height) / 2;
            attachMAGCMPixiTooltip(sprite, getTooltipHtml);
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
            return `${item.id}:${data.weaponId || ""}:${data.attackerActorId || ""}:${data.indefinite ? "indefinite" : data.turnsRemaining}`;
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
            const turnsLabel = data.indefinite ? "Indefinite" : (data.turnsRemaining === 1 ? "1 turn" : `${data.turnsRemaining} turns`);
            return `
                <div style="display:flex; align-items:center; gap:5px; margin-top:2px;">
                    <img src="${iconPath}" style="width:16px; height:16px; border:none; object-fit:contain;" />
                    <div style="font-size:10px;">
                        <strong>${turnsLabel}${data.indefinite ? "" : " remaining"}</strong><br>
                        <span style="color:#aaa;">${data.weaponName || "Unknown"} (${data.attackerName || "Unknown"})</span>
                    </div>
                </div>`;
        };
        const getTooltipHtml = () => buildMAGCMRecordsGridTooltipHtml(actor, stunnedLocations, {
            title: "Stunned Locations",
            accentColor: { bg: "rgba(255,220,80,0.14)", border: "#e0c04a", text: "#ffe38a" },
            renderRecords
        });

        foundry.canvas.loadTexture(`${MAGCM_ICONS_PATH}conditions/stun/stun.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;
            sprite.x = (token.w - sprite.width) / 2;
            sprite.y = MAGCM_OVERLAY_ICONS_SIZE;
            attachMAGCMPixiTooltip(sprite, getTooltipHtml);
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

        foundry.canvas.loadTexture(`${MAGCM_ICONS_PATH}conditions/fatigue/fatigue_${fatigueValue}.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;
            sprite.x = token.w - (sprite.width * 2);
            sprite.y = 0;
            attachMAGCMPixiTooltip(sprite, () => tooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });
});

// --- Warded Location Icons ---
Hooks.once("ready", () => {
    // Helper: Build HTML for Warded Locations Tooltip (Paperdoll Layout)
    const buildWardTooltipHTML = (actor, blockedLocations) => {
        return buildMAGCMIconGridTooltipHtml(actor, blockedLocations, {
            title: "Warded Locations",
            titleColor: "#ffdd80",
            getLocationName: loc => loc.name,
            getCellData: loc => {
                const weapon = actor.items.get(loc.getFlag(MAGCM_MODULE_ID, "blockingWeapon"));
                return {
                    bg: "rgba(75, 140, 255, 0.12)",
                    border: "#4a90e2",
                    textColor: "#e0f0ff",
                    iconSrc: weapon?.img || `${MAGCM_ICONS_PATH}overlays/warded.svg`,
                    lines: [weapon?.name || "Warded"]
                };
            }
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


        const shieldImg = `${MAGCM_ICONS_PATH}overlays/warded.svg`;
        const wardTooltipHTML = buildWardTooltipHTML(actor, blockedLocations);

        foundry.canvas.loadTexture(shieldImg).then(texture => {
            if (!overlayContainer.destroyed) {
                const shieldSprite = new PIXI.Sprite(texture);
                shieldSprite.width = MAGCM_OVERLAY_ICONS_SIZE;
                shieldSprite.height = MAGCM_OVERLAY_ICONS_SIZE;
                shieldSprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;

                shieldSprite.x = 0;
                shieldSprite.y = token.h - MAGCM_OVERLAY_ICONS_SIZE;

                attachMAGCMPixiTooltip(shieldSprite, wardTooltipHTML);

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
        "Overextend Opponent": "Overextended - cannot attack",
        "Reeling from Serious Wound": "Reeling from Serious Wound - cannot attack"
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

    const attachTooltip = attachMAGCMPixiTooltip;

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

        foundry.canvas.loadTexture(`${MAGCM_ICONS_PATH}conditions/cannot-attack.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;
            sprite.x = 0;
            sprite.y = 0;
            attachTooltip(sprite, tooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });
});

// --- Grip Icons (character-wide, one or more simultaneous grippers - cleared via the Break Free macro) ---
Hooks.once("ready", () => {
    const buildGripTooltipHTML = (gripRecords) => {
        const listItems = gripRecords.map(g => `
            <div style="display: flex; align-items: center; gap: 8px; background: rgba(255,255,255,0.05); padding: 4px 6px; border-radius: 4px; border: 1px solid #444;">
                <span style="font-size: 11px; font-weight: 600; color: #f0f0f0; flex-grow: 1;">${g.attackerName || "Unknown"}</span>
                <span style="font-size: 9px; color: #aaa;">${g.weaponName || "Unarmed"}</span>
            </div>`).join("");
        return `
            <div style="display: flex; flex-direction: column; gap: 4px; min-width: 190px; max-width: 250px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #ffb37a;">
                    Gripped By
                </div>
                <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 2px;">
                    ${listItems}
                </div>
            </div>`;
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const gripRecords = Array.isArray(actor.getFlag(MAGCM_MODULE_ID, "grippedBy")) ? actor.getFlag(MAGCM_MODULE_ID, "grippedBy") : [];
        const currentKey = gripRecords.map(g => `${g.gripId}:${g.attackerActorId}:${g.weaponId}`).sort().join("|");

        if (gripRecords.length === 0) {
            if (token.grippedOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.grippedOverlayContainer);
                token.grippedOverlayContainer.destroy({ children: true });
                token.grippedOverlayContainer = null;
                token._grippedKey = null;
            }
            return;
        }

        if (token.grippedOverlayContainer && token._grippedKey === currentKey) return;
        if (token.grippedOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.grippedOverlayContainer);
            token.grippedOverlayContainer.destroy({ children: true });
        }

        token._grippedKey = currentKey;
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.grippedOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        const tooltipHtml = buildGripTooltipHTML(gripRecords);

        foundry.canvas.loadTexture(`${MAGCM_ICONS_PATH}conditions/gripped.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;
            // Right-center edge - mirrors the Wound icon's left-center placement and is otherwise unused,
            // keeping clear of the top-left corner reserved for FVTT's own Active Effect icons.
            sprite.x = token.w - sprite.width;
            sprite.y = (token.h - sprite.height) / 2;
            attachMAGCMPixiTooltip(sprite, () => tooltipHtml);
            overlayContainer.addChild(sprite);
        });
    });
});

// --- Bleeding Icon (replaces the old ActiveEffect-based "Bleeding" status) ---
Hooks.once("ready", () => {
    const buildBleedingTooltipHTML = (data) => {
        const combat = game.combat;
        let roundsHtml = "";
        if (combat && Number.isFinite(data.startRound)) {
            const rounds = Math.max(1, combat.round - data.startRound + 1);
            roundsHtml = `<span style="font-size: 10px; font-weight: bold; color: #ffdddd;">${rounds === 1 ? "1 round" : `${rounds} rounds`}</span><br/>`;
        }
        return `
            <div style="display: flex; flex-direction: column; gap: 2px; min-width: 170px; padding: 2px;">
                <div style="font-size: 11px; font-weight: bold; text-align: center; border-bottom: 1px solid #555; padding-bottom: 3px; color: #ff6b6b;">
                    🩸 Bleeding
                </div>
                <div style="text-align: center; margin-top: 4px;">
                    ${roundsHtml}
                    <span style="font-size: 9px; color: #aaa;">${data.weaponName || "Unknown"} (${data.attackerName || "Unknown"})</span>
                </div>
            </div>`;
    };

    Hooks.on("refreshToken", (token) => {
        const actor = token.actor;
        if (!actor) return;

        const data = actor.getFlag(MAGCM_MODULE_ID, "bleedingBy");
        const currentKey = data ? `${data.attackerActorId}:${data.weaponId}:${data.startRound}` : null;

        if (!data) {
            if (token.bleedingOverlayContainer) {
                game.tooltip.deactivate();
                token.removeChild(token.bleedingOverlayContainer);
                token.bleedingOverlayContainer.destroy({ children: true });
                token.bleedingOverlayContainer = null;
                token._bleedingKey = null;
            }
            return;
        }

        if (token.bleedingOverlayContainer && token._bleedingKey === currentKey) return;
        if (token.bleedingOverlayContainer) {
            game.tooltip.deactivate();
            token.removeChild(token.bleedingOverlayContainer);
            token.bleedingOverlayContainer.destroy({ children: true });
        }

        token._bleedingKey = currentKey;
        const overlayContainer = new PIXI.Container();
        overlayContainer.eventMode = "passive";
        token.bleedingOverlayContainer = overlayContainer;
        token.addChild(overlayContainer);

        foundry.canvas.loadTexture(`${MAGCM_ICONS_PATH}conditions/bleeding.svg`).then(texture => {
            if (overlayContainer.destroyed) return;
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;
            // Top-center edge - free of the top-left (Cannot Attack), top-right (Armour), and next-to-top-right
            // (Fatigue) icons, and stacks cleanly above the Stun Location icon just below it.
            sprite.x = ((token.w - sprite.width) / 2) - sprite.width;
            sprite.y = 0;
            attachMAGCMPixiTooltip(sprite, () => buildBleedingTooltipHTML(data));
            overlayContainer.addChild(sprite);
        });
    });
});

Hooks.once("ready", () => {
    if (!game.settings.get(MAGCM_MODULE_ID, "enableArmourOverlayIcons")) return;

    // Helper to generate pre-cached HTML for the paperdoll / rich tooltip
    const buildArmourTooltipHTML = (equippedArmour, actor) => {
        return buildMAGCMIconGridTooltipHtml(actor, equippedArmour, {
            title: "Equipped Armour",
            titleColor: "#ffdd80",
            otherLabel: "Other Equipment",
            getLocationName: a => a.locationName,
            getCellData: a => {
                const badge = getMAGCMConditionBadge(a.item, a.item.system?.ap, "originalAp", "AP");
                const badgeHtml = badge ? ` <i class="fas ${badge.icon}" style="color: ${badge.color};" title="${badge.text}"></i>` : "";
                const style = getMAGCMBadgeCellStyle(badge);
                return { bg: style.bg, border: style.border, glowColor: style.glowColor, textColor: "#f0f0f0", iconSrc: a.item.img, lines: [`${a.item.name}${badgeHtml}`] };
            }
        });
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



        // 7b. Render Armour Icon (Top-Right Corner)
        const armourImg = `${MAGCM_ICONS_PATH}overlays/armour.png`;

        foundry.canvas.loadTexture(armourImg).then(texture => {
            if (!overlayContainer.destroyed) {
                const sprite = new PIXI.Sprite(texture);
                sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
                sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
                sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;

                // Position at top-right corner of the token
                sprite.x = token.w - MAGCM_OVERLAY_ICONS_SIZE;
                sprite.y = 0;

                attachMAGCMPixiTooltip(sprite, () => token._armourTooltipHTML);
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



    const meleeImg = typeof MAGCM_ICONS_PATH !== "undefined" ? `${MAGCM_ICONS_PATH}overlays/melee.svg` : "icons/svg/sword.svg";

    foundry.canvas.loadTexture(meleeImg).then(texture => {
        if (!overlayContainer.destroyed) {
            const sprite = new PIXI.Sprite(texture);
            sprite.width = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.height = MAGCM_OVERLAY_ICONS_SIZE;
            sprite.alpha = MAGCM_OVERLAY_ICONS_ALPHA;

            // Position at top-middle edge of the token
            sprite.x = (token.w - MAGCM_OVERLAY_ICONS_SIZE) / 2;
            sprite.y = 0;

            attachMAGCMPixiTooltip(sprite, () => token._meleeTooltipHTML);
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

        if (data.action === "updateGripState") {
            const targetActor = game.actors.get(data.targetActorId);
            if (!targetActor || !data.gripData) return;
            const existing = Array.isArray(targetActor.getFlag(MAGCM_MODULE_ID, "grippedBy")) ? targetActor.getFlag(MAGCM_MODULE_ID, "grippedBy") : [];
            const updated = [...existing.filter(g => g.attackerActorId !== data.gripData.attackerActorId), data.gripData];
            await targetActor.setFlag(MAGCM_MODULE_ID, "grippedBy", updated);
            canvas.tokens.placeables.filter(token => token.actor?.id === targetActor.id).forEach(token => token.refresh());
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

        if (data.action === "applyIndefiniteStunLocation") {
            const targetActor = game.actors.get(data.actorId);
            const location = targetActor?.items.get(data.locationId);
            if (!location) return;
            if (data.stunData === null) await location.unsetFlag(MAGCM_MODULE_ID, "stunnedBy");
            else await location.setFlag(MAGCM_MODULE_ID, "stunnedBy", data.stunData);
            canvas.tokens.placeables.filter(t => t.actor?.id === targetActor.id).forEach(t => t.refresh());
            return;
        }

        if (data.action === "updateAttackDamageMode") {
            const attackMessage = game.messages.get(data.messageId);
            if (!attackMessage) return;
            const wrapper = document.createElement("div");
            wrapper.innerHTML = attackMessage.content;
            wrapper.querySelectorAll(".attack-damage-mode-radio").forEach(radio => {
                if (radio.value === data.damageMode) radio.setAttribute("checked", "");
                else radio.removeAttribute("checked");
            });
            await attackMessage.update({
                content: wrapper.innerHTML,
                [`flags.${MAGCM_MODULE_ID}.attack-damage-mode`]: data.damageMode
            });
            return;
        }

        if (data.action === "markAttackDefenseResolved") {
            const attackMessage = game.messages.get(data.messageId);
            if (!attackMessage) return;
            await attackMessage.update({
                content: attackMessage.content,
                [`flags.${MAGCM_MODULE_ID}.attack-defense-resolved`]: true,
                [`flags.${MAGCM_MODULE_ID}.attack-defense-type`]: data.defenseType,
                [`flags.${MAGCM_MODULE_ID}.attack-defense-message-id`]: data.defenseMessageId ?? null
            });
            return;
        }

        if (data.action === "magcmRecomputeDifficulty") {
            await magcmApplyDifficultyChange(data.messageId, data.newDiffIndex ?? null);
            return;
        }

        if (data.action === "magcmApplyRetroactiveOver100") {
            await magcmApplyRetroactiveOver100ToAttack(data.messageId, data.excess, data.sourceLabel);
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

// Weapon Grip (melee/ranged weapon item sheets): One-Handed/Versatile/Two-Handed/Natural Weapon. Kept as
// its own ungated hook (separate from the Fitting/Quality/Original Condition hook below) so it isn't
// hidden behind those unrelated settings, and registered first so it renders above that section on the
// sheet. Selecting "Natural Weapon" (claws, bite, horns, etc.) reveals a picker attaching the weapon to
// one or more of the actor's hit locations, using a fancier chip-toggle grid in place of a native
// multi-select - a Natural Weapon never needs to be equipped via magcmEquipWeapon to attack or parry with
// (see the weaponArray filters in the Attack/Parry dialogs above), since its Grip Requirement is
// irrelevant once it's not held in the normal sense.
Hooks.on("renderItemSheet", (app, html, data) => {
    const item = app.item;
    if (!item || (item.type !== "melee-weapon" && item.type !== "ranged-weapon")) return;

    const el = html instanceof jQuery ? html : $(html);
    const selectedGripRequirement = item.getFlag(MAGCM_MODULE_ID, "gripRequirement") ?? "1h";

    let extraFieldsHtml = "";
    if (selectedGripRequirement === "vh") {
        const selectedTwoHandedSize = item.getFlag(MAGCM_MODULE_ID, "twoHandedSize") || item.system?.size || "M";
        extraFieldsHtml = `
                        <div class="weapon-piece">
                            <h3 class="core-info">Two-handed Damage</h3>
                            <input type="text" name="flags.${MAGCM_MODULE_ID}.twoHandedDamage" value="${item.getFlag(MAGCM_MODULE_ID, "twoHandedDamage") || item.system?.damage || ""}" placeholder="e.g. 1d6+2" />
                        </div>
                        <div class="weapon-piece">
                            <h3 class="core-info">Two-handed Size</h3>
                            <select name="flags.${MAGCM_MODULE_ID}.twoHandedSize">
                                ${Object.entries(MAGCM_WEAPON_SIZES).map(([sizeCode, size]) => `<option value="${sizeCode}" ${selectedTwoHandedSize === sizeCode ? "selected" : ""}>${size.label}</option>`).join("")}
                            </select>
                        </div>`;
    } else if (selectedGripRequirement === "nat") {
        const selectedLocations = item.getFlag(MAGCM_MODULE_ID, "naturalWeaponLocations") || {};
        const hitLocations = item.actor ? item.actor.items.filter(i => i.type === "hitLocation") : [];
        const renderLocationChip = (loc) => `
                        <label class="magcm-location-chip">
                            <input type="checkbox" name="flags.${MAGCM_MODULE_ID}.naturalWeaponLocations.${loc.id}" ${selectedLocations[loc.id] ? "checked" : ""} />
                            <span>${loc.name}</span>
                        </label>`;

        let chipsHtml;
        if (hitLocations.length === 0) {
            chipsHtml = `<p style="font-size: 0.85em; font-style: italic; color: #999; margin: 4px 0 0 0;">Add this weapon to a character first, then choose which hit locations it's attached to.</p>`;
        } else if (isMAGCMActorHumanoid(item.actor)) {
            // Same paperdoll layout used by the token overlay tooltips, but with the grid rows compressed
            // to roughly the chip's own height (no icon/text lines to accommodate here) rather than the
            // taller cells those tooltips use.
            const locationsByName = new Map(hitLocations.map(loc => [loc.name, loc]));
            const otherLocations = hitLocations.filter(loc => !MAGCM_HUMANOID_SLOTS[loc.name]);
            const gridCells = Object.entries(MAGCM_HUMANOID_SLOTS).map(([locName, slot]) => {
                const loc = locationsByName.get(locName);
                return `<div style="grid-area: ${slot.area}; display: flex; align-items: center; justify-content: center;">${loc ? renderLocationChip(loc) : ""}</div>`;
            }).join("");
            const otherHtml = otherLocations.length > 0
                ? `<div class="magcm-natural-weapon-locations" style="margin-top: 6px;">${otherLocations.map(renderLocationChip).join("")}</div>`
                : "";
            chipsHtml = `
                    <div style="display: grid; grid-template-columns: repeat(3, minmax(70px, 1fr)); grid-template-areas: '. head .' 'rarm chest larm' '. abdo .' 'rleg . lleg'; gap: 4px; align-items: center; justify-items: center; margin-top: 4px;">
                        ${gridCells}
                    </div>
                    ${otherHtml}`;
        } else {
            chipsHtml = `<div class="magcm-natural-weapon-locations">${hitLocations.map(renderLocationChip).join("")}</div>`;
        }
        extraFieldsHtml = `
                        <div class="weapon-piece" style="flex-basis: 100%;">
                            <h3 class="core-info">Attached Hit Locations</h3>
                            ${chipsHtml}
                        </div>`;
    }

    const htmlContent = `
        <div class="equip-section weapon-grip-module-section">
            <div class="weapon-core">   
                <fieldset style="border: 1px solid var(--color-border-light-2, #ccc); padding: 8px; margin-top: 6px;">
                    <legend style="font-weight: bold; padding: 0 4px;">Weapon Grip</legend>
                    <div class="weapon-core-section" style="display: flex; flex-wrap: wrap; gap: 8px;">
                        <div class="weapon-piece">
                            <h3 class="core-info">Grip Requirement</h3>
                            <select name="flags.${MAGCM_MODULE_ID}.gripRequirement">
                                <option value="1h" ${selectedGripRequirement === "1h" ? "selected" : ""}>${MAGCM_WEAPON_GRIP_REQUIREMENTS["1h"].label}</option>
                                <option value="vh" ${selectedGripRequirement === "vh" ? "selected" : ""}>${MAGCM_WEAPON_GRIP_REQUIREMENTS["vh"].label}</option>
                                <option value="2h" ${selectedGripRequirement === "2h" ? "selected" : ""}>${MAGCM_WEAPON_GRIP_REQUIREMENTS["2h"].label}</option>
                                <option value="nat" ${selectedGripRequirement === "nat" ? "selected" : ""}>${MAGCM_WEAPON_GRIP_REQUIREMENTS["nat"].label}</option>
                            </select>
                        </div>
                        ${extraFieldsHtml}
                    </div>
                </fieldset>
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

Hooks.on("renderItemSheet", (app, html, data) => {
    const fittingEnabled = game.settings.get(MAGCM_MODULE_ID, "enableFittingTracking");
    const qualityEnabled = game.settings.get(MAGCM_MODULE_ID, "enableQualityTracking");
    const originalConditionEnabled = game.settings.get(MAGCM_MODULE_ID, "enableOriginalConditionTracking");
    if (!fittingEnabled && !qualityEnabled && !originalConditionEnabled) return;

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

    // Awful and Exemplary aren't standard Mythras quality tiers, so they stay behind the homebrew content setting.
    let qualities = [];
    if (game.settings.get(MAGCM_MODULE_ID, "enableHomebrewRulesAndContent")) qualities.push("Awful");
    qualities.push("Cheap", "Reasonable", "Superior");
    if (game.settings.get(MAGCM_MODULE_ID, "enableHomebrewRulesAndContent")) qualities.push("Exemplary");
    const frames = ["N/A", "Lithe", "Medium", "Heavy"];

    const el = html instanceof jQuery ? html : $(html);

    // 1. Inject Quality directly into the native equipment-core next to system.value
    if (qualityEnabled && hasValuesAndQualities) {
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

    let htmlContent = "";

    // 2. Build the lower custom section for Fitting, Body Part, and Original stats
    const hasOriginalSection = originalConditionEnabled && (hasOriginalAp || hasOriginalHp);
    const hasFittingSection = fittingEnabled && (isWearable || isArmor);
    if (hasOriginalSection || hasFittingSection) {    
        htmlContent += `
        <div class="equip-section custom-module-section">
            <div class="weapon-core">
                <h3 class="core-info" style="margin-bottom: 6px; border-bottom: 1px solid var(--color-border-light-2, #ccc); padding-bottom: 4px;">Item Statistics</h3>
        `;

        if (hasOriginalSection) {
            htmlContent += `
                <fieldset style="border: 1px solid var(--color-border-light-2, #ccc); padding: 8px; margin-top: 6px;">
                    <legend style="font-weight: bold; padding: 0 4px;">Original Condition</legend>
                    <div class="weapon-core-section" style="display: flex; flex-wrap: wrap; gap: 8px;">
            `;

            if (qualityEnabled && hasValuesAndQualities) {
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

        if (hasFittingSection) {
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

    }

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
                        content: `
                            <div class="magcm-chat-card">
                            <div class="magcm-chat-card-title"><i class="fas fa-coins"></i> Currency Transaction</div>
                            <div class="magcm-chat-card-header">
                                ${buildMAGCMStatsRowHtml([{ label: "Character", value: token.actor.name }])}
                                ${message}
                            </div>
                            </div>
                        `
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
                            const contentString = `
                                <div class="magcm-chat-card">
                                <div class="magcm-chat-card-title"><i class="fas fa-arrow-trend-up"></i> Skill Upgrade</div>
                                <div class="magcm-chat-card-header">
                                    ${buildMAGCMStatsRowHtml([{ label: "Skill", value: selectedSkillName }, { label: "Change", value: `${customChangeValue >= 0 ? "+" : ""}${customChangeValue}` }])}
                                    ${reason ? `<div class="magcm-chat-card-notice"><i class="fas fa-comment"></i> ${reason}</div>` : ""}
                                    <div class="magcm-info-row" style="border-bottom: none;">
                                        <div class="magcm-info-row__label">New Value:</div>
                                        <span class="magcm-info-pill magcm-info-pill--good">${selectedSkillValue}% &rarr; ${selectedSkillValue + customChangeValue}%</span>
                                    </div>
                                </div>
                                </div>
                            `;
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
                                content: `
                                    <div class="magcm-chat-card">
                                    <div class="magcm-chat-card-title"><i class="fas fa-arrow-trend-up"></i> Skill Upgrade</div>
                                    <div class="magcm-chat-card-header">
                                        ${buildMAGCMStatsRowHtml([{ label: "Skill", value: selectedSkillName }])}
                                        <div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-triangle-exclamation"></i> Failed to upgrade due to lack of Experience Rolls.</div>
                                    </div>
                                    </div>
                                `
                            });
                        }
                        else {

                            let skillUpgradeSuccessDiceRoll = new Roll(`1d100 + @INT`, { INT: intelligence });
                            await skillUpgradeSuccessDiceRoll.evaluate();
                            const upgradeSuccess = skillUpgradeSuccessDiceRoll.total >= selectedSkillValue;

                            let skillUpgradeValueDiceRoll = new Roll(`1d4+1`);
                            await skillUpgradeValueDiceRoll.evaluate();
                            let upgradeNoticeHtml;
                            if (!upgradeSuccess) {
                                upgradeNoticeHtml = `<div class="magcm-chat-card-notice"><i class="fas fa-arrow-trend-up"></i> Skill upgrade failed. EXP rolls left: ${expRolls - 1}</div>`;
                                selectedSkill.update({ 'system.trainingVal': Number(selectedSkill.system.trainingVal) + 1 });
                            } else {
                                upgradeNoticeHtml = `<div class="magcm-chat-card-notice magcm-chat-card-notice--info"><i class="fas fa-arrow-trend-up"></i> Skill upgrade succeeded. EXP rolls left: ${expRolls - 1}</div>`;
                                selectedSkill.update({ 'system.trainingVal': Number(selectedSkill.system.trainingVal) + skillUpgradeValueDiceRoll.total });
                            }
                            const newSkillValue = upgradeSuccess ? selectedSkillValue + skillUpgradeValueDiceRoll.total : selectedSkillValue + 1;

                            token.actor.update({ 'system.trackedStats.experienceRolls.value': expRolls - 1 });

                            const contentString = `
                                <div class="magcm-chat-card">
                                <div class="magcm-chat-card-title"><i class="fas fa-arrow-trend-up"></i> Skill Upgrade Roll</div>
                                <div class="magcm-chat-card-header">
                                    ${buildMAGCMStatsRowHtml([{ label: "Skill", value: selectedSkillName }, { label: "Threshold", value: `${selectedSkillValue}%` }])}
                                    ${reason ? `<div class="magcm-chat-card-notice"><i class="fas fa-comment"></i> ${reason}</div>` : ""}
                                    <div class="magcm-chat-card-roll">
                                        <div class="magcm-chat-card-roll__label">Roll (d100+INT)</div>
                                        <span class="magcm-info-pill ${upgradeSuccess ? "magcm-info-pill--good" : "magcm-info-pill--bad"}">[[${skillUpgradeSuccessDiceRoll.result}]] ${upgradeSuccess ? "Success" : "Failure"}</span>
                                    </div>
                                    ${upgradeNoticeHtml}
                                    <div class="magcm-info-row" style="border-bottom: none;">
                                        <div class="magcm-info-row__label">New Value:</div>
                                        <span class="magcm-info-pill magcm-info-pill--good">${selectedSkillValue}% &rarr; ${newSkillValue}%</span>
                                    </div>
                                </div>
                                </div>
                            `;

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
    });

    d.render(true);
}
globalThis.magcmUpgradeSkill = magcmUpgradeSkill;


/**
 * Reduce AP macro: reduces the Action Points of the first selected token by one and posts it to the chat.
 */
async function magcmReduceActionPoints() {
    const speakerToken = canvas.tokens.controlled[0];

    if (!speakerToken) {
        ui.notifications.warn("Please select a token first.");
        return;
    }

    const actor = speakerToken.actor;
    if (!actor) {
        ui.notifications.warn("The selected token has no associated actor.");
        return;
    }

    // Read from trackedStats since that drives the sheet display
    let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
    if (currentAP === undefined) {
        currentAP = foundry.utils.getProperty(actor, "system.currentActionPoints") ?? 0;
    }
    currentAP = Number(currentAP);

    if (currentAP <= 0) {
        ui.notifications.info(`${speakerToken.name} has no Action Points left!`);
        return;
    }

    const newAP = currentAP - 1;

    // Update trackedStats (as a string to match the system schema), currentActionPoints, and attributes simultaneously
    await actor.update({
        "system.trackedStats.actionPoints.value": String(newAP),
        "system.currentActionPoints": newAP,
        "system.attributes.actionPoints.value": newAP
    });

    ChatMessage.create({
        user: game.user.id,
        speaker: ChatMessage.getSpeaker({ token: speakerToken }),
        content: `
            <div class="magcm-chat-card">
            <div class="magcm-chat-card-title"><i class="fas fa-hand-fist"></i> Action Point Spent</div>
            <div class="magcm-chat-card-header">
                ${buildMAGCMStatsRowHtml([{ label: "Character", value: speakerToken.name }, { label: "AP Remaining", value: newAP }])}
            </div>
            </div>
        `
    });
}
globalThis.magcmReduceActionPoints = magcmReduceActionPoints;

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
                icon: getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/pin-weapon.svg`),
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
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
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
 * effects (plus the homebrew "Reeling from Serious Wound" option, for the rulebook's own Serious Wound
 * stun-from-pain effect - see the Serious/Major Wound automation hook), which all prevent the targeted
 * character from attacking for a number of their own turns.
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
        "Overextend Opponent": (attacker, target) => `${attacker} causes ${target} to overextend, leaving them unable to attack.`,
        "Reeling from Serious Wound": (attacker, target) => `${target} reels from the pain of a serious wound, too stunned and distracted to attack.`
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
                        <option value="Reeling from Serious Wound">Reeling from Serious Wound</option>
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
                icon: getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/cannot-attack.svg`),
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

                    const sourceNameHtml = getMAGCMCombatantNameHtml(sourceActor.name, getMAGCMCombatantColor(sourceActor, controlledToken), sourceActor.id, controlledToken.id, targetToken.id);
                    const targetNameHtml = getMAGCMCombatantNameHtml(targetActor.name, getMAGCMCombatantColor(targetActor, targetToken), targetActor.id, targetToken.id, controlledToken.id);

                    await ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: controlledToken.document }),
                        content: `
                            <div class="magcm-chat-card">
                            <div class="magcm-chat-card-title magcm-chat-card-title--condition"><i class="fas fa-ban"></i> ${effectType}</div>
                            <div class="magcm-chat-card-header">
                                ${buildMAGCMCombatantsRowHtml(sourceNameHtml, "Source", targetNameHtml, "Target")}
                                ${buildMAGCMStatsRowHtml([{ label: "Duration", value: turnsLabel }])}
                                <p style="margin: 4px 0 0 0; font-size: 0.9em;">${description}</p>
                                <div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-ban"></i> Cannot attack for their next ${turnsLabel}.</div>
                            </div>
                            </div>
                        `
                    });
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
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
                    const statusNoticeHtml = isFullyLoaded
                        ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--info"><i class="fas fa-check"></i> ${weapon.name} is now fully reloaded and ready to fire!</div>`
                        : "";

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ actor: actor }),
                        content: `
                            <div class="magcm-chat-card">
                            <div class="magcm-chat-card-title magcm-chat-card-title--weapon"><i class="fas fa-arrows-rotate"></i> Weapon Reloaded</div>
                            <div class="magcm-chat-card-header">
                                ${buildMAGCMStatsRowHtml([{ label: "Weapon", value: weapon.name }, { label: "Actions Spent", value: actionsSpent }])}
                                <div class="magcm-info-row" style="border-bottom: none;">
                                    <div class="magcm-info-row__label">Load Progress:</div>
                                    <span class="magcm-info-pill ${isFullyLoaded ? "magcm-info-pill--good" : "magcm-info-pill--neutral"}">${newLoad}/${requiredLoad}</span>
                                </div>
                                ${statusNoticeHtml}
                            </div>
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
                            <div class="magcm-chat-card">
                            <div class="magcm-chat-card-title magcm-chat-card-title--weapon"><i class="fas fa-arrows-rotate"></i> Weapon Unloaded</div>
                            <div class="magcm-chat-card-header">
                                ${buildMAGCMStatsRowHtml([{ label: "Weapon", value: weapon.name }])}
                            </div>
                            </div>`
                    });
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
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
                        <div class="magcm-chat-card">
                        <div class="magcm-chat-card-title magcm-chat-card-title--weapon"><i class="fas fa-hammer"></i> Damage Weapon</div>
                        <div class="magcm-chat-card-header">
                            ${buildMAGCMStatsRowHtml([{ label: "Target", value: `${targetActor.name}'s ${weapon.name}` }, { label: "Weapon AP", value: ap }, { label: "Damage Rolled", value: damage }, { label: "After AP", value: mitigatedDamage }])}
                            <div class="magcm-info-row" style="border-bottom: none;">
                                <div class="magcm-info-row__label">Weapon HP:</div>
                                <span class="magcm-info-pill ${broken ? "magcm-info-pill--bad" : "magcm-info-pill--neutral"}">${currentHp} &rarr; ${newHp}</span>
                            </div>
                            ${broken ? `<div class="magcm-chat-card-notice"><i class="fas fa-triangle-exclamation"></i> ${weapon.name} has broken!</div>` : ""}
                        </div>
                        </div>
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
    // Natural Weapons never need equipping (they work regardless of holdingLocations), so they're excluded
    // from this per-hit-location weapon picker entirely.
    const weapons = actor.items.filter(i => (i.type === "melee-weapon" || i.type === "ranged-weapon") && !isMAGCMNaturalWeapon(i));

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

    if (!game.settings.get(MAGCM_MODULE_ID, "enableReachMechanics")) {
        return ui.notifications.warn("This macro is unusable when Reach Mechanics are disabled in the module settings.");
    }

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

    const gripRecords = Array.isArray(sourceToken.actor.getFlag(MAGCM_MODULE_ID, "grippedBy")) ? sourceToken.actor.getFlag(MAGCM_MODULE_ID, "grippedBy") : [];
    if (gripRecords.length > 0) {
        return ui.notifications.warn(`${sourceToken.name} cannot set melee engagement range while gripped.`);
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
                            <div class="magcm-chat-card">
                            <div class="magcm-chat-card-title"><i class="fas fa-arrows-left-right"></i> Engagement Range Update</div>
                            <div class="magcm-chat-card-header">
                                <ul style="margin: 0; padding-left: 15px; font-size: 0.9em;">
                                    ${chatLogLines.join("")}
                                </ul>
                            </div>
                            </div>
                        `;
                        await ChatMessage.create({
                            user: game.user.id,
                            speaker: ChatMessage.getSpeaker({ token: sourceToken.document }),
                            content: content
                        });
                    }

                    canvas.tokens.placeables.forEach(t => t.refresh());
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
                icon: '<i class="fas fa-shield"></i>',
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
 * Break Free macro: lets the selected token's owner release the actor from currently active Grip
 * and/or Entangled statuses (Grip: see the Attack card's always-available Grip toggle; Entangled: see
 * the Entangle special effect). Only the status(es) actually present are shown - if both are present
 * they appear as separate tabs, defaulting to the Entangled tab. Each gripper/location defaults to
 * selected, and can be individually deselected before confirming.
 */
async function magcmBreakFree() {
    const token = canvas.tokens.controlled[0];
    if (!token) {
        return ui.notifications.warn("Please select a token first.");
    }

    const actor = token.actor;
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
        return ui.notifications.error("You do not have permission to configure this actor.");
    }

    const gripRecords = Array.isArray(actor.getFlag(MAGCM_MODULE_ID, "grippedBy")) ? actor.getFlag(MAGCM_MODULE_ID, "grippedBy") : [];
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");
    const entangledLocations = hitLocations.filter(loc => loc.getFlag(MAGCM_MODULE_ID, "entangledBy"));

    const hasGrip = gripRecords.length > 0;
    const hasEntangled = entangledLocations.length > 0;
    if (!hasGrip && !hasEntangled) {
        return ui.notifications.info(`${actor.name} is neither gripped nor entangled.`);
    }

    // -- Grip section --
    const gripChecklistHtml = gripRecords.map(g => `
        <div class="form-group" style="display: flex; align-items: center; margin-bottom: 6px;">
            <label style="flex: 1; display: flex; align-items: center; gap: 6px; cursor: pointer;">
                <input type="checkbox" class="break-free-checkbox" data-grip-id="${g.gripId}" checked style="width: 16px; height: 16px; cursor: pointer;" />
                <span>${g.attackerName || "Unknown"}${g.weaponName ? ` (${g.weaponName})` : ""}</span>
            </label>
        </div>`).join("");
    const gripSectionHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.06); padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #ccc;">
            <label style="font-weight: bold; font-size: 12px; color: #222; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%;">
                <input type="checkbox" id="toggle-all-break-free-grip" checked style="width: 16px; height: 16px; cursor: pointer;" />
                <span>Break Free From All Grips</span>
            </label>
        </div>
        ${gripChecklistHtml}`;

    // -- Entangled section (same humanoid-grid/list layout the standalone Unentangle macro used) --
    const renderEntangleCheckbox = (locItem) => {
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
    const isStandardHumanoid = Boolean(bodyPartMap.head && bodyPartMap.chest && bodyPartMap.abdomen &&
        bodyPartMap.rightArm && bodyPartMap.leftArm && bodyPartMap.rightLeg && bodyPartMap.leftLeg);

    let entangledSectionHtml = `
        <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.06); padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #ccc;">
            <label style="font-weight: bold; font-size: 12px; color: #222; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%;">
                <input type="checkbox" id="toggle-all-break-free-entangle" checked style="width: 16px; height: 16px; cursor: pointer;" />
                <span>Unentangle All Selected Locations</span>
            </label>
        </div>
    `;
    if (hasEntangled && isStandardHumanoid) {
        entangledSectionHtml += `
            <style>
                .break-free-body-grid { display: grid; grid-template-columns: 1fr 1.2fr 1fr; gap: 8px; align-items: center; background: rgba(0, 0, 0, 0.04); border: 1px solid #4a5fc1; border-radius: 6px; padding: 10px; }
                .break-free-body-cell { background: rgba(255, 255, 255, 0.85); border: 1px solid #b5b5b5; border-radius: 4px; padding: 5px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
                .break-free-body-cell label.loc-label { font-weight: bold; font-size: 11px; display: block; margin-bottom: 3px; color: #4a5fc1; }
                .bf-grid-head  { grid-column: 2; grid-row: 1; }
                .bf-grid-rarm  { grid-column: 1; grid-row: 2; }
                .bf-grid-chest { grid-column: 2; grid-row: 2; }
                .bf-grid-larm  { grid-column: 3; grid-row: 2; }
                .bf-grid-abdo  { grid-column: 2; grid-row: 3; }
                .bf-grid-rleg  { grid-column: 1; grid-row: 4; }
                .bf-grid-lleg  { grid-column: 3; grid-row: 4; }
            </style>
            <div class="break-free-body-grid">
                <div class="break-free-body-cell bf-grid-head"><label class="loc-label">${bodyPartMap.head.name}</label>${renderEntangleCheckbox(bodyPartMap.head)}</div>
                <div class="break-free-body-cell bf-grid-rarm"><label class="loc-label">${bodyPartMap.rightArm.name}</label>${renderEntangleCheckbox(bodyPartMap.rightArm)}</div>
                <div class="break-free-body-cell bf-grid-chest"><label class="loc-label">${bodyPartMap.chest.name}</label>${renderEntangleCheckbox(bodyPartMap.chest)}</div>
                <div class="break-free-body-cell bf-grid-larm"><label class="loc-label">${bodyPartMap.leftArm.name}</label>${renderEntangleCheckbox(bodyPartMap.leftArm)}</div>
                <div class="break-free-body-cell bf-grid-abdo"><label class="loc-label">${bodyPartMap.abdomen.name}</label>${renderEntangleCheckbox(bodyPartMap.abdomen)}</div>
                <div class="break-free-body-cell bf-grid-rleg"><label class="loc-label">${bodyPartMap.rightLeg.name}</label>${renderEntangleCheckbox(bodyPartMap.rightLeg)}</div>
                <div class="break-free-body-cell bf-grid-lleg"><label class="loc-label">${bodyPartMap.leftLeg.name}</label>${renderEntangleCheckbox(bodyPartMap.leftLeg)}</div>
            </div>`;
    } else if (hasEntangled) {
        entangledSectionHtml += `<div style="max-height: 400px; overflow-y: auto; padding-right: 4px;">`;
        entangledLocations.forEach(loc => {
            entangledSectionHtml += `
                <div class="form-group" style="display: flex; align-items: center; margin-bottom: 6px;">
                    <label style="flex: 1; font-weight: bold; font-size: 12px;">${loc.name}:</label>
                    <div style="flex: 1.5;">${renderEntangleCheckbox(loc)}</div>
                </div>`;
        });
        entangledSectionHtml += `</div>`;
    }

    // Both present: tabbed, defaulting to Entangled per spec. Only one present: show that section alone.
    const defaultTab = hasEntangled ? "entangled" : "grip";
    let dialogContent = `<form style="padding: 4px;">`;
    if (hasGrip && hasEntangled) {
        dialogContent += `
            <div style="display: flex; gap: 5px; margin-bottom: 10px; border-bottom: 2px solid var(--color-border-dark-tertiary);">
                <div class="break-free-tab-btn${defaultTab === "grip" ? " active" : ""}" data-tab="grip" style="padding: 6px 12px; cursor: pointer; font-weight: bold; border: 1px solid var(--color-border-dark-tertiary); border-bottom: none; border-radius: 5px 5px 0 0; background: ${defaultTab === "grip" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)"};">Grip</div>
                <div class="break-free-tab-btn${defaultTab === "entangled" ? " active" : ""}" data-tab="entangled" style="padding: 6px 12px; cursor: pointer; font-weight: bold; border: 1px solid var(--color-border-dark-tertiary); border-bottom: none; border-radius: 5px 5px 0 0; background: ${defaultTab === "entangled" ? "rgba(0,0,0,0.2)" : "rgba(0,0,0,0.05)"};">Entangled</div>
            </div>
            <div class="break-free-tab-content" data-tab-content="grip" style="display: ${defaultTab === "grip" ? "block" : "none"};">${gripSectionHtml}</div>
            <div class="break-free-tab-content" data-tab-content="entangled" style="display: ${defaultTab === "entangled" ? "block" : "none"};">${entangledSectionHtml}</div>
        `;
    } else if (hasGrip) {
        dialogContent += gripSectionHtml;
    } else {
        dialogContent += entangledSectionHtml;
    }
    dialogContent += `</form>`;

    const dialog = new Dialog({
        title: `Break Free: ${actor.name}`,
        content: dialogContent,
        buttons: {
            breakFree: {
                icon: '<i class="fas fa-hand-fist"></i>',
                label: "Break Free",
                callback: async (html) => {
                    const gripIdsToClear = html.find(".break-free-checkbox:checked").toArray().map(el => el.dataset.gripId);
                    const locIdsToClear = html.find(".unentangle-checkbox:checked").toArray().map(el => el.dataset.locId);
                    if (gripIdsToClear.length === 0 && locIdsToClear.length === 0) {
                        return ui.notifications.info("Nothing was selected to break free from.");
                    }

                    const clearedGripNames = [];
                    if (gripIdsToClear.length > 0) {
                        const currentGrips = Array.isArray(actor.getFlag(MAGCM_MODULE_ID, "grippedBy")) ? actor.getFlag(MAGCM_MODULE_ID, "grippedBy") : [];
                        clearedGripNames.push(...currentGrips.filter(g => gripIdsToClear.includes(g.gripId)).map(g => g.attackerName || "Unknown"));
                        const remainingGrips = currentGrips.filter(g => !gripIdsToClear.includes(g.gripId));
                        if (remainingGrips.length > 0) await actor.setFlag(MAGCM_MODULE_ID, "grippedBy", remainingGrips);
                        else await actor.unsetFlag(MAGCM_MODULE_ID, "grippedBy");
                    }

                    const clearedLocNames = [];
                    for (const locId of locIdsToClear) {
                        const locItem = actor.items.get(locId);
                        if (locItem?.getFlag(MAGCM_MODULE_ID, "entangledBy")) {
                            await locItem.unsetFlag(MAGCM_MODULE_ID, "entangledBy");
                            clearedLocNames.push(locItem.name);
                        }
                    }

                    canvas.tokens.placeables.forEach(t => t.refresh());

                    const summaryLines = [];
                    if (clearedGripNames.length > 0) summaryLines.push(`Grips: ${clearedGripNames.join(", ")}`);
                    if (clearedLocNames.length > 0) summaryLines.push(`Entangled: ${clearedLocNames.join(", ")}`);
                    const summaryText = summaryLines.join(" | ") || "nothing changed";

                    ui.notifications.info(`${actor.name} broke free - ${summaryText}.`);
                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: token.document }),
                        content: `<div class="magcm-chat-card"><div class="magcm-chat-card-title magcm-chat-card-title--condition">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/gripped.svg`)} Break Free</div><div class="magcm-chat-card-header"><div class="magcm-chat-card-notice magcm-chat-card-notice--info">${actor.name} breaks free - ${summaryText}.</div></div></div>`
                    });
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "breakFree"
    }, { width: hasEntangled && isStandardHumanoid ? 620 : 440, resizable: true });

    const hookId = Hooks.on("renderDialog", (app, html) => {
        if (app.title === `Break Free: ${actor.name}`) {
            html.find("#toggle-all-break-free-grip").on("change", (event) => {
                html.find(".break-free-checkbox").prop("checked", event.currentTarget.checked);
            });
            html.find("#toggle-all-break-free-entangle").on("change", (event) => {
                html.find(".unentangle-checkbox").prop("checked", event.currentTarget.checked);
            });
            html.find(".break-free-tab-btn").on("click", (event) => {
                const tab = event.currentTarget.dataset.tab;
                html.find(".break-free-tab-btn").removeClass("active").css("background", "rgba(0,0,0,0.05)");
                $(event.currentTarget).addClass("active").css("background", "rgba(0,0,0,0.2)");
                html.find(".break-free-tab-content").hide();
                html.find(`.break-free-tab-content[data-tab-content="${tab}"]`).show();
            });
            Hooks.off("renderDialog", hookId);
        }
    });

    dialog.render(true);
}
globalThis.magcmBreakFree = magcmBreakFree;

/**
 * Unentangle macro (legacy launcher, folded into Break Free): kept only so pre-existing world macros
 * still calling magcmUnentangle keep working - redirects straight to the unified Break Free dialog.
 */
async function magcmUnentangle() {
    return magcmBreakFree();
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
        const imgSrc = currentWeapon?.img || `${MAGCM_ICONS_PATH}overlays/warded.svg`;

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
                const imgSrc = weapon?.img || `${MAGCM_ICONS_PATH}overlays/warded.svg`;

                html.find(`img.passive-block-img[data-loc-id="${locId}"]`).attr("src", imgSrc);
            });
        },
        buttons: {
            save: {
                icon: '<i class="fas fa-user-shield"></i>',
                label: "Ward",
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
            clear: {
                icon: '<i class="fas fa-ban"></i>',
                label: "Clear",
                callback: async () => {
                    for (let locItem of hitLocations) {
                        await locItem.unsetFlag(MAGCM_MODULE_ID, "blockingWeapon");
                    }
                    ui.notifications.info(`Cleared warded locations for ${actor.name}.`);
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

    const weaponOptions = (weapons || []).map(item => `<option value="${item.id}">${item.name} (${getMAGCMWeaponSize(item) || item.system?.["impale-size"] || "Unknown size"})</option>`).join("");
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

    new Dialog({
        title: `Impale / Unimpale - ${targetActor.name}${attackerActor ? ` (Attacker: ${attackerActor.name})` : ""}`,
        content: `
            <form>
                <div style="margin-bottom:8px;"><label>Action</label><select id="impaleAction" style="width:100%;">
                    <option value="impale">Impale Target</option>
                    <option value="unimpale" ${unimpaleLocations.length ? "selected" : "disabled"}>Unimpale Target Location(s)</option>
                </select></div>
                <div id="impaleFields" ${unimpaleLocations.length ? `style="display:none;"` : ""}>
                    <div style="margin-bottom:8px;"><label>Weapon</label><select id="impaleWeaponId" style="width:100%;">${weaponOptions || `<option value="">-- No eligible Impale weapons --</option>`}</select></div>
                    <div><label>Hit Location</label><select id="impaleLocationId" style="width:100%;">${locationOptions}</select></div>
                </div>
                <div id="unimpaleFields" ${unimpaleLocations.length ? "" : `style="display:none;"`}>
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

                        const skippedLabels = [];
                        let appliedCount = 0;
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
                                skippedLabels.push(`${location.name} (${source}) - missing original applied damage`);
                                continue;
                            }

                            const unimpalingActor = game.actors.get(impaled.attackerActorId)
                                || canvas.tokens.placeables.find(t => t.actor?.id === impaled.attackerActorId)?.actor;
                            const unimpalingWeapon = unimpalingActor?.items.get(impaled.weaponId);
                            if (!unimpalingActor || !unimpalingWeapon) {
                                skippedLabels.push(`${location.name} (${source}) - original weapon/attacker no longer found`);
                                continue;
                            }

                            await magcmApplyUnimpale({
                                speaker: ChatMessage.getSpeaker({ token: targetToken.document }),
                                targetToken,
                                targetActor,
                                hitLocation: location,
                                attackerActor: unimpalingActor,
                                weapon: unimpalingWeapon,
                                damage: unimpaleSafely ? 0 : damage,
                                safeUnimpale: unimpaleSafely,
                                impaleId: impaled.impaleId || "legacy"
                            });
                            appliedCount++;
                        }

                        if (appliedCount === 0) {
                            return ui.notifications.warn("None of the selected impalements could be processed.");
                        }
                        if (skippedLabels.length > 0) {
                            ui.notifications.warn(`Skipped: ${skippedLabels.join(", ")}`);
                        }
                        return;
                    }

                    if (!attackerActor) return ui.notifications.warn("Please select an attacking token first.");
                    if (!targetActor) return ui.notifications.warn("Please target a victim before rolling an impale.");
                    if (!weapons?.length) return ui.notifications.warn("You have no equipped, unpinned weapon with the Impale combat effect.");
                    const weapon = attackerActor.items.get(html.find("#impaleWeaponId").val());
                    const hitLocation = targetActor.items.get(html.find("#impaleLocationId").val());
                    if (!weapon || !hitLocation) return ui.notifications.warn("Weapon or hit location not found.");
                    if (weapon.getFlag(MAGCM_MODULE_ID, "pinned") || (weapon.type === "melee-weapon" && weapon.getFlag(MAGCM_MODULE_ID, "impaled"))) return ui.notifications.warn(`${weapon.name} cannot be used for this impale.`);

                    const formula = addDamageModifier(getMAGCMWeaponDamage(weapon), weapon);
                    const firstRoll = await new Roll(formula).evaluate();
                    const secondRoll = await new Roll(formula).evaluate();
                    const kept = Math.max(Number(firstRoll.total), Number(secondRoll.total));
                    const wornArmor = hitLocation.equippedArmor ? hitLocation.equippedArmor.reduce((sum, armor) => sum + (Number(armor.ap) || 0), 0) : 0;
                    const naturalArmor = Number(hitLocation.naturalArmor) || 0;
                    const mitigation = Math.max(wornArmor, naturalArmor);
                    const damage = Math.max(0, kept - mitigation);
                    const weaponSize = getMAGCMWeaponSize(weapon) || weapon.system?.["impale-size"] || "Unknown";
                    const weaponLabel = weapon.type === "ranged-weapon" ? `${weapon.name}'s projectile` : weapon.name;
                    const impAttackerNameHtml = getMAGCMCombatantNameHtml(attackerActor.name, getMAGCMCombatantColor(attackerActor, attackerToken), attackerActor.id, attackerToken.id, targetToken.id);
                    const impTargetNameHtml = getMAGCMCombatantNameHtml(targetActor.name, getMAGCMCombatantColor(targetActor, targetToken), targetActor.id, targetToken.id, attackerToken.id);

                    ChatMessage.create({
                        speaker: ChatMessage.getSpeaker({ token: attackerToken.document }),
                        rolls: [firstRoll, secondRoll],
                        content: `
                            <div class="magcm-chat-card">
                            <div class="magcm-chat-card-title magcm-chat-card-title--damage">${getMAGCMInlineTintedIcon(`${MAGCM_ICONS_PATH}conditions/impaled.svg`)} Impale Roll</div>
                            <div class="magcm-chat-card-header">
                                ${buildMAGCMCombatantsRowHtml(impAttackerNameHtml, "Attacker", impTargetNameHtml, "Target")}
                                ${buildMAGCMStatsRowHtml([{ label: "Weapon", value: weaponLabel }, { label: "Hit Location", value: hitLocation.name }])}
                                <div class="magcm-info-row">
                                    <div class="magcm-info-row__label">Damage Rolls:</div>
                                    <span class="magcm-info-pill magcm-info-pill--neutral">[[${firstRoll.total}]] / [[${secondRoll.total}]]</span>
                                </div>
                                <div class="magcm-info-row" style="border-bottom: none;">
                                    <div class="magcm-info-row__label">Kept / After AP (${wornArmor}/${naturalArmor}):</div>
                                    <span class="magcm-info-pill magcm-info-pill--bad">${kept} &rarr; ${damage}</span>
                                </div>
                            </div>
                            <div style="text-align: center; margin-top: 8px;">
                                <button type="button" class="apply-impale-damage"
                                    data-target-token="${targetToken.id}" data-target-name="${targetToken.name}"
                                    data-hit-location-id="${hitLocation.id}" data-hit-location-name="${hitLocation.name}"
                                    data-attacker-actor-id="${attackerActor.id}" data-weapon-id="${weapon.id}"
                                    data-weapon-size="${weaponSize}" data-damage="${kept}"
                                    data-armor="${wornArmor}" data-natural-armor="${naturalArmor}">Apply Impale Damage</button>
                            </div>
                            </div>`
                    });
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "impale",
        render: html => {
            html.find("#impaleAction").on("change", event => {
                const isUnimpale = event.currentTarget.value === "unimpale";
                html.find("#impaleFields").toggle(!isUnimpale);
                html.find("#unimpaleFields").toggle(isUnimpale);
                html.closest(".dialog").find(".dialog-button:first").text(isUnimpale ? "Unimpale" : "Roll Impale");
            });
        }
    }, { resizable: true }).render(true);
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

    dialogContent += `
    <div style="display: flex; align-items: center; justify-content: space-between; background: rgba(0, 0, 0, 0.06); padding: 6px 10px; border-radius: 4px; margin-bottom: 8px; border: 1px solid #ccc;">
        <label style="font-weight: bold; font-size: 12px; color: #222; cursor: pointer; display: flex; align-items: center; gap: 6px; width: 100%;">
            <input type="checkbox" id="toggle-all-combat-flags" style="width: 16px; height: 16px; cursor: pointer;" />
            <span>Toggle All Combat Flags</span>
        </label>
    </div>
    `;

    if (enableReach) {
        dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-engagements" style="font-weight: bold;">Clear Melee Engagements</label>
            <input type="checkbox" id="clear-engagements" />
        </div>`;
    }

    if (enableMovement) {
        dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-movement" style="font-weight: bold;">Clear Movement States</label>
            <input type="checkbox" id="clear-movement" />
        </div>`;
    }

    dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-wards" style="font-weight: bold;">Clear Warded Locations</label>
            <input type="checkbox" id="clear-wards" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-cover" style="font-weight: bold;">Clear Cover Statuses</label>
            <input type="checkbox" id="clear-cover" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-weapons" style="font-weight: bold;">Clear Equipped / Held Weapons</label>
            <input type="checkbox" id="clear-weapons" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-pinned" style="font-weight: bold;">Clear Pinned Weapons</label>
            <input type="checkbox" id="clear-pinned" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-impaled" style="font-weight: bold;">Clear Impaled Weapons and Locations</label>
            <input type="checkbox" id="clear-impaled" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-entangled" style="font-weight: bold;">Clear Entangled Locations</label>
            <input type="checkbox" id="clear-entangled" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-stunned" style="font-weight: bold;">Clear Stunned Locations</label>
            <input type="checkbox" id="clear-stunned" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-bleeding" style="font-weight: bold;">Clear Bleeding Statuses</label>
            <input type="checkbox" id="clear-bleeding" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-gripped" style="font-weight: bold;">Clear Grip Statuses</label>
            <input type="checkbox" id="clear-gripped" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-disable-attack" style="font-weight: bold;">Clear Disabled Attack Statuses</label>
            <input type="checkbox" id="clear-disable-attack" />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-last-damage-origin" style="font-weight: bold;">Clear Last Damage Origin</label>
            <input type="checkbox" id="clear-last-damage-origin" />
        </div>
    </form>`;

    const dialog = new Dialog({
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
                    const doBleeding = html.find("#clear-bleeding").is(":checked");
                    const doGripped = html.find("#clear-gripped").is(":checked");
                    const doLastDamageOrigin = html.find("#clear-last-damage-origin").is(":checked");

                    if (!doEngagements && !doMovement && !doWards && !doCover && !doWeapons && !doPinned && !doImpaled && !doEntangled && !doStunned && !doDisableAttack && !doBleeding && !doGripped && !doLastDamageOrigin) {
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

                        // 2c. Clear Bleeding flag on Actor
                        if (doBleeding && actor.getFlag(MAGCM_MODULE_ID, "bleedingBy") !== undefined) {
                            await actor.unsetFlag(MAGCM_MODULE_ID, "bleedingBy");
                            actorUpdated = true;
                        }

                        // 2d. Clear Grip flag on Actor
                        if (doGripped && actor.getFlag(MAGCM_MODULE_ID, "grippedBy") !== undefined) {
                            await actor.unsetFlag(MAGCM_MODULE_ID, "grippedBy");
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
                                // Clears both special-effect (turnsRemaining) and Serious Wound (indefinite) Stun Location flags
                                if (doStunned && item.getFlag(MAGCM_MODULE_ID, "stunnedBy") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=stunnedBy`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doLastDamageOrigin && item.getFlag(MAGCM_MODULE_ID, "lastDamageOrigin") !== undefined) {
                                    updateObj[`flags.${MAGCM_MODULE_ID}.-=lastDamageOrigin`] = null;
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
        default: "cancel"
    });

    const hookId = Hooks.on("renderDialog", (app, html) => {
        if (app.title === `Clean Up Actor Data & Flags`) {
            html.find("#toggle-all-combat-flags").on("change", (event) => {
                const isChecked = event.currentTarget.checked;
                html.find("[id^='clear-']").prop("checked", isChecked);
            });
            Hooks.off("renderDialog", hookId);
        }
    });

    dialog.render(true);
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
            {
                name: "Attack", type: "proactive", tags: ["melee", "ranged"], desc: `The character can attempt to strike an opponent using a hand-to-hand or ranged weapon. As movement takes place after performing an action, attackers will have to be strategic when closing with an opponent. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk if moving into engagement range or making a ranged attack. The exception is the rules for Charging (page 104 of MYTHRAS).` },
            {
                name: "Charge", type: "proactive", tags: ["melee"], desc: `The character can attempt to strike an opponent using a hand-to-hand or ranged weapon. As movement takes place after performing an action, attackers will have to be strategic when closing with an opponent. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character must be running or sprinting.` },
            {
                name: "Brace", type: "proactive", tags: ["melee"], desc: `The character braces by taking a firm stance and leaning into the direction of a forthcoming attack. For the purposes of resisting Knockback or Leaping Attacks, the character's SIZ is treated as 50% bigger. Against the Bash special effect, SIZ is doubled. Other actions may be possible; however, the benefits of bracing are lost once characters move away from the place where they planted themselves. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: No movement possible.` },
            {
                name: "Cast Magic", type: "proactive", tags: ["magic"], desc: `The character can attempt to cast a spell, invoke a talent, or produce some other magical effect. Complex magics may require several actions in order to complete the casting. Once concluded, the magic can be released at any moment up until the caster's next Turn - at which point it can be held for later effect, but this requires the Hold Magic action (see below) to maintain it in preparation for later release. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
            {
                name: "Change Range", type: "proactive", tags: ["movement"], desc: `The character can attempt to close on or retreat from an opponent, changing the range at which the fighting is taking place in order take best advantage of a weapon's reach or retreat from engagement entirely. See Weapon Reach - Closing and Opening Range in MYTHRAS.
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
            {
                name: "Delay", type: "proactive", tags: ["general"], desc: `The character conserves one or more actions in order to perform reactive actions at a later time, such as Interrupt or Parry. The Action Point costs of delaying is covered by whatever acts are finally performed. If the delayed actions are not taken before the character's next Turn (on the following cycle), then the character is considered to have Dithered and the Action Points are lost. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: As determined when the delayed actions are taken.` },
            {
                name: "Dither", type: "proactive", tags: ["general"], desc: `A character can decide to do nothing, i.e., abort on action, by simply spending all of the character's Action Points and wasting that Turn doing nothing useful. 
              <br/><br/> 
              <strong>Movement Restrictions</strong>: While opting not to take an action, the character may move at any gait.` },
            {
                name: "Hold Magic", type: "proactive", tags: ["magic"], desc: `Once casting is complete, the character may hold a spell in temporary check, awaiting the best moment to release it. The magic may be held back for as long as the character continues to take this action on subsequent Turns, but allows free use of the Counter Spell reaction if pertinent to the spell. The actual skill roll to cast the held spell is not made until it is actually cast. 
              <br/><br/> 
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
            {
                name: "Mount", type: "proactive", tags: ["movement"], desc: `The character can mount or dismount a riding beast. Particularly large or difficult mounts may require several Turns to complete.
               <br/><br/>
               <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
            {
                name: "Outmanoeuvre", type: "proactive", tags: ["melee", "movement"], desc: `The character can engage multiple opponents in a group opposed roll of Evade skills. Those who fail to beat the character's roll cannot attack that character in that Combat Round. If the character beats all of the opponents, the character may disengage from combat. Outmanoeuvre may not be attempted by a prone combatant. See Outmanoeuvring in MYTHRAS. 
              <br/><br/> 
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk. If successful at outmanoeuvring, the defender may move up to half Walking speed, with the Games Master repositioning the trailing group of opponents so as to reflect the new situation. The character may change to any facing after moving.` },
            {
                name: "Ready", type: "proactive", tags: ["general", "ranged"], desc: `The character may retrieve, draw, sheath, withdraw, or reload a weapon or other object. Retrieving a nearby dropped object requires 2 actions: one to move and reach down for the object and a second to return to a readied stance. Some missile weapons require several actions to reload.
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk, but must make a successful Athletics roll unless standing still or fail to retrieve the object. On a Fumble, the item is kicked 1d3x1.5 metres (1d3x5 feet) away.` },
            {
                name: "Regain Footing", type: "proactive", tags: ["movement"], desc: `If unengaged with an opponent, characters can automatically regain their footing from being tripped or knocked down. If engaged, the character must win an opposed test of Brawn or Athletics with the opponent before standing. A character with Acrobatics may, instead, attempt a kick-up manoeuvre, kicking up from prone to standing with a Standard Acrobatics roll. A failed roll leaves the character prone. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk.` },
            {
                name: "Struggle", type: "proactive", tags: ["melee"], desc: `If the victim of a certain types of attack or Special Effect, the character may attempt to disengage from the situation, for example, breaking free from a Grapple or Pin Weapon. 
              <br/><br/> 
              <strong>Movement Restrictions</strong>: The character may move at a gait no faster than a Walk, assuming the character breaks free to begin with.` },
            {
                name: "Take Cover", type: "proactive", tags: ["ranged", "magic", "movement"], desc: `Take Cover is a proactive action which allows a the character to duck behind available cover in their immediate vicinity, thereby gaining some degree of protection against ranged attacks and spells. Unlike Evade it does not leave the user prone, but does rely on some form of cover being available; for example ducking back around a corner in a corridor or crouching down behind a table in a tavern. Depending on circumstances, the available cover may or may not be enough to completely protect the character. The type of cover will also determine its protective qualities. A thick iron door, for instance may prove impenetrable to arrows and bullets, whereas a thin wooden wall might only provide 4 Armour Points. For general guidelines concerning the protective qualities of certain materials, see the 'Inanimate Objects Armour and Hit Points' table on page 81 of MYTHRAS. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may be moving at any gait other than Sprint.` }
        ],
        reactive: [
            {
                name: "Counter Spell", type: "reactive", tags: ["magic"], desc: `The character can attempt to dismiss or counter an incoming spell. This assumes the countering magic has a casting time of 1 Action Point; otherwise, it must be prepared in advance and temporarily withheld using the Hold Magic action. Successfully intercepting magic in this manner is assumed to negate the entire spell, even those with multiple targets or areas of effect. 
              <br/><br/>      
              <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Walk.` },
            {
                name: "Evade", type: "reactive", tags: ["melee", "ranged", "movement"], desc: `The character can attempt to dive or roll clear of threats such as incoming missiles or a charging attack. Using Evade leaves the character prone, unless mitigated by some special consequence or class ability. Thus, the character's next Turn is usually spent taking the Regain Footing action. A character that has been rendered prone due to evading may end up in the same square, or if using Battlemats with a scale of 1.5 metres (5 feet), an adjacent square. When evading breath weapons or other Area of Effect (AoE) attacks, if within 3 metres (10 feet) of the edge of the AoE, a successful Evade will allow you to dive to safety and take no damage instead of half. This will still leave you prone, regardless of any special consequence that can negate that penalty. If using miniatures, place your character prone and just outside of the AoE regardless of whether the roll was successful or not.
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may be moving at any gait other than Sprint.` },
            {
                name: "Interrupt", type: "reactive", tags: ["general"], desc: `This reactive action halts an opponent's Turn at any point in order to take a delayed Turn action. Assuming no change in the tactical situation, the opponent continues the Turn after the character's is completed. If unable to still achieve the original declaration, the opponent's Action Point is wasted. An interrupt can also be used against anyone passing close by the delaying character within weapon's reach. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: As per that of the interrupting action.` },
            {
                name: "Parry", type: "reactive", tags: ["melee"], desc: `The character can attempt to deflect an incoming attack using a combination of parrying, blocking, leaning, and footwork to stop the blow. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Walk if unengaged or Hold Ground otherwise.` }
        ],
        free: [
            {
                name: "Assess Situation", type: "free", tags: ["general"], desc: `If unengaged, a character can make a Perception roll at no Action Point cost. A Success reveals any relevant changes in the tactical situation (such a spotting a foe beginning a charge). 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than Walk or Run (running results in a Formidable Perception roll).` },
            {
                name: "Change Facing", type: "free", tags: ["movement"], desc: `As a free action, after the results of an attack are applied, the defender may change facing to better defend against any further strikes. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Walk.` },
            {
                name: "Drop Weapon", type: "free", tags: ["general"], desc: `Dropping a weapon is a Free Action. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Run.` },
            {
                name: "Signal", type: "free", tags: ["general"], desc: `If unengaged, gesturing or signalling to one or more participants (as long as they can perceive the sign) is a Free Action. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Walk.` },
            {
                name: "Speak", type: "free", tags: ["general"], desc: `A character can speak at any time during combat, but what is said should be limited to short phrases that can be uttered in 5 seconds or less, for example, 'Time to die!', 'Look out behind you!' or 'Long live Gygax!' 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character may be moving at a gait no faster than a Run.` },
            {
                name: "Use Luck Point", type: "free", tags: ["general"], desc: `Using a Luck Point - to re-roll a particular result, for example - is a Free Action. 
              <br/><br/>
              <strong>Movement Restrictions</strong>: The character suffers no movement restrictions.` },
            {
                name: "Ward Location", type: "free", tags: ["melee"], desc: `The character guards a particular Hit Location from being hit by dedicating one weapons to statically cover the area. Any blow that lands on that location has its damage automatically downgraded as per normal for a parrying weapon of its SIZ. The ward continues until the dedicated weapon is used to attack or actively parry. Establishing a ward or changing the Hit Location covered must be performed prior to an opponent rolling to attack the character. Due to their design, shields can cover multiple areas. For further explanation, see Passive Blocking in MYTHRAS.
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

                    let currentAP = foundry.utils.getProperty(actor, "system.trackedStats.actionPoints.value");
                    let newAp = currentAP - 1;
                    if (newAp < 0) newAp = 0;
                    const spendingAP = spendAP && actionType !== "free";

                    if (spendingAP) {
                        await actor.update({
                            "system.trackedStats.actionPoints.value": String(newAp),
                            "system.currentActionPoints": newAp,
                            "system.attributes.actionPoints.value": newAp
                        });
                    }

                    const chatContent = `
                        <div class="magcm-chat-card">
                        <div class="magcm-chat-card-title"><i class="fas fa-khanda"></i> ${actionName}</div>
                        <div class="magcm-chat-card-header">
                            ${targets.length > 0 ? buildMAGCMStatsRowHtml([{ label: "Target(s)", value: targets.map(t => t.name).join(", ") }]) : ""}
                            <p style="margin: 4px 0 0 0; font-size: 0.9em;">${actionDesc}</p>
                            ${spendingAP ? `<div class="magcm-chat-card-notice"><i class="fas fa-hand-fist"></i> Action Points reduced by 1. ${newAp} Action Points remaining.</div>` : ""}
                        </div>
                        </div>
                    `;

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
                    icon: '<i class="fas fa-beer-mug-empty"></i>',
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
                cancel: {
                    icon: '<i class="fas fa-times"></i>',
                    label: "Cancel"
                }
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
 * chat card whose "Roll Hit Location" / "Roll Damage" / "Resolve Damage" buttons are handled by the
 * renderChatMessage listener elsewhere in this file.
 */
function magcmOpenAttackDialog(token) {
    const getSkillValue = (item) => item?.totalVal ?? item?.system?.skillLevel ?? item?.system?.value ?? 0;

    if (!token || !token.actor) {
        return ui.notifications.warn("Please select a character's token.");   
    }

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
        if (isMAGCMNaturalWeapon(weapon)) return true;
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
    const wardedLocationIds = new Set(
        token.actor.items
            .filter(i => i.type === "hitLocation" && i.getFlag(MAGCM_MODULE_ID, "blockingWeapon"))
            .map(i => i.id)
    );
    weaponArray.forEach(weapon => {
        const isNaturalWeapon = isMAGCMNaturalWeapon(weapon);
        const naturalWeaponLocationIds = isNaturalWeapon
            ? Object.entries(weapon.getFlag?.(MAGCM_MODULE_ID, "naturalWeaponLocations") || {}).filter(([, active]) => active).map(([locId]) => locId)
            : [];
        const holdingLocations = isNaturalWeapon ? naturalWeaponLocationIds : (weapon.getFlag?.(MAGCM_MODULE_ID, "holdingLocations") || []);
        weapon._pinned = Boolean(weapon.getFlag?.(MAGCM_MODULE_ID, "pinned"));
        weapon._impaled = weapon.type === "melee-weapon" && Boolean(weapon.getFlag?.(MAGCM_MODULE_ID, "impaled"));
        weapon._entangledBlocked = holdingLocations.some(locId => entangledArmIds.has(locId));
        // A Natural Weapon is only stunned-blocked once EVERY hit location it's attached to is stunned;
        // a normally-held weapon is blocked if ANY of its (usually 1-2) holding locations is stunned.
        weapon._stunnedBlocked = isNaturalWeapon
            ? (holdingLocations.length > 0 && holdingLocations.every(locId => stunnedLocationIds.has(locId)))
            : holdingLocations.some(locId => stunnedLocationIds.has(locId));
        weapon._warding = holdingLocations.some(locId => wardedLocationIds.has(locId));
        const hpValue = weapon.system?.hp;
        weapon._broken = hpValue !== undefined && hpValue !== "" && Number(hpValue) <= 0;
        weapon._rangeBlocked = false;
        weapon._gripRequirementMet = (weapon.getFlag(MAGCM_MODULE_ID, "gripRequirement") === "2h") ? holdingLocations?.length >= 2 : true;

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
        console.log(`Weapon Grip Requirement Met: ${weapon.name} ${weapon._gripRequirementMet}`);
        if (weapon._broken) reasons.push("Broken");
        if (weapon._pinned) reasons.push("Pinned");
        if (weapon._impaled) reasons.push("Impaling");
        if (weapon._entangledBlocked) reasons.push("Entangled");
        if (weapon._stunnedBlocked) reasons.push("Stunned");
        if (weapon._rangeBlocked) reasons.push("Cannot reach");
        if (weapon._notLoaded) reasons.push("Not loaded");
        if (weapon?._warding) reasons.push("Warding");
        if (weapon?._gripRequirementMet === false) reasons.push("Weak Grip");
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

    // Ranged Attack Difficulty preview: a chosen situational modifier sets a baseline difficulty tier
    // (from the shared MAGCM_DIFFICULTY_TIERS scale), then the target's size vs. distance shifts that tier
    // up or down. This is advisory only - it never touches the Difficulty select above.
    const rangedSituationalModifiers = [
        { text: "No situational modifiers apply", tierIndex: 2 },
        { text: "A light wind is blowing", tierIndex: 3 },
        { text: "A moderate wind is blowing", tierIndex: 4 },
        { text: "A strong wind is blowing", tierIndex: 5 },
        { text: "A storm is raging", tierIndex: 5 },
        { text: "The target is running", tierIndex: 3 },
        { text: "The target is sprinting", tierIndex: 4 },
        { text: "The target is obscured by mist or partial darkness", tierIndex: 3 },
        { text: "The target is obscured by thick smoke, fog, or darkness", tierIndex: 4 },
        { text: "The target is completely obscured", tierIndex: 5 },
        { text: "The target is prone", tierIndex: 4 },
        { text: "The attacker is blinded or has lost a primary perceptive sense", tierIndex: 5 },
        { text: "The attacker is prone", tierIndex: 5 },
        { text: "The attacker is on unstable ground", tierIndex: 3 }
    ];

    // Picks which situational modifier (if any) should be pre-selected: checks the attacker's own Prone
    // status (Foundry's built-in condition) and the target's Prone/Running/Sprinting statuses (this
    // module's own movement states, see setActorMovementState's statuses: ["movement-run"/"movement-sprint"]),
    // and returns whichever applicable condition maps to the hardest difficulty tier. Falls back to
    // "No situational modifiers apply" if none apply.
    function getMAGCMDefaultRangedSituationIndex(attackerActor, targetActor) {
        const candidateIndices = [];
        if (attackerActor?.statuses?.has("prone")) candidateIndices.push(12); // The attacker is prone
        if (targetActor?.statuses?.has("prone")) candidateIndices.push(10); // The target is prone
        if (targetActor?.statuses?.has("movement-sprint")) candidateIndices.push(6); // The target is sprinting
        if (targetActor?.statuses?.has("movement-run")) candidateIndices.push(5); // The target is running
        if (candidateIndices.length === 0) return 0;
        return candidateIndices.reduce((best, index) =>
            rangedSituationalModifiers[index].tierIndex > rangedSituationalModifiers[best].tierIndex ? index : best);
    }
    // SIZ thresholds a target must exceed before it counts as one ranged "size band" larger.
    const rangedSizeBands = [10, 20, 40, 80, 150, 300];
    // Used only when the live measurement isn't possible (no canvas/target, or an unrecognised grid unit).
    const MAGCM_RANGED_FALLBACK_DISTANCE_METERS = 20;

    function getMAGCMRangedSizeIndex(siz) {
        const value = Number(siz) || 0;
        for (let i = 0; i < rangedSizeBands.length; i++) {
            if (value <= rangedSizeBands[i]) return i + 1;
        }
        return rangedSizeBands.length;
    }

    // Steps to shift the base difficulty tier by: positive = harder (small/distant target), negative = easier (large/close target).
    function getMAGCMRangedDifficultySteps(rangeIndex, sizeIndex) {
        const diff = rangeIndex - sizeIndex + 1;
        return rangeIndex >= sizeIndex ? Math.ceil(diff / 2) : Math.floor(diff / 2);
    }

    // Measures the attacker-to-target distance in meters using the scene's own grid units; returns null
    // for units it can't convert (feet/km/meters are handled, anything else falls back safely).
    function computeMAGCMRangedDistanceMeters(tokenA, tokenB) {
        if (!tokenA || !tokenB || typeof canvas?.grid?.measurePath !== "function") return null;
        try {
            const measured = canvas.grid.measurePath([
                { x: tokenA.center.x, y: tokenA.center.y },
                { x: tokenB.center.x, y: tokenB.center.y }
            ]);
            const rawDistance = Number(measured?.distance);
            if (!Number.isFinite(rawDistance)) return null;
            const units = String(canvas.scene?.grid?.units || "").trim().toLowerCase();
            if (["m", "meter", "meters", "metre", "metres"].includes(units)) return rawDistance;
            if (["ft", "feet", "foot"].includes(units)) return rawDistance * 0.3048;
            if (["km", "kilometer", "kilometers", "kilometre", "kilometres"].includes(units)) return rawDistance * 1000;
            return null;
        } catch (e) {
            console.warn(`${MAGCM_MODULE_ID} | Failed to measure attacker-target distance`, e);
            return null;
        }
    }

    // Classifies a distance (in meters) against a ranged weapon's own Close/Effective/Long thresholds; null if unset.
    function getMAGCMRangedZone(weapon, distanceMeters) {
        const closeMax = Number(weapon?.system?.range?.close);
        const effectiveMax = Number(weapon?.system?.range?.effective);
        const longMax = Number(weapon?.system?.range?.long);
        if (!Number.isFinite(closeMax) || !Number.isFinite(effectiveMax) || !Number.isFinite(longMax)) return null;
        if (distanceMeters <= closeMax) return "Close";
        if (distanceMeters <= effectiveMax) return "Effective";
        if (distanceMeters <= longMax) return "Long";
        return "Beyond Long";
    }

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

    const defaultRangedSituationIndex = getMAGCMDefaultRangedSituationIndex(token.actor, targetToken?.actor);
    const rangedSituationOptionsHtml = rangedSituationalModifiers.map((mod, index) =>
        `<option value="${index}" ${index === defaultRangedSituationIndex ? "selected" : ""}>${mod.text} (${MAGCM_DIFFICULTY_TIERS[mod.tierIndex].text})</option>`).join("");

    const d = new Dialog({
        title: `Roll Attack - ${token.name}`,
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
                                    <td><input type="text" id="unarmedCombatEffects" placeholder="e.g. Bleed, Stun Location" style="width: 100%;"></td>
                                </tr>
                                <tr id="rangedStatsRow">
                                    <th>Ranged Status</th>
                                    <td id="rangedStatsValue" style="font-weight: bold;">-</td>
                                </tr>
                                ${rangeRowHtml}
                            </table>
                        </fieldset>

                        <fieldset id="rangedDifficultyFieldset" style="display:none; border: 1px solid var(--color-border-dark-tertiary); border-radius: 3px; padding: 6px; margin-bottom: 8px;">
                            <legend style="font-size: 0.85em; font-weight: bold; color: #e1a100;">Ranged Difficulty</legend>
                            <table style="width: 100%; text-align: left; font-size: 0.9em;">
                                <tr>
                                    <th>Situation</th>
                                    <td><select id="rangedSituation" style="width: 100%;">${rangedSituationOptionsHtml}</select></td>
                                </tr>
                                <tr>
                                    <th>Distance (m)</th>
                                    <td><input type="number" id="rangedCustomDistance" placeholder="auto" style="width: 100px;"> <span style="opacity:0.7;">(auto-measured to target; enter a value to override)</span></td>
                                </tr>
                                <tr>
                                    <th>Weapon Range Zone</th>
                                    <td id="rangedZoneValue" style="font-weight: bold;">-</td>
                                </tr>
                                <tr>
                                    <th>Projected Difficulty</th>
                                    <td><span id="rangedProjectedDifficultyValue" class="magcm-difficulty-badge">-</span></td>
                                </tr>
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
                                <tr>
                                    <th>Force Roll Result?</th>
                                    <td><input type="checkbox" id="attackForceRollToggle"></td>
                                </tr>
                                <tr id="attackForceRollRow" style="display:none;">
                                    <th>Forced Result (1-100)</th>
                                    <td><input type="number" id="attackForceRollValue" min="1" max="100" style="width: 80px;"></td>
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
                                    <th>Cap by skill?</th>
                                    <td><input type="checkbox" id="attackCapSkillToggle"></td>
                                </tr>
                                <tr>
                                    <th>Cap character</th>
                                    <td><select id="attackCapCharacter" style="width: 100%;">${buildMAGCMAugmentActorOptions(augmentActors, defaultAugmentActor.id)}</select></td>
                                </tr>
                                <tr>
                                    <th>Cap with</th>
                                    <td><select id="attackCapSkill" style="width: 100%;">${augArray.map(i => `<option value="${i.id}">${i.name} (${getMAGCMSkillValue(i)}%)</option>`).join("")}</select></td>
                                </tr>
                                <tr>
                                    <th>Custom Augment Value:</th>
                                    <td><input type="number" value="0" id="custom-augment" style="width: 100%; text-align: center;"></td>
                                </tr>
                                <tr id="attackOver100Row" style="display:none;">
                                    <th>Skill exceeds 100%</th>
                                    <td>
                                        <label style="font-weight: normal;">
                                            <input type="checkbox" id="attackOver100Penalty" style="vertical-align: middle; margin-right: 6px;">
                                            Apply excess (<span id="attackOver100Value">0</span>%) to both sides of this contest
                                        </label>
                                    </td>
                                </tr>
                            </table>
                        </fieldset>
                    </div>
                  </form>`,
        buttons: {
            roll: {
                icon: '<i class="fas fa-khanda"></i>',
                label: `Roll Attack`,
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
                    const capActor = augmentActors.find(candidate => candidate.id === html.find('#attackCapCharacter').val()) || defaultAugmentActor;
                    const capSkillItem = capActor.items.get(html.find('#attackCapSkill').val()) || null;
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
                        actionPointReducedLabel = `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn"><i class="fas fa-hand-fist"></i> Action Points reduced by 1 (${newAP} remaining).</div>`;
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

                    // -- Prospective Over-100% Skill Penalty --
                    // If the attacker's own effective skill (after difficulty) exceeds 100%, Mythras (p.50,
                    // "Opposed Skills Over 100%") has them subtract that excess from EVERYONE in the contest,
                    // including themselves - capping their own roll target at 100% while also reducing the
                    // defender's Parry/Evade target. Prospective (the attack resolves first), so unlike the
                    // retroactive Parry/Evade case there's no causality issue - purely GM discretion via this checkbox.
                    const attackOver100OriginalDiffValue = diffValue;
                    const attackOver100Excess = getMAGCMOver100Excess(diffValue);
                    const applyAttackOver100 = attackOver100Excess > 0 && html.find('#attackOver100Penalty').is(':checked');
                    if (applyAttackOver100) diffValue -= attackOver100Excess;

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
                    let weaponBaseFormula = getMAGCMWeaponDamage(weapon) || "1d3";
                    let modifierFormulaStr = weapon.system?.damageModifier ? (effectiveDamageModifierStr || "") : "";
                    let weaponDamage = modifierFormulaStr ? `${weaponBaseFormula}+${modifierFormulaStr}` : weaponBaseFormula;
                    let weaponReachName = weapon.system?.reach || "S";
                    let weaponSizeName = getMAGCMWeaponSize(weapon) || "M";
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

                    const attackForcedRollValue = getMAGCMForcedRollValue(html, '[id="attackForceRollToggle"]', '[id="attackForceRollValue"]');
                    let combatRoll = await rollMAGCMD100(attackForcedRollValue);

                    const baseResultLabel = getMAGCMResultLabelForRoll(combatRoll.result, diffValue, attackOver100OriginalDiffValue);
                    let resultLabel;
                    if (baseResultLabel === "Critical") {
                        resultLabel = `<span style="font-weight: bold; color: goldenrod;">CRITICAL</span>`;
                    } else if (baseResultLabel === "Fumble") {
                        resultLabel = `<span style="font-weight: bold; color: darkred;">FUMBLE</span>`;
                    } else if (baseResultLabel === "Success") {
                        resultLabel = `<span style="font-weight: bold; color: green;">SUCCESS</span>`;
                    } else {
                        resultLabel = `<span style="font-weight: bold; color: red;">FAILURE</span>`;
                    }

                    // A failed/fumbled attack cannot cause damage under any circumstances - default (and
                    // later lock, see the Parry damage-mode reflection above) the card to No Damage.
                    const attackFailedOrFumbled = baseResultLabel === "Failure" || baseResultLabel === "Fumble";

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
                                  data-weapon-size="${getMAGCMWeaponSize(weapon) || weapon.system?.["impale-size"] || "Unknown"}"
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
                    const canBleed = combatEffectsText.includes("bleed");
                    let resolveDamageButton = `<span class="magcm-resolve-damage-wrap" style="display: block; width: 100%;">${createDamageButton('simple-damage', 'Resolve Damage')}</span>`;
                    let chooseLocationButton = createDamageButton('choose-location', 'Choose Location');
                    let penaltyNotice = reachPenaltyTriggered
                        ? `<div class="magcm-chat-card-notice"><i class="fas fa-triangle-exclamation"></i> Weapon inside ideal reach: Damage reduced to 1d3+1. Size reduced by ${reachVal - rangeVal} steps.</div>` : "";

                    let chargeNotice = isCharging
                        ? `<div class="magcm-chat-card-notice"><i class="fas fa-triangle-exclamation"></i> Charging ${chargeType === 'through' ? 'Through' : 'Into'} Contact (Damage Modifier +${chargeDamageStep} Step${chargeDamageStep > 1 ? 's' : ''}, Size +1 Step).</div>`
                        : "";
                    let damageModSubNotice = useDamageModSub
                        ? `<div class="magcm-chat-card-notice"><i class="fas fa-triangle-exclamation"></i> Damage Modifier Substituted: ${damageModSubRaw}</div>`
                        : "";
                    let prospectiveOver100Notice = applyAttackOver100
                        ? `<div class="magcm-chat-card-notice magcm-chat-card-notice--warn magcm-prospective-over100-notice"><i class="fas fa-triangle-exclamation"></i> ${skillToRoll.name} (${attackOver100OriginalDiffValue}%) exceeds 100% by ${attackOver100Excess}% - own target capped at 100%, and the defender's Parry/Evade target will be reduced by ${attackOver100Excess}%.</div>`
                        : "";

                    // Ranged Attack Difficulty preview data, carried onto the finalized card as a Distance
                    // stat pill (with the target's SIZ in its tooltip) and, if one was chosen, a situational
                    // modifier notice coloured by the difficulty tier that modifier alone recommends.
                    let rangedDistanceMeters = null;
                    let rangedZoneLabel = null;
                    let rangedSituationalNotice = "";
                    if (weapon.type === "ranged-weapon") {
                        const rangedCustomDistance = Number(html.find('#rangedCustomDistance').val()) || 0;
                        const rangedMeasuredDistance = computeMAGCMRangedDistanceMeters(token, activeTarget);
                        rangedDistanceMeters = rangedCustomDistance > 0 ? rangedCustomDistance : (rangedMeasuredDistance ?? MAGCM_RANGED_FALLBACK_DISTANCE_METERS);
                        rangedZoneLabel = getMAGCMRangedZone(weapon, rangedDistanceMeters);

                        const rangedSituationalIndex = Number(html.find('#rangedSituation').val()) || 0;
                        const rangedSituationalMod = rangedSituationalModifiers[rangedSituationalIndex];
                        if (rangedSituationalIndex !== 0 && rangedSituationalMod) {
                            const rangedSituationalTier = MAGCM_DIFFICULTY_TIERS[rangedSituationalMod.tierIndex];
                            rangedSituationalNotice = `<div class="magcm-chat-card-notice" data-difficulty="${rangedSituationalTier.text}"><i class="fas fa-crosshairs"></i> ${rangedSituationalMod.text} (Recommended: ${rangedSituationalTier.text}).</div>`;
                        }
                    }

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
                    // Firing consumes the shot before the Weapon pill's tooltip is snapshotted below, so its
                    // embedded load value matches what the overlay icon shows immediately afterward (not stale pre-shot load).
                    if (weapon.type === "ranged-weapon") {
                        await weapon.setFlag(MAGCM_MODULE_ID, "loadProgress", 0);
                    }
                    // Reuse the held-weapon overlay's own tooltip builder; for an unarmed/improvised attack (no
                    // real weapon backing the chosen stats), feed it a synthetic stand-in built from the dialog's
                    // own chosen damage/reach/size instead, with the icon and AP/HP cell omitted.
                    const isImprovisedWeapon = weaponName === "Unarmed/Improvised";
                    const weaponForTooltip = isImprovisedWeapon
                        ? { type: "melee-weapon", name: weaponName, system: { damage: weaponDamage, reach: weaponReachName, size: weaponSizeName } }
                        : weapon;
                    const weaponTooltipHtml = buildMAGCMWeaponTooltipHTML(actor, weaponForTooltip, { improvised: isImprovisedWeapon });
                    statsInfoItems.push({ label: "Combat Style", value: skillToRoll.name });
                    statsInfoItems.push({ label: "Weapon", value: weaponName, tooltipHtml: weaponTooltipHtml });
                    if (weapon.type === "melee-weapon" || skillToRollName.toLowerCase() === 'unarmed') {
                        if (enableReach) {
                            statsInfoItems.push({ label: "Range", value: attackerRangeName });
                            statsInfoItems.push({ label: "Reach", value: displayReach, dataAttrs: { reachstatus: reachPenaltyTriggered ? "penalty" : "ok" } });
                        }
                        statsInfoItems.push({ label: "Size", value: displaySize });
                    } else if (weapon.type === "ranged-weapon") {
                        statsInfoItems.push({ label: "Force", value: displayForce });
                        statsInfoItems.push({ label: "Impale Size", value: displayImpaleSize });
                        statsInfoItems.push({ label: "Ammo Left", value: remainingAmmo });
                        if (rangedDistanceMeters !== null) {
                            const rangedTargetSiz = getMAGCMActorSizValue(activeTarget.actor);
                            statsInfoItems.push({
                                label: "Distance",
                                value: `${Math.round(rangedDistanceMeters)} m${rangedZoneLabel ? ` (${rangedZoneLabel})` : ""}`,
                                dataAttrs: rangedZoneLabel ? { rangezone: rangedZoneLabel.toLowerCase().replace(/\s+/g, "-") } : undefined,
                                tooltipHtml: `Target SIZ: <strong>${rangedTargetSiz ?? "Unknown"}</strong>`
                            });
                        }
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

                    const attackerColor = getMAGCMCombatantColor(actor, token);
                    const targetColor = getMAGCMCombatantColor(activeTarget.actor, activeTarget);
                    const attackerNameHtml = getMAGCMCombatantNameHtml(token.name, attackerColor, actor?.id, token.id, activeTarget.id);
                    const targetNameHtml = getMAGCMCombatantNameHtml(activeTarget.name, targetColor, activeTarget.actor?.id, activeTarget.id, token.id);

                    const attackRollPillHtml = buildMAGCMRollResultPillHtml({
                        rollTotal: combatRoll.result,
                        resultLabel: baseResultLabel,
                        skillName: skillToRoll.name,
                        effectiveSkillValue: combatStyleValue,
                        diffText,
                        targetValue: diffValue,
                        augmentLine: augmentTooltipLine,
                        forced: attackForcedRollValue !== null
                    });

                    // Chat log messages aren't individually scoped <form> elements, so a shared radio "name"
                    // would make every Attack card's damage-mode group fight over the same native selection.
                    const damageModeGroupName = `attack-damage-mode-${foundry.utils.randomID()}`;

                    let contentString = `
                        <div class="magcm-chat-card magcm-attack-card" data-attacker-user-id="${game.user.id}">
                        <div class="magcm-chat-card-title magcm-chat-card-title--attack"><i class="fas fa-khanda"></i> Attack</div>
                        <div class="magcm-chat-card-header">
                            ${buildMAGCMCombatantsRowHtml(attackerNameHtml, "Attacker", targetNameHtml, "Target")}
                            ${statsInfoHtml}
                            ${penaltyNotice}
                            ${chargeNotice}
                            ${damageModSubNotice}
                            ${prospectiveOver100Notice}
                            ${rangedSituationalNotice}
                            ${chatModHtml}
                            <div class="magcm-chat-card-roll">
                                <div class="magcm-chat-card-roll__label">Attack Roll${buildMAGCMDifficultyBadgeHtml(diffIndex)}</div>
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
                                <div class="attack-info-row__label">Worn Armour:</div>
                                <div class="attack-location-armor attack-info-pill attack-armor-result-value" data-magcm-tooltip="">Not rolled</div>
                            </div>
                            <div class="attack-info-row">
                                <div class="attack-info-row__label">Weapon Damage:</div>
                                <div><span class="attack-damage-result">Not rolled</span></div>
                            </div>
                            <div class="attack-damage-mode-group">
                                <label class="attack-damage-mode-option"><input type="radio" name="${damageModeGroupName}" class="attack-damage-mode-radio" value="none"${attackFailedOrFumbled ? " checked" : ""}><span>No Damage</span></label>
                                <label class="attack-damage-mode-option"><input type="radio" name="${damageModeGroupName}" class="attack-damage-mode-radio" value="half"><span>Half Damage</span></label>
                                <label class="attack-damage-mode-option"><input type="radio" name="${damageModeGroupName}" class="attack-damage-mode-radio" value="full"${attackFailedOrFumbled ? "" : " checked"}><span>Full Damage</span></label>
                            </div>
                            <div class="attack-toggle-grid">
                                ${baseResultLabel === "Critical" ? `<label class="attack-toggle-chip" data-effect-name="Bypass Armour"><input type="checkbox" class="attack-bypass-worn-armor"> Bypass Worn Armour</label>` : ""}
                                ${baseResultLabel === "Critical" ? `<label class="attack-toggle-chip" data-effect-name="Bypass Armour"><input type="checkbox" class="attack-bypass-natural-armor"> Bypass Natural Armour</label>` : ""}
                                ${canImpale ? `<label class="attack-toggle-chip" data-effect-name="Impale"><input type="checkbox" class="attack-impale-toggle"> Impale</label>` : ""}
                                ${canSunder ? `<label class="attack-toggle-chip" data-effect-name="Sunder"><input type="checkbox" class="attack-sunder-toggle"> Sunder</label>` : ""}
                                ${canEntangle ? `<label class="attack-toggle-chip" data-effect-name="Entangle"><input type="checkbox" class="attack-entangle-toggle"> Entangle</label>` : ""}
                                ${canStunLocation ? `<label class="attack-toggle-chip" data-effect-name="Stun Location"><input type="checkbox" class="attack-stun-location-toggle"> Stun Location</label>` : ""}
                                ${canBleed ? `<label class="attack-toggle-chip" data-effect-name="Bleed"><input type="checkbox" class="attack-bleed-toggle"> Bleed</label>` : ""}
                                <label class="attack-toggle-chip" data-effect-name="Grip"><input type="checkbox" class="attack-grip-toggle"> Grip</label>
                            </div>
                            <div style="display: flex; align-items: center; justify-content: space-around; flex-wrap: wrap; gap: 4px;">
                                ${resolveDamageButton}
                            </div>
                        </div>
                        ${actionPointReducedLabel}
                        <hr>                    
                        <div style="display: flex; gap: 5px; margin-top: 10px;">
                            <button type="button" class="parry-button" data-attacker-name="${token.name}" data-attacker-token-id="${token.id}" data-attacker-actor-id="${actor.id}" data-attacker-range="${attackerRangeName}" data-attacker-size="${displaySize}" data-attacker-result="${baseResultLabel}" data-attacker-weapon-type="${attackerWeaponType}" data-attacker-weapon-traits="${attackerWeaponTraits}" data-attacker-style-traits="${attackerStyleTraits}"><i class="fas fa-shield-halved"></i> Parry</button>
                            <button type="button" class="evade-button" data-attacker-name="${token.name}" data-attacker-token-id="${token.id}" data-attacker-actor-id="${actor.id}" data-attacker-result="${baseResultLabel}" data-attacker-weapon-type="${attackerWeaponType}" data-attacker-weapon-traits="${attackerWeaponTraits}" data-attacker-style-traits="${attackerStyleTraits}"><i class="fas fa-person-running"></i> Evade</button>
                            <button type="button" class="contest-button" data-attacker-actor-id="${actor.id}" data-attacker-skill-id="${skillToRoll.id}" data-attacker-score="${combatRoll.result}" data-attacker-result="${baseResultLabel}" data-attacker-diff="${diffIndex}" data-attacker-aug="${augString}"><i class="fas fa-hand-fist"></i> Contest</button>
                        </div>
                        </div>`;

                    ChatMessage.create({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker(),
                        content: contentString,
                        rolls: [combatRoll],
                        flags: {
                            [MAGCM_MODULE_ID]: {
                                ...(attackFailedOrFumbled ? { "attack-damage-mode": "none" } : {}),
                                "magcm-difficulty": {
                                    type: "attack",
                                    rollTotal: combatRoll.result,
                                    effectiveSkillValue: combatStyleValue,
                                    skillName: skillToRoll.name,
                                    augmentLine: augmentTooltipLine,
                                    forced: attackForcedRollValue !== null,
                                    diffIndex,
                                    originalDiffIndex: diffIndex,
                                    prospectiveOver100Excess: applyAttackOver100 ? attackOver100Excess : 0,
                                    prospectiveOver100Source: applyAttackOver100 ? `${token.name}'s ${skillToRoll.name} (${attackOver100OriginalDiffValue}%)` : null,
                                    prospectiveOver100SourceName: applyAttackOver100 ? `${token.name}'s ${skillToRoll.name}` : null
                                }
                            }
                        }
                    });
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "roll",
        render: (html) => {
            const augmentCheckbox = html.find('#Augment');
            const augmentCharacterSelect = html.find('#augCharacter');
            const augmentCharacterRow = augmentCharacterSelect.closest('tr');
            const augSkillRow = html.find('#augSkill').closest('tr');
            const capToggle = html.find('#attackCapSkillToggle');
            const capCharacterSelect = html.find('#attackCapCharacter');
            const capCharacterRow = capCharacterSelect.closest('tr');
            const capSkillRow = html.find('#attackCapSkill').closest('tr');
            const customAugRow = html.find('#custom-augment').closest('tr');
            const over100Row = html.find('#attackOver100Row');
            const over100Checkbox = html.find('#attackOver100Penalty');
            const over100Value = html.find('#attackOver100Value');
            const ammoCheckbox = html.find('#ammoReduction');
            const ammoRow = ammoCheckbox.closest('tr');
            const rangeRow = html.find('#rangeRow');
            const rangedStatsRow = html.find('#rangedStatsRow');
            const rangedStatsValue = html.find('#rangedStatsValue');
            const rangedDifficultyFieldset = html.find('#rangedDifficultyFieldset');
            const rangedSituationSelect = html.find('#rangedSituation');
            const rangedCustomDistanceInput = html.find('#rangedCustomDistance');
            const rangedZoneValueEl = html.find('#rangedZoneValue');
            const rangedProjectedDifficultyValueEl = html.find('#rangedProjectedDifficultyValue');
            const weaponSelect = html.find('#weaponToRoll');
            const skillSelect = html.find('#skillToRoll');
            const chargingCheckbox = html.find('#isCharging');
            const chargeTypeRow = html.find('#chargeTypeRow');
            const chargeDamageStepRow = html.find('#chargeDamageStepRow');
            const damageModSubToggle = html.find('#damageModSubToggle');
            const damageModSubRow = html.find('#damageModSubRow');
            const forceRollToggle = html.find('#attackForceRollToggle');
            const forceRollRow = html.find('#attackForceRollRow');
            const rollModifiersRow = html.find('#rollModifiersRow');
            const rollModifiersSpan = html.find('.rollModifiers');
            const unarmedDamageRow = html.find('#unarmedDamageRow');
            const unarmedReachRow = html.find('#unarmedReachRow');
            const unarmedSizeRow = html.find('#unarmedSizeRow');
            const unarmedCombatEffectsRow = html.find('#unarmedCombatEffectsRow');
            const difficultySelect = html.find('#rollDifficulty');
            const difficultyStepOrder = ["2", "1.5", "1", "0.67", "0.5", "0.1"];
            let chargingDifficultyShiftApplied = false;
            // Value (as a string, matching #rollDifficulty's own option values) that updateRangedDifficultyPreview
            // last wrote into the Difficulty select itself; null until the first ranged preview update.
            let rangedDifficultyAutoSyncValue = null;
            // Index last auto-selected into #rangedSituation by the Prone/Running/Sprinting default logic;
            // used the same way as rangedDifficultyAutoSyncValue so a manual pick isn't overwritten when
            // the target token changes.
            let rangedSituationAutoSyncIndex = defaultRangedSituationIndex;

            // Shifts the difficulty select by one step (direction +1 = harder, -1 = easier), clamped to the
            // available range. Returns whether a shift actually occurred, so the reverse shift on uncheck can
            // be skipped if checking Charging was already clamped at a boundary (e.g. starting at Herculean).
            function shiftAttackDifficulty(direction) {
                const currentIndex = difficultyStepOrder.indexOf(String(difficultySelect.val()));
                if (currentIndex === -1) return false;
                const newIndex = currentIndex + direction;
                if (newIndex < 0 || newIndex >= difficultyStepOrder.length) return false;
                difficultySelect.val(difficultyStepOrder[newIndex]);
                return true;
            }

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
                capCharacterRow.toggle(capToggle.is(':checked'));

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
                unarmedReachRow.toggle(isUnarmedFallback && enableReach);
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
                            // The Unarmed/Improvised fallback's own system.reach is a static "T" default -
                            // read the dialog's own Reach select live instead, so changing it (before the
                            // character is engaged and has a stored engagement range) updates the preview.
                            if (isUnarmedFallback) rawReach = html.find('#unarmedReach').val() || "T";
                            else if (skillToRollName.toLowerCase() === 'unarmed') rawReach = "T";
                            const defaultRange = rangeDisplay[rawReach] || "Medium";
                            html.find('#combatRangeValue').text(defaultRange);
                        }
                    } else {
                        rangeRow.hide();
                    }
                }

                updateRangedDifficultyPreview(activeWeapon);

                if (chargingCheckbox.is(':checked')) {
                    chargeTypeRow.show();
                    chargeDamageStepRow.show();
                } else {
                    chargeTypeRow.hide();
                    chargeDamageStepRow.hide();
                }

                damageModSubRow.toggle(damageModSubToggle.is(':checked'));
                forceRollRow.toggle(forceRollToggle.is(':checked'));

                const chargingActive = chargingCheckbox.is(':checked');
                rollModifiersSpan.attr('data-tooltip', escapeTooltip(composeModifiersText(chargingActive)));
                rollModifiersRow.toggle(isModTextVisible || chargingActive);

                updateOver100Preview();
            }

            // Resolves which targeted token the ranged-difficulty preview should use: the dialog's own
            // Target Token select when present (multiple targets), else whichever token is targeted first.
            function getMAGCMActivePreviewTarget() {
                const pickedId = html.find('#attackTargetToken').val();
                return (pickedId && [...game.user.targets].find(t => t.id === pickedId)) || game.user.targets.first();
            }

            // Live-updates the Ranged Difficulty section: visible only for ranged weapons, shows the
            // weapon's Close/Effective/Long zone for the current distance, and a projected difficulty tier
            // combining the chosen situational modifier with the target's size vs. that distance.
            function updateRangedDifficultyPreview(activeWeaponForPreview) {
                const isRanged = activeWeaponForPreview?.type === "ranged-weapon";
                rangedDifficultyFieldset.toggle(isRanged);
                if (!isRanged) return;

                const previewTarget = getMAGCMActivePreviewTarget();
                const customDistance = Number(rangedCustomDistanceInput.val()) || 0;
                const measuredDistance = computeMAGCMRangedDistanceMeters(token, previewTarget);
                const distanceMeters = customDistance > 0 ? customDistance : (measuredDistance ?? MAGCM_RANGED_FALLBACK_DISTANCE_METERS);

                const zone = getMAGCMRangedZone(activeWeaponForPreview, distanceMeters);
                rangedZoneValueEl.text(zone ? `${zone} (${Math.round(distanceMeters)} m)` : `${Math.round(distanceMeters)} m`);

                const targetSiz = getMAGCMActorSizValue(previewTarget?.actor) ?? 0;
                const sizeIndex = getMAGCMRangedSizeIndex(targetSiz);
                const rangeIndex = Math.max(1, Math.ceil(distanceMeters / 20));
                const situationalIndex = Number(rangedSituationSelect.val()) || 0;
                const baseTierIndex = rangedSituationalModifiers[situationalIndex]?.tierIndex ?? 2;
                const steps = getMAGCMRangedDifficultySteps(rangeIndex, sizeIndex);
                const finalTierIndex = Math.min(MAGCM_DIFFICULTY_TIERS.length - 1, Math.max(0, baseTierIndex + steps));
                const finalTier = MAGCM_DIFFICULTY_TIERS[finalTierIndex];
                // A pill with its own fixed dark backdrop (see .magcm-difficulty-badge in chat-styles.css) is
                // used instead of a bare text color so "Standard" stays legible on both light and dark themes.
                rangedProjectedDifficultyValueEl.text(finalTier.text).attr("data-difficulty", finalTier.text);

                // Follow the projected difficulty into the Difficulty select, but only while nothing else
                // (a manual pick, or Charging's own shift) has moved the select away from what we last set -
                // that way a manual re-selection sticks instead of being silently overwritten later.
                const rangedTierValue = String(finalTier.mult);
                if (rangedDifficultyAutoSyncValue === null || String(difficultySelect.val()) === rangedDifficultyAutoSyncValue) {
                    difficultySelect.val(rangedTierValue);
                    rangedDifficultyAutoSyncValue = rangedTierValue;
                }
            }

            function updateAugmentSkills() {
                const augmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMAugmentOptionsForActor(augmentActor);
                html.find('#augSkill').html(buildMAGCMAugmentSkillOptions(options, `No skills available for ${augmentActor.name}`));
                html.find('#augSkill').val(options[0]?.valueKey || "");
                updateOver100Preview();
            }

            function updateCapSkills() {
                const capActor = augmentActors.find(candidate => candidate.id === capCharacterSelect.val()) || defaultAugmentActor;
                const options = getMAGCMActorSkillOptions(capActor);
                html.find('#attackCapSkill').html(options.length > 0
                    ? options.map(i => `<option value="${i.id}">${i.name} (${getMAGCMSkillValue(i)}%)</option>`).join("")
                    : `<option value="">No skills available for ${capActor.name}</option>`);
                updateOver100Preview();
            }

            // Live preview of the same combatStyleValue/diffValue math the roll callback uses, purely so the
            // over-100% checkbox row (and its displayed excess%) only appears once it would actually matter.
            function computeAttackPreviewSkillVal() {
                const skillItem = skillArray.find(s => s.name === skillSelect.val());
                let baseSkillVal = getSkillValue(skillItem);
                if (augmentCheckbox.is(':checked')) {
                    const customValue = Number(html.find('#custom-augment').val());
                    if (customValue !== 0) {
                        baseSkillVal += customValue;
                    } else {
                        const selectedAugmentActor = augmentActors.find(candidate => candidate.id === augmentCharacterSelect.val()) || defaultAugmentActor;
                        const selectedAugmentSkillOptions = getMAGCMAugmentOptionsForActor(selectedAugmentActor);
                        const augSkillEntry = selectedAugmentSkillOptions.find(option => option.valueKey === html.find('#augSkill').val()) || null;
                        if (augSkillEntry?.skill) baseSkillVal += Math.ceil(getSkillValue(augSkillEntry.skill) * 0.2);
                    }
                }
                if (capToggle.is(':checked')) {
                    const capActor = augmentActors.find(candidate => candidate.id === capCharacterSelect.val()) || defaultAugmentActor;
                    const capSkillItem = capActor.items.get(html.find('#attackCapSkill').val()) || null;
                    baseSkillVal = getMAGCMEffectiveSkillWithCap(baseSkillVal, capSkillItem);
                }
                return Math.ceil(baseSkillVal * Number(difficultySelect.val()));
            }

            function updateOver100Preview() {
                const excess = getMAGCMOver100Excess(computeAttackPreviewSkillVal());
                over100Row.toggle(excess > 0);
                over100Value.text(excess);
                if (excess <= 0) over100Checkbox.prop('checked', false);
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
            chargingCheckbox.on('change', (event) => {
                if (event.currentTarget.checked) {
                    chargingDifficultyShiftApplied = shiftAttackDifficulty(1);
                } else if (chargingDifficultyShiftApplied) {
                    shiftAttackDifficulty(-1);
                    chargingDifficultyShiftApplied = false;
                }
                updateVisibility();
            });
            damageModSubToggle.on('change', updateVisibility);
            forceRollToggle.on('change', updateVisibility);
            html.find('#unarmedReach').on('change', updateVisibility);
            rangedSituationSelect.on('change', updateVisibility);
            rangedCustomDistanceInput.on('input', updateVisibility);
            difficultySelect.on('change', updateOver100Preview);
            html.find('#custom-augment').on('input', updateOver100Preview);
            html.find('#augSkill').on('change', updateOver100Preview);
            html.find('#attackCapSkill').on('change', updateOver100Preview);
            augmentCharacterSelect.on('change', updateAugmentSkills);
            updateAugmentSkills();
            capCharacterSelect.on('change', updateCapSkills);
            updateCapSkills();
            html.find('#attackTargetToken').on('change', () => {
                const pickedId = html.find('#attackTargetToken').val();
                const selectedToken = [...game.user.targets].find(t => t.id === pickedId);
                if (selectedToken) {
                    html.find('#targetNameValue').text(selectedToken.name);
                    // Clear any custom override so the newly-picked target's own measured distance takes precedence.
                    rangedCustomDistanceInput.val("");
                }
                // Re-run the Prone/Running/Sprinting default for the newly-picked target, same guarded
                // auto-sync as the Difficulty select above - only moves the select if it's still on
                // whatever this logic itself last chose.
                const newDefaultSituationIndex = getMAGCMDefaultRangedSituationIndex(token.actor, selectedToken?.actor);
                if (Number(rangedSituationSelect.val()) === rangedSituationAutoSyncIndex) {
                    rangedSituationSelect.val(String(newDefaultSituationIndex));
                }
                rangedSituationAutoSyncIndex = newDefaultSituationIndex;
                updateVisibility();
            });
            updateVisibility();
        }
    }, { resizable: true });

    d.render(true);
}
globalThis.magcmOpenAttackDialog = magcmOpenAttackDialog;

/**
 * Mythras Unstored Items Token Popover
 * Opens a scrollable popover of unstored inventory items when Ctrl + Hovering a token.
 * Gated behind the "enableCtrlHoverTokenTooltip" module setting.
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
            max-height: 380px;
            flex-direction: column;
            overflow: hidden;
            min-width: 260px;
            box-sizing: border-box;
            pointer-events: auto;
        `;
        document.body.appendChild(popoverEl);
    }

    // Scaling this inner wrapper (rather than popoverEl itself, which is positioned via left/top set in
    // positionPopover() below) keeps that position math in un-scaled pixels - see the matching comment in
    // attachMAGCMPixiTooltip for why zooming a JS-positioned element directly breaks its own placement.
    let popoverScaleEl = popoverEl.querySelector(":scope > .magcm-popover-scale");
    if (!popoverScaleEl) {
        popoverScaleEl = document.createElement("div");
        popoverScaleEl.className = "magcm-popover-scale";
        popoverScaleEl.style.cssText = "display: flex; flex-direction: column; overflow: hidden;";
        popoverEl.appendChild(popoverScaleEl);
    }

    let activeToken = null;
    let hideTimeout = null;
    // Which popover tab is showing - defaults to "locations" until the user's saved flag (if any) loads on "ready".
    let activeTab = "locations";

    // Restore the last tab this user had open, stored on the User document so it survives refreshes,
    // logins, and module version changes (unlike a client setting, which is scoped to the browser/client).
    Hooks.once("ready", () => {
        try {
            const savedTab = game.user.getFlag(moduleId, "popoverActiveTab");
            if (savedTab === "locations" || savedTab === "items") {
                activeTab = savedTab;
            }
        } catch (e) {
            // Ignore - keep the default tab.
        }
    });

    // Filter state tracking (persists while the game session is active)
    if (!window._mythrasPopoverFilterState) {
        window._mythrasPopoverFilterState = {
            "storage": true,
            "weapons": true,
            "clothing": true,
            "trinkets": true,
            "equipment": true,
            "armor": true
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
            return game.settings.get(moduleId, "enableCtrlHoverTokenTooltip");
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
        if (!isFeatureEnabled() || !token || !token.actor || (game.modules.get("item-piles")?.active && token.actor.getFlag("item-piles", "data")?.enabled && token.actor.getFlag("item-piles", "data").type === "container")) {
            hidePopover();
            return false;
        }

        const actor = token.actor;
        const hitLocationCount = actor.items.filter(item => item.type === "hitLocation").length;

        // 1. Gather all eligible items the actor possesses
        const eligibleItems = actor.items.filter(item => {
            if (!allowedTypes.includes(item.type)) return false;

            // Filter out items stored inside other containers
            if (item.storedIn) return false;

            // Storage items must explicitly be carried at the root level
            if (item.type === "storage" && item.isCarried !== true) {
                return false;
            }

            // Natural Weapons never need equipping, so they don't belong in this "Equipped Items" tab
            if ((item.type === "melee-weapon" || item.type === "ranged-weapon") && isMAGCMNaturalWeapon(item)) {
                return false;
            }

            return true;
        });

        if (hitLocationCount === 0 && eligibleItems.length === 0) {
            hidePopover();
            return false;
        }

        // 2. Build the tab bar (shared by both tabs) and, for Equipped Items, its filter pills
        const tabOptions = [
            { id: "locations", label: "Status" },
            { id: "items", label: "Equipped Items" }
        ];
        let html = `<div style="flex-shrink: 0;">`;
        html += `<div style="display: flex; gap: 4px; border-bottom: 1px solid rgba(196, 164, 106, 0.4); margin-bottom: 6px; padding-bottom: 4px;">`;
        for (const tab of tabOptions) {
            const isActiveTab = activeTab === tab.id;
            html += `
                <div class="mythras-popover-tab-btn" data-tab="${tab.id}"
                     style="cursor: pointer; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; user-select: none;
                            background: ${isActiveTab ? "rgba(196, 164, 106, 0.3)" : "transparent"}; color: ${isActiveTab ? "#f0f0e0" : "#888"};">
                    ${tab.label}
                </div>`;
        }
        html += `</div>`;

        const filterOptions = [
            { id: "storage", label: "Storage" },
            { id: "weapons", label: "Weapons" },
            { id: "clothing", label: "Clothing" },
            { id: "trinkets", label: "Trinkets" },
            { id: "equipment", label: "Gear" },
            { id: "armor", label: "Armour" }
        ];
        if (activeTab === "items") {
            html += `<div style="display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 6px;">`;
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
            html += `</div>`;
        }
        html += `</div>`;

        // 3. Build the scrollable body for whichever tab is active
        html += `<div style="flex-grow: 1; overflow-y: auto; min-height: 0;">`;

        if (activeTab === "locations") {
            html += buildMAGCMHitLocationStatusTabHtml(actor, { includeTrackedStats: true, includeMovementStats: true });
        } else {
            const displayItems = eligibleItems.filter(item => filterState[getFilterCategory(item)] !== false);

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

            if (displayItems.length === 0) {
                const emptyLabel = eligibleItems.length === 0 ? "No equipped items found." : "All items filtered out.";
                html += `<div style="text-align: center; padding: 10px 0; font-style: italic; color: #777; font-size: 11px;">${emptyLabel}</div>`;
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
                            ${(item.type === "armor" && item.isEquipped === false) ? `
                            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
                                <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">(Carried)</span>
                            </div>` : ``}
                            ${((item.type === "melee-weapon" || item.type === "ranged-weapon") && !item.getFlag(MAGCM_MODULE_ID, "holdingLocations")?.length) ? `
                            <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; margin-right: 8px;">
                                <span style="font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">(Stowed)</span>
                            </div>` : ``}                        
                        </li>
                    `;
                }
                html += `</ul>`;
            }
        }
        html += `</div>`;

        popoverScaleEl.innerHTML = html;

        // 4. Attach click events to the tab buttons and (Equipped Items) filter pills
        popoverEl.querySelectorAll('.mythras-popover-tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                activeTab = e.currentTarget.dataset.tab;
                game.user.setFlag(moduleId, "popoverActiveTab", activeTab);
                updatePopoverContent(activeToken);
            });
        });
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

/**
 * Mythras Facing Direction Tile Overlay
 * Highlights the tiles in front, to the sides, and behind a token based on its facing direction when hovering over it during combat.
 * Gated behind the "enableFacingDirectionTileOverlay" module setting.
 */
Hooks.once("ready", () => {
    if (!game.settings.get(MAGCM_MODULE_ID, "enableFacingDirectionTileOverlay")) return;

    let facingHighlightGraphics = null;
    let currentHoveredToken = null;

    function getFacingGraphics() {
        if (!canvas?.ready) return null;
        if (!facingHighlightGraphics || facingHighlightGraphics.destroyed) {
            facingHighlightGraphics = new PIXI.Graphics();
            canvas.interface.addChild(facingHighlightGraphics);
        }
        return facingHighlightGraphics;
    }

    function clearFacingGraphics() {
        if (facingHighlightGraphics && !facingHighlightGraphics.destroyed) {
            facingHighlightGraphics.clear();
        }
    }

    Hooks.on("canvasTearDown", () => {
        if (facingHighlightGraphics && !facingHighlightGraphics.destroyed) {
            facingHighlightGraphics.destroy();
            facingHighlightGraphics = null;
        }
        currentHoveredToken = null;
    });

    function rotateOffset({ dx, dy }, N, numRotations) {
        let curX = dx;
        let curY = dy;
        for (let r = 0; r < numRotations; r++) {
            const nextX = (N - 1) - curY;
            const nextY = curX;
            curX = nextX;
            curY = nextY;
        }
        return { dx: curX, dy: curY };
    }

    function renderFacingOverlay(token) {
        const gfx = getFacingGraphics();
        if (!gfx) return;

        gfx.clear();

        if (!token || !token.hover) return;
        if (!game.combat || !game.combat.started) return;

        const isCombatant = game.combat.combatants.some(c => c.tokenId === token.id);
        if (!isCombatant) return;

        const grid = canvas.grid;
        const isSquare = grid.isSquare || grid.type === CONST.GRID_TYPES.SQUARE;
        if (!isSquare) return;

        const w = Math.round(token.document.width ?? 1);
        const h = Math.round(token.document.height ?? 1);
        if (w < 1 || w > 5 || w !== h) return;

        // Anchor to the token's true continuous position rather than snapping to whichever grid
        // cell its top-left corner falls in - keeps the overlay glued to the token (instead of
        // jumping to the surrounding cell's neighbours) when it has been shift-placed off-grid.
        const tokenLeft = token.document.x;
        const tokenTop = token.document.y;
        const rotation = ((token.document.rotation || 0) % 360 + 360) % 360;
        const sector = Math.round(rotation / 45) % 8;
        const isDiagonal = (sector % 2 === 1);
        const numRotations = Math.floor(sector / 2);

        let baseZones = [];

        if (w === 1) {
            if (!isDiagonal) {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: 1, dy: 1 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: -1, dy: 0 }, { dx: 1, dy: 0 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: 0, dy: -1 }, { dx: -1, dy: -1 }, { dx: 1, dy: -1 }] }
                ];
            } else {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: 0, dy: 1 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: 1, dy: 1 }, { dx: -1, dy: -1 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: 1, dy: 0 }, { dx: 1, dy: -1 }, { dx: 0, dy: -1 }] }
                ];
            }
        } else if (w === 2) {
            if (!isDiagonal) {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: -1, dy: 2 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }, { dx: 2, dy: 2 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: -1, dy: 0 }, { dx: -1, dy: 1 }, { dx: 2, dy: 0 }, { dx: 2, dy: 1 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 }] }
                ];
            } else {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: -1, dy: 2 }, { dx: 0, dy: 2 }, { dx: 1, dy: 2 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: 2, dy: 2 }, { dx: -1, dy: -1 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: 2, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: 0 }, { dx: 2, dy: 1 }] }
                ];
            }
        } else if (w === 3) {
            if (!isDiagonal) {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: -1, dy: 3 }, { dx: 0, dy: 3 }, { dx: 1, dy: 3 }, { dx: 2, dy: 3 }, { dx: 3, dy: 3 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: -1, dy: 0 }, { dx: -1, dy: 1 }, { dx: -1, dy: 2 }, { dx: 3, dy: 0 }, { dx: 3, dy: 1 }, { dx: 3, dy: 2 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 }, { dx: 3, dy: -1 }] }
                ];
            } else {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: -1, dy: 3 }, { dx: 0, dy: 3 }, { dx: 1, dy: 3 }, { dx: -1, dy: 2 }, { dx: -1, dy: 1 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: 2, dy: 3 }, { dx: 3, dy: 3 }, { dx: 3, dy: 2 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: 3, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 }, { dx: 3, dy: 0 }, { dx: 3, dy: 1 }] }
                ];
            }
        } else if (w === 4) {
            if (!isDiagonal) {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: -1, dy: 4 }, { dx: 0, dy: 4 }, { dx: 1, dy: 4 }, { dx: 2, dy: 4 }, { dx: 3, dy: 4 }, { dx: 4, dy: 4 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: -1, dy: 0 }, { dx: -1, dy: 1 }, { dx: -1, dy: 2 }, { dx: -1, dy: 3 }, { dx: 4, dy: 0 }, { dx: 4, dy: 1 }, { dx: 4, dy: 2 }, { dx: 4, dy: 3 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 }, { dx: 3, dy: -1 }, { dx: 4, dy: -1 }] }
                ];
            } else {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: -1, dy: 4 }, { dx: 0, dy: 4 }, { dx: 1, dy: 4 }, { dx: 2, dy: 4 }, { dx: -1, dy: 3 }, { dx: -1, dy: 2 }, { dx: -1, dy: 1 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: 3, dy: 4 }, { dx: 4, dy: 4 }, { dx: 4, dy: 3 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: 4, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 }, { dx: 3, dy: -1 }, { dx: 4, dy: 0 }, { dx: 4, dy: 1 }, { dx: 4, dy: 2 }] }
                ];
            }
        } else if (w === 5) {
            if (!isDiagonal) {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: -1, dy: 5 }, { dx: 0, dy: 5 }, { dx: 1, dy: 5 }, { dx: 2, dy: 5 }, { dx: 3, dy: 5 }, { dx: 4, dy: 5 }, { dx: 5, dy: 5 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: -1, dy: 0 }, { dx: -1, dy: 1 }, { dx: -1, dy: 2 }, { dx: -1, dy: 3 }, { dx: -1, dy: 4 }, { dx: 5, dy: 0 }, { dx: 5, dy: 1 }, { dx: 5, dy: 2 }, { dx: 5, dy: 3 }, { dx: 5, dy: 4 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }, { dx: 2, dy: -1 }, { dx: 3, dy: -1 }, { dx: 4, dy: -1 }, { dx: 5, dy: -1 }] }
                ];
            } else {
                baseZones = [
                    { color: 0x22C55E, alpha: 0.1, offsets: [{ dx: -1, dy: 5 }, { dx: 0, dy: 5 }, { dx: 1, dy: 5 }, { dx: 2, dy: 5 }, { dx: -1, dy: 4 }, { dx: -1, dy: 3 }, { dx: -1, dy: 2 }] },
                    { color: 0xEAB308, alpha: 0.1, offsets: [{ dx: 3, dy: 5 }, { dx: 4, dy: 5 }, { dx: 5, dy: 5 }, { dx: 5, dy: 4 }, { dx: 5, dy: 3 }, { dx: -1, dy: 1 }, { dx: -1, dy: 0 }, { dx: -1, dy: -1 }, { dx: 0, dy: -1 }, { dx: 1, dy: -1 }] },
                    { color: 0xEF4444, alpha: 0.1, offsets: [{ dx: 5, dy: -1 }, { dx: 2, dy: -1 }, { dx: 3, dy: -1 }, { dx: 4, dy: -1 }, { dx: 5, dy: 0 }, { dx: 5, dy: 1 }, { dx: 5, dy: 2 }] }
                ];
            }
        }

        const tileWidth = grid.sizeX ?? grid.size;
        const tileHeight = grid.sizeY ?? grid.size;

        for (const zone of baseZones) {
            for (const off of zone.offsets) {
                const rotated = rotateOffset(off, w, numRotations);

                const x = tokenLeft + rotated.dx * tileWidth;
                const y = tokenTop + rotated.dy * tileHeight;

                gfx.beginFill(zone.color, zone.alpha);
                gfx.drawRect(x, y, tileWidth, tileHeight);
                gfx.endFill();
            }
        }
    }

    // Handles hovering in and out
    Hooks.on("hoverToken", (token, hovered) => {
        if (hovered) {
            currentHoveredToken = token;
            renderFacingOverlay(token);
        } else {
            if (currentHoveredToken === token) {
                currentHoveredToken = null;
                clearFacingGraphics();
            }
        }
    });

    // Re-renders facing dynamically while hovering if the token updates/rotates
    Hooks.on("refreshToken", (token) => {
        if (currentHoveredToken && token.id === currentHoveredToken.id) {
            renderFacingOverlay(token);
        }
    });
});