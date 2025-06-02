describe('Recipients tests', function () {
  describe('Selected Recipients Management', function () {
    beforeEach(function () {
      window.gameFunctions.resetGameState()
      document.body.innerHTML = `
        <div class="game-container">
          <div id="recipientCheckboxes"></div>
        </div>
      `
    })

    it('should add recipient when checkbox is checked', function () {
      const gameState = window.gameFunctions.getGameState()
      const recipient = {
        group: 'test',
        label: 'Test Recipient',
        risk_function: 'reduced_time'
      }
      const checkbox = window.gameFunctions.createRecipientCheckbox(recipient)
      document.getElementById('recipientCheckboxes').appendChild(checkbox)

      const input = checkbox.querySelector('input')
      input.checked = true
      input.dispatchEvent(new Event('change'))

      expect(gameState.selectedRecipients).to.deep.include(recipient)
    })

    it('should remove recipient when checkbox is unchecked', function () {
      const gameState = window.gameFunctions.getGameState()
      const recipient = {
        group: 'test',
        label: 'Test Recipient',
        risk_function: 'reduced_time'
      }
      gameState.selectedRecipients.push(recipient)

      const checkbox = window.gameFunctions.createRecipientCheckbox(recipient)
      document.getElementById('recipientCheckboxes').appendChild(checkbox)

      const input = checkbox.querySelector('input')
      input.checked = false
      input.dispatchEvent(new Event('change'))

      expect(gameState.selectedRecipients).to.not.deep.include(recipient)
    })

    it('should clear selected recipients when game is reset', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.selectedRecipients = [
        { group: 'test1', label: 'Test 1', risk_function: 'reduced_time' },
        { group: 'test2', label: 'Test 2', risk_function: 'right_channel_sine' }
      ]

      window.gameFunctions.resetGame()
      expect(gameState.selectedRecipients).to.be.empty
    })

    it('should handle multiple recipient selections', function () {
      const gameState = window.gameFunctions.getGameState()
      const recipients = [
        { group: 'test1', label: 'Test 1', risk_function: 'reduced_time' },
        { group: 'test2', label: 'Test 2', risk_function: 'right_channel_sine' }
      ]

      recipients.forEach((recipient) => {
        const checkbox = window.gameFunctions.createRecipientCheckbox(recipient)
        document.getElementById('recipientCheckboxes').appendChild(checkbox)
        const input = checkbox.querySelector('input')
        input.checked = true
        input.dispatchEvent(new Event('change'))
      })

      expect(gameState.selectedRecipients).to.have.lengthOf(2)
      expect(gameState.selectedRecipients).to.deep.include.members(recipients)
    })
  })

  describe('Recipients Loading and Management', function () {
    beforeEach(function () {
      window.gameFunctions.resetGameState()
    })

    it('should load recipients from JSON file', async function () {
      // Mock fetch to return test recipients
      const originalFetch = window.fetch
      window.fetch = (url) => {
        if (url.includes('recipients.json')) {
          return Promise.resolve({
            json: () =>
              Promise.resolve([
                {
                  group: 'test1',
                  label: 'Test 1',
                  risk_function: 'reduced_time'
                },
                {
                  group: 'test2',
                  label: 'Test 2',
                  risk_function: 'right_channel_sine'
                }
              ])
          })
        }
        return originalFetch(url)
      }

      const gameState = window.gameFunctions.getGameState()
      await window.gameFunctions.init()
      expect(gameState.recipients).to.be.an('array')
      expect(gameState.recipients).to.have.lengthOf(2)
      expect(gameState.recipients[0]).to.have.property('group')
      expect(gameState.recipients[0]).to.have.property('label')
      expect(gameState.recipients[0]).to.have.property('risk_function')

      // Restore original fetch
      window.fetch = originalFetch
    })

    it('should handle empty recipients array', async function () {
      // Mock fetch to return empty array
      const originalFetch = window.fetch
      window.fetch = () =>
        Promise.resolve({
          json: () => Promise.resolve([])
        })

      const gameState = window.gameFunctions.getGameState()
      await window.gameFunctions.init()
      expect(gameState.recipients).to.be.an('array').that.is.empty

      // Restore original fetch
      window.fetch = originalFetch
    })

    it('should handle fetch errors gracefully', async function () {
      // Mock fetch to simulate error
      const originalFetch = window.fetch
      window.fetch = () => Promise.reject(new Error('Network error'))

      const gameState = window.gameFunctions.getGameState()
      await window.gameFunctions.init()
      expect(gameState.recipients).to.be.an('array').that.is.empty

      // Restore original fetch
      window.fetch = originalFetch
    })

    it('should create recipient selection UI', async function () {
      document.body.innerHTML = `
        <div class="game-container">
          <div id="recipientCheckboxes"></div>
        </div>
      `

      // Mock fetch to return test recipients
      const originalFetch = window.fetch
      window.fetch = (url) => {
        if (url.includes('recipients.json')) {
          return Promise.resolve({
            json: () =>
              Promise.resolve([
                {
                  group: 'test1',
                  label: 'Test 1',
                  risk_function: 'reduced_time'
                },
                {
                  group: 'test2',
                  label: 'Test 2',
                  risk_function: 'right_channel_sine'
                }
              ])
          })
        }
        return originalFetch(url)
      }

      await window.gameFunctions.init()
      window.gameFunctions.createRecipientSelection()

      const checkboxes = document.querySelectorAll('.recipient-checkbox')
      expect(checkboxes).to.have.lengthOf(2) // Based on mocked recipients

      // Restore original fetch
      window.fetch = originalFetch
    })
  })
})
