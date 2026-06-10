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
  // Retro motion: quantise the DISPLAYED position of moving things to this pixel grid
  // (render-only, physics untouched) so motion steps pixel-by-pixel instead of gliding
  // on the fine sub-pixel grid — kills the "floaty / too-smooth" slide. 1 = off (smooth),
  // 2 = subtle (slow mobs still glide-step), 3 = chunky (slow mobs start to stutter),
  // 4 = very chunky. See GameScene.snapRender.
  pixelStep: 1,
  // How tightly the camera follows the player (0–1). LOW = floaty/laggy world-slide
  // (0.12 was the original, too smooth); 1 = rigid lock-step (pins the player dead-centre
  // so its own stepping never shows on screen). A MIDDLE value lets the player drift off
  // centre a touch so you actually see it pixel-step, without the world gliding. See
  // GameScene.startFollow.
  cameraLerp: 0.35,
  // Procedural WALK BOB: the sprites are single-frame (no walk-cycle art), so without
  // this they glide. While a character moves, hop its sprite up-and-down in step with the
  // distance travelled so it reads as walking/running rather than floating. Render-only.
  // amp = hop height in px (0 = off), stride = px travelled per hop (smaller = faster steps).
  walkBobAmp: 0,
  walkBobStride: 16,
  // Proper walk animation for single-frame sprites: while a character MOVES, rock its
  // sprite side-to-side (a rotation wobble) in step with the distance travelled, easing
  // upright when it stops. Rotation is RENDER-ONLY — arcade bodies are axis-aligned, so it
  // never touches physics/position/camera (safe on the player too, unlike the old y-bob).
  // angle = max rock in radians (0 = off), stride = px travelled per half-rock.
  walkWobbleAngle: 0.04,
  walkWobbleStride: 26,
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
  playerDmgScale: 0.72, // multiplies all player damage to non-boss enemies (snappier than 0.55)
  earlyHpFloors: 4,     // enemies get bonus HP on floors below this
  earlyHpBonus: 0.35,   // +35% HP per floor under earlyHpFloors (floor 1 → ×2.0)
};

// XP needed to reach the *next* level, indexed by current level (1-based).
// Beyond the table we grow quadratically.
export function xpForLevel(level) {
  // Faster early levels so weapon customization kicks in quickly...
  const base = [0, 4, 7, 11, 16, 22, 29, 37, 46, 56];
  if (level < base.length) return base[level];
  // ...then a gentler exponential so late floors still yield upgrade choices at a
  // good cadence. Was 1.15 — flattened to 1.10 to avoid an XP dead zone on deep floors
  // where kills barely dent the bar. Lands ~lv 35-50 by the end of a full stage.
  return Math.floor(56 * Math.pow(1.10, level - 9));
}
