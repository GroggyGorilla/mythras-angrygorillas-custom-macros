const currencies = token.actor.items.filter(skill => skill.type === "currency");
const characterName = token.actor.name;

let currencyRows = ``;

function convertTextToHtmlId(text) {
    return text.toLowerCase().replace(/\W+/g, "-");
}

for (const currency of currencies) {
    const currencyId = convertTextToHtmlId(currency.name);
    currencyRows += `<tr>
                        <th style="text-align:right; padding-right:5px">${currency.name}<img src="${currency.img}" height="16" width="16" style="vertical-align:middle;border:none;margin-left:2px"/></th>
                        <td><input type="number" id="${currencyId}" value="${currency.system.quantity}" disabled style="text-align: center; width: 100px;"/></td>
                        <td><input type="number" id="${currencyId}-changeby" value="0" min="0" style="text-align: center; width: 100px;"/></td>
                        <td><input type="checkbox" id="${currencyId}-pay" checked></td>
                      </tr>`;
}

const d = new Dialog({
    title: "Manage Currency",
    content: `
    <h2 style="float: top;">${characterName}</h2>
        <table>
            <tr>
                <th style="text-align:right; padding-right:10px">Currency</th>
                <th>Current</th>
                <th>Change By</th>
                <th>Pay?</th>
            </tr>
            ${currencyRows}
        </table>
        <div><label for="currencyChangeReason" style="font-weight:bold;">Reason:</label><textarea id="currencyChangeReason" style="margin-bottom:10px"></textarea></div>`,
    buttons: {
        one: {
            label: "Transact",
            callback: html => {
                const reason = html.find(`[id="currencyChangeReason"]`).val();

                let currencyChanged = false;
                let notEnoughCoin = false;
                let message = ``;
                let oldBalance = ``;
                let received = ``;
                let paid = ``;
                let newBalance = ``;
                for (const currency of currencies) {
                    const currencyId = convertTextToHtmlId(currency.name);
                    const currentAmount = parseInt(currency.system.quantity);
                    const changeBy = parseInt(html.find(`[id="${currencyId}-changeby"]`).val());
                    const pay = html.find(`[id="${currencyId}-pay"]`)[0].checked;
                    const currencyImg = `<img src="${currency.img}" height="16" width="16" style="vertical-align:middle;border:none;margin-left:2px"/>`;

                    if (!!pay && currentAmount < changeBy) {
                        message += `<p>Not enough ${currencyImg} to pay the required amount of ${changeBy}.</p>`;
                        notEnoughCoin = true;
                    }
                }
                if (!notEnoughCoin) {
                    for (const currency of currencies) {
                        const currencyId = convertTextToHtmlId(currency.name);
                        const currentAmount = parseInt(currency.system.quantity);
                        const changeBy = parseInt(html.find(`[id="${currencyId}-changeby"]`).val());
                        const pay = html.find(`[id="${currencyId}-pay"]`)[0].checked;
                        const currencyImg = `<img src="${currency.img}" height="16" width="16" style="vertical-align:middle;border:none;margin-left:2px"/>`;
                        
                        const newAmount = (!!pay) ? currentAmount - changeBy : currentAmount + changeBy;

                        if (currentAmount > 0) {
                            oldBalance += `${currentAmount}${currencyImg}&nbsp;&nbsp;`;
                        }

                        if (currentAmount > 0 && !!pay && newAmount <= 0) {
                            newBalance += `<strong>${newAmount}</strong>${currencyImg}&nbsp;&nbsp;`;
                        }

                        if (newAmount > 0) {
                            newBalance += `<strong>${newAmount}</strong>${currencyImg}&nbsp;&nbsp;`;
                        }

                        if (changeBy > 0) {
                            if (!!pay) {
                                paid += `<strong style="color:red">${changeBy}</strong>${currencyImg}&nbsp;&nbsp;`;
                            } else {
                                received += `<strong style="color:green">${changeBy}</strong>${currencyImg}&nbsp;&nbsp;`;
                            }
                            currency.update({'system.quantity': newAmount});
                        }

                    }
                    message = `
                    <table>
                    <tr><th>Old Balance</th><td>${oldBalance}</td></tr>
                    ${received == `` ? `` : `<tr><th>Received</th><td>${received}</td></tr>`}
                    ${paid == `` ? `` : `<tr><th>Paid</th><td>${paid}</td></tr>`}
                    <tr><th>New Balance</th><td>${newBalance}</td></<tr>
                    </table>
                    `;

                } else {
                    message += `<strong style="color:red">Transaction cancelled.</strong>`;
                }


                ChatMessage.create({
                    user: game.user.id,
                    speaker: ChatMessage.getSpeaker(),
                    flavor: `Transacting currency for: ${reason}`,
                    content: `<h2 style='font-size: large'>${token.actor.name}</h2>
                            ${message}`
                });
            }
        },
        two: {
            label: "Cancel",
            callback: html => console.log("Cancelled")
        }
    },
    default: "one",
    close: html => console.log()
})

d.render(true);