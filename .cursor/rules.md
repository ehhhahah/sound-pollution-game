This is a sound pollution awareness game implemented as a frontend-only web application.

Game Overview:

- The game presents different sound pollution samples from data/pollutions.json
- Players must identify the sounds they hear within a time limit
- Scoring system:
  - Players earn points for correct guesses
  - Points are awarded based on sound amplitude (quieter sounds = more points)
  - Penalties for incorrect guesses (-20 points)
  - Time adjustment affects scoring:
    - Reducing time by 10 seconds: +50 points
    - Increasing time by 10 seconds: -25 points
  - Sounds are randomly chosen and played in loop for the listening phase
  - Sounds are not played during the guessing phase
  - Players must remember what they heard during the listening phase
- Time-limited gameplay:
  - Listening phase: 30 seconds (adjustable between 10-60 seconds)
  - Guessing phase: 10 seconds (adjustable between 3-10 seconds)

Technical Implementation:

- Uses Web Audio API for sound playback
- Sound data is loaded from JSON files in the /data/ folder
- Game state management and logic in game.js
- UI implementation in game.html
- UI must be in Polish
- Supports keyboard navigation and accessibility features
- Includes live region announcements for screen readers

Testing:

- Browser-based testing using Mocha and Chai
- Test suite implemented in tests/game.test.js
- Test runner in tests/test.html in browser
- Whenever user confirms a bug/failed test is fixed, write down a code comment how to prevent issue from reoccuring

Game Rules:

- Detailed game rules are documented in rules.html
- The rules.html file must be kept up to date with any changes to the game mechanics
- Any modifications to game rules in game.js or game.test.js should be reflected in rules.html

Recipient Groups:

- Players can select different recipient groups that affect gameplay
- Each recipient group has specific risk functions:
  - reduced_time: Reduces game time by 10s and guessing time by 2s
  - right_channel_sine: Adds tinnitus sound to the listening phase
  - loud_sounds_louder: (To be implemented)
  - loud_rumble: (To be implemented)
- Recipient groups are loaded from components/recipients.json
