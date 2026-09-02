/**
 * This script is intended to be run in the Foundry VTT console (or pasted into a Script-type macro).
 * It copies every folder and document from each of the 7 world Item compendiums into the matching
 * module compendium in one run, so packs don't have to be done individually. Safe to re-run: any
 * source folder/document whose id (folders) or name (documents) already exists in the destination
 * pack is skipped, rather than creating a duplicate.
 *
 * Folders are copied FIRST and with keepId:true, so their ids in the destination pack exactly match
 * the source pack. This is what lets each item's own `folder` field (copied as-is via toObject())
 * keep pointing at a valid folder - if folders aren't copied (or are copied with new/random ids),
 * every item ends up sitting at the pack root even though its `folder` field looks populated.
 *
 * Pack pairs are derived from PACK_NAMES as "world.<name>" -> "<MODULE_ID>.<name>". To list every
 * pack id currently loaded, run: game.packs.contents.map(p => p.collection)
 */

const PACK_NAMES = ["tools", "weapons", "armour", "clothing", "vehicles", "storage", "currency"];
const WORLD_ID = "world";
const MODULE_ID = "mythras-angrygorillas-custom-macros";

// Sorts parent folders before their children so `folder` (parent) references always resolve in order.
function sortFoldersByDepth(folderObjs) {
    const byId = new Map(folderObjs.map(f => [f._id, f]));
    function depth(folder) {
        let d = 0;
        let current = folder;
        const seen = new Set();
        while (current?.folder && !seen.has(current._id)) {
            seen.add(current._id);
            current = byId.get(current.folder);
            d++;
        }
        return d;
    }
    return [...folderObjs].sort((a, b) => depth(a) - depth(b));
}

(async () => {
    const Folder = foundry.utils.getDocumentClass("Folder");
    const summary = [];

    for (const packName of PACK_NAMES) {
        const sourcePackId = `${WORLD_ID}.${packName}`;
        const destPackId = `${MODULE_ID}.${packName}`;

        try {
            const sourcePack = game.packs.get(sourcePackId);
            const destPack = game.packs.get(destPackId);

            if (!sourcePack) {
                summary.push(`${sourcePackId}: SOURCE NOT FOUND`);
                continue;
            }
            if (!destPack) {
                summary.push(`${destPackId}: DESTINATION NOT FOUND`);
                continue;
            }
            if (sourcePack.metadata.type !== destPack.metadata.type) {
                summary.push(`${packName}: TYPE MISMATCH ("${sourcePack.title}" is ${sourcePack.metadata.type}, "${destPack.title}" is ${destPack.metadata.type})`);
                continue;
            }

            // 1. Copy folders first, preserving their original ids so item.folder references still resolve.
            const existingDestFolderIds = new Set(destPack.folders.contents.map(f => f.id));
            const foldersToCreate = sortFoldersByDepth(
                sourcePack.folders.contents
                    .map(f => f.toObject())
                    .filter(f => !existingDestFolderIds.has(f._id))
            );
            let foldersCreated = 0;
            if (foldersToCreate.length) {
                const created = await Folder.createDocuments(foldersToCreate, { pack: destPack.collection, keepId: true });
                foldersCreated = created.length;
            }

            // 2. Copy documents, skipping any whose name already exists in the destination.
            const sourceDocs = await sourcePack.getDocuments();
            if (!sourceDocs.length) {
                summary.push(`${packName}: source is empty, nothing to copy (${foldersCreated} folder(s) created)`);
                continue;
            }

            await destPack.getIndex();
            const destNames = new Set(destPack.index.map(entry => entry.name.toLowerCase()));

            const toCreate = sourceDocs.filter(doc => !destNames.has(doc.name.toLowerCase()));
            const skipped = sourceDocs.length - toCreate.length;

            if (!toCreate.length) {
                summary.push(`${packName}: ${foldersCreated} folder(s) created, nothing to copy - all ${sourceDocs.length} document(s) already exist in destination by name`);
                continue;
            }

            const created = await destPack.documentClass.createDocuments(
                toCreate.map(doc => doc.toObject()),
                { pack: destPack.collection }
            );

            summary.push(`${packName}: ${foldersCreated} folder(s) created, copied ${created.length} document(s)${skipped ? ` (skipped ${skipped} already present)` : ""}`);
        } catch (err) {
            summary.push(`${packName}: ERROR - ${err.message}`);
            console.error(err);
        }
    }

    console.log(summary.join("\n"));
    ui.notifications.info(`Compendium copy complete. See console for per-pack summary.`);
})();
