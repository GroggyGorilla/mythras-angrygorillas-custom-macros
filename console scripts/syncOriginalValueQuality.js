/**
 * This script is intended to be run in the Foundry VTT console (or pasted into a Script-type macro),
 * while the "eoha" world is loaded.
 *
 * Interim utility (before Phase 5 migration): syncs each item's Value and Quality flags across the
 * same 7 world compendiums used by the description cleanup and AP/HP sync passes
 * (tools/weapons/armour/clothing/vehicles/storage/currency).
 *
 * Value syncs originalValue -> item.system.value, same direction as the AP/HP script.
 *
 * Quality syncs the OPPOSITE direction: when customData.originalQuality differs from
 * customData.currentQuality, currentQuality is updated to match originalQuality. This is reversed
 * because currentQuality commonly defaults to "Reasonable" simply because it was never explicitly
 * set on the item sheet, not because the item's quality actually changed - originalQuality is the
 * trustworthy value in that case, so it wins.
 *
 * Which field(s) apply depends on item type, mirroring the exact rule the item sheet itself uses in
 * esmodules/main.js's renderItemSheet hook (hasValuesAndQualities):
 *   - "armor", "equipment", "melee-weapon", "ranged-weapon": both originalValue and originalQuality.
 *   - any other type (currency, storage, vehicles): skipped entirely - not tracked by the module.
 *
 * DRY_RUN (default true): computes and reports every change WITHOUT writing anything - downloads a
 * JSON report of every item whose originalValue/originalQuality would change (old vs new value) for
 * review. Only set DRY_RUN = false and re-run once the report has been reviewed and approved - that
 * pass performs the actual item.update() calls. Each of the 14 compendiums (7 world + 7 module, since
 * Phase 5 already migrated copies into the module) must be UNLOCKED first or the write pass will skip
 * it with a warning.
 *
 * Written on 2026-09-02
 * Written by Angry Gorilla
 */

const DRY_RUN = true;

const PACK_NAMES = ["tools", "weapons", "armour", "clothing", "vehicles", "storage", "currency"];
const MODULE_ID = "mythras-angrygorillas-custom-macros";
// Run against both the world source packs and the already-migrated module copies, since Phase 5 baked
// whatever customData existed at copy time into the module packs too.
const PACK_ID_PREFIXES = ["world", MODULE_ID];

function hasValuesAndQualities(type) {
    return ["armor", "equipment", "melee-weapon", "ranged-weapon"].includes(type);
}

// Returns null if no update is needed (current original value already numerically matches).
function computeValueChange(customData, currentRaw) {
    const currentNum = Number(currentRaw);
    if (!Number.isFinite(currentNum)) return null;
    const prevRaw = customData.originalValue;
    const prevIsBlank = prevRaw === undefined || prevRaw === null || prevRaw === "";
    // Number("") is 0, so a blank prevRaw must never be compared numerically - it would false-match a current value of 0.
    if (!prevIsBlank && Number(prevRaw) === currentNum) return null;
    return { from: prevRaw ?? "", to: currentNum };
}

// Returns null if no update is needed (currentQuality already matches originalQuality).
function computeQualityChange(customData) {
    const currentQuality = customData.currentQuality ?? "Reasonable";
    const originalQuality = customData.originalQuality ?? "Reasonable";
    if (currentQuality === originalQuality) return null;
    return { from: currentQuality, to: originalQuality };
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
                if (!hasValuesAndQualities(item.type)) continue;

                const customData = item.getFlag(MODULE_ID, "customData") || {};
                const updateData = {};
                const changeInfo = {};

                const valueChange = computeValueChange(customData, item.system?.value);
                if (valueChange) {
                    updateData[`flags.${MODULE_ID}.customData.originalValue`] = valueChange.to;
                    changeInfo.value = valueChange;
                }

                const qualityChange = computeQualityChange(customData);
                if (qualityChange) {
                    updateData[`flags.${MODULE_ID}.customData.currentQuality`] = qualityChange.to;
                    changeInfo.quality = qualityChange;
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
    ui.notifications.info(`Original Value/Quality sync (${mode}): ${results.length} item(s) affected. Downloading report...`);

    foundry.utils.saveDataToFile(JSON.stringify(results, null, 2), "text/json", "eoha-value-quality-sync-report.json");
})();
