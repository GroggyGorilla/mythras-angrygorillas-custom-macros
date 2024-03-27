async function restoreLuckPoints(character) {

    let maxLuckPoints = character.statTracker.actor.maxLuckPoints;
    if (!!maxLuckPoints) {
        await character.update({'system.trackedStats.luckPoints.value' : maxLuckPoints});
    }
    ui.notifications.info(`${character.name} luck points have been restored.`);
}

async function cycleTargets(){

    let users = game.users;

    for (let user of users){
        if (!user.isGM && user.name !== "Gamemaster (Disabled)") {
            if (user.character === undefined || user === undefined || user.character === null) {
                ui.notifications.info(`The user ${user.name} does not have a character assigned to them.`);
            } else {
                await restoreLuckPoints(user.character);
            }
        }    
    }
}

cycleTargets();