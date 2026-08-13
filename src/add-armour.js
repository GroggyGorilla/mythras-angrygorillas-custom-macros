async function addArmour(token, armourSetType, armourRightLeg, armourLeftLeg, armourAbdomen, armourChest, armourRightArm, armourLeftArm, armourHead) {
    let currentActor = token.actor;

    // Define the explicit ordering for hit locations
    const locationOrder = ["Head", "Chest", "Abdomen", "Right Arm", "Left Arm", "Right Leg", "Left Leg"];

    let allHitLocations = currentActor.items
        .filter(i => i.type === 'hitLocation')
        .sort((a, b) => locationOrder.indexOf(a.name) - locationOrder.indexOf(b.name));

    const customArmourSelections = {
        "Head": armourHead,
        "Chest": armourChest,
        "Abdomen": armourAbdomen,
        "Right Arm": armourRightArm,
        "Left Arm": armourLeftArm,
        "Right Leg": armourRightLeg,
        "Left Leg": armourLeftLeg
    };

    async function findMatchingArmourPiece(hitLocationName, armourTypeId) {
        const armourTypeNames = {
            1: "Cured armour",
            2: "Padded Armour",
            3: "Laminated Armour",
            4: "Scaled Armour",
            5: "Half plate armour",
            6: "Mail",
            7: "Plated Mail",
            8: "Articulated Plate"
        };

        const armourPartHitLocationMapping = {
            "Head": "[Head]",
            "Chest": "[Chest]",
            "Abdomen": "[Ab.]",
            "Right Arm": "[R.Arm]",
            "Left Arm": "[L.Arm]",
            "Right Leg": "[R.Leg]",
            "Left Leg": "[L.Leg]"
        };

        const typeName = armourTypeNames[armourTypeId];
        if (!typeName) return null;

        const pack = game.packs.get("world.armour");
        const armourItems = await pack.getDocuments();
        const matchingArmour = armourItems.find(item => item.name.toLowerCase() === `${typeName} ${armourPartHitLocationMapping[hitLocationName]}`.toLowerCase());
        return matchingArmour || null;
    }

    const armourCodes = {
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
                await latestArmour.update({ 'system.location': [hitLoc.id], 'system.equipped': true });
            }
        }
        ui.notifications.info(`${armour.name} set equipped for ${token.actor.name}.`);

    } else {
        let pack = game.packs.get("world.armour");
        for (let hitLoc of allHitLocations) {
            const selectedTypeId = customArmourSelections[hitLoc.name];
            
            if (!selectedTypeId || selectedTypeId == 0) continue;

            const armour = await findMatchingArmourPiece(hitLoc.name, selectedTypeId);

            const armourExistsForHitLocation = (currentActor.items.filter(i => i.type === 'armor' && i.system.location.length == 1 && i.system.location[0] == hitLoc.id).length > 0);
            if (!armourExistsForHitLocation && armour != null) {
                let addedArmour = (await currentActor.createEmbeddedDocuments('Item', [armour]))[0];
                let latestArmour = currentActor.items.filter(i => i.id == addedArmour.id)[0];
                await latestArmour.update({ 'system.location': [hitLoc.id], 'system.equipped': true });
            } else if (!armourExistsForHitLocation && armour == null) {
                ui.notifications.warn(`No matching armour found for ${hitLoc.name} on ${token.actor.name}.`);
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
                <p>Adds armour of chosen type(s) to selected tokens and equips them to hit locations. Custom Set only works on humans and humanoids with the same hit locations as humans. For this macro to work properly, ensure that an "Armour" compendium exists with individual armour pieces for each of the selectable armour types.</p>
                <p>The armour pieces must be named according to their hit location and armour type using the following naming scheme: "Cured armour [Head]", "Cured Armour [Chest]", "Padded Armour [Ab.]", "Laminated Armour [R.Arm]", "Half plat armour [L.Leg]"</p>
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