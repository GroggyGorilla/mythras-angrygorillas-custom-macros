(async () => {
    const MODULE_ID = "mythras-angrygorillas-custom-macros";

    // 1. Token & Permission Verification
    const token = canvas.tokens.controlled[0];
    if (!token) {
        ui.notifications.warn("Please select a token first.");
        return;
    }

    const actor = token.actor;
    if (!actor || (!game.user.isGM && !actor.isOwner)) {
        ui.notifications.error("You do not have permission to configure this actor.");
        return;
    }

    // 2. Fetch Hit Locations
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");

    if (hitLocations.length === 0) {
        ui.notifications.warn(`${actor.name} has no hit location items.`);
        return;
    }

    const entangledLocations = hitLocations.filter(loc => loc.getFlag(MODULE_ID, "entangledBy"));
    if (entangledLocations.length === 0) {
        ui.notifications.info(`${actor.name} has no entangled hit locations.`);
        return;
    }

    // Helper: Build the checkbox HTML for a hit location (only entangled locations are actionable)
    const renderCheckbox = (locItem) => {
        const entangleData = locItem.getFlag(MODULE_ID, "entangledBy");
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
                        if (locItem?.getFlag(MODULE_ID, "entangledBy")) {
                            await locItem.unsetFlag(MODULE_ID, "entangledBy");
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
})();
