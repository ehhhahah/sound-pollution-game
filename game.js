/**
 * Sound Pollution Challenge Game
 * A browser-based game that tests players' ability to identify different types of sound pollution.
 * The game randomly plays sound samples and players must identify them within a time limit.
 * Scoring is based on sound amplitude - quieter sounds are worth more points.
 */

// Game state management
let gameState = {
  pollutions: [], // Array of pollution sound data from JSON
  score: 0, // Start with base score of 0
  timeRemaining: 30, // Game time in seconds
  activeSounds: [], // Array of currently playing sounds
  soundElements: [], // Array of audio elements for current sounds
  gameInterval: null, // Timer interval
  guessedSounds: new Set(), // Track correctly guessed sounds
  preloadedSounds: new Map(), // Store preloaded audio elements
  isLoading: false, // Track loading state
  selectedSounds: [], // Store the randomly selected sounds for the game
  pointsMultiplier: 1.0, // Points multiplier based on time adjustment
  isGuessingPhase: false, // Whether we're in the guessing phase
  guessingTimeRemaining: 10, // Time for guessing phase
  guessingInterval: null // Interval for guessing phase timer
}

/**
 * Toggles visibility of UI elements
 * @param {Object} elements - Object containing element IDs/classes and their desired display states
 */
function toggleUIElements(elements) {
  Object.entries(elements).forEach(([selector, display]) => {
    let element
    if (selector.startsWith('.')) {
      element = document.querySelector(selector)
    } else {
      element = document.getElementById(selector)
    }
    if (element) element.style.display = display
  })
}

/**
 * Creates and returns a sound button element
 * @param {Object} sound - Sound data object
 * @returns {HTMLButtonElement} The created button element
 */
function createSoundButton(sound) {
  const button = document.createElement('button')
  button.className = 'game-button sound-button'
  button.dataset.sound = sound.pollution
  button.textContent = sound.pollution.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
  button.addEventListener('click', () => makeGuess(sound))
  return button
}

/**
 * Manages sound element playback
 * @param {Object} sound - Sound data object
 * @param {boolean} shouldPlay - Whether to play or pause the sound
 */
function manageSoundElement(sound, shouldPlay) {
  const audioElement = gameState.preloadedSounds.get(sound.pollution)
  if (!audioElement) {
    console.error(`Preloaded sound not found for ${sound.pollution}`)
    return
  }

  if (shouldPlay) {
    audioElement.currentTime = 0
    audioElement.loop = true
    audioElement.play()
    gameState.activeSounds.push(sound)
    gameState.soundElements.push({ element: audioElement })
  } else {
    audioElement.pause()
    audioElement.currentTime = 0
  }
}

/**
 * Updates timer display and manages timer state
 * @param {number} time - Time to display
 * @param {boolean} isGuessingPhase - Whether this is for the guessing phase
 */
function updateTimer(time, isGuessingPhase = false) {
  const timerElement = document.getElementById('timer')
  if (timerElement) {
    timerElement.textContent = time
  }
  if (isGuessingPhase) {
    gameState.guessingTimeRemaining = time
  } else {
    gameState.timeRemaining = time
  }
}

/**
 * Loads pollution data from JSON file
 * @returns {Promise<Array>} Array of pollution data
 */
async function loadData() {
  try {
    const response = await fetch('data/pollutions.json')
    const pollutions = await response.json()
    return pollutions
  } catch (error) {
    console.error('Error loading data:', error)
    return []
  }
}

/**
 * Preloads all sound files
 * @returns {Promise<void>}
 */
async function preloadSounds() {
  gameState.isLoading = true
  const loadingScreen = document.getElementById('loadingScreen')
  const loadingProgress = document.getElementById('loadingProgress')
  if (loadingScreen) loadingScreen.style.display = 'flex'

  const totalSounds = gameState.pollutions.length
  let loadedSounds = 0

  const loadPromises = gameState.pollutions.map(async (pollution) => {
    try {
      const audio = new Audio()
      audio.preload = 'auto'

      // Create a promise that resolves when the audio is loaded
      const loadPromise = new Promise((resolve, reject) => {
        audio.addEventListener(
          'canplaythrough',
          () => {
            loadedSounds++
            if (loadingProgress) {
              loadingProgress.textContent = `Ładowanie dźwięków... ${Math.round((loadedSounds / totalSounds) * 100)}%`
            }
            resolve()
          },
          { once: true }
        )

        audio.addEventListener('error', () => {
          reject(new Error(`Nie udało się załadować dźwięku: ${pollution.pollution}`))
        })
        audio.src = pollution.sound_file
      })

      await loadPromise
      gameState.preloadedSounds.set(pollution.pollution, audio)
    } catch (error) {
      console.error(`Error preloading sound ${pollution.pollution}:`, error)
      // Don't add the sound to preloadedSounds on error
    }
  })

  await Promise.all(loadPromises)
  gameState.isLoading = false
  if (loadingScreen) loadingScreen.style.display = 'none'
}

/**
 * Initializes the game and sets up event listeners
 */
async function init() {
  gameState.pollutions = await loadData()
  if (document.getElementById('startGame')) {
    setupEventListeners()
    // Ensure sound grid is hidden at initialization
    const soundGrid = document.querySelector('.sound-grid')
    if (soundGrid) {
      soundGrid.style.display = 'none'
    }
  }
}

/**
 * Plays a random set of sounds at game start and loops them
 */
function playRandomSounds() {
  if (gameState.selectedSounds.length > 0) {
    stopAllSounds()
    gameState.selectedSounds.forEach((sound) => manageSoundElement(sound, true))
    return
  }

  stopAllSounds()
  const numSounds = Math.floor(Math.random() * 5) + 1
  const availableSounds = [...gameState.pollutions]
  gameState.selectedSounds = []

  for (let i = 0; i < numSounds; i++) {
    if (availableSounds.length === 0) break
    const randomIndex = Math.floor(Math.random() * availableSounds.length)
    const sound = availableSounds.splice(randomIndex, 1)[0]
    gameState.selectedSounds.push(sound)
  }

  gameState.selectedSounds.forEach((sound) => manageSoundElement(sound, true))
  console.log(
    'Now playing sounds:',
    gameState.selectedSounds.map((s) => s.pollution)
  )
}

/**
 * Stops all currently playing sounds
 */
function stopAllSounds() {
  gameState.soundElements.forEach((sound) => {
    sound.element.pause()
    sound.element.currentTime = 0
  })
  gameState.activeSounds = []
  gameState.soundElements = []
}

/**
 * Handles player's guess when clicking a sound button
 * @param {Object} selectedSound - The sound the player selected
 */
function makeGuess(selectedSound) {
  if (gameState.activeSounds.length === 0) return

  const isCorrect = gameState.activeSounds.some((sound) => sound.pollution === selectedSound.pollution)

  // Find the clicked button and update its classes
  const soundButtons = document.querySelectorAll('.sound-button')
  soundButtons.forEach((button) => {
    if (button.dataset.sound === selectedSound.pollution) {
      // Remove any existing result classes
      button.classList.remove('correct', 'incorrect')
      // Add the appropriate class
      button.classList.add(isCorrect ? 'correct' : 'incorrect')
    }
  })

  if (isCorrect) {
    // Check if this sound has already been correctly guessed
    if (!gameState.guessedSounds.has(selectedSound.pollution)) {
      // Calculate points based on sound amplitude
      let amplitude
      if (selectedSound.amplitude.includes('up to')) {
        amplitude = parseInt(selectedSound.amplitude.match(/\d+/)[0])
      } else {
        amplitude = parseInt(selectedSound.amplitude.split('-')[0])
      }
      const points = Math.max(100 - amplitude, 10) // More points for quieter sounds

      gameState.score = (gameState.score || 0) + points
      // Add to guessed sounds set
      gameState.guessedSounds.add(selectedSound.pollution)
    }
  } else {
    // Allow negative scores for wrong guesses
    gameState.score = (gameState.score || 0) - 20
  }

  updateScoreDisplay()
}

/**
 * Updates the score display
 */
function updateScoreDisplay() {
  const scoreElement = document.getElementById('score')
  if (scoreElement) {
    scoreElement.textContent = gameState.score
    console.log('Score updated:', gameState.score) // Debug log
  }
}

/**
 * Adjusts the game time and updates points multiplier
 * @param {number} adjustment - Time adjustment in seconds (-10 or +10)
 */
function adjustTime(adjustment) {
  const newTime = gameState.timeRemaining + adjustment

  // Don't allow time below 10 seconds or above 60 seconds
  if (newTime < 10) {
    gameState.timeRemaining = 10
  } else if (newTime > 60) {
    gameState.timeRemaining = 60
  } else {
    gameState.timeRemaining = newTime
  }

  // Calculate points adjustment based on time change
  const pointsAdjustment = adjustment < 0 ? 50 : -25 // +50 points for -10s, -25 points for +10s

  // Update score
  const oldScore = gameState.score
  gameState.score = Math.max(0, gameState.score + pointsAdjustment) // Ensure score doesn't go below 0

  console.log(
    `Time adjusted by ${adjustment}s. Score updated: ${oldScore} -> ${gameState.score} (points adjustment: ${pointsAdjustment})`
  )

  updateTimer(gameState.timeRemaining)

  // Update button states
  const decreaseTimeBtn = document.getElementById('decreaseTime')
  const increaseTimeBtn = document.getElementById('increaseTime')

  if (decreaseTimeBtn) {
    decreaseTimeBtn.disabled = gameState.timeRemaining <= 10
  }

  if (increaseTimeBtn) {
    increaseTimeBtn.disabled = gameState.timeRemaining >= 60
  }
}

/**
 * Starts the guessing phase
 */
function startGuessingPhase() {
  gameState.isGuessingPhase = true
  gameState.guessingTimeRemaining = 10

  // Create sound grid if it doesn't exist
  const soundGrid = document.querySelector('.sound-grid')
  if (!soundGrid) {
    createSoundGrid()
  }

  // Set display styles directly
  if (soundGrid) {
    soundGrid.style.display = 'grid'
  }

  toggleUIElements({
    'sound-grid': 'grid',
    applyGuess: 'flex',
    timeAdjustment: 'none',
    gamePlay: 'block' // Ensure game play area is visible
  })

  gameState.soundElements.forEach((sound) => sound.element.pause())
  updateTimer(gameState.guessingTimeRemaining, true)

  gameState.guessingInterval = setInterval(() => {
    gameState.guessingTimeRemaining--
    updateTimer(gameState.guessingTimeRemaining, true)

    if (gameState.guessingTimeRemaining <= 0) {
      endGuessingPhase()
    }
  }, 1000)
}

/**
 * Ends the guessing phase and shows results
 */
function endGuessingPhase() {
  clearInterval(gameState.guessingInterval)
  gameState.isGuessingPhase = false

  toggleUIElements({
    'sound-grid': 'none',
    applyGuess: 'none',
    timeAdjustment: 'none',
    gamePlay: 'none',
    gameOver: 'block'
  })

  document.getElementById('finalScore').textContent = gameState.score

  const sessionSoundsList = document.querySelector('#sessionSounds ul')
  if (sessionSoundsList) {
    sessionSoundsList.innerHTML = ''
    if (gameState.selectedSounds?.length > 0) {
      gameState.selectedSounds.forEach((sound) => {
        const li = document.createElement('li')
        li.textContent = sound.pollution.replace('_', ' ').toUpperCase()
        sessionSoundsList.appendChild(li)
      })
    }
  }
}

/**
 * Applies the current guess and ends guessing phase
 */
function applyGuess() {
  endGuessingPhase()
}

/**
 * Calculates points for a guess with multiplier
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
  const basePoints = Math.max(100 - amplitude, 10)
  return Math.round(basePoints * gameState.pointsMultiplier)
}

/**
 * Starts the game timer
 */
function startGameTimer() {
  gameState.timeRemaining = 30
  updateTimer(30)

  gameState.gameInterval = setInterval(() => {
    gameState.timeRemaining--
    updateTimer(gameState.timeRemaining)

    if (gameState.timeRemaining <= 0) {
      clearInterval(gameState.gameInterval)
      startGuessingPhase()
    }
  }, 1000)
}

/**
 * Sets up all game event listeners
 */
function setupEventListeners() {
  const startGameBtn = document.getElementById('startGame')
  const playAgainBtn = document.getElementById('playAgain')
  const decreaseTimeBtn = document.getElementById('decreaseTime')
  const increaseTimeBtn = document.getElementById('increaseTime')
  const applyGuessBtn = document.getElementById('applyGuess')

  if (startGameBtn) startGameBtn.addEventListener('click', startGame)
  if (playAgainBtn) playAgainBtn.addEventListener('click', resetGame)
  if (decreaseTimeBtn) decreaseTimeBtn.addEventListener('click', () => adjustTime(-10))
  if (increaseTimeBtn) increaseTimeBtn.addEventListener('click', () => adjustTime(10))
  if (applyGuessBtn) applyGuessBtn.addEventListener('click', applyGuess)
}

/**
 * Starts playing random sounds at the beginning of the game
 */
function startSoundChanges() {
  // Play initial set of random sounds
  playRandomSounds()
}

/**
 * Starts the game, initializes UI and timers
 */
async function startGame() {
  document.getElementById('gameControls').style.display = 'none'
  document.getElementById('gamePlay').style.display = 'block'
  document.querySelector('.sound-grid').style.display = 'none' // Ensure grid is hidden at start

  // Reset time adjustment buttons
  const decreaseTimeBtn = document.getElementById('decreaseTime')
  const increaseTimeBtn = document.getElementById('increaseTime')
  if (decreaseTimeBtn) decreaseTimeBtn.disabled = false
  if (increaseTimeBtn) increaseTimeBtn.disabled = false

  // Preload sounds before starting the game
  await preloadSounds()

  createSoundGrid()
  startGameTimer()
  startSoundChanges()
}

/**
 * Creates the grid of sound buttons
 */
function createSoundGrid() {
  const soundGrid = document.querySelector('.sound-grid')
  if (!soundGrid) return

  soundGrid.innerHTML = ''
  soundGrid.style.display = 'none'

  gameState.pollutions.forEach((sound) => {
    soundGrid.appendChild(createSoundButton(sound))
  })

  soundGrid.style.display = 'grid'
}

/**
 * Ends the game and shows final score
 */
function endGame() {
  // Stop all sounds and timers
  stopAllSounds()
  clearInterval(gameState.gameInterval)
  clearInterval(gameState.guessingInterval)

  // Show game over screen
  const gameOver = document.getElementById('gameOver')
  const finalScore = document.getElementById('finalScore')
  const sessionSounds = document.getElementById('sessionSounds')
  const gamePlay = document.getElementById('gamePlay')
  const soundGrid = document.querySelector('.sound-grid')

  if (gameOver) gameOver.style.display = 'block'
  if (finalScore) finalScore.textContent = gameState.score
  if (gamePlay) gamePlay.style.display = 'none'
  if (soundGrid) soundGrid.style.display = 'none'

  // List all sounds that were played
  if (sessionSounds) {
    const soundsList = sessionSounds.querySelector('ul')
    if (soundsList) {
      soundsList.innerHTML = ''
      gameState.selectedSounds.forEach((sound) => {
        const li = document.createElement('li')
        li.textContent = sound.pollution.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())
        soundsList.appendChild(li)
      })
    }
  }
}

/**
 * Resets the game state for a new game
 */
function resetGame() {
  // Clear intervals first
  if (gameState.gameInterval) {
    clearInterval(gameState.gameInterval)
    gameState.gameInterval = null
  }
  if (gameState.guessingInterval) {
    clearInterval(gameState.guessingInterval)
    gameState.guessingInterval = null
  }

  stopAllSounds()

  // Reset game state
  gameState.score = 0
  gameState.guessedSounds.clear()
  gameState.selectedSounds = []
  gameState.pointsMultiplier = 1.0
  gameState.isGuessingPhase = false
  gameState.guessingTimeRemaining = 10
  gameState.timeRemaining = 30

  updateScoreDisplay()
  updateTimer(30)

  // Reset UI elements
  toggleUIElements({
    gameOver: 'none',
    gameControls: 'block', // Changed back to 'block' to match test expectations
    '.sound-grid': 'none', // Updated to use class selector
    applyGuess: 'none',
    timeAdjustment: 'none'
  })
}

// Prevent game initialization during tests
if (!window.location.pathname.includes('test.html')) {
  // Initialize game when DOM is loaded
  if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', init)
  }
}

// Export functions for testing
if (window.location.pathname.includes('test.html')) {
  window.gameFunctions = {
    makeGuess,
    loadData,
    init,
    updateScoreDisplay,
    preloadSounds,
    playRandomSounds,
    stopAllSounds,
    adjustTime,
    startGuessingPhase,
    endGuessingPhase,
    applyGuess,
    calculatePoints,
    createSoundGrid,
    startGameTimer,
    resetGame,
    getGameState: () => gameState,
    resetGameState: () => {
      gameState = {
        pollutions: [],
        score: 0,
        timeRemaining: 30,
        activeSounds: [],
        soundElements: [],
        gameInterval: null,
        guessedSounds: new Set(),
        preloadedSounds: new Map(),
        isLoading: false,
        selectedSounds: [],
        pointsMultiplier: 1.0,
        isGuessingPhase: false,
        guessingTimeRemaining: 10,
        guessingInterval: null
      }
    }
  }
}
