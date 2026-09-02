/**
 * This script is intended to be run in the Foundry VTT console (or pasted into a Script-type macro),
 * while the "eoha" world is loaded.
 *
 * Phase 4 of the item-description cleanup effort: strips the legacy Original/Quality/Value/Fitting/
 * SIZ/Frame stat-table HTML from every item's description across the world's tools/weapons/armour/
 * clothing/vehicles/storage/currency compendiums, since that data is now tracked via this module's
 * flag fields (customData.originalQuality/originalValue/originalAp/originalHp/fittingSiz/fittingFrame).
 * Everything else in a description (blank or not - e.g. Source/Language/Contents templates, potion
 * Difficulty/Usage & Effects, Length/Duration, Crew Min/Max, vehicle Capacity/Drawn By/Seats, flavor
 * text) is left completely untouched, since none of it duplicates a tracked system/flag field.
 *
 * DRY_RUN (default true): computes and reports every change WITHOUT writing anything - downloads a
 * JSON report of every item whose description would change (old vs new HTML) for review. Only set
 * DRY_RUN = false and re-run once the report has been reviewed and approved - that pass performs the
 * actual item.update() calls. Each of the 7 compendiums must be UNLOCKED first or the write pass will
 * skip it with a warning.
 *
 * Algorithm: for each top-level <table> in a description, walks its rows/cells building a virtual
 * grid that expands colspan/rowspan, tracking each column's current label (a cell counts as a label
 * if its innerHTML starts with <strong>). A cell is deleted if either (a) it IS a label whose
 * normalized text matches the core set below, or (b) it's a value cell sitting in a column whose
 * label is core. This naturally handles both "the whole table is core" (every cell ends up deleted,
 * so the whole table is pruned) and "an extra non-core column is baked into the same table via
 * colspan/rowspan" (e.g. Torch's Duration, potions' Difficulty) without needing separate logic for
 * each shape. After deletion, empty rows are pruned, then empty tables are pruned (along with a
 * leading <hr> left dangling at the very start of the description).
 *
 * Written on 2026-09-02
 * Written by Angry Gorilla
 */

const DRY_RUN = false;

const PACK_NAMES = ["tools", "weapons", "armour", "clothing", "vehicles", "storage", "currency"];
const WORLD_ID = "world";
const CORE_LABELS = new Set(["original", "quality", "value", "fitting", "siz", "frame"]);

function normText(t) {
    if (!t) return "";
    return t.replace(/\u00a0/g, " ").replace(/&nbsp;/gi, " ").replace(/\s+/g, " ").trim();
}

function isLabelCell(cell) {
    return /^\s*(<p[^>]*>)?\s*<strong/i.test(cell.innerHTML);
}

function getTopLevelTables(container) {
    return Array.from(container.getElementsByTagName("table")).filter(table => {
        let p = table.parentElement;
        while (p && p !== container) {
            if (p.tagName === "TABLE") return false;
            p = p.parentElement;
        }
        return true;
    });
}

// Builds the (cell -> delete?) decision map for one table, per the core-label rule described above.
function analyzeTable(table) {
    const rows = Array.from(table.rows);
    const colLabel = {};
    const carry = {};
    const decisions = new Map(); // cell -> { delete, originRow, rowspan }
    for (let r = 0; r < rows.length; r++) {
        const cells = Array.from(rows[r].cells);
        let maxCarryCol = -1;
        for (const k of Object.keys(carry)) maxCarryCol = Math.max(maxCarryCol, Number(k));
        let col = 0, cellIdx = 0;
        while (cellIdx < cells.length || col <= maxCarryCol) {
            if (carry[col]) {
                carry[col].remaining -= 1;
                if (carry[col].remaining <= 0) delete carry[col];
                col++;
                continue;
            }
            if (cellIdx >= cells.length) { col++; continue; }
            const cell = cells[cellIdx];
            const colspan = Math.max(1, cell.colSpan || 1);
            const rowspan = Math.max(1, cell.rowSpan || 1);
            const isLabel = isLabelCell(cell);
            const text = normText(cell.innerText);
            let shouldDelete;
            if (isLabel) {
                shouldDelete = CORE_LABELS.has(text.toLowerCase());
                for (let k = 0; k < colspan; k++) colLabel[col + k] = text;
            } else {
                shouldDelete = CORE_LABELS.has((colLabel[col] || "").toLowerCase());
            }
            decisions.set(cell, { delete: shouldDelete, originRow: r, rowspan });
            if (rowspan > 1) {
                for (let k = 0; k < colspan; k++) carry[col + k] = { remaining: rowspan - 1 };
            }
            col += colspan;
            cellIdx++;
        }
    }
    return decisions;
}

function stripCoreFromTable(table, mutated) {
    const decisions = analyzeTable(table);
    if (![...decisions.values()].some(info => info.delete)) return;
    const rowCount = table.rows.length;
    const rowSurvives = new Array(rowCount).fill(false);
    for (const info of decisions.values()) {
        if (!info.delete) rowSurvives[info.originRow] = true;
    }
    // Clamp rowSpan on surviving cells down to however many of their originally-spanned rows still exist.
    for (const [cell, info] of decisions.entries()) {
        if (info.delete || info.rowspan <= 1) continue;
        let survivingExtra = 0;
        for (let j = info.originRow + 1; j < Math.min(rowCount, info.originRow + info.rowspan); j++) {
            if (rowSurvives[j]) survivingExtra++;
        }
        const newSpan = Math.max(1, 1 + survivingExtra);
        if (newSpan !== info.rowspan) cell.rowSpan = newSpan;
    }
    for (const [cell, info] of decisions.entries()) {
        if (info.delete) cell.remove();
    }
    for (const row of Array.from(table.rows)) {
        if (row.cells.length === 0) row.remove();
    }
    if (table.rows.length === 0) {
        const next = table.nextElementSibling;
        const isLeading = table.parentElement.firstElementChild === table;
        table.remove();
        if (isLeading && next && next.tagName === "HR") next.remove();
    }
    mutated.count++;
}

// Compares by tracked mutation count, not old-vs-new HTML string equality, so an item with nothing to
// strip is guaranteed to come back byte-for-byte identical (innerHTML round-tripping through a detached
// <div> can otherwise reformat attributes/entities even when no table was touched at all).
function stripCoreFromDescription(html) {
    if (!html) return { changed: false, newHtml: html };
    const container = document.createElement("div");
    container.innerHTML = html;
    const mutated = { count: 0 };
    for (const table of getTopLevelTables(container)) {
        stripCoreFromTable(table, mutated);
    }
    return mutated.count > 0 ? { changed: true, newHtml: container.innerHTML } : { changed: false, newHtml: html };
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
        let changedCount = 0;
        const packLocked = pack.locked;

        for (const item of items) {
            const oldDescription = item.system?.description ?? "";
            if (!oldDescription) continue;

            let outcome;
            try {
                outcome = stripCoreFromDescription(oldDescription);
            } catch (err) {
                results.push({ pack: packId, id: item.id, name: item.name, type: item.type, error: String(err) });
                continue;
            }
            if (!outcome.changed) continue;

            changedCount++;
            results.push({
                pack: packId,
                id: item.id,
                name: item.name,
                type: item.type,
                oldDescription,
                newDescription: outcome.newHtml
            });

            if (!DRY_RUN) {
                if (packLocked) continue; // reported in summary below, skipped individually
                await item.update({ "system.description": outcome.newHtml });
            }
        }

        summary.push(`${packId}: ${changedCount} item(s) would change${packLocked ? " (COMPENDIUM LOCKED - writes skipped)" : ""}`);
    }

    console.log(summary.join("\n"));
    const mode = DRY_RUN ? "DRY RUN - no changes written" : "LIVE - changes written where compendiums were unlocked";
    ui.notifications.info(`Description cleanup (${mode}): ${results.length} item(s) affected. Downloading report...`);

    foundry.utils.saveDataToFile(JSON.stringify(results, null, 2), "text/json", "eoha-description-cleanup-report.json");
})();
