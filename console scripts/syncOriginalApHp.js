/**
 * This script is intended to be run in the Foundry VTT console (or pasted into a Script-type macro),
 * while the "eoha" world is loaded.
 *
 * Interim utility (before Phase 5 migration): sets each item's Original Condition AP/HP flags
 * (flags.mythras-angrygorillas-custom-macros.customData.originalAp / originalHp) to match that item's
 * CURRENT system.ap / system.hp values, across the same 7 world compendiums used by the description
 * cleanup pass (tools/weapons/armour/clothing/vehicles/storage/currency). This effectively "resets"
 * the damaged/broken baseline to each item's present-day stats.
 *
 * Which field(s) apply depends on item type, mirroring the exact rule the item sheet itself uses in
 * esmodules/main.js's renderItemSheet hook (hasOriginalAp / hasOriginalHp):
 *   - "armor": originalAp only (system.ap -> customData.originalAp). Armor has no HP tracking.
 *   - "melee-weapon" / "ranged-weapon": both originalAp (system.ap) and originalHp (system.hp).
 *   - "equipment": both originalAp and originalHp, same as weapons.
 *   - any other type (currency, storage, etc.): skipped entirely - not tracked by the module.
 *
 * DRY_RUN (default true): computes and reports every change WITHOUT writing anything - downloads a
 * JSON report of every item whose originalAp/originalHp would change (old vs new value) for review.
 * Only set DRY_RUN = false and re-run once the report has been reviewed and approved - that pass
 * performs the actual item.update() calls. Each of the 14 compendiums (7 world + 7 module, since Phase
 * 5 already migrated copies into the module) must be UNLOCKED first or the write pass will skip it
 * with a warning.
 *
 * Written on 2026-09-02
 * Written by Angry Gorilla
 */

const DRY_RUN = false;

const PACK_NAMES = ["tools", "weapons", "armour", "clothing", "vehicles", "storage", "currency"];
const MODULE_ID = "mythras-angrygorillas-custom-macros";
// Run against both the world source packs and the already-migrated module copies, since Phase 5 baked
// whatever customData existed at copy time into the module packs too.
const PACK_ID_PREFIXES = ["world", MODULE_ID];

function getApplicableFields(type) {
    if (type === "armor") return { ap: true, hp: false };
    if (type === "melee-weapon" || type === "ranged-weapon") return { ap: true, hp: true };
    if (type === "equipment") return { ap: true, hp: true };
    return { ap: false, hp: false };
}

// Returns null if no update is needed (current original value already numerically matches).
function computeFieldChange(customData, fieldName, currentRaw) {
    const currentNum = Number(currentRaw);
    if (!Number.isFinite(currentNum)) return null;
    const prevRaw = customData[fieldName];
    const prevIsBlank = prevRaw === undefined || prevRaw === null || prevRaw === "";
    // Number("") is 0, so a blank prevRaw must never be compared numerically - it would false-match a current value of 0.
    if (!prevIsBlank && Number(prevRaw) === currentNum) return null;
    return { from: prevRaw ?? "", to: currentNum };
}

(async () => {
    const results = [];
    const summary = [];

    for (const prefix of PACK_ID_PREFIXES) {
        for (const packName of PACK_NAMES) {
            const packId = `${prefix}.${packName}`;
            const pack = game.packs.get(packId);
            if (!pack) {
                summary.push(`${packId}: NOT FOUND`);
                continue;
            }

            const items = await pack.getDocuments();
            let changedCount = 0;
            const packLocked = pack.locked;

            for (const item of items) {
                const { ap: apApplies, hp: hpApplies } = getApplicableFields(item.type);
                if (!apApplies && !hpApplies) continue;

                const customData = item.getFlag(MODULE_ID, "customData") || {};
                const updateData = {};
                const changeInfo = {};

                if (apApplies) {
                    const apChange = computeFieldChange(customData, "originalAp", item.system?.ap);
                    if (apChange) {
                        updateData[`flags.${MODULE_ID}.customData.originalAp`] = apChange.to;
                        changeInfo.ap = apChange;
                    }
                }
                if (hpApplies) {
                    const hpChange = computeFieldChange(customData, "originalHp", item.system?.hp);
                    if (hpChange) {
                        updateData[`flags.${MODULE_ID}.customData.originalHp`] = hpChange.to;
                        changeInfo.hp = hpChange;
                    }
                }

                if (Object.keys(updateData).length === 0) continue;

                changedCount++;
                results.push({ pack: packId, id: item.id, name: item.name, type: item.type, ...changeInfo });

                if (!DRY_RUN) {
                    if (packLocked) continue; // reported in summary below, skipped individually
                    await item.update(updateData);
                }
            }

            summary.push(`${packId}: ${changedCount} item(s) would change${packLocked ? " (COMPENDIUM LOCKED - writes skipped)" : ""}`);
        }
    }

    console.log(summary.join("\n"));
    const mode = DRY_RUN ? "DRY RUN - no changes written" : "LIVE - changes written where compendiums were unlocked";
    ui.notifications.info(`Original AP/HP sync (${mode}): ${results.length} item(s) affected. Downloading report...`);

    foundry.utils.saveDataToFile(JSON.stringify(results, null, 2), "text/json", "eoha-ap-hp-sync-report.json");
})();
