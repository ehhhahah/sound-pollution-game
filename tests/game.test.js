/**
 * Sound Pollution Challenge Game - Test Suite
 * Tests the game logic and functionality using Mocha and Chai.
 * Covers sound selection, guess validation, scoring, and game state management.
 */

// Test suite for game logic
describe('Game Logic', function () {
  beforeEach(async function () {
    // Reset game state before each test
    window.gameFunctions.resetGameState()
    // Mock the init function to prevent actual initialization
    window.init = async function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.pollutions = await window.gameFunctions.loadData()
    }
    await window.gameFunctions.init()
  })

  afterEach(function () {
    // Clean up any remaining audio elements
    const gameState = window.gameFunctions.getGameState()
    gameState.preloadedSounds.clear()
    gameState.soundElements = []
    gameState.activeSounds = []
  })

  // Test sound preloading functionality
  describe('Sound Preloading', function () {
    it('should preload all sounds successfully', async function () {
      const gameState = window.gameFunctions.getGameState()
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

      await window.gameFunctions.preloadSounds()
      expect(gameState.preloadedSounds.size).to.equal(gameState.pollutions.length)

      // Restore original Audio
      window.Audio = MockAudio
    })

    it('should handle preloading errors gracefully', async function () {
      // Mock a failed sound load
      const mockAudio = function () {
        const audio = new MockAudio()
        audio.listeners = {
          error: []
        }
        audio.addEventListener = (event, callback) => {
          if (event === 'error') {
            audio.listeners.error.push(callback)
            setTimeout(callback, 0)
          }
        }
        // Simulate error by not triggering canplaythrough
        return audio
      }
      window.Audio = mockAudio

      const gameState = window.gameFunctions.getGameState()
      // Set up some test pollutions with array of sound files
      gameState.pollutions = [
        { pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' },
        { pollution: 'train', sound_file: ['train.mp3'], amplitude: '60-80' }
      ]
      await window.gameFunctions.preloadSounds()
      expect(gameState.preloadedSounds.size).to.equal(0) // No sounds should be preloaded due to errors

      // Restore original Audio
      window.Audio = MockAudio
    })
  })

  // Test multiple sound playback
  describe('Multiple Sound Playback', function () {
    beforeEach(async function () {
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

      // Initialize game state with some test pollutions
      const gameState = window.gameFunctions.getGameState()
      gameState.pollutions = [
        { pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' },
        { pollution: 'train', sound_file: ['train.mp3'], amplitude: '60-80' },
        { pollution: 'plane', sound_file: ['plane.mp3'], amplitude: '70-90' }
      ]

      // Preload sounds
      await window.gameFunctions.preloadSounds()

      // Restore original Audio
      window.Audio = MockAudio
    })

    it('should play multiple sounds simultaneously', function () {
      const gameState = window.gameFunctions.getGameState()
      // Ensure we have preloaded sounds
      const mockAudio1 = new MockAudio()
      const mockAudio2 = new MockAudio()
      gameState.preloadedSounds.set('car', mockAudio1)
      gameState.preloadedSounds.set('train', mockAudio2)

      window.gameFunctions.playRandomSounds()
      expect(gameState.activeSounds.length).to.be.greaterThan(0)
      expect(gameState.activeSounds.length).to.be.lessThanOrEqual(5)
    })

    it('should stop all sounds when requested', function () {
      const gameState = window.gameFunctions.getGameState()
      window.gameFunctions.playRandomSounds()
      const initialActiveSounds = gameState.activeSounds.length
      window.gameFunctions.stopAllSounds()
      expect(gameState.activeSounds.length).to.equal(0)
      expect(gameState.soundElements.length).to.equal(0)
    })

    it('should play all selected sounds simultaneously and loop them', async function () {
      const gameState = window.gameFunctions.getGameState()
      // Set up test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' },
        { pollution: 'train', sound_file: ['train.mp3'], amplitude: '60-80' }
      ]

      // Mock preloaded sounds
      const mockAudio1 = new MockAudio()
      const mockAudio2 = new MockAudio()
      gameState.preloadedSounds.set('car', mockAudio1)
      gameState.preloadedSounds.set('train', mockAudio2)

      // Add sounds to selectedSounds
      gameState.selectedSounds = [
        { pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' },
        { pollution: 'train', sound_file: ['train.mp3'], amplitude: '60-80' }
      ]

      // Play sounds and wait for playback to start
      await window.gameFunctions.playRandomSounds()

      // Wait a small amount of time to ensure playback has started
      await new Promise((resolve) => setTimeout(resolve, 50))

      // Verify all sounds are playing and looping
      expect(mockAudio1.loop).to.be.true
      expect(mockAudio2.loop).to.be.true
      expect(mockAudio1.paused).to.be.false
      expect(mockAudio2.paused).to.be.false
    })
  })

  // Test guess validation functionality
  describe('Guess Validation', function () {
    beforeEach(function () {
      // Create necessary DOM structure
      document.body.innerHTML = `
        <div class="game-container">
          <div class="sound-grid"></div>
          <div class="score-display">
            <p>Score: <span id="score">0</span></p>
          </div>
        </div>
      `

      // Create a sound button for testing
      const button = document.createElement('button')
      button.className = 'sound-button'
      button.dataset.sound = 'car'
      document.querySelector('.sound-grid').appendChild(button)
    })

    it('should add correct class for valid guesses', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.activeSounds = [{ pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' }]

      window.gameFunctions.makeGuess({ pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' })

      const button = document.querySelector('.sound-button')
      expect(button.classList.contains('correct')).to.be.true
      expect(button.classList.contains('incorrect')).to.be.false
    })

    it('should add incorrect class for invalid guesses', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.activeSounds = [{ pollution: 'train', sound_file: ['train.mp3'], amplitude: '60-80' }]

      window.gameFunctions.makeGuess({ pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' })

      const button = document.querySelector('.sound-button')
      expect(button.classList.contains('incorrect')).to.be.true
      expect(button.classList.contains('correct')).to.be.false
    })

    it('should update class when making multiple guesses on the same sound', function () {
      const gameState = window.gameFunctions.getGameState()
      const button = document.querySelector('.sound-button')

      // First guess - incorrect
      gameState.activeSounds = [{ pollution: 'train', sound_file: ['train.mp3'], amplitude: '60-80' }]
      window.gameFunctions.makeGuess({ pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' })
      expect(button.classList.contains('incorrect')).to.be.true

      // Second guess - correct
      gameState.activeSounds = [{ pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' }]
      window.gameFunctions.makeGuess({ pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' })
      expect(button.classList.contains('correct')).to.be.true
      expect(button.classList.contains('incorrect')).to.be.false
    })

    it('should correctly identify valid guesses', function () {
      const activeSounds = [
        { pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' },
        { pollution: 'train', sound_file: ['train.mp3'], amplitude: '60-80' }
      ]
      const selectedSound = { pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' }
      expect(isCorrectGuess(activeSounds, selectedSound)).to.be.true
    })

    it('should correctly identify invalid guesses', function () {
      const activeSounds = [
        { pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' },
        { pollution: 'train', sound_file: ['train.mp3'], amplitude: '60-80' }
      ]
      const selectedSound = { pollution: 'plane', sound_file: ['plane.mp3'], amplitude: '70-90' }
      expect(isCorrectGuess(activeSounds, selectedSound)).to.be.false
    })

    it('should handle null or undefined sounds', function () {
      expect(isCorrectGuess(null, { pollution: 'car' })).to.be.false
      expect(isCorrectGuess([], { pollution: 'car' })).to.be.false
      expect(isCorrectGuess([{ pollution: 'car' }], null)).to.be.false
    })
  })

  // Test scoring functionality
  describe('Score Calculation', function () {
    it('should award points based on sound amplitude', function () {
      const sound = { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }
      expect(calculatePoints(sound, true)).to.equal(50) // 100 - 50 = 50 points
    })

    it('should award minimum points for very loud sounds', function () {
      const sound = { pollution: 'plane', sound_file: 'plane.mp3', amplitude: '90-100' }
      expect(calculatePoints(sound, true)).to.equal(10) // Minimum 10 points
    })

    it('should handle "up to X dB" amplitude format', function () {
      const sound = { pollution: 'sirens', sound_file: 'sirens.mp3', amplitude: 'up to 120 dB' }
      expect(calculatePoints(sound, true)).to.equal(10) // Minimum 10 points for very loud sound
    })

    it('should handle "up to X dB" format with moderate sound level', function () {
      const sound = { pollution: 'motorcycles', sound_file: 'motorcycles.mp3', amplitude: 'up to 80 dB' }
      expect(calculatePoints(sound, true)).to.equal(20) // 100 - 80 = 20 points
    })

    it('should deduct points for incorrect guesses', function () {
      const sound = { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }
      expect(calculatePoints(sound, false)).to.equal(-20)
    })

    it('should only award points once for multiple correct guesses on the same sound', function () {
      const gameState = window.gameFunctions.getGameState()
      const sound = { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }

      // Setup active sounds
      gameState.activeSounds = [sound]
      gameState.score = 0
      gameState.guessedSounds.clear()

      // Simulate multiple correct guesses on the same sound
      window.gameFunctions.makeGuess(sound) // First correct guess
      const firstScore = gameState.score
      window.gameFunctions.makeGuess(sound) // Second correct guess
      const secondScore = gameState.score
      window.gameFunctions.makeGuess(sound) // Third correct guess
      const thirdScore = gameState.score

      // Verify only first guess awarded points
      expect(firstScore).to.equal(50) // 100 - 50 = 50 points
      expect(secondScore).to.equal(50) // Should remain the same
      expect(thirdScore).to.equal(50) // Should remain the same
    })
  })

  // Test game state management
  describe('Game State', function () {
    it('should initialize with correct default values', function () {
      const gameState = window.gameFunctions.getGameState()
      expect(gameState.score).to.equal(0)
      expect(gameState.timeRemaining).to.equal(30) // Updated to 30 seconds
      expect(gameState.activeSounds).to.be.an('array').that.is.empty
      expect(gameState.soundElements).to.be.an('array').that.is.empty
      expect(gameState.preloadedSounds).to.be.instanceof(Map)
      expect(gameState.isLoading).to.be.false
    })

    it('should select random sounds at game start and keep them constant', function () {
      const gameState = window.gameFunctions.getGameState()
      // Set up test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' },
        { pollution: 'plane', sound_file: 'plane.mp3', amplitude: '70-90' },
        { pollution: 'sirens', sound_file: 'sirens.mp3', amplitude: '80-100' },
        { pollution: 'construction', sound_file: 'construction.mp3', amplitude: '90-110' }
      ]

      // Mock preloaded sounds
      gameState.pollutions.forEach((pollution) => {
        gameState.preloadedSounds.set(pollution.pollution, new MockAudio())
      })

      // Initial sound selection
      window.gameFunctions.playRandomSounds()
      const initialActiveSounds = [...gameState.activeSounds]

      // Call playRandomSounds again
      window.gameFunctions.playRandomSounds()
      const secondActiveSounds = gameState.activeSounds

      // Verify sounds remain the same
      expect(secondActiveSounds).to.deep.equal(initialActiveSounds)
    })
  })
})

describe('Modified Game Logic', function () {
  beforeEach(async function () {
    // Reset game state before each test
    window.gameFunctions.resetGameState()

    // Create necessary DOM structure
    document.body.innerHTML = `
      <div class="game-container">
        <div id="gameControls">
          <button id="startGame">Start Game</button>
          <div id="timeAdjustment" class="time-adjustment">
            <button id="decreaseTime" class="time-button">-10s (More Points)</button>
            <button id="increaseTime" class="time-button">+10s (Less Points)</button>
          </div>
        </div>
        <div id="loadingScreen" style="display: none">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p id="loadingProgress">Loading sounds... 0%</p>
          </div>
        </div>
        <div id="gamePlay" style="display: none">
          <div class="sound-grid" style="display: none"></div>
          <button id="applyGuess" class="primary-button" style="display: none">Apply Guess</button>
        </div>
        <div id="gameOver" style="display: none">
          <h2>Game Over!</h2>
          <p>Final Score: <span id="finalScore">0</span></p>
          <button id="playAgain">Play Again</button>
        </div>
        <div class="score-display">
          <p>Score: <span id="score">0</span></p>
          <p>Time: <span id="timer">30</span>s</p>
        </div>
      </div>
    `

    // Mock the init function to prevent actual initialization
    window.init = async function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.pollutions = await window.gameFunctions.loadData()
      // Ensure sound grid is hidden after initialization
      const soundGrid = document.querySelector('.sound-grid')
      if (soundGrid) {
        soundGrid.style.display = 'none'
      }
    }
    await window.gameFunctions.init()
  })

  describe('Initial Game State', function () {
    it('should not display sound grid at start', function () {
      const soundGrid = document.querySelector('.sound-grid')
      expect(soundGrid).to.exist
      expect(soundGrid.style.display).to.equal('none')
    })

    it('should show time adjustment controls at start', function () {
      const timeAdjustment = document.getElementById('timeAdjustment')
      const decreaseTime = document.getElementById('decreaseTime')
      const increaseTime = document.getElementById('increaseTime')

      expect(timeAdjustment).to.exist
      expect(decreaseTime).to.exist
      expect(increaseTime).to.exist
      expect(timeAdjustment.style.display).to.not.equal('none')
    })
  })

  describe('Time Adjustment', function () {
    it('should decrease time by 10s and add 50 points', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.timeRemaining = 30
      gameState.score = 100
      const initialTime = gameState.timeRemaining

      window.gameFunctions.adjustTime(-10)

      expect(gameState.timeRemaining).to.equal(initialTime - 10)
      expect(gameState.score).to.equal(150) // 100 + 50 points
    })

    it('should increase time by 10s and subtract 25 points', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.timeRemaining = 30
      gameState.score = 100
      const initialTime = gameState.timeRemaining

      window.gameFunctions.adjustTime(10)

      expect(gameState.timeRemaining).to.equal(initialTime + 10)
      expect(gameState.score).to.equal(75) // 100 - 25 points
    })

    it('should not allow time adjustment below 10s', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.timeRemaining = 15
      gameState.score = 100

      window.gameFunctions.adjustTime(-10)

      expect(gameState.timeRemaining).to.equal(10)
      expect(gameState.score).to.equal(150) // 100 + 50 points
    })

    it('should handle multiple time adjustments correctly', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.timeRemaining = 30
      gameState.score = 100

      // First adjustment: decrease time (-10s)
      window.gameFunctions.adjustTime(-10)
      expect(gameState.timeRemaining).to.equal(20)
      expect(gameState.score).to.equal(150) // 100 + 50 points

      // Second adjustment: increase time (+10s)
      window.gameFunctions.adjustTime(10)
      expect(gameState.timeRemaining).to.equal(30)
      expect(gameState.score).to.equal(125) // 150 - 25 points
    })
  })

  describe('Guessing Phase', function () {
    it('should start guessing phase after initial time', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.timeRemaining = 0

      window.gameFunctions.startGuessingPhase()

      expect(gameState.isGuessingPhase).to.be.true
      expect(gameState.guessingTimeRemaining).to.equal(10)
      expect(document.querySelector('.sound-grid').style.display).to.not.equal('none')
    })

    it('should end guessing phase after time expires', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.isGuessingPhase = true
      gameState.guessingTimeRemaining = 0

      window.gameFunctions.endGuessingPhase()

      expect(gameState.isGuessingPhase).to.be.false
    })

    it('should end guessing phase when apply guess is clicked', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.isGuessingPhase = true

      window.gameFunctions.applyGuess()

      expect(gameState.isGuessingPhase).to.be.false
    })
  })
})

describe('Transition State', function () {
  beforeEach(function () {
    // Reset game state before each test
    window.gameFunctions.resetGameState()

    // Create necessary DOM structure
    document.body.innerHTML = `
      <div class="game-container">
        <div id="gameControls">
          <button id="startGame">Start Game</button>
          <div id="timeAdjustment" class="time-adjustment">
            <button id="decreaseTime" class="time-button">-10s (More Points)</button>
            <button id="increaseTime" class="time-button">+10s (Less Points)</button>
          </div>
        </div>
        <div id="gamePlay" style="display: none">
          <div class="sound-grid" style="display: none"></div>
          <button id="applyGuess" class="primary-button" style="display: none">Apply Guess</button>
        </div>
        <div id="gameOver" style="display: none">
          <h2>Game Over!</h2>
          <p>Final Score: <span id="finalScore">0</span></p>
          <div id="sessionSounds" class="session-sounds">
            <h2 class="guessing-title">Jako słyszałxś <span id="sessionSoundsList"></span></h2>
          </div>
          <button id="playAgain">Play Again</button>
        </div>
        <div class="score-display">
          <p>Time: <span id="timer">30</span>s</p>
        </div>
      </div>
    `
  })

  it('should hide time adjustment buttons during guessing phase', function () {
    const gameState = window.gameFunctions.getGameState()
    const timeAdjustment = document.getElementById('timeAdjustment')

    // Start guessing phase
    window.gameFunctions.startGuessingPhase()

    expect(timeAdjustment.style.display).to.equal('none')
  })

  it('should mute sounds during guessing phase', function () {
    const gameState = window.gameFunctions.getGameState()

    // Set up test sounds
    const mockAudio = new MockAudio()
    gameState.preloadedSounds.set('test', mockAudio)
    gameState.soundElements = [{ element: mockAudio }]

    // Start guessing phase
    window.gameFunctions.startGuessingPhase()

    expect(mockAudio.paused).to.be.true
  })

  it('should set timer to 10 seconds during guessing phase', function () {
    const gameState = window.gameFunctions.getGameState()
    const timerElement = document.getElementById('timer')

    // Start guessing phase
    window.gameFunctions.startGuessingPhase()

    expect(timerElement.textContent).to.equal('10')
  })

  it('should end game after guessing phase timer expires', function () {
    const gameState = window.gameFunctions.getGameState()
    const gamePlay = document.getElementById('gamePlay')
    const gameOver = document.getElementById('gameOver')

    // Start guessing phase
    window.gameFunctions.startGuessingPhase()

    // Simulate timer expiration
    gameState.guessingTimeRemaining = 0
    window.gameFunctions.endGuessingPhase()

    expect(gamePlay.style.display).to.equal('none')
    expect(gameOver.style.display).to.equal('block')
  })
})

describe('Sound Management', function () {
  beforeEach(function () {
    // Reset game state before each test
    window.gameFunctions.resetGameState()

    // Create necessary DOM structure
    document.body.innerHTML = `
      <div class="game-container">
        <div class="sound-grid"></div>
        <div class="score-display">
          <p>Score: <span id="score">0</span></p>
        </div>
      </div>
    `
  })

  describe('stopAllSounds', function () {
    it('should stop all playing sounds and clear sound arrays', function () {
      const gameState = window.gameFunctions.getGameState()
      const mockAudio1 = new MockAudio()
      const mockAudio2 = new MockAudio()

      gameState.soundElements = [{ element: mockAudio1 }, { element: mockAudio2 }]
      gameState.activeSounds = [
        { pollution: 'car', sound_file: 'car.mp3' },
        { pollution: 'train', sound_file: 'train.mp3' }
      ]

      window.gameFunctions.stopAllSounds()

      expect(mockAudio1.paused).to.be.true
      expect(mockAudio2.paused).to.be.true
      expect(mockAudio1.currentTime).to.equal(0)
      expect(mockAudio2.currentTime).to.equal(0)
      expect(gameState.activeSounds).to.be.empty
      expect(gameState.soundElements).to.be.empty
    })
  })

  describe('createSoundGrid', function () {
    it('should create buttons for all pollutions', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]

      window.gameFunctions.createSoundGrid()

      const buttons = document.querySelectorAll('.sound-button')
      expect(buttons.length).to.equal(2)
      expect(buttons[0].dataset.sound).to.equal('car')
      expect(buttons[1].dataset.sound).to.equal('train')
    })

    it('should handle empty pollutions array', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.pollutions = []

      window.gameFunctions.createSoundGrid()

      const buttons = document.querySelectorAll('.sound-button')
      expect(buttons.length).to.equal(0)
    })
  })
})

describe('Game Timer', function () {
  beforeEach(function () {
    // Reset game state before each test
    window.gameFunctions.resetGameState()

    // Create necessary DOM structure
    document.body.innerHTML = `
      <div class="game-container">
        <div class="score-display">
          <p>Time: <span id="timer">30</span>s</p>
        </div>
      </div>
    `
  })

  describe('startGameTimer', function () {
    it('should initialize timer with 30 seconds', function () {
      const gameState = window.gameFunctions.getGameState()
      const timerElement = document.getElementById('timer')

      window.gameFunctions.startGameTimer()

      expect(gameState.timeRemaining).to.equal(30)
      expect(timerElement.textContent).to.equal('30')
    })

    it('should start interval timer', function () {
      const gameState = window.gameFunctions.getGameState()

      window.gameFunctions.startGameTimer()

      expect(gameState.gameInterval).to.not.be.null
    })
  })
})

describe('Game Reset', function () {
  beforeEach(function () {
    // Reset game state before each test
    window.gameFunctions.resetGameState()

    // Create necessary DOM structure
    document.body.innerHTML = `
      <div class="game-container">
        <div id="gameControls" style="display: none"></div>
        <div id="gamePlay" style="display: block"></div>
        <div id="gameOver" style="display: block"></div>
        <div class="sound-grid" style="display: grid"></div>
        <div id="timeAdjustment" style="display: block"></div>
        <div class="score-display">
          <p>Score: <span id="score">100</span></p>
          <p>Time: <span id="timer">10</span>s</p>
        </div>
      </div>
    `
  })

  describe('resetGame', function () {
    it('should reset all game state values', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.score = 100
      gameState.guessedSounds.add('car')
      gameState.selectedSounds = ['car', 'train']
      gameState.pointsMultiplier = 2.0
      gameState.isGuessingPhase = true
      gameState.guessingTimeRemaining = 5
      gameState.timeRemaining = 10

      window.gameFunctions.resetGame()

      expect(gameState.score).to.equal(0)
      expect(gameState.guessedSounds.size).to.equal(0)
      expect(gameState.selectedSounds).to.be.empty
      expect(gameState.pointsMultiplier).to.equal(1.0)
      expect(gameState.isGuessingPhase).to.be.false
      expect(gameState.guessingTimeRemaining).to.equal(10)
      expect(gameState.timeRemaining).to.equal(30)
    })

    it('should reset UI elements to initial state', function () {
      window.gameFunctions.resetGame()

      expect(document.getElementById('gameControls').style.display).to.equal('block')
      expect(document.getElementById('gamePlay').style.display).to.equal('none')
      expect(document.getElementById('gameOver').style.display).to.equal('none')
      expect(document.querySelector('.sound-grid').style.display).to.equal('none')
      expect(document.getElementById('timeAdjustment').style.display).to.equal('flex')
    })

    it('should clear all intervals', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.gameInterval = setInterval(() => {}, 1000)
      gameState.guessingInterval = setInterval(() => {}, 1000)

      window.gameFunctions.resetGame()

      expect(gameState.gameInterval).to.be.null
      expect(gameState.guessingInterval).to.be.null
    })
  })
})

describe('Complete Game Flow', function () {
  beforeEach(async function () {
    window.gameFunctions.resetGameState()
    document.body.innerHTML = `
      <div class="game-container">
        <div id="gameControls">
          <button id="startGame">Start Game</button>
          <div id="timeAdjustment">
            <button id="decreaseTime">-10s</button>
            <button id="increaseTime">+10s</button>
          </div>
        </div>
        <div id="gamePlay" style="display: none">
          <div class="sound-grid"></div>
          <button id="applyGuess">Apply Guess</button>
        </div>
        <div id="gameOver" style="display: none">
          <p>Final Score: <span id="finalScore">0</span></p>
          <button id="playAgain">Play Again</button>
        </div>
      </div>
    `
    await window.gameFunctions.init()
  })

  it('should complete a full game cycle', async function () {
    const gameState = window.gameFunctions.getGameState()

    // Start game
    window.gameFunctions.startGame()
    expect(document.getElementById('gamePlay').style.display).to.equal('block')

    // Adjust time
    window.gameFunctions.adjustTime(-10)
    expect(gameState.timeRemaining).to.equal(20)

    // Make a guess
    gameState.activeSounds = [{ pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' }]
    window.gameFunctions.makeGuess({ pollution: 'car', sound_file: ['car.mp3'], amplitude: '50-70' })
    expect(gameState.score).to.be.greaterThan(0)

    // End guessing phase
    window.gameFunctions.endGuessingPhase()
    expect(document.getElementById('gameOver').style.display).to.equal('block')

    // Reset game
    window.gameFunctions.resetGame()
    expect(document.getElementById('gameControls').style.display).to.equal('block')
    expect(gameState.score).to.equal(0)
  })
})
