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

    // Helper: Build the checkbox HTML for a hit location
    const renderCheckbox = (locItem) => {
        const isInCover = locItem.getFlag(MODULE_ID, "inCover") ?? true;
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
    const allInitiallyInCover = hitLocations.every(loc => (loc.getFlag(MODULE_ID, "inCover") ?? true));

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
                            const currentFlag = locItem.getFlag(MODULE_ID, "inCover") || false;
                            if (currentFlag !== isChecked) {
                                await locItem.setFlag(MODULE_ID, "inCover", isChecked);
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
                        await locItem.setFlag(MODULE_ID, "inCover", false);
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
})();