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
// Era-appropriate given names (28+ per civ). ALL names intentionally exclude
// every boss / lieutenant name used by that civ (see bosses.js).
// china     excludes: Cao Cao, Xiahou Dun, Zhang Liao
// japan     excludes: Toyotomi Hideyoshi, Takeda Shingen, Date Masamune
// byzantium excludes: Emperor Justinian, Narses, Heraclius
// sumer     excludes: Enkidu, Sargon of Akkad, Hammurabi
// rome      excludes: Pompey the Great, Sulla, Crassus
// macedon   excludes: Philip II, Parmenion, Craterus / Krateros
// mongolia  excludes: Subutai, Jebe, Muqali
// norse     excludes: Harald Hardrada, Bjorn Ironside, Lagertha
export const CIV_ELITE_NAMES = {
  china: [
    'Wei Fang', 'Liu Feng', 'Sun Jian', 'Dian Wei', 'Xu Zhu', 'Gan Ning',
    'Ma Chao', 'Huang Gai', 'Lu Su', 'Ding Feng', 'Zhuge Jin', 'Cheng Pu',
    'Han Dang', 'Zhou Tai', 'Chen Wu', 'Pan Zhang', 'Xu Sheng', 'Ling Tong',
    'Lu Meng', 'Bu Zhi', 'Zhu Ran', 'Quan Cong', 'He Qi', 'Ding Feng',
    'Sun Hao', 'Lü Fan', 'Zhu Zhi', 'Zhuge Ke', 'Chen Tai', 'Wang Ji',
  ],
  japan: [
    'Katsuie', 'Yoshimoto', 'Ujiyasu', 'Terumoto', 'Motochika', 'Kenshin',
    'Yoshishige', 'Harumoto', 'Harunobu', 'Yoshimune', 'Nobuhide', 'Yoshitaka',
    'Haruhisa', 'Toshiie', 'Nagamasa', 'Murashige', 'Hidehisa', 'Mitsuhide',
    'Yoshiaki', 'Motonari', 'Tsunehisa', 'Yoshinaka', 'Ujimasa', 'Kagetsuna',
    'Yukimura', 'Masayuki', 'Nobuyuki', 'Genba', 'Yoritsuna', 'Dōsetsu',
  ],
  byzantium: [
    'Nikephoros', 'Alexios', 'Basileios', 'Konstantinos', 'Theodoros',
    'Ioannes', 'Staurakios', 'Romanos', 'Andronikos', 'Michael',
    'Leo', 'Zeno', 'Maurice', 'Phokas', 'Tiberius', 'Artabasdos',
    'Niketas', 'Bardas', 'Symbatios', 'Katakalon', 'Botaneiates',
    'Melissenos', 'Skleros', 'Diogenes', 'Komnenos', 'Palaiologos',
    'Doukas', 'Angelos', 'Kantakouzenos', 'Philanthropenos',
  ],
  sumer: [
    'Ur-Namma', 'Lugal-Ane', 'Dumuzi', 'Enmebaragesi', 'Akurgal',
    'Mesanepada', 'Ku-Baba', 'Shulgi', 'Amar-Sin', 'Shu-Sin',
    'Ibbi-Sin', 'Lugal-Zage-Si', 'En-Shak-Ushana', 'Enshakushanna', 'Eannatum',
    'Entemena', 'Ur-Zababa', 'Lugal-Kisal-Si', 'Naram-Sin', 'Manishtushu',
    'Rimush', 'Ur-Baba', 'Gudea', 'Ur-Ningirsu', 'Nam-Mahazi',
    'Ishbi-Erra', 'Lipit-Ishtar', 'Gungunum', 'Nur-Adad', 'Warad-Sin',
  ],
  rome: [
    'Gaius', 'Lucius', 'Marcus', 'Quintus', 'Titus', 'Publius',
    'Servius', 'Aulus', 'Gnaeus', 'Decimus', 'Spurius', 'Manius',
    'Kaeso', 'Appius', 'Numerius', 'Vibius', 'Tertius', 'Sextus',
    'Opiter', 'Faustus', 'Postumus', 'Statius', 'Mettius', 'Novius',
    'Pacuvius', 'Salvius', 'Trebius', 'Vettius', 'Marius', 'Servilius',
  ],
  macedon: [
    'Ptolemaios', 'Seleukos', 'Perdikkas', 'Antigonos', 'Kassandros',
    'Nearchos', 'Lysimachos', 'Eumenes', 'Leonnatos', 'Laomedon',
    'Peithon', 'Archias', 'Kleophos', 'Andromachos', 'Balakros',
    'Attalos', 'Meleagros', 'Koinos', 'Polyperchon', 'Ptolemy Keraunos',
    'Demetrios', 'Antigonos Gonatas', 'Pyrrhos', 'Olympichos', 'Adaios',
    'Kleomenes', 'Philotas', 'Hephaistion', 'Niarchos', 'Aristonous',
  ],
  mongolia: [
    'Temür', 'Chagatai', 'Jochi', 'Berke', 'Batu', 'Kublai',
    'Möngke', 'Arghun', 'Ögedei', 'Güyük', 'Tolui', 'Abaqa',
    'Ghazan', 'Oljeitu', 'Abu Said', 'Nayan', 'Kaidu', 'Duwa',
    'Esen Buqa', 'Kebek', 'Tarmashirin', 'Changshi', 'Yesügei', 'Belgutei',
    'Khasar', 'Temüge', 'Bogorchu', 'Jelme', 'Chila\'un', 'Qubilai Noyan',
  ],
  norse: [
    'Sigurd', 'Ragnar', 'Leif', 'Gunnar', 'Ivar', 'Ulf',
    'Sven', 'Orm', 'Halfdan', 'Rollo', 'Eric', 'Olaf',
    'Thorvald', 'Ketil', 'Hrolf', 'Floki', 'Asmund', 'Gunnbjorn',
    'Hakon', 'Sigrid', 'Astrid', 'Ragnhild', 'Freydis', 'Unn',
    'Thorfinn', 'Knut', 'Magnus', 'Styrbjorn', 'Palnatoki', 'Ingvar',
  ],
};

// ── ITEM B2: per-civ epithet pools (12+ per civ) ──────────────────────────
// Used combinatorially with rank + name (~50 % chance appended).
export const CIV_ELITE_EPITHETS = {
  china: [
    'the Ironclad', 'of the Jade Blade', 'the Unyielding', 'the Red Serpent',
    'of the Black Mountain', 'the Swift Hawk', 'the Thousand-Li Rider',
    'the Unbroken', 'of the Southern Flame', 'the Silent Tiger',
    'the Iron Ox', 'the River Wolf', 'the Cloud Spear', 'the Bronze Fist',
  ],
  japan: [
    'the Demon', 'of the Crescent Moon', 'the Shadow Blade', 'the Iron Bear',
    'the Storm Rider', 'of the Red Dawn', 'the Mountain Tiger',
    'the Unseen', 'the Thunder Drum', 'the Crimson Fang',
    'of the Eastern Wind', 'the Night Crow', 'the Burning Eye', 'the Jade Fox',
  ],
  byzantium: [
    'the Unbroken', 'of the Purple Chamber', 'the Iron Strategos', 'the Gold-Crowned',
    'the Flame-Bearer', 'of the Sacred Lance', 'the Unconquered',
    'the Blessed', 'of Anatolia', 'the Invincible',
    'the Fire-Handed', 'the Sacred Shield', 'the Iron Curtain', 'the Twice-Born',
  ],
  sumer: [
    'the Eternal', 'of the Ziggurat', 'the Bull of Heaven', 'the Cedar-Feller',
    'the River-Born', 'of the Great Flood', 'the Lapis Lance',
    'the Reed-Cutter', 'of Nippur', 'the Golden Mace',
    'the Star-Reader', 'the Dust Walker', 'the Clay Throne', 'the Sun-Crowned',
  ],
  rome: [
    'the Unbroken', 'of the Iron Hand', 'the Eagle\'s Wing', 'the Thunderbolt',
    'the Red', 'of the Tiber', 'the Unconquered',
    'the Wall', 'of the Seventh Legion', 'the Iron Fist',
    'the Scarred', 'the Swift Blade', 'the Shield of Rome', 'the Unyielding',
  ],
  macedon: [
    'the Bold', 'of the Silver Shield', 'the Lion\'s Son', 'the Unstoppable',
    'the Far-Marcher', 'of the Companion Guard', 'the Spear-Bearer',
    'the Conqueror', 'of the Phalanx', 'the Golden Helm',
    'the East-Seeker', 'the Sarissa\'s Edge', 'the Flame of Pella', 'the Iron Wing',
  ],
  mongolia: [
    'Wolf of the Steppe', 'the Arrow-Storm', 'the Sky-Rider', 'the Bone-Crusher',
    'the Untracked', 'of the Blue Sky', 'the Hawk-Eye',
    'the Wind-Catcher', 'the Iron Hoof', 'the Steppe Fire',
    'the Shadow Horse', 'the Relentless', 'the Sand-Strider', 'the Night Rider',
  ],
  norse: [
    'the Far-Wanderer', 'of the Raven Banner', 'the Ice-Born', 'the Axe-Breaker',
    'the Storm-Caller', 'of the Shield Wall', 'the Bone-Gnawer',
    'the Sea-Wolf', 'the Frost-Handed', 'the Unbroken',
    'the Blood-Eagle', 'of Valhalla\'s Gate', 'the Iron Oak', 'the Grim',
  ],
};

// Per-civ rank words (3-4 per civ, used randomly instead of one fixed prefix).
export const CIV_ELITE_RANKS = {
  china:     ['General', 'Commander', 'Marshal', 'Vanguard'],
  japan:     ['Daimyo', 'Taisho', 'Gunso', 'Samurai-Taishō'],
  byzantium: ['Strategos', 'Tagmatarch', 'Domestikos', 'Merarches'],
  sumer:     ['Lugal', 'En', 'Ensi', 'Galzu'],
  rome:      ['Centurion', 'Legate', 'Tribune', 'Prefect'],
  macedon:   ['Taxiarch', 'Chiliarch', 'Hipparch', 'Strategos'],
  mongolia:  ['Noyan', 'Minghan', 'Tümen', 'Baghatur'],
  norse:     ['Jarl', 'Thane', 'Huscarl', 'Hersir'],
};

// ── ITEM B3: no-repeat ring-buffer (last 12 names per civ) ────────────────
const ELITE_NAME_RECENT = {};

function _pickNoRepeat(civId, pool) {
  if (!ELITE_NAME_RECENT[civId]) ELITE_NAME_RECENT[civId] = [];
  const recent = ELITE_NAME_RECENT[civId];
  // Build candidate list: pool entries not in the recent buffer
  const candidates = pool.filter(n => !recent.includes(n));
  // If all are recent (tiny pool edge-case), fall back to full pool
  const source = candidates.length > 0 ? candidates : pool;
  const chosen = source[Math.floor(Math.random() * source.length)];
  // Maintain ring buffer of length 12
  recent.push(chosen);
  if (recent.length > 12) recent.shift();
  return chosen;
}

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
 * Signature kept identical: generateEliteTitle(civId, modifierName)
 * Examples:
 *   "⚔ Centurion Vibius the Unbroken — Volatile"
 *   "⚔ Jarl Sigurd of the Raven Banner — Berserker"
 *   "⚔ Noyan Temür — Swift"
 */
export function generateEliteTitle(civId, modifierName) {
  const namePool  = CIV_ELITE_NAMES[civId]    || CIV_ELITE_NAMES.rome;
  const rankPool  = CIV_ELITE_RANKS[civId]    || CIV_ELITE_RANKS.rome;
  const epithets  = CIV_ELITE_EPITHETS[civId] || CIV_ELITE_EPITHETS.rome;

  const name    = _pickNoRepeat(civId, namePool);
  const rank    = rankPool[Math.floor(Math.random() * rankPool.length)];
  const epithet = Math.random() < 0.5
    ? ' ' + epithets[Math.floor(Math.random() * epithets.length)]
    : '';

  return `⚔ ${rank} ${name}${epithet} — ${modifierName}`;
}

// Legacy single-rank export kept for any direct consumers (SpawnSystem uses
// generateEliteTitle which now uses CIV_ELITE_RANKS instead).
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
