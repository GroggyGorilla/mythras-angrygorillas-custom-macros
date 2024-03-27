async function restoreAP(token) {

    let maxAP = token.actor.maxActionPoints;
    if (!!maxAP) {
        await token.actor.update({'system.trackedStats.actionPoints.value' : maxAP });
    }
    ui.notifications.info(`${token.actor.name} AP has been reset.`);
}

async function cycleTargets(){

    let tokens = canvas.tokens.controlled;

    for (let tok of tokens){

        await restoreAP(tok);

    }
    
}

cycleTargets();