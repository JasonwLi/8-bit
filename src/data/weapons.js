// Weapons declare four flavored upgrade axes instead of generic damage/reach/
// speed/effect. The player invests one point per level-up (UpgradeScene).
// WeaponSystem.computeStats() turns base + points + player modifiers into the
// effective stats used when firing.
//
//   axes: array of exactly 4 { id, kind, label, desc, per? } entries.
//     id   — unique points key within this weapon (e.g. 'dmg','blood','crush')
//     kind — scaling vocabulary (dmg/cadence/size/count/arc/pierce/bleed/
//            knockback/stun/slow/lifesteal/fear/allyhp/allydmg/spin/
//            armorpierce/burnpatch)
//     per  — optional per-point override (else kind's default is used)
export const WEAPONS = {
  // Lü Bu — sweeping melee arc. Always knocks back and leeches life (default-on).
  halberd_sweep: {
    id: 'halberd_sweep',
    name: 'Sky Piercer Sweep',
    kind: 'melee_arc',
    color: 0xd4af37,
    base: {
      damage: 22, cooldown: 900, radius: 95, arc: 200,
      lifesteal: 0.02,   // 2% lifesteal default-on; scales with 'lifesteal' axis
      knockback: 14,     // 14px knockback default-on; scales with 'knockback' axis
    },
    axes: [
      { id: 'dmg',   kind: 'dmg',       label: 'Damage',        desc: '+16% sweep damage' },
      { id: 'arc',   kind: 'arc',       label: 'Sweeping Reach', desc: '+24° wider sweep arc' },
      { id: 'blood', kind: 'lifesteal', label: 'Bloodlust',      desc: '+3% lifesteal on hit' },
      { id: 'crush', kind: 'knockback', label: 'Crushing Blow',  desc: '+16px knockback per point' },
    ],
    // EVOLVE — Wrath of Heaven: double sweep + full 360° second spin, every hit burns
    // the ground, lifesteal doubled. Lü Bu becomes a blazing blender.
    evolution: {
      name: 'Wrath of Heaven',
      desc: 'Double sweep — the second hit is a full 360° spin. Every hit scorches the earth. Lifesteal ×2.',
      overlay: {
        damage: 37,        // ×1.7 vs maxed base
        // evolved-only flags read by fireMeleeArc
        dualSweep: true,   // queue a second 360° arc 180ms after the first
        leaveBurn: { radius: 48, dmg: 9, dur: 1800 }, // melee burn patch per hit
        lifestealMult: 2,  // applied on top of axis-scaled lifesteal in computeStatsGeneric
      },
    },
  },

  // Nobunaga — long-range precision matchlock. Pierces ALL targets by default.
  // Effect adds more shots (every ~3 pts) and an armor-piercing toggle.
  matchlock_volley: {
    id: 'matchlock_volley',
    name: 'Tanegashima Shot',
    kind: 'projectile_aimed',
    color: 0xffe08a,
    base: {
      damage: 27, cooldown: 820, count: 1, pierce: 2, speed: 680, spread: 0,
      pierceAll: true,   // always drills through the full line
    },
    axes: [
      { id: 'dmg',   kind: 'dmg',        label: 'Heavy Caliber',  desc: '+16% shot damage' },
      { id: 'quick', kind: 'cadence',    label: 'Quickload',      desc: '−7% reload cooldown' },
      { id: 'ap',    kind: 'armorpierce',label: 'Armor-Piercing', desc: 'Shots ignore enemy armor' },
      { id: 'hail',  kind: 'count',      label: 'Hailfire',       desc: '+1 shot every ~3 points', per: 0.34 },
    ],
    // EVOLVE — Demon King's Fusillade: each shot detonates a fire zone at impact.
    // Rewarded for long-range placement — the shell pierces everything AND leaves
    // a blazing pool wherever it lands.
    evolution: {
      name: "Demon King's Fusillade",
      desc: 'Shots detonate a fire zone on impact. Armor-piercing always on. +75% damage.',
      overlay: {
        damage: 47,        // ×1.75 vs maxed base
        cooldown: 943,     // +15% to compensate for the zone burst
        armorPierce: true,
        leaveBurn: { radius: 55, dmg: 14, dur: 2000 },
        // replaceGunFx: true — visual flag; WeaponSystem uses explosion instead of tracer
        incendiaryShell: true,
      },
    },
  },

  // Belisarius — lobbed Greek fire pools. Effect adds pools and scales burn duration.
  greek_fire: {
    id: 'greek_fire',
    name: 'Greek Fire',
    kind: 'lob_aoe',
    color: 0xff7b1c,
    base: {
      damage: 12, cooldown: 1500, count: 1, radius: 70,
      duration: 1600, tick: 240, speed: 360,
    },
    axes: [
      { id: 'dmg',    kind: 'dmg',      label: 'Hotter Flames',  desc: '+16% fire damage per tick' },
      { id: 'pools',  kind: 'count',    label: 'More Pools',     desc: '+1 fire pool per point', per: 1 },
      { id: 'sticky', kind: 'burnpatch',label: 'Sticky Fire',    desc: 'Pools last longer and scorch the ground' },
      { id: 'conf',   kind: 'size',     label: 'Conflagration',  desc: '+12% pool radius' },
    ],
    // EVOLVE — Napalm Tide: each pot splits into THREE sub-pools on landing, covering
    // a wide triangle of overlapping burn zones in addition to the central pool.
    evolution: {
      name: 'Napalm Tide',
      desc: 'Each pot splits into 3 extra burning sub-pools on landing — overlapping fire triangles flood the arena.',
      overlay: {
        // napalmTide flag tells spawnFlamePool to scatter sub-pools on landing
        napalmTide: true,
        napalmSubRadius: 52,
        napalmSubOffset: 55,
      },
    },
  },

  // Gilgamesh — orbiting golden blades from the Gate of Babylon treasury.
  divine_arsenal: {
    id: 'divine_arsenal',
    name: 'Divine Arsenal',
    kind: 'orbital',
    color: 0xffd700,
    base: {
      damage: 11, cooldown: 0, count: 5, orbitRadius: 62, orbitSpeed: 2.3,
    },
    axes: [
      { id: 'dmg',   kind: 'dmg',   label: 'Sharper Blades',  desc: '+16% blade damage' },
      { id: 'blade', kind: 'count', label: 'Divine Arsenal',  desc: '+1 orbiting blade per point', per: 1 },
      { id: 'orbit', kind: 'size',  label: 'Wider Orbit',     desc: '+12% orbit radius' },
      { id: 'spin',  kind: 'spin',  label: 'Whirlwind',       desc: 'Blades spin faster, striking more often' },
    ],
    // EVOLVE — Treasury Unleashed: every 3 seconds the ring of blades fires outward as
    // homing seeking projectiles, then immediately re-forms. Orbital grinder ↔ seeking salvo.
    evolution: {
      name: 'Treasury Unleashed',
      desc: 'Every 3 s the blades eject as homing projectiles then re-form. Orbital damage ×1.6, orbit ×1.3 speed.',
      overlay: {
        damage: 17,        // ×1.6 vs base damage (axis scaling applies on top)
        orbitSpeed: 2.99,  // ×1.3 for the snappy re-forming energy
        // orbitalEject: true tells _updateOrbiters to fire the burst on a 3 s timer
        orbitalEject: true,
        orbitalEjectMs: 3000,
        orbitalEjectHoming: { range: 380, turn: 0.14 },
        orbitalEjectPierce: 3,
      },
    },
  },

  // Caesar — commands the legion. Deploys allied legionary units. Effect adds legionaries.
  gladius: {
    id: 'gladius',
    name: 'Legionary Cohort',
    kind: 'summon',
    color: 0xcfd6e0,
    base: {
      damage: 18, cooldown: 2600, count: 1,
      allyHp: 40, allyLife: 7000, allySpeed: 150, allyRange: 30,
    },
    axes: [
      { id: 'cohort',   kind: 'count',   label: 'Cohort',        desc: '+1 legionary per point', per: 1 },
      { id: 'defense',  kind: 'allyhp',  label: 'Legion Defense',desc: '+14 legionary HP per point' },
      { id: 'veterans', kind: 'allydmg', label: 'Veterans',      desc: '+16% legionary damage per point' },
      { id: 'muster',   kind: 'cadence', label: 'Rapid Muster',  desc: '−7% deploy cooldown' },
    ],
    // EVOLVE — Testudo Immortalis: legionaries spawn with +80% HP, deal 50% more damage,
    // and each emits a permanent slow-field aura (30px, 40% slow) that grinds the horde
    // to a halt. Deploy count +2 unconditionally.
    evolution: {
      name: 'Testudo Immortalis',
      desc: 'Legionaries gain +80% HP, ×1.5 dmg, and a 30px slow aura. +2 extra deployed.',
      overlay: {
        allyHp: 72,        // 40 * 1.8
        count: 3,          // base count bumped by 2 (axes still add on top)
        allyDmgMult: 1.5,  // applied in fireSummon
        legionSlowAura: true, // flag read in updateAllies to apply proximity slow
        legionSlowRadius: 30,
        legionSlowFactor: 0.6,
        legionSlowDur: 400,
      },
    },
  },

  // Alexander — the phalanx. A long forward sarissa thrust. Always knocks back.
  sarissa: {
    id: 'sarissa',
    name: 'Sarissa Phalanx',
    kind: 'line_thrust',
    color: 0xcdb070,
    base: {
      damage: 33, cooldown: 560, length: 150, width: 46,
      knockback: 12,   // 12px knockback default-on; scales with 'knockback' axis
    },
    axes: [
      { id: 'dmg',    kind: 'dmg',       label: 'Honed Tip',    desc: '+16% thrust damage' },
      { id: 'length', kind: 'size',      label: 'Long Sarissa', desc: '+12% line length' },
      { id: 'phal',   kind: 'arc',       label: 'Phalanx',      desc: '+10px line width' },
      { id: 'impale', kind: 'knockback', label: 'Impale',       desc: '+16px knockback per point' },
    ],
    // EVOLVE — Macedonian Onslaught: THREE parallel lanes fire simultaneously — center
    // at full length, left/right at ×0.85 length, staggered 60ms. Total ≈ ×2.1 damage.
    evolution: {
      name: 'Macedonian Onslaught',
      desc: 'Three parallel sarissa lanes — center + left + right staggered 60 ms. Shatters entire battle lines.',
      overlay: {
        damage: 69,        // ×2.1 / 3 lanes ≈ ×2.1 total volley (each lane full damage)
        tripleLane: true,  // flag: fireLineThrust fires 3 lanes instead of 1
        tripleLaneOffset: 0.22, // radians (±13°)
        tripleLaneLengthMult: 0.85, // flanking lanes shorter
      },
    },
  },

  // Genghis — horse archer. Rapid stream of arrows. Pierces ALL; bleeds targets.
  composite_bow: {
    id: 'composite_bow',
    name: 'Steppe Volley',
    kind: 'projectile_aimed',
    color: 0xb8860b,
    base: {
      damage: 8, cooldown: 200, count: 1, pierce: 1, speed: 780, spread: 0.05,
      pierceAll: true,                             // arrows drill through all foes
      bleed: { dps: 1, duration: 4000, stackMax: 5 }, // bleed default-on
    },
    axes: [
      { id: 'dmg',   kind: 'dmg',     label: 'Heavy Draw',    desc: '+16% arrow damage' },
      { id: 'rapid', kind: 'cadence', label: 'Rapid Fire',    desc: '−7% draw cooldown' },
      { id: 'vol',   kind: 'count',   label: 'Volley',        desc: '+1 arrow every 2 points', per: 0.5 },
      { id: 'barb',  kind: 'bleed',   label: 'Barbed Arrows', desc: '+0.6 bleed dps & +1 stack cap' },
    ],
    // EVOLVE — Blood Sky Barrage: arrows gain homing + tripled bleed stack cap, creating
    // a self-correcting swarm of bloodletting needles that curve into running targets.
    evolution: {
      name: 'Blood Sky Barrage',
      desc: 'Arrows home onto targets. Bleed stack cap ×3 (15). +60% damage, −10% cooldown.',
      overlay: {
        damage: 12,        // ×1.6 vs base (axes scale further)
        cooldown: 180,     // −10% cadence
        homing: { range: 280, turn: 0.09 }, // subtle tracking on rapid-fire
        bleed: { dps: 1.5, duration: 5000, stackMax: 15 }, // tripled stack cap
      },
    },
  },

  // Ragnar — boomerang axes. Axes return and hit twice. Has base pierce.
  axe_throw: {
    id: 'axe_throw',
    name: 'Boomerang Axe',
    kind: 'boomerang',
    color: 0xb0b0c0,
    base: {
      damage: 29, cooldown: 720, count: 1, speed: 560, range: 230, spin: 22,
      pierce: 1,   // 1 pierce default-on; scales with 'pierce' axis
    },
    axes: [
      { id: 'dmg',   kind: 'dmg',    label: 'Sharpened',  desc: '+16% axe damage' },
      { id: 'twin',  kind: 'count',  label: 'Twin Axes',  desc: '+1 returning axe per point', per: 1 },
      { id: 'range', kind: 'size',   label: 'Long Throw', desc: '+12% throw range' },
      { id: 'cleave',kind: 'pierce', label: 'Cleaving',   desc: '+1 pierce per point (axes cut through more foes)' },
    ],
    // EVOLVE — Storm of Axes: axes explode at max range spawning a trample zone, then
    // sweep back. Three damage events per throw: outbound + trample zone + return.
    evolution: {
      name: 'Storm of Axes',
      desc: 'Axes explode at max range — trample zone + return sweep = 3 hit windows. +70% dmg, +1 axe.',
      overlay: {
        damage: 49,        // ×1.7 vs base (axes scale further)
        count: 2,          // +1 axe unconditionally on evolution base
        // boomExplosion flag: hooked in boomPhase transition in GameScene update
        boomExplosion: true,
        boomExplosionRadius: 70,
        boomExplosionLinger: 1200,
      },
    },
  },
};

export function getWeapon(id) {
  return WEAPONS[id];
}

// Human-readable description of what one more point in each axis does.
// (Legacy generic table kept for any modules that still reference AXIS_INFO.)
export const AXIS_INFO = {
  damage:    { label: 'Damage',       desc: '+16% weapon damage' },
  reach:     { label: 'Range',        desc: '+12% range / size' },
  speed:     { label: 'Attack Speed', desc: '−7% cooldown' },
  effect:    { label: 'Effect',       desc: 'weapon-specific power' },
};
