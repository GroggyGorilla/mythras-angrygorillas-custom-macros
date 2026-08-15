const moduleId = typeof MAGCM_MODULE_ID !== "undefined" ? MAGCM_MODULE_ID : "mythras-angrygorillas-custom-macros";

// 1. Clear engagements on all World Actors
for (const actor of game.actors) {
    if (actor.getFlag(moduleId, "engagements")) {
        await actor.unsetFlag(moduleId, "engagements");
    }
}

// 2. Clear engagements on unlinked synthetic tokens across all scenes
for (const scene of game.scenes) {
    for (const tokenDoc of scene.tokens) {
        if (!tokenDoc.isLinked && tokenDoc.actor) {
            if (tokenDoc.actor.getFlag(moduleId, "engagements")) {
                await tokenDoc.actor.unsetFlag(moduleId, "engagements");
            }
        }
    }
}

// 3. Force canvas tokens to update visual states
if (canvas.ready) {
    canvas.tokens.placeables.forEach(t => t.refresh());
}

ui.notifications.info("Cleared all melee engagements globally.");