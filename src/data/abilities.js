// The character's ULTIMATE per character (cast with SPACE on a long ~10s
// cooldown). Like weapons, ultimates scale via invested points — but along their
// OWN axes (power / haste / area / amount) which differ from the weapon's
// (damage / reach / speed / effect). `kind` selects the cast behavior in
// systems/AbilitySystem.js. Casting also grants brief invulnerability and opens
// the musou empowered window (see AbilitySystem). Tuned big for a 10s cadence.
export const ABILITIES = {
  // Lü Bu — a war cry shockwave that damages and knocks back everything around him.
  warcry: {
    id: 'warcry',
    name: 'War Cry',
    kind: 'nova',
    color: 0xff5252,
    desc: 'A staggering shockwave erupts around you.',
    base: { cooldown: 10000, damage: 140, radius: 160, knockback: 70, count: 1 },
    axes: [
      { slot: 'power',  kind: 'power',  label: 'Fury',           desc: '+20% shockwave damage' },
      { slot: 'area',   kind: 'area',   label: "Warlord's Reach", desc: '+15% blast radius' },
      { slot: 'amount', kind: 'amount', label: 'Echoing Roar',   desc: '+1 shockwave pulse' },
      { slot: 'haste',  kind: 'haste',  label: 'Battle Tempo',   desc: '−8% cooldown' },
    ],
  },
  // Nobunaga — lobs explosive cannon shells onto distant foes.
  barrage: {
    id: 'barrage',
    name: 'Cannon Barrage',
    kind: 'artillery',
    color: 0xffc14d,
    desc: 'Explosive shells rain down on the enemy.',
    base: { cooldown: 10000, damage: 66, radius: 96, count: 5, speed: 420, leaveBurn: { radius: 80, dmg: 9, dur: 1400 } },
    axes: [
      { slot: 'power',  kind: 'power',  label: 'Heavy Shells',     desc: '+20% shell damage' },
      { slot: 'area',   kind: 'area',   label: 'Wide Bombardment', desc: '+15% blast radius' },
      { slot: 'amount', kind: 'amount', label: '+Shell',           desc: '+1 cannon shell' },
      { slot: 'haste',  kind: 'burn',   label: 'Incendiary',       desc: 'Shells leave burning craters' },
    ],
  },
  // Belisarius — a cataphract lance-charge that tramples a line of enemies.
  cataphract: {
    id: 'cataphract',
    name: 'Cataphract Charge',
    kind: 'charge',
    color: 0x9b6bff,
    desc: 'Heavy cavalry tramples a path through the foe.',
    base: { cooldown: 10000, damage: 150, width: 88, count: 1, speed: 760, length: 820 },
    axes: [
      { slot: 'power',  kind: 'power',  label: 'Lance Force',  desc: '+20% charge damage' },
      { slot: 'amount', kind: 'amount', label: '+Lancer',      desc: '+1 charge lancer' },
      { slot: 'area',   kind: 'area',   label: 'Trample',      desc: '+15% lane width' },
      { slot: 'haste',  kind: 'haste',  label: 'Swift Charge', desc: '−8% cooldown' },
    ],
  },
  // Gilgamesh — calls meteors down on enemy clusters.
  meteors: {
    id: 'meteors',
    name: "Heaven's Fall",
    kind: 'meteor',
    color: 0xffd34d,
    desc: 'Meteors crash down where enemies gather.',
    base: { cooldown: 10000, damage: 92, radius: 106, count: 5, delay: 600, leaveBurn: { radius: 100, dmg: 12, dur: 1600 } },
    axes: [
      { slot: 'power',  kind: 'power',  label: 'Heavier Meteors', desc: '+20% impact damage' },
      { slot: 'area',   kind: 'area',   label: 'Wider Impact',    desc: '+15% blast radius' },
      { slot: 'amount', kind: 'amount', label: '+Meteor',         desc: '+1 meteor' },
      { slot: 'haste',  kind: 'burn',   label: 'Cataclysm',       desc: 'Meteors leave scorched craters' },
    ],
  },
  // Caesar — DEFENSIVE: a legion shield-wall slams outward AND fortifies Caesar,
  // halving damage taken for a few seconds (vs Lü Bu's offensive war cry).
  testudo: {
    id: 'testudo',
    name: 'Testudo',
    kind: 'nova',
    color: 0xd4af37,
    rally: true,
    desc: 'A legion shield-wall slams out and fortifies you (−55% damage taken).',
    base: { cooldown: 10000, damage: 120, radius: 160, knockback: 70, count: 1 },
    selfBuffs: [{ kind: 'defense', mult: 0.45, dur: 4000 }], // take 45% damage for 4s
    axes: [
      { slot: 'power',  kind: 'power',  label: 'Shield Slam',  desc: '+20% slam damage' },
      { slot: 'amount', kind: 'amount', label: '+Pulse',        desc: '+1 shockwave pulse' },
      { slot: 'area',   kind: 'buff',   label: 'Shield Wall',  desc: 'Stronger & longer defense buff' },
      { slot: 'haste',  kind: 'haste',  label: 'Rally',        desc: '−8% cooldown; heals nearby legionaries' },
    ],
  },
  // Alexander — a WEDGE of Companion cavalry: three spear-lanes fan out at once
  // (vs Belisarius's single heavy cataphract lance). Distinct visual (spear streaks).
  companion_charge: {
    id: 'companion_charge',
    name: 'Companion Charge',
    kind: 'charge',
    color: 0xd4af37,
    chargeSprite: 'companion_rider', // a Macedonian Companion cavalryman (distinct from the Byzantine cataphract)
    desc: 'The Companion cavalry thunders through in a three-lane wedge.',
    base: { cooldown: 10000, damage: 95, width: 84, length: 440, speed: 580, count: 3 },
    amountLabel: '+1 charge lane',
  },
  // Alexander — WRATH OF RA. Hailed son of Amun-Ra in Egypt, he calls down a sweeping
  // BEAM of solar fire that scythes across the field — a unique beam-sweep mechanic, not
  // another cavalry charge (was too close to Belisarius's cataphract). `count` = sweeps.
  wrath_of_ra: {
    id: 'wrath_of_ra',
    name: 'Wrath of Ra',
    kind: 'solar_beam',
    color: 0xffd24a, // sun gold
    desc: 'As the son of Amun-Ra, sweep a beam of solar fire across the field, scorching all it crosses.',
    base: { cooldown: 10000, damage: 130, length: 440, width: 78, arc: 155, sweepMs: 780, count: 1, leaveBurn: { radius: 70, dmg: 8, dur: 1300 } },
    axes: [
      { slot: 'power',  kind: 'power',  label: 'Solar Power', desc: '+20% beam damage' },
      { slot: 'area',   kind: 'area',   label: 'Wider Arc',   desc: '+15% beam width' },
      { slot: 'amount', kind: 'amount', label: '+Sweep',      desc: '+1 solar sweep pass' },
      { slot: 'haste',  kind: 'burn',   label: 'Scorch',      desc: 'Beam leaves scorched ground in its wake' },
    ],
  },
  // Genghis — ENCIRCLEMENT (distinct from Gilgamesh's targeted meteor-scatter): a sky
  // volley rings YOU in a perimeter of caltrop fields, and a shockwave herds the swarm
  // OUTWARD onto the spikes. Ties to his lure-and-trap identity — not a rain on clusters.
  sky_arrows: {
    id: 'sky_arrows',
    name: 'Encirclement',
    kind: 'encircle',
    color: 0xb8860b,
    desc: 'A sky-volley rings you in caltrop fields; a shockwave drives the horde onto the spikes.',
    base: { cooldown: 10000, damage: 14, radius: 210, count: 14, knockback: 110, fieldRadius: 58, duration: 3200, tick: 320 },
    axes: [
      { slot: 'power',  kind: 'power',  label: 'Heavier Volley', desc: '+20% caltrop damage' },
      { slot: 'amount', kind: 'amount', label: 'Ring Density',   desc: '+1 caltrop field in the ring' },
      { slot: 'area',   kind: 'area',   label: 'Wider Ring',     desc: '+15% ring radius' },
      { slot: 'haste',  kind: 'haste',  label: 'Swift Reload',   desc: '−8% cooldown' },
    ],
  },
  // Ragnar — RAGE: a war-rage nova that also empowers Ragnar (+60% damage, +20% move
  // speed) for a few seconds (vs Caesar's defensive testudo).
  berserker: {
    id: 'berserker',
    name: 'Berserker Rage',
    kind: 'nova',
    color: 0xd23a3a,
    desc: 'A war-rage nova erupts and sends you berserk (+60% damage, +20% speed).',
    base: { cooldown: 10000, damage: 135, radius: 155, knockback: 80, count: 1 },
    selfBuffs: [{ kind: 'damage', mult: 1.6, dur: 5000 }, { kind: 'speed', mult: 1.2, dur: 5000 }],
    axes: [
      { slot: 'power',  kind: 'power',  label: 'Rage',         desc: '+20% nova damage' },
      { slot: 'amount', kind: 'amount', label: '+Pulse',        desc: '+1 rage pulse' },
      { slot: 'area',   kind: 'buff',   label: 'Bloodrage',    desc: 'Stronger & longer berserk buff' },
      { slot: 'haste',  kind: 'haste',  label: 'Battle Tempo', desc: '−8% cooldown' },
    ],
  },
};

export function getAbility(id) {
  return ABILITIES[id];
}

// Ability upgrade axes (distinct from weapon axes). `amount` uses the ability's
// own amountLabel for its description.
export const ABILITY_AXIS_INFO = {
  power: { label: 'Power', desc: '+20% ability damage' },
  haste: { label: 'Frequency', desc: '−8% ability cooldown' },
  area: { label: 'Blast Radius', desc: '+15% blast radius' },
  amount: { label: 'Multitude', desc: 'more projectiles / pulses' },
};
