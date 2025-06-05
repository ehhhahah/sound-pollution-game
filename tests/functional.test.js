describe('Functional tests', function () {
  describe('Browser Compatibility', function () {
    beforeEach(function () {
      window.gameFunctions.resetGameState()
    })

    describe('Audio Format Support', function () {
      it('should handle different audio formats', async function () {
        const gameState = window.gameFunctions.getGameState()
        const formats = ['mp3', 'ogg', 'wav']

        for (const format of formats) {
          const sound = {
            pollution: `test_${format}`,
            sound_file: `test.${format}`,
            amplitude: '50-70'
          }
          gameState.pollutions = [sound]

          await window.gameFunctions.preloadSounds()
          expect(gameState.preloadedSounds.size).to.equal(1)
        }
      })

      it('should handle touch events', function () {
        const gameState = window.gameFunctions.getGameState()
        document.body.innerHTML = `
            <div class="game-container">
              <div class="sound-grid"></div>
            </div>
          `

        // Create a test sound
        const testSound = {
          pollution: 'test',
          sound_file: 'test.mp3',
          amplitude: '50-70'
        }

        // Use createSoundButton to properly set up the button with touch events
        const button = window.gameFunctions.createSoundButton(testSound)
        document.querySelector('.sound-grid').appendChild(button)

        // Create and dispatch touch event
        const touchEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true
        })

        button.dispatchEvent(touchEvent)
        expect(button.classList.contains('active')).to.be.true
      })
    })
  })

  describe('Performance Testing', function () {
    beforeEach(function () {
      window.gameFunctions.resetGameState()
    })

    describe('Sound Loading', function () {
      it('should load sounds within acceptable time', async function () {
        const startTime = performance.now()

        await window.gameFunctions.preloadSounds()

        const endTime = performance.now()
        const loadTime = endTime - startTime

        expect(loadTime).to.be.lessThan(5000) // 5 seconds max
      })
    })

    describe('Memory Usage', function () {
      it('should not leak memory during sound playback', async function () {
        const gameState = window.gameFunctions.getGameState()
        const initialMemory = performance.memory?.usedJSHeapSize || 0

        // Play multiple sounds
        for (let i = 0; i < 5; i++) {
          window.gameFunctions.playRandomSounds()
          await new Promise((resolve) => setTimeout(resolve, 100))
        }

        const finalMemory = performance.memory?.usedJSHeapSize || 0
        const memoryIncrease = finalMemory - initialMemory

        expect(memoryIncrease).to.be.lessThan(50 * 1024 * 1024) // 50MB max increase
      })
    })
  })

  describe('Accessibility Testing', function () {
    beforeEach(function () {
      window.gameFunctions.resetGameState()
      document.body.innerHTML = `
          <div class="game-container">
            <div id="gameControls">
              <button id="startGame">Start Game</button>
              <div id="timeAdjustment">
                <button id="decreaseTime">-10s</button>
                <button id="increaseTime">+10s</button>
              </div>
              <div class="recipient-selection">
                <h2>Będę słuchać jako <span id="selectedRecipients"></span></h2>
                <div id="recipientCheckboxes">
                  <!-- Recipient checkboxes will be dynamically added here -->
                </div>
              </div>
            </div>
            <div id="gamePlay" style="display: none">
              <div class="sound-grid"></div>
              <button id="applyGuess">Apply Guess</button>
            </div>
          </div>
        `
      window.gameFunctions.setupEventListeners()
    })

    describe('Recipient Selection Keyboard Navigation', function () {
      it('should support keyboard navigation between recipient checkboxes', function () {
        // Create test recipients
        const recipients = [
          { group: 'test1', label: 'Test 1', risk_function: 'reduced_time' },
          { group: 'test2', label: 'Test 2', risk_function: 'right_channel_sine' }
        ]
        window.gameFunctions.getGameState().recipients = recipients
        window.gameFunctions.createRecipientSelection()

        const checkboxes = document.querySelectorAll('.recipient-checkbox input')
        expect(checkboxes).to.have.lengthOf(2)

        // Focus first checkbox
        checkboxes[0].focus()
        expect(document.activeElement).to.equal(checkboxes[0])

        // Simulate Tab key
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' })
        checkboxes[0].dispatchEvent(tabEvent)
        expect(document.activeElement).to.equal(checkboxes[1])
      })

      it('should toggle checkbox state with keyboard', function () {
        // Create test recipient
        const recipient = { group: 'test1', label: 'Test 1', risk_function: 'reduced_time' }
        window.gameFunctions.getGameState().recipients = [recipient]
        window.gameFunctions.createRecipientSelection()

        const checkbox = document.querySelector('.recipient-checkbox input')
        expect(checkbox).to.exist

        // Focus checkbox
        checkbox.focus()

        // Test Space key
        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
        checkbox.dispatchEvent(spaceEvent)
        expect(checkbox.checked).to.be.true

        // Test Enter key
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
        checkbox.dispatchEvent(enterEvent)
        expect(checkbox.checked).to.be.false
      })

      it('should have proper ARIA attributes for recipient checkboxes', function () {
        // Create test recipient
        const recipient = { group: 'test1', label: 'Test 1', risk_function: 'reduced_time' }
        window.gameFunctions.getGameState().recipients = [recipient]
        window.gameFunctions.createRecipientSelection()

        const checkboxContainer = document.querySelector('.recipient-checkbox')
        const checkbox = checkboxContainer.querySelector('input')
        const label = checkboxContainer.querySelector('label')

        expect(checkboxContainer.getAttribute('role')).to.equal('group')
        expect(checkboxContainer.getAttribute('aria-label')).to.equal('Select Test 1 as recipient')
        expect(checkbox.getAttribute('aria-label')).to.equal('Test 1')
        expect(checkbox.getAttribute('tabindex')).to.equal('0')
        expect(label.htmlFor).to.equal(checkbox.id)
      })

      it('should update selected recipients text when toggling with keyboard', function () {
        // Create test recipients
        const recipients = [
          { group: 'test1', label: 'Test 1', risk_function: 'reduced_time' },
          { group: 'test2', label: 'Test 2', risk_function: 'right_channel_sine' }
        ]
        window.gameFunctions.getGameState().recipients = recipients
        window.gameFunctions.createRecipientSelection()

        const checkboxes = document.querySelectorAll('.recipient-checkbox input')

        // Toggle first checkbox with keyboard
        checkboxes[0].focus()
        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
        checkboxes[0].dispatchEvent(spaceEvent)

        expect(document.getElementById('selectedRecipients').textContent).to.equal('test 1')
      })
    })

    describe('Keyboard Navigation', function () {
      it('should support keyboard navigation', function () {
        const startGameBtn = document.getElementById('startGame')
        const decreaseTimeBtn = document.getElementById('decreaseTime')

        // Simulate keyboard navigation
        startGameBtn.focus()
        expect(document.activeElement).to.equal(startGameBtn)

        // Simulate Tab key
        const tabEvent = new KeyboardEvent('keydown', { key: 'Tab' })
        startGameBtn.dispatchEvent(tabEvent)
        expect(document.activeElement).to.equal(decreaseTimeBtn)

        // Test Enter key
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
        decreaseTimeBtn.dispatchEvent(enterEvent)
        expect(window.gameFunctions.getGameState().timeRemaining).to.equal(20)
      })

      it('should handle keyboard shortcuts', function () {
        const gameState = window.gameFunctions.getGameState()
        // Initialize game state properly
        gameState.selectedSounds = [{ pollution: 'test', sound_file: 'test.mp3' }]
        gameState.isGuessingPhase = false // Ensure we're not in guessing phase
        gameState.pollutions = [{ pollution: 'test', sound_file: 'test.mp3' }] // Add to pollutions array

        // Add preloaded sound
        const mockAudio = new MockAudio()
        gameState.preloadedSounds.set('test', mockAudio)

        // Simulate space key for sound playback
        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
        document.dispatchEvent(spaceEvent)

        expect(gameState.activeSounds.length).to.be.greaterThan(0)
      })
    })

    describe('Screen Reader Compatibility', function () {
      it('should have proper ARIA attributes', function () {
        const startGameBtn = document.getElementById('startGame')
        const soundGrid = document.querySelector('.sound-grid')

        expect(startGameBtn.getAttribute('aria-label')).to.equal('Start the game')
        expect(soundGrid.getAttribute('role')).to.equal('grid')
        expect(soundGrid.getAttribute('aria-label')).to.equal('Sound selection grid')
      })
    })
  })

  describe('UI Functions', function () {
    beforeEach(function () {
      document.body.innerHTML = `
          <div class="game-container">
            <div id="testId">Test ID</div>
            <div class="testClass">Test Class</div>
            <div class="testClass">Another Test Class</div>
            <div id="flexContainer">Flex Container</div>
          </div>
        `
    })

    describe('toggleUIElements', function () {
      it('should handle ID selectors', function () {
        window.gameFunctions.toggleUIElements({
          testId: 'none'
        })
        expect(document.getElementById('testId').style.display).to.equal('none')
      })

      it('should handle class selectors', function () {
        window.gameFunctions.toggleUIElements({
          '.testClass': 'none'
        })
        const elements = document.querySelectorAll('.testClass')
        elements.forEach((element) => {
          expect(element.style.display).to.equal('none')
        })
      })

      it('should support flex display', function () {
        window.gameFunctions.toggleUIElements(
          {
            flexContainer: true
          },
          true
        )
        expect(document.getElementById('flexContainer').style.display).to.equal('flex')
      })

      it('should handle multiple elements with different display values', function () {
        window.gameFunctions.toggleUIElements(
          {
            testId: 'none',
            '.testClass': 'block',
            flexContainer: true
          },
          true
        )
        expect(document.getElementById('testId').style.display).to.equal('none')
        const classElements = document.querySelectorAll('.testClass')
        classElements.forEach((element) => {
          expect(element.style.display).to.equal('block')
        })
        expect(document.getElementById('flexContainer').style.display).to.equal('flex')
      })
    })

    describe('setupButtonListeners', function () {
      it('should set up all accessibility attributes', function () {
        const button = document.createElement('button')
        const action = () => {}
        const ariaLabel = 'Test Button'

        window.gameFunctions.setupButtonListeners(button, action, ariaLabel)

        expect(button.getAttribute('aria-label')).to.equal(ariaLabel)
        expect(button.getAttribute('tabindex')).to.equal('0')
        expect(button.getAttribute('role')).to.equal('button')
      })

      it('should handle click events', function () {
        const button = document.createElement('button')
        let clicked = false
        const action = () => {
          clicked = true
        }

        window.gameFunctions.setupButtonListeners(button, action, 'Test Button')
        button.click()

        expect(clicked).to.be.true
      })

      it('should handle keyboard events', function () {
        const button = document.createElement('button')
        let triggered = false
        const action = () => {
          triggered = true
        }

        window.gameFunctions.setupButtonListeners(button, action, 'Test Button')

        // Test Enter key
        const enterEvent = new KeyboardEvent('keydown', { key: 'Enter' })
        button.dispatchEvent(enterEvent)
        expect(triggered).to.be.true

        // Reset and test Space key
        triggered = false
        const spaceEvent = new KeyboardEvent('keydown', { key: ' ' })
        button.dispatchEvent(spaceEvent)
        expect(triggered).to.be.true
      })

      it('should handle touch events', function () {
        const button = document.createElement('button')
        let touched = false
        const action = () => {
          touched = true
        }

        window.gameFunctions.setupButtonListeners(button, action, 'Test Button')

        // Test touchstart
        const touchStartEvent = new TouchEvent('touchstart', {
          bubbles: true,
          cancelable: true
        })
        button.dispatchEvent(touchStartEvent)
        expect(button.classList.contains('active')).to.be.true
        expect(touched).to.be.true

        // Test touchend
        const touchEndEvent = new TouchEvent('touchend', {
          bubbles: true,
          cancelable: true
        })
        button.dispatchEvent(touchEndEvent)
        expect(button.classList.contains('active')).to.be.false
      })

      it('should handle null button gracefully', function () {
        expect(() => {
          window.gameFunctions.setupButtonListeners(null, () => {}, 'Test Button')
        }).to.not.throw()
      })
    })
  })

  describe('Error Handling', function () {
    beforeEach(function () {
      window.gameFunctions.resetGameState()
    })

    it('should handle network errors during sound loading', async function () {
      // Mock fetch to simulate network error
      const originalFetch = window.fetch
      window.fetch = () => Promise.reject(new Error('Network error'))

      const gameState = window.gameFunctions.getGameState()
      await window.gameFunctions.loadData()
      expect(gameState.pollutions).to.be.an('array').that.is.empty

      // Restore original fetch
      window.fetch = originalFetch
    })
  })
})
