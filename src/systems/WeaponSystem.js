import Phaser from 'phaser';
import { getWeapon } from '../data/weapons.js';
import { getSecondary } from '../data/secondaries.js';
import { Audio } from './AudioManager.js';
import { GAME } from '../config.js';

// Lightweight monotonic time getter used by the orbital hit-cooldown system.
function _getTime(scene) {
  return scene.time ? scene.time.now : Date.now();
}

// Drives an attack with four customization axes (damage / reach / speed /
// effect). One instance powers the PRIMARY weapon (auto-fires via update()), a
// second powers the SECONDARY attack (manual castManual() on a cooldown). The
// `weaponId` resolves against weapons.js first, then secondaries.js. Effective
// stats derive each fire from: base + invested points + player modifiers.
export default class WeaponSystem {
  constructor(scene, player, weaponId) {
    this.scene = scene;
    this.player = player;
    this.weaponId = weaponId;
    // Per-skill upgrade points. New skills declare their own 4 `axes` (data-driven,
    // flavored); legacy skills fall back to the fixed damage/reach/speed/effect.
    const ax = this.def().axes;
    this.points = ax ? Object.fromEntries(ax.map((a) => [a.id, 0])) : { damage: 0, reach: 0, speed: 0, effect: 0 };
    this.timer = 0;
    this.lastCooldown = (this.def().base.cooldown) || 1000; // for readyFraction()
    this._aimOverride = null; // when set, fire toward this angle instead of auto-targeting
    // Evolution: once eligible (cap reached + run has an artifact), the player may pick
    // the golden EVOLVE card. Setting evolved=true merges def.evolution.overlay over base.
    this.evolved = false;

    // --- Orbital system (Gilgamesh divine_arsenal) ---
    // Persistent blade sprites that circle the player and damage nearby enemies.
    this._orbiters = []; // { sprite, angle, hitCooldowns: Map<enemy, ms> }
    this._orbiterAngle = 0; // master orbit rotation (radians, advances per frame)
    this._orbiterDamageTick = 0; // ms accumulator for proximity damage checks
    this._orbiterCount = 0; // track re-sync when count changes
    // Treasury Unleashed evolution: accumulated ms toward the next ejection burst
    this._orbitalEjectAcc = 0;
  }

  def() {
    return getWeapon(this.weaponId) || getSecondary(this.weaponId);
  }

  // Effective base: returns def.base merged with the evolution overlay (partial
  // field overrides + optional behavior flags). When not evolved, returns def.base
  // unchanged (same object — no copy cost). Both computeStats paths use this so
  // the overlay is automatically respected everywhere stats are read.
  effBase() {
    const d = this.def();
    if (!this.evolved || !d.evolution || !d.evolution.overlay) return d.base;
    return Object.assign({}, d.base, d.evolution.overlay);
  }

  // Display name for evolved state — used by UI to show the evolution name.
  displayName() {
    const d = this.def();
    if (this.evolved && d.evolution) return d.evolution.name;
    return d.name;
  }

  // True when this skill is eligible for evolution: points at cap AND run owns >=1 artifact.
  // The run reference is optional (duel-test / standalone checks skip artifact gate).
  canEvolve(run) {
    const d = this.def();
    if (!d.evolution) return false; // no evolution defined for this skill
    if (this.evolved) return false; // already evolved
    if (this.totalLevel() < GAME.upgradeCap) return false;
    if (run && (!run.artifacts || run.artifacts.length === 0)) return false;
    return true;
  }

  customize(axis) {
    if (this.points[axis] === undefined) return;
    this.points[axis] += 1;
  }

  // Total upgrades invested across this weapon's four axes (for the per-ability cap).
  totalLevel() {
    let t = 0; for (const k in this.points) t += this.points[k];
    return t;
  }

  // Invested points in the axis of a given KIND (data-driven skills) — 0 if absent.
  ptsOf(kind) {
    const ax = this.def().axes;
    if (!ax) return 0;
    let t = 0;
    for (const a of ax) if (a.kind === kind) t += (this.points[a.id] || 0);
    return t;
  }
  // Per-point magnitude for an axis kind (axis.per overrides the default).
  perOf(kind, dflt) {
    const ax = this.def().axes;
    if (ax) for (const a of ax) if (a.kind === kind && a.per != null) return a.per;
    return dflt;
  }

  // Resolve base + points + player mods into the numbers used when firing.
  // When evolved, effBase() merges the evolution overlay over def.base so any
  // overridden fields (damage, cooldown, kind, etc.) take effect automatically.
  computeStats() {
    const def = this.def();
    if (def.axes) return this.computeStatsGeneric(); // data-driven per-skill axes
    const pt = this.points;
    const pp = def.perPoint;
    const b = this.effBase(); // evolved? overlay merged; else same as def.base

    // musou: while the ability's empowered window is open, the regular attack
    // surges — harder, faster, and bigger (a fused combo effect). The window lasts
    // ~4.5s on a 10s cooldown (active ~45% of the time mid-game), so it's a sustained
    // second mode — toned from a ×4-6 total DPS spike to ~×2.3 so it's punchy without
    // trivialising bosses. (Balance pass.)
    const emp = this.player.empowered;
    const empDmg = emp ? 1.5 : 1;
    const empCd = emp ? 0.7 : 1;
    const empFx = emp ? 1 : 0;

    const damage =
      b.damage * (1 + pt.damage * pp.damage) * this.player.damageMult * this.player.buffDamageMult
      * (1 + this.player.streakDamageMult) * empDmg; // MOMENTUM bonus
    const cooldown =
      b.cooldown * this.player.cooldownMult * Math.pow(1 - pp.speed, pt.speed) * empCd;
    const reachMult = (1 + pt.reach * pp.reach) * this.player.reachMult;
    const fx = pt.effect * this.player.effectMult + empFx; // effective "effect" magnitude

    const s = { def, damage, cooldown, reachMult, fx };
    const bonusProj = this.player.bonusProjectiles || 0; // from Arsenal & Multitude resonance

    // kind-specific resolved fields
    switch (def.kind) {
      case 'melee_arc':
        s.radius = b.radius * reachMult;
        s.arc = Math.min(360, b.arc + def.effect.arcPerPoint * fx);
        s.damage *= 1 + def.effect.damagePerPoint * fx;
        break;
      case 'projectile_aimed':
        s.count = b.count + Math.floor(def.effect.countPerPoint * fx) + bonusProj;
        s.pierce = b.pierce + Math.floor(def.effect.piercePerPoint * fx);
        s.speed = b.speed * reachMult;
        s.spread = b.spread;
        break;
      case 'burst_aimed':
        // Like projectile_aimed but fires `count` shots with a staggered delay.
        s.count = b.count + Math.floor(def.effect.countPerPoint * fx) + bonusProj;
        s.pierce = b.pierce + Math.floor(def.effect.piercePerPoint * fx);
        s.speed = b.speed * reachMult;
        s.spread = b.spread;
        s.burstDelay = b.burstDelay || 100;
        break;
      case 'projectile_radial':
        s.count = b.count + Math.floor(def.effect.countPerPoint * fx) + bonusProj;
        s.pierce = b.pierce + Math.floor(def.effect.piercePerPoint * fx);
        s.speed = b.speed * reachMult;
        break;
      case 'lob_aoe':
        s.count = b.count + Math.floor(def.effect.countPerPoint * fx) + bonusProj;
        s.radius = b.radius * reachMult;
        s.duration = b.duration * (1 + def.effect.durationPerPoint * fx);
        s.tick = b.tick;
        s.speed = b.speed;
        break;
      case 'orbital':
        // No fire cooldown — orbiters persist and deal continuous proximity damage.
        // count: how many blades orbit; orbitRadius: distance from player;
        // orbitSpeed: radians/sec. The `cooldown` field is 0 in base but kept for
        // the empowered multiplier pipeline (won't trigger auto-fire).
        s.count = Math.max(1, b.count + Math.floor(def.effect.countPerPoint * fx) + bonusProj);
        s.orbitRadius = (b.orbitRadius + def.effect.radiusPerPoint * fx) * reachMult;
        s.orbitSpeed = b.orbitSpeed * (1 + pt.speed * pp.speed); // speed points = faster spin
        s.cooldown = 99999; // never auto-fires via the normal timer path
        break;
      // ── Caesar: deploy legionary allies (the only summoner) ──────────────────
      case 'summon':
        s.count = b.count + Math.floor(def.effect.countPerPoint * fx) + bonusProj; // legionaries per deploy
        s.damage *= 1 + def.effect.damagePerPoint * fx;
        s.allyHp = b.allyHp;
        s.allyLife = b.allyLife * reachMult; // reach = how long they fight
        s.allySpeed = b.allySpeed;
        s.allyRange = b.allyRange;
        break;
      // ── Alexander: forward phalanx line-strike (the only line attack) ─────────
      case 'line_thrust':
        s.length = (b.length + def.effect.lengthPerPoint * fx) * reachMult;
        s.width = b.width;
        s.damage *= 1 + def.effect.damagePerPoint * fx;
        break;
      // ── Genghis: chaining/ricocheting arrows (the only bouncing projectile) ───
      case 'ricochet':
        s.bounces = b.bounces + Math.floor(def.effect.bouncesPerPoint * fx);
        s.damage *= 1 + def.effect.damagePerPoint * fx;
        s.speed = b.speed * reachMult;
        s.bounceRange = b.bounceRange;
        s.pierce = 1; // each hop hits one enemy, then redirects
        break;
      // ── Genghis: the LURE-AND-TRAP hunter — rakes caltrop fields into his wake. The
      //    faster he rides the SHORTER the cadence (a denser trail). Not a projectile.
      case 'trail': {
        const vb = this.player.body && this.player.body.velocity;
        const moveFrac = vb ? Math.min(1, Math.hypot(vb.x, vb.y) / (this.player.speed || 1)) : 0;
        s.moveFrac = moveFrac;
        s.cooldown *= 1 - 0.45 * moveFrac;                     // denser trail while kiting
        s.count = b.count + Math.floor((def.effect.countPerPoint || 0) * fx);
        s.radius = (b.radius + (def.effect.radiusPerPoint || 0) * fx) * reachMult;
        s.duration = b.duration;
        s.tick = b.tick;
        break;
      }
      // ── Ragnar: returning boomerang axes (the only return projectile) ─────────
      case 'boomerang':
        s.count = b.count + Math.floor(def.effect.countPerPoint * fx) + bonusProj;
        s.damage *= 1 + def.effect.damagePerPoint * fx;
        s.speed = b.speed;
        s.range = b.range * reachMult; // reach = throw distance before it returns
        s.spin = b.spin;
        break;
      default:
        break;
    }
    return s;
  }

  // Generic, DATA-DRIVEN resolver for skills that declare their own `axes` (id/kind/
  // label/desc). Each kind scales a stat; `base` carries the baselines, including any
  // DEFAULT-ON effects (knockback/bleed/stun/slow/lifesteal/pierceAll) the upgrade scales.
  computeStatsGeneric() {
    const def = this.def();
    const b = this.effBase(); // evolved? overlay merged; else same as def.base
    const p = this.player;
    const emp = p.empowered;
    const empDmg = emp ? 1.5 : 1;
    const empCd = emp ? 0.7 : 1;
    const P = (k) => this.ptsOf(k);
    const M = (k, d) => this.perOf(k, d);

    const sizePts = P('size');
    const reachMult = (1 + sizePts * M('size', 0.12)) * p.reachMult;
    const damage = b.damage * (1 + P('dmg') * M('dmg', 0.16)) * p.damageMult * p.buffDamageMult
      * (1 + p.streakDamageMult) * empDmg; // MOMENTUM bonus
    const cooldown = b.cooldown * p.cooldownMult * Math.pow(1 - M('cadence', 0.07), P('cadence')) * empCd;
    const bonusProj = p.bonusProjectiles || 0;
    const s = { def, damage, cooldown, reachMult };

    s.count = (b.count || 1) + Math.floor(P('count') * M('count', 1)) + bonusProj;
    s.pierce = b.pierceAll ? 99999 : (b.pierce || 0) + Math.floor(P('pierce') * M('pierce', 1));
    s.spread = b.spread;
    if (b.speed != null) s.speed = b.speed * reachMult;

    // kind-specific geometry
    switch (def.kind) {
      case 'melee_arc':
        s.radius = b.radius * reachMult;
        s.arc = Math.min(360, b.arc + P('arc') * M('arc', 24));
        break;
      case 'lob_aoe':
        s.radius = b.radius * reachMult;
        s.duration = b.duration * (1 + P('burn') * 0.18);
        s.tick = b.tick; s.speed = b.speed;
        break;
      case 'orbital':
        s.count = Math.max(1, s.count);
        s.orbitRadius = (b.orbitRadius + sizePts * 6) * reachMult;
        s.orbitSpeed = b.orbitSpeed * (1 + P('cadence') * 0.10 + P('spin') * 0.14);
        s.cooldown = 99999;
        break;
      case 'summon':
        s.allyHp = (b.allyHp || 40) + P('allyhp') * M('allyhp', 14);
        s.allyLife = (b.allyLife || 7000) * reachMult;
        s.allySpeed = b.allySpeed; s.allyRange = b.allyRange;
        s.allyDmgMult = 1 + P('allydmg') * M('allydmg', 0.16);
        break;
      case 'line_thrust':
        s.length = (b.length + sizePts * 14) * reachMult;
        s.width = (b.width || 46) + P('arc') * M('arc', 10);
        break;
      case 'boomerang':
        s.range = b.range * reachMult; s.spin = b.spin; s.speed = b.speed;
        break;
      case 'pike_wall':
        s.span = (b.span || 160) * reachMult;
        s.offset = b.offset || 90;
        s.duration = (b.duration || 2500) + P('duration') * M('duration', 400);
        s.tick = b.tick || 300;
        s.pikeRadius = b.pikeRadius || 18;
        break;
      default: break;
    }
    if (s.duration == null && b.duration) s.duration = b.duration;
    if (s.tick == null && b.tick) s.tick = b.tick;
    if (s.burstDelay == null && b.burstDelay) s.burstDelay = b.burstDelay; // burst_aimed weapons (scattershot/companion_javelin)

    // universal, scalable on-hit effects (default-on via base, upgraded by their axis)
    s.knockback = (b.knockback || 0) + P('knockback') * M('knockback', 16);
    // stunMs: evolution overlays may hard-override axis scaling (e.g. Thunderous Cleave 2 s)
    s.stunMs = (b.stunMs != null) ? b.stunMs : (b.stun || 0) + P('stun') * M('stun', 250);
    s.fearMs = (b.fear || 0) + P('fear') * M('fear', 300);
    // lifesteal: evolution may double via lifestealMult (Wrath of Heaven)
    s.weaponLifesteal = ((b.lifesteal || 0) + P('lifesteal') * M('lifesteal', 0.03)) * (b.lifestealMult || 1);
    s.armorPierce = !!b.armorPierce || P('armorpierce') > 0;
    if (b.homing) s.homing = b.homing; // seeking projectiles (Gilgamesh's Gate of Babylon)
    if (b.bleed) {
      const k = P('bleed');
      s.bleed = { dps: b.bleed.dps + k * M('bleed', 0.6), duration: b.bleed.duration, stackMax: (b.bleed.stackMax || 4) + k };
    }
    if (b.slow) {
      const k = P('slow');
      s.slow = { factor: Math.max(0.12, b.slow.factor - k * 0.06), dur: b.slow.dur + k * 250 };
    }
    if (b.leaveBurn || P('burnpatch')) {
      const k = P('burnpatch');
      s.leaveBurn = { radius: (b.leaveBurn?.radius || 42) + k * 6, dmg: (b.leaveBurn?.dmg || 6) + k * 2, dur: b.leaveBurn?.dur || 1300 };
    }
    // ── Evolution-only behaviour flags (passed through from the overlay) ─────────────
    // These are read by the fire* methods / GameScene and never appear in the base def.
    if (b.dualSweep) s.dualSweep = true;                               // Wrath of Heaven
    if (b.incendiaryShell) s.incendiaryShell = true;                   // Demon King's Fusillade
    if (b.napalmTide) {                                                 // Napalm Tide
      s.napalmTide = true;
      s.napalmSubRadius = b.napalmSubRadius || 52;
      s.napalmSubOffset = b.napalmSubOffset || 55;
    }
    if (b.orbitalEject) {                                               // Treasury Unleashed
      s.orbitalEject = true;
      s.orbitalEjectMs = b.orbitalEjectMs || 3000;
      s.orbitalEjectHoming = b.orbitalEjectHoming;
      s.orbitalEjectPierce = b.orbitalEjectPierce || 3;
    }
    if (b.legionSlowAura) {                                             // Testudo Immortalis
      s.legionSlowAura = true;
      s.legionSlowRadius = b.legionSlowRadius || 30;
      s.legionSlowFactor = b.legionSlowFactor || 0.6;
      s.legionSlowDur = b.legionSlowDur || 400;
    }
    if (b.tripleLane) {                                                 // Macedonian Onslaught
      s.tripleLane = true;
      s.tripleLaneOffset = b.tripleLaneOffset || 0.22;
      s.tripleLaneLengthMult = b.tripleLaneLengthMult || 0.85;
    }
    if (b.boomExplosion) {                                              // Storm of Axes
      s.boomExplosion = true;
      s.boomExplosionRadius = b.boomExplosionRadius || 70;
      s.boomExplosionLinger = b.boomExplosionLinger || 1200;
    }
    if (b.skyRend) {                                                    // Sky Rend
      s.skyRend = true;
      s.skyRendRadius = b.skyRendRadius || 100;
      s.skyRendBleed = b.skyRendBleed;
      s.skyRendKnockback = b.skyRendKnockback || 28;
    }
    if (b.leaveTramp) s.leaveTramp = b.leaveTramp;                     // Legion's Thunder
    if (b.afterCleaveCaltrops) s.afterCleaveCaltrops = true;           // Thunderous Cleave
    if (b.mjolnirEcho) {                                                // Mjolnir's Echo
      s.mjolnirEcho = true;
      s.mjolnirEchoDmgMult = b.mjolnirEchoDmgMult || 0.7;
    }
    if (b.anvilBleed) s.anvilBleed = b.anvilBleed;                     // Anvil of Chaeronea
    // allyDmgMult from overlay (Testudo Immortalis — overlay hard-sets it before axis scaling)
    if (b.allyDmgMult && b.allyDmgMult > 1) {
      s.allyDmgMult = Math.max(s.allyDmgMult || 1, b.allyDmgMult);
    }
    return s;
  }

  // PRIMARY: auto-fire on the weapon's own cadence (open-world swarm mode).
  update(_time, delta) {
    const def = this.def();
    if (def.kind === 'orbital') {
      this._updateOrbiters(delta);
      return;
    }
    this.timer -= delta;
    if (this.timer > 0) return;
    const s = this.computeStats();
    this.lastCooldown = s.cooldown;
    this.fire(s);
    this.timer = s.cooldown;
  }

  // --- Orbiter subsystem (Gilgamesh divine_arsenal) ---
  // Keeps blade sprites synced and does per-frame proximity damage.
  _updateOrbiters(delta) {
    const s = this.computeStats();
    const count = s.count;

    const px = this.player.x;
    const py = this.player.y;
    const r = s.orbitRadius;
    const step = (Math.PI * 2) / count;
    // Big chunky swords that grow with the orbit (reach). The HIT band below is sized
    // off this so the blades sweep a FAT donut — enemies can't sit "inside the ring".
    const bladeScale = 2.1 * Math.min(1.8, r / 62);

    // Rebuild if count changed (upgrade invested)
    if (this._orbiterCount !== count) {
      this._destroyOrbiters();
      for (let i = 0; i < count; i++) {
        const sprite = this.scene.add.image(0, 0, 'proj_divine_arsenal')
          .setDepth(9)
          .setScale(bladeScale);
        this._orbiters.push({ sprite, index: i, hitCooldowns: new Map() });
        // Spawn golden portal flash at each blade's initial position
        const spawnAng = this._orbiterAngle + i * step;
        const spawnX = px + Math.cos(spawnAng) * r;
        const spawnY = py + Math.sin(spawnAng) * r;
        this.scene.fx.orbiterSpawn(spawnX, spawnY);
      }
      this._orbiterCount = count;
    }

    // Advance the master rotation
    const dtSec = delta / 1000;
    this._orbiterAngle += s.orbitSpeed * dtSec;

    // Move each blade sprite into position
    for (let i = 0; i < this._orbiters.length; i++) {
      const orb = this._orbiters[i];
      const ang = this._orbiterAngle + i * step;
      const bx = px + Math.cos(ang) * r;
      const by = py + Math.sin(ang) * r;
      orb.sprite.setPosition(bx, by).setRotation(ang + Math.PI / 2).setScale(bladeScale);
      // sparse golden glint — low probability so trail stays crisp, not blobby
      if (Math.random() < 0.12) {
        this.scene.fx.goldenTrail(bx, by);
      }
    }

    // Proximity damage check — every 120ms apply damage per orbiter per enemy
    this._orbiterDamageTick += delta;
    if (this._orbiterDamageTick >= 120) {
      this._orbiterDamageTick = 0;
      const dmg = Math.round(s.damage);
      // Fat hit band tied to the (big) blade — with orbit ~62 this covers roughly a
      // 22–104px donut around the player, so swarmers pressing in still get shredded
      // instead of slipping inside the ring.
      const hitR = 20 * bladeScale;
      const hitR2 = hitR * hitR;
      const now = _getTime(this.scene);

      for (const orb of this._orbiters) {
        const bx = orb.sprite.x;
        const by = orb.sprite.y;
        for (const e of this.scene.enemies.getChildren()) {
          if (!e.active) continue;
          const dx = e.x - bx;
          const dy = e.y - by;
          if (dx * dx + dy * dy > hitR2) continue;
          // Per-enemy cooldown: 480ms before the same blade can hit the same enemy again
          const lastHit = orb.hitCooldowns.get(e) || 0;
          if (now - lastHit < 480) continue;
          orb.hitCooldowns.set(e, now);
          this.scene.damageEnemy(e, dmg, { fromPlayer: true });
          if (Math.random() < 0.3) this.scene.fx.goldenBurst(bx, by, 3); // occasional pop (avoid particle blob)
        }
      }

      // Orbiting blades also shatter breakables (crates/urns) they sweep through — same as
      // the melee/ranged weapons. Damage each in-range breakable once per tick.
      if (this.scene.breakables) {
        for (const b of this.scene.breakables.getChildren()) {
          if (!b.active) continue;
          for (const orb of this._orbiters) {
            const dx = b.x - orb.sprite.x, dy = b.y - orb.sprite.y;
            if (dx * dx + dy * dy <= hitR2) { this.scene.damageBreakable(b, dmg); break; }
          }
        }
      }

      // Purge stale entries from hit cooldown maps to avoid memory leaks
      for (const orb of this._orbiters) {
        for (const [e] of orb.hitCooldowns) {
          if (!e.active) orb.hitCooldowns.delete(e);
        }
      }
    }

    // Treasury Unleashed (divine_arsenal evolution): every N ms eject the current ring
    // as a seeking salvo, then immediately re-form the orbiters.
    if (s.orbitalEject) {
      this._orbitalEjectAcc += delta;
      if (this._orbitalEjectAcc >= (s.orbitalEjectMs || 3000)) {
        this._orbitalEjectAcc = 0;
        // Build a burst-stat object enriched with homing + pierce
        const burstS = Object.assign({}, s, {
          def: Object.assign({}, s.def, { id: 'divine_arsenal', kind: 'projectile_radial' }),
          count: Math.max(4, s.count * 2),
          pierce: s.orbitalEjectPierce || 3,
          speed: 480,
          homing: s.orbitalEjectHoming,
        });
        this._fireOrbitalBurst(burstS);
        // Force orbiters to re-form (reset count tracker so the rebuild loop fires)
        this._destroyOrbiters();
        this._orbiterCount = 0;
      }
    }
  }

  _destroyOrbiters() {
    for (const orb of this._orbiters) {
      if (orb.sprite && orb.sprite.active) orb.sprite.destroy();
    }
    this._orbiters = [];
  }

  destroy() {
    this._destroyOrbiters();
  }

  // SECONDARY (and the manual/duel primary): just tick the cooldown, no auto-fire.
  // For orbital weapons the orbiters must still update (move + damage) every tick.
  tick(delta) {
    if (this.timer > 0) this.timer -= delta;
    if (this.def().kind === 'orbital') this._updateOrbiters(delta);
  }

  // Held-fire path for the MANUAL primary (hold the bind key): fire at the weapon's
  // cadence, auto-targeting the nearest enemy. Orbital weapons are passive auras (their
  // orbiters deal damage via tick()), so they ignore held-fire.
  fireHeld() {
    if (this.def().kind === 'orbital') return;
    if (this.timer > 0) return;
    const s = this.computeStats();
    this.lastCooldown = s.cooldown;
    // movement aim: fire along the move direction when set, else auto-target nearest foe
    this._aimOverride = (this.scene.aimDir != null) ? this.scene.aimDir : null;
    this.fire(s);
    this.timer = s.cooldown;
  }

  ready() {
    return this.timer <= 0;
  }

  readyFraction() {
    if (this.timer <= 0) return 1;
    return Phaser.Math.Clamp(1 - this.timer / this.lastCooldown, 0, 1);
  }

  // Manual fire (K, or a duel swing). `aim` (radians) overrides auto-targeting so
  // ranged attacks can be aimed by movement; pass null to auto-target/face.
  // `gateCooldown=false` fires without consuming/checking the cooldown (duel
  // primary, where the exhaust state machine is the only gate).
  castManual(aim = null, gateCooldown = true) {
    if (gateCooldown && this.timer > 0) return false;
    const s = this.computeStats();
    this.lastCooldown = s.cooldown;
    this._aimOverride = aim;
    // Orbital weapons can't "fire" normally — in duel context they release a
    // radial burst of blades from the treasury (Gate of Babylon one-shot volley).
    if (s.def.kind === 'orbital') {
      this._fireOrbitalBurst(s);
      this._aimOverride = null;
      if (gateCooldown) this.timer = 800;
      return true;
    }
    this.fire(s);
    this._aimOverride = null;
    if (gateCooldown) this.timer = s.cooldown;
    return true;
  }

  // Duel-mode burst for orbital: fires a radial volley of blades outward.
  _fireOrbitalBurst(s) {
    Audio.sfx('shoot');
    this.scene.fx.gateFlash(this.player.x, this.player.y);
    // Treat orbiters as a radial projectile volley — use count from s
    const burstCount = Math.max(4, s.count * 2);
    const stepAng = (Math.PI * 2) / burstCount;
    // Borrow projectile_radial stats for the burst
    const fakeS = Object.assign({}, s, {
      def: Object.assign({}, s.def, { id: 'divine_arsenal', kind: 'projectile_radial' }),
      count: burstCount,
      pierce: 2,
      speed: 480,
    });
    const offset = this._orbiterAngle;
    for (let i = 0; i < burstCount; i++) {
      const angle = offset + i * stepAng;
      this.spawnProjectile(fakeS, this.player.x, this.player.y, angle);
    }
    this.scene.fx.goldenBurst(this.player.x, this.player.y, 12);
  }

  fire(s) {
    // Pre-compute aim angle so muzzle effects can use it before fireProjectileAimed runs
    const target = this.nearestEnemy();
    const preAim = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : (this.player.flipX ? Math.PI : 0);
    this._lastAimAngle = preAim;

    // On-cast self-buffs (Genghis arrow-storm speed burst, Ragnar shield-bash block).
    // Only secondaries carry these (3s cooldown) — primaries have none, so no spam.
    if (s.def.selfBuffs) {
      for (const bf of s.def.selfBuffs) this.player.addBuff(bf.kind, bf.mult, bf.dur, this.scene.time.now);
    }

    // Per-weapon muzzle/cast effects — richer than the generic muzzle() call
    const id = s.def.id;
    if (id === 'matchlock_volley') {
      this.scene.fx.sniperMuzzle(this.player.x, this.player.y, preAim);
    } else if (id === 'scattershot') {
      // burst_aimed: use the dedicated scatter muzzle (wider crown flare) on first shot
      this.scene.fx.scatterMuzzle(this.player.x, this.player.y, preAim);
    } else if (id === 'greek_fire') {
      // No muzzle — the lob projectile is the cast tell; flameBurst is on landing
    } else if (id === 'fireburst') {
      this.scene.fx.fireNovaBurst(this.player.x, this.player.y);
      this.scene.fx.flameTongues(this.player.x, this.player.y, 12, 72);
    } else if (id === 'divine_arsenal') {
      // orbital — no fire event (handled in _updateOrbiters)
      return;
    } else if (id === 'gate_spear') {
      // Dual flash: the existing gateFlash aura AND the new ornate portal silhouette
      this.scene.fx.gateFlash(this.player.x, this.player.y);
      this.scene.fx.gatePortal(this.player.x, this.player.y);
    } else if (id === 'composite_bow' || id === 'arrow_storm') {
      this.scene.fx.bowLoose(this.player.x, this.player.y, preAim); // recurve-bow string snap
    } else if (id === 'axe_throw') {
      this.scene.fx.muzzle(this.player.x, this.player.y, s.def.color);
      this.scene.fx._flash(this.player.x, this.player.y, 9, 0xe8e8f0, 0.6, 120); // steel glint as the axe leaves the hand
    } else if (s.def.kind === 'summon' || s.def.kind === 'line_thrust' || s.def.kind === 'pike_wall') {
      // these have their own bespoke visuals (no generic muzzle puff)
    } else {
      this.scene.fx.muzzle(this.player.x, this.player.y, s.def.color);
    }
    const meleeish = s.def.kind === 'melee_arc' || s.def.kind === 'line_thrust' || s.def.kind === 'summon' || s.def.kind === 'pike_wall';
    Audio.sfx(meleeish ? 'melee' : 'shoot');
    switch (s.def.kind) {
      case 'melee_arc':
        return this.fireMeleeArc(s);
      case 'projectile_aimed':
        return this.fireProjectileAimed(s);
      case 'burst_aimed':
        return this.fireBurstAimed(s);
      case 'projectile_radial':
        return this.fireProjectileRadial(s);
      case 'lob_aoe':
        return this.fireLobAoe(s);
      case 'orbital':
        return; // handled by _updateOrbiters
      case 'summon':
        return this.fireSummon(s);
      case 'line_thrust':
        return this.fireLineThrust(s);
      case 'ricochet':
        return this.fireRicochet(s);
      case 'trail':
        return this.fireTrail(s);
      case 'boomerang':
        return this.fireBoomerang(s);
      case 'pike_wall':
        return this.firePikeWall(s);
      default:
        return undefined;
    }
  }

  // --- helpers ---
  nearestEnemy() {
    let best = null;
    let bestD = Infinity;
    const px = this.player.x;
    const py = this.player.y;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active) continue;
      const d = (e.x - px) ** 2 + (e.y - py) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  spawnProjectile(s, x, y, angle) {
    const p = this.scene.projectiles.get(x, y, `proj_${s.def.id}`);
    if (!p) return null;
    p.setActive(true).setVisible(true);
    p.setScale(s.def.projScale || 1).clearTint(); // bolder lance for some weapons; resets recycled sprites
    p.body.reset(x, y);
    p.body.enable = true;
    p.setRotation(angle);
    p.setDepth(8);
    this.scene.physics.velocityFromRotation(angle, s.speed, p.body.velocity);
    p.damage = Math.round(s.damage);
    p.pierceLeft = s.pierce;
    p.hitSet = new Set();
    p.lifespan = 1400 * s.reachMult;
    p.trailColor = s.def.color; // weapon-coloured glow trail (Fx.trail in the update loop)
    // on-hit effects: prefer the COMPUTED (axis-scaled) values, fall back to the def.
    p.bleed = s.bleed || s.def.bleed || null; // wound-on-hit DoT (scaled by Hemorrhage etc.)
    p.knockback = (s.knockback != null) ? s.knockback : (s.def.knockback || 0); // shove-on-hit
    p.slow = s.slow || s.def.slow || null; // slow-on-hit (scaled by Pinning etc.)
    p.stunMs = s.stunMs || 0; // stun-on-hit
    p.weaponLifesteal = s.weaponLifesteal || 0; // heal the player per hit (Bloodlust etc.)
    p.leaveBurn = s.leaveBurn || null; // leave a fire patch on hit (Incendiary etc.)
    p.leaveTramp = s.leaveTramp || null; // leave a trample zone on hit (Legion's Thunder)
    p.fearMs = s.fearMs || 0; // make the foe flee briefly
    p.armorPierce = !!s.armorPierce; // ignore enemy armor
    // reset signature flags so a recycled sprite doesn't keep a prior weapon's behaviour
    p.ricochet = false; p.boomerang = false; p.spin = 0;
    if (s.homing) { p.homing = true; p.homingRange = s.homing.range || 360; p.homingTurn = s.homing.turn || 0.13; }
    else p.homing = false;
    // Seeking mutation: apply a gentle homing curve to all projectiles that don't
    // already home (the existing homing update loop in GameScene handles the physics).
    if (!p.homing && this.player.mutations && this.player.mutations.homing_shots) {
      p.homing = true;
      p.homingRange = 200;
      p.homingTurn = 0.06;
    }
    return p;
  }

  // --- behaviors ---
  fireMeleeArc(s) {
    const target = this.nearestEnemy();
    const facing = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : this.player.flipX
      ? Math.PI
      : 0;
    this._lastAimAngle = facing;
    const halfArc = (s.arc / 2) * (Math.PI / 180);
    const damage = Math.round(s.damage);

    const tipX = this.player.x + Math.cos(facing) * s.radius * 0.75;
    const tipY = this.player.y + Math.sin(facing) * s.radius * 0.75;
    if (s.def.bashFx) {
      // Ragnar's shield bash — a forward shield slam + shockwave (NOT the generic sweep)
      this.scene.fx.shieldBash(this.player.x, this.player.y, facing, s.radius);
    } else {
      // standard melee sweep: the crescent arc, tinted to the weapon's colour. A weapon
      // may override the texture via `def.sweepTex` (e.g. Genghis's distinct cleave slash).
      const sweepKey = (s.def.sweepTex && this.scene.textures.exists(s.def.sweepTex)) ? s.def.sweepTex : 'sweep';
      const fx = this.scene.add
        .image(this.player.x, this.player.y, sweepKey)
        .setRotation(facing)
        .setDepth(9)
        .setScale((s.radius / 60) * 0.5)
        .setAlpha(0.9)
        .setTint(s.def.color || 0xffffff);
      this.scene.tweens.add({
        targets: fx,
        scale: s.radius / 60,
        alpha: 0,
        duration: 220,
        onComplete: () => fx.destroy(),
      });
      // a sharp leading-edge flash along the sweep tip for extra punch
      this.scene.fx._flash(tipX, tipY, 8, 0xffffff, 0.7, 140);
    }

    let hitAny = false;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active) continue;
      const dx = e.x - this.player.x;
      const dy = e.y - this.player.y;
      if (dx * dx + dy * dy > s.radius * s.radius) continue;
      const ang = Math.atan2(dy, dx);
      const diff = Math.abs(Phaser.Math.Angle.Wrap(ang - facing));
      if (s.arc >= 360 || diff <= halfArc) {
        this.scene.damageEnemy(e, damage, { armorPierce: s.armorPierce, fromPlayer: true });
        const kb = (s.knockback != null) ? s.knockback : (s.def.knockback || 0);
        if (kb && e.active && !e.isBoss) this.scene.knockbackEnemy(e, ang, kb);
        const stun = (s.stunMs != null) ? s.stunMs : (s.def.stun || 0);
        if (stun && e.active && !e.isBoss) { // lock the foe in place (Khan's Cleave / Stagger)
          e.stunUntil = this.scene.time.now + stun;
          e.setTint(0x9fd0ff);
          this.scene.fx.impact(e.x, e.y, 0x9fd0ff);
        }
        if (s.fearMs && e.active && !e.isBoss) e.fearUntil = this.scene.time.now + s.fearMs;
        if (s.bleed && e.active) this.scene.applyBleed(e, s.bleed);
        if (s.weaponLifesteal) this.scene.player.heal(damage * s.weaponLifesteal); // Bloodlust
        // Wrath of Heaven: every melee hit scorches the ground with a fire patch
        if (s.leaveBurn && e.active) {
          const lb = s.leaveBurn;
          this.scene.spawnHazardZone(e.x, e.y, lb.radius, lb.dmg, 80, 300, lb.dur, 'fire', 'enemies');
        }
        hitAny = true;
      }
    }
    // Impact sparks on confirmed hit
    if (hitAny) {
      this.scene.fx._tint(this.scene.fx.spark, 0xd4af37);
      this.scene.fx.spark.emitParticleAt(tipX, tipY, 5);
    }

    // the sweep also smashes breakable crates in range
    for (const b of this.scene.breakables.getChildren()) {
      if (!b.active) continue;
      const dx = b.x - this.player.x;
      const dy = b.y - this.player.y;
      if (dx * dx + dy * dy <= s.radius * s.radius) this.scene.damageBreakable(b, damage);
    }

    // Wrath of Heaven: queue a second full 360° sweep 180ms after the first
    if (s.dualSweep) {
      const secondS = Object.assign({}, s, { arc: 360, dualSweep: false }); // no recurse
      this.scene.time.delayedCall(180, () => {
        if (!this.player.active) return;
        this.fireMeleeArc(secondS);
        this.scene.fx.goldenBurst(this.player.x, this.player.y, 6);
      });
    }

    // Thunderous Cleave: after the arc resolves plant a caltrop field across the full radius
    if (s.afterCleaveCaltrops) {
      this.scene.spawnCaltropField(
        this.player.x, this.player.y,
        s.radius,
        Math.round(s.damage * 0.6),
        2500, 280,
      );
      this.scene.fx.shockwave(this.player.x, this.player.y, 0xd2a04a, s.radius * 1.1);
    }

    // Mjolnir's Echo: after the bash, spawn 3 homing shield-echo projectiles
    if (s.mjolnirEcho) {
      const echoDmg = Math.round(damage * (s.mjolnirEchoDmgMult || 0.7));
      const echoTex = this.scene.textures.exists('proj_shield_bash') ? 'proj_shield_bash' : 'proj_axe_throw';
      const fakeS = Object.assign({}, s, {
        def: Object.assign({}, s.def, { id: 'shield_bash', kind: 'projectile_aimed', projScale: 1 }),
        damage: echoDmg,
        speed: 520, pierce: 2,
        homing: { range: 300, turn: 0.13 },
        leaveBurn: null, mjolnirEcho: false,
      });
      // override the texture lookup via the def id pointing at echoTex
      fakeS.def.id = echoTex.replace('proj_', '');
      const angles = [facing - 0.52, facing, facing + 0.52]; // ±30°
      angles.forEach((ang, i) => {
        this.scene.time.delayedCall(i * 80, () => {
          if (!this.player.active) return;
          const ep = this.spawnProjectile(fakeS, this.player.x, this.player.y, ang);
          if (ep) {
            ep.damage = echoDmg;
            ep.setTint(0xb0d0ff);
          }
        });
      });
    }
  }

  fireProjectileAimed(s) {
    const target = this.nearestEnemy();
    const baseAngle = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : this.player.flipX
      ? Math.PI
      : 0;
    this._lastAimAngle = baseAngle;

    // Sky Rend (thrust_sky evolution): skip the projectile entirely — slam a divine
    // shockwave down at the nearest target, bleed-infecting everything in radius.
    if (s.skyRend) {
      const tx = target ? target.x : this.player.x + Math.cos(baseAngle) * 120;
      const ty = target ? target.y : this.player.y + Math.sin(baseAngle) * 120;
      // Visual: halberd lunge rotated straight down
      this.scene.fx.weaponLunge('weapon_halberd', tx, ty, Math.PI / 2, 90, s.def.color);
      this.scene.fx.shockwave(tx, ty, 0xffe08a, s.skyRendRadius * 1.5);
      this.scene.fx.flameBurst(tx, ty, s.skyRendRadius * 0.6);
      for (const e of this.scene.enemies.getChildren()) {
        if (!e.active) continue;
        const dx = e.x - tx, dy = e.y - ty;
        if (dx * dx + dy * dy > s.skyRendRadius * s.skyRendRadius) continue;
        this.scene.damageEnemy(e, Math.round(s.damage), { fromPlayer: true });
        if (s.skyRendBleed) this.scene.applyBleed(e, s.skyRendBleed);
        if (e.active && !e.isBoss) {
          this.scene.knockbackEnemy(e, Math.atan2(dy, dx), s.skyRendKnockback || 28);
        }
      }
      return; // no projectile spawned
    }

    const spread = (s.spread * Math.PI) / 180;
    for (let i = 0; i < s.count; i++) {
      const t = s.count === 1 ? 0 : i / (s.count - 1) - 0.5;
      const ang = baseAngle + t * spread;
      this.spawnProjectile(s, this.player.x, this.player.y, ang);
      // Caesar's pilum volley: a heavy bronze launch streak per javelin
      if (s.def.id === 'pilum_volley') this.scene.fx.pilaStreak(this.player.x, this.player.y, ang);
      // Gate of Babylon: each spear gets a golden launch streak — staggered slightly so
      // the fan fans out visually rather than all firing at the same instant.
      if (s.def.id === 'gate_spear') {
        const streakDelay = i * 18; // very fast stagger — still reads as a single salvo
        if (streakDelay === 0) {
          this.scene.fx.goldenSpearStreak(this.player.x, this.player.y, ang, s.speed);
        } else {
          this.scene.time.delayedCall(streakDelay, () => {
            if (!this.player.active) return;
            this.scene.fx.goldenSpearStreak(this.player.x, this.player.y, ang, s.speed);
          });
        }
      }
    }
    // Lü Bu's thrust_sky: the Sky Piercer halberd STABS forward (weapon, not just an arc)
    if (s.def.id === 'thrust_sky') {
      this.scene.fx.weaponLunge('weapon_halberd', this.player.x, this.player.y, baseAngle, 120, s.def.color);
    }
    // Nobunaga's matchlock: tracer OR incendiary shell explosion (evolved)
    if (s.def.id === 'matchlock_volley') {
      if (s.incendiaryShell) {
        // Demon King's Fusillade: a heavier explosion at point of impact (deferred via leaveBurn)
        // Show a richer muzzle — a red-orange explosion flash at the barrel
        this.scene.fx.explosion(this.player.x, this.player.y, 0xff4400, 32);
      } else {
        this.scene.fx.gunTracer(this.player.x, this.player.y, baseAngle, s.speed * 1.4 * 0.001);
      }
    }
  }

  // Rapid burst: fires `count` shots toward target with staggered delays,
  // each with its own muzzle flash — the marksman's multi-shot follow-up.
  fireBurstAimed(s) {
    const target = this.nearestEnemy();
    const baseAngle = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : this.player.flipX
      ? Math.PI
      : 0;
    this._lastAimAngle = baseAngle;
    const spread = (s.spread * Math.PI) / 180;
    // Alexander's companion javelins get a thrown-spear streak, not Nobunaga's gun FX.
    const javelin = s.def.id === 'companion_javelin';
    const shotFx = (ang) => {
      if (javelin) this.scene.fx.pilaStreak(this.player.x, this.player.y, ang);
      else this.scene.fx.gunTracer(this.player.x, this.player.y, ang, s.speed * 1.4 * 0.001);
    };
    for (let i = 0; i < s.count; i++) {
      const t = s.count === 1 ? 0 : i / (s.count - 1) - 0.5;
      const ang = baseAngle + t * spread;
      const delay = i * s.burstDelay;
      if (i === 0) {
        // First shot fires immediately
        this.spawnProjectile(s, this.player.x, this.player.y, ang);
        shotFx(ang);
      } else {
        this.scene.time.delayedCall(delay, () => {
          if (!this.player.active) return;
          this.spawnProjectile(s, this.player.x, this.player.y, ang);
          if (!javelin) this.scene.fx.gunMuzzle(this.player.x, this.player.y, ang);
          shotFx(ang);
          Audio.sfx('shoot');
        });
      }
    }
  }

  fireProjectileRadial(s) {
    const step = (Math.PI * 2) / s.count;
    const offset = Math.random() * step;
    for (let i = 0; i < s.count; i++) {
      const angle = offset + i * step;
      this.spawnProjectile(s, this.player.x, this.player.y, angle);
    }
    // Belisarius fireburst: the nova ring already fired in fire(); add a secondary
    // ring of flame tongues matching the projectile fan for a shape-driven read.
    if (s.def.id === 'fireburst') {
      this.scene.fx.flameTongues(this.player.x, this.player.y, s.count, 64);
    }
  }

  fireLobAoe(s) {
    const target = this.nearestEnemy();
    // duel/aimed: lob toward the aim direction; else onto the nearest enemy
    const aimed = this._aimOverride != null
      ? { x: this.player.x + Math.cos(this._aimOverride) * 200, y: this.player.y + Math.sin(this._aimOverride) * 200 }
      : null;
    for (let i = 0; i < s.count; i++) {
      const tx = aimed ? aimed.x + Phaser.Math.Between(-30, 30) : target ? target.x + Phaser.Math.Between(-40, 40) : this.player.x + Phaser.Math.Between(-120, 120);
      const ty = aimed ? aimed.y + Phaser.Math.Between(-30, 30) : target ? target.y + Phaser.Math.Between(-40, 40) : this.player.y + Phaser.Math.Between(-120, 120);
      // Arc trail shows the lob trajectory immediately so the throw reads clearly
      this.scene.fx.lobArcTrail(this.player.x, this.player.y, tx, ty, s.def.color);
      const proj = this.scene.add
        .image(this.player.x, this.player.y, `proj_${s.def.id}`)
        .setDepth(8);
      const dur = (Phaser.Math.Distance.Between(this.player.x, this.player.y, tx, ty) / s.speed) * 1000;
      // Simulate a parabolic arc: move the projectile along x linearly but y follows a sine arc
      // We do this by tweening both x/y with different eases — easeIn on y = sinks like gravity
      // fire-trail embers behind the lob projectile
      const trailTimer = this.scene.time.addEvent({
        delay: 40,
        repeat: Math.floor(dur / 40),
        callback: () => {
          if (proj.active) {
            this.scene.fx._tint(this.scene.fx.embers, 0xff7b1c);
            this.scene.fx.embers.emitParticleAt(proj.x, proj.y, 1);
            // small orange fire wisps rising off the pot as it flies
            this.scene.fx._tint(this.scene.fx.fireEmitter, 0xff6a00);
            this.scene.fx.fireEmitter.emitParticleAt(proj.x, proj.y, 1);
          }
        },
      });
      this.scene.tweens.add({
        targets: proj,
        x: tx,
        y: ty,
        duration: dur,
        ease: 'Quad.easeIn', // sinks heavier toward end — feels thrown
        onComplete: () => {
          proj.destroy();
          trailTimer.remove(false);
          // Big flame splash on landing: flameBurst + extra fire ring + fireEmitter burst
          this.scene.fx.flameBurst(tx, ty, s.radius);
          this.scene.fx._ring(tx, ty, s.radius * 0.9, 0xff4500, 300, 3);
          this.scene.fx._tint(this.scene.fx.fireEmitter, 0xff4500);
          this.scene.fx.fireEmitter.emitParticleAt(tx, ty, 8);
          this.spawnFlamePool(s, tx, ty);
        },
      });
    }
  }

  spawnFlamePool(s, x, y) {
    const radius = s.radius;
    const pool = this.scene.add
      .image(x, y, 'flame_pool')
      .setDepth(2)
      .setScale((radius * 2) / 64)
      .setAlpha(0.9);
    const damage = Math.round(s.damage);
    const ticks = Math.max(1, Math.floor(s.duration / s.tick));
    let done = 0;
    const ev = this.scene.time.addEvent({
      delay: s.tick,
      repeat: ticks - 1,
      callback: () => {
        for (const e of this.scene.enemies.getChildren()) {
          if (!e.active) continue;
          const dx = e.x - x;
          const dy = e.y - y;
          if (dx * dx + dy * dy <= radius * radius) this.scene.damageEnemy(e, damage, { fromPlayer: true });
        }
        done++;
        if (done >= ticks) {
          this.scene.tweens.add({ targets: pool, alpha: 0, duration: 200, onComplete: () => pool.destroy() });
        }
      },
    });
    pool.on('destroy', () => ev.remove(false));

    // Napalm Tide (greek_fire evolution): scatter THREE extra sub-pools at landing point.
    // Positions form a fire triangle offset from the central pool impact.
    if (s.napalmTide) {
      const subR = s.napalmSubRadius || 52;
      const off = s.napalmSubOffset || 55;
      const subOffsets = [
        { dx: 0,    dy: -off },          // directly behind / above
        { dx: -off, dy:  off * 0.55 },   // lower-left
        { dx:  off, dy:  off * 0.55 },   // lower-right
      ];
      const subS = Object.assign({}, s, {
        radius: subR, napalmTide: false,  // no recursion
        damage: damage,
      });
      for (const o of subOffsets) {
        const sx = x + o.dx;
        const sy = y + o.dy;
        this.scene.spawnHazardZone(sx, sy, subR, damage, 0, 260, 1800, 'fire', 'enemies');
        this.scene.fx.flameBurst(sx, sy, subR * 0.5);
      }
    }
  }

  // ── Caesar: deploy legionary allies that march out and fight ───────────────
  fireSummon(s) {
    this.scene.fx.legionRally(this.player.x, this.player.y); // rally horn — the cohort forms up
    for (let i = 0; i < s.count; i++) {
      const a = (i / Math.max(1, s.count)) * Math.PI * 2 + Math.random();
      const ox = this.player.x + Math.cos(a) * 24;
      const oy = this.player.y + Math.sin(a) * 24;
      this.scene.spawnLegionary(ox, oy, {
        damage: Math.round(s.damage * (s.allyDmgMult || 1)),
        hp: s.allyHp,
        life: s.allyLife,
        speed: s.allySpeed,
        range: s.allyRange,
        color: s.def.color,
        // Testudo Immortalis: each legionary emits a proximity slow-field aura
        slowAura: s.legionSlowAura ? {
          radius: s.legionSlowRadius || 30,
          factor: s.legionSlowFactor || 0.6,
          dur: s.legionSlowDur || 400,
        } : null,
      });
    }
  }

  // ── Alexander: an instant forward line-strike skewering a narrow lane ───────
  // Macedonian Onslaught evolution: fires THREE parallel lanes simultaneously.
  fireLineThrust(s) {
    const target = this.nearestEnemy();
    const facing = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : this.player.flipX ? Math.PI : 0;
    this._lastAimAngle = facing;

    // Helper: hit-check + FX for a single thrust lane
    const doLane = (ang, len) => {
      const damage = Math.round(s.damage);
      const halfW = s.width / 2;
      const px = this.player.x;
      const py = this.player.y;
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      this.scene.fx.weaponLunge('weapon_sarissa', px, py, ang, len, s.def.color);
      const inLane = (o) => {
        const dx = o.x - px;
        const dy = o.y - py;
        const along = dx * cos + dy * sin;
        const perp = Math.abs(-dx * sin + dy * cos);
        return along >= -12 && along <= len && perp <= halfW;
      };
      let hitAny = false;
      const kb = s.knockback || 0;
      for (const e of this.scene.enemies.getChildren()) {
        if (e.active && inLane(e)) {
          this.scene.damageEnemy(e, damage, { fromPlayer: true });
          // center lane applies knockback; flanking lanes skip it to avoid chaotic scatter
          if (kb && ang === facing && e.active && !e.isBoss) {
            this.scene.knockbackEnemy(e, Math.atan2(e.y - py, e.x - px), kb);
          }
          hitAny = true;
        }
      }
      for (const b of this.scene.breakables.getChildren()) {
        if (b.active && inLane(b)) this.scene.damageBreakable(b, damage);
      }
      if (hitAny) {
        const tipX = px + cos * len * 0.7;
        const tipY = py + sin * len * 0.7;
        this.scene.fx._tint(this.scene.fx.spark, 0xcdb070);
        this.scene.fx.spark.emitParticleAt(tipX, tipY, 6);
      }
    };

    // Center lane fires immediately
    doLane(facing, s.length);

    if (s.tripleLane) {
      // Left + right flanking lanes fire 60ms later, slightly shorter
      const offset = s.tripleLaneOffset || 0.22;
      const shortLen = s.length * (s.tripleLaneLengthMult || 0.85);
      this.scene.time.delayedCall(60, () => {
        if (!this.player.active) return;
        doLane(facing - offset, shortLen);
        doLane(facing + offset, shortLen);
      });
    }
  }

  // ── Genghis: an arrow that ricochets/chains to the next-nearest enemy ───────
  fireRicochet(s) {
    const target = this.nearestEnemy();
    const baseAngle = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : this.player.flipX ? Math.PI : 0;
    this._lastAimAngle = baseAngle;
    const p = this.spawnProjectile(s, this.player.x, this.player.y, baseAngle);
    if (p) {
      p.ricochet = true;
      p.bouncesLeft = s.bounces;
      p.bounceRange = s.bounceRange;
      p.bounceSpeed = s.speed;
    }
  }

  // ── Genghis: rake a caltrop field into his WAKE (behind his movement) so the swarm
  //    chasing him runs over it. `count` extra fields fan out a little when upgraded.
  fireTrail(s) {
    const vb = this.player.body && this.player.body.velocity;
    let bx = this.player.x;
    let by = this.player.y;
    if (vb && (vb.x || vb.y)) {
      const m = Math.hypot(vb.x, vb.y) || 1;
      bx -= (vb.x / m) * 28; // drop it just behind, in the chasers' path
      by -= (vb.y / m) * 28;
    }
    for (let i = 0; i < s.count; i++) {
      const ox = bx + (i === 0 ? 0 : Phaser.Math.Between(-32, 32));
      const oy = by + (i === 0 ? 0 : Phaser.Math.Between(-32, 32));
      this.spawnArrowField(s, ox, oy);
    }
  }

  // Genghis's signature trail field — delegates to the shared GameScene helper (also
  // used by his ultimate's encircling ring).
  spawnArrowField(s, x, y) {
    this.scene.spawnCaltropField(x, y, s.radius, Math.round(s.damage), s.duration, s.tick);
  }

  // ── Ragnar: axes that fly out to range then return, hitting on both legs ────
  // Storm of Axes (evolution): tags projectiles with boomExplosion so GameScene spawns
  // a trample zone at the turnaround point (the boomPhase 'out'→'back' transition).
  fireBoomerang(s) {
    const target = this.nearestEnemy();
    const baseAngle = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : this.player.flipX ? Math.PI : 0;
    this._lastAimAngle = baseAngle;
    const spread = 0.2;
    for (let i = 0; i < s.count; i++) {
      const t = s.count === 1 ? 0 : i / (s.count - 1) - 0.5;
      const ang = baseAngle + t * spread;
      const p = this.spawnProjectile(s, this.player.x, this.player.y, ang);
      if (!p) continue;
      p.boomerang = true;
      p.boomPhase = 'out';
      p.boomRange = s.range;
      p.boomSpeed = s.speed;
      p.spin = s.spin;
      p.pierceLeft = 999; // passes through; re-hits are gated by hitSet (reset on the return leg)
      p.lifespan = 6000; // safety cap; normally ends when it returns to the thrower
      // Storm of Axes: tag the projectile so GameScene fires a trample zone at turnaround
      if (s.boomExplosion) {
        p.boomExplosion = true;
        p.boomExplosionRadius = s.boomExplosionRadius || 70;
        p.boomExplosionDmg = Math.round(s.damage * 0.8);
        p.boomExplosionLinger = s.boomExplosionLinger || 1200;
      }
    }
  }

  // ── Alexander: PHALANX WALL — plant a perpendicular line of sarissa pikes ahead. ─
  // Computes N pike-point positions arranged along the axis PERPENDICULAR to the aim,
  // centred at `offset` px ahead of the player. Each pike spawns a small persistent
  // tick-zone (radius `pikeRadius`) that damages + slows enemies for `duration` ms.
  // Rendered as weapon_sarissa sprites angled along the aim direction, bronze-tinted,
  // staggered slightly, that fade as the duration expires.
  firePikeWall(s) {
    const target = this.nearestEnemy();
    const facing = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : this.player.flipX ? Math.PI : 0;
    this._lastAimAngle = facing;

    const px = this.player.x;
    const py = this.player.y;

    // Wall centre: `offset` px ahead along aim direction
    const cx = px + Math.cos(facing) * (s.offset || 90);
    const cy = py + Math.sin(facing) * (s.offset || 90);

    // Perpendicular axis (rotate aim 90°)
    const perpX = -Math.sin(facing);
    const perpY =  Math.cos(facing);

    const count   = s.count;
    const span    = s.span || 160;
    const dur     = s.duration || 2500;
    const tick    = s.tick || 300;
    const pikR    = s.pikeRadius || 18;
    const damage  = Math.round(s.damage);
    const slow    = s.slow || null;
    const bleed   = s.anvilBleed || null; // Anvil of Chaeronea evolution

    // Bronze Macedonian tint for the pikes
    const bronzeTint = 0xcd8e3a;

    // Spawn-in FX: a brief horizontal flash across the wall line (steel glint)
    const halfSpan = span / 2;
    const g = this.scene.add.graphics().setDepth(10).setBlendMode('ADD');
    g.lineStyle(3, 0xd4af37, 0.8);
    g.beginPath();
    g.moveTo(cx - perpX * halfSpan, cy - perpY * halfSpan);
    g.lineTo(cx + perpX * halfSpan, cy + perpY * halfSpan);
    g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 220, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
    // shockwave at the centre to sell the impact
    this.scene.fx._flash(cx, cy, 14, 0xd4af37, 0.65, 180);

    for (let i = 0; i < count; i++) {
      const t = count === 1 ? 0 : i / (count - 1) - 0.5;
      const wx = cx + perpX * t * span;
      const wy = cy + perpY * t * span;

      // Small stagger per pike for organic feel
      const stagger = i * 35;

      // Visual: sarissa sprite planted at this position, angled along aim direction
      if (this.scene.textures.exists('weapon_sarissa')) {
        const img = this.scene.add.image(wx, wy, 'weapon_sarissa')
          .setRotation(facing)
          .setTint(bronzeTint)
          .setScale(0.9)
          .setDepth(5)
          .setAlpha(0);
        // pop in with a brief flash then hold for duration, fade out at expiry
        this.scene.tweens.add({
          targets: img,
          alpha: 0.85,
          duration: 60 + stagger * 0.5,
          ease: 'Quad.easeOut',
          onComplete: () => {
            this.scene.time.delayedCall(dur - 120, () => {
              if (img.active) {
                this.scene.tweens.add({ targets: img, alpha: 0, duration: 160, onComplete: () => img.destroy() });
              }
            });
          },
        });
      }

      // Tick-zone: damages + slows enemies in the pike's radius for `dur` ms
      this.scene.time.delayedCall(stagger, () => {
        if (!this.player.active) return;
        const ticks = Math.max(1, Math.floor(dur / tick));
        let done = 0;
        const ev = this.scene.time.addEvent({
          delay: tick,
          repeat: ticks - 1,
          callback: () => {
            const now = this.scene.time.now;
            for (const e of this.scene.enemies.getChildren()) {
              if (!e.active) continue;
              const dx = e.x - wx;
              const dy = e.y - wy;
              if (dx * dx + dy * dy > pikR * pikR) continue;
              this.scene.damageEnemy(e, damage, { fromPlayer: true });
              // Apply heavy slow (pin)
              if (slow) {
                e.slowUntil  = now + slow.dur;
                e.slowFactor = slow.factor;
              }
              // Anvil of Chaeronea: bleed
              if (bleed) this.scene.applyBleed(e, bleed);
            }
            done++;
          },
        });
        // clean up timer if the scene is torn down
        this.scene.events.once('shutdown', () => ev.remove(false));
      });
    }

    // Tip-flash at both ends of the wall
    const endL = { x: cx - perpX * halfSpan, y: cy - perpY * halfSpan };
    const endR = { x: cx + perpX * halfSpan, y: cy + perpY * halfSpan };
    this.scene.fx._flash(endL.x, endL.y, 8, bronzeTint, 0.8, 140);
    this.scene.fx._flash(endR.x, endR.y, 8, bronzeTint, 0.8, 140);
  }
}
