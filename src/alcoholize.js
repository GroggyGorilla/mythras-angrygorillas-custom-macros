/**
 * This macro is to support a homebrew magical craft skill for Angry Gorilla's campaign. Please ignore unless you're interested in using it for your own purposes.
 * */
(async () => {
    // 1. Target Actor & Skill Resolution
    const actor = canvas.tokens.controlled[0]?.actor || game.user.character;
    if (!actor) {
        ui.notifications.warn("Please select a token or assign a default character.");
        return;
    }

    const skillName = "Aberration (Alcoholize)";
    const skillItem = actor.items.find(i => i.name.toLowerCase() === skillName.toLowerCase());
    if (!skillItem) {
        ui.notifications.warn(`Selected character does not have the "${skillName}" skill.`);
        return;
    }

    const getSkillValue = (item) => {
        if (!item) return 0;
        return item.totalVal ?? item.system?.skillLevel ?? item.system?.value ?? 0;
    };

    const baseSkillValue = getSkillValue(skillItem);

    // Retrieve Skills for Cap / Augment Dropdowns
    const getActorSkills = (a) => {
        if (!a) return [];
        return a.items.filter(i => 
            i.type === "standardSkill" ||
            i.type === "professionalSkill" ||
            i.type === "combatStyle" ||
            i.type === "magicSkill" ||
            i.type === "passion"
        ).sort((a, b) => a.name.localeCompare(b.name));
    };

    // 2. Helper Functions
    const getTimeInSeconds = (mp, units) => {
        const baseSeconds = mp === 1 ? 300 : mp === 2 ? 60 : 10;
        return baseSeconds * units;
    };

    const formatTime = (totalSeconds) => {
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        let parts = [];
        if (hrs > 0) parts.push(`${hrs}h`);
        if (mins > 0) parts.push(`${mins}m`);
        if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
        return parts.join(" ");
    };

    const getQualityTier = (ss) => {
        if (ss < 50) return { name: "Fail", gradePenalty: 0 };
        if (ss < 75) return { name: "Awful", gradePenalty: 0 };
        if (ss < 100) return { name: "Cheap", gradePenalty: 0 };
        if (ss < 125) return { name: "Reasonable", gradePenalty: 0 };
        if (ss < 150) return { name: "Superior", gradePenalty: 1 };
        return { name: "Exemplary", gradePenalty: 2 };
    };

    const getDifficultyMultiplier = (baseDiff, gradePenalty) => {
        const grades = ["Standard", "Hard", "Formidable", "Herculean"];
        let baseIndex = baseDiff === "Beer" ? 0 : 1; // Beer = Standard (0), Wine/Spirits = Hard (1)
        let finalIndex = Math.min(baseIndex + gradePenalty, grades.length - 1);

        const multipliers = { "Standard": 1.0, "Hard": 0.66, "Formidable": 0.5, "Herculean": 0.1 };
        return { label: grades[finalIndex], mult: multipliers[grades[finalIndex]] };
    };

    // 3. Dialog Builder
    const openBrewDialog = (state = {}) => {
        const currentActor = state.actorId 
            ? (game.actors.get(state.actorId) || canvas.tokens.placeables.find(t => t.actor?.id === state.actorId)?.actor)
            : actor;

        if (!currentActor) {
            ui.notifications.warn("Could not resolve actor for crafting dialog.");
            return;
        }

        const currentSkillItem = currentActor.items.find(i => i.name.toLowerCase() === skillName.toLowerCase());
        const currentBaseSkillValue = getSkillValue(currentSkillItem);

        const isContinuation = state.round > 1;
        const isReroll = !!state.isReroll;
        const currentRound = state.round || 1;
        
        const prevMp = state.prevMp ?? 0;
        const prevTime = state.prevTime ?? 0;
        const prevSS = state.prevSS ?? 0;

        const selectedType = state.type || "Beer";
        const selectedUnits = state.units || 1;

        const selfSkills = getActorSkills(currentActor);
        const targetToken = game.user.targets.first();
        const targetActor = targetToken?.actor;
        const targetSkills = getActorSkills(targetActor);

        const selfSkillsOptions = selfSkills.map(s => `<option value="${s.id}">${s.name} (${getSkillValue(s)}%)</option>`).join("");
        const targetSkillsOptions = targetSkills.map(s => `<option value="${s.id}">${s.name} (${getSkillValue(s)}%)</option>`).join("");

        const dialogContent = `
            <form style="display: flex; flex-direction: column; gap: 8px;">
            <div style="background: rgba(0,0,0,0.1); padding: 8px; border-radius: 4px;">
                <strong>Actor:</strong> ${currentActor.name} | <strong>Base Skill:</strong> ${currentBaseSkillValue}%<br>
                <strong>Task Round:</strong> #${currentRound} ${isReroll ? "<em>(Luck Re-roll)</em>" : ""} | <strong>Current Score:</strong> ${prevSS} (${getQualityTier(prevSS).name})
            </div>

            <div class="form-group">
                <label>Alcohol Type:</label>
                <select id="brew-type" ${isContinuation ? "disabled" : ""}>
                    <option value="Beer" ${selectedType === "Beer" ? "selected" : ""}>Beer (Standard)</option>
                    <option value="Spirits" ${selectedType === "Spirits" ? "selected" : ""}>Spirits (Hard)</option>
                    <option value="Wine" ${selectedType === "Wine" ? "selected" : ""}>Wine (Hard)</option>
                </select>
            </div>

            <div class="form-group">
                <label>Units of Brew:</label>
                <input type="number" id="brew-units" value="${selectedUnits}" min="1" ${isContinuation ? "disabled" : ""}/>
            </div>

            <div class="form-group">
                <label>Magic Points Spent (This Round):</label>
                <select id="brew-mp">
                    <option value="1">1 MP (5 min/unit)</option>
                    <option value="2">2 MP (1 min/unit)</option>
                    <option value="3">3 MP (10 sec/unit)</option>
                </select>
            </div>

            <div class="form-group">
                <label>Initial Success Score Offset:</label>
                <input type="number" id="brew-ss" value="${prevSS}" ${isContinuation ? "disabled" : ""}/>
            </div>

            <fieldset style="border: 1px solid #7a7a7a; border-radius: 4px; padding: 6px 8px; margin-top: 4px;">
                <legend style="font-weight: bold; padding: 0 4px;">Augment / Cap Options</legend>
                
                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <input type="radio" id="aug-none" name="augmentMode" value="none" checked>
                    <label for="aug-none" style="font-weight: normal; cursor: pointer;">None</label>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <input type="radio" id="aug-cap" name="augmentMode" value="cap">
                    <label for="aug-cap" style="min-width: 100px; font-weight: normal; cursor: pointer;">Cap With:</label>
                    <select id="brew-cap-skill" style="flex: 1;" disabled>
                        ${selfSkillsOptions}
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <input type="radio" id="aug-self" name="augmentMode" value="augmentSelf">
                    <label for="aug-self" style="min-width: 100px; font-weight: normal; cursor: pointer;">Augment By:</label>
                    <select id="brew-aug-self-skill" style="flex: 1;" disabled>
                        ${selfSkillsOptions}
                    </select>
                </div>

                <div style="display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                    <input type="radio" id="aug-custom" name="augmentMode" value="custom">
                    <label for="aug-custom" style="min-width: 100px; font-weight: normal; cursor: pointer;">Custom Bonus:</label>
                    <input type="number" id="brew-custom-val" value="0" style="width: 80px;" disabled placeholder="e.g. 10">
                </div>

                <div style="display: flex; align-items: center; gap: 6px;">
                    <input type="radio" id="aug-target" name="augmentMode" value="augmentTarget" ${targetActor ? "" : "disabled"}>
                    <label for="aug-target" style="min-width: 100px; font-weight: normal; cursor: pointer;">
                        ${targetActor ? `Augment By (${targetActor.name}):` : "Augment By Target:"}
                    </label>
                    <select id="brew-aug-target-skill" style="flex: 1;" disabled>
                        ${targetSkillsOptions.length > 0 ? targetSkillsOptions : `<option value="">No Target Selected</option>`}
                    </select>
                </div>
            </fieldset>

            <hr style="margin: 4px 0;">
            <div style="font-weight: bold; color: #2b580c;" id="brew-dynamic-info">
                Calculating duration and target difficulty...
            </div>
            </form>
        `;

        new Dialog({
            title: `Aberration (Alcoholize) - Round #${currentRound}`,
            content: dialogContent,
            render: (html) => {
                const updateDynamicFields = () => {
                    const mode = html.find('input[name="augmentMode"]:checked').val();
                    
                    html.find("#brew-cap-skill").prop("disabled", mode !== "cap");
                    html.find("#brew-aug-self-skill").prop("disabled", mode !== "augmentSelf");
                    html.find("#brew-custom-val").prop("disabled", mode !== "custom");
                    html.find("#brew-aug-target-skill").prop("disabled", mode !== "augmentTarget" || !targetActor);

                    let effectiveSkill = currentBaseSkillValue;
                    let augmentDesc = "";

                    if (mode === "cap") {
                        const capId = html.find("#brew-cap-skill").val();
                        const capItem = selfSkills.find(i => i.id === capId);
                        if (capItem) {
                            const capVal = getSkillValue(capItem);
                            if (currentBaseSkillValue > capVal) {
                                effectiveSkill = capVal;
                                augmentDesc = `Capped by ${capItem.name} (${capVal}%)`;
                            } else {
                                augmentDesc = `Cap: ${capItem.name} (${capVal}%)`;
                            }
                        }
                    } else if (mode === "augmentSelf") {
                        const augId = html.find("#brew-aug-self-skill").val();
                        const augItem = selfSkills.find(i => i.id === augId);
                        if (augItem) {
                            const augVal = getSkillValue(augItem);
                            const bonus = Math.round(augVal * 0.2);
                            effectiveSkill = currentBaseSkillValue + bonus;
                            augmentDesc = `Augmented by ${augItem.name} (+${bonus}%)`;
                        }
                    } else if (mode === "custom") {
                        const bonus = parseInt(html.find("#brew-custom-val").val()) || 0;
                        effectiveSkill = currentBaseSkillValue + bonus;
                        augmentDesc = `Custom Augment (${bonus >= 0 ? "+" : ""}${bonus}%)`;
                    } else if (mode === "augmentTarget" && targetActor) {
                        const augId = html.find("#brew-aug-target-skill").val();
                        const augItem = targetSkills.find(i => i.id === augId);
                        if (augItem) {
                            const augVal = getSkillValue(augItem);
                            const bonus = Math.round(augVal * 0.2);
                            effectiveSkill = currentBaseSkillValue + bonus;
                            augmentDesc = `Augmented by ${targetActor.name}'s ${augItem.name} (+${bonus}%)`;
                        }
                    }

                    const type = html.find("#brew-type").val();
                    const units = parseInt(html.find("#brew-units").val()) || 1;
                    const mp = parseInt(html.find("#brew-mp").val()) || 1;
                    const startSS = parseInt(html.find("#brew-ss").val()) || 0;

                    const roundSeconds = getTimeInSeconds(mp, units);
                    const estimatedTotalTime = prevTime + roundSeconds;
                    const tier = getQualityTier(startSS);
                    const diff = getDifficultyMultiplier(type, tier.gradePenalty);
                    const targetSkill = Math.round(effectiveSkill * diff.mult);

                    html.find("#brew-dynamic-info").html(`
                        <strong>Effective Skill:</strong> ${effectiveSkill}% ${augmentDesc ? `<span style="font-size:0.9em; color:#555;">(${augmentDesc})</span>` : ""}<br>
                        <strong>Round Time:</strong> ${formatTime(roundSeconds)} (Total: ${formatTime(estimatedTotalTime)})<br>
                        <strong>Effective Difficulty:</strong> ${diff.label} (${targetSkill}% target)
                    `);
                };

                html.find('input[name="augmentMode"], #brew-type, #brew-units, #brew-mp, #brew-ss, #brew-cap-skill, #brew-aug-self-skill, #brew-custom-val, #brew-aug-target-skill').on("change input", updateDynamicFields);
                updateDynamicFields();
            },
            buttons: {
                roll: {
                    icon: '<i class="fas fa-dice-d100"></i>',
                    label: "Brew",
                    callback: async (html) => {
                        const type = html.find("#brew-type").val();
                        const units = parseInt(html.find("#brew-units").val()) || 1;
                        const mp = parseInt(html.find("#brew-mp").val()) || 1;
                        const startSS = parseInt(html.find("#brew-ss").val()) || 0;
                        const mode = html.find('input[name="augmentMode"]:checked').val();

                        let effectiveSkill = currentBaseSkillValue;
                        let augmentDesc = "";

                        if (mode === "cap") {
                            const capId = html.find("#brew-cap-skill").val();
                            const capItem = selfSkills.find(i => i.id === capId);
                            if (capItem) {
                                const capVal = getSkillValue(capItem);
                                if (currentBaseSkillValue > capVal) {
                                    effectiveSkill = capVal;
                                    augmentDesc = `Capped by ${capItem.name} (${capVal}%)`;
                                } else {
                                    augmentDesc = `Cap: ${capItem.name} (${capVal}%)`;
                                }
                            }
                        } else if (mode === "augmentSelf") {
                            const augId = html.find("#brew-aug-self-skill").val();
                            const augItem = selfSkills.find(i => i.id === augId);
                            if (augItem) {
                                const augVal = getSkillValue(augItem);
                                const bonus = Math.round(augVal * 0.2);
                                effectiveSkill = currentBaseSkillValue + bonus;
                                augmentDesc = `Augmented by ${augItem.name} (+${bonus}%)`;
                            }
                        } else if (mode === "custom") {
                            const bonus = parseInt(html.find("#brew-custom-val").val()) || 0;
                            effectiveSkill = currentBaseSkillValue + bonus;
                            augmentDesc = `Custom Augment (${bonus >= 0 ? "+" : ""}${bonus}%)`;
                        } else if (mode === "augmentTarget" && targetActor) {
                            const augId = html.find("#brew-aug-target-skill").val();
                            const augItem = targetSkills.find(i => i.id === augId);
                            if (augItem) {
                                const augVal = getSkillValue(augItem);
                                const bonus = Math.round(augVal * 0.2);
                                effectiveSkill = currentBaseSkillValue + bonus;
                                augmentDesc = `Augmented by ${targetActor.name}'s ${augItem.name} (+${bonus}%)`;
                            }
                        }

                        await executeBrewRoll({
                            actor: currentActor,
                            baseSkillValue: currentBaseSkillValue,
                            effectiveSkill,
                            augmentDesc,
                            round: currentRound,
                            type,
                            units,
                            mpThisRound: mp,
                            prevMp,
                            prevTime,
                            prevSS: startSS,
                            isReroll
                        });
                    }
                },
                cancel: { icon: '<i class="fas fa-times"></i>', label: "Cancel" }
            },
            default: "roll"
        }).render(true);
    };

    // 4. Roll Processing & Output
    async function executeBrewRoll(data) {
        // Automatic MP Deduction (Skipped on Luck Re-rolls)
        if (!data.isReroll && data.mpThisRound > 0) {
            const currentMp = parseInt(data.actor.system.trackedStats?.magicPoints?.value);
            if (typeof currentMp === "number") {
                const newMp = Math.max(0, currentMp - data.mpThisRound);
                await data.actor.update({ "system.trackedStats.magicPoints.value": newMp });
                ui.notifications.info(`Spent ${data.mpThisRound} MP. (${newMp} MP remaining)`);
            } else {
                ui.notifications.warn("Could not locate system.trackedStats.magicPoints.value on character sheet.");
            }
        }

        const totalMp = data.prevMp + data.mpThisRound;
        const roundTime = getTimeInSeconds(data.mpThisRound, data.units);
        const totalTime = data.prevTime + roundTime;

        const tier = getQualityTier(data.prevSS);
        const diff = getDifficultyMultiplier(data.type, tier.gradePenalty);
        const targetSkill = Math.round(data.effectiveSkill * diff.mult);

        const roll = await new Roll("1d100").evaluate({ async: true });
        const rollVal = roll.total;
        const critThreshold = Math.max(1, Math.ceil(targetSkill / 10));
        const fumbleThreshold = targetSkill < 100 ? 99 : 100;

        let resultText = "";
        let ssDelta = 0;

        if (rollVal <= critThreshold) {
            resultText = `<span style="font-weight: bold; color:goldenrod">CRITICAL SUCCESS!</span>`;
            ssDelta = 50;
        } else if (rollVal <= targetSkill && rollVal <= 95) {
            resultText = `<span style="font-weight: bold; color:green">Success</span>`;
            ssDelta = 25;
        } else if (rollVal >= fumbleThreshold) {
            resultText = `<span style="font-weight: bold; color:darkred">FUMBLE!</span>`;
            ssDelta = -25;
        } else {
            resultText = `<span style="font-weight: bold; color:red">Failure</span>`;
            ssDelta = 0;
        }

        const newSS = Math.max(0, data.prevSS + ssDelta);
        const newTier = getQualityTier(newSS);
        let newTierLabelColor = "darkred";
        switch (newTier.name.toLowerCase()) {
            case "exemplary":
                newTierLabelColor = "purple";
                break;
            case "superior":
                newTierLabelColor = "goldenrod";
                break;
            case "reasonable":
                newTierLabelColor = "green";
                break;
            case "cheap":
                newTierLabelColor = "red";
                break;
        }
        const newTierLabel = `<span style="font-weight:bold; color:${newTierLabelColor}">${newTier.name}</span>`;

        const content = `
            <div class="mythras-brew-card" 
                data-actor-id="${data.actor.id}" 
                data-round="${data.round}" 
                data-type="${data.type}" 
                data-units="${data.units}" 
                data-total-mp="${totalMp}" 
                data-total-time="${totalTime}" 
                data-ss="${newSS}"
                data-prev-mp="${data.prevMp}"
                data-prev-time="${data.prevTime}"
                data-prev-ss="${data.prevSS}"
                data-effective-skill="${data.effectiveSkill}"
                data-augment-desc="${data.augmentDesc || ""}"
                data-mp-this-round="${data.mpThisRound}">
            <h3 style="border-bottom: 2px solid #555; margin-bottom: 4px;">Aberration (Alcoholize) - Round #${data.round}${data.isReroll ? " (Luck Re-roll)" : ""}</h3>
            <p><strong>Brew:</strong> ${data.units} unit(s) of ${data.type}</p>
            <p><strong>Effective Skill:</strong> ${data.effectiveSkill}% ${data.augmentDesc ? `<span style="font-size:0.9em;">(${data.augmentDesc})</span>` : ""}</p>
            <p><strong>Target Skill:</strong> ${targetSkill}% (${diff.label}) | <strong>Roll:</strong> <span style="font-size:1.1em; font-weight:bold;">${rollVal}</span> (${resultText})</p>
            <hr style="margin: 4px 0;">
            <p><strong>Progress:</strong> ${newSS} SS (${ssDelta >= 0 ? "+" : ""}${ssDelta} this round)</p>
            <p><strong>Quality:</strong> ${newTierLabel}</p>
            <p><strong>Total Magic Points Spent:</strong> ${totalMp} MP</p>
            <p><strong>Total Time Elapsed:</strong> ${formatTime(totalTime)}</p>
            
            <div style="display: flex; gap: 4px; margin-top: 8px;">
                <button class="btn-brew-continue" style="flex: 1;"><i class="fas fa-arrow-right"></i> Next Round</button>
                ${data.isReroll ? "" : `
                <button class="btn-brew-luck" style="flex: 1;"><i class="fas fa-clover"></i> Spend Luck</button>` }
            </div>
            </div>
        `;

        await ChatMessage.create({
            user: game.user.id,
            speaker: ChatMessage.getSpeaker({ actor: data.actor }),
            content: content,
            rolls: [roll]
        });
    }

    // 5. Global Action Hooks for Chat Buttons
    if (!window.brewMacroHooksAttached) {
        window.brewMacroHooksAttached = true;

        Hooks.on("renderChatMessage", (message, html) => {
            html.find(".btn-brew-continue").click(async (e) => {
                const card = $(e.currentTarget).closest(".mythras-brew-card");
                const state = {
                    round: parseInt(card.data("round")) + 1,
                    type: card.data("type"),
                    units: parseInt(card.data("units")),
                    prevMp: parseInt(card.data("total-mp")),
                    prevTime: parseInt(card.data("total-time")),
                    prevSS: parseInt(card.data("ss")),
                    actorId: card.data("actor-id"),
                    isReroll: false
                };
                openBrewDialog(state);
            });

            html.find(".btn-brew-luck").click(async (e) => {
                const card = $(e.currentTarget).closest(".mythras-brew-card");
                const actorId = card.data("actor-id");
                const cardActor = game.actors.get(actorId) || canvas.tokens.placeables.find(t => t.actor?.id === actorId)?.actor;

                if (!cardActor) {
                    ui.notifications.warn("Could not locate actor for Spend Luck.");
                    return;
                }

                const luckPath = cardActor.system.trackedStats?.luckPoints;
                if (luckPath && luckPath.value > 0) {
                    await cardActor.update({ "system.trackedStats.luckPoints.value": luckPath.value - 1 });
                    ui.notifications.info(`Spent 1 Luck point for ${cardActor.name}. (${luckPath.value - 1} remaining)`);
                } else {
                    ui.notifications.warn("No Luck points available on character sheet!");
                    return;
                }

                const skillItem = cardActor.items.find(i => i.name.toLowerCase() === skillName.toLowerCase());
                const baseSkillValue = skillItem ? (skillItem.totalVal ?? skillItem.system?.skillLevel ?? skillItem.system?.value ?? 0) : 0;

                await executeBrewRoll({
                    actor: cardActor,
                    baseSkillValue: baseSkillValue,
                    effectiveSkill: parseInt(card.data("effective-skill")) || baseSkillValue,
                    augmentDesc: card.data("augment-desc") || "",
                    round: parseInt(card.data("round")),
                    type: card.data("type"),
                    units: parseInt(card.data("units")),
                    mpThisRound: parseInt(card.data("mp-this-round")) || 1,
                    prevMp: parseInt(card.data("prev-mp")) || 0,
                    prevTime: parseInt(card.data("prev-time")) || 0,
                    prevSS: parseInt(card.data("prev-ss")) || 0,
                    isReroll: true
                });
            });
        });
    }

    // Execute initial prompt
    openBrewDialog();
})();