// Optional pre-stage "contracts" (Hades-style Pact of Punishment): each binds a
// run-wide penalty for the stage in exchange for +1 artifact choice at the
// conquest (some add an extra in-stage perk). Up to 3 may be active per stage.
export const CONTRACTS = [
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    penalty: 'Enemies deal +25% damage',
    reward: '+1 artifact choice',
    enemyDmgMult: 1.25,
  },
  {
    id: 'horde',
    name: 'Endless Horde',
    penalty: 'Enemies have +35% HP',
    reward: '+1 artifact choice',
    enemyHpMult: 1.35,
  },
  {
    id: 'siege',
    name: 'Siege',
    penalty: 'Boss HP +40%',
    reward: '+1 artifact choice',
    bossHpMult: 1.4,
  },
  {
    id: 'scorched',
    name: 'Scorched Earth',
    penalty: 'No shrines this stage',
    reward: '+1 artifact choice',
    noShrines: true,
  },
  {
    id: 'frailty',
    name: 'Frailty',
    penalty: 'Your max HP −20%',
    reward: '+1 artifact choice & +25% XP',
    playerHpMult: 0.8,
    xpBonus: 0.25,
  },
];

export function getContract(id) {
  return CONTRACTS.find((c) => c.id === id);
}

// Aggregate active contract ids into a single effect object for a stage.
export function contractEffects(ids = []) {
  const eff = { enemyDmgMult: 1, enemyHpMult: 1, bossHpMult: 1, noShrines: false, playerHpMult: 1, xpBonus: 0 };
  for (const id of ids) {
    const c = getContract(id);
    if (!c) continue;
    if (c.enemyDmgMult) eff.enemyDmgMult *= c.enemyDmgMult;
    if (c.enemyHpMult) eff.enemyHpMult *= c.enemyHpMult;
    if (c.bossHpMult) eff.bossHpMult *= c.bossHpMult;
    if (c.noShrines) eff.noShrines = true;
    if (c.playerHpMult) eff.playerHpMult *= c.playerHpMult;
    if (c.xpBonus) eff.xpBonus += c.xpBonus;
  }
  return eff;
}
