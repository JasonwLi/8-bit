import Phaser from 'phaser';
import { getWeapon } from '../data/weapons.js';
import { getSecondary } from '../data/secondaries.js';
import { Audio } from './AudioManager.js';

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
    this.points = { damage: 0, reach: 0, speed: 0, effect: 0 };
    this.timer = 0;
    this.lastCooldown = (this.def().base.cooldown) || 1000; // for readyFraction()
    this._aimOverride = null; // when set, fire toward this angle instead of auto-targeting

    // --- Orbital system (Gilgamesh divine_arsenal) ---
    // Persistent blade sprites that circle the player and damage nearby enemies.
    this._orbiters = []; // { sprite, angle, hitCooldowns: Map<enemy, ms> }
    this._orbiterAngle = 0; // master orbit rotation (radians, advances per frame)
    this._orbiterDamageTick = 0; // ms accumulator for proximity damage checks
    this._orbiterCount = 0; // track re-sync when count changes
  }

  def() {
    return getWeapon(this.weaponId) || getSecondary(this.weaponId);
  }

  customize(axis) {
    if (this.points[axis] === undefined) return;
    this.points[axis] += 1;
  }

  // Total upgrades invested across this weapon's four axes (for the per-ability cap).
  totalLevel() {
    const p = this.points;
    return p.damage + p.reach + p.speed + p.effect;
  }

  // Resolve base + points + player mods into the numbers used when firing.
  computeStats() {
    const def = this.def();
    const pt = this.points;
    const pp = def.perPoint;
    const b = def.base;

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
      b.damage * (1 + pt.damage * pp.damage) * this.player.damageMult * this.player.buffDamageMult * empDmg;
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
          this.scene.damageEnemy(e, dmg);
          if (Math.random() < 0.3) this.scene.fx.goldenBurst(bx, by, 3); // occasional pop (avoid particle blob)
        }
      }

      // Purge stale entries from hit cooldown maps to avoid memory leaks
      for (const orb of this._orbiters) {
        for (const [e] of orb.hitCooldowns) {
          if (!e.active) orb.hitCooldowns.delete(e);
        }
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
    } else if (s.def.kind === 'summon' || s.def.kind === 'line_thrust') {
      // these have their own bespoke visuals (no generic muzzle puff)
    } else {
      this.scene.fx.muzzle(this.player.x, this.player.y, s.def.color);
    }
    const meleeish = s.def.kind === 'melee_arc' || s.def.kind === 'line_thrust' || s.def.kind === 'summon';
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
    p.bleed = s.def.bleed || null; // wound-on-hit DoT (Lü Bu's thrust); applied in onProjectileHit
    p.knockback = s.def.knockback || 0; // shove-on-hit (Caesar's pila)
    p.slow = s.def.slow || null; // slow-on-hit (Alexander's javelins)
    // reset signature flags so a recycled sprite doesn't keep a prior weapon's behaviour
    p.ricochet = false; p.boomerang = false; p.spin = 0;
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
        this.scene.damageEnemy(e, damage);
        if (s.def.knockback && e.active && !e.isBoss) { // shield-bash shove
          e.x += Math.cos(ang) * s.def.knockback;
          e.y += Math.sin(ang) * s.def.knockback;
        }
        if (s.def.stun && e.active && !e.isBoss) { // Khan's Cleave: lock the foe in place
          e.stunUntil = this.scene.time.now + s.def.stun;
          e.setTint(0x9fd0ff);
          this.scene.fx.impact(e.x, e.y, 0x9fd0ff);
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
    // Nobunaga's matchlock: draw a bright tracer line showing the shot path
    if (s.def.id === 'matchlock_volley') {
      this.scene.fx.gunTracer(this.player.x, this.player.y, baseAngle, s.speed * 1.4 * 0.001);
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
          if (dx * dx + dy * dy <= radius * radius) this.scene.damageEnemy(e, damage);
        }
        done++;
        if (done >= ticks) {
          this.scene.tweens.add({ targets: pool, alpha: 0, duration: 200, onComplete: () => pool.destroy() });
        }
      },
    });
    pool.on('destroy', () => ev.remove(false));
  }

  // ── Caesar: deploy legionary allies that march out and fight ───────────────
  fireSummon(s) {
    this.scene.fx.legionRally(this.player.x, this.player.y); // rally horn — the cohort forms up
    for (let i = 0; i < s.count; i++) {
      const a = (i / Math.max(1, s.count)) * Math.PI * 2 + Math.random();
      const ox = this.player.x + Math.cos(a) * 24;
      const oy = this.player.y + Math.sin(a) * 24;
      this.scene.spawnLegionary(ox, oy, {
        damage: Math.round(s.damage),
        hp: s.allyHp,
        life: s.allyLife,
        speed: s.allySpeed,
        range: s.allyRange,
        color: s.def.color,
      });
    }
  }

  // ── Alexander: an instant forward line-strike skewering a narrow lane ───────
  fireLineThrust(s) {
    const target = this.nearestEnemy();
    const facing = this._aimOverride != null
      ? this._aimOverride
      : target
      ? Math.atan2(target.y - this.player.y, target.x - this.player.x)
      : this.player.flipX ? Math.PI : 0;
    this._lastAimAngle = facing;
    const damage = Math.round(s.damage);
    const len = s.length;
    const halfW = s.width / 2;
    const px = this.player.x;
    const py = this.player.y;
    const cos = Math.cos(facing);
    const sin = Math.sin(facing);
    this.scene.fx.weaponLunge('weapon_sarissa', px, py, facing, len, s.def.color); // the sarissa STABS forward
    const inLane = (o) => {
      const dx = o.x - px;
      const dy = o.y - py;
      const along = dx * cos + dy * sin; // projection along the thrust
      const perp = Math.abs(-dx * sin + dy * cos); // distance off the centre line
      return along >= -12 && along <= len && perp <= halfW;
    };
    let hitAny = false;
    for (const e of this.scene.enemies.getChildren()) {
      if (e.active && inLane(e)) { this.scene.damageEnemy(e, damage); hitAny = true; }
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
    }
  }
}
