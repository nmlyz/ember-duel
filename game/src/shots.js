// The screenshot scenes behind ?shot=title|table|win|lose. Each one plays the
// real rules forward from a fresh seeded game, steered by the same autopilot
// the AI uses, so every frame is what a real game looks like and the same
// seed always gives the same frame. No animations run in shot mode: the
// frame is the finished state.

import { autopilotTurn, opponentTurn } from './ai.js';
import { createGame, endTurn, runOpponentTurn, startDuel } from './engine.js';
import { searchTurn } from './simulate.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/**
 * Play `turns` full rounds (player + opponent) from a fresh game.
 * Returns the state mid-duel. `playSide0` plays the human side's turn;
 * Ash always answers with its 1-ply search.
 */
function playRounds(seed, rounds, playSide0) {
  const state = createGame(seed);
  startDuel(state);
  for (let round = 0; round < rounds; round += 1) {
    if (state.phase !== 'play') break;
    playSide0(state);
    if (state.phase !== 'play') break;
    const result = endTurn(state);
    if (!result.ok) break;
    runOpponentTurn(state, opponentTurn);
  }
  return state;
}

/**
 * Stage the named scene on a fresh state and return { state, screen }.
 * title: the title screen over a fresh table.
 * table: a mid-duel table, both hands full and creatures on both boards.
 * win: the player wins the duel; lose: Ash wins it.
 */
export function stageShot(name, seed) {
  if (name === 'table') {
    const state = playRounds(seed, 4, (s) => autopilotTurn(s, 0.6));
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    // A searching player at full aggression against Ash: the duel ends in
    // our favour. Fall back to a longer push on another seed.
    let state = playRounds(seed, 30, (s) => searchTurn(s, 0, 1));
    if (state.winner !== 0) {
      const retry = playRounds(seed + 1000, 40, (s) => searchTurn(s, 0, 1));
      if (retry.winner === 0) state = retry;
    }
    return { state, screen: state.winner === 0 ? SCREEN_WIN : SCREEN_PLAY };
  }
  if (name === 'lose') {
    // A passive player that never attacks the hero: Ash closes the duel.
    let state = playRounds(seed, 30, (s) => autopilotTurn(s, 0));
    if (state.winner !== 1) {
      const retry = playRounds(seed + 2000, 40, (s) => autopilotTurn(s, 0));
      if (retry.winner === 1) state = retry;
    }
    return { state, screen: state.winner === 1 ? SCREEN_LOSE : SCREEN_PLAY };
  }
  // title (and anything else): a fresh table under the title screen.
  const state = createGame(seed);
  return { state, screen: SCREEN_TITLE };
}
