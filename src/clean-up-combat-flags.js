(async () => {
    const moduleId = typeof MAGCM_MODULE_ID !== "undefined" ? MAGCM_MODULE_ID : "mythras-angrygorillas-custom-macros";

    const MOVEMENT_STATES = [
        "Movement - Walk",
        "Movement - Run",
        "Movement - Sprint",
        "Movement - Climb",
        "Movement - Swim"
    ];

    // Read game settings safely
    let enableReach = false;
    try {
        enableReach = game.settings.get(moduleId, "enableReachMechanics");
    } catch (e) {
        enableReach = false;
    }

    let enableMovement = false;
    try {
        enableMovement = game.settings.get(moduleId, "enableMovementStateControlInCombat");
    } catch (e) {
        enableMovement = false;
    }

    // Build dialog UI dynamically based on active settings
    let dialogContent = `<form style="margin-bottom: 10px;">`;
    
    if (enableReach) {
        dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-engagements" style="font-weight: bold;">Clear Melee Engagements</label>
            <input type="checkbox" id="clear-engagements" checked />
        </div>`;
    }

    if (enableMovement) {
        dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-movement" style="font-weight: bold;">Clear Movement States</label>
            <input type="checkbox" id="clear-movement" checked />
        </div>`;
    }

    dialogContent += `
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-wards" style="font-weight: bold;">Clear Warded Locations</label>
            <input type="checkbox" id="clear-wards" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-cover" style="font-weight: bold;">Clear Cover Status</label>
            <input type="checkbox" id="clear-cover" checked />
        </div>
        <div class="form-group" style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
            <label for="clear-weapons" style="font-weight: bold;">Clear Equipped / Held Weapons</label>
            <input type="checkbox" id="clear-weapons" checked />
        </div>
    </form>`;

    new Dialog({
        title: "Clean Up Actor Data & Flags",
        content: dialogContent,
        buttons: {
            cleanup: {
                icon: '<i class="fas fa-broom"></i>',
                label: "Clean Up",
                callback: async (html) => {
                    const doEngagements = enableReach && html.find("#clear-engagements").is(":checked");
                    const doMovement = enableMovement && html.find("#clear-movement").is(":checked");
                    const doWards = html.find("#clear-wards").is(":checked");
                    const doCover = html.find("#clear-cover").is(":checked");
                    const doWeapons = html.find("#clear-weapons").is(":checked");

                    if (!doEngagements && !doMovement && !doWards && !doCover && !doWeapons) {
                        return ui.notifications.info("No cleanup options were selected.");
                    }

                    let processedActors = 0;
                    let clearedItemsCount = 0;
                    let clearedEffectsCount = 0;

                    for (const actor of game.actors) {
                        let actorUpdated = false;

                        // 1. Clear Active Effect movement states
                        if (doMovement) {
                            const effectsToRemove = actor.effects
                                .filter(e => MOVEMENT_STATES.includes(e.name))
                                .map(e => e.id);

                            if (effectsToRemove.length > 0) {
                                await actor.deleteEmbeddedDocuments("ActiveEffect", effectsToRemove);
                                clearedEffectsCount += effectsToRemove.length;
                                actorUpdated = true;
                            }
                        }

                        // 2. Clear Engagements flag on Actor
                        if (doEngagements && actor.getFlag(moduleId, "engagements") !== undefined) {
                            await actor.unsetFlag(moduleId, "engagements");
                            actorUpdated = true;
                        }

                        // 3. Prepare batch updates for items
                        const itemUpdates = [];

                        for (const item of actor.items) {
                            const updateObj = { _id: item.id };
                            let itemNeedsUpdate = false;

                            // Hit Location flags (Wards & Cover)
                            if (item.type === "hitLocation") {
                                if (doWards && item.getFlag(moduleId, "blockingWeapon") !== undefined) {
                                    updateObj[`flags.${moduleId}.-=blockingWeapon`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (doCover && item.getFlag(moduleId, "inCover") !== undefined) {
                                    updateObj[`flags.${moduleId}.-=inCover`] = null;
                                    itemNeedsUpdate = true;
                                }
                            }

                            // Equipped / Held Weapons
                            if (doWeapons && (item.type === "melee-weapon" || item.type === "ranged-weapon")) {
                                if (item.getFlag(moduleId, "holdingLocations") !== undefined) {
                                    updateObj[`flags.${moduleId}.-=holdingLocations`] = null;
                                    itemNeedsUpdate = true;
                                }
                                if (item.getFlag(moduleId, "loadProgress") !== undefined) {
                                    updateObj[`flags.${moduleId}.-=loadProgress`] = null;
                                    itemNeedsUpdate = true;
                                }
                            }

                            if (itemNeedsUpdate) {
                                itemUpdates.push(updateObj);
                            }
                        }

                        // Apply embedded item changes in a single batch per actor
                        if (itemUpdates.length > 0) {
                            await actor.updateEmbeddedDocuments("Item", itemUpdates);
                            clearedItemsCount += itemUpdates.length;
                            actorUpdated = true;
                        }

                        if (actorUpdated) processedActors++;
                    }

                    ui.notifications.info(`Cleanup complete! Processed ${processedActors} actor(s) (${clearedEffectsCount} active effects removed, ${clearedItemsCount} item flags cleared).`);
                }
            },
            cancel: {
                icon: '<i class="fas fa-times"></i>',
                label: "Cancel"
            }
        },
        default: "cleanup"
    }).render(true);
})();