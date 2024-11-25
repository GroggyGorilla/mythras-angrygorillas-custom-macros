// Edited for Foundry v12


var isClicked = false

Hooks.on('renderChatMessage', async (app, html, data) => {

  const messageDoc = game.messages.find(i => i.id == html[0].dataset.messageId)
  let chatButtons = [...html[0].querySelectorAll('.submit-damage')]
  let revealButton = html[0].querySelector(".viewDamage")
  let damageElement = html[0].querySelector(".damageElement")
  isClicked = messageDoc.getFlag('mythras-angrygorillas-custom-macros', 'damage-applied')
  if (isClicked) {
    revealButton.innerHTML = "Damage applied"
    revealButton.classList.toggle('damage-applied')
  }

  if (chatButtons.length == 0) return;




  let targetTokenActor = game.scenes.current.tokens.find(token => token.id == chatButtons[0].dataset.targetToken)

  revealButton.addEventListener("click", function viewDamage() {
    if (!isClicked) {
      damageElement.classList.toggle('revealed')
    }

  })

  function administerDamage(damageButton, hitLocationId, armorPoints, weaponDamage, damageFormula) {
    if (game.user.isGM) {
      let hitLocation = targetTokenActor.actor.getEmbeddedDocument('Item', hitLocationId)
      let armorMitigatedDamage = Number(weaponDamage) > (armorPoints) ? Number(weaponDamage - (armorPoints)) : 0
      let updatedHp = Number(hitLocation.system.currentHp - armorMitigatedDamage)

      hitLocation.update({ 'system.currentHp': updatedHp })

      messageDoc.setFlag('mythras-angrygorillas-custom-macros', 'damage-applied', true)
    }
  }

  for (let damageButton of chatButtons) {
    if (damageButton) {

      if (isClicked) damageButton.classList.toggle('damage-applied')



      // Initialize variables to pass through Apply Damage Function
      let hitLocationId = damageButton.dataset.hitLocationId
      let armorPoints = Number(damageButton.dataset.armor)
      let naturalArmor = Number(damageButton.dataset.naturalArmor)
      let weaponDamage = Number(damageButton.dataset.damage)
      let damageFormula = damageButton.dataset.damageFormula
      let maxAp = Math.max(armorPoints, naturalArmor)

      switch (damageButton.classList[0]) {


        case 'simple-damage':
          damageButton.textContent = 'Apply Damage'
          if (!isClicked) {
            damageButton.addEventListener("click", function () { administerDamage(damageButton, hitLocationId, maxAp, weaponDamage, damageFormula) }, { once: true })
          }
          break

        case 'bypass-armor':
          damageButton.textContent = 'Bypass Armor'
          if (!isClicked) {
            damageButton.addEventListener("click", function bypassArmorSelect() {
              let d = new Dialog({
                title: "Select Armor to Bypass",
                content: `<div>
                                          Select which armor to bypass:
                                      </div>`,
                buttons: {
                  one: {
                    label: "Natural",
                    callback: html => {
                      administerDamage(damageButton, hitLocationId, armorPoints, weaponDamage, damageFormula)
                    }
                  },
                  two: {
                    label: "Worn",
                    callback: html => {
                      administerDamage(damageButton, hitLocationId, naturalArmor, weaponDamage, damageFormula)
                    }
                  },
                  three: {
                    label: "Cancel",
                    callback: html => console.log('Cancelled')
                  }
                },
                default: "three",
                close: html => console.log()
              })

              d.render(true)
            }, { once: true })
          }

          break

        case 'choose-location':

          damageButton.textContent = 'Choose Location'
          if (!isClicked) {
            damageButton.addEventListener("click", function chooseLocation() {
              let hitLocations = targetTokenActor.actor.items.filter(item => item.type == 'hitLocation')
              hitLocations.sort((location1, location2) => {
                let rangeStart1 = location1.rollRangeStart
                let rangeStart2 = location2.rollRangeStart

                if (rangeStart1 >= rangeStart2) return -1
                if (rangeStart1 < rangeStart2) return 1
              })

              let hitLocationSelections = []
              for (let hitLocation of hitLocations) {
                hitLocationSelections.push(`<tr>
                                                        <td>${hitLocation.rollRangeStart}-${hitLocation.rollRangeEnd}</td>
                                                        <td>${hitLocation.name}</td>
                                                        <td><input type="checkbox" id="${hitLocation.id}"></td>
                                                        </tr>`)
              }

              let d = new Dialog({
                title: "Choose new Hit Location",
                content: `<div>
                                          Select a new Hit Location to strike:

                                          <table>
                                              <thead>
                                                  <tr>
                                                      <th>Range</th>
                                                      <th>Location</th>
                                                      <th>Select</th>
                                                  </tr>
                                              </thead>
                                              <tbody style="text-align: center;">
                                                  ${hitLocationSelections.join('')}
                                              </tbody>
                                          </table>
                                      </div>`,
                buttons: {
                  one: {
                    label: "Apply Damage",
                    callback: html => {
                      let newHitLocation = [...html[0].querySelectorAll("input[type='checkbox']")].find(selection => selection.checked).id
                      let newHitLocationItem = targetTokenActor.actor.getEmbeddedDocument('Item', newHitLocation)
                      let newArmorPoints = Number(newHitLocationItem.totalAp)
                      administerDamage(damageButton, newHitLocation, newArmorPoints, weaponDamage, damageFormula)
                    }
                  },
                  two: {
                    label: "Cancel",
                    callback: html => console.log("Cancelled")
                  }
                },
                default: "two",
                close: html => console.log()
              })

              d.render(true)
            }, { once: true })
          }

          break

        case 'impale':
          damageButton.textContent = 'Impale Damage'
          let secondRoll = new Roll(damageButton.dataset.damageFormula)
          await secondRoll.evaluate()

          if (!isClicked) {
            damageButton.addEventListener("click", function () { administerDamage(damageButton, hitLocationId, maxAp, Math.max(weaponDamage, Number(secondRoll.total)), damageFormula) }, { once: true })
            damageButton.addEventListener("click", function showSecondRoll() {
              ChatMessage.create({
                rolls: [secondRoll]
              })
            }, { once: true })
          }
          break
      }

      if (!game.user.isGM) damageButton.style.display = 'none'

    }
  }
})