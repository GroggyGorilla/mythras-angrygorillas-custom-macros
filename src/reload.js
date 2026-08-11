const token = canvas.tokens.controlled[0];
if (!token) {
    ui.notifications.warn("Please select a token to apply the Reloading effect.");
    return;
}

const actor = token.actor;

// Locate the "Reloading" status effect registered in CONFIG.statusEffects by Condition Lab
const statusEffect = CONFIG.statusEffects.find(e => 
    (e.id && e.id.toLowerCase() === "reloading") || 
    (e.label && e.label.toLowerCase() === "reloading") || 
    (e.name && e.name.toLowerCase() === "reloading")
);

if (!statusEffect) {
    ui.notifications.error("Could not find a status effect named 'Reloading'. Ensure it is created in Condition Lab.");
    return;
}

// Prompt the user for the number of turns
new Dialog({
    title: `Apply Reloading: ${actor.name}`,
    content: `
        <form>
            <div class="form-group" style="margin-bottom: 10px;">
                <label><strong>Duration (Turns):</strong></label>
                <input type="number" id="turns-input" value="1" min="1" style="width: 100%;">
            </div>
        </form>
    `,
    buttons: {
        apply: {
            label: "Apply Effect",
            callback: async (html) => {
                const turns = parseInt(html.find('#turns-input').val()) || 1;

                const effectData = {
                    name: statusEffect.label || statusEffect.name || "Reloading",
                    icon: statusEffect.icon,
                    statuses: [statusEffect.id],
                    duration: {
                        turns: turns
                    }
                };

                await actor.createEmbeddedDocuments("ActiveEffect", [effectData]);
                ui.notifications.info(`Applied Reloading to ${actor.name} for ${turns} turn(s).`);
            }
        },
        cancel: {
            label: "Cancel"
        }
    },
    default: "apply"
}).render(true);