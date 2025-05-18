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

  it('should not allow score to go below 0', function () {
    const gameState = window.gameFunctions.getGameState()
    gameState.timeRemaining = 30
    gameState.score = 20

    window.gameFunctions.adjustTime(10)

    expect(gameState.score).to.equal(0) // 20 - 25 points, but minimum is 0
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
})
