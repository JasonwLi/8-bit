// Per-mob AI for non-boss enemies. GameScene.updateEnemies() handles boss
// routing, curse/elite hooks, then delegates each mob's movement + attack here.
//
// Melee `move` tags:  'chase' | 'zigzag' | 'circle' | 'charger' | 'lunger' | 'flyer' | 'bomber'
// Ranged `rangedKind`: 'single' | 'spread' | 'rapid' | 'lob' | 'siege' | 'blink'
// Projectiles go through scene.spawnHostileProjectile().
// AoE zones go through scene.spawnHazardZone(x, y, radius, dmg, delay, tick, linger).

export function updateMob(scene, e, delta, dist, ang) {
  if (e.attack === 'ranged') {
    updateRanged(scene, e, delta, dist, ang);
    return;
  }
  updateMelee(scene, e, delta, dist, ang);
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
  // Siege catapult: completely stationary — skip all movement, always fires
  if (e.rangedKind === 'siege') {
    e.setVelocity(0, 0);
    tickRangedFire(scene, e, delta, ang);
    return;
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
    e.setVelocity(0, 0);
    tickRangedFire(scene, e, delta, ang);
  }
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
      e.winding = true;
      e.windRemain = e.windup;
      e.setTint(0xff5555); // telegraph flash
    }
    return;
  }

  e.windRemain -= delta;
  if (e.windRemain <= 0) {
    fireEnemyShot(scene, e, ang);
    e.winding = false;
    e.fireTimer = e.fireCooldown;
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

  const lifespan = (e.range / e.projSpeed) * 1000 * 2.4;

  switch (e.rangedKind) {

    // ── Single: one aimed shot ─────────────────────────────────────────────
    case 'single':
    default:
      scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, e.projDamage, { lifespan });
      break;

    // ── Spread: fan of N shots ─────────────────────────────────────────────
    case 'spread': {
      const n = e.spreadCount || 3;
      const half = e.spreadAngle || 0.3;
      for (let i = 0; i < n; i++) {
        const offset = n === 1 ? 0 : -half + (i / (n - 1)) * half * 2;
        scene.spawnHostileProjectile(
          e.x, e.y, a + offset, e.projSpeed, e.projDamage,
          { lifespan }
        );
      }
      break;
    }

    // ── Rapid: kick off a burst; individual shots fired in tickRapidBurst ──
    case 'rapid':
      e.burstActive = true;
      e.rapidShotsFired = 0;
      e.rapidIntervalTimer = 0;
      // fire first shot immediately
      scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, e.projDamage, { lifespan });
      e.rapidShotsFired = 1;
      e._burstAng = a; // lock aim direction for the burst
      break;

    // ── Lob: slow, heavy projectile with bonus damage ─────────────────────
    case 'lob':
      scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, e.projDamage, {
        lifespan: lifespan * 1.4,
        scale: 1.6,
        tint: 0xffaa00,
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
      });
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
    scene.spawnHostileProjectile(e.x, e.y, a, e.projSpeed, e.projDamage, { lifespan });
    e.rapidShotsFired++;
  }

  if (e.rapidShotsFired >= e.rapidBurst) {
    e.burstActive = false;
    if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
    else e.clearTint();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MELEE
// ─────────────────────────────────────────────────────────────────────────────

function updateMelee(scene, e, delta, dist, ang) {
  switch (e.move) {

    // ── Chase: beeline, but route through corridors (flow field) when walled ──
    case 'chase':
    default: {
      const ma = navAngle(scene, e, ang, dist);
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
      const orbitR  = e.orbitRadius || 160;
      const orbitV  = e.orbitSpeed  || 120;
      const dir     = e.orbitDir    || 1;
      const radErr  = dist - orbitR;

      // Radial component: close in or back off
      const radialFraction = Math.min(1, Math.abs(radErr) / orbitR);
      const radialSpeed    = radialFraction * e.speed * (radErr > 0 ? 1 : -1);
      const radX = Math.cos(ang) * radialSpeed;
      const radY = Math.sin(ang) * radialSpeed;

      // Tangential component: strafe perpendicular
      const tanX = -Math.sin(ang) * dir * orbitV;
      const tanY =  Math.cos(ang) * dir * orbitV;

      // Normalise to e.speed so mobs don't suddenly slow when they hit orbit radius
      const vx = radX + tanX;
      const vy = radY + tanY;
      const mag = Math.sqrt(vx * vx + vy * vy) || 1;
      e.setVelocity((vx / mag) * e.speed, (vy / mag) * e.speed);
      break;
    }

    // ── Charger: slow approach → tint telegraph → fast dash ───────────────
    case 'charger': {
      // Phase 1: dashing
      if (e.dashActive) {
        e.dashTimer -= delta;
        if (e.dashTimer > 0) {
          e.setVelocity(e.dashDx * e.dashSpeed, e.dashDy * e.dashSpeed);
        } else {
          // end dash
          e.dashActive = false;
          e.dashTimer  = e.dashCooldown;
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
          // Launch the dash
          e.dashDx = Math.cos(ang);
          e.dashDy = Math.sin(ang);
          e.dashActive = true;
          e.dashTimer  = e.dashDuration;
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
          else e.clearTint();
        }
        return;
      }

      // Phase 3: slow approach + cooldown counting
      e.dashTimer -= delta;
      e.setVelocity(Math.cos(ang) * e.speed, Math.sin(ang) * e.speed);

      // Trigger windup when close enough and cooldown has expired
      if (e.dashTimer <= 0 && dist <= e.dashRange) {
        e.dashWindTimer = e.dashWindup;
        e.setTint(0xff2200); // danger flash during telegraph
        e.dashTimer = 0; // prevent double-trigger
      }
      break;
    }

    // ── Lunger: approach to mid-range → windup → leap → recover ───────────
    case 'lunger': {
      // Phase 1: active lunge
      if (e.lungeActive) {
        e.lungeTimer -= delta;
        if (e.lungeTimer > 0) {
          e.setVelocity(e.lungeDx * e.lungeSpeed, e.lungeDy * e.lungeSpeed);
        } else {
          // end lunge, enter recovery
          e.lungeActive = false;
          e.lungeRecovering = true;
          e.lungeRecoverTimer = e.recoverTime;
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
          // launch
          e.lungeDx = Math.cos(ang);
          e.lungeDy = Math.sin(ang);
          e.lungeActive = true;
          e.lungeTimer  = e.lungeDuration;
          if (e.isElite) e.setTint(e.eliteTint || 0xffd54a);
          else e.clearTint();
        }
        return;
      }

      // Phase 4: approach and count down to next lunge
      e.lungeTimer -= delta;
      e.setVelocity(Math.cos(ang) * e.speed, Math.sin(ang) * e.speed);

      if (e.lungeTimer <= 0 && dist <= e.lungeRange) {
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
          e.flyPhase    = 'windup';
          e.flyWindRemain = e.diveWindup || 260;
          e.setTint(0xff8800); // orange lock-on flash
        }

      } else if (flyPhase === 'windup') {
        // Freeze briefly while locked on, then launch the dive
        e.flyWindRemain -= delta;
        e.setVelocity(0, 0);
        if (e.flyWindRemain <= 0) {
          // Snapshot the dive direction toward the player at launch
          e.flyDx = Math.cos(ang);
          e.flyDy = Math.sin(ang);
          e.flyPhase = 'dive';
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
