// Ember Duel boot: canvas setup, game loop, screenshot mode.
// Open game/index.html in a desktop browser to play. For screenshots, open
// with ?shot=title|table|win|lose&seed=N: the game stages that scene from a
// real seeded duel and renders one still frame, with no animations.

import { createGame, startDuel } from './engine.js';
import { render, SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN, VIEW_H, VIEW_W } from './render.js';
import { stageShot } from './shots.js';
import { attachInput } from './input.js';
import { sfx, toggleMute } from './sound.js';

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
const seed = Number.parseInt(params.get('seed') || '7', 10) || 7;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const game = {
  state: createGame(seed),
  ui: { hand: [], board: [[], []], heroes: [null, null], endTurn: null },
  fx: [],
  screen: SCREEN_TITLE,
  hoverHand: -1,
  selectedHand: -1,
  targeting: null,
  attackFrom: -1,
  helpOpen: false,
  muted: false,
  shotMode: Boolean(shotName),
  render() {
    const screen = this.state.phase === 'over'
      ? (this.state.winner === 0 ? SCREEN_WIN : SCREEN_LOSE)
      : this.state.phase === 'title' ? SCREEN_TITLE : SCREEN_PLAY;
    this.screen = screen;
    render(ctx, this, this.ui, screen, this.shotMode ? [] : this.fx, performance.now());
  },
  startDuel() {
    startDuel(this.state);
    sfx.draw();
    this.render();
  },
  restart() {
    this.state = createGame((Math.random() * 1e9) | 0);
    this.fx = [];
    this.selectedHand = -1;
    this.targeting = null;
    this.attackFrom = -1;
    this.helpOpen = false;
    this.render();
  },
};

if (shotName) {
  // Screenshot mode: stage the scene, render one still frame, stop.
  // The page is exactly the canvas: no hint line, no scrollbars.
  document.getElementById('hint').style.display = 'none';
  document.body.style.overflow = 'hidden';
  const staged = stageShot(shotName, seed);
  game.state = staged.state;
  game.screen = staged.screen;
  render(ctx, game, game.ui, staged.screen, [], 0);
  document.title = `Ember Duel — ${shotName}`;
} else {
  attachInput(game, canvas);
  game.render();
  // Live loop: redraw at 30 fps for hover glow, pulses and floaters.
  setInterval(() => {
    game.fx = game.fx.filter((item) => performance.now() - item.born < 1500);
    game.render();
  }, 33);
  window.addEventListener('keydown', (event) => {
    if (event.key.toLowerCase() === 'm') toggleMute();
  });
}

// Expose the game for debugging and for the screenshot harness.
window.__emberDuel = game;
