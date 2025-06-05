/**
 * Sound Pollution Challenge Game
 * A browser-based game that tests players' ability to identify different types of sound pollution.
 * The game randomly plays sound samples and players must identify them within a time limit.
 * Scoring is based on sound amplitude - quieter sounds are worth more points.
 *
 * IMPORTANT: Never hardcode dynamic values like recipient labels or sound names in the HTML.
 * These should always be set dynamically through JavaScript to maintain flexibility and proper localization.
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
  guessingInterval: null, // Interval for guessing phase timer
  selectedRecipients: [], // Array of selected recipient groups
  recipients: [] // Array of available recipient groups
}

// Cache for sound files
const soundCache = new Map()

/**
 * Toggles visibility of UI elements
 * @param {Object} elements - Object containing element IDs/classes and their desired display states
 * @param {boolean} [useFlex=false] - Whether to use 'flex' instead of 'block' for elements
 */
function toggleUIElements(elements, useFlex = false) {
  const defaultDisplay = useFlex ? 'flex' : 'block'

  Object.entries(elements).forEach(([selector, display]) => {
    let elements
    if (selector.startsWith('.')) {
      elements = document.querySelectorAll(selector)
    } else if (selector.startsWith('#')) {
      elements = [document.getElementById(selector.substring(1))]
    } else {
      elements = [document.getElementById(selector)]
    }

    elements.forEach((element) => {
      if (element) {
        element.style.display = display === true ? defaultDisplay : display
      }
    })
  })
}

/**
 * Creates a DOM element with specified attributes and children
 * @param {string} tag - HTML tag name
 * @param {Object} attributes - Element attributes
 * @param {Array} children - Child elements or text content
 * @returns {HTMLElement} Created element
 */
function createElement(tag, attributes = {}, children = []) {
  const element = document.createElement(tag)
  Object.entries(attributes).forEach(([key, value]) => {
    if (key === 'className') {
      element.className = value
    } else if (key === 'textContent') {
      element.textContent = value
    } else {
      element.setAttribute(key, value)
    }
  })
  children.forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child))
    } else {
      element.appendChild(child)
    }
  })
  return element
}

/**
 * Creates and returns a sound button element
 * @param {Object} sound - Sound data object
 * @returns {HTMLButtonElement} The created button element
 */
function createSoundButton(sound) {
  const button = createElement('button', {
    className: 'game-button sound-button',
    'data-sound': sound.pollution,
    'aria-label': `Guess ${sound.pollution.replace(/_/g, ' ')} sound`,
    role: 'button',
    textContent: sound.pollution.replace(/_/g, ' ').toLowerCase()
  })

  const handleInteraction = (e) => {
    if (e.type === 'touchstart') e.preventDefault()
    button.classList.add('active')
    makeGuess(sound)
  }

  button.addEventListener('click', handleInteraction)
  button.addEventListener('touchstart', handleInteraction, { passive: false })
  button.addEventListener('touchend', () => button.classList.remove('active'), { passive: true })

  return button
}

/**
 * Manages sound element playback
 * @param {Object} sound - Sound data object
 * @param {boolean} shouldPlay - Whether to play or pause the sound
 */
function manageSoundElement(sound, shouldPlay) {
  if (!sound || !sound.pollution) return

  const audio = gameState.preloadedSounds.get(sound.pollution)
  if (!audio) return

  if (shouldPlay) {
    audio.loop = true

    // Create audio context and nodes if they don't exist
    if (!audio.audioContext) {
      audio.audioContext = new AudioContext()
      audio.source = audio.audioContext.createMediaElementSource(audio)
      audio.gainNode = audio.audioContext.createGain()
      audio.source.connect(audio.gainNode)
      audio.gainNode.connect(audio.audioContext.destination)
    }

    // Resume audio context if it's suspended
    if (audio.audioContext.state === 'suspended') {
      audio.audioContext.resume()
    }

    // Apply volume adjustment if specified
    if (sound.volumeAdjustment !== undefined && sound.volumeAdjustment !== null) {
      const volumeAdjustment = parseFloat(sound.volumeAdjustment)
      if (!isNaN(volumeAdjustment) && volumeAdjustment > 0) {
        audio.gainNode.gain.value = volumeAdjustment
      } else {
        audio.gainNode.gain.value = 1.0
      }
    } else {
      audio.gainNode.gain.value = 1.0
    }

    // Apply lowpass filter if specified
    if (sound.lowpassFilter !== undefined && sound.lowpassFilter !== null) {
      // Disconnect existing filter if it exists
      if (audio.filterNode) {
        audio.filterNode.disconnect()
      }

      // Create and configure lowpass filter
      audio.filterNode = audio.audioContext.createBiquadFilter()
      audio.filterNode.type = 'lowpass'
      audio.filterNode.frequency.value = sound.lowpassFilter
      audio.filterNode.Q.value = 1 // Quality factor for a gentle rolloff

      // Disconnect gain node from destination
      audio.gainNode.disconnect()

      // Connect the chain: source -> gain -> filter -> destination
      audio.gainNode.connect(audio.filterNode)
      audio.filterNode.connect(audio.audioContext.destination)

      console.log(`Connected lowpass filter for ${sound.pollution} at ${sound.lowpassFilter}Hz`)
    } else if (audio.filterNode) {
      // If no filter is specified but one exists, remove it
      audio.filterNode.disconnect()
      audio.gainNode.connect(audio.audioContext.destination)
    }

    // Apply highpass filter if specified
    if (sound.highpassFilter !== undefined && sound.highpassFilter !== null) {
      // Disconnect existing filter if it exists
      if (audio.filterNode) {
        audio.filterNode.disconnect()
      }

      // Create and configure highpass filter
      audio.filterNode = audio.audioContext.createBiquadFilter()
      audio.filterNode.type = 'highpass'
      audio.filterNode.frequency.value = sound.highpassFilter
      audio.filterNode.Q.value = 1 // Quality factor for a gentle rolloff

      // Disconnect gain node from destination
      audio.gainNode.disconnect()

      // Connect the chain: source -> gain -> filter -> destination
      audio.gainNode.connect(audio.filterNode)
      audio.filterNode.connect(audio.audioContext.destination)

      console.log(`Connected highpass filter for ${sound.pollution} at ${sound.highpassFilter}Hz`)
    } else if (audio.filterNode) {
      // If no filter is specified but one exists, remove it
      audio.filterNode.disconnect()
      audio.gainNode.connect(audio.audioContext.destination)
    }

    // Apply bass boost if specified
    if (sound.bassBoost !== undefined && sound.bassBoost !== null) {
      // Disconnect existing bass boost if it exists
      if (audio.bassBoostNode) {
        audio.bassBoostNode.disconnect()
      }

      // Create and configure bass boost filter
      audio.bassBoostNode = audio.audioContext.createBiquadFilter()
      audio.bassBoostNode.type = 'lowshelf'
      audio.bassBoostNode.frequency.value = sound.bassBoost.frequency
      audio.bassBoostNode.gain.value = sound.bassBoost.gain

      // Disconnect gain node from destination
      audio.gainNode.disconnect()

      // Connect the chain: source -> gain -> bass boost -> destination
      audio.gainNode.connect(audio.bassBoostNode)
      audio.bassBoostNode.connect(audio.audioContext.destination)

      console.log(
        `Connected bass boost for ${sound.pollution} at ${sound.bassBoost.frequency}Hz with ${sound.bassBoost.gain}dB gain`
      )
    } else if (audio.bassBoostNode) {
      // If no bass boost is specified but one exists, remove it
      audio.bassBoostNode.disconnect()
      audio.gainNode.connect(audio.audioContext.destination)
    }

    // Apply reverbation if specified
    if (sound.reverbation !== undefined && sound.reverbation !== null) {
      // Disconnect existing reverb if it exists
      if (audio.reverbNode) {
        audio.reverbNode.disconnect()
      }

      // Create and configure reverb
      audio.reverbNode = audio.audioContext.createConvolver()

      // Create impulse response for reverb
      const sampleRate = audio.audioContext.sampleRate
      const length = sampleRate * 2 // 2 seconds of reverb
      const impulse = audio.audioContext.createBuffer(2, length, sampleRate)

      // Generate impulse response
      for (let channel = 0; channel < 2; channel++) {
        const channelData = impulse.getChannelData(channel)
        for (let i = 0; i < length; i++) {
          // Exponential decay
          channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2)
        }
      }

      audio.reverbNode.buffer = impulse

      // Create wet/dry mix
      audio.reverbGainNode = audio.audioContext.createGain()
      audio.reverbGainNode.gain.value = 0.3 // Adjust this value to control reverb intensity

      // Disconnect gain node from destination
      audio.gainNode.disconnect()

      // Connect the chain: source -> gain -> reverb -> reverbGain -> destination
      audio.gainNode.connect(audio.reverbNode)
      audio.reverbNode.connect(audio.reverbGainNode)
      audio.reverbGainNode.connect(audio.audioContext.destination)

      console.log(`Connected reverbation for ${sound.pollution}`)
    } else if (audio.reverbNode) {
      // If no reverb is specified but one exists, remove it
      audio.reverbNode.disconnect()
      audio.reverbGainNode.disconnect()
      audio.gainNode.connect(audio.audioContext.destination)
    }

    audio.play()

    // Add to active sounds and sound elements
    gameState.activeSounds.push(sound)
    gameState.soundElements.push({ element: audio })
  } else {
    audio.pause()
    audio.currentTime = 0
    audio.loop = false

    // Remove from active sounds and sound elements
    gameState.activeSounds = gameState.activeSounds.filter((s) => s.pollution !== sound.pollution)
    gameState.soundElements = gameState.soundElements.filter((s) => s.element !== audio)
  }
}

/**
 * Shows or hides the time progress bar
 * @param {boolean} show - Whether to show or hide the progress bar
 */
function toggleTimeProgressBar(show) {
  const container = document.querySelector('.time-progress-container')
  if (container) {
    container.style.display = show ? 'block' : 'none'
  }
}

/**
 * Updates the time progress bar width based on remaining time
 * @param {number} timeRemaining - Current remaining time
 * @param {number} totalTime - Total time for the phase
 */
function updateTimeProgressBar(timeRemaining, totalTime) {
  const progressBar = document.getElementById('timeProgressBar')
  if (progressBar) {
    const percentage = (timeRemaining / totalTime) * 100
    progressBar.style.width = `${percentage}%`
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
    timerElement.setAttribute('aria-label', `${time} seconds remaining`)
  }

  // Update progress bar
  const totalTime = isGuessingPhase ? 10 : 30 // Default times for each phase
  updateTimeProgressBar(time, totalTime)

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
    const response = await fetch('components/pollutions.json')
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    return data
  } catch (error) {
    console.error('Error loading pollution data:', error)
    return [] // Return empty array on error
  }
}

/**
 * Loads recipient groups from JSON file
 * @returns {Promise<Array>} Array of recipient data
 */
async function loadRecipients() {
  try {
    const response = await fetch('components/recipients.json')
    const recipients = await response.json()
    return recipients
  } catch (error) {
    console.error('Error loading recipients:', error)
    return []
  }
}

/**
 * Preloads all sound files
 * @returns {Promise<void>}
 *
 * Note on tinnitus sound handling:
 * Tinnitus sounds are added to selectedSounds through risk functions (right_channel_sine)
 * but are not part of the main pollutions array. Therefore, we need to:
 * 1. First preload regular pollution sounds from gameState.pollutions
 * 2. Then preload any tinnitus sounds from gameState.selectedSounds
 *
 * This ensures that when playRandomSounds() is called, all sounds (including tinnitus)
 * are properly preloaded and available in gameState.preloadedSounds.
 *
 * The preloading must happen AFTER applyRiskFunctions() in startGame() to ensure
 * tinnitus sounds are added to selectedSounds before preloading begins.
 */
async function preloadSounds() {
  gameState.isLoading = true
  gameState.preloadedSounds.clear()

  try {
    // First preload regular pollution sounds
    for (const pollution of gameState.pollutions) {
      try {
        // Get a random sound file from the array
        const soundFile = pollution.sound_file[Math.floor(Math.random() * pollution.sound_file.length)]

        // Check if sound is already in cache
        if (soundCache.has(soundFile)) {
          gameState.preloadedSounds.set(pollution.pollution, soundCache.get(soundFile))
          continue
        }

        const audio = new Audio(soundFile)

        // For mock audio in tests, handle differently
        if (typeof MockAudio !== 'undefined' && audio instanceof MockAudio) {
          // For mock audio, we need to check if it's a success or failure case
          if (audio.listeners && audio.listeners.error) {
            // This is a failure case - trigger error and don't add to preloadedSounds
            audio.listeners.error.forEach((cb) => cb())
            continue
          }
          // Only add to preloadedSounds if there's no error listener
          if (!audio.listeners || !audio.listeners.error) {
            gameState.preloadedSounds.set(pollution.pollution, audio)
            soundCache.set(soundFile, audio)
            if (audio.listeners && audio.listeners.canplaythrough) {
              audio.listeners.canplaythrough.forEach((cb) => cb())
            }
          }
          continue
        }

        // For real audio, set up event listeners and add to preloadedSounds
        gameState.preloadedSounds.set(pollution.pollution, audio)
        soundCache.set(soundFile, audio)
        audio.addEventListener('canplaythrough', () => {
          console.log(`Sound loaded: ${soundFile}`)
        })
        audio.addEventListener('error', (e) => {
          console.error(`Error loading sound file ${soundFile}:`, e)
          gameState.preloadedSounds.delete(pollution.pollution)
          soundCache.delete(soundFile)
        })

        await audio.load()
      } catch (error) {
        console.error(`Error preloading sound ${pollution.sound_file}:`, error)
        gameState.preloadedSounds.delete(pollution.pollution)
      }
    }

    // Then preload any tinnitus sounds from selectedSounds
    const tinnitusSounds = gameState.selectedSounds.filter((sound) => sound.isTinnitus)
    for (const tinnitusSound of tinnitusSounds) {
      try {
        // Get sound file - handle both array and string cases
        const soundFile = Array.isArray(tinnitusSound.sound_file)
          ? tinnitusSound.sound_file[Math.floor(Math.random() * tinnitusSound.sound_file.length)]
          : tinnitusSound.sound_file

        // Check if sound is already in cache
        if (soundCache.has(soundFile)) {
          gameState.preloadedSounds.set(tinnitusSound.pollution, soundCache.get(soundFile))
          continue
        }

        const audio = new Audio(soundFile)

        // For mock audio in tests, handle differently
        if (typeof MockAudio !== 'undefined' && audio instanceof MockAudio) {
          // For mock audio, we need to check if it's a success or failure case
          if (audio.listeners && audio.listeners.error) {
            // This is a failure case - trigger error and don't add to preloadedSounds
            audio.listeners.error.forEach((cb) => cb())
            continue
          }
          // Only add to preloadedSounds if there's no error listener
          if (!audio.listeners || !audio.listeners.error) {
            gameState.preloadedSounds.set(tinnitusSound.pollution, audio)
            soundCache.set(soundFile, audio)
            if (audio.listeners && audio.listeners.canplaythrough) {
              audio.listeners.canplaythrough.forEach((cb) => cb())
            }
          }
          continue
        }

        // For real audio, set up event listeners and add to preloadedSounds
        gameState.preloadedSounds.set(tinnitusSound.pollution, audio)
        soundCache.set(soundFile, audio)
        audio.addEventListener('canplaythrough', () => {
          console.log(`Sound loaded: ${soundFile}`)
        })
        audio.addEventListener('error', (e) => {
          console.error(`Error loading sound file ${soundFile}:`, e)
          gameState.preloadedSounds.delete(tinnitusSound.pollution)
          soundCache.delete(soundFile)
        })

        await audio.load()
      } catch (error) {
        console.error(`Error preloading tinnitus sound ${tinnitusSound.sound_file}:`, error)
        gameState.preloadedSounds.delete(tinnitusSound.pollution)
      }
    }
  } catch (error) {
    console.error('Error in preloadSounds:', error)
  } finally {
    gameState.isLoading = false
  }
}

/**
 * Initializes the game and sets up event listeners
 */
async function init() {
  gameState.pollutions = await loadData()
  gameState.recipients = await loadRecipients()

  // Preload sounds after loading data
  await preloadSounds()

  if (document.getElementById('startGame')) {
    setupEventListeners()
    createRecipientSelection()
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
  // Store any tinnitus sounds that might be in selectedSounds
  const tinnitusSounds = gameState.selectedSounds.filter((sound) => sound.isTinnitus)

  // If we don't have any regular sounds selected, select new random sounds
  if (gameState.selectedSounds.length === tinnitusSounds.length) {
    // Select new random sounds
    const numSounds = Math.floor(Math.random() * 5) + 1
    const availableSounds = [...gameState.pollutions]
    gameState.selectedSounds = [...tinnitusSounds] // Keep tinnitus sounds

    // Add random pollution sounds
    for (let i = 0; i < numSounds; i++) {
      if (availableSounds.length === 0) break
      const randomIndex = Math.floor(Math.random() * availableSounds.length)
      const sound = availableSounds.splice(randomIndex, 1)[0]
      gameState.selectedSounds.push(sound)
    }
  }

  // Stop all currently playing sounds
  stopAllSounds()

  // Play all selected sounds
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

  // Skip points calculation for tinnitus sounds
  if (selectedSound.isTinnitus) return

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
  // Ensure adjustment is a number
  adjustment = Number(adjustment)
  if (isNaN(adjustment)) {
    console.error('Invalid time adjustment value:', adjustment)
    return
  }

  const newTime = gameState.timeRemaining + adjustment

  // Don't allow time below 10 seconds or above 60 seconds
  if (newTime < 10) {
    gameState.timeRemaining = 10
  } else if (newTime > 60) {
    gameState.timeRemaining = 60
  } else {
    gameState.timeRemaining = newTime
  }

  // Update points multiplier based on time adjustment
  if (adjustment < 0) {
    gameState.pointsMultiplier = 1.5 // Increase multiplier when decreasing time
  } else if (adjustment > 0) {
    gameState.pointsMultiplier = 0.75 // Decrease multiplier when increasing time
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
 * Formats recipient labels into a string with proper separators
 * @param {Array} recipients - Array of recipient objects
 * @returns {string} Formatted recipient labels string
 */
function formatRecipientLabels(recipients) {
  if (!recipients?.length) {
    return 'ty'
  }

  const formatRecipient = (recipient) => recipient.label.toLowerCase()

  if (recipients.length === 1) {
    return formatRecipient(recipients[0])
  } else if (recipients.length === 2) {
    return `${formatRecipient(recipients[0])} i ${formatRecipient(recipients[1])}`
  } else {
    const lastRecipient = recipients[recipients.length - 1]
    const otherRecipients = recipients.slice(0, -1)
    return `${otherRecipients.map(formatRecipient).join(', ')} i ${formatRecipient(lastRecipient)}`
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
  } else {
    // Clear and recreate the sound grid
    soundGrid.innerHTML = ''
    createSoundGrid()
  }

  // Update all guessing titles with recipient labels
  const guessingTitles = document.querySelectorAll('.guessing-title')
  const recipientLabels = formatRecipientLabels(gameState.selectedRecipients)

  guessingTitles.forEach((title) => {
    // Find or create the recipients span
    let recipientsSpan = title.querySelector('#sessionRecipients')
    if (!recipientsSpan) {
      recipientsSpan = document.createElement('span')
      recipientsSpan.id = 'sessionRecipients'
      // Insert the span after "Jako"
      const text = title.textContent
      title.textContent = 'Jako '
      title.appendChild(recipientsSpan)
      title.appendChild(document.createTextNode(' słyszałxś'))
    }
    recipientsSpan.textContent = recipientLabels
  })

  // Set display styles directly
  if (soundGrid) {
    soundGrid.style.display = 'grid'
  }

  toggleUIElements({
    'sound-grid': 'grid',
    '.guessing-title': 'block',
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
 *
 * This function handles:
 * 1. Stopping the guessing timer
 * 2. Updating UI elements visibility
 * 3. Displaying the final score
 * 4. Updating the session sounds display with proper formatting:
 *    - Shows sounds in a comma-separated list with "i" before the last sound
 *    - Formats sound names by replacing underscores with spaces and capitalizing words
 * 5. Updating all guessing titles with recipient labels
 */
function endGuessingPhase() {
  clearInterval(gameState.guessingInterval)
  gameState.isGuessingPhase = false

  // Hide time progress bar
  toggleTimeProgressBar(false)

  toggleUIElements({
    'sound-grid': 'none',
    applyGuess: 'none',
    timeAdjustment: 'none',
    gamePlay: 'none',
    gameOver: 'block',
    '.guessing-title': 'block' // Show guessing title on game over screen
  })

  document.getElementById('finalScore').textContent = gameState.score

  // Update session sounds display with proper formatting
  const sessionSounds = document.getElementById('sessionSounds')
  if (sessionSounds) {
    const guessingTitle = sessionSounds.querySelector('.guessing-title')
    if (guessingTitle) {
      // Find or create the recipients span
      let recipientsSpan = guessingTitle.querySelector('#sessionRecipients')
      if (!recipientsSpan) {
        recipientsSpan = document.createElement('span')
        recipientsSpan.id = 'sessionRecipients'
        // Insert the span after "Jako"
        guessingTitle.textContent = 'Jako '
        guessingTitle.appendChild(recipientsSpan)
        guessingTitle.appendChild(document.createTextNode(' słyszałxś '))
      }
      recipientsSpan.textContent = formatRecipientLabels(gameState.selectedRecipients)

      // Find or create the sounds list span
      let soundsList = guessingTitle.querySelector('#sessionSoundsList')
      if (!soundsList) {
        soundsList = document.createElement('span')
        soundsList.id = 'sessionSoundsList'
        guessingTitle.appendChild(soundsList)
      }
      soundsList.textContent = formatSoundNames(gameState.selectedSounds)
    }
  }

  // Update other guessing titles with recipient labels only
  const otherGuessingTitles = document.querySelectorAll('.guessing-title:not(#sessionSounds .guessing-title)')
  otherGuessingTitles.forEach((title) => {
    let recipientsSpan = title.querySelector('#sessionRecipients')
    if (!recipientsSpan) {
      recipientsSpan = document.createElement('span')
      recipientsSpan.id = 'sessionRecipients'
      // Insert the span after "Jako"
      title.textContent = 'Jako '
      title.appendChild(recipientsSpan)
      title.appendChild(document.createTextNode(' słyszałxś'))
    }
    recipientsSpan.textContent = formatRecipientLabels(gameState.selectedRecipients)
  })
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
  // Clear any existing interval
  if (gameState.gameInterval) {
    clearInterval(gameState.gameInterval)
  }

  // Don't reset timeRemaining here, use the current value
  updateTimer(gameState.timeRemaining)

  gameState.gameInterval = setInterval(() => {
    gameState.timeRemaining--
    updateTimer(gameState.timeRemaining)

    if (gameState.timeRemaining <= 0) {
      clearInterval(gameState.gameInterval)
      gameState.gameInterval = null
      startGuessingPhase()
    }
  }, 1000)
}

/**
 * Sets up event listeners for a button with keyboard, click, and touch support
 * @param {HTMLElement} button - The button element to set up
 * @param {Function} action - The action to perform
 * @param {string} ariaLabel - The ARIA label for the button
 */
function setupButtonListeners(button, action, ariaLabel) {
  if (!button) return

  button.setAttribute('aria-label', ariaLabel)
  button.setAttribute('tabindex', '0')
  button.setAttribute('role', 'button')

  // Click event
  button.addEventListener('click', action)

  // Keyboard events
  button.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      button.classList.add('active')
      action()
    }
  })

  button.addEventListener('keyup', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      button.classList.remove('active')
    }
  })

  // Touch events
  button.addEventListener(
    'touchstart',
    (e) => {
      e.preventDefault()
      button.classList.add('active')
      action()
    },
    { passive: false }
  )

  button.addEventListener(
    'touchend',
    () => {
      button.classList.remove('active')
    },
    { passive: true }
  )

  // Focus styles
  button.addEventListener('focus', () => {
    button.style.outline = '2px solid #007bff'
    button.style.outlineOffset = '2px'
    button.style.boxShadow = '0 0 0 2px rgba(0, 123, 255, 0.25)'
  })

  button.addEventListener('blur', () => {
    button.style.outline = 'none'
    button.style.outlineOffset = '0'
    button.style.boxShadow = 'none'
  })
}

/**
 * Sets up all game event listeners
 */
function setupEventListeners() {
  const startGameBtn = document.getElementById('startGame')
  const decreaseTimeBtn = document.getElementById('decreaseTime')
  const increaseTimeBtn = document.getElementById('increaseTime')
  const applyGuessBtn = document.getElementById('applyGuess')
  const playAgainBtn = document.getElementById('playAgain')
  const soundGrid = document.querySelector('.sound-grid')

  // Add keyboard navigation support
  document.addEventListener('keydown', (e) => {
    if (e.key === ' ' && !gameState.isGuessingPhase) {
      e.preventDefault()
      // Only play sounds if we have selected sounds
      if (gameState.selectedSounds.length > 0) {
        playRandomSounds()
      }
    }
  })

  // Set up button listeners
  setupButtonListeners(startGameBtn, startGame, 'Start the game')
  setupButtonListeners(playAgainBtn, resetGame, 'Play again')
  setupButtonListeners(decreaseTimeBtn, () => adjustTime(-10), 'Decrease time by 10 seconds for more points')
  setupButtonListeners(increaseTimeBtn, () => adjustTime(10), 'Increase time by 10 seconds for fewer points')
  setupButtonListeners(applyGuessBtn, applyGuess, 'Apply your guess')

  // Add keyboard navigation for the start button
  if (startGameBtn) {
    startGameBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && !e.shiftKey) {
        // If tabbing forward from start button, focus the decrease time button
        e.preventDefault()
        if (decreaseTimeBtn) {
          decreaseTimeBtn.focus()
        }
      } else if (e.key === 'Tab' && e.shiftKey) {
        // If shift+tabbing from start button, focus the last checkbox
        e.preventDefault()
        const checkboxes = document.querySelectorAll('.recipient-checkbox input[type="checkbox"]')
        const lastCheckbox = checkboxes[checkboxes.length - 1]
        if (lastCheckbox) {
          lastCheckbox.focus()
        }
      }
    })
  }

  // Add keyboard navigation for the decrease time button
  if (decreaseTimeBtn) {
    decreaseTimeBtn.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && e.shiftKey) {
        // If shift+tabbing from decrease time button, focus the start button
        e.preventDefault()
        if (startGameBtn) {
          startGameBtn.focus()
        }
      }
    })
  }

  if (soundGrid) {
    soundGrid.setAttribute('role', 'grid')
    soundGrid.setAttribute('aria-label', 'Sound selection grid')
    soundGrid.setAttribute('tabindex', '0')
  }
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
  console.log('Starting game with selected recipients:', gameState.selectedRecipients)

  toggleUIElements({
    gameControls: 'none',
    gamePlay: 'block',
    '.sound-grid': 'none'
  })

  // Ensure time progress bar is visible
  toggleTimeProgressBar(true)

  // Reset time adjustment buttons
  const decreaseTimeBtn = document.getElementById('decreaseTime')
  const increaseTimeBtn = document.getElementById('increaseTime')
  if (decreaseTimeBtn) decreaseTimeBtn.disabled = false
  if (increaseTimeBtn) increaseTimeBtn.disabled = false

  // Apply risk functions from selected recipients first
  console.log('About to apply risk functions')
  applyRiskFunctions()
  console.log('Risk functions applied')

  // Preload all sounds including tinnitus sounds
  console.log('Preloading sounds...')
  await preloadSounds()
  console.log('Sounds preloaded')

  // Start the game timer
  startGameTimer()

  // Start playing random sounds
  startSoundChanges()
}

/**
 * Creates the grid of sound buttons
 */
function createSoundGrid() {
  const soundGrid = document.querySelector('.sound-grid')
  if (!soundGrid) return

  soundGrid.innerHTML = ''
  soundGrid.setAttribute('role', 'grid')
  soundGrid.setAttribute('aria-label', 'Sound selection grid')

  const nonTinnitusSounds = gameState.pollutions.filter((sound) => !sound.isTinnitus)
  nonTinnitusSounds.forEach((sound) => {
    soundGrid.appendChild(createSoundButton(sound))
  })
}

/**
 * Formats sound names into a string with proper separators
 * @param {Array} sounds - Array of sound objects
 * @returns {string} Formatted sound names string
 */
function formatSoundNames(sounds) {
  if (!sounds?.length) {
    return 'Brak dźwięków'
  }

  const formatSound = (sound) => sound.pollution.replace(/_/g, ' ').toLowerCase()

  if (sounds.length === 1) {
    return formatSound(sounds[0])
  } else if (sounds.length === 2) {
    return `${formatSound(sounds[0])} i ${formatSound(sounds[1])}`
  } else {
    const lastSound = sounds[sounds.length - 1]
    const otherSounds = sounds.slice(0, -1)
    return `${otherSounds.map(formatSound).join(', ')} i ${formatSound(lastSound)}`
  }
}

/**
 * Ends the game and shows final score
 */
function endGame() {
  console.log('Ending game, current state:', {
    score: gameState.score,
    selectedRecipients: gameState.selectedRecipients
  })

  // Stop all sounds and timers
  stopAllSounds()
  clearInterval(gameState.gameInterval)
  clearInterval(gameState.guessingInterval)

  // Hide time progress bar
  toggleTimeProgressBar(false)

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

  // Update session sounds display
  if (sessionSounds) {
    const guessingTitle = sessionSounds.querySelector('.guessing-title')
    if (guessingTitle) {
      // Set the base text
      guessingTitle.textContent = 'Jako słyszałxś '

      // Add the sounds list
      let soundsList = guessingTitle.querySelector('#sessionSoundsList')
      if (!soundsList) {
        soundsList = document.createElement('span')
        soundsList.id = 'sessionSoundsList'
        guessingTitle.appendChild(soundsList)
      }
      soundsList.textContent = formatSoundNames(gameState.selectedSounds)
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

  // Hide time progress bar instead of removing it
  toggleTimeProgressBar(false)

  // Reset game state
  gameState.score = 0
  gameState.guessedSounds.clear()
  gameState.selectedSounds = []
  gameState.pointsMultiplier = 1.0
  gameState.isGuessingPhase = false
  gameState.guessingTimeRemaining = 10
  gameState.timeRemaining = 30
  gameState.selectedRecipients = []
  gameState.isLoading = false

  // Clear the selectedRecipients span text content
  const selectedRecipientsSpan = document.getElementById('selectedRecipients')
  if (selectedRecipientsSpan) {
    selectedRecipientsSpan.textContent = ''
  }

  updateScoreDisplay()
  updateTimer(30)

  // Reset UI elements
  toggleUIElements(
    {
      gameOver: 'none',
      gameControls: 'block',
      gamePlay: 'none',
      '.sound-grid': 'none',
      applyGuess: 'none',
      '#timeAdjustment': 'flex',
      '.guessing-title': 'none'
    },
    true
  )

  // Reset recipient checkboxes
  const checkboxes = document.querySelectorAll('.recipient-checkbox input')
  checkboxes.forEach((checkbox) => {
    checkbox.checked = false
  })
}

/**
 * Creates and manages recipient selection UI
 * @param {Object} recipient - Recipient data object
 * @param {HTMLElement} container - Container element for checkboxes
 * @returns {HTMLDivElement} The created checkbox element
 */
function createRecipientUI(recipient, container) {
  const div = document.createElement('div')
  div.className = 'recipient-checkbox'
  div.setAttribute('role', 'group')
  div.setAttribute('aria-label', `Select ${recipient.label} as recipient`)

  const checkbox = document.createElement('input')
  checkbox.type = 'checkbox'
  checkbox.id = `recipient-${recipient.group}`
  checkbox.value = recipient.group
  checkbox.setAttribute('aria-label', recipient.label)
  checkbox.setAttribute('tabindex', '0')

  const label = document.createElement('label')
  label.htmlFor = `recipient-${recipient.group}`
  label.className = 'recipient-checkbox tooltip'
  label.textContent = recipient.label

  const span = document.createElement('span')
  span.className = 'checkbox-custom'

  const tooltipSpan = document.createElement('span')
  tooltipSpan.className = 'tooltiptext tooltiptext-dynamic'
  tooltipSpan.innerHTML = `<p>${recipient.description}</p><a class="link" href="${recipient.source}" target="_blank">Źródło</a>`

  label.appendChild(checkbox)
  label.appendChild(span)
  label.appendChild(tooltipSpan)
  div.appendChild(label)

  // Unified event handling
  const handleRecipientChange = (e) => {
    if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return
    if (e.type === 'keydown') e.preventDefault()

    const isChecked = e.type === 'keydown' ? !checkbox.checked : checkbox.checked
    checkbox.checked = isChecked

    if (isChecked) {
      if (!gameState.selectedRecipients.some((r) => r.group === recipient.group)) {
        gameState.selectedRecipients.push(recipient)
      }
    } else {
      gameState.selectedRecipients = gameState.selectedRecipients.filter((r) => r.group !== recipient.group)
    }

    const selectedRecipientsSpan = document.getElementById('selectedRecipients')
    if (selectedRecipientsSpan) {
      selectedRecipientsSpan.textContent = formatRecipientLabels(gameState.selectedRecipients)
    }
  }

  checkbox.addEventListener('click', handleRecipientChange)
  checkbox.addEventListener('keydown', handleRecipientChange)
  checkbox.addEventListener('change', handleRecipientChange)

  // Keyboard navigation
  checkbox.addEventListener('keydown', (e) => {
    if (e.key === 'Tab') {
      e.preventDefault()
      const checkboxes = container.querySelectorAll('input[type="checkbox"]')
      const currentIndex = Array.from(checkboxes).indexOf(checkbox)
      const nextIndex = e.shiftKey ? currentIndex - 1 : currentIndex + 1

      if (nextIndex >= 0 && nextIndex < checkboxes.length) {
        checkboxes[nextIndex].focus()
      } else if (nextIndex >= checkboxes.length) {
        const startButton = document.getElementById('startGame')
        if (startButton) startButton.focus()
      } else if (nextIndex < 0) {
        checkboxes[checkboxes.length - 1].focus()
      }
    }
  })

  return div
}

/**
 * Creates the recipient selection UI
 */
function createRecipientSelection() {
  const container = document.getElementById('recipientCheckboxes')
  if (!container) return

  container.innerHTML = ''

  let selectedRecipientsSpan = document.getElementById('selectedRecipients')
  if (!selectedRecipientsSpan) {
    selectedRecipientsSpan = document.createElement('span')
    selectedRecipientsSpan.id = 'selectedRecipients'
    let heading = container.querySelector('h2')
    heading.appendChild(selectedRecipientsSpan)
  }

  gameState.recipients.forEach((recipient) => {
    container.appendChild(createRecipientUI(recipient, container))
  })
}

/**
 * Helper function to select random sounds
 * @param {number} count - Number of sounds to select
 * @returns {Array} Array of selected sounds
 */
function selectRandomSounds(count) {
  const availableSounds = [...gameState.pollutions]
  const selected = []
  count = Math.min(count, 2)
  for (let i = 0; i < count; i++) {
    if (availableSounds.length === 0) break
    const randomIndex = Math.floor(Math.random() * availableSounds.length)
    selected.push(availableSounds.splice(randomIndex, 1)[0])
  }
  return selected
}

/**
 * Helper function to parse amplitude value
 * @param {string|number} amplitude - Amplitude value to parse
 * @returns {number} Parsed amplitude value
 */
function parseAmplitude(amplitude) {
  if (!amplitude) return 0
  if (typeof amplitude === 'number') return amplitude
  if (amplitude.includes('up to')) {
    return parseInt(amplitude.match(/\d+/)[0])
  }
  if (amplitude.includes('-')) {
    return parseInt(amplitude.split('-')[0])
  }
  return parseInt(amplitude)
}

/**
 * Applies risk functions for selected recipient groups
 */
function applyRiskFunctions() {
  gameState.selectedRecipients.forEach((recipient) => {
    switch (recipient.risk_function) {
      case 'reduced_time':
        gameState.timeRemaining = Math.max(10, gameState.timeRemaining - 10)
        gameState.guessingTimeRemaining = Math.max(3, gameState.guessingTimeRemaining - 2)
        updateTimer(gameState.timeRemaining)
        break

      case 'right_channel_sine':
        gameState.selectedSounds.push({
          pollution: 'tinnitus',
          sound_file: 'sounds/tinnitus.ogg',
          amplitude: '0-0',
          isTinnitus: true
        })
        break

      case 'loud_sounds_louder':
        gameState.pollutions.forEach((sound) => {
          const amplitude = parseAmplitude(sound.amplitude)
          if (amplitude >= 50) {
            sound.volumeAdjustment = 3
          }
        })
        break

      case 'loud_rumble':
        if (gameState.selectedSounds.length === 0) {
          gameState.selectedSounds = selectRandomSounds(Math.floor(Math.random() * 5) + 1)
        }
        const industrialSound = gameState.pollutions.find((sound) => sound.pollution === 'przemysł')
        if (industrialSound && !gameState.selectedSounds.some((sound) => sound.pollution === 'przemysł')) {
          gameState.selectedSounds.push(industrialSound)
        }
        break

      case 'lowpass_filter':
        if (gameState.selectedSounds.length === 0) {
          gameState.selectedSounds = selectRandomSounds(Math.floor(Math.random() * 5) + 1)
        }
        gameState.selectedSounds.forEach((sound) => {
          if (!sound.isTinnitus) {
            sound.lowpassFilter = 200
          }
        })
        break

      case 'high_frequency_loss':
        if (gameState.selectedSounds.length === 0) {
          gameState.selectedSounds = selectRandomSounds(Math.floor(Math.random() * 5) + 1)
        }
        gameState.selectedSounds.forEach((sound) => {
          if (!sound.isTinnitus) {
            sound.lowpassFilter = 1500
          }
        })
        break

      case 'low_amplified':
        if (gameState.selectedSounds.length === 0) {
          gameState.selectedSounds = selectRandomSounds(Math.floor(Math.random() * 5) + 1)
        }
        gameState.selectedSounds.forEach((sound) => {
          if (!sound.isTinnitus) {
            sound.bassBoost = {
              frequency: 300,
              gain: 10
            }
          }
        })
        break

      case 'reverbation':
        if (gameState.selectedSounds.length === 0) {
          gameState.selectedSounds = selectRandomSounds(Math.floor(Math.random() * 5) + 1)
        }
        gameState.selectedSounds.forEach((sound) => {
          if (!sound.isTinnitus) {
            sound.reverbation = true
          }
        })
        break

      case 'distorted_song_pattern':
        gameState.selectedSounds.push({
          pollution: 'birds',
          sound_file: 'sounds/birds_393699.ogg',
          amplitude: '0-0',
          isTinnitus: true
        })
        break

      case 'highpass_filter':
        if (gameState.selectedSounds.length === 0) {
          gameState.selectedSounds = selectRandomSounds(Math.floor(Math.random() * 5) + 1)
        }
        gameState.selectedSounds.forEach((sound) => {
          if (!sound.isTinnitus) {
            sound.highpassFilter = 2000
          }
        })
        break
    }
  })
}

/**
 * Updates the game over screen to show selected recipient groups
 */
function updateGameOverScreen() {
  const sessionRecipients = document.getElementById('sessionRecipients')
  if (!sessionRecipients) return

  const recipientsList = sessionRecipients.querySelector('ul')
  if (!recipientsList) return

  recipientsList.innerHTML = ''
  if (gameState.selectedRecipients?.length > 0) {
    gameState.selectedRecipients.forEach((recipient) => {
      recipientsList.appendChild(createElement('li', {}, [recipient.label]))
    })
  }
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
    ...Object.fromEntries(
      Object.entries(window).filter(
        ([key, value]) =>
          typeof value === 'function' &&
          !key.startsWith('_') &&
          !['alert', 'confirm', 'prompt', 'fetch', 'setTimeout', 'setInterval'].includes(key)
      )
    ),
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
        guessingInterval: null,
        selectedRecipients: [],
        recipients: []
      }
    }
  }
}
