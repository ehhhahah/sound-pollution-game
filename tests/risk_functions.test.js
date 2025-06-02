describe('Risk Functions', function () {
  beforeEach(function () {
    // Reset game state before each test
    window.gameFunctions.resetGameState()

    // Create necessary DOM structure
    document.body.innerHTML = `
        <div class="game-container">
          <div id="gameControls">
            <button id="startGame">Start Game</button>
          </div>
          <div id="gamePlay" style="display: none">
            <div class="sound-grid" style="display: none"></div>
          </div>
          <div class="score-display">
            <p>Time: <span id="timer">30</span>s</p>
          </div>
        </div>
      `

    // Mock AudioContext and GainNode
    window.AudioContext = class MockAudioContext {
      createMediaElementSource() {
        return {
          connect: () => {}
        }
      }
      createGain() {
        return {
          connect: () => {},
          disconnect: () => {},
          gain: { value: 1.0 }
        }
      }
      createBiquadFilter() {
        return {
          connect: () => {},
          disconnect: () => {},
          type: 'lowpass',
          frequency: { value: 200 },
          Q: { value: 1 }
        }
      }
    }
  })

  afterEach(function () {
    // Clean up any remaining audio elements
    const gameState = window.gameFunctions.getGameState()
    gameState.preloadedSounds.clear()
    gameState.soundElements = []
    gameState.activeSounds = []
    gameState.selectedSounds = []
    gameState.selectedRecipients = []

    // Restore original Audio
    window.Audio = MockAudio
  })

  describe('tinnitus risk function', function () {
    beforeEach(function () {
      // Mock immediate sound loading
      const mockAudio = function () {
        const audio = new MockAudio()
        // Immediately trigger canplaythrough
        setTimeout(() => {
          if (audio.listeners.canplaythrough) {
            audio.listeners.canplaythrough.forEach((cb) => cb())
          }
        }, 0)
        return audio
      }
      window.Audio = mockAudio
    })

    it('should preload tinnitus sound', async function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]

      // Initialize selected sounds array
      gameState.selectedSounds = []

      // Add tinnitus recipient with correct format
      gameState.selectedRecipients = [
        {
          group: 'tinnitus',
          label: 'cierpiąca na szumy ustne',
          risk_function: 'right_channel_sine'
        }
      ]

      // Apply risk functions to add tinnitus sound
      window.gameFunctions.applyRiskFunctions()

      // Verify tinnitus sound was added correctly
      expect(gameState.selectedSounds.length).to.equal(1)
      expect(gameState.selectedSounds[0].pollution).to.equal('tinnitus')
      expect(gameState.selectedSounds[0].isTinnitus).to.be.true
      expect(gameState.selectedSounds[0].sound_file).to.equal('sounds/tinnitus.ogg')

      // Preload sounds
      await window.gameFunctions.preloadSounds()

      // Verify tinnitus sound is preloaded
      expect(gameState.preloadedSounds.has('tinnitus')).to.be.true
      expect(gameState.preloadedSounds.get('tinnitus')).to.be.instanceof(MockAudio)
    })

    it('should play tinnitus sound alongside regular sounds', function () {
      const gameState = window.gameFunctions.getGameState()

      // Add tinnitus recipient
      gameState.selectedRecipients = [
        {
          group: 'tinnitus',
          label: 'cierpiąca na szumy ustne',
          risk_function: 'right_channel_sine'
        }
      ]

      // Apply risk functions to add tinnitus sound
      window.gameFunctions.applyRiskFunctions()

      // Mock Audio for testing
      const mockTinnitusAudio = new MockAudio()
      const mockRegularAudio = new MockAudio()
      gameState.preloadedSounds.set('tinnitus', mockTinnitusAudio)
      gameState.preloadedSounds.set('car', mockRegularAudio)

      // Add a regular sound
      gameState.selectedSounds.push({
        pollution: 'car',
        sound_file: 'car.mp3',
        amplitude: '50-70'
      })

      // Play sounds
      window.gameFunctions.playRandomSounds()

      // Verify both sounds are playing
      expect(mockTinnitusAudio.paused).to.be.false
      expect(mockRegularAudio.paused).to.be.false
      expect(mockTinnitusAudio.loop).to.be.true
      expect(mockRegularAudio.loop).to.be.true
    })

    it('should not include tinnitus in guess list', function () {
      const gameState = window.gameFunctions.getGameState()

      // Add tinnitus recipient
      gameState.selectedRecipients = [
        {
          group: 'tinnitus',
          label: 'cierpiąca na szumy ustne',
          risk_function: 'right_channel_sine'
        }
      ]

      // Apply risk functions to add tinnitus sound
      window.gameFunctions.applyRiskFunctions()

      // Create sound grid
      window.gameFunctions.createSoundGrid()

      // Verify tinnitus is not in the grid
      const buttons = document.querySelectorAll('.sound-button')
      const tinnitusButton = Array.from(buttons).find((button) => button.dataset.sound === 'tinnitus')
      expect(tinnitusButton).to.be.undefined
    })

    it('should not calculate points for tinnitus sounds', function () {
      const gameState = window.gameFunctions.getGameState()
      const initialScore = gameState.score

      // Add tinnitus sound to active sounds
      gameState.activeSounds = [
        {
          pollution: 'tinnitus',
          sound_file: 'sounds/tinnitus.ogg',
          amplitude: '0-0',
          isTinnitus: true
        }
      ]

      // Try to make a guess with tinnitus
      window.gameFunctions.makeGuess({
        pollution: 'tinnitus',
        sound_file: 'sounds/tinnitus.ogg',
        amplitude: '0-0',
        isTinnitus: true
      })

      // Verify score hasn't changed
      expect(gameState.score).to.equal(initialScore)
    })

    it('should handle multiple risk functions together', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions
      gameState.pollutions = [{ pollution: 'loud', sound_file: 'loud.mp3', amplitude: '60-70' }]

      // Add multiple recipients with different risk functions
      gameState.selectedRecipients = [
        {
          group: 'niewidomi',
          label: 'niewidoma',
          risk_function: 'loud_sounds_louder'
        },
        {
          group: 'spektrum autyzmu',
          label: 'na spektrum autyzmu',
          risk_function: 'reduced_time'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify both effects are applied
      const loudSound = gameState.pollutions.find((s) => s.pollution === 'loud')
      expect(loudSound.volumeAdjustment).to.equal(3)
      expect(gameState.timeRemaining).to.equal(20) // Reduced by 10 seconds
    })

    it('should handle edge cases in amplitude parsing', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions with edge cases
      gameState.pollutions = [
        { pollution: 'exact_50', sound_file: 'exact_50.mp3', amplitude: '50-60' },
        { pollution: 'invalid_format', sound_file: 'invalid.mp3', amplitude: 'invalid' },
        { pollution: 'no_amplitude', sound_file: 'no_amp.mp3' }
      ]

      // Add recipient with loud_sounds_louder risk function
      gameState.selectedRecipients = [
        {
          group: 'niewidomi',
          label: 'niewidoma',
          risk_function: 'loud_sounds_louder'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify volume adjustments
      const exact50Sound = gameState.pollutions.find((s) => s.pollution === 'exact_50')
      const invalidFormatSound = gameState.pollutions.find((s) => s.pollution === 'invalid_format')
      const noAmplitudeSound = gameState.pollutions.find((s) => s.pollution === 'no_amplitude')

      expect(exact50Sound.volumeAdjustment).to.equal(3) // Should amplify at exactly 50
      expect(invalidFormatSound.volumeAdjustment).to.be.undefined
      expect(noAmplitudeSound.volumeAdjustment).to.be.undefined
    })
  })

  describe('loud_sounds_louder risk function', function () {
    it('should amplify sounds with amplitude above 50', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions with different amplitudes
      gameState.pollutions = [
        { pollution: 'quiet', sound_file: 'quiet.mp3', amplitude: '30-40' },
        { pollution: 'medium', sound_file: 'medium.mp3', amplitude: '45-55' },
        { pollution: 'loud', sound_file: 'loud.mp3', amplitude: '60-70' },
        { pollution: 'very_loud', sound_file: 'very_loud.mp3', amplitude: 'up to 80 dB' }
      ]

      // Add recipient with loud_sounds_louder risk function
      gameState.selectedRecipients = [
        {
          group: 'niewidomi',
          label: 'niewidoma',
          risk_function: 'loud_sounds_louder'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify volume adjustments
      const loudSound = gameState.pollutions.find((s) => s.pollution === 'loud')
      const veryLoudSound = gameState.pollutions.find((s) => s.pollution === 'very_loud')
      const quietSound = gameState.pollutions.find((s) => s.pollution === 'quiet')
      const mediumSound = gameState.pollutions.find((s) => s.pollution === 'medium')

      expect(loudSound.volumeAdjustment).to.equal(3)
      expect(veryLoudSound.volumeAdjustment).to.equal(3)
      expect(quietSound.volumeAdjustment).to.be.undefined
      expect(mediumSound.volumeAdjustment).to.be.undefined
    })

    it('should apply volume adjustment when playing sounds', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions
      gameState.pollutions = [{ pollution: 'loud', sound_file: 'loud.mp3', amplitude: '60-70', volumeAdjustment: 3 }]

      // Mock audio elements
      const mockAudio = new MockAudio()
      gameState.preloadedSounds.set('loud', mockAudio)

      // Play the sound
      window.gameFunctions.manageSoundElement(gameState.pollutions[0], true)

      // Verify the sound is playing
      expect(mockAudio.paused).to.be.false
      expect(mockAudio.loop).to.be.true
    })

    it('should handle multiple risk functions together', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions
      gameState.pollutions = [{ pollution: 'loud', sound_file: 'loud.mp3', amplitude: '60-70' }]

      // Add multiple recipients with different risk functions
      gameState.selectedRecipients = [
        {
          group: 'niewidomi',
          label: 'niewidoma',
          risk_function: 'loud_sounds_louder'
        },
        {
          group: 'spektrum autyzmu',
          label: 'na spektrum autyzmu',
          risk_function: 'reduced_time'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify both effects are applied
      const loudSound = gameState.pollutions.find((s) => s.pollution === 'loud')
      expect(loudSound.volumeAdjustment).to.equal(3)
      expect(gameState.timeRemaining).to.equal(20) // Reduced by 10 seconds
    })

    it('should handle edge cases in amplitude parsing', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions with edge cases
      gameState.pollutions = [
        { pollution: 'exact_50', sound_file: 'exact_50.mp3', amplitude: '50-60' },
        { pollution: 'invalid_format', sound_file: 'invalid.mp3', amplitude: 'invalid' },
        { pollution: 'no_amplitude', sound_file: 'no_amp.mp3' }
      ]

      // Add recipient with loud_sounds_louder risk function
      gameState.selectedRecipients = [
        {
          group: 'niewidomi',
          label: 'niewidoma',
          risk_function: 'loud_sounds_louder'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify volume adjustments
      const exact50Sound = gameState.pollutions.find((s) => s.pollution === 'exact_50')
      const invalidFormatSound = gameState.pollutions.find((s) => s.pollution === 'invalid_format')
      const noAmplitudeSound = gameState.pollutions.find((s) => s.pollution === 'no_amplitude')

      expect(exact50Sound.volumeAdjustment).to.equal(3) // Should amplify at exactly 50
      expect(invalidFormatSound.volumeAdjustment).to.be.undefined
      expect(noAmplitudeSound.volumeAdjustment).to.be.undefined
    })
  })

  describe('lowpass_filter risk function', function () {
    it('should apply 200Hz lowpass filter to all non-tinnitus sounds', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]

      // Initialize selectedSounds with the pollutions
      gameState.selectedSounds = [...gameState.pollutions]

      // Add recipient with lowpass_filter risk function
      gameState.selectedRecipients = [
        {
          group: 'hearing_impaired',
          label: 'osoba z niedosłuchem',
          risk_function: 'lowpass_filter'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify lowpass filter is applied to all sounds
      gameState.selectedSounds.forEach((sound) => {
        if (!sound.isTinnitus) {
          expect(sound.lowpassFilter).to.equal(200)
        }
      })
    })

    it('should not apply lowpass filter to tinnitus sounds', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]

      // Initialize selectedSounds with the pollutions
      gameState.selectedSounds = [...gameState.pollutions]

      // Add tinnitus sound
      const tinnitusSound = {
        pollution: 'tinnitus',
        sound_file: 'sounds/tinnitus.ogg',
        amplitude: '0-0',
        isTinnitus: true
      }
      gameState.selectedSounds.push(tinnitusSound)

      // Add recipient with lowpass_filter risk function
      gameState.selectedRecipients = [
        {
          group: 'hearing_impaired',
          label: 'osoba z niedosłuchem',
          risk_function: 'lowpass_filter'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify tinnitus sound is not affected
      const tinnitusSoundAfter = gameState.selectedSounds.find((sound) => sound.isTinnitus)
      expect(tinnitusSoundAfter.lowpassFilter).to.be.undefined
    })

    it('should handle multiple risk functions together', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]

      // Initialize selectedSounds with the pollutions
      gameState.selectedSounds = [...gameState.pollutions]

      // Add multiple recipients with different risk functions
      gameState.selectedRecipients = [
        {
          group: 'hearing_impaired',
          label: 'osoba z niedosłuchem',
          risk_function: 'lowpass_filter'
        },
        {
          group: 'tinnitus',
          label: 'cierpiąca na szumy ustne',
          risk_function: 'right_channel_sine'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify both effects are applied
      const regularSound = gameState.selectedSounds.find((sound) => !sound.isTinnitus)
      const tinnitusSound = gameState.selectedSounds.find((sound) => sound.isTinnitus)

      expect(regularSound.lowpassFilter).to.equal(200)
      expect(tinnitusSound.isTinnitus).to.be.true
      expect(tinnitusSound.lowpassFilter).to.be.undefined
    })

    it('should properly connect and disconnect filter nodes in audio chain', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollution
      gameState.pollutions = [{ pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }]

      // Initialize selectedSounds with the pollution
      gameState.selectedSounds = [...gameState.pollutions]

      // Add recipient with lowpass_filter risk function
      gameState.selectedRecipients = [
        {
          group: 'hearing_impaired',
          label: 'osoba z niedosłuchem',
          risk_function: 'lowpass_filter'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Mock audio element
      const mockAudio = new MockAudio()
      gameState.preloadedSounds.set('car', mockAudio)

      // Play the sound
      window.gameFunctions.manageSoundElement(gameState.selectedSounds[0], true)

      // Verify the sound is playing and has the filter applied
      expect(mockAudio.paused).to.be.false
      expect(mockAudio.loop).to.be.true
      expect(gameState.selectedSounds[0].lowpassFilter).to.equal(200)
    })

    it('should handle empty selectedSounds array', function () {
      const gameState = window.gameFunctions.getGameState()

      // Set up test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]

      // Add recipient with lowpass_filter risk function
      gameState.selectedRecipients = [
        {
          group: 'hearing_impaired',
          label: 'osoba z niedosłuchem',
          risk_function: 'lowpass_filter'
        }
      ]

      // Apply risk functions
      window.gameFunctions.applyRiskFunctions()

      // Verify sounds were selected and filter was applied
      expect(gameState.selectedSounds.length).to.be.greaterThan(0)
      gameState.selectedSounds.forEach((sound) => {
        if (!sound.isTinnitus) {
          expect(sound.lowpassFilter).to.equal(200)
        }
      })
    })
  })
})
