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
