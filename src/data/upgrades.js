// Level-up upgrade pool. Each upgrade's `apply(player)` mutates player state.
// `weight` controls how often it's offered. Weapon-level upgrades are generated
// dynamically in UpgradeScene (they depend on the player's equipped weapon).
export const UPGRADES = [
  {
    id: 'might',
    name: 'Might',
    desc: '+15% weapon damage',
    icon: 'up_might',
    weight: 10,
    apply: (p) => { p.might *= 1.15; },
  },
  {
    id: 'haste',
    name: 'Haste',
    desc: '-10% weapon cooldown',
    icon: 'up_haste',
    weight: 10,
    apply: (p) => { p.cooldownMult *= 0.9; },
  },
  {
    id: 'swift',
    name: 'Swift Boots',
    desc: '+10% move speed',
    icon: 'up_swift',
    weight: 8,
    apply: (p) => { p.speed *= 1.1; },
  },
  {
    id: 'vigor',
    name: 'Vigor',
    desc: '+25 max HP and heal',
    icon: 'up_vigor',
    weight: 8,
    apply: (p) => { p.maxHp += 25; p.heal(25); },
  },
  {
    id: 'regen',
    name: 'Regeneration',
    desc: '+0.5 HP/sec',
    icon: 'up_regen',
    weight: 6,
    apply: (p) => { p.regen += 0.5; },
  },
  {
    id: 'magnet',
    name: 'Lodestone',
    desc: '+30% pickup range',
    icon: 'up_magnet',
    weight: 7,
    apply: (p) => { p.pickup *= 1.3; },
  },
  {
    id: 'area',
    name: 'Reach',
    desc: '+15% weapon area / count',
    icon: 'up_area',
    weight: 7,
    apply: (p) => { p.areaMult *= 1.15; p.countBonus += 0; },
  },
];

export function getUpgrade(id) {
  return UPGRADES.find((u) => u.id === id);
}
