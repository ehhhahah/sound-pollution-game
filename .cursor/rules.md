This is a sound pollution awareness game implemented as a frontend-only web application.

Game Overview:

- The game presents different sound pollution samples from data/pollutions.json
- Players must identify the sounds they hear within a time limit and then within a time limit they
- Scoring system:
  - Players earn points for correct guesses
  - Points are awarded based on sound amplitude (quieter sounds = more points)
  - Penalties for incorrect guesses
  - Bonus or penalty is applied for time reducing of guess or extending the time
  - Sounds are randomly chosen and played in loop for the listening (30s) timespan.
  - SOunds are not played when the guessing step start, so the user must remember what he have heard.
- Time-limited gameplay (30 seconds for listening, 10 seconds for guess)

Technical Implementation:

- Uses Web Audio API for sound playback
- Sound data is loaded from JSON files in the /data/ folder
- Game state management and logic in game.js
- UI implementation in game.html

Testing:

- Browser-based testing using Mocha and Chai
- Test suite implemented in tests/game.test.js
- Test runner in tests/test.html in browser

Game Rules:

- Detailed game rules are documented in rules.html
- The rules.html file must be kept up to date with any changes to the game mechanics
- Any modifications to game rules in game.js or game.test.js should be reflected in rules.html
