// The opponent. Ash plays by 1-ply search (see simulate.js): every card it
// could play and every attack it could make is tried on a copy of the duel,
// and the move that leaves Ash best off is the one played. The greedy
// heuristics below still steer the autopilot that stages the screenshots,
// so a staged game is a real game.

import { CARD_BY_ID } from './cards.js';
import {
  attack, attackTargets, canAttackWith, canPlayCard, endTurn, other, playCard,
  spellTargetKind,
} from './engine.js';
import { searchTurn } from './simulate.js';

function creatureValue(card) {
  return card.atk * 2 + card.hp + (card.ability === 'guard' ? 2 : 0)
    + (card.ability === 'swift' ? 1 : 0) + (card.ability === 'siphon' ? 1 : 0)
    + (card.ability === 'rally' ? 2 : 0) + (card.ability === 'kindle' ? 2 : 0);
}

function spellValue(state, side, card) {
  const foe = other(side);
  switch (card.spell) {
    case 'damage3': return 6;
    case 'damage4': return state.players[foe].board.length ? 7 : -99;
    case 'damage5': return state.players[foe].board.length ? 8 : -99;
    case 'damageAll1': return state.players[foe].board.length >= 2 ? 6 : -99;
    case 'damageAll2': return state.players[foe].board.length >= 2 ? 8 : -99;
    case 'damageHero3Draw': return 7;
    case 'damageHero2Draw': return 6;
    case 'damageHero1Ember2': return 5;
    case 'damageHero6': return 9;
    case 'heal5': return state.players[side].life <= 12 ? 8 : 2;
    case 'heal3Draw': return state.players[side].life <= 14 ? 6 : 2;
    case 'draw2': return state.players[side].hand.length <= 3 ? 6 : 2;
    case 'buff3': return state.players[side].board.length ? 5 : -99;
    case 'buffAtk2': return state.players[side].board.length ? 5 : -99;
    case 'summonSprouts': return state.players[side].board.length <= 3 ? 8 : 3;
    default: return 3;
  }
}

/** Pick a target for a spell that needs one, or null when it cannot be used. */
function chooseSpellTarget(state, side, card) {
  const foe = other(side);
  const kind = spellTargetKind(card);
  if (kind === 'any') {
    // Ember Burst: finish the hero when lethal, else kill the biggest threat.
    if (state.players[foe].life <= 3) return { kind: 'hero' };
    let best = -1; let bestScore = 0;
    state.players[foe].board.forEach((c, i) => {
      const def = CARD_BY_ID[c.defId];
      const score = def.atk * 2 + def.hp;
      if (c.hp <= 3 && score > bestScore) { best = i; bestScore = score; }
    });
    if (best >= 0) return { kind: 'creature', index: best };
    return { kind: 'hero' };
  }
  if (kind === 'enemyCreature') {
    // Removal: kill the biggest threat this spell can finish.
    const lethalHp = card.spell === 'damage5' ? 5 : 4;
    let best = -1; let bestScore = 0;
    state.players[foe].board.forEach((c, i) => {
      const def = CARD_BY_ID[c.defId];
      const score = def.atk * 2 + def.hp;
      if (c.hp <= lethalHp && score > bestScore) { best = i; bestScore = score; }
    });
    return best >= 0 ? { kind: 'creature', index: best } : null;
  }
  if (kind === 'friendlyCreature') {
    // Ember Edge wants the hardest hitter; Stone Skin the frailest body.
    let best = -1;
    if (card.spell === 'buffAtk2') {
      let bestAtk = -1;
      state.players[side].board.forEach((c, i) => {
        if (c.atk > bestAtk) { best = i; bestAtk = c.atk; }
      });
    } else {
      let bestHp = 99;
      state.players[side].board.forEach((c, i) => {
        if (c.hp < bestHp) { best = i; bestHp = c.hp; }
      });
    }
    return best >= 0 ? { kind: 'friendly', index: best } : null;
  }
  return null;
}

function chooseAttackTarget(state, side, boardIndex, aggression) {
  const foe = other(side);
  const creature = state.players[side].board[boardIndex];
  const targets = attackTargets(state, side);
  const heroTarget = targets.find((t) => t.kind === 'hero');
  const creatureTargets = targets.filter((t) => t.kind === 'creature');

  // Lethal first.
  if (heroTarget && state.players[foe].life <= creature.atk) return heroTarget;
  // Guards must be answered: hit the weakest guard we can kill, else the weakest.
  if (creatureTargets.length > 0 && targets.every((t) => t.kind === 'creature')) {
    let best = creatureTargets[0];
    let bestScore = Infinity;
    for (const t of creatureTargets) {
      const c = state.players[foe].board[t.index];
      const def = CARD_BY_ID[c.defId];
      const score = c.hp - creature.atk + def.atk;
      if (score < bestScore) { bestScore = score; best = t; }
    }
    return best;
  }
  if (creatureTargets.length > 0) {
    // Trade up: kill something worth more than us, when we survive or it is cheap.
    let best = null; let bestGain = 0;
    for (const t of creatureTargets) {
      const c = state.players[foe].board[t.index];
      const def = CARD_BY_ID[c.defId];
      const gain = (def.atk * 2 + def.hp) - (creature.atk * 2 + creature.hp);
      if (c.hp <= creature.atk && gain > bestGain) { bestGain = gain; best = t; }
    }
    if (best) return best;
  }
  // Otherwise go for the hero when aggressive or ahead on board.
  const ahead = state.players[side].board.length >= state.players[foe].board.length;
  if (heroTarget && (aggression >= 0.6 || ahead)) return heroTarget;
  return heroTarget || creatureTargets[0] || null;
}

/**
 * Play one side's whole turn: creatures and spells first, then attacks.
 * aggression 0..1: 0 never attacks the hero unless lethal, 1 always does.
 * Returns the events the turn produced.
 */
export function takeTurn(state, side, aggression) {
  const events = [];
  const player = state.players[side];

  // Play cards: repeat while something worth playing is affordable.
  for (let guard = 0; guard < 12; guard += 1) {
    if (state.phase !== 'play') break;
    let bestIndex = -1; let bestScore = -Infinity; let bestTarget = null;
    player.hand.forEach((inst, i) => {
      const card = CARD_BY_ID[inst.defId];
      if (!canPlayCard(state, side, i)) return;
      let score = card.kind === 'creature' ? creatureValue(card) : spellValue(state, side, card);
      score -= card.cost * 0.5;
      if (score <= 2) return;
      let target = null;
      if (spellTargetKind(card)) {
        target = chooseSpellTarget(state, side, card);
        if (!target) return;
      }
      if (score > bestScore) { bestScore = score; bestIndex = i; bestTarget = target; }
    });
    if (bestIndex < 0) break;
    const result = playCard(state, side, bestIndex, bestTarget);
    if (!result.ok) break;
    events.push(...(result.events || []));
  }

  // Attack with every ready creature.
  for (let i = 0; i < player.board.length; i += 1) {
    if (state.phase !== 'play') break;
    if (!canAttackWith(state, side, i)) continue;
    const target = chooseAttackTarget(state, side, i, aggression);
    if (!target) continue;
    const result = attack(state, side, i, target);
    if (result.ok) events.push(...(result.events || []));
  }
  return events;
}

/** The opponent's turn: 1-ply search, as the live game calls it. */
export function opponentTurn(state) {
  return searchTurn(state, 1, 0.65);
}

/** The same search at a chosen aggression, for the self-play harness. */
export function searchOpponentTurn(state, aggression) {
  return searchTurn(state, 1, aggression);
}

/** Autopilot for the human side in staged games: 0 passive, 1 aggressive. */
export function autopilotTurn(state, aggression) {
  return takeTurn(state, 0, aggression);
}

export { endTurn };
