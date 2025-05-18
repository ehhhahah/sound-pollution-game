/**
 * Sound Pollution Challenge Game - Test Suite
 * Tests the game logic and functionality using Mocha and Chai.
 * Covers sound selection, guess validation, scoring, and game state management.
 */

// Mock Audio for testing
class MockAudio {
  constructor() {
    this.paused = true
    this.currentTime = 0
    this.loop = false
    this.listeners = {}
  }

  play() {
    this.paused = false
    if (this.listeners.canplaythrough) {
      this.listeners.canplaythrough.forEach((cb) => cb())
    }
  }

  pause() {
    this.paused = true
  }

  addEventListener(event, callback) {
    if (!this.listeners[event]) {
      this.listeners[event] = []
    }
    this.listeners[event].push(callback)
  }
}

// Replace Audio constructor with MockAudio
window.Audio = MockAudio

/**
 * Helper function to check if a guess is correct
 * @param {Array} activeSounds - Array of currently active sounds
 * @param {Object} selectedSound - Player's selected sound
 * @returns {boolean} Whether the guess is correct
 */
function isCorrectGuess(activeSounds, selectedSound) {
  if (!activeSounds || !selectedSound) return false
  return activeSounds.some((sound) => sound.pollution === selectedSound.pollution)
}

/**
 * Helper function to calculate points for a guess
 * @param {Object} sound - The sound that was guessed
 * @param {boolean} isCorrect - Whether the guess was correct
 * @returns {number} Points earned
 */
function calculatePoints(sound, isCorrect) {
  if (!isCorrect) return -20

  let amplitude
  if (sound.amplitude.includes('up to')) {
    amplitude = parseInt(sound.amplitude.match(/\d+/)[0])
  } else {
    amplitude = parseInt(sound.amplitude.split('-')[0])
  }
  return Math.max(100 - amplitude, 10)
}

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

  // Test sound preloading functionality
  describe('Sound Preloading', function () {
    it('should preload all sounds successfully', async function () {
      const gameState = window.gameFunctions.getGameState()
      // Mock immediate sound loading
      const originalAudio = window.Audio
      window.Audio = function () {
        const audio = new originalAudio()
        // Immediately trigger canplaythrough
        setTimeout(() => {
          if (audio.listeners.canplaythrough) {
            audio.listeners.canplaythrough.forEach((cb) => cb())
          }
        }, 0)
        return audio
      }

      await window.gameFunctions.preloadSounds()
      expect(gameState.preloadedSounds.size).to.equal(gameState.pollutions.length)

      // Restore original Audio
      window.Audio = originalAudio
    })

    it('should handle preloading errors gracefully', async function () {
      // Mock a failed sound load
      const originalAudio = window.Audio
      window.Audio = function () {
        const audio = new originalAudio()
        audio.addEventListener = (event, callback) => {
          if (event === 'error') {
            setTimeout(callback, 0)
          }
        }
        // Simulate error by not triggering canplaythrough
        return audio
      }

      const gameState = window.gameFunctions.getGameState()
      // Set up some test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]
      await window.gameFunctions.preloadSounds()
      expect(gameState.preloadedSounds.size).to.equal(0) // No sounds should be preloaded due to errors

      // Restore original Audio
      window.Audio = originalAudio
    })
  })

  // Test multiple sound playback
  describe('Multiple Sound Playback', function () {
    beforeEach(async function () {
      // Mock immediate sound loading
      const originalAudio = window.Audio
      window.Audio = function () {
        const audio = new originalAudio()
        // Immediately trigger canplaythrough
        setTimeout(() => {
          if (audio.listeners.canplaythrough) {
            audio.listeners.canplaythrough.forEach((cb) => cb())
          }
        }, 0)
        return audio
      }

      // Initialize game state with some test pollutions
      const gameState = window.gameFunctions.getGameState()
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' },
        { pollution: 'plane', sound_file: 'plane.mp3', amplitude: '70-90' }
      ]

      // Preload sounds
      await window.gameFunctions.preloadSounds()

      // Restore original Audio
      window.Audio = originalAudio
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
      gameState.activeSounds = [{ pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }]

      window.gameFunctions.makeGuess({ pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' })

      const button = document.querySelector('.sound-button')
      expect(button.classList.contains('correct')).to.be.true
      expect(button.classList.contains('incorrect')).to.be.false
    })

    it('should add incorrect class for invalid guesses', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.activeSounds = [{ pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }]

      window.gameFunctions.makeGuess({ pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' })

      const button = document.querySelector('.sound-button')
      expect(button.classList.contains('incorrect')).to.be.true
      expect(button.classList.contains('correct')).to.be.false
    })

    it('should update class when making multiple guesses on the same sound', function () {
      const gameState = window.gameFunctions.getGameState()
      const button = document.querySelector('.sound-button')

      // First guess - incorrect
      gameState.activeSounds = [{ pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }]
      window.gameFunctions.makeGuess({ pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' })
      expect(button.classList.contains('incorrect')).to.be.true

      // Second guess - correct
      gameState.activeSounds = [{ pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }]
      window.gameFunctions.makeGuess({ pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' })
      expect(button.classList.contains('correct')).to.be.true
      expect(button.classList.contains('incorrect')).to.be.false
    })

    it('should correctly identify valid guesses', function () {
      const activeSounds = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]
      const selectedSound = { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }
      expect(isCorrectGuess(activeSounds, selectedSound)).to.be.true
    })

    it('should correctly identify invalid guesses', function () {
      const activeSounds = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]
      const selectedSound = { pollution: 'plane', sound_file: 'plane.mp3', amplitude: '70-90' }
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

    it('should play all selected sounds simultaneously and loop them', function () {
      const gameState = window.gameFunctions.getGameState()
      // Set up test pollutions
      gameState.pollutions = [
        { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
        { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
      ]

      // Mock preloaded sounds
      const mockAudio1 = new MockAudio()
      const mockAudio2 = new MockAudio()
      gameState.preloadedSounds.set('car', mockAudio1)
      gameState.preloadedSounds.set('train', mockAudio2)

      // Play sounds
      window.gameFunctions.playRandomSounds()

      // Verify all sounds are playing and looping
      expect(mockAudio1.loop).to.be.true
      expect(mockAudio2.loop).to.be.true
      expect(mockAudio1.paused).to.be.false
      expect(mockAudio2.paused).to.be.false
    })

    it('should reset game state correctly', function () {
      const gameState = window.gameFunctions.getGameState()
      // Modify game state
      gameState.score = -100
      gameState.timeRemaining = 15
      gameState.activeSounds = [{ pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }]
      gameState.soundElements = [new MockAudio()]
      gameState.preloadedSounds.set('car', new MockAudio())
      gameState.isLoading = true

      // Reset game state
      window.gameFunctions.resetGameState()

      // Get fresh game state after reset
      const resetGameState = window.gameFunctions.getGameState()
      expect(resetGameState.score).to.equal(0)
      expect(resetGameState.timeRemaining).to.equal(30) // Updated to 30 seconds
      expect(resetGameState.activeSounds).to.be.an('array').that.is.empty
      expect(resetGameState.soundElements).to.be.an('array').that.is.empty
      expect(resetGameState.preloadedSounds.size).to.equal(0)
      expect(resetGameState.isLoading).to.be.false
    })
  })
})

// Test suite for DOM structure
describe('DOM Structure', function () {
  beforeEach(function () {
    // Create a minimal DOM structure for testing
    document.body.innerHTML = `
      <div class="game-container">
        <div id="gameControls">
          <button id="startGame">Start Game</button>
        </div>
        <div id="loadingScreen" style="display: none">
          <div class="loading-content">
            <div class="loading-spinner"></div>
            <p id="loadingProgress">Loading sounds... 0%</p>
          </div>
        </div>
        <div id="gamePlay" style="display: none">
          <div class="sound-grid"></div>
        </div>
        <div id="gameOver" style="display: none">
          <h2>Game Over!</h2>
          <p>Final Score: <span id="finalScore">0</span></p>
          <button id="playAgain">Play Again</button>
        </div>
        <div class="score-display">
          <p>Score: <span id="score">0</span></p>
          <p>Time: <span id="timer">60</span>s</p>
        </div>
      </div>
    `
  })

  // Test presence of game control elements
  it('should have all required game control elements', function () {
    expect(document.getElementById('startGame')).to.exist
    expect(document.getElementById('gameControls')).to.exist
    expect(document.getElementById('loadingScreen')).to.exist
    expect(document.getElementById('gamePlay')).to.exist
    expect(document.getElementById('gameOver')).to.exist
  })

  // Test presence of gameplay elements
  it('should have all required game play elements', function () {
    expect(document.querySelector('.sound-grid')).to.exist
  })

  // Test presence of loading screen elements
  it('should have all required loading screen elements', function () {
    expect(document.querySelector('.loading-spinner')).to.exist
    expect(document.getElementById('loadingProgress')).to.exist
  })

  // Test initial display states
  it('should have correct initial display states', function () {
    expect(document.getElementById('gameControls').style.display).to.not.equal('none')
    expect(document.getElementById('loadingScreen').style.display).to.equal('none')
    expect(document.getElementById('gamePlay').style.display).to.equal('none')
    expect(document.getElementById('gameOver').style.display).to.equal('none')
  })

  // Test initial values
  it('should have correct initial values', function () {
    expect(document.getElementById('score').textContent).to.equal('0')
    expect(document.getElementById('timer').textContent).to.equal('60')
    expect(document.getElementById('finalScore').textContent).to.equal('0')
    expect(document.getElementById('loadingProgress').textContent).to.equal('Loading sounds... 0%')
  })
})

// Test suite for sound file existence
describe('Sound File Existence', function () {
  it('should have valid sound file paths', async function () {
    // Fetch the actual pollutions.json data
    const response = await fetch('../data/pollutions.json')
    const pollutions = await response.json()

    // Log all files we're going to check
    console.log(
      'Files to check:',
      pollutions.map((p) => p.sound_file)
    )

    for (const pollution of pollutions) {
      const soundFilePath = pollution.sound_file
      expect(soundFilePath).to.be.a('string')
      expect(soundFilePath).to.not.be.empty

      console.log('Checking sound file:', soundFilePath)

      // Create a promise that resolves with the file existence status
      const checkFileExists = () => {
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest()
          // Use path relative to test file
          const relativePath = soundFilePath.startsWith('sounds/') ? `../${soundFilePath}` : soundFilePath
          xhr.open('HEAD', relativePath, true)
          xhr.onload = () => {
            if (xhr.status === 200) {
              resolve(true)
            } else {
              reject(new Error(`File not found: ${relativePath} (status: ${xhr.status})`))
            }
          }
          xhr.onerror = () => {
            reject(new Error(`Failed to check file: ${relativePath}`))
          }
          xhr.send()
        })
      }

      try {
        const exists = await checkFileExists()
        expect(exists).to.be.true
      } catch (error) {
        console.log('Error details:', error)
        expect.fail(`Failed to load sound file: ${soundFilePath}. Error: ${error.message}`)
      }
    }
  })
})

// Test suite for modified game logic
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

  describe('Scoring with Time Adjustment', function () {
    it('should add 50 points when decreasing time', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.score = 100

      window.gameFunctions.adjustTime(-10)
      expect(gameState.score).to.equal(150) // 100 + 50 points
    })

    it('should subtract 25 points when increasing time', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.score = 100

      window.gameFunctions.adjustTime(10)
      expect(gameState.score).to.equal(75) // 100 - 25 points
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
            <h3>Sounds in this session:</h3>
            <ul></ul>
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

  it('should display session sounds in game over screen', function () {
    const gameState = window.gameFunctions.getGameState()
    const sessionSounds = document.getElementById('sessionSounds')

    // Set up test sounds
    gameState.selectedSounds = [
      { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' },
      { pollution: 'train', sound_file: 'train.mp3', amplitude: '60-80' }
    ]

    // End game
    window.gameFunctions.endGuessingPhase()

    const soundList = sessionSounds.querySelector('ul')
    expect(soundList.children.length).to.equal(2)
    expect(soundList.children[0].textContent).to.equal('CAR')
    expect(soundList.children[1].textContent).to.equal('TRAIN')
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
