(async () => {
    const MODULE_ID = "mythras-angrygorillas-custom-macros";

    // 1. Token & Permission Checks
    const token = canvas.tokens.controlled[0];
    if (!token) {
        ui.notifications.warn("Please select a token first.");
        return;
    }

    const actor = token.actor;
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
        ui.notifications.error("You do not have permission to manage weapons for this actor.");
        return;
    }

    // 2. Fetch Weapons & Hit Locations
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");
    const weapons = actor.items.filter(i => i.type === "melee-weapon" || i.type === "ranged-weapon");

    if (hitLocations.length === 0) {
        ui.notifications.warn(`${actor.name} has no hit location items.`);
        return;
    }

    // Helper: Find which weapon currently holds a given location ID
    const getHeldWeaponForLocation = (locId) => {
        return weapons.find(w => {
            const locs = w.getFlag(MODULE_ID, "holdingLocations") || [];
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
                <legend style="font-weight: bold; color: #7a0000; padding: 0 6px;">Primary Arms</legend>
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
                        const oldLocs = weapon.getFlag(MODULE_ID, "holdingLocations") || [];

                        // Only write flag updates if something changed
                        const isChanged = newLocs.length !== oldLocs.length || !newLocs.every(id => oldLocs.includes(id));
                        if (isChanged) {
                            await weapon.setFlag(MODULE_ID, "holdingLocations", newLocs);
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
})();