[![make.fun](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/nmlyz/ember-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/nmlyz/ember-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826)

# Ember Duel

A duel of ember, element and nerve. You face Ash, the Ember Warden, across
a table with 20 life each: spend ember to play creatures and spells from
your hand, attack with the creatures on your board, and reduce Ash to zero
before Ash does the same to you.

## How to play

Open `game/index.html` in a desktop browser. No build step, no network: the
game is static files that play offline.

- **Click a card** — play it from your hand (creatures join your board,
  spells need a target when they say so)
- **Click a creature, then a target** — attack an enemy creature or Ash
- **END TURN / Space** — pass; Ash plays, then you draw and gain ember
- **1-7** — play a card from your hand · **Esc** — cancel a target ·
  **H** — help · **M** — mute · **R** — restart

## The rules

- Each turn you gain ember: 1 more than last turn, up to 10, and draw a
  card. Spend ember to play cards.
- Creatures cannot attack the turn they are played, unless they have
  **Swift**. **Guard** creatures must be attacked before anything else on
  their side. **Siphon** heals your hero when it attacks.
- Element advantage deals +2 damage: **Flame beats Leaf · Leaf beats
  Stone · Stone beats Tide · Tide beats Flame**.
- Run out of cards and your hero takes 2 fatigue damage each turn.
- Reduce Ash to 0 life to win. Your score is damage dealt plus cards
  played, with a bonus for the win.

## The cards

27 original cards across four elements: 18 creatures and 9 spells, from
the 1-ember Cinder Pup to the 7-ember Emberlord. The deck is 45 cards;
both duelists draw from the same list, shuffled with a seed, so every
duel plays differently.

## Layout

- `game/index.html` — the page; a 1280×720 canvas, mouse and keyboard
- `game/src/main.js` — boot, game loop, screenshot mode (`?shot=`)
- `game/src/engine.js` — the pure rules: turns, ember, combat, spells
- `game/src/cards.js` — the 27-card catalogue and the element cycle
- `game/src/ai.js` — Ash's heuristics and the autopilot that stages shots
- `game/src/render.js` — the table, hands, boards, cards and end screens
- `game/src/input.js` — mouse and keyboard input, targeting
- `game/src/sound.js` — synthesised WebAudio sounds, no audio files
- `game/src/shots.js` — title / table / win / lose scenes from real games
- `game/src/random.js` — seeded random numbers; every game replays exactly
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to
  the output directory and writes `dossier.json`
- `screenshots/` — title, table, victory and defeat, taken from the game
