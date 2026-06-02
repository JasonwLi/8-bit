// Weapons are now customized continuously via four axes (damage / reach / speed
// / effect) instead of discrete level tiers. The player invests one point per
// level-up (UpgradeScene). WeaponSystem.computeStats() turns base + points +
// player modifiers into the effective stats used when firing.
//
//   perPoint: generic scaling per invested point
//     damage  -> +damage% per point
//     reach   -> +reach% per point (radius / projectile speed+range)
//     speed   -> cooldown *= (1 - speed) per point (multiplicative, faster)
//   effect: weapon-specific increments per invested "effect" point
export const WEAPONS = {
  // Lü Bu — sweeping melee arc. Effect widens the arc toward a full 360°.
  halberd_sweep: {
    id: 'halberd_sweep',
    name: 'Sky Piercer Sweep',
    kind: 'melee_arc',
    color: 0xd4af37,
    base: { damage: 22, cooldown: 900, radius: 95, arc: 200 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    effect: { arcPerPoint: 28, damagePerPoint: 0.05 }, // wider sweep + a little extra bite
    effectLabel: 'wider arc',
  },

  // Nobunaga — long-range precision matchlock. Fires a single fast piercing shot
  // at the nearest target. Effect adds pierce count (each bullet drills through
  // more enemies), leaning into the marksman / kiting identity.
  matchlock_volley: {
    id: 'matchlock_volley',
    name: 'Tanegashima Shot',
    kind: 'projectile_aimed',
    color: 0xffe08a,
    base: { damage: 22, cooldown: 820, count: 1, pierce: 2, speed: 680, spread: 0 },
    perPoint: { damage: 0.16, reach: 0.14, speed: 0.07 },
    effect: { countPerPoint: 0.34, piercePerPoint: 0.75 },
    effectLabel: '+pierce / shots',
  },

  // Belisarius — lobbed Greek fire pools. Effect adds pools and burn duration.
  greek_fire: {
    id: 'greek_fire',
    name: 'Greek Fire',
    kind: 'lob_aoe',
    color: 0xff7b1c,
    base: { damage: 10, cooldown: 1500, count: 1, radius: 70, duration: 1600, tick: 240, speed: 360 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    // 1 extra fire pool per effect point (was 0.34 + Math.floor → the first 2 points
    // added NOTHING, which read as a broken upgrade). Burn duration still grows too.
    effect: { countPerPoint: 1, durationPerPoint: 0.18 },
    effectLabel: '+1 fire pool / burn',
  },

  // Gilgamesh — orbiting golden blades from the Gate of Babylon treasury. Blades
  // circle the king persistently and shred anything they touch. Effect adds more
  // orbiters; reach grows the orbit radius; speed spins them faster. Every
  // revolution the blades also launch outward momentarily for bonus reach.
  divine_arsenal: {
    id: 'divine_arsenal',
    name: 'Divine Arsenal',
    kind: 'orbital',
    color: 0xffd700,
    base: { damage: 11, cooldown: 0, count: 5, orbitRadius: 62, orbitSpeed: 2.3 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 },
    // 1 orbiter per effect point (was 0.5 + Math.floor → a single point added NOTHING,
    // which read as broken). radiusPerPoint kept small since `reach` already grows it.
    effect: { countPerPoint: 1, radiusPerPoint: 5 },
    effectLabel: '+1 orbiting blade',
  },

  // Caesar — SIGNATURE: commands the legion. Periodically deploys legionary allies
  // that march out, seek the nearest foe and fight (a contact-damage ally unit).
  // Unique mechanic: the only hero who fields allied units. Effect adds legionaries.
  gladius: {
    id: 'gladius',
    name: 'Legionary Cohort',
    kind: 'summon',
    color: 0xcfd6e0,
    base: { damage: 16, cooldown: 2600, count: 1, allyHp: 40, allyLife: 7000, allySpeed: 150, allyRange: 30 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 }, // reach = ally lifespan/range; speed = deploy cadence
    effect: { countPerPoint: 1, damagePerPoint: 0.05 }, // +1 legionary per effect point
    effectLabel: '+1 legionary',
  },

  // Alexander — SIGNATURE: the phalanx. A long forward sarissa THRUST that skewers
  // every enemy in a narrow line ahead (not a radial sweep). Unique mechanic: the
  // only straight line-strike. Effect lengthens the line and adds bite.
  sarissa: {
    id: 'sarissa',
    name: 'Sarissa Phalanx',
    kind: 'line_thrust',
    color: 0xcdb070,
    base: { damage: 30, cooldown: 560, length: 150, width: 46 },
    perPoint: { damage: 0.16, reach: 0.16, speed: 0.07 }, // reach = line length
    effect: { lengthPerPoint: 14, damagePerPoint: 0.08 }, // longer line / damage
    effectLabel: 'longer line / damage',
  },

  // Genghis — SIGNATURE: the LURE-AND-TRAP hunter ("Scorched Steppe"). He does NOT
  // shoot at enemies — as he rides, he rakes the ground in his WAKE with caltrop fields
  // (persistent ground hazards) that shred whatever chases him. You herd the horde
  // across your own killing fields instead of aiming. Faster riding = a denser trail.
  // Unique mechanic: the only weapon that lays self-trailing damage zones; a totally
  // different loop from Nobunaga's aimed sniping (and from Belisarius, who LOBS pools
  // AT enemies — Genghis drops them behind himself).
  composite_bow: {
    id: 'composite_bow',
    name: 'Scorched Steppe',
    kind: 'trail',
    color: 0xb8860b,
    base: { damage: 8, cooldown: 620, radius: 46, duration: 2200, tick: 300, count: 1 },
    perPoint: { damage: 0.16, reach: 0.12, speed: 0.07 }, // reach = field size
    effect: { countPerPoint: 0.5, radiusPerPoint: 7 }, // bigger fields; every 2 pts +1 field
    effectLabel: '+field size / count',
  },

  // Ragnar — SIGNATURE: the boomerang axe. Thrown axes fly out to full range then
  // RETURN to Ragnar, hitting on BOTH legs (and re-hitting the same foe). Unique
  // mechanic: the only returning projectile. Effect adds axes.
  axe_throw: {
    id: 'axe_throw',
    name: 'Boomerang Axe',
    kind: 'boomerang',
    color: 0xb0b0c0,
    base: { damage: 26, cooldown: 720, count: 1, speed: 560, range: 230, spin: 22 },
    perPoint: { damage: 0.16, reach: 0.13, speed: 0.07 }, // reach = throw range
    effect: { countPerPoint: 1, damagePerPoint: 0.05 }, // +1 axe per effect point
    effectLabel: '+1 returning axe',
  },
};

export function getWeapon(id) {
  return WEAPONS[id];
}

// Human-readable description of what one more point in each axis does.
export const AXIS_INFO = {
  damage: { label: 'Damage', desc: '+16% weapon damage' },
  reach: { label: 'Range', desc: '+12% range / size' },
  speed: { label: 'Attack Speed', desc: '−7% cooldown' },
  effect: { label: 'Effect', desc: 'weapon-specific power' },
};
