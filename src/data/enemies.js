// Enemy archetypes. `attack` selects AI behavior in GameScene:
//   melee  -> charge the player, deal contact damage
//   ranged -> hold at `range`, telegraph (windup), fire projectile(s)
//
// Melee `move` tags: 'chase' | 'zigzag' | 'circle' | 'charger' | 'lunger' | 'flyer' | 'bomber'
// Ranged `rangedKind` tags: 'single' | 'spread' | 'rapid' | 'lob' | 'siege' | 'blink'
export const ENEMIES = {
  // ── Original types (with move/rangedKind retrofitted) ──────────────────────
  soldier: {
    id: 'soldier',
    name: 'Levy Soldier',
    attack: 'melee',
    move: 'chase',
    hp: 14,
    speed: 70,
    damage: 8,
    xp: 2,
    size: 36,
    palette: { primary: 0x6b7280, secondary: 0x9aa3af, accent: 0x3a3f4b },
  },
  archer: {
    id: 'archer',
    name: 'Skirmisher',
    attack: 'ranged',
    rangedKind: 'single',
    hp: 12,
    speed: 80,
    damage: 5,
    xp: 2,
    size: 34,
    range: 280,
    fireCooldown: 1900,
    windup: 520,
    projSpeed: 165,
    projDamage: 5,
    palette: { primary: 0x4d7c4d, secondary: 0x7fae7f, accent: 0x2f4a2f },
  },
  machine: {
    id: 'machine',
    name: 'War Engine',
    attack: 'melee',
    move: 'chase',
    hp: 110,
    speed: 50,
    damage: 16,
    xp: 6,
    size: 46,
    palette: { primary: 0x8a5a2b, secondary: 0xc89b6a, accent: 0x4a3318 },
  },
  ballista: {
    id: 'ballista',
    name: 'Siege Ballista',
    attack: 'ranged',
    rangedKind: 'single',
    hp: 85,
    speed: 38,
    damage: 9,
    xp: 7,
    size: 46,
    range: 360,
    fireCooldown: 2600,
    windup: 700,
    projSpeed: 230,
    projDamage: 9,
    palette: { primary: 0x7a4a2a, secondary: 0xb07a3a, accent: 0x3a2414 },
  },

  // ── New melee types ────────────────────────────────────────────────────────

  // Fast & fragile; weaves side to side making it hard to aim.
  weaver: {
    id: 'weaver',
    name: 'Dust Weaver',
    attack: 'melee',
    move: 'zigzag',
    hp: 10,
    speed: 95,
    damage: 7,
    xp: 3,
    size: 30,
    weaveAmp: 80,    // pixels of perpendicular offset amplitude
    weaveFreq: 2.8,  // cycles per second
    palette: { primary: 0xc4a020, secondary: 0xf0d060, accent: 0x7a6010 },
  },

  // Medium-speed, orbits the player clockwise/counter at a preferred radius.
  circler: {
    id: 'circler',
    name: 'Flank Stalker',
    attack: 'melee',
    move: 'circle',
    hp: 20,
    speed: 75,
    damage: 10,
    xp: 4,
    size: 34,
    orbitRadius: 160,   // preferred orbit distance
    orbitSpeed: 130,    // tangential speed while orbiting
    palette: { primary: 0x6040b0, secondary: 0x9070e0, accent: 0x30205a },
  },

  // Slow approach then telegraphed high-speed dash toward the player.
  charger: {
    id: 'charger',
    name: 'Iron Charger',
    attack: 'melee',
    move: 'charger',
    hp: 62,
    speed: 52,
    damage: 20,
    xp: 5,
    size: 42,
    dashSpeed: 420,      // speed during dash
    dashDuration: 380,   // ms the dash lasts
    dashCooldown: 2800,  // ms between dashes (from start of previous)
    dashRange: 280,      // max distance to trigger a dash attempt
    dashWindup: 450,     // telegraph time before dash
    palette: { primary: 0xc03020, secondary: 0xe06050, accent: 0x601010 },
  },

  // Hangs at mid-range, then leaps at the player — punishes standing still.
  lunger: {
    id: 'lunger',
    name: 'Cave Lunger',
    attack: 'melee',
    move: 'lunger',
    hp: 18,
    speed: 55,
    damage: 14,
    xp: 4,
    size: 36,
    lungeSpeed: 380,     // speed during lunge
    lungeDuration: 300,  // ms the lunge lasts
    lungeCooldown: 3200, // ms between lunges
    lungeRange: 240,     // max distance to trigger a lunge
    lungeWindup: 320,    // telegraph before lunge
    recoverTime: 500,    // ms to stand still after lunge ends
    palette: { primary: 0x3a7a3a, secondary: 0x60c060, accent: 0x1a3a1a },
  },

  // ── New ranged types ───────────────────────────────────────────────────────

  // Fires a fan of 3 slow orbs — forces the player to dodge laterally.
  spreader: {
    id: 'spreader',
    name: 'Hex Spreader',
    attack: 'ranged',
    rangedKind: 'spread',
    spreadCount: 3,
    spreadAngle: 0.35,  // half-angle of fan in radians (~20 deg)
    hp: 22,
    speed: 60,
    damage: 6,
    xp: 5,
    size: 38,
    range: 310,
    fireCooldown: 2400,
    windup: 600,
    projSpeed: 145,
    projDamage: 6,
    palette: { primary: 0xaa44aa, secondary: 0xdd88dd, accent: 0x551155 },
  },

  // Rapid-fires cheap, fast shots — a sustained stream of pressure.
  gunner: {
    id: 'gunner',
    name: 'Crank Gunner',
    attack: 'ranged',
    rangedKind: 'rapid',
    rapidBurst: 4,       // shots per burst
    rapidInterval: 120,  // ms between shots in a burst
    hp: 28,
    speed: 55,
    damage: 5,
    xp: 5,
    size: 38,
    range: 260,
    fireCooldown: 2200,
    windup: 300,         // shorter tell — pays for it with lower per-shot damage
    projSpeed: 260,
    projDamage: 4,
    palette: { primary: 0x20608a, secondary: 0x50a0d0, accent: 0x103048 },
  },

  // Lobs a slow arcing projectile that deals extra damage on impact.
  lobber: {
    id: 'lobber',
    name: 'Mortar Goblin',
    attack: 'ranged',
    rangedKind: 'lob',
    hp: 30,
    speed: 48,
    damage: 8,
    xp: 6,
    size: 40,
    range: 380,
    fireCooldown: 3200,
    windup: 900,          // long, very readable telegraph
    projSpeed: 110,       // slow, but heavy
    projDamage: 18,       // hits hard — worth dodging
    palette: { primary: 0xa07820, secondary: 0xd0b040, accent: 0x503c10 },
  },

  // ── New archetype types ────────────────────────────────────────────────────

  // Fast aerial unit: dives at the player, overshoots off-screen, banks back.
  // State machine: 'approach' → 'dive' → 'exit' → 'reapproach'.
  harpy: {
    id: 'harpy',
    name: 'Stone Harpy',
    attack: 'melee',
    move: 'flyer',
    hp: 16,
    speed: 180,           // base cruise speed
    damage: 12,
    xp: 4,
    size: 34,
    diveSpeed: 420,       // speed during the actual dive pass
    diveRange: 260,       // distance that triggers the dive
    diveWindup: 260,      // ms of lock-on flash before diving
    exitDuration: 1200,   // ms to fly off screen before banking back
    palette: { primary: 0x7a6aaa, secondary: 0xb099dd, accent: 0x3a2a66 },
  },

  // Stays completely still; telegraphs then drops an AoE hazard zone on the player.
  catapult: {
    id: 'catapult',
    name: 'War Catapult',
    attack: 'ranged',
    rangedKind: 'siege',
    hp: 105,
    speed: 0,             // stationary — never moves
    damage: 0,            // no contact damage; all damage via hazard zone
    xp: 8,
    size: 50,
    range: 9999,          // always in range (stationary, use fixed dist)
    fireCooldown: 4500,
    windup: 1200,         // long telegraph — player has time to dodge
    projSpeed: 0,         // unused for siege
    projDamage: 0,        // unused for siege
    splashRadius: 90,     // AoE radius of the impact zone
    splashDamage: 22,     // damage per tick inside the zone
    splashDelay: 1100,    // ms the telegraph circle pulses before impact
    splashTick: 200,      // ms between damage ticks inside the zone
    splashLinger: 1800,   // ms the burning zone persists after impact
    palette: { primary: 0x5a4020, secondary: 0x9a7040, accent: 0x2a1a08 },
  },

  // Suicidal melee rusher: charges in, lights a fuse when close, then detonates.
  // State machine: 'rush' → 'fuse' (freeze + flash) → detonate (hazard + deactivate).
  bomber: {
    id: 'bomber',
    name: 'Fuse Bomber',
    attack: 'melee',
    move: 'bomber',
    hp: 22,
    speed: 130,           // fast rush speed
    damage: 6,            // light contact tap before detonation
    xp: 5,
    size: 36,
    fuseRange: 80,        // distance to player that triggers fuse lighting
    fuseDuration: 1400,   // ms of fuse-lit telegraph (flashing red) before boom
    blastRadius: 110,     // AoE radius of the explosion
    blastDamage: 35,      // damage per tick inside the blast zone
    blastDelay: 0,        // immediate impact (no pre-delay after fuse ends)
    blastTick: 9999,      // single-tick burst
    blastLinger: 400,     // brief scorch zone after detonation
    palette: { primary: 0x202020, secondary: 0x555555, accent: 0x080808 },
  },

  // Ranged caster that blinks/teleports to keep distance instead of walking.
  // Fires a dense orb, then immediately blinks to a random flanking position.
  blinker: {
    id: 'blinker',
    name: 'Void Blinker',
    attack: 'ranged',
    rangedKind: 'blink',
    hp: 20,
    speed: 70,            // fallback movement when blink is on cooldown
    damage: 4,
    xp: 6,
    size: 36,
    range: 300,
    fireCooldown: 2600,
    windup: 500,
    projSpeed: 200,
    projDamage: 10,
    blinkCooldown: 2200,  // ms between teleports (independent of fire cooldown)
    blinkDistance: 220,   // how far the blink repositions (units)
    palette: { primary: 0x1a1a4a, secondary: 0x5555cc, accent: 0x0a0a22 },
  },

  // ── Ten new enemy types ────────────────────────────────────────────────────

  // Fast harrier: sprints erratically, paper-thin but hard to land hits on
  jackal: {
    id: 'jackal',
    name: 'Desert Jackal',
    attack: 'melee',
    move: 'zigzag',
    hp: 8,
    speed: 120,
    damage: 6,
    xp: 3,
    size: 28,
    weaveAmp: 100,
    weaveFreq: 3.6,
    palette: { primary: 0xd4a040, secondary: 0xf0cc70, accent: 0x7a5820 },
  },

  // Tanky bruiser: slow walking wall with massive contact damage
  titan: {
    id: 'titan',
    name: 'War Titan',
    attack: 'melee',
    move: 'chase',
    hp: 260,
    speed: 28,
    damage: 38,
    xp: 14,
    size: 60,
    armor: 0.35,
    palette: { primary: 0x4a3a6a, secondary: 0x8860b0, accent: 0x1e1428 },
  },

  // Mid ranged support: stays far back, fires a single slow poison orb that slows
  shaman: {
    id: 'shaman',
    name: 'Hex Shaman',
    attack: 'ranged',
    rangedKind: 'single',
    hp: 26,
    speed: 50,
    damage: 4,
    xp: 5,
    size: 36,
    range: 340,
    fireCooldown: 3000,
    windup: 700,
    projSpeed: 120,
    projDamage: 8,
    palette: { primary: 0x2a6a3a, secondary: 0x50c060, accent: 0x123018 },
  },

  // Shielded type: heavy armour, barely takes damage, must be flanked
  sentinel: {
    id: 'sentinel',
    name: 'Iron Sentinel',
    attack: 'melee',
    move: 'chase',
    hp: 90,
    speed: 44,
    damage: 22,
    xp: 7,
    size: 44,
    armor: 0.55,
    palette: { primary: 0x708090, secondary: 0xb0c8d8, accent: 0x303840 },
  },

  // Aerial swooper variant — faster dive, smaller, swarms in numbers
  vulture: {
    id: 'vulture',
    name: 'Sand Vulture',
    attack: 'melee',
    move: 'flyer',
    hp: 12,
    speed: 210,
    damage: 9,
    xp: 3,
    size: 30,
    diveSpeed: 500,
    diveRange: 220,
    diveWindup: 180,
    exitDuration: 900,
    palette: { primary: 0xb07030, secondary: 0xd09850, accent: 0x603810 },
  },

  // Splitter: when killed, spawns two smaller child mobs (handled via large HP
  // that causes a natural reactivation loop — mimicked with a charger that hits hard)
  // Uses zigzag for unpredictability; thematically a cracked stone golem fragment
  shard: {
    id: 'shard',
    name: 'Golem Shard',
    attack: 'melee',
    move: 'charger',
    hp: 35,
    speed: 70,
    damage: 16,
    xp: 4,
    size: 32,
    dashSpeed: 360,
    dashDuration: 280,
    dashCooldown: 2200,
    dashRange: 240,
    dashWindup: 350,
    palette: { primary: 0x8a9aaa, secondary: 0xc0d0e0, accent: 0x3a4a55 },
  },

  // Rapid-fire crossbow specialist — burst of 5 fast bolts, orbits the player
  repeater: {
    id: 'repeater',
    name: 'Bolt Repeater',
    attack: 'ranged',
    rangedKind: 'rapid',
    rapidBurst: 5,
    rapidInterval: 90,
    hp: 32,
    speed: 65,
    damage: 5,
    xp: 5,
    size: 36,
    range: 300,
    fireCooldown: 2800,
    windup: 350,
    projSpeed: 300,
    projDamage: 5,
    palette: { primary: 0x8b4513, secondary: 0xcd853f, accent: 0x3e1e08 },
  },

  // Spread shotgunner with wide cone — punishes tight corridors
  cannoneer: {
    id: 'cannoneer',
    name: 'Doom Cannoneer',
    attack: 'ranged',
    rangedKind: 'spread',
    spreadCount: 5,
    spreadAngle: 0.55,
    hp: 48,
    speed: 42,
    damage: 7,
    xp: 6,
    size: 42,
    range: 280,
    fireCooldown: 3500,
    windup: 800,
    projSpeed: 170,
    projDamage: 7,
    palette: { primary: 0x1a1a1a, secondary: 0x555555, accent: 0x0a0a0a },
  },

  // Healer / support: orbits allies (or just circles far from player), fires a
  // slow 3-spread that pushes player back rather than dealing huge damage — forces
  // priority targeting
  acolyte: {
    id: 'acolyte',
    name: 'Dark Acolyte',
    attack: 'ranged',
    rangedKind: 'spread',
    spreadCount: 3,
    spreadAngle: 0.25,
    hp: 18,
    speed: 72,
    damage: 3,
    xp: 5,
    size: 34,
    range: 360,
    fireCooldown: 2600,
    windup: 550,
    projSpeed: 130,
    projDamage: 4,
    palette: { primary: 0x550055, secondary: 0xcc44cc, accent: 0x220022 },
  },

  // Teleporting siege type: blinks to a new position, then drops a lob shot
  wraith: {
    id: 'wraith',
    name: 'Void Wraith',
    attack: 'ranged',
    rangedKind: 'blink',
    hp: 24,
    speed: 80,
    damage: 5,
    xp: 7,
    size: 38,
    range: 320,
    fireCooldown: 2200,
    windup: 450,
    projSpeed: 180,
    projDamage: 12,
    blinkCooldown: 1800,
    blinkDistance: 260,
    palette: { primary: 0x0a0a2a, secondary: 0x3333aa, accent: 0x050510 },
  },

  // ── Heavy / tanky tier — real walls that punish trading blindly ─────────────
  brute: {
    id: 'brute',
    name: 'Brute',
    attack: 'melee',
    move: 'chase',
    hp: 105,
    speed: 46,
    damage: 26,
    xp: 8,
    size: 48,
    palette: { primary: 0x7a2f2f, secondary: 0xb0603a, accent: 0x3a1414 },
  },
  golem: {
    id: 'golem',
    name: 'Stone Golem',
    attack: 'melee',
    move: 'chase',
    hp: 200,
    speed: 34,
    damage: 30,
    xp: 12,
    size: 56,
    armor: 0.4, // 40% flat damage reduction — must be ground down, not bursted
    palette: { primary: 0x6b6b72, secondary: 0x9a9aa2, accent: 0x33333a },
  },
  reaver: {
    id: 'reaver',
    name: 'Iron Reaver',
    attack: 'melee',
    move: 'chase',
    hp: 72,
    speed: 74,
    damage: 18,
    xp: 6,
    size: 40,
    palette: { primary: 0x3a3f5a, secondary: 0x6a7390, accent: 0x171a26 },
  },
};

// Elite tactical modifiers — an elite rolls one, changing HOW it fights (not just
// HP). Applied at spawn in SpawnSystem; combat hooks live in GameScene.
export const ELITE_MODIFIERS = [
  { id: 'berserker', name: 'Berserker', tint: 0xff5a2a, dmgMult: 1.5, speedMult: 1.5, hpMult: 0.5 },
  { id: 'ironclad', name: 'Ironclad', tint: 0x9aa6c0, dmgMult: 1.0, speedMult: 0.9, hpMult: 1.3 },
  { id: 'warlord', name: 'Warlord', tint: 0xb15bff, dmgMult: 1.0, speedMult: 0.9, hpMult: 1.0, summonEvery: 6000, summonCount: 2 },
  { id: 'hex', name: 'Hex', tint: 0x66dd66, dmgMult: 1.0, speedMult: 1.0, hpMult: 1.0, curseRadius: 130, curseSlow: 0.72 },
  { id: 'swift', name: 'Swift', tint: 0x33d6d6, dmgMult: 1.0, speedMult: 1.85, hpMult: 0.6 },
];

// `from` = elapsed seconds at which the entry unlocks.
// Stages are ~15 min (900 s). New harder types unlock progressively.
export const SPAWN_TABLE = [
  // ── Early (0–60 s): base fodder ───────────────────────────────────────────
  { id: 'soldier',  from: 0,   weight: 10 },
  { id: 'archer',   from: 35,  weight: 6  },
  // ── Mid-early (60–180 s): new movement/attack flavours ───────────────────
  { id: 'weaver',   from: 60,  weight: 6  },
  { id: 'circler',  from: 90,  weight: 4  },
  { id: 'spreader', from: 90,  weight: 4  },
  // ── Mid (150–300 s): heavier hitters ─────────────────────────────────────
  { id: 'machine',  from: 110, weight: 3  },
  { id: 'ballista', from: 150, weight: 2  },
  { id: 'charger',  from: 150, weight: 4  },
  { id: 'gunner',   from: 180, weight: 4  },
  // ── Late (300–600 s): apex threats ───────────────────────────────────────
  { id: 'lunger',   from: 300, weight: 5  },
  { id: 'lobber',   from: 360, weight: 3  },
  // ── New archetypes: staggered unlock ─────────────────────────────────────
  { id: 'harpy',    from: 120, weight: 5  }, // aerial swooper — mid-early
  { id: 'bomber',   from: 200, weight: 4  }, // kamikaze rusher — mid
  { id: 'catapult', from: 270, weight: 1  }, // stationary siege — late-mid (reduced from 2 to dilute screen-flooding)
  { id: 'blinker',  from: 330, weight: 4  }, // teleporting caster — late
  // ── Heavy tier: tanky walls you can't just 3-shot (weighted up over the run) ─
  { id: 'reaver',   from: 150, weight: 6  }, // fast, beefy chaser — mid
  { id: 'brute',    from: 220, weight: 6  }, // slow heavy bruiser — mid-late
  { id: 'golem',    from: 360, weight: 5  }, // armored wall — late
  // ── Ten new enemy types ────────────────────────────────────────────────────
  { id: 'jackal',   from: 45,  weight: 7  }, // fast zigzag harrier — early
  { id: 'titan',    from: 400, weight: 3  }, // mega-tank bruiser — very late
  { id: 'shaman',   from: 180, weight: 4  }, // mid-range ranged support — mid
  { id: 'sentinel', from: 250, weight: 4  }, // shielded heavy — mid-late
  { id: 'vulture',  from: 90,  weight: 5  }, // aerial swooper variant — mid-early
  { id: 'shard',    from: 200, weight: 5  }, // charger shard — mid
  { id: 'repeater', from: 210, weight: 4  }, // rapid-fire crossbow — mid
  { id: 'cannoneer',from: 300, weight: 3  }, // wide-spread cannon — late-mid
  { id: 'acolyte',  from: 270, weight: 4  }, // dark support spreader — late-mid
  { id: 'wraith',   from: 350, weight: 4  }, // blink teleporter — late
];
