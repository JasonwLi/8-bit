// MapleStory-style equipment: one item per slot. The Weapon slot is the
// character's fixed signature weapon (never dropped). The other 8 slots take
// dropped items. Each item carries a `mods` bag (same shape as traits) that
// Player.recompute() aggregates.

// Slot order is also the display order in the HUD.
export const SLOTS = [
  { id: 'weapon', name: 'Weapon', fixed: true, icon: 'icon_weapon' },
  { id: 'hat', name: 'Hat', icon: 'icon_hat', domain: 'Max HP' },
  { id: 'armor', name: 'Armor', icon: 'icon_armor', domain: 'Damage Reduction' },
  { id: 'gloves', name: 'Gloves', icon: 'icon_gloves', domain: 'Attack Speed' },
  { id: 'boots', name: 'Boots', icon: 'icon_boots', domain: 'Move Speed' },
  { id: 'cape', name: 'Cape', icon: 'icon_cape', domain: 'Dodge' },
  { id: 'shield', name: 'Shield', icon: 'icon_shield', domain: 'Block / HP' },
  { id: 'ring', name: 'Ring', icon: 'icon_ring', domain: 'Damage' },
  { id: 'pendant', name: 'Pendant', icon: 'icon_pendant', domain: 'XP / Pickup' },
];

// Slots that can actually drop as loot.
export const DROP_SLOTS = SLOTS.filter((s) => !s.fixed);

// `weight` is the BASE roll weight at luck 0 (run start): heavily common, so high
// tiers are genuinely rare early. `pickRarity(luck)` shifts these as the run gets
// harder (deeper stage + more time) or the character is lucky — see RARITY_SHIFT.
export const RARITIES = [
  { id: 'common',    name: 'Common',    color: 0xb8b8c0, textColor: '#cfcfda', mult: 1.0, weight: 60 },
  { id: 'rare',      name: 'Rare',      color: 0x3aa0ff, textColor: '#6ec1ff', mult: 1.6, weight: 30 },
  { id: 'epic',      name: 'Epic',      color: 0xb15bff, textColor: '#cf94ff', mult: 2.4, weight: 8 },
  { id: 'legendary', name: 'Legendary', color: 0xffb02e, textColor: '#ffd27a', mult: 3.5, weight: 2 },
];

// Per-rarity weight shift applied per point of `luck`. Common scales DOWN; epic and
// legendary scale UP fastest — so the loot pool flips from common-heavy (early) to
// high-tier-rich (late / lucky). Legendary grows a touch slower than epic so it
// stays the rarest tier.
const RARITY_SHIFT = [-1.4, 0, 0.9, 0.5];

export function getSlot(id) {
  return SLOTS.find((s) => s.id === id);
}

// ---------- helpers ----------

/** Return a random float in [lo, hi]. */
function rnd(lo, hi) {
  return lo + Math.random() * (hi - lo);
}

/** Return a random integer in [lo, hi] inclusive. */
function rndInt(lo, hi) {
  return Math.floor(lo + Math.random() * (hi - lo + 1));
}

/** Pick `count` unique items from an array (no replacement). */
function pickN(arr, count) {
  const copy = arr.slice();
  const out = [];
  for (let i = 0; i < Math.min(count, copy.length); i++) {
    const idx = Math.floor(Math.random() * copy.length);
    out.push(copy.splice(idx, 1)[0]);
  }
  return out;
}

function pickRarity(luck = 0) {
  const weights = RARITIES.map((r, i) => Math.max(0.5, r.weight + luck * RARITY_SHIFT[i]));
  const total = weights.reduce((a, b) => a + b, 0);
  let n = Math.random() * total;
  for (let i = 0; i < RARITIES.length; i++) {
    n -= weights[i];
    if (n <= 0) return RARITIES[i];
  }
  return RARITIES[0];
}

/** Scale mods by rarity multiplier; Flat keys (and luck) are rounded to integers. */
function scaleMods(mods, mult) {
  const out = {};
  for (const [k, v] of Object.entries(mods)) {
    out[k] = (k.endsWith('Flat') || k === 'luck')
      ? Math.round(v * mult)
      : Math.round(v * mult * 1000) / 1000;
  }
  return out;
}

// ---------- stat generators ----------
// Each generator returns a fresh random value in the "base" (Common) range.
// Rarity mult is applied afterwards in scaleMods().

const STAT_GEN = {
  maxHpFlat:      () => rndInt(15, 45),
  maxHpMult:      () => rnd(0.04, 0.10),
  damageReduction:() => rnd(0.02, 0.06),
  defense:        () => rnd(0.03, 0.10),
  rangedDefense:  () => rnd(0.03, 0.10),
  dodge:          () => rnd(0.03, 0.08),
  lifesteal:      () => rnd(0.01, 0.04),
  regen:          () => rnd(0.02, 0.08),
  regenCapBonus:  () => rnd(0.03, 0.08),
  cooldownMult:   () => -rnd(0.04, 0.10),
  damageMult:     () => rnd(0.05, 0.15),
  speedFlat:      () => rndInt(10, 28),
  speedMult:      () => rnd(0.04, 0.10),
  reachMult:      () => rnd(0.06, 0.14),
  effectMult:     () => rnd(0.06, 0.14),
  xpMult:         () => rnd(0.08, 0.18),
  pickupMult:     () => rnd(0.08, 0.18),
  luck:           () => rndInt(2, 4), // raises the rarity of future drops
};

// ---------- slot definitions ----------
// Each slot entry:
//   primary  : stat key that always appears
//   secondary: pool of optional keys (drawn randomly based on rarity)
//   flavors  : per-rarity name prefixes/suffixes for flavor

const SLOT_DEFS = {
  hat: {
    primary:   'maxHpFlat',
    secondary: ['maxHpMult', 'defense', 'regen', 'regenCapBonus'],
    flavors:   ['Thinker\'s', 'Scholar\'s', 'Sage\'s', 'Oracle\'s'],
  },
  armor: {
    primary:   'defense',
    secondary: ['damageReduction', 'maxHpFlat', 'maxHpMult', 'regen'],
    flavors:   ['Guardian\'s', 'Sentinel\'s', 'Bulwark', 'Titan\'s'],
  },
  gloves: {
    primary:   'cooldownMult',
    secondary: ['damageMult', 'reachMult', 'effectMult', 'lifesteal'],
    flavors:   ['Swift', 'Warlord\'s', 'Berserker\'s', 'Slayer\'s'],
  },
  boots: {
    primary:   'speedFlat',
    secondary: ['speedMult', 'dodge', 'pickupMult', 'xpMult'],
    flavors:   ['Nimble', 'Wanderer\'s', 'Sprinter\'s', 'Phantom\'s'],
  },
  cape: {
    primary:   'dodge',
    secondary: ['rangedDefense', 'speedMult', 'regenCapBonus', 'xpMult', 'luck'],
    flavors:   ['Shadow', 'Wind\'s', 'Phantom\'s', 'Void'],
  },
  shield: {
    primary:   'rangedDefense',
    secondary: ['defense', 'damageReduction', 'maxHpFlat', 'regen'],
    flavors:   ['Iron', 'Aegis', 'Warden\'s', 'Fortress'],
  },
  ring: {
    primary:   'damageMult',
    secondary: ['lifesteal', 'reachMult', 'effectMult', 'cooldownMult', 'luck'],
    flavors:   ['Warrior\'s', 'Bloodthirst', 'Destroyer\'s', 'Annihilator\'s'],
  },
  pendant: {
    primary:   'xpMult',
    secondary: ['pickupMult', 'regen', 'regenCapBonus', 'maxHpMult', 'luck'],
    flavors:   ['Curious', 'Seeker\'s', 'Archivist\'s', 'Ascendant'],
  },
};

// How many secondary stats to add based on rarity index (0=common…3=legendary).
// Common: 0–1, Rare: 1–2, Epic: 2–3, Legendary: 3–4
const SECONDARY_COUNT = [
  [0, 1],  // common  → 0 or 1
  [1, 2],  // rare    → 1 or 2
  [2, 3],  // epic    → 2 or 3
  [3, 4],  // legendary → 3 or 4
];

// ---------- item name generation ----------

function flavoredName(rarityName, slotName, flavors, rarityIndex) {
  const flavor = flavors[Math.min(rarityIndex, flavors.length - 1)];
  // legendary / epic get full flavor; rare gets prefix only; common stays plain
  if (rarityIndex === 0) return `${rarityName} ${slotName}`;
  if (rarityIndex === 1) return `${rarityName} ${flavor} ${slotName}`;
  return `${rarityName} ${flavor} ${slotName}`;
}

// ---------- public API ----------

// Roll a random item. `luck` (campaign stage + elapsed time + character luck;
// computed by the caller) biases the rarity roll toward higher tiers.
export function rollItem(luck = 0, slotId = null, powerMult = 1) {
  const slot = slotId
    ? getSlot(slotId)
    : DROP_SLOTS[Math.floor(Math.random() * DROP_SLOTS.length)];
  const rarity = pickRarity(luck);
  const rarityIndex = RARITIES.indexOf(rarity);
  const def = SLOT_DEFS[slot.id];

  // Build the base mods (before rarity scaling)
  const baseMods = {};

  // Primary stat always present
  baseMods[def.primary] = STAT_GEN[def.primary]();

  // Pick secondary stats
  const [minSec, maxSec] = SECONDARY_COUNT[rarityIndex];
  const secCount = rndInt(minSec, maxSec);
  if (secCount > 0) {
    // Never duplicate the primary key in the pool
    const pool = def.secondary.filter((k) => k !== def.primary);
    const picked = pickN(pool, secCount);
    for (const key of picked) {
      baseMods[key] = STAT_GEN[key]();
    }
  }

  const mods = scaleMods(baseMods, rarity.mult * powerMult); // powerMult = depth-based stat scaling

  return {
    slot: slot.id,
    slotName: slot.name,
    icon: `icon_${slot.id}_${rarity.id}`, // rarity-specific icon (falls back to slot.icon in the UI)
    baseIcon: slot.icon,
    rarity: rarity.id,
    rarityName: rarity.name,
    color: rarity.color,
    textColor: rarity.textColor,
    name: flavoredName(rarity.name, slot.name, def.flavors, rarityIndex),
    mods,
  };
}

// Pretty multi-line summary of an item's mods for the loot modal.
export function describeMods(mods) {
  const parts = [];
  const fmt = {
    maxHpFlat:       (v) => `+${v} Health`,
    maxHpMult:       (v) => `+${Math.round(v * 100)}% Health`,
    defense:         (v) => `+${Math.round(v * 100)}% Defense`,
    rangedDefense:   (v) => `+${Math.round(v * 100)}% Ranged Defense`,
    damageReduction: (v) => `+${Math.round(v * 100)}% Damage Reduction`,
    dodge:           (v) => `+${Math.round(v * 100)}% Dodge`,
    lifesteal:       (v) => `+${Math.round(v * 100)}% Lifesteal`,
    regen:           (v) => `+${v.toFixed(2)} HP/s Regen`,
    regenCapBonus:   (v) => `+${Math.round(v * 100)}% Regen Cap`,
    cooldownMult:    (v) => `+${Math.abs(Math.round(v * 100))}% Attack Speed`,
    damageMult:      (v) => `+${Math.round(v * 100)}% Attack`,
    speedFlat:       (v) => `+${v} Move Speed`,
    speedMult:       (v) => `+${Math.round(v * 100)}% Move Speed`,
    reachMult:       (v) => `+${Math.round(v * 100)}% Weapon Reach`,
    effectMult:      (v) => `+${Math.round(v * 100)}% Effect Power`,
    xpMult:          (v) => `+${Math.round(v * 100)}% XP`,
    pickupMult:      (v) => `+${Math.round(v * 100)}% Pickup Range`,
    luck:            (v) => `+${Math.round(v)} Luck (better drops)`,
  };
  for (const [k, v] of Object.entries(mods)) {
    if (fmt[k]) parts.push(fmt[k](v));
  }
  return parts.join('\n');
}
