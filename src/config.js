// Global tuning knobs. Keep gameplay magic-numbers here so balancing is one file.
export const GAME = {
  width: 960,
  height: 540,
  // Half-extent of the playfield. The world is a TORUS: walk off one edge and you
  // wrap to the other side (see GameScene.wrapEntity). Kept a multiple of 128 so the
  // period (2×) is a multiple of the 256px ground tile → the ground stays seamless
  // across the wrap. 4096 ≈ 39s to cross at base speed: a long, varied loop.
  worldSize: 4096,
  // Each ability (primary / secondary / ultimate) maxes after this many upgrades;
  // past the cap, level-ups offer permanent HERO STAT boosts instead.
  upgradeCap: 20,
  bgColor: '#15131f',
};

export const SPRITE = {
  // Authoring resolution for placeholder + real art. 48px reads well at this scale.
  size: 48,
  enemy: 40,
  gem: 16,
  projectile: 16,
};

// Dungeon-floors tuning. Each civ stage is a descent of generated floors (rooms +
// corridors + walls + down-stairs) instead of one open arena. `GAME.worldSize` is no
// longer used for the playfield — FloorSystem sets the bounds per floor.
export const DUNGEON = {
  tile: 32,            // px per tile
  cols: 72,            // grid width  (72 * 32 = 2304px floor) — bigger map
  rows: 72,            // grid height
  // organic cellular-automata caverns (no rooms/corridors)
  caveFill: 0.45,      // initial wall probability — lower = more open / WIDER walkways
  caveSteps: 5,        // smoothing iterations (B5678/S45678-ish 5-rule)
  widenPasses: 1,      // post-smoothing floor-dilation passes (open pinch points)
  encounters: 3,       // scattered special zones per floor (trap/treasure/ambush)
  floorsPerStage: 15,
  floorsFinal: 30,
  // Dungeon-crawler combat feel (vs the old swarm): the player's attacks hit softer so
  // fights are deliberate, and early-floor enemies get bonus HP so nothing is one-shot
  // on arrival. earlyHpMult = 1 + max(0, earlyHpFloors - floor) * earlyHpBonus.
  playerDmgScale: 0.55, // multiplies all player damage to non-boss enemies
  earlyHpFloors: 4,     // enemies get bonus HP on floors below this
  earlyHpBonus: 0.5,    // +50% HP per floor under earlyHpFloors (floor 1 → ×2.5)
};

// XP needed to reach the *next* level, indexed by current level (1-based).
// Beyond the table we grow quadratically.
export function xpForLevel(level) {
  // Faster early levels so weapon customization kicks in quickly...
  const base = [0, 4, 7, 11, 16, 22, 29, 37, 46, 56];
  if (level < base.length) return base[level];
  // ...then an EXPONENTIAL late curve so the second-half XP flood (huge swarms) can't
  // runaway-level the player to 70+ with stacking damage points. Lands ~lv 30-40 by
  // the end of a stage instead of ~71. (Balance pass: steepen leveling.)
  return Math.floor(56 * Math.pow(1.15, level - 9));
}
