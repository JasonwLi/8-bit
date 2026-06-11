// War Omens — run-wide twists offered at the start of a fresh run (stage 1, floor 1).
// Each omen has an id, name, description, and an `apply(run, player)` function called
// once (after the player entity exists in GameScene.create) to bake the effect in.
// Effects must use the same mod plumbing as traits/levelMods so PauseScene/WinScene
// can show them from run.omen without re-applying.

export const OMENS = [
  {
    id: 'comet',
    name: 'Omen of the Comet',
    desc: 'A wandering star grants a random Mutation at the run\'s dawn.',
    color: 0xb05aff,
    apply(run, player) {
      // Pick a random mutation not yet owned
      const ALL_MUTATIONS = [
        'ricochet_shots', 'echo_ultimate', 'reverse_knockback', 'gem_detonator',
        'fire_on_hit', 'secondary_autocast', 'homing_shots', 'kill_nova',
        'speed_on_kill', 'proj_split_on_expire',
      ];
      const owned = run.ownedMutations || [];
      const pool = ALL_MUTATIONS.filter((m) => !owned.includes(m));
      if (pool.length === 0) return;
      const chosen = pool[Math.floor(Math.random() * pool.length)];
      player.mutations = player.mutations || {};
      player.mutations[chosen] = true;
      run.mutations = { ...(player.mutations) };
      if (!run.ownedMutations) run.ownedMutations = [];
      if (!run.ownedMutations.includes(chosen)) run.ownedMutations.push(chosen);
      run._omenMutationId = chosen; // for UI display
    },
  },
  {
    id: 'iron_frugality',
    name: 'Iron Frugality',
    desc: 'Merchants sell at 25% off. Chests drop 1 less gold coin.',
    color: 0xffd700,
    apply(run) {
      run._omenMerchantDiscount = 0.75; // price multiplier
      run._omenChestGoldPenalty = 1;    // coins removed from chest bonus
    },
  },
  {
    id: 'wind_riders',
    name: 'Wind Riders',
    desc: '+1 dash charge. Maximum HP reduced by 8%.',
    color: 0x66ddff,
    apply(run, player) {
      // Add 1 dash charge — update both the current count and the max so the recharge
      // logic works correctly (Player.dashChargeMax drives the recharge array size).
      player.dashChargeMax = (player.dashChargeMax || 2) + 1;
      player.dashCharges = Math.min(player.dashCharges + 1, player.dashChargeMax);
      // Extend recharge timestamp array to match new max
      if (player.dashRecharge) player.dashRecharge.push(0);
      player.maxHp = Math.max(1, Math.round(player.maxHp * 0.92));
      player.hp = Math.min(player.hp, player.maxHp);
      run._omenDashBonus = 1;
      run._omenMaxHpMult = 0.92;
    },
  },
  {
    id: 'gilded_path',
    name: 'Gilded Path',
    desc: '+25% gold from all sources. Elite enemies have +10% HP.',
    color: 0xffd700,
    apply(run) {
      run._omenGoldMult = 1.25;
      run._omenEliteHpMult = 1.10;
    },
  },
  {
    id: 'old_wounds',
    name: 'Old Wounds',
    desc: 'Begin with a relic-tier item. Take +10% damage from stage-1 foes.',
    color: 0xff8a3a,
    apply(run) {
      run._omenOldWounds = true; // GameScene reads this to roll+equip item + apply damage taken
    },
  },
  {
    id: 'beast_tongue',
    name: 'Beast Tongue',
    desc: 'Beasts and spirits deal −15% damage to you. Humanoid foes deal +8% more.',
    color: 0x66dd88,
    apply(run) {
      run._omenBeastReduction = 0.85;  // multiplier on beast/spirit damage
      run._omenHumanoidBoost = 1.08;   // multiplier on humanoid damage
    },
  },
  {
    id: 'warlord_tax',
    name: 'Warlord\'s Tax',
    desc: 'Start with 40 gold. Lose 20% of carried gold on each floor descent.',
    color: 0xe8a040,
    apply(run) {
      run.gold = (run.gold || 0) + 40;
      run._omenFloorGoldTax = 0.20; // fraction deducted from gold on descent
    },
  },
  {
    id: 'iron_spine',
    name: 'Iron Spine',
    desc: '+20% Max HP. Primary weapon attacks 12% slower.',
    color: 0x88ccff,
    apply(run, player) {
      player.levelMods.maxHpMult = (player.levelMods.maxHpMult || 0) + 0.20;
      if (typeof player.recompute === 'function') player.recompute();
      player.hp = player.maxHp; // full heal to new max
      run._omenIronSpine = true; // WeaponSystem reads this to slow primary cadence 12%
    },
  },
  {
    id: 'blood_debt',
    name: 'Blood Debt',
    desc: 'Every 8th kill restores 12 HP. XP gain reduced by 15%.',
    color: 0xff6060,
    apply(run) {
      run._omenBloodDebtKillInterval = 8;
      run._omenBloodDebtHeal = 12;
      run._omenXpPenalty = 0.85; // multiplier on XP
    },
  },
  {
    id: 'shattered_sky',
    name: 'Shattered Sky',
    desc: 'All weapon and ability cooldowns −20%.',
    color: 0xc0a0ff,
    apply(run, player) {
      run._omenUltCdMult = 0.80; // persisted flag — used by the resume path to guard double-apply
      // Bake -20% cooldown into levelMods so it survives recompute() and stage transitions.
      // Guard against double-application if apply() is somehow called twice.
      if (!run._omenShatteredSkyApplied) {
        run._omenShatteredSkyApplied = true;
        if (player) {
          player.levelMods.cooldownMult = (player.levelMods.cooldownMult || 0) - 0.20;
          if (typeof player.recompute === 'function') player.recompute();
        }
      }
    },
  },
];

/** Pick 3 random unique omens for the OmenScene to present. */
export function rollOmens(count = 3) {
  const pool = OMENS.slice();
  const chosen = [];
  for (let i = 0; i < Math.min(count, pool.length); i++) {
    const idx = Math.floor(Math.random() * pool.length);
    chosen.push(pool.splice(idx, 1)[0]);
  }
  return chosen;
}

/** Get an omen definition by id. */
export function getOmen(id) {
  return OMENS.find((o) => o.id === id) || null;
}
