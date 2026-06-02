// Civilization champion bosses. Each has one signature, telegraphed attack
// pattern (plus contact damage) implemented in entities/Boss.js. Projectile
// damage is kept low and shots are slow/clearly-warned so patterns are
// dodgeable; contact and charges hit harder to punish bad positioning.
export const BOSSES = {
  caocao: {
    id: 'caocao',
    name: 'Cao Cao',
    civ: 'Three Kingdoms China',
    size: 80,
    hp: 540,
    speed: 52,
    contactDamage: 18,
    xp: 60,
    palette: { skin: 0xe2b0a0, primary: 0x161616, secondary: 0xd4af37, accent: 0x000000, plume: 0xd4af37 },
    opts: { cape: 0xd4af37 },
    // SIGNATURE — "the strategist": closing walls, cross-fire boxes, collapsing rings.
    attacks: [
      { kind: 'wall', cooldown: 2600, telegraph: 720, count: 13, spacing: 42, speed: 155, damage: 7 },
      { kind: 'cross_walls', cooldown: 3000, telegraph: 880, dirs: 4, reach: 360, count: 9, spacing: 46, speed: 150, damage: 8 },
      { kind: 'converging', cooldown: 3100, telegraph: 850, count: 18, ringRadius: 300, gap: true, speed: 165, damage: 8 },
      { kind: 'radial_burst', cooldown: 2700, telegraph: 700, count: 16, speed: 150, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'nova_rings', cooldown: 3600, telegraph: 800, count: 14, duration: 1500, interval: 250, speed: 150, damage: 7 }],
    ],
    summon: { cooldown: 6000, count: 3 },
  },
  hideyoshi: {
    id: 'hideyoshi',
    name: 'Toyotomi Hideyoshi',
    civ: 'Sengoku Japan',
    size: 80,
    hp: 680,
    speed: 60,
    contactDamage: 18,
    xp: 70,
    palette: { skin: 0xe2b0a0, primary: 0xb8860b, secondary: 0xb8002e, accent: 0x6b4e07, plume: 0xffd700 },
    opts: { horns: 0xffd700 },
    // SIGNATURE — "the dancer": interlocking counter-spirals + sweeping shotgun cones.
    attacks: [
      { kind: 'spiral', cooldown: 4000, telegraph: 750, duration: 1700, interval: 95, speed: 160, damage: 6, arms: 2, counterArms: 2, rotSpeed: 3.2 },
      { kind: 'spread_cone', cooldown: 2600, telegraph: 620, count: 11, arc: 1.2, speed: 185, damage: 7 },
      { kind: 'aimed_repeat', cooldown: 3000, telegraph: 680, duration: 1100, interval: 270, spread: 0.16, speed: 200, damage: 6 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3200, telegraph: 820, count: 20, ringRadius: 290, gap: true, speed: 170, damage: 8 }],
    ],
  },
  justinian: {
    id: 'justinian',
    name: 'Emperor Justinian',
    civ: 'Byzantine Empire',
    size: 80,
    hp: 780,
    speed: 50,
    contactDamage: 20,
    xp: 80,
    palette: { skin: 0xddae93, primary: 0x5b2a86, secondary: 0xd4af37, accent: 0xeaeaea, plume: 0xd4af37 },
    opts: { cape: 0xb8002e },
    // SIGNATURE — "greek fire": lingering fire zones + expanding nova rings (area denial).
    attacks: [
      { kind: 'flame_zones', cooldown: 3300, telegraph: 1000, zones: 4, radius: 72, damage: 8, spread: 175, tick: 240, linger: 850 },
      { kind: 'nova_rings', cooldown: 3700, telegraph: 820, count: 16, duration: 1600, interval: 250, speed: 155, damage: 7 },
      { kind: 'aimed_volley', cooldown: 2600, telegraph: 700, speed: 200, damage: 9 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'cross_walls', cooldown: 3200, telegraph: 900, dirs: 4, reach: 350, count: 9, spacing: 46, speed: 150, damage: 8 }],
    ],
  },
  enkidu: {
    id: 'enkidu',
    name: 'Enkidu',
    civ: 'Sumer / Uruk',
    size: 78,
    hp: 900,
    speed: 82,
    contactDamage: 16,
    xp: 90,
    palette: { skin: 0xb98a5a, primary: 0x6b4a2a, secondary: 0x8a6a3a, accent: 0x3a2414, plume: 0x2e7d32 },
    opts: {},
    // SIGNATURE — "the wild beast": relentless charges + close radial/cone bursts.
    attacks: [
      { kind: 'charge', cooldown: 2700, telegraph: 820, chargeSpeed: 540, dashMs: 620, damage: 28 },
      { kind: 'radial_burst', cooldown: 2800, telegraph: 700, count: 12, speed: 150, damage: 8 },
      { kind: 'spread_cone', cooldown: 2700, telegraph: 620, count: 9, arc: 1.0, speed: 180, damage: 8 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'spiral', cooldown: 3600, telegraph: 720, duration: 1700, interval: 95, speed: 165, damage: 7, arms: 2, counterArms: 2, rotSpeed: 3.4 }],
    ],
  },
  finalboss: {
    id: 'finalboss',
    name: 'Xerxes the Undying',
    civ: 'Warlord of Warlords',
    size: 96,
    hp: 2600,
    speed: 68,
    contactDamage: 26,
    xp: 150,
    palette: { skin: 0x2b1a0e, primary: 0x1a0a2e, secondary: 0x8b0000, accent: 0xd4af37, plume: 0x4b0082 },
    opts: { cape: 0x8b0000, horns: 0xd4af37 },
    // wields every champion's pattern, cycling through them; escalates at 66%/33% HP
    attacks: [
      { kind: 'radial_burst', cooldown: 1900, telegraph: 600, count: 26, speed: 185, damage: 9 },
      { kind: 'spiral', cooldown: 2400, telegraph: 650, duration: 1900, interval: 80, speed: 170, damage: 8, arms: 3, counterArms: 3, rotSpeed: 3.6 },
      { kind: 'flame_zones', cooldown: 2600, telegraph: 850, zones: 6, radius: 80, damage: 10, spread: 200, tick: 220, linger: 900 },
      { kind: 'charge', cooldown: 2200, telegraph: 750, chargeSpeed: 560, dashMs: 650, damage: 30 },
      { kind: 'wall', cooldown: 2300, telegraph: 700, count: 15, spacing: 40, speed: 175, damage: 9 },
      { kind: 'aimed_repeat', cooldown: 2400, telegraph: 620, duration: 1300, interval: 240, spread: 0.15, speed: 210, damage: 7 },
    ],
    phaseThresholds: [0.66, 0.33],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 2600, telegraph: 800, count: 22, ringRadius: 310, gap: true, speed: 185, damage: 9 }],
      [{ kind: 'nova_rings', cooldown: 3000, telegraph: 700, count: 18, duration: 2000, interval: 220, speed: 175, damage: 8 }],
    ],
    summon: { cooldown: 7000, count: 4 },
  },

  // ── China lieutenants ────────────────────────────────────────────────────
  xiahoudun: {
    id: 'xiahoudun',
    name: 'Xiahou Dun',
    civ: 'Three Kingdoms China',
    size: 70,
    hp: 460,
    speed: 72,
    contactDamage: 16,
    xp: 45,
    palette: { skin: 0xe0a88a, primary: 0x1a2a6b, secondary: 0xc0c0c0, accent: 0x0a0a0a, plume: 0xc0c0c0 },
    opts: { cape: 0x1a2a6b },
    // lieutenant — relentless one-eyed charger: dashes in, then pins you with a bullet
    // curtain + a close radial. Enrages into a closing box (cross_walls).
    attacks: [
      { kind: 'charge', cooldown: 2400, telegraph: 600, chargeSpeed: 530, dashMs: 580, damage: 28 },
      { kind: 'wall', cooldown: 2600, telegraph: 750, count: 11, spacing: 42, speed: 150, damage: 7 },
      { kind: 'radial_burst', cooldown: 2700, telegraph: 680, count: 13, speed: 155, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'cross_walls', cooldown: 3000, telegraph: 850, dirs: 4, reach: 350, count: 9, spacing: 46, speed: 150, damage: 8 }],
    ],
  },
  zhangliao: {
    id: 'zhangliao',
    name: 'Zhang Liao',
    civ: 'Three Kingdoms China',
    size: 70,
    hp: 500,
    speed: 65,
    contactDamage: 15,
    xp: 45,
    palette: { skin: 0xdaa07a, primary: 0x6b1a1a, secondary: 0xe8c44a, accent: 0x2a0a0a, plume: 0xe8c44a },
    opts: {},
    // lieutenant — tracking skirmisher who rallies troops: a re-aiming burst, a radial,
    // and a forward shotgun cone. Enrages into a collapsing ring (converging).
    attacks: [
      { kind: 'aimed_repeat', cooldown: 3000, telegraph: 720, duration: 1100, interval: 290, spread: 0.16, speed: 195, damage: 6 },
      { kind: 'radial_burst', cooldown: 2900, telegraph: 750, count: 11, speed: 150, damage: 7 },
      { kind: 'spread_cone', cooldown: 2700, telegraph: 660, count: 9, arc: 1.0, speed: 185, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3100, telegraph: 820, count: 18, ringRadius: 290, gap: true, speed: 170, damage: 8 }],
    ],
    summon: { cooldown: 7000, count: 2 },
  },

  // ── Japan lieutenants ─────────────────────────────────────────────────────
  shingen: {
    id: 'shingen',
    name: 'Takeda Shingen',
    civ: 'Sengoku Japan',
    size: 72,
    hp: 540,
    speed: 55,
    contactDamage: 17,
    xp: 45,
    palette: { skin: 0xe2b0a0, primary: 0x8b0000, secondary: 0xf5f5dc, accent: 0x3a1a0a, plume: 0xf5f5dc },
    opts: { horns: 0xf5c518 },
    // lieutenant — "the immovable mountain": steady radial walls + a wide shotgun cone,
    // and a slow curtain you must thread. Enrages into nested expanding rings (nova_rings).
    attacks: [
      { kind: 'radial_burst', cooldown: 2800, telegraph: 720, count: 12, speed: 165, damage: 7 },
      { kind: 'spread_cone', cooldown: 2800, telegraph: 720, count: 8, arc: 1.0, speed: 170, damage: 7 },
      { kind: 'wall', cooldown: 2900, telegraph: 800, count: 13, spacing: 40, speed: 150, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'nova_rings', cooldown: 3500, telegraph: 800, count: 14, duration: 1500, interval: 250, speed: 155, damage: 7 }],
    ],
  },
  masamune: {
    id: 'masamune',
    name: 'Date Masamune',
    civ: 'Sengoku Japan',
    size: 70,
    hp: 480,
    speed: 78,
    contactDamage: 15,
    xp: 45,
    palette: { skin: 0xd49a74, primary: 0x1c1c1c, secondary: 0x4a90d9, accent: 0xffd700, plume: 0x4a90d9 },
    opts: { cape: 0x4a90d9 },
    // lieutenant — the flashy "one-eyed dragon": a 3-arm spiral, snap aimed volleys, and
    // a bullet curtain. Enrages into a collapsing ring (converging).
    attacks: [
      { kind: 'spiral', cooldown: 3000, telegraph: 700, duration: 1500, interval: 100, speed: 165, damage: 6, arms: 3, rotSpeed: 3.0 },
      { kind: 'aimed_volley', cooldown: 2300, telegraph: 600, speed: 200, damage: 8 },
      { kind: 'wall', cooldown: 2600, telegraph: 720, count: 11, spacing: 44, speed: 165, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3000, telegraph: 800, count: 18, ringRadius: 295, gap: true, speed: 175, damage: 8 }],
    ],
  },

  // ── Byzantium lieutenants ─────────────────────────────────────────────────
  narses: {
    id: 'narses',
    name: 'Narses',
    civ: 'Byzantine Empire',
    size: 68,
    hp: 420,
    speed: 58,
    contactDamage: 14,
    xp: 45,
    palette: { skin: 0xddae93, primary: 0x2e5e8a, secondary: 0xd4af37, accent: 0xeaeaea, plume: 0xd4af37 },
    opts: { cape: 0x2e5e8a },
    // lieutenant — the cunning trap-layer: greek-fire zones, a bullet curtain, and a
    // re-aiming tracking burst. Enrages into a closing box (cross_walls).
    attacks: [
      { kind: 'flame_zones', cooldown: 3200, telegraph: 800, zones: 3, radius: 65, damage: 7, spread: 150, tick: 250, linger: 750 },
      { kind: 'wall', cooldown: 2700, telegraph: 800, count: 11, spacing: 40, speed: 145, damage: 7 },
      { kind: 'aimed_repeat', cooldown: 3000, telegraph: 700, duration: 1100, interval: 280, spread: 0.16, speed: 195, damage: 6 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'cross_walls', cooldown: 3100, telegraph: 880, dirs: 4, reach: 350, count: 9, spacing: 46, speed: 150, damage: 8 }],
    ],
    summon: { cooldown: 8000, count: 2 },
  },
  heraclius: {
    id: 'heraclius',
    name: 'Heraclius',
    civ: 'Byzantine Empire',
    size: 72,
    hp: 520,
    speed: 62,
    contactDamage: 16,
    xp: 45,
    palette: { skin: 0xe0c0a0, primary: 0x6a0dad, secondary: 0xffd700, accent: 0xffffff, plume: 0xffd700 },
    opts: { cape: 0x6a0dad },
    // lieutenant — the imperial marksman: snap aimed volleys, a forward shotgun cone, a
    // re-aiming tracking burst, and expanding rings. Enrages into a collapsing ring.
    attacks: [
      { kind: 'aimed_volley', cooldown: 2400, telegraph: 700, speed: 205, damage: 9 },
      { kind: 'spread_cone', cooldown: 2600, telegraph: 680, count: 9, arc: 0.9, speed: 185, damage: 7 },
      { kind: 'aimed_repeat', cooldown: 2900, telegraph: 680, duration: 1200, interval: 250, spread: 0.15, speed: 205, damage: 7 },
      { kind: 'nova_rings', cooldown: 3400, telegraph: 780, count: 14, duration: 1400, interval: 250, speed: 160, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3000, telegraph: 800, count: 18, ringRadius: 300, gap: true, speed: 180, damage: 8 }],
    ],
  },

  // ── Rome champion ────────────────────────────────────────────────────────
  pompey: {
    id: 'pompey',
    name: 'Pompey the Great',
    civ: 'Rome',
    size: 80,
    hp: 820,
    speed: 60,
    contactDamage: 18,
    xp: 70,
    palette: { skin: 0xe2b0a0, primary: 0xb02a2a, secondary: 0xd4af37, accent: 0xcfd6e0, plume: 0xb02a2a },
    opts: { cape: 0xb02a2a },
    // SIGNATURE — "the wall-builder": closing bullet curtains, spread cones, tracking repeat, charge.
    attacks: [
      { kind: 'wall', cooldown: 2600, telegraph: 720, count: 13, spacing: 42, speed: 155, damage: 8 },
      { kind: 'spread_cone', cooldown: 2600, telegraph: 680, count: 11, arc: 1.2, speed: 185, damage: 8 },
      { kind: 'aimed_repeat', cooldown: 2900, telegraph: 680, duration: 1200, interval: 250, spread: 0.15, speed: 205, damage: 7 },
      { kind: 'charge', cooldown: 2700, telegraph: 700, chargeSpeed: 540, dashMs: 600, damage: 28 },
    ],
    phaseThresholds: [0.6, 0.33],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3000, telegraph: 820, count: 18, ringRadius: 300, gap: true, speed: 175, damage: 8 }],
      [{ kind: 'nova_rings', cooldown: 3200, telegraph: 780, count: 16, duration: 1600, interval: 250, speed: 160, damage: 8 }],
    ],
  },

  // ── Macedon champion ──────────────────────────────────────────────────────
  philip: {
    id: 'philip',
    name: 'Philip II',
    civ: 'Macedon',
    size: 80,
    hp: 800,
    speed: 58,
    contactDamage: 18,
    xp: 70,
    palette: { skin: 0xe2b0a0, primary: 0x2a4d8f, secondary: 0xd4af37, accent: 0xcfd6e0, plume: 0xffffff },
    opts: { cape: 0x2a4d8f },
    // SIGNATURE — "the phalanx strategist": counter-spirals, cones, walls, charges.
    attacks: [
      { kind: 'spiral', cooldown: 3600, telegraph: 750, duration: 1700, interval: 95, speed: 165, damage: 7, arms: 2, counterArms: 2, rotSpeed: 3.2 },
      { kind: 'spread_cone', cooldown: 2600, telegraph: 680, count: 11, arc: 1.2, speed: 185, damage: 8 },
      { kind: 'wall', cooldown: 2700, telegraph: 720, count: 13, spacing: 42, speed: 160, damage: 7 },
      { kind: 'charge', cooldown: 2700, telegraph: 700, chargeSpeed: 540, dashMs: 620, damage: 28 },
    ],
    phaseThresholds: [0.6, 0.33],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3200, telegraph: 820, count: 20, ringRadius: 290, gap: true, speed: 175, damage: 8 }],
      [{ kind: 'nova_rings', cooldown: 3200, telegraph: 780, count: 16, duration: 1600, interval: 250, speed: 160, damage: 8 }],
    ],
  },

  // ── Mongolia champion ─────────────────────────────────────────────────────
  subutai: {
    id: 'subutai',
    name: 'Subutai',
    civ: 'Mongol Empire',
    size: 80,
    hp: 790,
    speed: 66,
    contactDamage: 17,
    xp: 70,
    palette: { skin: 0xd9a878, primary: 0x4a3a28, secondary: 0xb8860b, accent: 0x2a2018, plume: 0xd2a04a },
    opts: {},
    // SIGNATURE — "the grand strategist": relentless tracking shots, radial bursts, spirals, cones.
    attacks: [
      { kind: 'aimed_repeat', cooldown: 2400, telegraph: 620, duration: 1300, interval: 240, spread: 0.15, speed: 210, damage: 7 },
      { kind: 'radial_burst', cooldown: 2700, telegraph: 700, count: 16, speed: 160, damage: 8 },
      { kind: 'spiral', cooldown: 3000, telegraph: 700, duration: 1700, interval: 90, speed: 170, damage: 7, arms: 3, rotSpeed: 3.4 },
      { kind: 'spread_cone', cooldown: 2500, telegraph: 660, count: 11, arc: 1.2, speed: 190, damage: 8 },
    ],
    summon: { cooldown: 6500, count: 2 },
    phaseThresholds: [0.6, 0.33],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3000, telegraph: 800, count: 20, ringRadius: 300, gap: true, speed: 180, damage: 8 }],
      [{ kind: 'nova_rings', cooldown: 3200, telegraph: 760, count: 18, duration: 1800, interval: 230, speed: 170, damage: 8 }],
    ],
  },

  // ── Norse champion ────────────────────────────────────────────────────────
  hardrada: {
    id: 'hardrada',
    name: 'Harald Hardrada',
    civ: 'Norse Scandinavia',
    size: 81,
    hp: 830,
    speed: 60,
    contactDamage: 19,
    xp: 72,
    palette: { skin: 0xe0b080, primary: 0x5a3c28, secondary: 0xb0b0c0, accent: 0x8a6030, plume: 0xffd700 },
    opts: { cape: 0x5a3c28 },
    // SIGNATURE — "the last Viking king": brutal charges, radial bursts, bullet walls, spread cones.
    attacks: [
      { kind: 'charge', cooldown: 2300, telegraph: 680, chargeSpeed: 560, dashMs: 640, damage: 30 },
      { kind: 'radial_burst', cooldown: 2700, telegraph: 700, count: 16, speed: 165, damage: 8 },
      { kind: 'wall', cooldown: 2400, telegraph: 700, count: 15, spacing: 40, speed: 170, damage: 8 },
      { kind: 'spread_cone', cooldown: 2600, telegraph: 680, count: 11, arc: 1.1, speed: 185, damage: 8 },
    ],
    phaseThresholds: [0.6, 0.33],
    phaseAttacks: [
      [{ kind: 'cross_walls', cooldown: 3000, telegraph: 820, dirs: 4, reach: 360, count: 9, spacing: 46, speed: 160, damage: 9 }],
      [{ kind: 'nova_rings', cooldown: 3000, telegraph: 760, count: 16, duration: 1600, interval: 240, speed: 165, damage: 8 }],
    ],
  },

  // ── Rome lieutenants ──────────────────────────────────────────────────────
  sulla: {
    id: 'sulla',
    name: 'Sulla',
    civ: 'Rome',
    size: 70,
    hp: 480,
    speed: 64,
    contactDamage: 16,
    xp: 45,
    palette: { skin: 0xe0a88a, primary: 0x8a1c1c, secondary: 0xc0c0c0, accent: 0x0a0a0a, plume: 0xc0c0c0 },
    opts: { cape: 0x8a1c1c },
    // lieutenant — relentless dictator: charging rushes, closing walls, radial slams.
    attacks: [
      { kind: 'charge', cooldown: 2400, telegraph: 620, chargeSpeed: 540, dashMs: 600, damage: 28 },
      { kind: 'wall', cooldown: 2600, telegraph: 750, count: 11, spacing: 42, speed: 150, damage: 7 },
      { kind: 'radial_burst', cooldown: 2700, telegraph: 680, count: 13, speed: 155, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'cross_walls', cooldown: 3000, telegraph: 850, dirs: 4, reach: 350, count: 9, spacing: 46, speed: 150, damage: 8 }],
    ],
  },
  crassus: {
    id: 'crassus',
    name: 'Crassus',
    civ: 'Rome',
    size: 70,
    hp: 500,
    speed: 58,
    contactDamage: 15,
    xp: 45,
    palette: { skin: 0xdaa07a, primary: 0x6b1a1a, secondary: 0xd4af37, accent: 0x2a0a0a, plume: 0xd4af37 },
    opts: { cape: 0x6b1a1a },
    // lieutenant — the wealthy schemer: aimed volleys, cones, hazard zones. Rallies troops.
    attacks: [
      { kind: 'aimed_volley', cooldown: 2500, telegraph: 700, speed: 205, damage: 9 },
      { kind: 'spread_cone', cooldown: 2700, telegraph: 680, count: 9, arc: 1.0, speed: 185, damage: 7 },
      { kind: 'flame_zones', cooldown: 3200, telegraph: 800, zones: 3, radius: 66, damage: 7, spread: 160, tick: 250, linger: 800 },
    ],
    summon: { cooldown: 7500, count: 2 },
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3100, telegraph: 820, count: 18, ringRadius: 290, gap: true, speed: 170, damage: 8 }],
    ],
  },

  // ── Macedon lieutenants ───────────────────────────────────────────────────
  parmenion: {
    id: 'parmenion',
    name: 'Parmenion',
    civ: 'Macedon',
    size: 70,
    hp: 510,
    speed: 56,
    contactDamage: 16,
    xp: 45,
    palette: { skin: 0xddae93, primary: 0x24406b, secondary: 0xd4af37, accent: 0xeaeaea, plume: 0xd4af37 },
    opts: { cape: 0x24406b },
    // lieutenant — the old general: disciplined walls, radial bursts, aimed volleys.
    attacks: [
      { kind: 'wall', cooldown: 2700, telegraph: 760, count: 13, spacing: 40, speed: 150, damage: 7 },
      { kind: 'radial_burst', cooldown: 2800, telegraph: 700, count: 12, speed: 160, damage: 7 },
      { kind: 'aimed_volley', cooldown: 2400, telegraph: 640, speed: 200, damage: 8 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'nova_rings', cooldown: 3500, telegraph: 800, count: 14, duration: 1500, interval: 250, speed: 155, damage: 7 }],
    ],
  },
  craterus: {
    id: 'craterus',
    name: 'Craterus',
    civ: 'Macedon',
    size: 70,
    hp: 490,
    speed: 70,
    contactDamage: 16,
    xp: 45,
    palette: { skin: 0xd49a74, primary: 0x1c2c4f, secondary: 0x4a90d9, accent: 0xffd700, plume: 0x4a90d9 },
    opts: { cape: 0x4a90d9 },
    // lieutenant — swift cavalry commander: dashing charges, cones, tracking bursts.
    attacks: [
      { kind: 'charge', cooldown: 2400, telegraph: 600, chargeSpeed: 540, dashMs: 600, damage: 28 },
      { kind: 'spread_cone', cooldown: 2700, telegraph: 700, count: 9, arc: 1.1, speed: 180, damage: 8 },
      { kind: 'aimed_repeat', cooldown: 3000, telegraph: 700, duration: 1100, interval: 270, spread: 0.16, speed: 200, damage: 6 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'cross_walls', cooldown: 3000, telegraph: 850, dirs: 4, reach: 350, count: 9, spacing: 46, speed: 150, damage: 8 }],
    ],
  },

  // ── Mongolia lieutenants ──────────────────────────────────────────────────
  jebe: {
    id: 'jebe',
    name: 'Jebe',
    civ: 'Mongol Empire',
    size: 70,
    hp: 460,
    speed: 72,
    contactDamage: 14,
    xp: 45,
    palette: { skin: 0xd9a878, primary: 0x3a2c1c, secondary: 0xb8860b, accent: 0x1a140c, plume: 0xd2a04a },
    opts: {},
    // lieutenant — the arrow general: rapid tracking shots, aimed volleys, spread cones.
    attacks: [
      { kind: 'aimed_repeat', cooldown: 2900, telegraph: 700, duration: 1200, interval: 250, spread: 0.16, speed: 205, damage: 7 },
      { kind: 'aimed_volley', cooldown: 2400, telegraph: 640, speed: 210, damage: 8 },
      { kind: 'spread_cone', cooldown: 2700, telegraph: 680, count: 9, arc: 1.0, speed: 190, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3000, telegraph: 800, count: 18, ringRadius: 295, gap: true, speed: 180, damage: 8 }],
    ],
  },
  muqali: {
    id: 'muqali',
    name: 'Muqali',
    civ: 'Mongol Empire',
    size: 70,
    hp: 520,
    speed: 60,
    contactDamage: 16,
    xp: 45,
    palette: { skin: 0xd09868, primary: 0x2c2418, secondary: 0xb8860b, accent: 0x14100a, plume: 0xd2a04a },
    opts: { cape: 0x2c2418 },
    // lieutenant — the horde warlord: radial volleys, closing walls, spiraling shots. Rallies minions.
    attacks: [
      { kind: 'radial_burst', cooldown: 2800, telegraph: 720, count: 12, speed: 160, damage: 8 },
      { kind: 'wall', cooldown: 2700, telegraph: 760, count: 11, spacing: 42, speed: 155, damage: 7 },
      { kind: 'spiral', cooldown: 3000, telegraph: 700, duration: 1500, interval: 100, speed: 165, damage: 6, arms: 3, rotSpeed: 3.0 },
    ],
    summon: { cooldown: 7500, count: 2 },
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'nova_rings', cooldown: 3400, telegraph: 800, count: 16, duration: 1600, interval: 250, speed: 160, damage: 8 }],
    ],
  },

  // ── Norse lieutenants ─────────────────────────────────────────────────────
  ironside: {
    id: 'ironside',
    name: 'Bjorn Ironside',
    civ: 'Norse Scandinavia',
    size: 72,
    hp: 540,
    speed: 64,
    contactDamage: 17,
    xp: 45,
    palette: { skin: 0xe0b080, primary: 0x4a3220, secondary: 0xc0c0c0, accent: 0x2a1c10, plume: 0xd0d0d0 },
    opts: { horns: 0xd0d0d0 },
    // lieutenant — the iron-sided raider: fearless charges, radial slams, bullet walls.
    attacks: [
      { kind: 'charge', cooldown: 2400, telegraph: 600, chargeSpeed: 540, dashMs: 600, damage: 28 },
      { kind: 'radial_burst', cooldown: 2700, telegraph: 700, count: 13, speed: 160, damage: 7 },
      { kind: 'wall', cooldown: 2600, telegraph: 750, count: 11, spacing: 42, speed: 155, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'cross_walls', cooldown: 3000, telegraph: 850, dirs: 4, reach: 350, count: 9, spacing: 46, speed: 155, damage: 9 }],
    ],
  },
  lagertha: {
    id: 'lagertha',
    name: 'Lagertha',
    civ: 'Norse Scandinavia',
    size: 70,
    hp: 470,
    speed: 74,
    contactDamage: 15,
    xp: 45,
    palette: { skin: 0xe6c0a0, primary: 0x3a2c20, secondary: 0xc0c0c0, accent: 0x1a120a, plume: 0xffd700 },
    opts: { cape: 0x3a2c20 },
    // lieutenant — the shieldmaiden: precise volleys, spread cones, tracking repeat bursts.
    attacks: [
      { kind: 'aimed_volley', cooldown: 2400, telegraph: 660, speed: 205, damage: 9 },
      { kind: 'spread_cone', cooldown: 2700, telegraph: 680, count: 9, arc: 1.0, speed: 185, damage: 7 },
      { kind: 'aimed_repeat', cooldown: 2900, telegraph: 680, duration: 1100, interval: 260, spread: 0.15, speed: 205, damage: 7 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'converging', cooldown: 3000, telegraph: 800, count: 18, ringRadius: 300, gap: true, speed: 180, damage: 8 }],
    ],
  },

  // ── Sumer lieutenants ─────────────────────────────────────────────────────
  sargon: {
    id: 'sargon',
    name: 'Sargon of Akkad',
    civ: 'Sumer / Uruk',
    size: 70,
    hp: 560,
    speed: 68,
    contactDamage: 18,
    xp: 45,
    palette: { skin: 0xb07840, primary: 0x5a3010, secondary: 0xb8860b, accent: 0x2a1808, plume: 0xb8860b },
    opts: {},
    // lieutenant — the world's first conqueror, a charging brute: a hard charge, a close
    // shotgun cone, and a heavy radial slam. Enrages into a closing box (cross_walls).
    attacks: [
      { kind: 'charge', cooldown: 2700, telegraph: 620, chargeSpeed: 540, dashMs: 620, damage: 30 },
      { kind: 'spread_cone', cooldown: 2700, telegraph: 700, count: 8, arc: 1.1, speed: 175, damage: 8 },
      { kind: 'radial_burst', cooldown: 2800, telegraph: 720, count: 12, speed: 160, damage: 8 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'cross_walls', cooldown: 3000, telegraph: 850, dirs: 4, reach: 350, count: 9, spacing: 46, speed: 155, damage: 9 }],
    ],
  },
  hammurabi: {
    id: 'hammurabi',
    name: 'Hammurabi',
    civ: 'Sumer / Uruk',
    size: 70,
    hp: 490,
    speed: 52,
    contactDamage: 15,
    xp: 45,
    palette: { skin: 0xc89060, primary: 0x1e3a2a, secondary: 0xe8c44a, accent: 0x0a1a10, plume: 0xe8c44a },
    opts: { cape: 0x1e3a2a },
    // lieutenant — the lawgiver, a zoning controller: radial decrees, hazard zones, and a
    // forward shotgun cone that boxes you in. Enrages into expanding rings (nova_rings).
    attacks: [
      { kind: 'radial_burst', cooldown: 3200, telegraph: 800, count: 10, speed: 155, damage: 8 },
      { kind: 'flame_zones', cooldown: 3400, telegraph: 850, zones: 3, radius: 68, damage: 7, spread: 160, tick: 250, linger: 800 },
      { kind: 'spread_cone', cooldown: 2800, telegraph: 700, count: 9, arc: 1.0, speed: 170, damage: 8 },
    ],
    phaseThresholds: [0.5],
    phaseAttacks: [
      [{ kind: 'nova_rings', cooldown: 3400, telegraph: 800, count: 16, duration: 1600, interval: 250, speed: 160, damage: 8 }],
    ],
    summon: { cooldown: 7500, count: 2 },
  },
};

// Order bosses cycle in. Each full cycle increases HP via the scene's bossCycle.
export const BOSS_ORDER = ['caocao', 'hideyoshi', 'justinian', 'enkidu', 'pompey', 'philip', 'subutai', 'hardrada'];

// Lieutenant generals (2 per civ) — lead-up bosses before each civ's champion.
export const CIV_LIEUTENANTS = {
  china:    ['xiahoudun', 'zhangliao'],
  japan:    ['shingen',   'masamune'],
  byzantium: ['narses',  'heraclius'],
  sumer:    ['sargon',   'hammurabi'],
  rome:     ['sulla',     'crassus'],
  macedon:  ['parmenion', 'craterus'],
  mongolia: ['jebe',      'muqali'],
  norse:    ['ironside',  'lagertha'],
};

export function getBoss(id) {
  return BOSSES[id];
}
