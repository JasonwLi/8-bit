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

export const Legacy = {
  load() {
    try {
      const raw = localStorage.getItem(LEGACY_KEY);
      return raw ? JSON.parse(raw) : { coins: 0, boons: {} };
    } catch (e) {
      return { coins: 0, boons: {} };
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
  awardCoins(kills, floorsDescended, conqueredCount) {
    const earned = Math.floor(kills / 10) + floorsDescended + conqueredCount * 5;
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
};
