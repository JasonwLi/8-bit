import { KIND_CLASS } from '../data/civFlavour.js';

// Per-mob AI for non-boss enemies. GameScene.updateEnemies() handles boss
// routing, curse/elite hooks, then delegates each mob's movement + attack here.
//
// Melee `move` tags:  'chase' | 'zigzag' | 'circle' | 'charger' | 'lunger' | 'flyer' | 'bomber'
// Ranged `rangedKind`: 'single' | 'spread' | 'rapid' | 'lob' | 'siege' | 'blink' | 'cone_sweep'
// Projectiles go through scene.spawnHostileProjectile().
// AoE zones go through scene.spawnHazardZone(x, y, radius, dmg, delay, tick, linger).
//
// ── NEW MECHANICS (signature units) ─────────────────────────────────────────
//  fireLance     – cone hazard zone spawned on swing strike
//  shinobiStrike – melee unit blinks behind player before swing windup
//  cone_sweep    – rangedKind: schedules 5 hazard zones in a sweeping arc
//  firesOnMove   – ranged fires while continuing circle orbit motion
//  peltastRepos  – sprint perpendicularly after firing (reposTimer / reposVx/Vy)
// GameScene hooks (not here):
//  testudo       – frontal arc blocks 95% damage (in damageEnemy)
//  piercing      – projectile passes through on contact (in onEnemyProjectileHit)
//  kataWake      – hazard zone at dash end (in charger 'end dash' branch here)
//  chariotWake   – trail hazards during dash (in charger 'dashing' branch here)
//  ashipuAura    – ally buff pulse (in updateEnemies aura scan)
//  drumAura      – passive speed aura (in updateEnemies aura scan)
//  berserkrRage  – rage on HP threshold (in damageEnemy)
//
// ── ATTACK TOKEN SYSTEM ─────────────────────────────────────────────────────
// At most ATTACK_TOKEN_CAP regular enemies may be actively WINDING UP or DASHING/LUNGING/
// DIVING simultaneously. Elites always bypass the cap; bosses are exempt entirely.
// Tokens are acquired just before a windup begins and released when the attack resolves,
// is interrupted by a counter-hit stun, or when the enemy dies/deactivates.
//
// Scene entry points (called by GameScene):
//   acquireAttackToken(scene, e) → true if the enemy may begin its windup
//   releaseAttackToken(scene, e) → release the token (no-op if not holding one)
//   resetAttackTokens(scene)     → call at the start of each floor to prevent leaks

const ATTACK_TOKEN_CAP = 5; // max enemies in windup / active-attack at once

export function acquireAttackToken(scene, e) {
  if (e.isElite || e.isBoss) return true; // elites + bosses always allowed
  if (e._hasAttackToken) return true;      // already holds a token
  if ((scene._attackTokens || 0) >= ATTACK_TOKEN_CAP) return false; // cap reached
  scene._attackTokens = (scene._attackTokens || 0) + 1;
  e._hasAttackToken = true;
  return true;
}

export function releaseAttackToken(scene, e) {
  if (!e._hasAttackToken) return;
  e._hasAttackToken = false;
  scene._attackTokens = Math.max(0, (scene._attackTokens || 0) - 1);
}

export function resetAttackTokens(scene) {
  scene._attackTokens = 0;
  // Also clear any stale token flags on pooled enemies so nothing leaks across floors
  if (scene.enemies) {
    for (const e of scene.enemies.getChildren()) e._hasAttackToken = false;
  }
}

// ── COUNTER-HIT DETECTION ────────────────────────────────────────────────────
// Returns true while `e` is in a telegraph / windup state (the window where a well-
// timed player attack triggers a counter-hit bonus). Excludes bosses in phase transitions
// (they have their own duel parry system); only tests non-duel field states.
export function isTelegraphing(e) {
  if (e.isBoss) return false; // bosses use the duel parry path; never flag here
  // Melee striker windup
  if (e.swingState === 'wind') return true;
  // Shinobi blink-pre-windup (blinking counts as telegraph so a sharp read rewards the player)
  if (e._shinobiBlinking) return true;
  // Ranged windup
  if (e.winding) return true;
  // Charger dash windup
  if (e.dashWindTimer > 0) return true;
  // Lunger leap windup
  if (e.lungeWindTimer > 0) return true;
  // Flyer lock-on windup
  if (e.flyPhase === 'windup') return true;
  return false;
}

export function updateMob(scene, e, delta, dist, ang) {
  // ── DORMANT GARRISON: stand idle until the player is close or has LOS ──────
  // Aggro radius 340px unconditional; 500px when line-of-sight is clear.
  // On aggro: clear the flag, restore tint, and fall through to normal AI.
  if (e._dormant) {
    const AGGRO_NEAR = 340;
    const AGGRO_LOS  = 500;
    let aggroed = dist <= AGGRO_NEAR;
    if (!aggroed && dist <= AGGRO_LOS && scene.floorSys) {
      aggroed = scene.floorSys.hasLOS(e.x, e.y, scene.player.x, scene.player.y);
    }
    if (aggroed) {
      e._dormant = false;
      // Restore tint (elite keeps its elite tint; normal clears to default)
      if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
      else e.clearTint();
    } else {
      e.setVelocity(0, 0);
      return; // still dormant — no movement or attack
    }
  }

  if (e.attack === 'ranged') {
    updateRanged(scene, e, delta, dist, ang);
  } else {
    updateMelee(scene, e, delta, dist, ang);
  }

  // ── CORNER-SLIDE: if arcade body is blocked on one axis while moving toward
  // that wall, zero the blocked component and renorm the other to full speed.
  // This lets enemies slide cleanly around corners instead of snagging.
  // If blocked for > 1 s (accumulated), fall back to the flow-field direction.
  // No per-frame allocs: only uses existing body.blocked and velocity fields.
  if (e.body && e.active) {
    const b = e.body.blocked;
    const vx = e.body.velocity.x;
    const vy = e.body.velocity.y;
    const spd = e.speed || 80;

    // Determine which axes are blocked in the direction of current movement
    const blockedX = (b.left && vx < 0) || (b.right && vx > 0);
    const blockedY = (b.up   && vy < 0) || (b.down  && vy > 0);

    if (blockedX || blockedY) {
      // Accumulate blocked time on this entity (no alloc — stored on entity)
      e._blockedMs = (e._blockedMs || 0) + delta;

      if (e._blockedMs > 1000) {
        // Stuck > 1 s — force flow-field routing to break out of dead-end
        const na = navAngle(scene, e, ang, dist);
        e.body.velocity.x = Math.cos(na) * spd;
        e.body.velocity.y = Math.sin(na) * spd;
      } else {
        // Corner-slide: zero the blocked axis, renorm the free axis to full speed
        let nx = blockedX ? 0 : vx;
        let ny = blockedY ? 0 : vy;
        if (nx !== 0 || ny !== 0) {
          const mag = Math.sqrt(nx * nx + ny * ny) || 1;
          e.body.velocity.x = (nx / mag) * spd;
          e.body.velocity.y = (ny / mag) * spd;
        }
      }
    } else {
      // Not blocked — reset the stuck timer
      e._blockedMs = 0;
    }
  }
}

// Wall-aware MOVEMENT heading toward the player via the floor flow field. When close
// (likely the same room / a straight corridor) it returns the direct angle so motion
// reads smooth; when far it follows the BFS gradient through corridors. Falls back to
// the straight angle in the open world (no floor / no nav). Used for movement only —
// AIM/fire keeps the true `ang`.
export function navAngle(scene, e, fallback, dist) {
  const nav = scene.nav;
  if (!nav || !scene.floorSys) return fallback;
  // Close AND line-of-sight clear → go direct (smooth). Otherwise follow the BFS flow
  // field AROUND the wall — never beeline into rock (that's the "stuck on a wall" bug).
  if (dist != null && dist < 110 && scene.floorSys.hasLOS(e.x, e.y, scene.player.x, scene.player.y)) return fallback;
  const { col, row } = scene.floorSys.worldToTile(e.x, e.y);
  const nd = nav.dirAt(col, row);
  if (!nd || (nd.x === 0 && nd.y === 0)) return fallback;
  return Math.atan2(nd.y, nd.x);
}

// ─────────────────────────────────────────────────────────────────────────────
// RANGED
// ─────────────────────────────────────────────────────────────────────────────

function updateRanged(scene, e, delta, dist, ang) {
  // Siege catapult / scorpio: completely stationary — skip all movement, always fires
  if (e.rangedKind === 'siege' || e.speed === 0) {
    e.setVelocity(0, 0);
    tickRangedFire(scene, e, delta, ang);
    return;
  }

  // Peltast reposition sprint: move perpendicularly for reposTimer ms after firing
  if (e.peltastRepos && e.reposTimer > 0) {
    e.reposTimer -= delta;
    e.setVelocity(e.reposVx || 0, e.reposVy || 0);
    return; // skip standoff logic during sprint
  }

  // No line of sight (a wall blocks the shot)? Reposition AROUND the wall to find an
  // angle instead of standing still firing into rock. (Fixes "they just stand there".)
  if (scene.floorSys && !scene.floorSys.hasLOS(e.x, e.y, scene.player.x, scene.player.y)) {
    const ma = navAngle(scene, e, ang, 999); // 999 forces flow-field routing
    e.setVelocity(Math.cos(ma) * e.speed, Math.sin(ma) * e.speed);
    return;
  }

  // Approach / retreat to preferred standoff range (approach routes around walls;
  // aim/fire below always uses the true `ang` straight at the player).
  if (dist > e.range * 1.08) {
    const ma = navAngle(scene, e, ang, dist);
    e.setVelocity(Math.cos(ma) * e.speed, Math.sin(ma) * e.speed);
  } else if (dist < e.range * 0.7) {
    e.setVelocity(-Math.cos(ang) * e.speed, -Math.sin(ang) * e.speed);
  } else {
    // Mongolian steppe mobility: ranged units strafe laterally at standoff instead of halting
    if (e._mongolStrafeDir == null) e._mongolStrafeDir = Math.random() < 0.5 ? 1 : -1;
    if (scene.stageCiv === 'mongolia' && !e.firesOnMove) {
      const perp = ang + Math.PI / 2 * e._mongolStrafeDir;
      e.setVelocity(Math.cos(perp) * e.speed * 0.6, Math.sin(perp) * e.speed * 0.6);
    } else if (e.firesOnMove) {
      // Horse archer: apply circle orbit while firing
      _applyCircleOrbit(e, ang, dist);
    } else {
      e.setVelocity(0, 0);
    }
    tickRangedFire(scene, e, delta, ang);
  }
}

// Shared circle-orbit velocity helper — used by both the melee circle case and
// the horse archer so the math isn't duplicated.
function _applyCircleOrbit(e, ang, dist) {
  const orbitR = e.orbitRadius || 160;
  const orbitV = e.orbitSpeed  || 120;
  const dir    = e.orbitDir    || 1;
  const radErr = dist - orbitR;
  const radialFraction = Math.min(1, Math.abs(radErr) / orbitR);
  const radialSpeed    = radialFraction * e.speed * (radErr > 0 ? 1 : -1);
  const radX = Math.cos(ang) * radialSpeed;
  const radY = Math.sin(ang) * radialSpeed;
  const tanX = -Math.sin(ang) * dir * orbitV;
  const tanY =  Math.cos(ang) * dir * orbitV;
  const vx = radX + tanX;
  const vy = radY + tanY;
  const mag = Math.sqrt(vx * vx + vy * vy) || 1;
  e.setVelocity((vx / mag) * e.speed, (vy / mag) * e.speed);
}

// Windup-then-fire accumulator (pooling-safe).
function tickRangedFire(scene, e, delta, ang) {
  // Handle mid-burst rapid fire without re-entering the windup path
  if (e.burstActive) {
    tickRapidBurst(scene, e, delta, ang);
    return;
  }

  if (!e.winding) {
    e.fireTimer -= delta;
    if (e.fireTimer <= 0) {
      // Gate the windup on the attack-token cap (elites are always exempt)
      if (!acquireAttackToken(scene, e)) return; // cap full — wait, stay at standoff
      e.winding = true;
      // Cone sweep: telegraph tint is orange (fire) to hint at the mechanic
      e.windRemain = e.windup;
      e.setTint(e.rangedKind === 'cone_sweep' ? 0xff7722 : 0xff5555); // telegraph flash
    }
    return;
  }

  e.windRemain -= delta;
  if (e.windRemain <= 0) {
    fireEnemyShot(scene, e, ang);
    e.winding = false;
    releaseAttackToken(scene, e); // attack resolved — free the slot
    // Gunpowder Discipline (china): reduce cooldown if a hit streak is active
    const baseCd = e.fireCooldown;
    e.fireTimer = (e._chinaStreakUntil && scene.time.now < e._chinaStreakUntil)
      ? baseCd * 0.85
      : baseCd;
    // restore tint unless we just kicked off a burst (burst restores internally)
    if (!e.burstActive) {
      if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
      else e.clearTint();
    }
  }
}

function fireEnemyShot(scene, e, ang) {
  // ang may be stale if caller didn't pass it; recompute to be safe
  const a = (ang !== undefined)
    ? ang
    : Math.atan2(scene.player.y - e.y, scene.player.x - e.x);

  if (scene.enemyFireFx) scene.enemyFireFx(e, a); // muzzle flash + recoil jolt

  // Byzantine Greek Fire Residue civ modifier: leave a small fire patch at firing pos
  if (scene.stageCiv === 'byzantium' && e.attack === 'ranged') {
    scene.spawnHazardZone(e.x, e.y, 30, 6, 0, 9999, 1200, 'fire');
  }

  // Gunpowder Discipline (china): on-hit streak bonus applied in projectile overlap;
  // compute effective fire cooldown here so it's used when the timer resets
  // (e._chinaStreakUntil is set on hit — see GameScene projectile overlap handler)

  const lifespan = (e.projSpeed > 0) ? (e.range / e.projSpeed) * 1000 * 2.4 : 4000;
  // Beast Tongue omen: carry the shooter's kindClass on every projectile so the
  // intake handler in GameScene.onEnemyProjectileHit can apply the modifier.
  const kindClass = (e.typeId && KIND_CLASS[e.typeId]) || null;

  switch (e.rangedKind) {

    // ── Single: one aimed shot ─────────────────────────────────────────────
    case 'single':
    default: {
      // Scorpio: piercing bolt — passes through player, deactivates on lifespan only
      const piercingOpts = e.piercing
        ? { lifespan: 3600, scale: 1.4, tint: 0xd0d0ff, _piercing: true, kindClass }
        : { lifespan, kindClass };
      const proj = scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, e.projDamage, piercingOpts);
      if (proj && e.piercing) proj.piercing = true;
      break;
    }

    // ── Spread: fan of N shots ─────────────────────────────────────────────
    case 'spread': {
      const n = e.spreadCount || 3;
      const half = e.spreadAngle || 0.3;
      // Macedonian Combined Arms: +10% projDamage when a melee unit is nearby
      let dmg = e.projDamage;
      if (scene.stageCiv === 'macedon') {
        let hasMeleeNear = false;
        for (const a2 of scene.enemies.getChildren()) {
          if (a2.active && a2.attack === 'melee') {
            const dx = a2.x - e.x, dy = a2.y - e.y;
            if (dx * dx + dy * dy < 40000) { hasMeleeNear = true; break; }
          }
        }
        if (hasMeleeNear) dmg = Math.round(dmg * 1.10);
      }
      for (let i = 0; i < n; i++) {
        const offset = n === 1 ? 0 : -half + (i / (n - 1)) * half * 2;
        scene.spawnHostileProjectile(e.x, e.y, a + offset, e.projSpeed, dmg, { lifespan, kindClass });
      }
      // Peltast: reposition after firing
      if (e.peltastRepos) {
        const perp = a + (Math.random() < 0.5 ? Math.PI / 2 : -Math.PI / 2);
        e.reposTimer = 700;
        e.reposVx = Math.cos(perp) * e.speed * 1.8;
        e.reposVy = Math.sin(perp) * e.speed * 1.8;
        // randomise next strafe direction
        e._mongolStrafeDir = Math.random() < 0.5 ? 1 : -1;
      }
      break;
    }

    // ── Rapid: kick off a burst; individual shots fired in tickRapidBurst ──
    case 'rapid': {
      // Macedonian Combined Arms: +10% projDamage when melee nearby
      let dmg = e.projDamage;
      if (scene.stageCiv === 'macedon') {
        let hasMeleeNear = false;
        for (const a2 of scene.enemies.getChildren()) {
          if (a2.active && a2.attack === 'melee') {
            const dx = a2.x - e.x, dy = a2.y - e.y;
            if (dx * dx + dy * dy < 40000) { hasMeleeNear = true; break; }
          }
        }
        if (hasMeleeNear) dmg = Math.round(dmg * 1.10);
      }
      e.burstActive = true;
      e.rapidShotsFired = 0;
      e.rapidIntervalTimer = 0;
      e._burstDmg = dmg; // store boosted dmg for the burst
      // fire first shot immediately
      scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, dmg, { lifespan, kindClass });
      e.rapidShotsFired = 1;
      e._burstAng = a; // lock aim direction for the burst
      break;
    }

    // ── Lob: slow, heavy projectile with bonus damage ─────────────────────
    case 'lob':
      scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, e.projDamage, {
        lifespan: lifespan * 1.4,
        scale: 1.6,
        tint: 0xffaa00,
        kindClass,
      });
      break;

    // ── Siege: stationary catapult; drops an AoE hazard zone on the player ─
    case 'siege': {
      // Aim at where the player is RIGHT NOW (no projectile travel — the zone
      // appears at the target after splashDelay ms of pulsing telegraph).
      const tx = scene.player.x;
      const ty = scene.player.y;
      scene.spawnHazardZone(
        tx, ty,
        e.splashRadius,
        e.splashDamage,
        e.splashDelay,
        e.splashTick,
        e.splashLinger
      );
      break;
    }

    // ── Blink: fire one heavy orb then immediately teleport to a flanking spot
    case 'blink': {
      // Fire the projectile first
      scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, e.projDamage, {
        lifespan,
        scale: 1.3,
        tint: 0x8888ff,
        kindClass,
      });
      // TWEAK 8: capture departure position BEFORE teleporting
      const oldX = e.x;
      const oldY = e.y;
      // Teleport: pick a random angle offset from behind/beside the player,
      // place the blinker blinkDistance away so it stays at range.
      const blinkAng = a + Math.PI + (Math.random() - 0.5) * Math.PI; // roughly behind
      const bd = e.blinkDistance || 220;
      const nx = scene.player.x + Math.cos(blinkAng) * bd;
      const ny = scene.player.y + Math.sin(blinkAng) * bd;
      e.setPosition(nx, ny);
      e.body.reset(nx, ny);
      // Brief white flash to signal the teleport
      e.setTint(0xffffff);
      scene.time.delayedCall(120, () => {
        if (e.active) {
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
          else e.clearTint();
        }
      });
      // TWEAK 8: leave a hazard zone at the departure point (punishes blindly dashing there)
      if (e.blinkLeaveZone) {
        scene.spawnHazardZone(
          oldX, oldY,
          e.blinkZoneRadius || 55,
          e.blinkZoneDmg || 6,
          0,
          e.blinkZoneTick || 300,
          e.blinkZoneDuration || 1200,
          'acid',
          'player'
        );
      }
      break;
    }

    // ── Cone sweep: Greek Fire Siphon — 5 hazard zones in a sweeping arc ──
    case 'cone_sweep': {
      const count = e.coneSweepCount || 5;
      const halfAngle = e.coneSweepAngle || 0.87; // ~50 deg half-arc
      const interval = e.coneSweepInterval || 160;
      const dist2 = Math.min(e.range * 0.6, 120);
      const dmg2 = e.projDamage || 8;
      for (let i = 0; i < count; i++) {
        const t = i / Math.max(1, count - 1); // 0..1
        const sweepAng = a + (-halfAngle + t * halfAngle * 2);
        scene.time.delayedCall(i * interval, () => {
          if (!e.active) return;
          const zx = e.x + Math.cos(sweepAng) * dist2;
          const zy = e.y + Math.sin(sweepAng) * dist2;
          scene.spawnHazardZone(zx, zy, 40, dmg2, 0, 300, 2500, 'fire');
        });
      }
      break;
    }
  }
}

function tickRapidBurst(scene, e, delta, ang) {
  e.rapidIntervalTimer -= delta;
  if (e.rapidIntervalTimer > 0) return;

  e.rapidIntervalTimer = e.rapidInterval;
  if (e.rapidShotsFired < e.rapidBurst) {
    const a = e._burstAng; // use locked aim
    const lifespan = (e.range / e.projSpeed) * 1000 * 2.4;
    const dmg = e._burstDmg != null ? e._burstDmg : e.projDamage;
    const kindClass = (e.typeId && KIND_CLASS[e.typeId]) || null;
    scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, dmg, { lifespan, kindClass });
    e.rapidShotsFired++;
  }

  if (e.rapidShotsFired >= e.rapidBurst) {
    e.burstActive = false;
    e._burstDmg = null;
    if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
    else e.clearTint();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MELEE
// ─────────────────────────────────────────────────────────────────────────────

function updateMelee(scene, e, delta, dist, ang) {
  // Strikers (chase/zigzag/circle with def.swing) layer a telegraphed slash over their
  // movement: approach normally, then stop → wind up → arc-strike → recover. While the
  // swing owns the frame, skip the movement switch below.
  if (e.swing && handleSwing(scene, e, delta, dist, ang)) return;
  switch (e.move) {

    // ── Chase: beeline, but route through corridors (flow field) when walled ──
    case 'chase':
    default: {
      const ma = navAngle(scene, e, ang, dist);
      e._moveAng = ma; // testudo facing — stored each frame for frontal-block check
      e.setVelocity(Math.cos(ma) * e.speed, Math.sin(ma) * e.speed);
      break;
    }

    // ── Zigzag: chase (wall-aware) + perpendicular sine weave ──────────────
    case 'zigzag': {
      const ma = navAngle(scene, e, ang, dist);
      e.weavePhase = (e.weavePhase || 0) + (e.weaveFreq * delta / 1000) * Math.PI * 2;
      const perpX = -Math.sin(ma);
      const perpY =  Math.cos(ma);
      const weave = Math.sin(e.weavePhase) * e.weaveAmp;
      // Blend chase direction + perpendicular offset normalised back to speed
      const vx = Math.cos(ma) * e.speed + perpX * weave * 0.6;
      const vy = Math.sin(ma) * e.speed + perpY * weave * 0.6;
      const mag = Math.sqrt(vx * vx + vy * vy) || 1;
      e.setVelocity((vx / mag) * e.speed, (vy / mag) * e.speed);
      break;
    }

    // ── Circle: orbit at preferred radius, occasionally closing ───────────
    case 'circle': {
      _applyCircleOrbit(e, ang, dist);
      break;
    }

    // ── Charger: slow approach → tint telegraph → fast dash ───────────────
    case 'charger': {
      // Phase 1: dashing (active attack window — token held, contactDamage boosted)
      if (e.dashActive) {
        e.dashTimer -= delta;
        if (e.dashTimer > 0) {
          e.setVelocity(e.dashDx * e.dashSpeed, e.dashDy * e.dashSpeed);
          // Chariot wake: spawn trail hazard zones during the dash
          if (e.chariotWake) {
            e.wakeAccum = (e.wakeAccum || 0) - delta;
            if (e.wakeAccum <= 0) {
              e.wakeAccum = e.wakeInterval || 100;
              scene.spawnHazardZone(e.x, e.y, 55, 10, 0, 9999, 800, 'trample');
            }
          }
        } else {
          // end dash — release token and restore passive contact damage
          e.dashActive = false;
          e.dashTimer  = e.dashCooldown;
          releaseAttackToken(scene, e);
          e.contactDamage = e._baseContactDamage != null ? e._baseContactDamage : e.damage;
          // Kataphraktoi wake: trample zone at dash endpoint
          if (e.kataWake) {
            scene.spawnHazardZone(e.x, e.y, 60, 14, 0, 9999, 1000, 'trample');
          }
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
          else e.clearTint();
        }
        return;
      }

      // Phase 2: windup telegraph
      if (e.dashWindTimer > 0) {
        e.dashWindTimer -= delta;
        e.setVelocity(0, 0); // freeze during windup
        if (e.dashWindTimer <= 0) {
          // Launch the dash — boost contactDamage for the active attack window (+25%)
          e.dashDx = Math.cos(ang);
          e.dashDy = Math.sin(ang);
          e.dashActive = true;
          e.dashTimer  = e.dashDuration;
          if (e._baseContactDamage == null) e._baseContactDamage = e.contactDamage;
          e.contactDamage = Math.round(e._baseContactDamage * 1.25);
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
          else e.clearTint();
        }
        return;
      }

      // Phase 3: slow approach + cooldown counting
      e.dashTimer -= delta;
      e.setVelocity(Math.cos(ang) * e.speed, Math.sin(ang) * e.speed);

      // Trigger windup when close enough and cooldown has expired — gate on attack tokens
      if (e.dashTimer <= 0 && dist <= e.dashRange) {
        if (!acquireAttackToken(scene, e)) break; // cap full — keep approaching
        e.dashWindTimer = e.dashWindup;
        e.setTint(0xff2200); // danger flash during telegraph
        e.dashTimer = 0; // prevent double-trigger
      }
      break;
    }

    // ── Lunger: approach to mid-range → windup → leap → recover ───────────
    case 'lunger': {
      // Phase 1: active lunge (attack window — contactDamage boosted, token held)
      if (e.lungeActive) {
        e.lungeTimer -= delta;
        e._lungeElapsed = (e._lungeElapsed || 0) + delta;
        if (e.lungeTimer > 0) {
          e.setVelocity(e.lungeDx * e.lungeSpeed, e.lungeDy * e.lungeSpeed);
          // TWEAK 4: mid-lunge re-aim — fires once at 40% of lunge duration
          if (e.lungeReaim && !e._lungeReaimed && e._lungeElapsed >= (e.lungeDuration || 300) * 0.40) {
            e._lungeReaimed = true;
            const newAng = Math.atan2(scene.player.y - e.y, scene.player.x - e.x);
            const diff = Phaser.Math.Angle.Wrap(newAng - e.lungeDir);
            const clamp = 0.61; // 35° max correction
            e.lungeDir = e.lungeDir + Math.max(-clamp, Math.min(clamp, diff));
            e.lungeDx = Math.cos(e.lungeDir);
            e.lungeDy = Math.sin(e.lungeDir);
            scene.physics.velocityFromRotation(e.lungeDir, e.lungeSpeed, e.body.velocity);
            // Orange flash so the player can read the redirect
            scene.fx._flash(e.x, e.y, 7, 0xff9900, 0.6, 80);
          }
        } else {
          // end lunge, enter recovery — release token, restore contact damage
          e.lungeActive = false;
          e.lungeRecovering = true;
          e.lungeRecoverTimer = e.recoverTime;
          e._lungeReaimed = false; // reset for next lunge
          e._lungeElapsed = 0;
          releaseAttackToken(scene, e);
          e.contactDamage = e._baseContactDamage != null ? e._baseContactDamage : e.damage;
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
          else e.clearTint();
        }
        return;
      }

      // Phase 2: recovery (stand still)
      if (e.lungeRecovering) {
        e.lungeRecoverTimer -= delta;
        e.setVelocity(0, 0);
        if (e.lungeRecoverTimer <= 0) {
          e.lungeRecovering = false;
          // reset cooldown for next lunge
          e.lungeTimer = e.lungeCooldown;
        }
        return;
      }

      // Phase 3: windup telegraph
      if (e.lungeWindTimer > 0) {
        e.lungeWindTimer -= delta;
        e.setVelocity(0, 0);
        if (e.lungeWindTimer <= 0) {
          // launch — boost contactDamage for the active leap window (+25%)
          e.lungeDir = ang; // snapshot aim angle for TWEAK 4 re-aim
          e.lungeDx = Math.cos(ang);
          e.lungeDy = Math.sin(ang);
          e.lungeActive = true;
          e.lungeTimer  = e.lungeDuration;
          e._lungeElapsed = 0; // reset elapsed for re-aim timing
          e._lungeReaimed = false;
          if (e._baseContactDamage == null) e._baseContactDamage = e.contactDamage;
          e.contactDamage = Math.round(e._baseContactDamage * 1.25);
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
          else e.clearTint();
        }
        return;
      }

      // Phase 4: approach and count down to next lunge — gate on attack tokens
      e.lungeTimer -= delta;
      e.setVelocity(Math.cos(ang) * e.speed, Math.sin(ang) * e.speed);

      if (e.lungeTimer <= 0 && dist <= e.lungeRange) {
        if (!acquireAttackToken(scene, e)) break; // cap full — keep approaching
        e.lungeWindTimer = e.lungeWindup;
        e.setTint(0x44ff44); // bright green tell for the lunge
        e.lungeTimer = 0;
      }
      break;
    }

    // ── Flyer: cruise approach → lock-on windup → high-speed dive pass →
    //          fly off screen → bank back and repeat ─────────────────────────
    case 'flyer': {
      // flyPhase: 'approach' | 'windup' | 'dive' | 'exit'
      const flyPhase = e.flyPhase || 'approach';

      if (flyPhase === 'approach') {
        // Cruise toward the player at base speed; switch to windup when close
        e.setVelocity(Math.cos(ang) * e.speed, Math.sin(ang) * e.speed);
        if (dist <= (e.diveRange || 260)) {
          if (!acquireAttackToken(scene, e)) break; // cap full — keep approaching
          e.flyPhase    = 'windup';
          e.flyWindRemain = e.diveWindup || 260;
          e.setTint(0xff8800); // orange lock-on flash
        }

      } else if (flyPhase === 'windup') {
        // Freeze briefly while locked on, then launch the dive
        e.flyWindRemain -= delta;
        e.setVelocity(0, 0);
        if (e.flyWindRemain <= 0) {
          // Snapshot the dive direction toward the player at launch; boost contact damage
          e.flyDx = Math.cos(ang);
          e.flyDy = Math.sin(ang);
          e.flyPhase = 'dive';
          if (e._baseContactDamage == null) e._baseContactDamage = e.contactDamage;
          e.contactDamage = Math.round(e._baseContactDamage * 1.25);
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
          else e.clearTint();
        }

      } else if (flyPhase === 'dive') {
        // Blast through the player and keep going off-screen
        const spd = e.diveSpeed || 420;
        e.setVelocity(e.flyDx * spd, e.flyDy * spd);
        // Once far enough past the player, transition to exit phase
        if (dist > (e.diveRange || 260) * 1.6) {
          e.flyPhase    = 'exit';
          e.flyExitTimer = e.exitDuration || 1200;
          releaseAttackToken(scene, e); // dive resolved — free the token
          e.contactDamage = e._baseContactDamage != null ? e._baseContactDamage : e.damage;
        }

      } else { // 'exit'
        // Keep flying in the same direction (off screen); count down then bank back
        e.flyExitTimer -= delta;
        const spd = e.diveSpeed || 420;
        e.setVelocity(e.flyDx * spd * 0.55, e.flyDy * spd * 0.55); // decelerate slightly
        if (e.flyExitTimer <= 0) {
          // Return: flip direction and re-enter approach so it comes back naturally
          e.flyPhase = 'approach';
        }
      }
      break;
    }

    // ── Bomber: rush toward player → light fuse (flash) → detonate AoE ─────
    case 'bomber': {
      // bomberPhase: 'rush' | 'fuse'
      if (e.bomberPhase === 'fuse') {
        // Freeze, tick down fuse, flash red while burning
        e.bomberFuseTimer -= delta;
        e.setVelocity(0, 0);
        // Alternate tint each ~100 ms for a visible flicker effect
        e.bomberFlashAccum = (e.bomberFlashAccum || 0) + delta;
        if (e.bomberFlashAccum >= 100) {
          e.bomberFlashAccum = 0;
          e.bomberFlashState = !e.bomberFlashState;
          e.setTint(e.bomberFlashState ? 0xff2200 : 0xffff00);
        }
        if (e.bomberFuseTimer <= 0) {
          // BOOM — spawn a hazard zone and self-deactivate (no XP for suicide)
          scene.spawnHazardZone(
            e.x, e.y,
            e.blastRadius,
            e.blastDamage,
            e.blastDelay,
            e.blastTick,
            e.blastLinger
          );
          scene.deactivate(e);
        }
        return;
      }

      // 'rush' phase: sprint straight at the player
      e.setVelocity(Math.cos(ang) * e.speed, Math.sin(ang) * e.speed);
      if (dist <= (e.fuseRange || 80)) {
        // Close enough — light the fuse
        e.bomberPhase     = 'fuse';
        e.bomberFuseTimer = e.fuseDuration || 1400;
        e.bomberFlashAccum = 0;
        e.bomberFlashState = false;
      }
      break;
    }
  }
}

// Telegraphed melee swing shared by chase/zigzag/circle strikers. Returns true while the
// swing owns the frame (windup/strike/recover) so the caller suspends movement. When idle
// it ticks the cooldown and, if the player is in reach, opens the windup telegraph.
function handleSwing(scene, e, delta, dist, ang) {
  if (e.swingCd > 0) e.swingCd -= delta;

  // Phase 1: windup — freeze, flash red. The facing was snapshotted at trigger, so the
  // player can sidestep out of the arc during the telegraph to dodge the hit entirely.
  if (e.swingState === 'wind') {
    e.swingTimer -= delta;
    e.setVelocity(0, 0);
    if (e.swingTimer <= 0) {
      e.swingState = 'strike';
      e.swingTimer = e.swingActiveT;
      e.swingHitDone = false;
      scene.enemySwingArc(e, e.swingAng); // the slash visual
    }
    return true;
  }

  // Phase 2: strike — step forward into the swing; resolve the hit once.
  if (e.swingState === 'strike') {
    e.swingTimer -= delta;
    e.setVelocity(Math.cos(e.swingAng) * e.speed * 0.6, Math.sin(e.swingAng) * e.speed * 0.6);
    if (!e.swingHitDone) {
      e.swingHitDone = true;
      const pdx = scene.player.x - e.x, pdy = scene.player.y - e.y;
      const pd = Math.sqrt(pdx * pdx + pdy * pdy);
      if (scene.player.active && pd <= e.swingRange + 20) {
        const da = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(pdy, pdx) - e.swingAng));
        if (da <= e.swingArc / 2) {
          const dmg = Math.round(e.damage * (e.swingDmgMult || 1));
          // The swing is dodged by stepping out of the arc; it still respects i-frames so a
          // swarm of simultaneous swings can't stack into a one-shot burst.
          scene.reactToHit(scene.player.takeDamage(dmg, scene.time.now));
        }
      }
      // Fire-Lance: spawn a lingering ground hazard patch in front on strike
      if (e.fireLance) {
        const fx = e.x + Math.cos(e.swingAng) * 48;
        const fy = e.y + Math.sin(e.swingAng) * 48;
        scene.spawnHazardZone(fx, fy, 50, 18, 0, 9999, 600, 'fire');
      }
    }
    if (e.swingTimer <= 0) {
      e.swingState = 'recover';
      e.swingTimer = e.swingRecover;
      releaseAttackToken(scene, e); // strike resolved — free the slot
      if (e.isElite) e.setTint(e.eliteTint || 0xffd54a); else e.clearTint();
    }
    return true;
  }

  // Phase 3: recover — brief hang before it can move/swing again.
  if (e.swingState === 'recover') {
    e.swingTimer -= delta;
    e.setVelocity(0, 0);
    if (e.swingTimer <= 0) {
      e.swingState = null;
      e.swingCd = e.swingCooldown;
    }
    return true;
  }

  // Idle: in reach and off cooldown → start the windup (red telegraph, snapshot facing).
  // Gate on the attack-token cap so only ATTACK_TOKEN_CAP strikers can wind up at once.
  if (e.swingCd <= 0 && dist <= e.swingRange) {
    if (!acquireAttackToken(scene, e)) return false; // cap full — keep approaching
    // Shinobi: blink BEHIND the player first, then start the wind
    if (e.shinobiStrike && !e._shinobiBlinking) {
      e._shinobiBlinking = true;
      const blinkAng = ang + Math.PI + (Math.random() - 0.5) * 0.6; // roughly behind
      const bd = e.blinkDistance || 170;
      const nx = scene.player.x + Math.cos(blinkAng) * bd;
      const ny = scene.player.y + Math.sin(blinkAng) * bd;
      e.setPosition(nx, ny);
      e.body.reset(nx, ny);
      // Purple smoke flash for the shinobi blink
      e.setTint(0xaa44ff);
      scene.time.delayedCall(80, () => {
        e._shinobiBlinking = false;
        if (e.active) {
          e.swingState = 'wind';
          e.swingTimer = e.swingWindup;
          // new ang from blink position to player
          e.swingAng = Math.atan2(scene.player.y - e.y, scene.player.x - e.x);
          e.setTint(0xff3030);
        }
      });
      return true; // own the frame while blinking
    }
    e.swingState = 'wind';
    e.swingTimer = e.swingWindup;
    e.swingAng = ang;
    e.setTint(0xff3030);
    return true;
  }
  return false; // not swinging — let the movement switch run (keep approaching)
}
