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
  bossMemory: {},      // bossId -> { slainBy: n, slain: n } cross-run history
  chronicle: [],       // array of run records (capped at 30, newest first)
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

  // ── Boss Memory ────────────────────────────────────────────────────────────

  // Return { slainBy: n, slain: n } for a boss (0 if never encountered).
  getBossMemory(bossId) {
    const data = this.load();
    const mem = (data.bossMemory && data.bossMemory[bossId]) || {};
    return { slainBy: mem.slainBy || 0, slain: mem.slain || 0 };
  },

  // Increment slainBy[bossId] — call when the player dies while dueling that boss.
  recordBossFell(bossId) {
    if (!bossId) return;
    const data = this.load();
    data.bossMemory = data.bossMemory || {};
    data.bossMemory[bossId] = data.bossMemory[bossId] || { slainBy: 0, slain: 0 };
    data.bossMemory[bossId].slainBy = (data.bossMemory[bossId].slainBy || 0) + 1;
    this.save(data);
  },

  // Increment slain[bossId] — call when the player kills a boss in a duel finisher
  // or defeats them in the open world.
  recordBossSlain(bossId) {
    if (!bossId) return;
    const data = this.load();
    data.bossMemory = data.bossMemory || {};
    data.bossMemory[bossId] = data.bossMemory[bossId] || { slainBy: 0, slain: 0 };
    data.bossMemory[bossId].slain = (data.bossMemory[bossId].slain || 0) + 1;
    this.save(data);
  },

  // ── Dynasty Chronicle ──────────────────────────────────────────────────────

  // Append a run record; keeps newest-first, caps at 30.
  // record: { heroId, outcome ('fell'|'conquered'), stage, floor, killedBy,
  //           kills, heat, omen, civsConquered, ts }
  appendChronicleEntry(record) {
    const data = this.load();
    data.chronicle = data.chronicle || [];
    data.chronicle.unshift({ ...record, ts: record.ts || Date.now() });
    if (data.chronicle.length > 30) data.chronicle = data.chronicle.slice(0, 30);
    this.save(data);
  },

  // Returns the chronicle array (newest first).
  getChronicle() {
    return this.load().chronicle || [];
  },
};
