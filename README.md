# Mythras - AngryGorilla's Custom Macros

A Foundry Virtual Tabletop module that turns many common Mythras combat and campaign procedures into guided dialogs, interactive chat cards, and token indicators.

The module is designed for the Foundry **Mythras** system and supports play using the **Mythras Rulebook** and expanded options commonly used from the **Mythras Companion**. It does not replace either book: the books remain the authority for when an action, Special Effect, modifier, or optional rule is appropriate.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_01_MODULE_OVERVIEW`

## Highlights

- Staged Attack cards with hit-location, damage, armour, Parry, Evade, and opposed-roll support.
- A searchable Special Effects selector filtered by weapon type, traits, criticals, and fumbles.
- Automation for Impale, Entangle, Sunder, Stun Location, Disable Attack (Press Advantage, Pin Down, Overextend Opponent), Pin Weapon, Take Cover, and weapon damage.
- Persistent melee range, weapon-hand, reload, ward, cover, and combat-state tracking.
- Compact token icons with rich tooltips for wounds, fatigue, armour, weapons, cover, engagement, impalement, entanglement, stun, and disabled attacks.
- Utilities for Action Points, Luck Points, skill improvement, currency, armour, NPC generation, and combat cleanup.
- Optional homebrew item statistics and campaign tools.

## Requirements And Compatibility

- **Foundry VTT:** Version 13 or newer.
- **Game system:** [Mythras](https://gitlab.com/kp-systems/mythras).
- **Rules:** A legal copy of the Mythras Rulebook is expected. The Mythras Companion is recommended when using expanded combat material from that book.

The module automates procedures and records state, but it does not decide whether a rule is valid for your campaign. The Games Master should resolve any difference between automation and the table's chosen printing, supplements, or house rules.

## Installation

1. Open Foundry's **Add-on Modules** tab and choose **Install Module**.
2. Paste `https://github.com/GroggyGorilla/mythras-angrygorillas-custom-macros/releases/latest/download/module.json`.
3. Install the module, enable it in a Mythras world, and reload when prompted.
4. Open the **Mythras - AngryGorilla's Custom Macros** compendium and drag the desired macros to the hotbar.

The imported macros are lightweight launchers. Their gameplay logic remains in the module, so future module updates can improve behavior without requiring the macros to be copied into the world again.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_02_MACRO_COMPENDIUM`

## Quick Start

1. Select the token that will act.
2. Target another token when the action needs a defender or recipient.
3. Run the relevant macro from the hotbar.
4. Complete the dialog, then use the resulting chat-card controls.
5. At the end of a fight, run **Clean Up Combat Flags** to remove temporary state you no longer need.

Most character-changing actions require ownership of the actor. Applying effects to an actor the player does not own may be relayed to the active GM. World-wide utilities are best run by a GM.

## Module Settings

Open **Configure Settings > Module Settings > Mythras - AngryGorilla's Custom Macros**.

| Setting | Default | Purpose |
| --- | --- | --- |
| **Bleeding Fatigue Progression** | On | At the start of a new Combat Round, advances a bleeding combatant one step along the Mythras fatigue track and posts the change to chat. |
| **Movement State Control in Combat** | Off | Enables Walk, Run, Sprint, Climb, and Swim tracking, first-turn movement prompts, and the **Set Movement State** macro. |
| **Reach Mechanics** | On | Enables persistent melee engagement ranges, range-aware Attack and Parry behavior, the **Set Melee Range** macro, and engagement indicators. |
| **Armour Overlay Icons** | On | Shows an armour indicator on tokens with equipped armour. Its tooltip groups armour by hit location. |
| **Endurance Roll Prompts in Combat** | On | Tracks combat exertion and posts Endurance prompts at intervals determined by Constitution. |
| **Angry Gorilla's Homebrew Rules and Content** | Off | Enables the homebrew **Re-roll Damage** Special Effect, custom item Quality/Fitting/Original Condition fields, and damaged or broken item badges. |
| **Show Equipped Items on Token** | Off | Holding Ctrl while hovering a token opens a filterable inventory popover for Equipped items and carried containers. |

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_03_MODULE_SETTINGS`

## Combat Workflow

### Attack

Select the attacker, target the defender, and run **Attack**. The dialog provides combat style, difficulty, weapon, augmentation, AP and Luck spending, charging, ammunition, and damage-modifier controls, plus an optional Force Roll Result to bypass the dice and set an exact 1-100 result. Forced rolls are clearly indicated with the result.

Broken, pinned, impaling, entangled, stunned, out-of-reach, and unloaded weapons are disabled with the reason shown in the weapon list. After rolling, the chat card separates the remaining steps:

1. Roll or choose the hit location.
2. Roll weapon damage.
3. Choose armour bypass, half damage, and supported Special Effect automation.
4. Apply damage.
5. Let the defender respond with **Parry**, **Evade**, or an opposed **Contest** when appropriate.

The final damage message records worn and natural armour, HP loss, and any automated secondary effect.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_04_ATTACK_DIALOG`
>
> **Screenshot placeholder:** `MAGCM_SCREENSHOT_05_ATTACK_CHAT_CARD`

### Parry And Evade

Attack chat cards expose Parry and Evade controls to the defender. These dialogs account for the original attack result and pass the relevant weapon type, traits, style traits, reach, and size into the opposed result.

Parrying weapons are unavailable if they are broken, pinned, currently impaling another target, held by an entangled arm, or held by a stunned location. The comparison reports the winner and number of Special Effects earned. Both dialogs also offer a Force Roll Result option; a forced roll is clearly marked with an icon on the roll pill and noted in its tooltip.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_06_PARRY_EVADE`

### Special Effects Selector

When an opposed result awards Special Effects, the chat card opens a selector containing offensive or defensive effects. It automatically filters for melee, ranged, or unarmed use; criticals; opponent fumbles; and weapon or Combat Style traits such as Impale, Bleed, Entangle, Sunder, Bash, Stun Location, Assassination, Siege, Firearm, and Overpenetration.

The catalogue supports the Mythras combat framework and expanded material used alongside the Mythras Companion. Use the requirements and wording in the books when deciding whether an effect applies.

The **Re-roll Damage** effect is explicitly homebrew and only appears when **Angry Gorilla's Homebrew Rules and Content** is enabled.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_07_SPECIAL_EFFECTS`

### Combat Actions Reference

Run **Combat Actions** to browse proactive, reactive, and free actions. Filters narrow the list by melee, ranged, magic, movement, or general use. Selecting an action can post its description and movement restrictions to chat, with an option to spend an Action Point for non-free actions.

This is a table reference for Rulebook actions; it does not replace the action's required roll or the GM's ruling.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_08_COMBAT_ACTIONS`

### Contested Roll (1v1)

Select one token, target another, and run **Contested Roll (1v1)** to compare two selected skills with independent difficulty grades and flat augments. This macro is retained for existing worlds but marked **deprecated** because current Mythras system rolls provide integrated opposed-roll support.

## Special Effects And Combat State

### Impale And Unimpale

Select the attacker, target the victim, and run **Impale**. Eligible equipped weapons with the Impale trait can be driven into a chosen hit location. The macro rolls damage twice, keeps the higher result, applies armour, and records the lodged weapon or projectile when damage penetrates.

Run the same macro to remove one or more impalements. Extraction may be marked safe or may apply half of the original damage. While impaled, a melee weapon cannot be used normally. The victim also receives an injected roll modifier based on the largest impaling weapon and the victim's SIZ.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_09_IMPALE_UNIMPALE`

### Entangle And Unentangle

The Attack card can mark the struck location as Entangled when an eligible weapon penetrates protection. Entangled arms prevent use of held weapons; entangled legs prevent setting a new melee engagement range; other entangled locations contribute automatic difficulty penalties.

Select the affected token and run **Unentangle** to clear one or more locations. The dialog shows the source weapon and attacker for each location.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_10_ENTANGLE`

### Stun Location

An eligible Attack can apply **Stun Location** after damage penetrates armour. The struck location remains incapacitated for a number of turns equal to the (armour-mitigated) damage dealt. Head and torso results retain their distinct narrative consequences from the Mythras effect:

- **Head:** the character is knocked senseless and cannot act at all while stunned there.
- **Chest/Torso/Abdomen:** the character can only defend (Parry/Evade) while stunned there; the **Attack** macro will refuse to open for them until it clears.
- **Arms/Legs:** only the weapon held in that specific location is disabled for Attack or Parry; the character can otherwise still act normally.

Stun is displayed as a token icon rather than a standard Active Effect. Its tooltip lists each stunned location, remaining character turns, and the weapon and character responsible.

The turn counter only counts the **stunned character's own turns** - it decrements by exactly 1 each time combat advances to that character's turn (not once per combatant's turn in the encounter), and there is no duration multiplier. When a location's counter reaches zero, the stun clears automatically.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_11_STUN_TOOLTIP`

### Disable Attack (Press Advantage, Pin Down, Overextend Opponent)

Select the token that won the special effect, target the opponent being disabled, and run **Disable Attack**. Choose which Special Effect applies - **Press Advantage**, **Pin Down**, or **Overextend Opponent** - and how many of the target's own turns it lasts (defaults to 1). The chat message names both the character causing the effect and the character affected, worded for the chosen effect.

The target displays a **Cannot Attack** token icon. Its tooltip names the specific effect, how many of the target's own turns remain, and who caused it. As with Stun Location, the counter only decrements on the affected character's own turns and clears automatically at zero. While affected, the **Attack** macro refuses to open for that character, just like a torso or head Stun Location.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_11B_DISABLE_ATTACK`

### Serious/Major Wounds &amp; Endurance Rolls

Whenever a hit location's damage newly crosses into the Serious Wound (0 HP or below) or Major Wound (negative HP equal to or beyond its maximum) threshold, the module automatically posts a chat message describing the wound's effects for that body part (head, chest/torso, abdomen, arm, or leg) along with a **Roll Endurance** button. Clicking the button opens the same skill roll dialog as clicking Endurance on the character sheet, defaulted to that skill. These location-specific wording choices are best-effort paraphrases (no rulebook text file was available to the module for exact wording) - adjust `MAGCM_WOUND_LOCATION_DESCRIPTIONS` in `esmodules/main.js` if you'd like different phrasing.

### Sunder

Select **Sunder** on an eligible Attack card to apply damage to protection. Damage reduces worn armour first, then natural armour; any remaining damage carries into the hit location. The final message itemizes each reduction. Use the Rulebook or Companion wording chosen by your table if its preferred ordering differs from this automation.

### Damage Weapon

Target the weapon's owner and run **Damage Weapon**. Choose an equipped weapon and enter the damage amount. The weapon's Armour Points resist damage; surplus reduces Hit Points, and a weapon at 0 HP is marked broken and unavailable for combat selection.

### Pin Weapon

Select your token, target any actor (yourself or an opponent), and run **Pin Weapon**. Choose **Pin a Weapon** to make one of the target's equipped weapons unusable, or **Unpin Weapon(s)** to select one or more of the target's currently pinned weapons and free them - both directions work on any target, not just yourself. Resolving the opposed action needed to pin or free a weapon remains a table decision; this macro records the result.

### Take Cover

Select a token and run **Take Cover**. Humanoids receive a body-layout dialog; other creatures receive a location list. Mark every location protected by available cover, or use **Exit Cover** to clear them all.

The macro records protected locations and displays a cover indicator. The GM still determines the cover's Armour Points and whether an attack can reach it, using the Rulebook's guidance.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_12_TAKE_COVER`

### Ward Location

Select a token and run **Ward Location** to assign a held melee weapon to one or more passively guarded locations. The indicator summarizes the warded locations and protecting weapon. The dialog records the declaration; apply the Passive Blocking rules from your chosen Mythras material when resolving a hit.

### Melee Engagement Range

**Setting required:** **Reach Mechanics**.

Select a token, target one or more opponents, and run **Set Melee Range**. Choose Touch, Short, Medium, Long, or Very Long, or clear the engagement. Range is stored on both actors and appears in a token tooltip.

Attack and Parry use this state to compare weapon Reach. The Attack dialog can establish an engagement automatically, while charging through contact avoids creating a lasting engagement.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_13_MELEE_RANGE`

## Weapons, Armour, And Equipment

### Equip Weapon

Select an owned token and run **Equip Weapon**. Assign each weapon to the hit location or locations holding it. Humanoid arms are shown first, while nonstandard locations remain available below. Holding locations drive weapon indicators and determine whether Entangle or Stun prevents use.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_14_EQUIP_WEAPON`

### Reload And Unload

Select a token and run **Reload**. Choose a held or equipped ranged weapon and enter how many Load actions are completed. Progress is stored until the weapon reaches its required Load value. The same dialog can unload it.

A ranged weapon that requires loading remains disabled in Attack until fully loaded. Firing resets its load progress.

### Add Armour

Select one or more NPC tokens and run **Add Armour**. Choose a complete armour type or a different type for each standard humanoid hit location. Existing armour on a location is left in place.

This utility expects a world Item compendium with collection ID `world.armour`. Complete sets use configured document IDs; custom sets look for pieces named with the expected armour type and location suffix, such as `Padded Armour [Head]` or `Mail [R.Arm]`. Player-owned actors are skipped, so this is intended as a GM preparation tool.

### Homebrew Item Statistics

**Setting required:** **Angry Gorilla's Homebrew Rules and Content**.

Supported equipment sheets gain fields for current and original Quality, original Value, original AP or HP, fitting SIZ and Frame, and armour body part. When original AP or HP is recorded, damaged and broken badges compare current condition with the original in token equipment tooltips.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_15_HOMEBREW_ITEM_FIELDS`

## Movement, Fatigue, And Endurance

### Set Movement State

**Setting required:** **Movement State Control in Combat**.

Select a token, or assign a default character to your user, and run **Set Movement State**. Choose Walk, Run, Sprint, Climb, Swim, or clear the state. It is represented by an Active Effect with its own icon.

During combat, the active GM posts a movement prompt for each combatant on their first turn of each round. Use the Rulebook's gait, action, and movement restrictions when choosing a state.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_16_MOVEMENT_STATE`

### Bleeding Fatigue Progression

**Setting required:** **Bleeding Fatigue Progression**.

At the start of a Combat Round, a combatant with Foundry's Bleeding status advances one step along the fatigue track: Fresh, Winded, Tired, Wearied, Exhausted, Debilitated, Incapacitated, Semi-conscious, Comatose, and Dead. The GM should remove Bleeding when treatment or circumstances end the effect.

### Endurance Prompts

**Setting required:** **Endurance Roll Prompts in Combat**.

The module tracks completed rounds and uses Constitution to determine when the current combatant receives an Endurance prompt. The chat button rolls the actor's Endurance skill and reports the result.

### Fatigue Indicator

Any fatigue state other than Fresh displays a 16x16 token indicator whose tooltip shows the current level. It updates whenever fatigue changes, including changes caused by Bleeding progression.

### Manual Fatigue Change Announcements

Whenever a character's fatigue level is changed directly (e.g. the GM editing the character sheet) rather than through Bleeding Fatigue Progression, the module posts a chat message noting the change and how long it would take the character to recover back to Fresh. This message is skipped when the change was caused by Bleeding progression, since that hook already posts its own message.

## Token Indicators And Tooltips

Indicators are small and semi-transparent so they communicate state without covering the token. Hover an indicator for details. Indicators do not show tooltips while their canvas position is covered by a Foundry sheet, dialog, or other window.

### Wounds

Hit-location HP automatically produces Minor, Serious, or Major Wound indicators. Humanoid tooltips use a body layout; non-humanoids receive a sorted list. This display does not change damage or healing rules.

### Held Weapons

Held weapons appear according to assigned holding locations. Tooltips show weapon statistics and states such as damage, breakage, pinning, impalement, and reload progress.

### Armour

**Setting required:** **Armour Overlay Icons**.

Tokens with equipped armour receive an indicator. Its tooltip groups armour by hit location and shows homebrew condition badges when that setting and the required original values are present.

### Other Combat Indicators

Impale, Entangle, Stun, Disable Attack, Fatigue, Cover, Ward, and Engagement each have dedicated indicators. Their tooltips summarize affected locations, sources, remaining duration, equipment, or opponents as appropriate.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_17_TOKEN_INDICATORS`

### Equipped Items Popover

**Setting required:** **Show Equipped Items on Token**.

Hold Ctrl while hovering a token to inspect its Equipped inventory. The popover distinguishes directly equipped items from carried and stowed contents and offers filters for quicker scanning.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_18_EQUIPPED_ITEMS_POPOVER`

## Character And Campaign Utilities

### Restore Action Points

Select one or more tokens and run **Restore AP of Selected Tokens**. Each actor's Action Points are restored to its calculated maximum.

### Restore Luck Points

Run **Restore Luck Points of All Player Characters** to restore each non-GM user's assigned character to maximum Luck Points. Users without an assigned character are reported and skipped. This is best run by the GM.

### Upgrade Skill

Select a token and run **Upgrade Skill**, then choose a Standard, Professional, Combat Style, or Magic skill.

- With **Custom Change** enabled, enter a direct training increase and optional reason.
- Otherwise, the macro spends one Experience Roll and rolls `1d100 + INT` against the skill value.
- A successful improvement roll adds `1d4 + 1` training; a failed roll adds 1 training.

The result and remaining Experience Rolls are posted to chat.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_19_UPGRADE_SKILL`

### Manage Currency

Select a token and run **Manage Currency**. Enter an amount for each currency item, choose whether it is paid or received, and optionally record a reason. The complete payment is validated before any balance changes, then an old/changed/new summary is posted to chat.

### Randomize Build

Select one or more NPC tokens and run **Randomize Build**. Choose levels for characteristics and Physical, Utility, Deception, Social, and Combat skills. The macro rolls new values, restores AP, and refreshes hit-location HP.

Player-owned actors are skipped. This is a campaign utility, not a Rulebook character-creation method; review its result bands for your creatures and campaign power level.

### Clean Up Combat Flags

Run **Clean Up Combat Flags** after a battle or when testing stateful features. If tokens are selected, only their actors are processed; otherwise all world actors are considered.

The dialog can independently clear melee engagements, movement states, wards, cover, held weapon assignments, reload progress, pinned or impaling weapons, impaled, entangled, or stunned locations, and Disable Attack effects. This is a broad maintenance operation and is best run by the GM.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_20_COMBAT_CLEANUP`

## Campaign-Specific Tools

### Tavern Menu Generator

Run **Food Menu Generator** to create a private GM tavern menu. Choose culinary regions, establishment quality, settlement size, economy multiplier, and numbers of food and drink options. Prices account for scarcity, and the menu is whispered to GMs. This is a narrative aid with no Mythras mechanical effect.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_21_TAVERN_MENU`

### Aberration (Alcoholize)

The **Alcoholize** macro supports the campaign-specific skill `Aberration (Alcoholize)`. Select a character with that skill, then choose alcohol type, units, Magic Points spent, starting Success Score, and any cap or augmentation.

Each brewing round spends Magic Points, advances time, and changes Success Score and quality. Chat buttons continue to the next round or spend Luck to reroll. This feature is explicit homebrew and can be ignored in campaigns that do not use the skill.

> **Screenshot placeholder:** `MAGCM_SCREENSHOT_22_ALCOHOLIZE`

## Rules And Homebrew At A Glance

### Rulebook-Oriented Automation

The module assists with Action Points, Luck Points, attacks, hit locations, armour, Parry, Evade, opposed outcomes, fatigue, Bleed, weapon Reach, cover, and combat Special Effects. It reduces bookkeeping while leaving eligibility and interpretation with the GM.

### Companion And Expanded Combat Options

The Special Effects catalogue includes expanded combat options intended for tables using broader Mythras material, including the Mythras Companion. Supplements and campaign assumptions vary, so the module filters by roll state and traits but does not certify that every displayed effect is valid in every encounter.

### Explicit Homebrew

Enable **Angry Gorilla's Homebrew Rules and Content** only if the table wants the Re-roll Damage Special Effect, custom item Quality/Fitting/Original Condition fields, and damaged or broken equipment badges.

Alcoholize, Randomize Build bands, tavern menu data, and persistent Foundry tracking for equipment hands, reload progress, and combat states are also module conveniences rather than replacements for published rules.

## Troubleshooting

### A macro says its function is not loaded

Confirm the module is enabled, then reload the world. Imported macros only launch functions supplied by the active module.

### A ranged weapon says Not loaded

Run **Reload** and complete the required Load actions. Weapons with a Load value of 0 do not require this step.

### A weapon does not appear in Attack or Parry

Run **Equip Weapon** and assign it to a holding location. Also check whether it is broken, pinned, lodged in another target, held by an entangled or stunned location, outside usable Reach, or not fully loaded.

### Add Armour cannot find armour

Confirm that the world has an Item compendium with collection ID `world.armour`, and custom pieces follow the naming convention shown in the dialog.

### Movement controls are unavailable

Enable **Movement State Control in Combat** and reload the world so its combat hooks and dialog helpers initialize.

### An indicator is stale

Update the associated actor/item once or refresh the scene. If old combat flags are no longer valid, run **Clean Up Combat Flags**.

### A tooltip appears in the wrong place

Use a supported browser zoom level. Indicator tooltips intentionally remain hidden while their canvas position is covered by a Foundry window.

## Credits

- **Module author:** Amir Goriya / AngryGorilla.
- **System:** [Mythras for Foundry VTT](https://gitlab.com/kp-systems/mythras).
- The Attack workflow was originally inspired by DogBoneZone's all-in-one combat macro and has since been expanded substantially for this module.

Mythras and related product names belong to their respective rights holders. This is an independent community module.
