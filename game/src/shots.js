// The screenshot scenes behind ?shot=title|table|win|lose. Each one plays the
// real rules forward from a fresh seeded game, steered by the same autopilot
// the AI uses, so every frame is what a real game looks like and the same
// seed always gives the same frame. No animations run in shot mode: the
// frame is the finished state.

import { autopilotTurn, opponentTurn } from './ai.js';
import { createGame, endTurn, runOpponentTurn, startDuel } from './engine.js';
import { SCREEN_LOSE, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WIN } from './render.js';

/**
 * Play `turns` full rounds (player autopilot + opponent) from a fresh game.
 * Returns the state mid-duel. The player autopilot's aggression and the
 * opponent's are separate, so a scene can favour either side.
 */
function playRounds(seed, rounds, playerAggression) {
  const state = createGame(seed);
  startDuel(state);
  for (let round = 0; round < rounds; round += 1) {
    if (state.phase !== 'play') break;
    autopilotTurn(state, playerAggression);
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
    const state = playRounds(seed, 4, 0.6);
    return { state, screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    // An aggressive player against a cautious Ash: the duel ends in our favour.
    const state = playRounds(seed, 30, 0.95);
    if (state.phase !== 'over') {
      // Fall back to a longer, harder push.
      const retry = playRounds(seed + 1000, 40, 1);
      if (retry.phase === 'over' && retry.winner === 0) return { state: retry, screen: SCREEN_WIN };
    }
    return { state, screen: state.winner === 0 ? SCREEN_WIN : SCREEN_PLAY };
  }
  if (name === 'lose') {
    // A passive player that never attacks the hero: Ash closes the duel.
    const state = playRounds(seed, 30, 0);
    if (state.phase !== 'over') {
      const retry = playRounds(seed + 2000, 40, 0);
      if (retry.phase === 'over' && retry.winner === 1) return { state: retry, screen: SCREEN_LOSE };
    }
    return { state, screen: state.winner === 1 ? SCREEN_LOSE : SCREEN_PLAY };
  }
  // title (and anything else): a fresh table under the title screen.
  const state = createGame(seed);
  return { state, screen: SCREEN_TITLE };
}
