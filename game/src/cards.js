// The card catalogue for Ember Duel: every creature and spell in the game.
// Four elements form a cycle: Flame beats Leaf, Leaf beats Stone, Stone beats
// Tide, Tide beats Flame. Attacking a creature of the element yours beats
// deals +2 damage. Elements are told apart by colour AND by shape, never by
// text alone.

export const ELEMENTS = {
  flame: { name: 'Flame', color: '#e8491d', dark: '#8f2408', light: '#ffb199', glyph: 'flame' },
  tide: { name: 'Tide', color: '#2b8fd9', dark: '#0d4d80', light: '#a8d8ff', glyph: 'wave' },
  leaf: { name: 'Leaf', color: '#43a047', dark: '#1d5c22', light: '#b5e6b8', glyph: 'leaf' },
  stone: { name: 'Stone', color: '#c08a2d', dark: '#6d4c12', light: '#f2d492', glyph: 'stone' },
};

/** element -> the element it beats. */
export const BEATS = { flame: 'leaf', leaf: 'stone', stone: 'tide', tide: 'flame' };

export function elementAdvantage(attacker, defender) {
  return BEATS[attacker] === defender;
}

// kind: 'creature' | 'spell'
// target: 'any' | 'enemyCreature' | 'enemyHero' | 'friendlyCreature' | 'none' | 'allEnemy'
// ability: 'guard' | 'swift' | 'siphon' | null (creatures)
// spell: the spell effect key (spells)
export const CARDS = [
  { id: 'cinder-pup', name: 'Cinder Pup', kind: 'creature', element: 'flame', cost: 1, atk: 2, hp: 1, ability: null, text: 'A pup that chases every spark.' },
  { id: 'spark-imp', name: 'Spark Imp', kind: 'creature', element: 'flame', cost: 1, atk: 1, hp: 2, ability: 'swift', text: 'Swift: can attack the turn it is played.' },
  { id: 'tide-minnow', name: 'Tide Minnow', kind: 'creature', element: 'tide', cost: 1, atk: 1, hp: 1, ability: null, text: 'Small, quick, everywhere at once.' },
  { id: 'pebble-sprite', name: 'Pebble Sprite', kind: 'creature', element: 'stone', cost: 1, atk: 1, hp: 3, ability: 'guard', text: 'Guard: enemies must attack it first.' },
  { id: 'thorn-sprout', name: 'Thorn Sprout', kind: 'creature', element: 'leaf', cost: 2, atk: 2, hp: 2, ability: null, text: 'It grows where the fight is thickest.' },
  { id: 'ember-wolf', name: 'Ember Wolf', kind: 'creature', element: 'flame', cost: 2, atk: 3, hp: 2, ability: null, text: 'Its howl leaves the grass smoking.' },
  { id: 'coral-guard', name: 'Coral Guard', kind: 'creature', element: 'tide', cost: 2, atk: 1, hp: 4, ability: 'guard', text: 'Guard: enemies must attack it first.' },
  { id: 'moss-golem', name: 'Moss Golem', kind: 'creature', element: 'leaf', cost: 3, atk: 2, hp: 5, ability: 'guard', text: 'Guard: enemies must attack it first.' },
  { id: 'flame-drake', name: 'Flame Drake', kind: 'creature', element: 'flame', cost: 3, atk: 4, hp: 3, ability: null, text: 'A drake too young to fear anything.' },
  { id: 'wave-serpent', name: 'Wave Serpent', kind: 'creature', element: 'tide', cost: 3, atk: 3, hp: 4, ability: null, text: 'It swims through the air like water.' },
  { id: 'stone-titan', name: 'Stone Titan', kind: 'creature', element: 'stone', cost: 4, atk: 3, hp: 6, ability: 'guard', text: 'Guard: enemies must attack it first.' },
  { id: 'wildfire-phoenix', name: 'Wildfire Phoenix', kind: 'creature', element: 'flame', cost: 4, atk: 5, hp: 4, ability: 'siphon', text: 'Siphon: heals its hero 2 when it attacks.' },
  { id: 'deep-kraken', name: 'Deep Kraken', kind: 'creature', element: 'tide', cost: 5, atk: 6, hp: 5, ability: null, text: 'The tide itself, wearing a crown.' },
  { id: 'ancient-treant', name: 'Ancient Treant', kind: 'creature', element: 'leaf', cost: 5, atk: 4, hp: 7, ability: 'guard', text: 'Guard: enemies must attack it first.' },
  { id: 'obsidian-colossus', name: 'Obsidian Colossus', kind: 'creature', element: 'stone', cost: 6, atk: 7, hp: 7, ability: null, text: 'It was a mountain before it woke.' },
  { id: 'storm-roc', name: 'Storm Roc', kind: 'creature', element: 'tide', cost: 6, atk: 8, hp: 5, ability: 'swift', text: 'Swift: can attack the turn it is played.' },
  { id: 'emberlord', name: 'Emberlord', kind: 'creature', element: 'flame', cost: 7, atk: 8, hp: 8, ability: null, text: 'The duel ends where he stands.' },
  { id: 'worldroot', name: 'Worldroot', kind: 'creature', element: 'leaf', cost: 7, atk: 5, hp: 9, ability: 'guard', text: 'Guard: enemies must attack it first.' },
  { id: 'ember-burst', name: 'Ember Burst', kind: 'spell', element: 'flame', cost: 2, target: 'any', spell: 'damage3', text: 'Deal 3 damage to any target.' },
  { id: 'healing-rain', name: 'Healing Rain', kind: 'spell', element: 'tide', cost: 2, target: 'none', spell: 'heal5', text: 'Restore 5 life to your hero.' },
  { id: 'surge', name: 'Surge', kind: 'spell', element: 'tide', cost: 1, target: 'none', spell: 'draw2', text: 'Draw 2 cards.' },
  { id: 'wildfire', name: 'Wildfire', kind: 'spell', element: 'flame', cost: 3, target: 'none', spell: 'damageAll2', text: 'Deal 2 damage to all enemy creatures.' },
  { id: 'stone-skin', name: 'Stone Skin', kind: 'spell', element: 'stone', cost: 1, target: 'friendlyCreature', spell: 'buff3', text: 'Give a friendly creature +0/+3.' },
  { id: 'thorn-volley', name: 'Thorn Volley', kind: 'spell', element: 'leaf', cost: 2, target: 'enemyCreature', spell: 'damage4', text: 'Deal 4 damage to a creature.' },
  { id: 'tidal-surge', name: 'Tidal Surge', kind: 'spell', element: 'tide', cost: 3, target: 'none', spell: 'damageHero3Draw', text: 'Deal 3 to the enemy hero. Draw a card.' },
  { id: 'rebirth', name: 'Rebirth', kind: 'spell', element: 'leaf', cost: 4, target: 'none', spell: 'summonSprouts', text: 'Summon two 2/2 Thorn Sprouts.' },
  { id: 'meteor', name: 'Meteor', kind: 'spell', element: 'flame', cost: 5, target: 'none', spell: 'damageHero6', text: 'Deal 6 damage to the enemy hero.' },
];

export const CARD_BY_ID = Object.fromEntries(CARDS.map((c) => [c.id, c]));

/** The 45-card deck both duelists draw from: two of each creature, one of each spell. */
export function buildDeck() {
  const deck = [];
  for (const card of CARDS) {
    deck.push(card.id);
    if (card.kind === 'creature') deck.push(card.id);
  }
  return deck; // 18 creatures x2 = 36, + 9 spells = 45
}

export const DECK_SIZE = buildDeck().length;

export const ABILITY_TEXT = {
  guard: 'Guard',
  swift: 'Swift',
  siphon: 'Siphon',
};
