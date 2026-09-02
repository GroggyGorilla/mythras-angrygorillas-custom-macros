/**
 * This script is intended to be run in the Foundry VTT console (or pasted into a Script-type macro),
 * while the "eoha" world is loaded.
 *
 * Phase 0 of the item-description cleanup effort: dumps the FULL, uncompressed raw HTML of every
 * item's description across the world's tools/weapons/armour/clothing/vehicles/storage/currency
 * compendiums, for every item whose description isn't meaningfully empty (ignores items whose
 * description is just "" or empty markup like "<p>&nbsp;</p>"). This is read-only - it does not
 * modify anything.
 *
 * Output is downloaded as a single JSON file (one entry per non-empty item description, including
 * pack/name/type/id) so the raw formatting can be reviewed in full before any cleanup parser is
 * designed - filesystem-level inspection of the LevelDB packs is only partially legible, so this is
 * the only reliable way to see the real, uncompressed HTML.
 *
 * Written on 2026-09-02
 * Written by Angry Gorilla
 */

const PACK_NAMES = ["tools", "weapons", "armour", "clothing", "vehicles", "storage", "currency"];
const WORLD_ID = "world";

function isMeaningfullyEmpty(description) {
    if (!description) return true;
    const text = description.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, "").trim();
    return text.length === 0;
}

(async () => {
    const results = [];
    const summary = [];

    for (const packName of PACK_NAMES) {
        const packId = `${WORLD_ID}.${packName}`;
        const pack = game.packs.get(packId);
        if (!pack) {
            summary.push(`${packId}: NOT FOUND`);
            continue;
        }

        const items = await pack.getDocuments();
        let nonEmptyCount = 0;

        for (const item of items) {
            const description = item.system?.description ?? "";
            if (isMeaningfullyEmpty(description)) continue;

            nonEmptyCount++;
            results.push({
                pack: packId,
                id: item.id,
                name: item.name,
                type: item.type,
                description
            });
        }

        summary.push(`${packId}: ${nonEmptyCount} of ${items.length} item(s) have a non-empty description`);
    }

    console.log(summary.join("\n"));
    ui.notifications.info(`Found ${results.length} item(s) with non-empty descriptions across ${PACK_NAMES.length} packs. Downloading JSON...`);

    foundry.utils.saveDataToFile(JSON.stringify(results, null, 2), "text/json", "eoha-item-descriptions.json");
})();
