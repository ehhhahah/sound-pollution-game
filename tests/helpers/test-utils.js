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
