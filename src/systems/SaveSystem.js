// Browser-local run persistence (à la PokeRogue's session save): the current
// run is JSON, base64-encoded into localStorage, autosaved at stage boundaries
// and on exit. Cleared on death/victory. No server needed; easy to sync later.
const KEY = '8bit_dynasties_run_v1';

export const Save = {
  save(run) {
    try {
      localStorage.setItem(KEY, btoa(encodeURIComponent(JSON.stringify(run))));
    } catch (e) {
      /* storage unavailable — run simply won't persist */
    }
  },

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      return JSON.parse(decodeURIComponent(atob(raw)));
    } catch (e) {
      return null;
    }
  },

  clear() {
    try {
      localStorage.removeItem(KEY);
    } catch (e) {
      /* ignore */
    }
  },

  has() {
    return !!this.load();
  },
};

// ── Meta-progression: legacy coins (persists across runs, separate from the run save). ──
// Stored as plain JSON (small object, no encoding needed).
const LEGACY_KEY = '8bit_dynasties_legacy_v1';

// Versioned defaults: if a saved profile is missing any key it gets filled in
// so that old saves migrate forward cleanly without losing existing data.
const LEGACY_DEFAULTS = {
  coins: 0,
  boons: {},
  hasWonRun: false,    // set to true when the player wins a full conquest
  heroBestHeat: {},    // heroId -> highest mandateHeat cleared in a win
};

function applyLegacyDefaults(data) {
  const out = { ...data };
  for (const [k, v] of Object.entries(LEGACY_DEFAULTS)) {
    if (out[k] === undefined || out[k] === null) {
      out[k] = Array.isArray(v) ? [] : (typeof v === 'object' ? { ...v } : v);
    }
  }
  return out;
}

export const Legacy = {
  load() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      const parsed = raw ? JSON.parse(raw) : {};
      return applyLegacyDefaults(parsed);
    } catch (e) {
      return applyLegacyDefaults({});
    }
  },

  save(data) {
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(data));
    } catch (e) {
      /* storage unavailable */
    }
  },

  // Award coins at end of run and return the amount earned.
  // Formula: floor(kills/10) + total floors descended + 5 per conquered civ.
  // heatMult: legacy coin multiplier from mandate heat (1 + heat*0.15).
  awardCoins(kills, floorsDescended, conqueredCount, heatMult = 1) {
    const base = Math.floor(kills / 10) + floorsDescended + conqueredCount * 5;
    const earned = Math.round(base * heatMult);
    if (earned > 0) {
      const data = this.load();
      data.coins = (data.coins || 0) + earned;
      this.save(data);
    }
    return earned;
  },

  // Spend coins on a boon. Returns true if the purchase succeeded.
  buy(boonId, cost) {
    const data = this.load();
    if ((data.coins || 0) < cost) return false;
    data.coins -= cost;
    data.boons = data.boons || {};
    data.boons[boonId] = true;
    this.save(data);
    return true;
  },

  // Check if a boon is owned.
  hasBoon(boonId) {
    return !!(this.load().boons || {})[boonId];
  },

  // Consume a one-time boon (remove it after applying so it only buffs one run).
  consumeBoon(boonId) {
    const data = this.load();
    if (!(data.boons || {})[boonId]) return false;
    delete data.boons[boonId];
    this.save(data);
    return true;
  },

  // Mark that the player has completed a full conquest (enables MANDATE OF HEAVEN).
  markWonRun() {
    const data = this.load();
    if (!data.hasWonRun) {
      data.hasWonRun = true;
      this.save(data);
    }
  },

  // Check if the player has ever won a full run.
  hasWonRun() {
    return !!(this.load().hasWonRun);
  },

  // Record a win at a given mandate heat for a hero. Updates if heat > previous best.
  recordHeroHeat(heroId, heat) {
    const data = this.load();
    data.heroBestHeat = data.heroBestHeat || {};
    const prev = data.heroBestHeat[heroId] || 0;
    if (heat > prev) {
      data.heroBestHeat[heroId] = heat;
      this.save(data);
    }
  },

  // Get the best mandate heat cleared by a hero (0 if never won with this hero).
  getHeroBestHeat(heroId) {
    const data = this.load();
    return (data.heroBestHeat && data.heroBestHeat[heroId]) || 0;
  },
};
