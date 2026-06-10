// Artifacts: permanent, run-defining boons granted after conquering a stage.
// They are significantly stronger than equipment and define a build.
// Each artifact has a `mods` bag using only the player mod keys that
// Player.recompute() aggregates.
//
// ITEM C: Champion relics — one per civ, granted as a guaranteed choice when
// that civ is conquered. Each has a `civId` tag, an `icon` reusing an existing
// texture key, and a one-line `lore` string in period voice.

export const ARTIFACTS = [
  // ── Champion Relics (one per civ) ─────────────────────────────────────────
  {
    id: 'heros_sword_china',
    civId: 'china',
    name: 'Dragon-Spine Jian',
    desc: '+28% Attack, +12% Effect Power — the sword of a Han dynasty war-hero.',
    lore: '"Forged beneath the Red Cliff by moonlight, it thirsts for worthy blood."',
    color: 0xe0563f,
    icon: 'axis_damage',
    mods: { damageMult: 0.28, effectMult: 0.12 },
  },
  {
    id: 'heros_sword_japan',
    civId: 'japan',
    name: 'Honjo Masamune',
    desc: '+30% Attack, +20% Move Speed — legendary blade said to cut foes before they draw.',
    lore: '"A sword with no equal; its edge is the silence before death."',
    color: 0x7c8cff,
    icon: 'axis_damage',
    mods: { damageMult: 0.30, speedMult: 0.20 },
  },
  {
    id: 'heros_sword_byzantium',
    civId: 'byzantium',
    name: 'Golden Labarum',
    desc: '+22% Defense, +20% Max HP, +15% Effect Power — the sacred standard of Constantinople.',
    lore: '"By this sign thou shalt conquer — so sayeth the Emperor of all Romans."',
    color: 0xc074e0,
    icon: 'icon_armor_epic',
    mods: { defense: 0.22, maxHpMult: 0.20, effectMult: 0.15 },
  },
  {
    id: 'heros_sword_sumer',
    civId: 'sumer',
    name: 'Tablet of Destinies',
    desc: '+40% XP, +25% Attack — the primordial clay tablet upon which all fates are written.',
    lore: '"He who holds the Tablet commands the destiny of all living things."',
    color: 0x33b8d6,
    icon: 'axis_amount',
    mods: { xpMult: 0.40, damageMult: 0.25 },
  },
  {
    id: 'heros_sword_rome',
    civId: 'rome',
    name: "Caesar's Laurel",
    desc: '+18% Defense, +18% Ranged Defense, +20 Max HP — the eternal crown of the Imperator.',
    lore: '"Veni, vidi, vici — and now these laurels mark the world\'s new master."',
    color: 0xd23b3b,
    icon: 'icon_hat_legendary',
    mods: { defense: 0.18, rangedDefense: 0.18, maxHpFlat: 20 },
  },
  {
    id: 'heros_sword_macedon',
    civId: 'macedon',
    name: 'Sarissa of the Phalanx',
    desc: '+35% Weapon Reach, +20% Attack Speed — the six-metre spear that broke every empire.',
    lore: '"Eighteen feet of ash and bronze; the world ends at its tip."',
    color: 0x3a7bd5,
    icon: 'axis_speed',
    mods: { reachMult: 0.35, cooldownMult: -0.20 },
  },
  {
    id: 'heros_sword_mongolia',
    civId: 'mongolia',
    name: "Genghis's Silver Bow",
    desc: '+30% Attack, +25% Pickup Range — the bow of the Great Khan, strung with lightning.',
    lore: '"The sky has but one sun; the earth, but one lord."',
    color: 0xc9a13a,
    icon: 'axis_haste',
    mods: { damageMult: 0.30, pickupMult: 0.25 },
  },
  {
    id: 'heros_sword_norse',
    civId: 'norse',
    name: 'Gungnir Shard',
    desc: '+0.7 HP/s Regen, +25% Attack, +10% Dodge — a splinter of Odin\'s spear, still humming with doom.',
    lore: '"Odin hurled it over the host; the rune on its shaft reads: all must fall."',
    color: 0x4f9fd6,
    icon: 'icon_pendant_legendary',
    mods: { regen: 0.7, damageMult: 0.25, dodge: 0.10 },
  },
  // ── General artifacts ──────────────────────────────────────────────────────
  {
    id: 'imperial_mandate',
    name: 'Imperial Mandate',
    desc: '+30% Attack, +20% Effect Power — the decree of a conquering emperor.',
    color: 0xd4af37,
    icon: 'axis_damage',
    mods: { damageMult: 0.30, effectMult: 0.20 },
  },
  {
    id: 'jade_seal',
    name: 'Jade Seal of Heaven',
    desc: '+45% Max HP, +10% Defense — the sacred seal that legitimizes rule.',
    color: 0x2ecc71,
    icon: 'icon_pendant_legendary',
    mods: { maxHpMult: 0.45, defense: 0.10 },
  },
  {
    id: 'vanguard_banner',
    name: 'Vanguard Banner',
    desc: '+22% Move Speed, +25% Pickup Range, -8% Attack Speed — the battle standard that leads the charge.',
    color: 0xe74c3c,
    icon: 'axis_haste',
    mods: { speedMult: 0.22, pickupMult: 0.25, cooldownMult: -0.08 },
  },
  {
    id: 'conquerors_pauldron',
    name: "Conqueror's Pauldron",
    desc: '+18% Defense, +15% Ranged Defense, +20% Max HP — shoulder-plate stripped from a hundred fallen warlords.',
    color: 0x7f8c8d,
    icon: 'icon_armor_epic',
    mods: { defense: 0.18, rangedDefense: 0.15, maxHpMult: 0.20 },
  },
  {
    id: 'bloodpact_ring',
    name: 'Bloodpact Ring',
    desc: '+35% Attack, +8% Lifesteal, -5% Max HP — forged in an oath sealed with blood.',
    color: 0x8e1a2e,
    icon: 'icon_ring_epic',
    mods: { damageMult: 0.35, lifesteal: 0.08, maxHpMult: -0.05 },
  },
  {
    id: 'silk_road_compass',
    name: 'Silk Road Compass',
    desc: '+45% XP, +40% Pickup Range — a navigator\'s relic that draws distant treasures near.',
    color: 0x3498db,
    icon: 'axis_amount',
    mods: { xpMult: 0.45, pickupMult: 0.40 },
  },
  {
    id: 'shadow_wraith_cloak',
    name: 'Shadow Wraith Cloak',
    desc: '+14% Dodge, +20% Move Speed, +12% Ranged Defense — worn by the empire\'s phantom assassins.',
    color: 0x1a1a2e,
    icon: 'icon_cape_rare',
    mods: { dodge: 0.14, speedMult: 0.20, rangedDefense: 0.12 },
  },
  {
    id: 'battle_drum',
    name: 'Battle Drum of the Warlord',
    desc: '+25% Attack Speed, +25% Weapon Reach — its rhythm drives warriors beyond mortal limits.',
    color: 0xe67e22,
    icon: 'axis_speed',
    mods: { cooldownMult: -0.25, reachMult: 0.25 },
  },
  {
    id: 'ancient_relic_core',
    name: 'Ancient Relic Core',
    desc: '+0.8 HP/s Regen, +35% Regen Cap, +60 Max HP — enables a true sustain build amid scarce healing.',
    color: 0x9b59b6,
    icon: 'axis_effect',
    mods: { regen: 0.8, regenCapBonus: 0.35, maxHpFlat: 60 },
  },
  {
    id: 'philosophers_crown',
    name: "Philosopher's Crown",
    desc: '+30% Effect Power, +35% Weapon Reach, -10% Attack — power of mind over matter, at a cost.',
    color: 0x5dade2,
    icon: 'icon_hat_legendary',
    mods: { effectMult: 0.30, reachMult: 0.35, damageMult: -0.10 },
  },
  {
    id: 'eternal_legionary_plate',
    name: 'Eternal Legionary Plate',
    desc: '+12% Damage Reduction, +15% Defense, +30 Max HP — forged for the soldiers who never came home.',
    color: 0xb8860b,
    icon: 'icon_armor_legendary',
    mods: { damageReduction: 0.12, defense: 0.15, maxHpFlat: 30 },
  },
];

/** Look up a single artifact by id. Returns undefined if not found. */
export function getArtifact(id) {
  return ARTIFACTS.find((a) => a.id === id);
}

/**
 * Return `count` distinct random artifacts whose ids are NOT in `excludeIds`.
 * If `civId` is supplied, the champion relic for that civ is ALWAYS injected as
 * one of the choices (if not already owned) — replacing a random slot so the
 * total stays at `count`.
 * If fewer than `count` artifacts remain after filtering, returns all remaining.
 */
export function rollArtifacts(count, excludeIds = [], civId = null) {
  // Resolve the civ relic for this conquest (if any and not already owned)
  const civRelic = civId
    ? ARTIFACTS.find((a) => a.civId === civId && !excludeIds.includes(a.id))
    : null;

  // Build the general pool: exclude civ-tagged relics + already-owned
  const generalPool = ARTIFACTS.filter(
    (a) => !a.civId && !excludeIds.includes(a.id),
  );
  const result = [];
  const available = generalPool.slice();

  // Fill up to `count` slots from the general pool
  const generalSlots = civRelic ? count - 1 : count;
  for (let i = 0; i < Math.min(generalSlots, available.length); i++) {
    const idx = Math.floor(Math.random() * available.length);
    result.push(available.splice(idx, 1)[0]);
  }

  // Inject the civ relic as the first choice so it's always visible
  if (civRelic) result.unshift(civRelic);

  return result;
}
