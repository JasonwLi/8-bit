// Traits apply as additive modifier bags merged in Player.recompute().
// Keys (all optional): damageMult, cooldownMult (-=faster), speedMult, speedFlat,
// maxHpMult, maxHpFlat, reachMult, effectMult, damageReduction, dodge, xpMult,
// pickupMult. Mults are additive on a base of 1 (e.g. 0.10 = +10%).

// Shared by every character of a civilization.
export const CIV_TRAITS = {
  china: {
    id: 'china',
    name: 'Warring Mandate',
    desc: '+10% weapon damage',
    mods: { damageMult: 0.1 },
  },
  japan: {
    id: 'japan',
    name: 'Bushidō',
    desc: '+12% attack speed',
    mods: { cooldownMult: -0.12 },
  },
  byzantium: {
    id: 'byzantium',
    name: 'Theodosian Resolve',
    desc: '+12% damage reduction',
    mods: { damageReduction: 0.12 },
  },
  sumer: {
    id: 'sumer',
    name: 'Cradle of Civilization',
    desc: '+15% XP gained',
    mods: { xpMult: 0.15 },
  },
  rome: {
    id: 'rome',
    name: 'Legion Discipline',
    desc: '+6% damage reduction',
    mods: { damageReduction: 0.06 },
  },
  macedon: {
    id: 'macedon',
    name: 'Phalanx Reach',
    desc: '+12% weapon range',
    mods: { reachMult: 0.12 },
  },
  mongolia: {
    id: 'mongolia',
    name: 'Steppe Riders',
    desc: '+12% move speed',
    mods: { speedMult: 0.12 },
  },
  norse: {
    id: 'norse',
    name: 'Viking Fury',
    desc: '+8% damage',
    mods: { damageMult: 0.08 },
  },
};

// One per character: a minor buff paired with a minor debuff.
export const PERSONAL_TRAITS = {
  lubu: {
    id: 'peerless',
    name: 'Peerless',
    desc: '+15% damage, −10% max HP',
    mods: { damageMult: 0.15, maxHpMult: -0.1 },
  },
  nobunaga: {
    id: 'demon_king',
    name: 'Demon King',
    desc: '+15% attack speed, −12% max HP',
    mods: { cooldownMult: -0.15, maxHpMult: -0.12 },
  },
  belisarius: {
    id: 'last_roman',
    name: 'Last of the Romans',
    desc: '+20% max HP, −8% move speed',
    mods: { maxHpMult: 0.2, speedMult: -0.08 },
  },
  gilgamesh: {
    id: 'two_thirds_god',
    name: 'Two-Thirds God',
    desc: '+15% reach & effect, −12% attack speed',
    mods: { reachMult: 0.15, effectMult: 0.15, cooldownMult: 0.12 },
  },
  caesar: {
    id: 'veni_vidi_vici',
    name: 'Veni Vidi Vici',
    desc: '+10% damage, −6% max HP',
    mods: { damageMult: 0.10, maxHpMult: -0.06 },
  },
  alexander: {
    id: 'undefeated',
    name: 'Undefeated',
    desc: '+8% move speed, +6% damage, −6% max HP',
    mods: { speedMult: 0.08, damageMult: 0.06, maxHpMult: -0.06 },
  },
  genghis: {
    id: 'great_khan',
    name: 'Great Khan',
    desc: '+8% damage, −6% cooldowns, −5% max HP',
    mods: { damageMult: 0.08, cooldownMult: -0.06, maxHpMult: -0.05 },
  },
  ragnar: {
    id: 'berserker_soul',
    name: 'Berserker Soul',
    desc: '+10% move speed, +3% lifesteal, −8% max HP',
    mods: { speedMult: 0.10, lifesteal: 0.03, maxHpMult: -0.08 },
  },
};

export function getCivTrait(id) {
  return CIV_TRAITS[id];
}
export function getPersonalTrait(charId) {
  return PERSONAL_TRAITS[charId];
}
