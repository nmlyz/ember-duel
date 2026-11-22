// Ash's lookahead: clone the duel, try a move on the copy, score the result.
// The live game never touches this; the AI plays each candidate move on a
// throwaway copy and keeps the one that leaves its side best off. No random
// numbers are drawn while searching, so a search replays exactly every time.

import { CARD_BY_ID } from './cards.js';
import {
  attack, attackTargets, canAttackWith, canPlayCard, other, playCard,
  spellTargetKind,
} from './engine.js';

const ABILITY_BONUS = { guard: 2, swift: 1, siphon: 1, rally: 2, kindle: 2 };

/** Deep copy of the duel state. The rng is shared: searching draws no cards from it. */
export function cloneState(state) {
  const clonePlayer = (player) => ({
    life: player.life,
    ember: player.ember,
    maxEmber: player.maxEmber,
    bonusEmber: player.bonusEmber || 0,
    hand: player.hand.map((inst) => ({ uid: inst.uid, defId: inst.defId })),
    board: player.board.map((c) => ({ ...c })),
    deck: player.deck.slice(),
    discard: player.discard.slice(),
  });
  return {
    seed: state.seed,
    rng: state.rng,
    turn: state.turn,
    active: state.active,
    phase: state.phase,
    winner: state.winner,
    drawSkip: state.drawSkip.slice(),
    log: [],
    stats: {
      turns: state.stats.turns,
      damageDealt: state.stats.damageDealt.slice(),
      cardsPlayed: state.stats.cardsPlayed.slice(),
      creaturesSummoned: state.stats.creaturesSummoned.slice(),
    },
    players: state.players.map(clonePlayer),
  };
}

function creatureValue(instance) {
  const def = CARD_BY_ID[instance.defId];
  return instance.atk * 2 + instance.hp + (ABILITY_BONUS[def.ability] || 0)
    + (instance.canAttack ? 0.5 : 0);
}

function boardValue(player) {
  return player.board.reduce((sum, c) => sum + creatureValue(c), 0);
}

/**
 * Score a state from `side`'s point of view. Life matters most, then the
 * board, then the hand and the ember in it. A finished duel scores as a
 * win or a loss, far beyond anything a single move can swing.
 */
export function evaluateState(state, side) {
  if (state.phase === 'over') return state.winner === side ? 10000 : -10000;
  const me = state.players[side];
  const foe = state.players[other(side)];
  return 4 * (me.life - foe.life)
    + (boardValue(me) - boardValue(foe))
    + 1.5 * (me.hand.length - foe.hand.length)
    + 0.6 * (me.ember - foe.ember)
    + 0.3 * (me.deck.length - foe.deck.length);
}

/** Every legal target for a spell that needs one. */
function spellTargets(state, side, card) {
  const kind = spellTargetKind(card);
  const foe = other(side);
  if (kind === 'any') {
    const targets = [{ kind: 'hero' }];
    state.players[foe].board.forEach((_, i) => targets.push({ kind: 'creature', index: i }));
    return targets;
  }
  if (kind === 'enemyCreature') {
    return state.players[foe].board.map((_, i) => ({ kind: 'creature', index: i }));
  }
  if (kind === 'friendlyCreature') {
    return state.players[side].board.map((_, i) => ({ kind: 'friendly', index: i }));
  }
  return [null];
}

/**
 * Play one side's whole turn by 1-ply search: keep playing the card whose
 * resulting state scores best, while any play improves the score, then
 * attack with each ready creature at its best-scoring target. `aggression`
 * 0..1 discounts going for the hero: 0 only when lethal or clearly best,
 * 1 whenever it scores best. Returns the events the turn produced.
 */
export function searchTurn(state, side, aggression) {
  const events = [];
  const player = state.players[side];

  // Play cards: repeat while the best available play improves the position.
  for (let guard = 0; guard < 12; guard += 1) {
    if (state.phase !== 'play') break;
    const base = evaluateState(state, side);
    let bestScore = base;
    let bestIndex = -1;
    let bestTarget = null;
    player.hand.forEach((inst, i) => {
      if (!canPlayCard(state, side, i)) return;
      const card = CARD_BY_ID[inst.defId];
      for (const target of spellTargets(state, side, card)) {
        const trial = cloneState(state);
        const result = playCard(trial, side, i, target);
        if (!result.ok) continue;
        const score = evaluateState(trial, side);
        if (score > bestScore) {
          bestScore = score;
          bestIndex = i;
          bestTarget = target;
        }
      }
    });
    if (bestIndex < 0) break;
    const result = playCard(state, side, bestIndex, bestTarget);
    if (!result.ok) break;
    events.push(...(result.events || []));
  }

  // Attack with every ready creature, best target each, re-scored as the
  // board changes. Going for the hero is discounted by (1 - aggression).
  for (let i = 0; i < player.board.length; i += 1) {
    if (state.phase !== 'play') break;
    if (!canAttackWith(state, side, i)) continue;
    const base = evaluateState(state, side);
    let bestScore = base;
    let bestTarget = null;
    for (const target of attackTargets(state, side)) {
      const trial = cloneState(state);
      const result = attack(trial, side, i, target);
      if (!result.ok) continue;
      let score = evaluateState(trial, side);
      if (target.kind === 'hero') score -= (1 - aggression) * 8;
      if (score > bestScore) {
        bestScore = score;
        bestTarget = target;
      }
    }
    if (!bestTarget) continue;
    const result = attack(state, side, i, bestTarget);
    if (result.ok) events.push(...(result.events || []));
  }
  return events;
}
