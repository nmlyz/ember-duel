// Ember Duel engine: the pure rules of the game. No DOM, no canvas, no sound
// here, so the same code drives the live game, the AI and the screenshot
// staging: a seeded game replays exactly the same way every time.
//
// A duel: two heroes at 20 life. Each turn the active duelist gains ember
// (1 more than last turn, up to 10), refills to that much, draws a card, then
// plays creatures and spells from hand and attacks with creatures on the
// board. Creatures cannot attack the turn they are played unless Swift.
// Guard creatures must be attacked before anything else on their side.
// Element advantage (Flame>Leaf>Stone>Tide>Flame) deals +2 damage.
// The first hero at 0 life loses.

import { CARD_BY_ID, buildDeck, elementAdvantage } from './cards.js';
import { makeRng, shuffle } from './random.js';

export const MAX_LIFE = 20;
export const MAX_EMBER = 10;
export const MAX_BOARD = 5;
export const MAX_HAND = 10;
export const START_HAND = 3;

let nextUid = 1;

export function createGame(seed) {
  const rng = makeRng(seed);
  const players = [0, 1].map(() => ({
    life: MAX_LIFE,
    ember: 0,
    maxEmber: 0,
    hand: [],
    board: [],
    deck: shuffle(buildDeck(), rng),
    discard: [],
  }));
  const state = {
    seed,
    rng,
    turn: 1,
    active: 0,
    phase: 'title', // title | play | over
    players,
    winner: null, // 0 = you, 1 = Ash, null = ongoing
    log: [],
    stats: {
      turns: 0,
      damageDealt: [0, 0],
      cardsPlayed: [0, 0],
      creaturesSummoned: [0, 0],
    },
  };
  return state;
}

function log(state, text) {
  state.log.unshift(text);
  if (state.log.length > 40) state.log.length = 40;
}

export function heroName(side) {
  return side === 0 ? 'You' : 'Ash';
}

function drawFromDeck(state, side) {
  const player = state.players[side];
  if (player.deck.length === 0) {
    // Out of cards: the hero takes 2 fatigue damage.
    player.life -= 2;
    state.stats.damageDealt[1 - side] += 2;
    log(state, `${heroName(side)} is out of cards and takes 2 fatigue.`);
    return null;
  }
  const id = player.deck.pop();
  if (player.hand.length >= MAX_HAND) {
    player.discard.push(id);
    log(state, `${heroName(side)}'s hand is full; a card burns away.`);
    return null;
  }
  player.hand.push({ uid: nextUid, defId: id });
  nextUid += 1;
  return id;
}

export function startDuel(state) {
  state.phase = 'play';
  state.turn = 1;
  state.active = 0;
  for (const side of [0, 1]) {
    for (let i = 0; i < START_HAND; i += 1) drawFromDeck(state, side);
  }
  beginTurn(state, 0);
  log(state, 'The duel begins. Your move.');
}

function beginTurn(state, side) {
  const player = state.players[side];
  player.maxEmber = Math.min(MAX_EMBER, player.maxEmber + 1);
  player.ember = player.maxEmber;
  for (const creature of player.board) {
    creature.canAttack = true;
    creature.justSummoned = false;
  }
  drawFromDeck(state, side);
  if (state.players[0].life <= 0 || state.players[1].life <= 0) checkWin(state);
}

export function endTurn(state) {
  if (state.phase !== 'play' || state.active !== 0) return { ok: false };
  state.active = 1;
  beginTurn(state, 1);
  return { ok: true };
}

/** Run the opponent's whole turn (AI decisions live in ai.js). */
export function runOpponentTurn(state, takeTurn) {
  if (state.phase !== 'play' || state.active !== 1) return;
  takeTurn(state);
  if (state.phase !== 'play') return;
  state.active = 0;
  state.turn += 1;
  state.stats.turns = state.turn;
  beginTurn(state, 0);
}

export function other(side) {
  return 1 - side;
}

function damageHero(state, side, amount, source) {
  const player = state.players[side];
  player.life = Math.max(0, player.life - amount);
  state.stats.damageDealt[1 - side] += amount;
  log(state, `${source} deals ${amount} to ${heroName(side)}.`);
  checkWin(state);
}

function damageCreature(state, side, index, amount, source) {
  const board = state.players[side].board;
  const creature = board[index];
  if (!creature) return false;
  creature.hp -= amount;
  log(state, `${source} hits ${CARD_BY_ID[creature.defId].name} for ${amount}.`);
  if (creature.hp <= 0) {
    board.splice(index, 1);
    state.players[side].discard.push(creature.defId);
    log(state, `${CARD_BY_ID[creature.defId].name} is destroyed.`);
  }
  return true;
}

export function checkWin(state) {
  if (state.phase === 'over') return;
  if (state.players[1].life <= 0 && state.players[0].life <= 0) {
    state.winner = state.players[0].life >= state.players[1].life ? 0 : 1;
  } else if (state.players[1].life <= 0) {
    state.winner = 0;
  } else if (state.players[0].life <= 0) {
    state.winner = 1;
  } else {
    return;
  }
  state.phase = 'over';
  log(state, state.winner === 0 ? 'You win the duel!' : 'Ash wins the duel.');
}

function summonCreature(state, side, defId) {
  const def = CARD_BY_ID[defId];
  const creature = {
    uid: nextUid,
    defId,
    atk: def.atk,
    hp: def.hp,
    maxHp: def.hp,
    canAttack: def.ability === 'swift',
    justSummoned: def.ability !== 'swift',
  };
  nextUid += 1;
  state.players[side].board.push(creature);
  return creature;
}

function applySpell(state, side, card, target) {
  const foe = other(side);
  switch (card.spell) {
    case 'damage3': {
      if (target.kind === 'hero') damageHero(state, foe, 3, card.name);
      else damageCreature(state, foe, target.index, 3, card.name);
      break;
    }
    case 'damage4': {
      damageCreature(state, foe, target.index, 4, card.name);
      break;
    }
    case 'damageAll2': {
      for (let i = state.players[foe].board.length - 1; i >= 0; i -= 1) {
        damageCreature(state, foe, i, 2, card.name);
      }
      break;
    }
    case 'damageHero3Draw': {
      damageHero(state, foe, 3, card.name);
      drawFromDeck(state, side);
      break;
    }
    case 'damageHero6': {
      damageHero(state, foe, 6, card.name);
      break;
    }
    case 'heal5': {
      const player = state.players[side];
      player.life = Math.min(MAX_LIFE, player.life + 5);
      log(state, `${heroName(side)} heals 5 life.`);
      break;
    }
    case 'draw2': {
      drawFromDeck(state, side);
      drawFromDeck(state, side);
      log(state, `${heroName(side)} draws 2 cards.`);
      break;
    }
    case 'buff3': {
      const creature = state.players[side].board[target.index];
      if (creature) {
        creature.hp += 3;
        creature.maxHp += 3;
        log(state, `${CARD_BY_ID[creature.defId].name} gains +0/+3.`);
      }
      break;
    }
    case 'summonSprouts': {
      for (let i = 0; i < 2 && state.players[side].board.length < MAX_BOARD; i += 1) {
        summonCreature(state, side, 'thorn-sprout');
      }
      log(state, `${heroName(side)} summons two Thorn Sprouts.`);
      break;
    }
    default:
      break;
  }
}

/** Where a spell needs a target, what it needs: 'hero' | 'creature' | 'friendly' | null. */
export function spellTargetKind(card) {
  switch (card.target) {
    case 'any': return 'any';
    case 'enemyCreature': return 'enemyCreature';
    case 'friendlyCreature': return 'friendlyCreature';
    default: return null;
  }
}

/** Is this hand card playable right now (ignoring target choice)? */
export function canPlayCard(state, side, handIndex) {
  const player = state.players[side];
  const inst = player.hand[handIndex];
  if (!inst) return false;
  const card = CARD_BY_ID[inst.defId];
  if (player.ember < card.cost) return false;
  if (card.kind === 'creature' && player.board.length >= MAX_BOARD) return false;
  if (card.kind === 'spell' && card.spell === 'summonSprouts' && player.board.length >= MAX_BOARD) return false;
  if (card.kind === 'spell' && card.spell === 'buff3' && player.board.length === 0) return false;
  if (card.kind === 'spell' && card.spell === 'damage4' && state.players[other(side)].board.length === 0) return false;
  return true;
}

/**
 * Play a hand card. target is { kind: 'hero'|'creature'|'friendly', index? }
 * for spells that need one; creatures ignore it. Returns { ok, events }.
 */
export function playCard(state, side, handIndex, target) {
  const player = state.players[side];
  const inst = player.hand[handIndex];
  if (!inst || state.phase !== 'play' || state.active !== side) return { ok: false };
  const card = CARD_BY_ID[inst.defId];
  if (!canPlayCard(state, side, handIndex)) return { ok: false };
  if (spellTargetKind(card) === 'any' && !target) return { ok: false, needsTarget: true };
  if (spellTargetKind(card) === 'enemyCreature' && (!target || target.kind !== 'creature')) return { ok: false, needsTarget: true };
  if (spellTargetKind(card) === 'friendlyCreature' && (!target || target.kind !== 'friendly')) return { ok: false, needsTarget: true };

  player.ember -= card.cost;
  player.hand.splice(handIndex, 1);
  state.stats.cardsPlayed[side] += 1;
  const events = [{ type: 'play', side, defId: card.id }];

  if (card.kind === 'creature') {
    summonCreature(state, side, card.id);
    state.stats.creaturesSummoned[side] += 1;
    log(state, `${heroName(side)} ${side === 0 ? 'play' : 'plays'} ${card.name} (${card.cost} ember).`);
  } else {
    player.discard.push(card.id);
    applySpell(state, side, card, target || {});
    log(state, `${heroName(side)} ${side === 0 ? 'cast' : 'casts'} ${card.name} (${card.cost} ember).`);
  }
  checkWin(state);
  return { ok: true, events };
}

/** Enemy creatures that must be attacked before anything else on that side. */
export function guardIndices(state, side) {
  const guards = [];
  state.players[side].board.forEach((creature, i) => {
    if (CARD_BY_ID[creature.defId].ability === 'guard') guards.push(i);
  });
  return guards;
}

export function canAttackWith(state, side, boardIndex) {
  const creature = state.players[side].board[boardIndex];
  if (!creature || state.phase !== 'play' || state.active !== side) return false;
  return creature.canAttack && creature.atk > 0;
}

/** Legal attack targets for a creature: { kind: 'hero' } or { kind: 'creature', index }. */
export function attackTargets(state, side) {
  const foe = other(side);
  const guards = guardIndices(state, foe);
  if (guards.length > 0) return guards.map((i) => ({ kind: 'creature', index: i }));
  const targets = state.players[foe].board.map((_, i) => ({ kind: 'creature', index: i }));
  targets.push({ kind: 'hero' });
  return targets;
}

export function attack(state, side, boardIndex, target) {
  const player = state.players[side];
  const foe = other(side);
  const creature = player.board[boardIndex];
  if (!creature || !canAttackWith(state, side, boardIndex)) return { ok: false };
  const legal = attackTargets(state, side);
  const okTarget = legal.some((t) => t.kind === target.kind && t.index === target.index);
  if (!okTarget) return { ok: false };

  creature.canAttack = false;
  const def = CARD_BY_ID[creature.defId];
  const events = [{ type: 'attack', side, boardIndex, target }];
  let damage = creature.atk;

  if (target.kind === 'hero') {
    damageHero(state, foe, damage, def.name);
    events.push({ type: 'heroHit', side: foe, amount: damage });
  } else {
    const foeCreature = state.players[foe].board[target.index];
    const foeDef = CARD_BY_ID[foeCreature.defId];
    if (elementAdvantage(def.element, foeDef.element)) {
      damage += 2;
      log(state, `Element advantage! ${def.name} strikes ${foeDef.name} for ${damage}.`);
    }
    damageCreature(state, foe, target.index, damage, def.name);
    // The defender strikes back for its own attack.
    if (foeCreature.hp > 0 || state.players[foe].board.includes(foeCreature)) {
      const back = state.players[foe].board.indexOf(foeCreature);
      if (back >= 0) damageCreature(state, side, boardIndex, foeCreature.atk, foeDef.name);
    }
  }
  if (def.ability === 'siphon' && state.phase === 'play') {
    player.life = Math.min(MAX_LIFE, player.life + 2);
    log(state, `${def.name} siphons 2 life to ${heroName(side)}.`);
  }
  checkWin(state);
  return { ok: true, events };
}

/** Duel score: damage dealt plus a win bonus, the number the table shows. */
export function duelScore(state, side) {
  const s = state.stats;
  return s.damageDealt[side] + s.cardsPlayed[side] * 2 + (state.winner === side ? 100 : 0);
}
