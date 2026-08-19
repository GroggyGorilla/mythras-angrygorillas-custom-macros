// reload.js
// Tested on Foundry VTT v13

const MODULE_ID = "mythras-angrygorillas-custom-macros";

if (!token || !token.actor) {
    ui.notifications.warn("Please select a token to reload a weapon.");
} else {
    const actor = token.actor;
    const rangedWeapons = actor.items.filter(item => {
        if (item.type !== "ranged-weapon") return false;
        const holdingLocations = item.getFlag(MODULE_ID, "holdingLocations") || [];
        return holdingLocations.length > 0 || Boolean(item.system?.equipped ?? item.system?.isEquipped);
    });

    if (rangedWeapons.length === 0) {
        ui.notifications.warn(`${actor.name} has no equipped or held ranged weapons.`);
    } else {
        const weaponOptions = rangedWeapons.map(w => {
            const requiredLoad = Number(w.system?.load) ?? 1;
            const currentLoad = w.getFlag(MODULE_ID, "loadProgress") ?? 0;
            const status = currentLoad >= requiredLoad ? "LOADED" : `${currentLoad}/${requiredLoad}`;
            return `<option value="${w.id}">${w.name} (${status})</option>`;
        }).join("");

        new Dialog({
            title: "Reload / Unload Ranged Weapon",
            content: `
                <form style="margin: 5px; padding: 5px;">
                    <div style="margin-bottom: 10px;">
                        <label><strong>Ranged Weapon:</strong></label>
                        <select id="selectedWeapon" style="width: 100%; margin-top: 4px;">
                            ${weaponOptions}
                        </select>
                    </div>
                    <div style="margin-bottom: 10px;">
                        <label><strong>Load Actions to Spend:</strong></label>
                        <input type="number" id="loadActions" value="1" min="1" style="width: 100%; margin-top: 4px; text-align: center;">
                    </div>
                </form>`,
            buttons: {
                load: {
                    label: "Apply Load",
                    callback: async (html) => {
                        const weaponId = html.find('#selectedWeapon').val();
                        const weapon = actor.items.get(weaponId);
                        if (!weapon) return;

                        const actionsSpent = Math.max(1, Number(html.find('#loadActions').val()) || 1);
                        const requiredLoad = Number(weapon.system?.load) ?? 1;
                        const currentLoad = weapon.getFlag(MODULE_ID, "loadProgress") ?? 0;

                        if (requiredLoad === 0) {
                            ui.notifications.info(`${weapon.name} does not require loading.`);
                            return;
                        }

                        if (currentLoad >= requiredLoad) {
                            ui.notifications.info(`${weapon.name} is already fully reloaded.`);
                            return;
                        }

                        const newLoad = Math.min(requiredLoad, currentLoad + actionsSpent);
                        await weapon.setFlag(MODULE_ID, "loadProgress", newLoad);

                        const isFullyLoaded = newLoad >= requiredLoad;
                        const statusMessage = isFullyLoaded
                            ? `<p style="color: green; font-weight: bold;">${weapon.name} is now fully reloaded and ready to fire!</p>`
                            : `<p>${weapon.name} Reload progress: <strong>${newLoad}/${requiredLoad}</strong> actions.</p>`;

                        ChatMessage.create({
                            speaker: ChatMessage.getSpeaker({ actor: actor }),
                            content: `
                                <div style="text-align: center; padding: 4px;">
                                    <p><strong>${actor.name}</strong> spent ${actionsSpent} action(s) reloading <strong>${weapon.name}</strong>.</p>
                                    ${statusMessage}
                                </div>`
                        });
                    }
                },
                unload: {
                    label: "Unload",
                    callback: async (html) => {
                        const weaponId = html.find('#selectedWeapon').val();
                        const weapon = actor.items.get(weaponId);
                        if (!weapon) return;

                        const requiredLoad = Number(weapon.system?.load) ?? 1;
                        if (requiredLoad === 0) {
                            ui.notifications.info(`${weapon.name} does not require loading.`);
                            return;
                        }

                        const currentLoad = weapon.getFlag(MODULE_ID, "loadProgress") ?? 0;
                        if (currentLoad === 0) {
                            ui.notifications.info(`${weapon.name} is already unloaded.`);
                            return;
                        }

                        await weapon.setFlag(MODULE_ID, "loadProgress", 0);

                        ChatMessage.create({
                            speaker: ChatMessage.getSpeaker({ actor: actor }),
                            content: `
                                <div style="text-align: center; padding: 4px;">
                                    <p><strong>${actor.name}</strong> unloaded <strong>${weapon.name}</strong>.</p>
                                </div>`
                        });
                    }
                },
                cancel: { label: "Cancel" }
            },
            default: "load"
        }).render(true);
    }
}