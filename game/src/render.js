// Ember Duel rendering: everything the player sees, drawn on one canvas.
// The table, the hands, the board, the cards, the HUD and the title / win /
// lose screens. Cards are legible at thumbnail size: big cost gems, big
// attack and health, elements told apart by colour AND by shape.

import { CARD_BY_ID, ELEMENTS, ABILITY_TEXT } from './cards.js';
import { duelScore } from './engine.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WIN = 'win';
export const SCREEN_LOSE = 'lose';

const HAND_W = 124;
const HAND_H = 164;
const BOARD_W = 128;
const BOARD_H = 160;

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function circle(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.closePath();
}

export function drawElementGlyph(ctx, glyph, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.08);
  const s = size;
  if (glyph === 'flame') {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.5);
    ctx.bezierCurveTo(x + s * 0.45, y - s * 0.1, x + s * 0.35, y + s * 0.35, x + s * 0.12, y + s * 0.42);
    ctx.bezierCurveTo(x + s * 0.2, y + s * 0.2, x - s * 0.05, y + s * 0.15, x, y + s * 0.05);
    ctx.bezierCurveTo(x - s * 0.15, y + s * 0.2, x - s * 0.3, y + s * 0.05, x - s * 0.35, y + s * 0.3);
    ctx.bezierCurveTo(x - s * 0.3, y + s * 0.48, x - s * 0.12, y + s * 0.5, x, y - s * 0.5);
    ctx.fill();
  } else if (glyph === 'wave') {
    for (let row = -1; row <= 1; row += 1) {
      ctx.beginPath();
      const yy = y + row * s * 0.28;
      ctx.moveTo(x - s * 0.5, yy);
      ctx.quadraticCurveTo(x - s * 0.25, yy - s * 0.22, x, yy);
      ctx.quadraticCurveTo(x + s * 0.25, yy + s * 0.22, x + s * 0.5, yy);
      ctx.stroke();
    }
  } else if (glyph === 'leaf') {
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.5);
    ctx.quadraticCurveTo(x + s * 0.5, y - s * 0.2, x + s * 0.25, y + s * 0.4);
    ctx.quadraticCurveTo(x - s * 0.1, y + s * 0.5, x - s * 0.35, y + s * 0.25);
    ctx.quadraticCurveTo(x - s * 0.45, y - s * 0.2, x, y - s * 0.5);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - s * 0.4);
    ctx.lineTo(x - s * 0.05, y + s * 0.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = Math.max(1.5, size * 0.05);
    ctx.stroke();
  } else {
    // stone: hexagon
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i - Math.PI / 2;
      const px = x + Math.cos(a) * s * 0.5;
      const py = y + Math.sin(a) * s * 0.5;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawSword(ctx, x, y, size, color) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = Math.max(2, size * 0.1);
  ctx.beginPath();
  ctx.moveTo(x, y - size * 0.5);
  ctx.lineTo(x + size * 0.16, y + size * 0.1);
  ctx.lineTo(x, y + size * 0.28);
  ctx.lineTo(x - size * 0.16, y + size * 0.1);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(x - size * 0.28, y + size * 0.18);
  ctx.lineTo(x + size * 0.28, y + size * 0.18);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x, y + size * 0.22);
  ctx.lineTo(x, y + size * 0.5);
  ctx.stroke();
  ctx.restore();
}

function drawHeart(ctx, x, y, size, color) {
  ctx.save();
  ctx.fillStyle = color;
  const s = size;
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.45);
  ctx.bezierCurveTo(x - s * 0.55, y, x - s * 0.4, y - s * 0.5, x, y - s * 0.15);
  ctx.bezierCurveTo(x + s * 0.4, y - s * 0.5, x + s * 0.55, y, x, y + s * 0.45);
  ctx.fill();
  ctx.restore();
}

/** Draw one card face. rect: {x,y,w,h}. opts: faceDown, dimmed, glow, selected, small. */
export function drawCard(ctx, card, rect, opts = {}) {
  const { x, y, w, h } = rect;
  const el = ELEMENTS[card.element];
  ctx.save();
  if (opts.faceDown) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = '#3a2b1d';
    ctx.fill();
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 3;
    ctx.stroke();
    rr(ctx, x + 8, y + 8, w - 16, h - 16, 7);
    ctx.strokeStyle = 'rgba(217,164,65,0.55)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    drawElementGlyph(ctx, 'flame', x + w / 2, y + h / 2, Math.min(w, h) * 0.42, '#d9a441');
    ctx.restore();
    return;
  }
  // Face.
  rr(ctx, x, y, w, h, 10);
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, '#fdf6e3');
  grad.addColorStop(1, '#efe3c2');
  ctx.fillStyle = grad;
  ctx.fill();
  ctx.lineWidth = opts.glow ? 4 : 2.5;
  ctx.strokeStyle = opts.glow ? '#ffd54a' : el.dark;
  ctx.stroke();
  if (opts.selected) {
    rr(ctx, x - 4, y - 4, w + 8, h + 8, 12);
    ctx.strokeStyle = '#ffd54a';
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  if (opts.dimmed) {
    rr(ctx, x, y, w, h, 10);
    ctx.fillStyle = 'rgba(20,16,10,0.45)';
    ctx.fill();
  }
  // Element band with the name, fitted to the band's width.
  rr(ctx, x + 4, y + 4, w - 8, 26, 6);
  ctx.fillStyle = el.color;
  ctx.fill();
  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  let nameSize = Math.max(12, w * 0.115);
  ctx.font = `bold ${nameSize}px sans-serif`;
  while (nameSize > 9 && ctx.measureText(card.name).width > w - 20) {
    nameSize -= 0.5;
    ctx.font = `bold ${nameSize}px sans-serif`;
  }
  const name = ctx.measureText(card.name).width > w - 20
    ? card.name.slice(0, Math.max(8, Math.floor((w - 20) / (nameSize * 0.55)))) + '…'
    : card.name;
  ctx.fillText(name, x + w / 2, y + 18, w - 14);
  // Art: big element glyph on a tinted panel.
  const artY = y + 34;
  const artH = h * 0.40;
  rr(ctx, x + 8, artY, w - 16, artH, 6);
  ctx.fillStyle = el.light;
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.15)';
  ctx.lineWidth = 1;
  ctx.stroke();
  drawElementGlyph(ctx, el.glyph, x + w / 2, artY + artH / 2, Math.min(w, artH) * 0.52, el.color);
  // Ability text: at most two lines, clear of the badge and the corners.
  ctx.fillStyle = '#3d2c17';
  ctx.font = `${Math.max(10.5, w * 0.085)}px sans-serif`;
  ctx.textAlign = 'center';
  const textY = artY + artH + 13;
  wrapText(ctx, card.text, x + w / 2, textY, w - 16, Math.max(11.5, w * 0.09));
  if (card.ability) {
    rr(ctx, x + w / 2 - 28, y + h - 26, 56, 16, 8);
    ctx.fillStyle = el.dark;
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.fillText(ABILITY_TEXT[card.ability].toUpperCase(), x + w / 2, y + h - 18);
  }
  // Cost gem straddling the top-left corner, so it never covers the name.
  circle(ctx, x + 15, y + 3, 14);
  ctx.fillStyle = '#1c4fd6';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 19px sans-serif';
  ctx.fillText(String(card.cost), x + 15, y + 4);
  // Element glyph straddling the top-right corner.
  drawElementGlyph(ctx, el.glyph, x + w - 15, y + 3, 20, '#ffffff');
  // Attack and health, bottom corners.
  if (card.kind === 'creature') {
    circle(ctx, x + 18, y + h - 16, 13);
    ctx.fillStyle = '#b3261e';
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();
    drawSword(ctx, x + 12, y + h - 21, 11, '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(String(card.atk), x + 23, y + h - 15);
    circle(ctx, x + w - 18, y + h - 16, 13);
    ctx.fillStyle = '#2e7d32';
    ctx.fill();
    ctx.stroke();
    drawHeart(ctx, x + w - 24, y + h - 20, 10, '#ffffff');
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(String(card.hp), x + w - 6, y + h - 15);
  } else {
    // Spell: show its kind at the bottom.
    rr(ctx, x + w / 2 - 28, y + h - 26, 56, 16, 8);
    ctx.fillStyle = '#5b3a8c';
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 10px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('SPELL', x + w / 2, y + h - 18);
  }
  ctx.restore();
}

function wrapText(ctx, text, cx, y, maxWidth, lineHeight) {
  // At most two lines of ability text.
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? line + ' ' + word : word;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  }
  if (line) lines.push(line);
  lines.slice(0, 2).forEach((l, i) => ctx.fillText(l, cx, y + i * lineHeight));
  return lines.length;
}

function drawLifeOrb(ctx, x, y, life, label, accent) {
  circle(ctx, x, y, 32);
  ctx.fillStyle = '#1d2733';
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = accent;
  ctx.stroke();
  drawHeart(ctx, x - 15, y - 1, 15, '#e53935');
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(life), x + 10, y + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(label, x, y + 48);
}

/** Ember flask: a compact circle showing current / max ember, beside the life orb. */
function drawEmberFlask(ctx, x, y, ember, maxEmber) {
  circle(ctx, x, y, 23);
  ctx.fillStyle = '#1d2733';
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#ff8c1a';
  ctx.stroke();
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(ember), x - 4, y - 2);
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`/${maxEmber}`, x + 8, y + 6);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('EMBER', x, y + 48);
}

/**
 * Render the whole game. `ui` collects the hit regions input.js needs.
 * `fx` is the live animation list; in shot mode it is empty.
 */
export function render(ctx, game, ui, screen, fx, now) {
  const { state } = game;
  ui.hand = [];
  ui.board = [[], []];
  ui.heroes = [null, null];
  ui.endTurn = null;

  drawTable(ctx, now);

  if (screen === SCREEN_TITLE) {
    renderTitle(ctx, game, now);
    return;
  }

  const me = state.players[0];
  const foe = state.players[1];

  // Opponent hand: face-down mini cards, fanned across the top.
  const foeHandCount = foe.hand.length;
  const foeCardW = 54;
  const foeGap = 46;
  const foeTotal = foeCardW + (foeHandCount - 1) * foeGap;
  for (let i = 0; i < foeHandCount; i += 1) {
    const cx = (VIEW_W - foeTotal) / 2 + i * foeGap;
    drawCard(ctx, { element: 'flame', name: '', text: '', kind: 'creature', cost: 0, atk: 0, hp: 0 }, { x: cx, y: 14, w: foeCardW, h: 76 }, { faceDown: true });
  }
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.font = 'bold 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`ASH'S HAND · ${foeHandCount} CARDS`, VIEW_W / 2, 106);

  // Opponent hero: portrait + life + ember flask, top-left.
  drawHeroPortrait(ctx, 66, 132, 'ASH', '#e8491d', 'EMBER WARDEN');
  drawLifeOrb(ctx, 168, 132, foe.life, 'ASH · LIFE', '#e8491d');
  drawEmberFlask(ctx, 248, 132, foe.ember, foe.maxEmber);
  ui.heroes[1] = { x: 130, y: 96, w: 84, h: 72 };
  // Opponent deck, top-right.
  drawDeckPile(ctx, 1150, 132, foe.deck.length, 'ASH DECK');

  // Opponent board.
  renderBoard(ctx, state, 1, 184, ui);

  // Centre strip: turn banner, score, log, end turn.
  renderCentre(ctx, game, ui, screen);

  // Player board.
  renderBoard(ctx, state, 0, 392, ui);

  // Player hero: portrait + life + ember flask, bottom-left.
  drawHeroPortrait(ctx, 66, 640, 'YOU', '#2b8fd9', 'CHALLENGER');
  drawLifeOrb(ctx, 168, 640, me.life, 'YOUR LIFE', '#2b8fd9');
  drawEmberFlask(ctx, 248, 640, me.ember, me.maxEmber);
  ui.heroes[0] = { x: 130, y: 604, w: 84, h: 72 };
  drawDeckPile(ctx, 1150, 640, me.deck.length, 'YOUR DECK');

  // Player hand, fanned along the bottom.
  renderHand(ctx, game, ui);

  // Floating damage numbers and card animations.
  renderFx(ctx, fx, now);

  if (screen === SCREEN_WIN || screen === SCREEN_LOSE) {
    renderEndScreen(ctx, game, screen);
  }
  if (game.helpOpen) renderHelp(ctx);
}

function drawTable(ctx, now) {
  const grad = ctx.createRadialGradient(640, 340, 80, 640, 360, 900);
  grad.addColorStop(0, '#2c5a4a');
  grad.addColorStop(0.6, '#1d3d33');
  grad.addColorStop(1, '#0e1f1a');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // Felt border.
  ctx.strokeStyle = 'rgba(217,164,65,0.5)';
  ctx.lineWidth = 3;
  rr(ctx, 10, 10, VIEW_W - 20, VIEW_H - 20, 18);
  ctx.stroke();
  // Centre emblem: faint flame watermark.
  ctx.save();
  ctx.globalAlpha = 0.07;
  drawElementGlyph(ctx, 'flame', 640, 360, 420, '#ffd54a');
  ctx.restore();
  // Turn glow at the top.
  const pulse = 0.5 + 0.5 * Math.sin(now / 500);
  ctx.save();
  ctx.globalAlpha = 0.10 + 0.05 * pulse;
  ctx.fillStyle = '#ffd54a';
  ctx.fillRect(0, 0, VIEW_W, 6);
  ctx.restore();
}

function drawHeroPortrait(ctx, x, y, name, color, title) {
  circle(ctx, x, y, 40);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = '#fdf6e3';
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 22px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(name.slice(0, 2), x, y + 1);
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 12px sans-serif';
  ctx.fillText(title, x, y + 56);
}

function drawDeckPile(ctx, x, y, count, label) {
  ctx.save();
  ctx.translate(x, y);
  for (let i = 0; i < 3; i += 1) {
    rr(ctx, -26 + i * 3, -36 + i * 3, 52, 72, 6);
    ctx.fillStyle = i === 2 ? '#3a2b1d' : '#2a1f14';
    ctx.fill();
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 20px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(count), 0, 2);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.font = 'bold 11px sans-serif';
  ctx.fillText(label, 0, 52);
  ctx.restore();
}

function renderBoard(ctx, state, side, topY, ui) {
  const board = state.players[side].board;
  const n = board.length;
  const gap = 14;
  const total = n * BOARD_W + (n - 1) * gap;
  let x = (VIEW_W - total) / 2;
  // Slot outlines so an empty board still reads as a board.
  for (let s = 0; s < 5; s += 1) {
    const sx = (VIEW_W - (5 * BOARD_W + 4 * gap)) / 2 + s * (BOARD_W + gap);
    rr(ctx, sx, topY, BOARD_W, BOARD_H, 10);
    ctx.fillStyle = 'rgba(255,255,255,0.05)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 5]);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  board.forEach((creature, i) => {
    const card = { ...CARD_BY_ID[creature.defId], atk: creature.atk, hp: creature.hp };
    const rect = { x, y: topY, w: BOARD_W, h: BOARD_H };
    const active = state.active === side && creature.canAttack && state.phase === 'play';
    drawCard(ctx, card, rect, { dimmed: creature.justSummoned && side === 0, glow: active && side === 0 });
    if (creature.justSummoned && !card.ability) {
      // No ability badge to clash with: a small RESTING pill at the bottom.
      rr(ctx, x + BOARD_W / 2 - 34, topY + BOARD_H - 26, 68, 16, 8);
      ctx.fillStyle = 'rgba(20,16,10,0.75)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = 'bold 11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('RESTING', x + BOARD_W / 2, topY + BOARD_H - 18);
    }
    ui.board[side][i] = rect;
    x += BOARD_W + gap;
  });
}

function renderCentre(ctx, game, ui, screen) {
  const { state } = game;
  // Turn banner.
  const yourTurn = state.active === 0 && state.phase === 'play';
  rr(ctx, 470, 344, 340, 32, 16);
  ctx.fillStyle = yourTurn ? '#ffd54a' : 'rgba(255,255,255,0.14)';
  ctx.fill();
  ctx.fillStyle = yourTurn ? '#3d2c17' : 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const banner = game.targeting
    ? 'CHOOSE A TARGET — CLICK AN ENEMY, OR ESC TO CANCEL'
    : state.phase === 'over'
      ? (state.winner === 0 ? 'DUEL WON' : 'DUEL LOST')
      : yourTurn ? `YOUR TURN · TURN ${state.turn}` : `ASH IS THINKING · TURN ${state.turn}`;
  ctx.fillText(banner, 640, 361);
  // Score.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SCORE  YOU ${duelScore(state, 0)}  ·  ASH ${duelScore(state, 1)}`, 250, 361);
  // End turn button.
  const enabled = yourTurn;
  rr(ctx, 1090, 340, 150, 40, 10);
  ctx.fillStyle = enabled ? '#e8491d' : 'rgba(255,255,255,0.12)';
  ctx.fill();
  ctx.strokeStyle = enabled ? '#ffd54a' : 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = enabled ? '#ffffff' : 'rgba(255,255,255,0.5)';
  ctx.font = 'bold 18px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('END TURN', 1165, 361);
  ui.endTurn = { x: 1090, y: 340, w: 150, h: 40, enabled };
  // Log, in the free left margin between the hero rows.
  ctx.textAlign = 'left';
  ctx.font = '12px sans-serif';
  state.log.slice(0, 4).forEach((line, i) => {
    ctx.fillStyle = `rgba(255,255,255,${0.95 - i * 0.2})`;
    ctx.fillText(line.slice(0, 34), 24, 392 + i * 16);
  });
  // Help / mute hints, top-right corner.
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('H help · M mute · R restart · 1-7 play a card', 1256, 24);
}

function renderHand(ctx, game, ui) {
  const { state } = game;
  const hand = state.players[0].hand;
  const n = hand.length;
  if (n === 0) {
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('Your hand is empty — end the turn to draw.', 640, 620);
    return;
  }
  const gap = Math.min(18, Math.max(4, (980 - n * HAND_W) / Math.max(1, n - 1)));
  const total = n * HAND_W + (n - 1) * gap;
  let x = (VIEW_W - total) / 2;
  hand.forEach((inst, i) => {
    const card = CARD_BY_ID[inst.defId];
    const hovered = game.hoverHand === i;
    const selected = game.selectedHand === i;
    const y = 556 + (hovered ? -14 : 0) + (selected ? -22 : 0);
    const rect = { x, y, w: HAND_W, h: HAND_H };
    const affordable = state.players[0].ember >= card.cost && state.active === 0;
    drawCard(ctx, card, rect, { selected, dimmed: !affordable });
    ui.hand[i] = rect;
    x += HAND_W + gap;
  });
}

function renderFx(ctx, fx, now) {
  for (const item of fx) {
    const age = now - item.born;
    if (item.type === 'float') {
      const t = age / 900;
      if (t > 1) continue;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      ctx.fillStyle = item.color || '#ffd54a';
      ctx.font = 'bold 26px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(item.text, item.x, item.y - t * 46);
      ctx.restore();
    } else if (item.type === 'ember') {
      const t = age / 1400;
      if (t > 1) continue;
      ctx.save();
      ctx.globalAlpha = 1 - t;
      drawElementGlyph(ctx, 'flame', item.x, item.y - t * 90, 16 + t * 10, item.color || '#ff8c1a');
      ctx.restore();
    }
  }
}

function renderTitle(ctx, game, now) {
  // Decorative fan of cards behind the title.
  const fan = ['emberlord', 'magma-behemoth', 'storm-herald', 'tidal-leviathan', 'worldroot'];
  fan.forEach((id, i) => {
    const cx = 640 + (i - 2) * 150;
    const angle = (i - 2) * 0.10;
    ctx.save();
    ctx.translate(cx, 300);
    ctx.rotate(angle);
    ctx.globalAlpha = 0.95;
    drawCard(ctx, CARD_BY_ID[id], { x: -66, y: -92, w: 132, h: 184 });
    ctx.restore();
  });
  ctx.save();
  ctx.fillStyle = 'rgba(10,18,14,0.55)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
  // Title.
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const grad = ctx.createLinearGradient(0, 130, 0, 240);
  grad.addColorStop(0, '#ffd54a');
  grad.addColorStop(0.5, '#ff8c1a');
  grad.addColorStop(1, '#e8491d');
  ctx.fillStyle = grad;
  ctx.font = 'bold 96px sans-serif';
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 18;
  ctx.fillText('EMBER DUEL', 640, 180);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#fdf6e3';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('A duel of ember, element and nerve', 640, 248);
  ctx.font = '17px sans-serif';
  ctx.fillStyle = 'rgba(253,246,227,0.92)';
  ctx.fillText('Outwit Ash, the Ember Warden · 25 life each · first to zero loses', 640, 292);
  ctx.fillText('Flame beats Leaf · Leaf beats Stone · Stone beats Tide · Tide beats Flame', 640, 320);
  // Begin button.
  const pulse = 0.6 + 0.4 * Math.sin(now / 350);
  rr(ctx, 490, 380, 300, 64, 12);
  ctx.fillStyle = `rgba(232,73,29,${0.85 + 0.15 * pulse})`;
  ctx.fill();
  ctx.strokeStyle = '#ffd54a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px sans-serif';
  ctx.fillText('CLICK TO BEGIN', 640, 413);
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.font = '15px sans-serif';
  ctx.fillText('Play a card, attack with your creatures, end your turn. 1-7 play cards, Space ends the turn.', 640, 480);
  ctx.fillText('Four elements. One throne. Learn the cycle, and the table is yours.', 640, 508);
}

function renderEndScreen(ctx, game, screen) {
  const { state } = game;
  ctx.save();
  ctx.fillStyle = screen === SCREEN_WIN ? 'rgba(20,16,4,0.72)' : 'rgba(24,4,4,0.78)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.restore();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  if (screen === SCREEN_WIN) {
    const grad = ctx.createLinearGradient(0, 200, 0, 320);
    grad.addColorStop(0, '#fff3b0');
    grad.addColorStop(1, '#ffb300');
    ctx.fillStyle = grad;
    ctx.font = 'bold 110px sans-serif';
    ctx.shadowColor = 'rgba(255,180,0,0.7)';
    ctx.shadowBlur = 30;
    ctx.fillText('VICTORY', 640, 260);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fdf6e3';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('The Ember Throne is yours', 640, 350);
  } else {
    ctx.fillStyle = '#e53935';
    ctx.font = 'bold 110px sans-serif';
    ctx.shadowColor = 'rgba(229,57,53,0.7)';
    ctx.shadowBlur = 30;
    ctx.fillText('DEFEAT', 640, 260);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fdf6e3';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText('The embers fade… Ash keeps the throne', 640, 350);
  }
  ctx.font = '20px sans-serif';
  ctx.fillStyle = 'rgba(253,246,227,0.95)';
  const s = state.stats;
  ctx.fillText(`Turns ${state.turn}  ·  Damage dealt ${s.damageDealt[0]}  ·  Cards played ${s.cardsPlayed[0]}  ·  Score ${duelScore(state, 0)}`, 640, 410);
  ctx.fillStyle = '#ffd54a';
  ctx.font = 'bold 22px sans-serif';
  ctx.fillText('Press R to duel again', 640, 470);
}

function renderHelp(ctx) {
  ctx.save();
  ctx.fillStyle = 'rgba(8,12,10,0.88)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  rr(ctx, 340, 90, 600, 540, 16);
  ctx.fillStyle = '#fdf6e3';
  ctx.fill();
  ctx.fillStyle = '#3d2c17';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.font = 'bold 28px sans-serif';
  ctx.fillText('How to duel', 372, 112);
  ctx.font = '16px sans-serif';
  const lines = [
    'Each turn you gain ember (1 more than last turn, up to 10)',
    'and draw a card. Spend ember to play cards from your hand.',
    '',
    'Creatures fight on the board. A creature cannot attack',
    'the turn it is played, unless it has Swift.',
    '',
    'Guard creatures must be attacked before anything else',
    'on their side. Siphon heals your hero when it attacks.',
    'Rally gives your other creatures +1 attack when it',
    'is summoned. Kindle gains 1 ember when it is played.',
    '',
    'Element advantage deals +2 damage:',
    'Flame beats Leaf · Leaf beats Stone',
    'Stone beats Tide · Tide beats Flame',
    '',
    'Spells need a target when they say so: click the card,',
    'then click its target. Esc cancels.',
    '',
    'Reduce Ash to 0 life to win. Run out of cards and',
    'your hero takes 2 fatigue damage each turn.',
    'Keys: 1-7 play a card · Space end turn · M mute · R restart',
  ];
  lines.forEach((line, i) => ctx.fillText(line, 372, 154 + i * 20));
  ctx.font = 'bold 16px sans-serif';
  ctx.fillText('Press H or click anywhere to close', 372, 600);
  ctx.restore();
}
