// ── Per-civilization flavour data ─────────────────────────────────────────────
// ITEM A: civId -> { enemyTypeId: localizedName }
// Covers the most thematic renames for all 8 civs.  Falls back to the base
// enemy name when an entry is absent.  At minimum soldier/archer/weaver/
// circler/charger/lunger/brute/titan are mapped; supplementary types covered
// where a good historical equivalent exists.
export const CIV_ENEMY_NAMES = {
  china: {
    soldier:  'Levy Spearman',
    archer:   'Crossbowman',
    weaver:   'Dao Skirmisher',
    circler:  'Shadow Blade',
    charger:  'Iron Cavalry',
    lunger:   'Halberdier',
    brute:    'Tiger Warrior',
    titan:    'Armoured Giant',
    shaman:   'Court Sorcerer',
    gunner:   'Fire-Lance Soldier',
    spreader: 'Bomb Thrower',
    reaver:   'Black-Clad Raider',
    sentinel: 'Iron Turtle',
    catapult: 'Trebuchet Crew',
    bomber:   'Fire-Ox Rusher',
  },
  japan: {
    soldier:  'Ashigaru',
    archer:   'Yumi Ashigaru',
    weaver:   'Kunoichi',
    circler:  'Shinobi',
    charger:  'Mounted Samurai',
    lunger:   'Naginata Monk',
    brute:    'Oni Berserker',
    titan:    'Giant Wrestler',
    shaman:   'Onmyoji',
    gunner:   'Tanegashima Gunner',
    spreader: 'Flame Scroll Caster',
    reaver:   'Ronin',
    sentinel: 'Armoured Samurai',
    catapult: 'Siege Crew',
    bomber:   'Kamikaze Rusher',
    harpy:    'Tengu Swooper',
  },
  byzantium: {
    soldier:  'Tagmata Soldier',
    archer:   'Skutatos Archer',
    weaver:   'Varangian Scout',
    circler:  'Stratiotai Flanker',
    charger:  'Cataphract',
    lunger:   'Akritoi Lancer',
    brute:    'Varangian Guard',
    titan:    'Armoured Colossus',
    shaman:   'Alchemist Sorcerer',
    gunner:   'Greek Fire Siphonator',
    spreader: 'Liquid Fire Hurler',
    reaver:   'Peltast',
    sentinel: 'Scutum Wall',
    catapult: 'Cheirosiphon Crew',
  },
  sumer: {
    soldier:  'Sumerian Spearman',
    archer:   'Bowman of Ur',
    weaver:   'Dust Dancer',
    circler:  'Temple Guard',
    charger:  'War Chariot',
    lunger:   'Reed Stalker',
    brute:    'Ziggurath Brute',
    titan:    'Gilded Colossus',
    shaman:   'Ziggurat Priest',
    spreader: 'Incense Caster',
    reaver:   'Lapis Raider',
    sentinel: 'Bronze Sentinel',
    lobber:   'Sling Crew',
  },
  rome: {
    soldier:  'Legionary',
    archer:   'Sagittarius',
    weaver:   'Velite',
    circler:  'Exploratores',
    charger:  'Equites',
    lunger:   'Hastati',
    brute:    'Praetorian',
    titan:    'Battle Titan',
    shaman:   'Haruspex',
    gunner:   'Scorpio Crew',
    spreader: 'Pilum Volley',
    reaver:   'Triarius',
    sentinel: 'Tortoise Guard',
    catapult: 'Onager Crew',
    bomber:   'Fire-Pot Rusher',
  },
  macedon: {
    soldier:  'Phalangite',
    archer:   'Cretan Archer',
    weaver:   'Thracian Peltast',
    circler:  'Companion Scout',
    charger:  'Companion Cavalry',
    lunger:   'Hypaspist',
    brute:    'Shield-Breaker',
    titan:    'War Elephant Rider',
    shaman:   'Diviner',
    gunner:   'Gastraphetes Crew',
    spreader: 'Javelin Thrower',
    reaver:   'Agrianian',
    sentinel: 'Aspis Guard',
    catapult: 'Torsion Catapult',
  },
  mongolia: {
    soldier:  'Steppe Warrior',
    archer:   'Mongol Horse Archer',
    weaver:   'Recurve Raider',
    circler:  'Flanking Rider',
    charger:  'Heavy Lancer',
    lunger:   'Lasso Hunter',
    brute:    'Khan\'s Bodyguard',
    titan:    'Armoured Horseman',
    shaman:   'Tengri Shaman',
    gunner:   'Naphtha Rider',
    spreader: 'Whistling Arrow',
    reaver:   'Nökör Raider',
    sentinel: 'Lamellar Guard',
    catapult: 'Siege Engineer',
    jackal:   'Swift Scout',
  },
  norse: {
    soldier:  'Huscarl',
    archer:   'Skald Archer',
    weaver:   'Berserker Dancer',
    circler:  'Ulfheðinn',
    charger:  'Einherjar Charger',
    lunger:   'Spear-Dane',
    brute:    'Jötnar Brute',
    titan:    'Frost Giant',
    shaman:   'Völva Witch',
    gunner:   'Ballista Crew',
    spreader: 'Throwing Axe',
    reaver:   'Sea Reaver',
    sentinel: 'Shield-Wall Guard',
    catapult: 'Siege Tower Crew',
    harpy:    'Valkyrja Swooper',
    bomber:   'Berserk Rusher',
  },
};

// ── ITEM B: per-civ first-name pools for elite naming ─────────────────────
// Era-appropriate given names (8-12 per civ).  The elite modifier's name
// becomes a title, e.g. "Captain Liu Feng — Volatile".
export const CIV_ELITE_NAMES = {
  china:     ['Wei Fang', 'Liu Feng', 'Cao Rui', 'Sun Jian', 'Zhang Lei', 'Dian Wei', 'Xu Zhu', 'Gan Ning', 'Ma Chao', 'Huang Gai'],
  japan:     ['Katsu', 'Ryu', 'Kenji', 'Takeda', 'Oda', 'Sanada', 'Goemon', 'Uesugi', 'Mori', 'Honda'],
  byzantium: ['Nikephoros', 'Alexios', 'Basileios', 'Konstantinos', 'Theodoros', 'Ioannes', 'Staurakios', 'Romanos', 'Andronikos'],
  sumer:     ['Ur-Namma', 'Lugal-Ane', 'Dumuzi', 'Ninsun', 'Enmebaragesi', 'Akurgal', 'Mesanepada', 'Ku-Baba'],
  rome:      ['Gaius', 'Lucius', 'Marcus', 'Quintus', 'Titus', 'Publius', 'Servius', 'Aulus', 'Gnaeus', 'Decimus'],
  macedon:   ['Philippos', 'Krateros', 'Ptolemaios', 'Seleukos', 'Perdikkas', 'Antigonos', 'Kassandros', 'Nearchos'],
  mongolia:  ['Temür', 'Chagatai', 'Jochi', 'Berke', 'Batu', 'Kublai', 'Möngke', 'Arghun', 'Ögedei', 'Güyük'],
  norse:     ['Sigurd', 'Bjorn', 'Ragnar', 'Leif', 'Gunnar', 'Harald', 'Ivar', 'Ulf', 'Sven', 'Orm'],
};

// Title prefix (rank prefix shown before the generated name).
export const CIV_ELITE_RANK = {
  china:     'General',
  japan:     'Daimyo',
  byzantium: 'Strategos',
  sumer:     'Lugal',
  rome:      'Centurion',
  macedon:   'Taxiarch',
  mongolia:  'Noyan',
  norse:     'Jarl',
};

/**
 * Return the localized name for an enemy type within a given civ, falling back
 * to the base ENEMIES[typeId].name when no override exists.
 */
export function localEnemyName(civId, typeId, baseName) {
  const overrides = CIV_ENEMY_NAMES[civId];
  if (overrides && overrides[typeId]) return overrides[typeId];
  return baseName;
}

/**
 * Generate a flavoured elite title string.
 * e.g. "⚔ Jarl Sigurd — Volatile" or "⚔ General Wei Fang — Berserker"
 */
export function generateEliteTitle(civId, modifierName) {
  const pool = CIV_ELITE_NAMES[civId] || CIV_ELITE_NAMES.rome;
  const rank = CIV_ELITE_RANK[civId] || 'Captain';
  const firstName = pool[Math.floor(Math.random() * pool.length)];
  return `⚔ ${rank} ${firstName} — ${modifierName}`;
}

// ── ITEM D: per-civ ambient particle config ────────────────────────────────
// tint (0xRRGGBB), maxAlive, speed (drift), gravity adjustments, depth.
export const CIV_AMBIENCE = {
  china:     { tint: 0xff8c44, label: 'ember-leaves' },
  japan:     { tint: 0xffaec9, label: 'petals' },
  byzantium: { tint: 0xffd700, label: 'golden-dust' },
  sumer:     { tint: 0xd4b483, label: 'sandy-motes' },
  rome:      { tint: 0xe8e0d0, label: 'pale-ash' },
  macedon:   { tint: 0x8fbc6a, label: 'olive-flecks' },
  mongolia:  { tint: 0xd4b483, label: 'sandy-motes' },
  norse:     { tint: 0xeaedf2, label: 'snow' },
  // final stage: red embers
  final:     { tint: 0xff3a0a, label: 'red-embers' },
};
