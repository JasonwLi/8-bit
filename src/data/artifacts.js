// Artifacts: permanent, run-defining boons granted after conquering a stage.
// They are significantly stronger than equipment and define a build.
// Each artifact has a `mods` bag using only the player mod keys that
// Player.recompute() aggregates.

export const ARTIFACTS = [
  {
    id: 'imperial_mandate',
    name: 'Imperial Mandate',
    desc: '+30% Attack, +20% Effect Power — the decree of a conquering emperor.',
    color: 0xd4af37,
    mods: { damageMult: 0.30, effectMult: 0.20 },
  },
  {
    id: 'jade_seal',
    name: 'Jade Seal of Heaven',
    desc: '+45% Max HP, +10% Defense — the sacred seal that legitimizes rule.',
    color: 0x2ecc71,
    mods: { maxHpMult: 0.45, defense: 0.10 },
  },
  {
    id: 'vanguard_banner',
    name: 'Vanguard Banner',
    desc: '+22% Move Speed, +25% Pickup Range, -8% Attack Speed — the battle standard that leads the charge.',
    color: 0xe74c3c,
    mods: { speedMult: 0.22, pickupMult: 0.25, cooldownMult: -0.08 },
  },
  {
    id: 'conquerors_pauldron',
    name: "Conqueror's Pauldron",
    desc: '+18% Defense, +15% Ranged Defense, +20% Max HP — shoulder-plate stripped from a hundred fallen warlords.',
    color: 0x7f8c8d,
    mods: { defense: 0.18, rangedDefense: 0.15, maxHpMult: 0.20 },
  },
  {
    id: 'bloodpact_ring',
    name: 'Bloodpact Ring',
    desc: '+35% Attack, +8% Lifesteal, -5% Max HP — forged in an oath sealed with blood.',
    color: 0x8e1a2e,
    mods: { damageMult: 0.35, lifesteal: 0.08, maxHpMult: -0.05 },
  },
  {
    id: 'silk_road_compass',
    name: 'Silk Road Compass',
    desc: '+45% XP, +40% Pickup Range — a navigator\'s relic that draws distant treasures near.',
    color: 0x3498db,
    mods: { xpMult: 0.45, pickupMult: 0.40 },
  },
  {
    id: 'shadow_wraith_cloak',
    name: 'Shadow Wraith Cloak',
    desc: '+14% Dodge, +20% Move Speed, +12% Ranged Defense — worn by the empire\'s phantom assassins.',
    color: 0x1a1a2e,
    mods: { dodge: 0.14, speedMult: 0.20, rangedDefense: 0.12 },
  },
  {
    id: 'battle_drum',
    name: 'Battle Drum of the Warlord',
    desc: '+25% Attack Speed, +25% Weapon Reach — its rhythm drives warriors beyond mortal limits.',
    color: 0xe67e22,
    mods: { cooldownMult: -0.25, reachMult: 0.25 },
  },
  {
    id: 'ancient_relic_core',
    name: 'Ancient Relic Core',
    desc: '+0.8 HP/s Regen, +35% Regen Cap, +60 Max HP — enables a true sustain build amid scarce healing.',
    color: 0x9b59b6,
    mods: { regen: 0.8, regenCapBonus: 0.35, maxHpFlat: 60 },
  },
  {
    id: 'philosophers_crown',
    name: "Philosopher's Crown",
    desc: '+30% Effect Power, +35% Weapon Reach, -10% Attack — power of mind over matter, at a cost.',
    color: 0x5dade2,
    mods: { effectMult: 0.30, reachMult: 0.35, damageMult: -0.10 },
  },
  {
    id: 'eternal_legionary_plate',
    name: 'Eternal Legionary Plate',
    desc: '+12% Damage Reduction, +15% Defense, +30 Max HP — forged for the soldiers who never came home.',
    color: 0xb8860b,
    mods: { damageReduction: 0.12, defense: 0.15, maxHpFlat: 30 },
  },
];

/** Look up a single artifact by id. Returns undefined if not found. */
export function getArtifact(id) {
  return ARTIFACTS.find((a) => a.id === id);
}

/**
 * Return `count` distinct random artifacts whose ids are NOT in `excludeIds`.
 * If fewer than `count` artifacts remain after filtering, returns all remaining.
 */
export function rollArtifacts(count, excludeIds = []) {
  const pool = ARTIFACTS.filter((a) => !excludeIds.includes(a.id));
  const result = [];
  const available = pool.slice();
  for (let i = 0; i < Math.min(count, available.length); i++) {
    const idx = Math.floor(Math.random() * available.length);
    result.push(available.splice(idx, 1)[0]);
  }
  return result;
}
