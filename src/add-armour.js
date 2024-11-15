async function addArmour(token, armourSetType, armourRightLeg, armourLeftLeg, armourAbdomen, armourChest, armourRightArm, armourLeftArm, armourHead) {
    let currentActor = token.actor;

    let allHitLocations = currentActor.items.filter(i => i.type === 'hitLocation').sort((a, b) => { return a.system.rollRangeStart - b.system.rollRangeStart; });

    let armourCodes = {
        1: "G6U1Ps4pHD6FDmtO",
        2: "MqfTaMaOIObeyeSS",
        3: "Z6sJg7nt4kAAC7jo",
        4: "NlJJrcoJ3q23wIWD",
        5: "fp4DuXG3LoKXBRAz",
        6: "4nI649wUcGzdbXZj",
        7: "WqlcXKZwTdfdPiix",
        8: "1qzWLfg2oI5sXvas"
    }

    if (!!token.actor.hasPlayerOwner) {

        ui.notifications.warn(`Armour cannot be added using this macro for ${token.actor.name} as it is owned by a player.`);

    } else if (armourSetType != 0) {

        let pack = game.packs.get("world.armour");
        let armour = await pack.getDocument(armourCodes[armourSetType]);
        for (let hitLoc of allHitLocations) {
            let armourExistsForHitLocation = (currentActor.items.filter(i => i.type === 'armor' && i.system.location.length == 1 && i.system.location[0] == hitLoc.id).length > 0);
            if (!armourExistsForHitLocation) {
                let addedArmour = (await currentActor.createEmbeddedDocuments('Item', [armour]))[0];
                let latestArmour = currentActor.items.filter(i => i.id == addedArmour.id)[0];
                let newName = `${armour.name} [${hitLoc.name}]`;
                await latestArmour.update({ 'system.location': [hitLoc.id], 'system.name': newName, 'name': newName, 'system.equipped': true });
            }
        }
        ui.notifications.info(`${armour.name} set equipped for ${token.actor.name}.`);

    } else {
        let pack = game.packs.get("world.armour");
        for (let hitLoc of allHitLocations) {
            let armour = null;
            switch (hitLoc.name) {
                case "Right Leg":
                    armour = (armourRightLeg != 0) ? await pack.getDocument(armourCodes[armourRightLeg]) : null;
                    break;
                case "Left Leg":
                    armour = (armourLeftLeg != 0) ? await pack.getDocument(armourCodes[armourLeftLeg]) : null;
                    break;
                case "Abdomen":
                    armour = (armourAbdomen != 0) ? await pack.getDocument(armourCodes[armourAbdomen]) : null;
                    break;
                case "Chest":
                    armour = (armourChest != 0) ? await pack.getDocument(armourCodes[armourChest]) : null;
                    break;
                case "Right Arm":
                    armour = (armourRightArm != 0) ? await pack.getDocument(armourCodes[armourRightArm]) : null;
                    break;
                case "Left Arm":
                    armour = (armourLeftArm != 0) ? await pack.getDocument(armourCodes[armourLeftArm]) : null;
                    break;
                case "Head":
                    armour = (armourHead != 0) ? await pack.getDocument(armourCodes[armourHead]) : null;
                    break;
            }

            let armourExistsForHitLocation = (currentActor.items.filter(i => i.type === 'armor' && i.system.location.length == 1 && i.system.location[0] == hitLoc.id).length > 0);
            if (!armourExistsForHitLocation && armour != null) {
                let addedArmour = (await currentActor.createEmbeddedDocuments('Item', [armour]))[0];
                let latestArmour = currentActor.items.filter(i => i.id == addedArmour.id)[0];
                let newName = `${armour.name} [${hitLoc.name}]`;
                await latestArmour.update({ 'system.location': [hitLoc.id], 'system.name': newName, 'name': newName, 'system.equipped': true });
            }
        }
        ui.notifications.info(`Custom armour set equipped for ${token.actor.name}.`);
    }

}

async function cycleTargets(armourSetType, armourRightLeg, armourLeftLeg, armourAbdomen, armourChest, armourRightArm, armourLeftArm, armourHead) {

    let tokens = canvas.tokens.controlled;

    for (let token of tokens) {
        await addArmour(token, armourSetType, armourRightLeg, armourLeftLeg, armourAbdomen, armourChest, armourRightArm, armourLeftArm, armourHead);
    }

}

const d = new Dialog({
    title: "Add Armour",
    content: `
        <div style="overflow: auto; border: inset; margin: 5px; padding: 5px;">
            <em>
                <p>Adds armour of chosen type(s) to selected tokens and equips them to hit locations. Custom Set only works on humans and humanoids with the same hit locations as humans.</p>
            </em>
        </div>
        <table>
            <tr>
                <th style="text-align:right; padding-right:10px">Armour Set Type</th>
                <td><select name="drpArmourSetType" id="drpArmourSetType">
                <option value="0" selected>Custom</option>
                <option value="1">Cured</option>
                <option value="2">Padded</option>
                <option value="3">Laminated</option>
                <option value="4">Scaled</option>
                <option value="5">Half Plate</option>
                <option value="6">Mail</option>
                <option value="7">Plated Mail</option>
                <option value="8">Articulated Plate</option>
                </select>
            </tr>
            <tr>
                <th colspan="2">Hit Locations</th>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Right Leg</th>
                <td><select name="drpArmourRightLeg" id="drpArmourRightLeg">
                <option value="0">None</option>
                <option value="1">Cured</option>
                <option value="2" selected>Padded</option>
                <option value="3">Laminated</option>
                <option value="4">Scaled</option>
                <option value="5">Half Plate</option>
                <option value="6">Mail</option>
                <option value="7">Plated Mail</option>
                <option value="8">Articulated Plate</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Left Leg</th>
                <td><select name="drpArmourLeftLeg" id="drpArmourLeftLeg">
                <option value="0">None</option>
                <option value="1">Cured</option>
                <option value="2" selected>Padded</option>
                <option value="3">Laminated</option>
                <option value="4">Scaled</option>
                <option value="5">Half Plate</option>
                <option value="6">Mail</option>
                <option value="7">Plated Mail</option>
                <option value="8">Articulated Plate</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Abdomen</th>
                <td><select name="drpArmourAbdomen" id="drpArmourAbdomen">
                <option value="0">None</option>
                <option value="1">Cured</option>
                <option value="2" selected>Padded</option>
                <option value="3">Laminated</option>
                <option value="4">Scaled</option>
                <option value="5">Half Plate</option>
                <option value="6">Mail</option>
                <option value="7">Plated Mail</option>
                <option value="8">Articulated Plate</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Chest</th>
                <td><select name="drpArmourChest" id="drpArmourChest">
                <option value="0">None</option>
                <option value="1">Cured</option>
                <option value="2" selected>Padded</option>
                <option value="3">Laminated</option>
                <option value="4">Scaled</option>
                <option value="5">Half Plate</option>
                <option value="6">Mail</option>
                <option value="7">Plated Mail</option>
                <option value="8">Articulated Plate</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Right Arm</th>
                <td><select name="drpArmourRightArm" id="drpArmourRightArm">
                <option value="0">None</option>
                <option value="1">Cured</option>
                <option value="2" selected>Padded</option>
                <option value="3">Laminated</option>
                <option value="4">Scaled</option>
                <option value="5">Half Plate</option>
                <option value="6">Mail</option>
                <option value="7">Plated Mail</option>
                <option value="8">Articulated Plate</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Left Arm</th>
                <td><select name="drpArmourLeftArm" id="drpArmourLeftArm">
                <option value="0">None</option>
                <option value="1">Cured</option>
                <option value="2" selected>Padded</option>
                <option value="3">Laminated</option>
                <option value="4">Scaled</option>
                <option value="5">Half Plate</option>
                <option value="6">Mail</option>
                <option value="7">Plated Mail</option>
                <option value="8">Articulated Plate</option>
                </select>
            </tr>
            <tr>
                <th style="text-align:right; padding-right:10px">Head</th>
                <td><select name="drpArmourHead" id="drpArmourHead">
                <option value="0">None</option>
                <option value="1">Cured</option>
                <option value="2" selected>Padded</option>
                <option value="3">Laminated</option>
                <option value="4">Scaled</option>
                <option value="5">Half Plate</option>
                <option value="6">Mail</option>
                <option value="7">Plated Mail</option>
                <option value="8">Articulated Plate</option>
                </select>
            </tr>
        </table>`,
    buttons: {
        one: {
            label: "Add and Equip",
            callback: html => {
                cycleTargets(html.find(`[id="drpArmourSetType"]`).val(), html.find(`[id="drpArmourRightLeg"]`).val(), html.find(`[id="drpArmourLeftLeg"]`).val(), html.find(`[id="drpArmourAbdomen"]`).val(), html.find(`[id="drpArmourChest"]`).val(), html.find(`[id="drpArmourRightArm"]`).val(), html.find(`[id="drpArmourLeftArm"]`).val(), html.find(`[id="drpArmourHead"]`).val())
            }
        },
        two: {
            label: "Cancel",
            callback: html => console.log("Cancelled")
        }
    },
    default: "one",
    close: html => console.log()
});

d.render(true);