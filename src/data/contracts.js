// Optional pre-stage "contracts" / MANDATE OF HEAVEN mandates (Hades-style Pact
// of Punishment): each binds a run-wide penalty for the stage in exchange for
// +1 artifact choice at the conquest (some add an extra in-stage perk).
// Up to 3 may be active per stage.
//
// Each entry has an optional `heat` value (1-3 by severity).  The five original
// contracts default to heat 1; the five harder mandates (unlocked after the first
// full conquest) carry heat 2 or 3.  `mandateOnly: true` marks the harder
// mandates so they only appear after the MANDATE OF HEAVEN unlock.
export const CONTRACTS = [
  // ── Original contracts (always available) ────────────────────────────────
  {
    id: 'bloodlust',
    name: 'Bloodlust',
    penalty: 'Enemies deal +25% damage',
    reward: '+1 artifact choice',
    icon: 'contract_bloodlust',
    iconFallback: 'axis_damage',
    heat: 1,
    enemyDmgMult: 1.25,
  },
  {
    id: 'horde',
    name: 'Endless Horde',
    penalty: 'Enemies have +35% HP',
    reward: '+1 artifact choice',
    icon: 'contract_horde',
    iconFallback: 'axis_amount',
    heat: 1,
    enemyHpMult: 1.35,
  },
  {
    id: 'siege',
    name: 'Siege',
    penalty: 'Boss HP +40%',
    reward: '+1 artifact choice',
    icon: 'contract_siege',
    iconFallback: 'axis_power',
    heat: 1,
    bossHpMult: 1.4,
  },
  {
    id: 'scorched',
    name: 'Scorched Earth',
    penalty: 'No shrines this stage',
    reward: '+1 artifact choice',
    icon: 'contract_scorched',
    iconFallback: 'flame_pool',
    heat: 1,
    noShrines: true,
  },
  {
    id: 'frailty',
    name: 'Frailty',
    penalty: 'Your max HP −20%',
    reward: '+1 artifact choice & +25% XP',
    icon: 'contract_frailty',
    iconFallback: 'axis_area',
    heat: 1,
    playerHpMult: 0.8,
    xpBonus: 0.25,
  },
  // ── Harder mandates (mandateOnly — unlocked after first full conquest) ────
  {
    id: 'iron_elite',
    name: 'Iron Elite',
    penalty: 'Elite enemies have +25% HP',
    reward: '+1 artifact choice',
    icon: 'contract_horde',
    iconFallback: 'axis_amount',
    heat: 2,
    mandateOnly: true,
    eliteHpMult: 1.25,
  },
  {
    id: 'war_tithe',
    name: 'War Tithe',
    penalty: 'Merchants charge +50% gold',
    reward: '+1 artifact choice',
    icon: 'contract_scorched',
    iconFallback: 'axis_power',
    heat: 1,
    mandateOnly: true,
    merchantPriceMult: 1.50,
  },
  {
    id: 'famine',
    name: 'Famine',
    penalty: 'No hearts drop this stage',
    reward: '+1 artifact choice',
    icon: 'contract_frailty',
    iconFallback: 'axis_area',
    heat: 2,
    mandateOnly: true,
    noHearts: true,
  },
  {
    id: 'enrage',
    name: 'Enrage Protocol',
    penalty: 'Bosses enrage below 50% HP',
    reward: '+1 artifact choice',
    icon: 'contract_siege',
    iconFallback: 'axis_damage',
    heat: 3,
    mandateOnly: true,
    bossEnrageAt: 0.5,
  },
  {
    id: 'deep_budget',
    name: 'Heavy Reinforcement',
    penalty: 'Floor enemy budget +30%',
    reward: '+1 artifact choice',
    icon: 'contract_bloodlust',
    iconFallback: 'axis_amount',
    heat: 2,
    mandateOnly: true,
    floorBudgetMult: 1.30,
  },
];

export function getContract(id) {
  return CONTRACTS.find((c) => c.id === id);
}

// Aggregate active contract ids into a single effect object for a stage.
// Also returns `totalHeat` for use in reward scaling.
export function contractEffects(ids = []) {
  const eff = {
    enemyDmgMult: 1, enemyHpMult: 1, bossHpMult: 1,
    noShrines: false, playerHpMult: 1, xpBonus: 0,
    eliteHpMult: 1, merchantPriceMult: 1, noHearts: false,
    bossEnrageAt: 0, floorBudgetMult: 1,
    totalHeat: 0,
  };
  for (const id of ids) {
    const c = getContract(id);
    if (!c) continue;
    if (c.enemyDmgMult) eff.enemyDmgMult *= c.enemyDmgMult;
    if (c.enemyHpMult) eff.enemyHpMult *= c.enemyHpMult;
    if (c.bossHpMult) eff.bossHpMult *= c.bossHpMult;
    if (c.noShrines) eff.noShrines = true;
    if (c.playerHpMult) eff.playerHpMult *= c.playerHpMult;
    if (c.xpBonus) eff.xpBonus += c.xpBonus;
    if (c.eliteHpMult) eff.eliteHpMult *= c.eliteHpMult;
    if (c.merchantPriceMult) eff.merchantPriceMult *= c.merchantPriceMult;
    if (c.noHearts) eff.noHearts = true;
    if (c.bossEnrageAt) eff.bossEnrageAt = Math.max(eff.bossEnrageAt, c.bossEnrageAt);
    if (c.floorBudgetMult) eff.floorBudgetMult *= c.floorBudgetMult;
    eff.totalHeat += (c.heat || 1);
  }
  return eff;
}

// Sum the heat values for a list of contract ids.
export function totalHeatFor(ids = []) {
  return ids.reduce((sum, id) => {
    const c = getContract(id);
    return sum + (c ? (c.heat || 1) : 0);
  }, 0);
}
