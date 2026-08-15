const sourceToken = canvas.tokens.controlled[0];
const targetTokens = Array.from(game.user.targets);

if (!sourceToken) {
    ui.notifications.warn("Please select a character token first.");
    return;
}
if (targetTokens.length === 0) {
    ui.notifications.warn("Please target at least one token to set engagement.");
    return;
}

const moduleId = typeof MAGCM_MODULE_ID !== "undefined" ? MAGCM_MODULE_ID : "mythras-angrygorillas-custom-macros";

new Dialog({
    title: "Set Melee Engagement Range",
    content: `
        <form style="padding: 4px;">
            <div class="form-group">
                <label style="font-weight: bold;">Select Engagement Range:</label>
                <select id="range-select" style="width: 100%; margin-top: 4px;">
                    <option value="Touch">Touch</option>
                    <option value="Short">Short</option>
                    <option value="Medium">Medium</option>
                    <option value="Long">Long</option>
                    <option value="Very Long">Very Long</option>
                    <option value="CLEAR">-- Clear Engagement --</option>
                </select>
            </div>
        </form>
    `,
    buttons: {
        apply: {
            icon: '<i class="fas fa-swords"></i>',
            label: "Apply Range",
            callback: async (html) => {
                const selectedRange = html.find("#range-select").val();
                const sourceActor = sourceToken.actor;
                if (!sourceActor) return;

                const chatLogLines = [];

                if (selectedRange === "CLEAR") {
                    for (const targetToken of targetTokens) {
                        const targetActor = targetToken.actor;
                        if (!targetActor) continue;

                        const existingData = sourceActor.getFlag(moduleId, `engagements.${targetActor.id}`);
                        const oldRange = typeof existingData === "object" ? existingData?.range : existingData;

                        // Unset target key on source actor
                        await sourceActor.unsetFlag(moduleId, `engagements.${targetActor.id}`);
                        
                        // Unset source key on target actor
                        await targetActor.unsetFlag(moduleId, `engagements.${sourceActor.id}`);

                        // Clean up entire flag object if empty
                        const remainingTargetEngagements = targetActor.getFlag(moduleId, "engagements") || {};
                        if (Object.keys(remainingTargetEngagements).length === 0) {
                            await targetActor.unsetFlag(moduleId, "engagements");
                        }

                        if (oldRange) {
                            chatLogLines.push(`<li>Cleared engagement between <strong>${sourceToken.name}</strong> and <strong>${targetToken.name}</strong> (was <i>${oldRange}</i>).</li>`);
                        } else {
                            chatLogLines.push(`<li>Cleared engagement between <strong>${sourceToken.name}</strong> and <strong>${targetToken.name}</strong>.</li>`);
                        }
                    }

                    const remainingSourceEngagements = sourceActor.getFlag(moduleId, "engagements") || {};
                    if (Object.keys(remainingSourceEngagements).length === 0) {
                        await sourceActor.unsetFlag(moduleId, "engagements");
                    }
                } else {
                    let sourceEngagements = duplicate(sourceActor.getFlag(moduleId, "engagements") || {});

                    for (const targetToken of targetTokens) {
                        const targetActor = targetToken.actor;
                        if (!targetActor) continue;

                        let targetEngagements = duplicate(targetActor.getFlag(moduleId, "engagements") || {});

                        const existingData = sourceEngagements[targetActor.id];
                        const oldRange = typeof existingData === "object" ? existingData?.range : existingData;

                        sourceEngagements[targetActor.id] = {
                            name: targetToken.name || targetActor.name,
                            img: targetToken.document.texture.src || targetActor.img,
                            range: selectedRange
                        };
                        targetEngagements[sourceActor.id] = {
                            name: sourceToken.name || sourceActor.name,
                            img: sourceToken.document.texture.src || sourceActor.img,
                            range: selectedRange
                        };

                        await targetActor.setFlag(moduleId, "engagements", targetEngagements);

                        if (!oldRange) {
                            chatLogLines.push(`<li><strong>${sourceToken.name}</strong> engaged <strong>${targetToken.name}</strong> at <strong>${selectedRange}</strong> range.</li>`);
                        } else if (oldRange !== selectedRange) {
                            chatLogLines.push(`<li>Engagement between <strong>${sourceToken.name}</strong> and <strong>${targetToken.name}</strong> changed from <i>${oldRange}</i> to <strong>${selectedRange}</strong>.</li>`);
                        } else {
                            chatLogLines.push(`<li>Engagement between <strong>${sourceToken.name}</strong> and <strong>${targetToken.name}</strong> maintained at <strong>${selectedRange}</strong>.</li>`);
                        }
                    }

                    await sourceActor.setFlag(moduleId, "engagements", sourceEngagements);
                }

                if (chatLogLines.length > 0) {
                    const content = `
                        <div style="font-size: 0.9em; padding: 2px;">
                            <ul style="margin: 0; padding-left: 15px;">
                                ${chatLogLines.join("")}
                            </ul>
                        </div>
                    `;
                    await ChatMessage.create({
                        user: game.user.id,
                        speaker: ChatMessage.getSpeaker({ token: sourceToken.document }),
                        flavor: "Engagement Range Update",
                        content: content
                    });
                }

                canvas.tokens.placeables.forEach(t => t.refresh());
            }
        },
        cancel: {
            label: "Cancel"
        }
    },
    default: "apply"
}).render(true);