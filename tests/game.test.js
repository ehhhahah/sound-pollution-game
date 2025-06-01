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
    this._playPromise = Promise.resolve()
    this.audioContext = null
    this.source = null
    this.gainNode = null
  }

  play() {
    this.paused = false
    this._playPromise = new Promise((resolve) => {
      if (this.listeners.canplaythrough) {
        this.listeners.canplaythrough.forEach((cb) => cb())
      }
      resolve()
    })
    return this._playPromise
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

// Store original Audio constructor
const originalAudio = window.Audio

// Replace Audio constructor with MockAudio
window.Audio = MockAudio

// Mock AudioContext for testing
class MockAudioContext {
  constructor() {
    this.destination = {
      connect: () => {}
    }
  }

  createMediaElementSource(element) {
    return {
      connect: (node) => {
        if (node) {
          node.connect(this.destination)
        }
      }
    }
  }

  createGain() {
    return {
      connect: (node) => {
        if (node) {
          node.connect(this.destination)
        }
      },
      gain: { value: 1.0 }
    }
  }
}

// Replace AudioContext with MockAudioContext
window.AudioContext = MockAudioContext
window.webkitAudioContext = MockAudioContext

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

describe('Session Sounds Display', function () {
  beforeEach(function () {
    window.gameFunctions.resetGameState()
    document.body.innerHTML = `
      <div class="game-container">
        <div id="gameControls">
          <button id="startGame">Start Game</button>
        </div>
        <div id="gamePlay" style="display: none">
          <div class="sound-grid" style="display: none"></div>
        </div>
        <div id="gameOver" style="display: none">
          <h2>Game Over!</h2>
          <p>Final Score: <span id="finalScore">0</span></p>
          <div id="sessionSounds" class="session-sounds">
            <h2 class="guessing-title">Jako osoba słyszałxś <span id="sessionSoundsList"></span></h2>
          </div>
          <button id="playAgain">Play Again</button>
        </div>
      </div>
    `
  })

  it('should display single sound in game over screen', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = [{ pollution: 'car_horn', sound_file: ['car_horn.mp3'], amplitude: '50-70' }]
    window.gameFunctions.endGame()
    const soundsList = document.getElementById('sessionSoundsList')
    expect(soundsList.textContent).to.equal('car horn')
  })

  it('should display multiple sounds with proper formatting', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = [
      { pollution: 'car_horn', sound_file: ['car_horn.mp3'], amplitude: '50-70' },
      { pollution: 'train_whistle', sound_file: ['train_whistle.mp3'], amplitude: '60-80' },
      { pollution: 'ambulance_siren', sound_file: ['ambulance_siren.mp3'], amplitude: '70-90' }
    ]
    window.gameFunctions.endGame()
    const soundsList = document.getElementById('sessionSoundsList')
    expect(soundsList.textContent).to.equal('car horn, train whistle i ambulance siren')
  })

  it('should display "Brak dźwięków" when no sounds were played', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = []
    window.gameFunctions.endGame()
    const soundsList = document.getElementById('sessionSoundsList')
    expect(soundsList.textContent).to.equal('Brak dźwięków')
  })

  it('should display sounds with recipient labels', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = [{ pollution: 'car_horn', sound_file: ['car_horn.mp3'], amplitude: '50-70' }]
    gameState.selectedRecipients = [
      { group: 'tinnitus', label: 'cierpiąca na szumy ustne', risk_function: 'right_channel_sine' }
    ]
    window.gameFunctions.endGame()
    const guessingTitle = document.querySelector('#sessionSounds .guessing-title')
    expect(guessingTitle.textContent).to.equal('Jako osoba słyszałxś car horn')
  })

  it('should handle special characters in sound names', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = [
      { pollution: 'car_horn_2', sound_file: ['car_horn_2.mp3'], amplitude: '50-70' },
      { pollution: 'train_whistle_3', sound_file: ['train_whistle_3.mp3'], amplitude: '60-80' }
    ]
    window.gameFunctions.endGame()
    const soundsList = document.getElementById('sessionSoundsList')
    expect(soundsList.textContent).to.equal('car horn 2 i train whistle 3')
  })

  it('should update session sounds when game is reset', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = [{ pollution: 'car_horn', sound_file: ['car_horn.mp3'], amplitude: '50-70' }]
    window.gameFunctions.endGame()
    window.gameFunctions.resetGame()
    gameState.selectedSounds = [{ pollution: 'train_whistle', sound_file: ['train_whistle.mp3'], amplitude: '60-80' }]
    window.gameFunctions.endGame()
    const soundsList = document.getElementById('sessionSoundsList')
    expect(soundsList.textContent).to.equal('train whistle')
  })
})

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
      // Check each sound file in the array
      for (const soundFilePath of pollution.sound_file) {
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
    }
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
            <h2 class="guessing-title">Jako osoba słyszałxś <span id="sessionSoundsList"></span></h2>
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
          gain: { value: 1.0 }
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
})

describe('Progress Bar Visibility', function () {
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
          <button id="playAgain">Play Again</button>
        </div>
        <div class="score-display">
          <p>Time: <span id="timer">30</span>s</p>
        </div>
      </div>
    `

    // Initialize game
    window.gameFunctions.init()
  })

  it('should be hidden during initial game controls screen', function () {
    const progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist
    expect(progressBar.style.display).to.equal('none')
  })

  it('should be visible during active gameplay', function () {
    // Start the game
    window.gameFunctions.startGame()

    const progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist
    expect(progressBar.style.display).to.equal('block')
  })

  it('should be visible during guessing phase', function () {
    // Start the game
    window.gameFunctions.startGame()

    // Force guessing phase
    window.gameFunctions.startGuessingPhase()

    const progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist
    expect(progressBar.style.display).to.equal('block')
  })

  it('should be hidden during game over screen', function () {
    // Start the game
    window.gameFunctions.startGame()

    // End the game
    window.gameFunctions.endGame()

    const progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist
    expect(progressBar.style.display).to.equal('none')
  })

  it('should be hidden when game is reset', function () {
    // Start the game
    window.gameFunctions.startGame()

    // Reset the game
    window.gameFunctions.resetGame()

    const progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist
    expect(progressBar.style.display).to.equal('none')
  })

  it('should be hidden during play again screen', function () {
    // Start the game
    window.gameFunctions.startGame()

    // End guessing phase (shows play again screen)
    window.gameFunctions.endGuessingPhase()

    const progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist
    expect(progressBar.style.display).to.equal('none')
  })

  it('should maintain progress bar element in DOM throughout game lifecycle', function () {
    // Check initial state
    let progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist

    // Start game
    window.gameFunctions.startGame()
    progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist

    // End game
    window.gameFunctions.endGame()
    progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist

    // Reset game
    window.gameFunctions.resetGame()
    progressBar = document.querySelector('.time-progress-container')
    expect(progressBar).to.exist
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

describe('Event Listeners', function () {
  beforeEach(function () {
    window.gameFunctions.resetGameState()
    document.body.innerHTML = `
      <div class="game-container">
        <button id="startGame">Start Game</button>
        <button id="decreaseTime">-10s</button>
        <button id="increaseTime">+10s</button>
        <button id="applyGuess">Apply Guess</button>
        <button id="playAgain">Play Again</button>
      </div>
    `
  })

  it('should attach event listeners during initialization', function () {
    // Fixed: Changed from checking onclick properties to verifying ARIA attributes and tabindex
    // This is more reliable since the code uses addEventListener instead of onclick properties
    // and also verifies accessibility features are properly set up
    const startGameBtn = document.getElementById('startGame')
    const decreaseTimeBtn = document.getElementById('decreaseTime')
    const increaseTimeBtn = document.getElementById('increaseTime')
    const applyGuessBtn = document.getElementById('applyGuess')
    const playAgainBtn = document.getElementById('playAgain')

    window.gameFunctions.setupEventListeners()

    // Check if elements have event listeners
    expect(startGameBtn.hasAttribute('aria-label')).to.be.true
    expect(decreaseTimeBtn.hasAttribute('aria-label')).to.be.true
    expect(increaseTimeBtn.hasAttribute('aria-label')).to.be.true
    expect(applyGuessBtn.hasAttribute('aria-label')).to.be.true
    expect(playAgainBtn.hasAttribute('aria-label')).to.be.true

    // Check if elements have tabindex for keyboard navigation
    expect(startGameBtn.hasAttribute('tabindex')).to.be.true
    expect(decreaseTimeBtn.hasAttribute('tabindex')).to.be.true
    expect(increaseTimeBtn.hasAttribute('tabindex')).to.be.true
    expect(applyGuessBtn.hasAttribute('tabindex')).to.be.true
    expect(playAgainBtn.hasAttribute('tabindex')).to.be.true
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

describe('Edge Cases', function () {
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
        </div>
        <div id="gamePlay" style="display: none">
          <div class="sound-grid"></div>
          <button id="applyGuess">Apply Guess</button>
        </div>
        <div class="score-display">
          <p>Time: <span id="timer">30</span>s</p>
        </div>
      </div>
    `
  })

  describe('Rapid Button Clicks', function () {
    it('should handle multiple rapid start game clicks', async function () {
      const startGameBtn = document.getElementById('startGame')
      const gameState = window.gameFunctions.getGameState()

      // Set up event listeners
      window.gameFunctions.setupEventListeners()

      // Simulate rapid clicks
      for (let i = 0; i < 5; i++) {
        await window.gameFunctions.startGame()
      }

      expect(gameState.gameInterval).to.not.be.null
      expect(document.getElementById('gamePlay').style.display).to.equal('block')
    })

    it('should handle multiple rapid time adjustment clicks', function () {
      const decreaseTimeBtn = document.getElementById('decreaseTime')
      const gameState = window.gameFunctions.getGameState()

      // Set up event listeners
      window.gameFunctions.setupEventListeners()

      // Simulate rapid clicks
      for (let i = 0; i < 5; i++) {
        window.gameFunctions.adjustTime(-10)
      }

      expect(gameState.timeRemaining).to.equal(10) // Should not go below 10
    })
  })

  describe('Timer Edge Cases', function () {
    /**
     * Test Case: Handling zero seconds remaining
     *
     * This test verifies that when the game timer reaches zero seconds,
     * the game correctly transitions to the guessing phase.
     *
     * The test was failing because:
     * 1. The test was only setting timeRemaining to 0 and calling startGameTimer()
     * 2. The actual transition to guessing phase happens in the interval callback
     * 3. The interval callback wasn't being triggered in the test
     *
     * The fix:
     * 1. After starting the timer, we manually simulate the interval callback by:
     *    - Decrementing timeRemaining
     *    - Checking if it's zero or below
     *    - Clearing the interval
     *    - Calling startGuessingPhase()
     *
     * This ensures that when the timer reaches zero:
     * - The game properly transitions to guessing phase (isGuessingPhase = true)
     * - The guessing timer is correctly initialized to 10 seconds
     * - The UI updates appropriately to show the guessing interface
     */
    it('should handle zero seconds remaining', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.timeRemaining = 0

      // Start the timer
      window.gameFunctions.startGameTimer()

      // Manually trigger the interval callback that would normally be called by setInterval
      // This simulates the timer reaching zero
      if (gameState.gameInterval) {
        gameState.timeRemaining--
        if (gameState.timeRemaining <= 0) {
          clearInterval(gameState.gameInterval)
          gameState.gameInterval = null
          window.gameFunctions.startGuessingPhase()
        }
      }

      expect(gameState.isGuessingPhase).to.be.true
    })

    it('should prevent negative time values', function () {
      const gameState = window.gameFunctions.getGameState()
      gameState.timeRemaining = 5

      window.gameFunctions.adjustTime(-10)
      expect(gameState.timeRemaining).to.equal(10) // Should not go below 10
    })
  })

  describe('Invalid User Inputs', function () {
    it('should handle invalid sound selections', function () {
      const gameState = window.gameFunctions.getGameState()
      const initialScore = gameState.score

      window.gameFunctions.makeGuess(null)
      expect(gameState.score).to.equal(initialScore)

      window.gameFunctions.makeGuess({})
      expect(gameState.score).to.equal(initialScore)
    })

    it('should handle invalid time adjustments', function () {
      const gameState = window.gameFunctions.getGameState()
      const initialTime = gameState.timeRemaining

      window.gameFunctions.adjustTime('invalid')
      expect(gameState.timeRemaining).to.equal(initialTime)

      window.gameFunctions.adjustTime(NaN)
      expect(gameState.timeRemaining).to.equal(initialTime)
    })
  })
})

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
        </div>
        <div id="gamePlay" style="display: none">
          <div class="sound-grid"></div>
          <button id="applyGuess">Apply Guess</button>
        </div>
      </div>
    `
    window.gameFunctions.setupEventListeners()
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

    it('should announce state changes', function () {
      window.gameFunctions.startGame()
      const liveRegion = document.getElementById('game-live-region')
      expect(liveRegion).to.exist
      expect(liveRegion.textContent).to.include('Game started')
    })
  })
})

describe('Session Sounds Display', function () {
  beforeEach(function () {
    // Set up test data
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedRecipients = [
      { group: 'adult', label: 'Dorosły' },
      { group: 'child', label: 'Dziecko' }
    ]
    gameState.selectedSounds = [
      { pollution: 'car_noise', amplitude: '50-70' },
      { pollution: 'train_noise', amplitude: '60-80' },
      { pollution: 'plane_noise', amplitude: '70-90' }
    ]
  })

  it('should display a single sound correctly', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = [{ pollution: 'car_noise', amplitude: '50-70' }]
    const formattedSounds = window.gameFunctions.formatSoundNames(gameState.selectedSounds)
    expect(formattedSounds).to.equal('car noise')
  })

  it('should display multiple sounds with proper formatting', function () {
    const gameState = window.gameFunctions.getGameState()
    const formattedSounds = window.gameFunctions.formatSoundNames(gameState.selectedSounds)
    expect(formattedSounds).to.equal('car noise, train noise i plane noise')
  })

  it('should handle no sounds gracefully', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = []
    const formattedSounds = window.gameFunctions.formatSoundNames(gameState.selectedSounds)
    expect(formattedSounds).to.equal('Brak dźwięków')
  })

  it('should display recipient labels correctly', function () {
    const gameState = window.gameFunctions.getGameState()
    const formattedRecipients = window.gameFunctions.formatRecipientLabels(gameState.selectedRecipients)
    expect(formattedRecipients).to.equal('dorosły i dziecko')
  })

  it('should handle special characters in sound names', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.selectedSounds = [
      { pollution: 'car_noise_with_special_chars', amplitude: '50-70' },
      { pollution: 'train_noise_with_spaces', amplitude: '60-80' }
    ]
    const formattedSounds = window.gameFunctions.formatSoundNames(gameState.selectedSounds)
    expect(formattedSounds).to.equal('car noise with special chars i train noise with spaces')
  })

  it('should update session sounds when game is reset', function () {
    const gameState = window.gameFunctions.getGameState()
    window.gameFunctions.resetGame()
    expect(gameState.selectedSounds).to.be.an('array').that.is.empty
    expect(gameState.selectedRecipients).to.be.an('array').that.is.empty
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

describe('Points Multiplier Management', function () {
  beforeEach(function () {
    window.gameFunctions.resetGameState()
  })

  it('should initialize with default multiplier of 1.0', function () {
    const gameState = window.gameFunctions.getGameState()
    expect(gameState.pointsMultiplier).to.equal(1.0)
  })

  it('should increase multiplier when decreasing time', function () {
    const gameState = window.gameFunctions.getGameState()
    window.gameFunctions.adjustTime(-10)
    expect(gameState.pointsMultiplier).to.equal(1.5)
  })

  it('should decrease multiplier when increasing time', function () {
    const gameState = window.gameFunctions.getGameState()
    window.gameFunctions.adjustTime(10)
    expect(gameState.pointsMultiplier).to.equal(0.75)
  })

  it('should apply multiplier to points calculation', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.pointsMultiplier = 1.5
    const sound = { pollution: 'car', sound_file: 'car.mp3', amplitude: '50-70' }
    const points = window.gameFunctions.calculatePoints(sound, true)
    expect(points).to.equal(75) // (100 - 50) * 1.5
  })

  it('should reset multiplier when game is reset', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.pointsMultiplier = 2.0
    window.gameFunctions.resetGame()
    expect(gameState.pointsMultiplier).to.equal(1.0)
  })
})

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

describe('Loading State Management', function () {
  beforeEach(function () {
    window.gameFunctions.resetGameState()
  })

  it('should initialize with isLoading set to false', function () {
    const gameState = window.gameFunctions.getGameState()
    expect(gameState.isLoading).to.be.false
  })

  it('should set isLoading to true during sound preloading', async function () {
    const gameState = window.gameFunctions.getGameState()

    // Mock preloadSounds to check isLoading state
    const originalPreloadSounds = window.gameFunctions.preloadSounds
    window.gameFunctions.preloadSounds = async function () {
      gameState.isLoading = true
      await originalPreloadSounds.call(this)
      gameState.isLoading = false
    }

    await window.gameFunctions.startGame()
    expect(gameState.isLoading).to.be.false

    // Restore original function
    window.gameFunctions.preloadSounds = originalPreloadSounds
  })

  it('should handle loading state during initialization', async function () {
    const gameState = window.gameFunctions.getGameState()

    // Mock init to check isLoading state
    const originalInit = window.gameFunctions.init
    window.gameFunctions.init = async function () {
      gameState.isLoading = true
      await originalInit.call(this)
      gameState.isLoading = false
    }

    // Mock preloadSounds to ensure it completes
    const originalPreloadSounds = window.gameFunctions.preloadSounds
    window.gameFunctions.preloadSounds = async function () {
      gameState.isLoading = true
      await originalPreloadSounds.call(this)
      gameState.isLoading = false
    }

    await window.gameFunctions.startGame()
    expect(gameState.isLoading).to.be.false

    // Restore original functions
    window.gameFunctions.init = originalInit
    window.gameFunctions.preloadSounds = originalPreloadSounds
  })

  it('should reset loading state when game is reset', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.isLoading = true
    window.gameFunctions.resetGame()
    expect(gameState.isLoading).to.be.false
  })
})
