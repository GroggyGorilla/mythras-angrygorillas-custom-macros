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

    // 2. Fetch Hit Locations & Held Melee Weapons
    const hitLocations = actor.items.filter(i => i.type === "hitLocation");
    
    // Only MELEE weapons currently held in at least one hit location can passively block
    const heldMeleeWeapons = actor.items.filter(i => {
        if (i.type !== "melee-weapon") return false;
        const locs = i.getFlag(MODULE_ID, "holdingLocations");
        return Array.isArray(locs) && locs.length > 0;
    });

    if (hitLocations.length === 0) {
        ui.notifications.warn(`${actor.name} has no hit location items.`);
        return;
    }

    // Helper: Build the dropdown & image preview HTML for a hit location
    const renderDropdown = (locItem) => {
        const currentBlockingWeaponId = locItem.getFlag(MODULE_ID, "blockingWeapon") || "";
        const currentWeapon = heldMeleeWeapons.find(w => w.id === currentBlockingWeaponId);
        const imgSrc = currentWeapon?.img || "icons/svg/shield.svg";
        
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
                const imgSrc = weapon?.img || "icons/svg/shield.svg";

                html.find(`img.passive-block-img[data-loc-id="${locId}"]`).attr("src", imgSrc);
            });
        },
        buttons: {
            save: {
                icon: '<i class="fas fa-shield-alt"></i>',
                label: "Ward Selected Location(s)",
                callback: async (html) => {
                    for (let el of html.find(".passive-block-select").toArray()) {
                        const locId = el.dataset.locId;
                        const selectedWeaponId = el.value;
                        const locItem = actor.items.get(locId);

                        if (locItem) {
                            const currentFlag = locItem.getFlag(MODULE_ID, "blockingWeapon") || "";
                            if (currentFlag !== selectedWeaponId) {
                                await locItem.setFlag(MODULE_ID, "blockingWeapon", selectedWeaponId);
                            }
                        }
                    }
                    ui.notifications.info(`Updated passive block weapons for ${actor.name}.`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "save"
    }, { width: isStandardHumanoid ? 600 : 420, resizable: true }).render(true);
})();