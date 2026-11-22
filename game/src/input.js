// Mouse and keyboard input for Ember Duel. Clicks are hit-tested against the
// regions render.js records in `ui` each frame: hand cards, board creatures,
// heroes, the end-turn button. Keyboard: 1-7 play a hand card, Space ends the
// turn, Esc cancels a target, H help, M mute, R restart.

import { CARD_BY_ID } from './cards.js';
import {
  attack, canAttackWith, canPlayCard, endTurn, playCard, spellTargetKind,
} from './engine.js';
import { opponentTurn } from './ai.js';
import { runOpponentTurn } from './engine.js';
import { sfx } from './sound.js';

function inRect(px, py, rect) {
  return rect && px >= rect.x && px <= rect.x + rect.w && py >= rect.y && py <= rect.y + rect.h;
}

export function attachInput(game, canvas) {
  canvas.addEventListener('mousemove', (event) => {
    const pos = canvasPos(canvas, event);
    game.hoverHand = -1;
    game.ui.hand.forEach((rect, i) => {
      if (inRect(pos.x, pos.y, rect)) game.hoverHand = i;
    });
  });

  canvas.addEventListener('click', (event) => {
    const pos = canvasPos(canvas, event);
    handleClick(game, pos);
  });

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    handleKey(game, event);
  });
}

function canvasPos(canvas, event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * (canvas.width / rect.width),
    y: (event.clientY - rect.top) * (canvas.height / rect.height),
  };
}

function maybeEndTurn(game) {
  const result = endTurn(game.state);
  if (!result.ok) return;
  sfx.turn();
  game.selectedHand = -1;
  game.targeting = null;
  game.attackFrom = -1;
  // The opponent plays, then the turn comes back to the player.
  setTimeout(() => {
    runOpponentTurn(game.state, opponentTurn);
    if (game.state.phase === 'over') onGameOver(game);
    game.render();
  }, 450);
}

function onGameOver(game) {
  if (game.state.winner === 0) {
    sfx.win();
    game.fx.push({ type: 'ember', x: 640, y: 300, born: performance.now(), color: '#ffd54a' });
  } else {
    sfx.lose();
  }
}

function handleClick(game, pos) {
  const { state, ui } = game;
  if (game.helpOpen) {
    game.helpOpen = false;
    game.render();
    return;
  }
  if (state.phase === 'title') {
    if (pos.x >= 490 && pos.x <= 790 && pos.y >= 380 && pos.y <= 444) {
      game.startDuel();
    }
    return;
  }
  if (state.phase === 'over') return;
  if (state.active !== 0) return;

  // End turn.
  if (inRect(pos.x, pos.y, ui.endTurn) && ui.endTurn.enabled) {
    maybeEndTurn(game);
    game.render();
    return;
  }

  // Targeting a spell or an attack: heroes and creatures first.
  if (game.targeting) {
    const target = pickTarget(game, pos);
    if (target) {
      const card = CARD_BY_ID[game.state.players[0].hand[game.selectedHand].defId];
      const result = playCard(state, 0, game.selectedHand, target);
      if (result.ok) {
        sfx.play();
        game.fx.push({ type: 'float', x: 640, y: 330, born: performance.now(), text: card.name, color: '#ffd54a' });
        if (state.phase === 'over') onGameOver(game);
      } else {
        sfx.error();
      }
      game.selectedHand = -1;
      game.targeting = null;
      game.render();
      return;
    }
    game.targeting = null;
    game.selectedHand = -1;
    game.render();
    return;
  }
  if (game.attackFrom >= 0) {
    const target = pickTarget(game, pos);
    if (target) {
      const attackerAtk = game.state.players[0].board[game.attackFrom]?.atk || 0;
      const result = attack(state, 0, game.attackFrom, target);
      if (result.ok) {
        sfx.attack();
        const t = target.kind === 'hero'
          ? { x: 170, y: 128 }
          : ui.board[1][target.index];
        game.fx.push({ type: 'float', x: t ? t.x + 40 : 640, y: t ? t.y + 40 : 300, born: performance.now(), text: `-${attackerAtk}`, color: '#ff6b5e' });
        if (state.phase === 'over') onGameOver(game);
      } else {
        sfx.error();
      }
    }
    game.attackFrom = -1;
    game.render();
    return;
  }

  // Pick a creature to attack with.
  for (let i = 0; i < ui.board[0].length; i += 1) {
    if (inRect(pos.x, pos.y, ui.board[0][i]) && canAttackWith(state, 0, i)) {
      game.attackFrom = i;
      game.render();
      return;
    }
  }
  // Pick a hand card.
  for (let i = 0; i < ui.hand.length; i += 1) {
    if (inRect(pos.x, pos.y, ui.hand[i])) {
      const card = CARD_BY_ID[state.players[0].hand[i].defId];
      if (!canPlayCard(state, 0, i)) {
        sfx.error();
        return;
      }
      game.selectedHand = i;
      if (spellTargetKind(card)) {
        game.targeting = spellTargetKind(card);
      } else {
        const result = playCard(state, 0, i, null);
        if (result.ok) {
          sfx.play();
          if (state.phase === 'over') onGameOver(game);
        }
        game.selectedHand = -1;
      }
      game.render();
      return;
    }
  }
}

/** What the click hit, for a spell or attack target: hero or a creature. */
function pickTarget(game, pos) {
  const { state, ui } = game;
  if (inRect(pos.x, pos.y, ui.heroes[1])) return { kind: 'hero' };
  for (let i = 0; i < ui.board[1].length; i += 1) {
    if (inRect(pos.x, pos.y, ui.board[1][i])) return { kind: 'creature', index: i };
  }
  if (game.targeting === 'friendlyCreature') {
    for (let i = 0; i < ui.board[0].length; i += 1) {
      if (inRect(pos.x, pos.y, ui.board[0][i])) return { kind: 'friendly', index: i };
    }
  }
  if (inRect(pos.x, pos.y, ui.heroes[0]) && game.targeting === 'any') return { kind: 'hero' };
  return null;
}

function handleKey(game, event) {
  const { state } = game;
  const key = event.key.toLowerCase();
  if (key === 'm') {
    game.muted = !game.muted;
    return;
  }
  if (key === 'h') {
    game.helpOpen = !game.helpOpen;
    game.render();
    return;
  }
  if (key === 'r') {
    game.restart();
    return;
  }
  if (key === 'escape') {
    game.targeting = null;
    game.selectedHand = -1;
    game.attackFrom = -1;
    game.render();
    return;
  }
  if (state.phase !== 'play' || state.active !== 0) return;
  if (key === ' ' || key === 'enter') {
    event.preventDefault();
    maybeEndTurn(game);
    game.render();
    return;
  }
  const num = Number.parseInt(key, 10);
  if (num >= 1 && num <= 7) {
    const i = num - 1;
    if (i < state.players[0].hand.length && canPlayCard(state, 0, i)) {
      const card = CARD_BY_ID[state.players[0].hand[i].defId];
      game.selectedHand = i;
      if (spellTargetKind(card)) {
        game.targeting = spellTargetKind(card);
      } else {
        const result = playCard(state, 0, i, null);
        if (result.ok) sfx.play();
        game.selectedHand = -1;
        if (state.phase === 'over') onGameOver(game);
      }
      game.render();
    }
  }
}

