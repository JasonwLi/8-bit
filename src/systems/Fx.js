// Procedural visual effects: floating damage numbers, hit flashes + sparks,
// death poofs, muzzle flares, expanding shockwaves, and AoE explosions. Effects
// are dynamic, so they're DRAWN here (graphics + tweens + particle emitters)
// rather than baked sprites. Per-frame budgets cap transient spawns so a screen
// full of enemies stays performant.
import Phaser from 'phaser';

export default class Fx {
  constructor(scene) {
    this.scene = scene;

    // bright additive sparks (hits)
    this.spark = scene.add.particles(0, 0, 'spark', {
      speed: { min: 60, max: 210 }, lifespan: 300, scale: { start: 1.1, end: 0 },
      quantity: 0, emitting: false, tint: 0xffe08a, blendMode: 'ADD',
    }).setDepth(11);

    // soft grey debris (deaths)
    this.poof = scene.add.particles(0, 0, 'spark', {
      speed: { min: 30, max: 100 }, lifespan: 380, scale: { start: 1.5, end: 0 },
      quantity: 0, emitting: false, tint: 0xbfc4d0,
    }).setDepth(6);

    // drifting embers (explosions)
    this.embers = scene.add.particles(0, 0, 'spark', {
      speed: { min: 40, max: 170 }, lifespan: 520, scale: { start: 1.3, end: 0 },
      quantity: 0, emitting: false, tint: 0xff8a3a, blendMode: 'ADD', gravityY: 70,
    }).setDepth(11);

    // glowing fade behind moving projectiles (a comet-style trail)
    this.trailEmitter = scene.add.particles(0, 0, 'spark', {
      speed: 0, lifespan: 220, scale: { start: 0.9, end: 0 }, alpha: { start: 0.8, end: 0 },
      quantity: 0, emitting: false, tint: 0xffffff, blendMode: 'ADD',
    }).setDepth(7);

    // dust / smoke puffs (gunfire smoke, cavalry hoofbeats)
    this.dustEmitter = scene.add.particles(0, 0, 'spark', {
      speed: { min: 20, max: 80 }, lifespan: 480, scale: { start: 2.2, end: 0 },
      alpha: { start: 0.55, end: 0 }, quantity: 0, emitting: false, tint: 0xc8c0b0,
      gravityY: -18,
    }).setDepth(9);

    // golden shimmer (Gilgamesh divine weapons)
    this.goldEmitter = scene.add.particles(0, 0, 'spark', {
      speed: { min: 30, max: 140 }, lifespan: 400, scale: { start: 1.4, end: 0 },
      quantity: 0, emitting: false, tint: 0xffd700, blendMode: 'ADD',
    }).setDepth(12);

    // fiery impact burst (greek fire landing)
    this.fireEmitter = scene.add.particles(0, 0, 'spark', {
      speed: { min: 50, max: 200 }, lifespan: 600, scale: { start: 1.8, end: 0 },
      quantity: 0, emitting: false, tint: 0xff6a00, blendMode: 'ADD', gravityY: -30,
    }).setDepth(11);

    this.activeNumbers = 0;
    this.newFrame();
  }

  newFrame() {
    this.budgetSpark = 10;
    this.budgetPoof = 12;
    this.budgetNum = 6;
    this.budgetTrail = 60; // shared across all in-flight projectiles per frame
  }

  // a glowing dot dropped behind a moving projectile (call each frame from its update)
  trail(x, y, color = 0xffffff) {
    if (this.budgetTrail <= 0) return;
    this.budgetTrail -= 1;
    this._tint(this.trailEmitter, color);
    this.trailEmitter.emitParticleAt(x, y, 1);
  }

  // --- low-level helpers ---
  _flash(x, y, r, color, alpha, dur) {
    const c = this.scene.add.circle(x, y, r, color, alpha).setDepth(12).setBlendMode('ADD');
    this.scene.tweens.add({ targets: c, scale: 1.9, alpha: 0, duration: dur, ease: 'Quad.easeOut', onComplete: () => c.destroy() });
  }

  _ring(x, y, toRadius, color, dur, width = 4) {
    const base = 18;
    const ring = this.scene.add.circle(x, y, base).setDepth(12).setStrokeStyle(width, color, 1).setFillStyle(0, 0).setScale(0.3);
    this.scene.tweens.add({ targets: ring, scale: toRadius / base, alpha: 0, duration: dur, ease: 'Cubic.easeOut', onComplete: () => ring.destroy() });
  }

  _tint(emitter, color) { if (emitter.setParticleTint) emitter.setParticleTint(color); }

  damageNumber(x, y, amount, { color = '#ffffff', big = false } = {}) {
    if (this.activeNumbers > 48 || this.budgetNum <= 0) return;
    this.budgetNum -= 1;
    this.activeNumbers += 1;
    const t = this.scene.add
      .text(x + (Math.random() * 10 - 5), y - 10, `${amount}`, {
        fontFamily: 'monospace', fontSize: big ? '18px' : '12px', color, fontStyle: big ? 'bold' : 'normal',
      })
      .setOrigin(0.5).setDepth(15);
    if (big) t.setScale(1.6); // crit pops bigger, then settles
    this.scene.tweens.add({ targets: t, scale: big ? 1 : t.scaleX, y: t.y - (big ? 34 : 24), alpha: 0, duration: big ? 720 : 500, ease: 'Quad.easeOut', onComplete: () => { t.destroy(); this.activeNumbers -= 1; } });
  }

  // a hit landing: white pop + a few colored sparks
  impact(x, y, color = 0xffe08a) {
    if (this.budgetSpark <= 0) return;
    this.budgetSpark -= 1;
    this._tint(this.spark, color);
    this.spark.emitParticleAt(x, y, 4);
    this._flash(x, y, 5, 0xffffff, 0.9, 120);
  }

  // an enemy dying: debris poof + a small ring + colored sparks + soft pop
  death(x, y, color = 0xbfc4d0) {
    if (this.budgetPoof <= 0) return;
    this.budgetPoof -= 1;
    this.poof.emitParticleAt(x, y, 8);
    this._tint(this.spark, color);
    this.spark.emitParticleAt(x, y, 5);
    this._ring(x, y, 56, color, 340, 3);
    this._flash(x, y, 8, 0xffffff, 0.7, 160);
  }

  // weapon firing: a quick colored flare + a spark or two
  muzzle(x, y, color = 0xffe08a) {
    this._flash(x, y, 7, color, 0.85, 140);
    this._tint(this.spark, color);
    this.spark.emitParticleAt(x, y, 2);
  }

  // expanding shockwave (boss casts, phase shifts, finishers): twin rings + soft core
  shockwave(x, y, color = 0xffffff, maxRadius = 220) {
    this._ring(x, y, maxRadius, color, 440, 4);
    this._ring(x, y, maxRadius * 0.7, 0xffffff, 360, 2);
    this._flash(x, y, maxRadius * 0.22, color, 0.4, 200);
  }

  // a punchy AoE detonation (spells, greek fire, big deaths): flash + fire flash +
  // twin rings + an ember burst.
  explosion(x, y, color = 0xff8a3a, radius = 120) {
    this._flash(x, y, radius * 0.3, 0xffffff, 0.95, 140);
    this._flash(x, y, radius * 0.5, color, 0.6, 260);
    this._ring(x, y, radius * 1.4, color, 420, 5);
    this._ring(x, y, radius * 0.9, 0xffffff, 300, 2);
    this._tint(this.embers, color);
    this.embers.emitParticleAt(x, y, 12);
  }

  // Muzzle flash with smoke for gunfire: bright flash + a grey puff cloud
  gunMuzzle(x, y, angle) {
    const ox = Math.cos(angle) * 14;
    const oy = Math.sin(angle) * 14;
    this._flash(x + ox, y + oy, 9, 0xffffff, 1.0, 80);
    this._flash(x + ox, y + oy, 5, 0xffe08a, 0.85, 130);
    this.dustEmitter.emitParticleAt(x + ox, y + oy, 5);
  }

  // Precision sniper muzzle flash for Nobunaga's Tanegashima shot:
  // bigger sharper flash, heavy smoke cloud, side sparks (shell ejection feel).
  sniperMuzzle(x, y, angle) {
    const ox = Math.cos(angle) * 16;
    const oy = Math.sin(angle) * 16;
    // white core flash — instant bright pop
    this._flash(x + ox, y + oy, 14, 0xffffff, 1.0, 60);
    this._flash(x + ox, y + oy, 9, 0xffe08a, 0.95, 120);
    // secondary side flash at the barrel for a muzzle-crown effect
    const perpX = -Math.sin(angle) * 5;
    const perpY = Math.cos(angle) * 5;
    this._flash(x + ox + perpX, y + oy + perpY, 5, 0xffd080, 0.7, 90);
    this._flash(x + ox - perpX, y + oy - perpY, 5, 0xffd080, 0.7, 90);
    // heavy smoke
    this.dustEmitter.emitParticleAt(x + ox, y + oy, 8);
    // bright hot sparks (ejecting case / propellant)
    this._tint(this.spark, 0xfff0a0);
    this.spark.emitParticleAt(x + ox, y + oy, 4);
  }

  // Bright tracer line drawn from the muzzle forward — shows the shot's path for
  // a split-second so each matchlock blast reads as a real gunshot.
  // `reachSec`: bullet lifespan in seconds (used to scale the visible tracer length).
  gunTracer(x, y, angle, reachSec = 1.0) {
    const scene = this.scene;
    const length = Math.min(320, 240 * reachSec); // cap so tracers don't go off-screen
    const ex = x + Math.cos(angle) * length;
    const ey = y + Math.sin(angle) * length;
    const tracer = scene.add.graphics().setDepth(10).setBlendMode('ADD');
    tracer.lineStyle(2, 0xffffc0, 0.9);
    tracer.beginPath();
    tracer.moveTo(x, y);
    tracer.lineTo(ex, ey);
    tracer.strokePath();
    // bright leading dot
    const dot = scene.add.circle(ex, ey, 3, 0xffffff, 1.0).setDepth(11).setBlendMode('ADD');
    scene.tweens.add({ targets: [tracer, dot], alpha: 0, duration: 90, ease: 'Quad.easeOut', onComplete: () => { tracer.destroy(); dot.destroy(); } });
  }

  // Muzzle for scattershot: wider burst
  scatterMuzzle(x, y, angle) {
    const ox = Math.cos(angle) * 10;
    const oy = Math.sin(angle) * 10;
    this._flash(x + ox, y + oy, 14, 0xffffff, 1.0, 90);
    this._flash(x + ox, y + oy, 10, 0xffb14d, 0.85, 160);
    this._tint(this.spark, 0xffb14d);
    this.spark.emitParticleAt(x + ox, y + oy, 6);
    this.dustEmitter.emitParticleAt(x + ox, y + oy, 8);
  }

  // Greek fire flame burst on landing/cast: orange explosion + fire embers
  flameBurst(x, y, radius = 80) {
    this._flash(x, y, radius * 0.4, 0xffffff, 0.95, 110);
    this._flash(x, y, radius * 0.6, 0xff7b1c, 0.7, 240);
    this._ring(x, y, radius * 1.2, 0xff7b1c, 360, 4);
    this._tint(this.fireEmitter, 0xff6a00);
    this.fireEmitter.emitParticleAt(x, y, 10);
    this._tint(this.embers, 0xff8a3a);
    this.embers.emitParticleAt(x, y, 8);
  }

  // Greek fire nova radial ignition — ring of flame
  fireNovaBurst(x, y) {
    this._flash(x, y, 18, 0xffffff, 1.0, 100);
    this._flash(x, y, 28, 0xff4500, 0.75, 200);
    this._ring(x, y, 90, 0xff7b1c, 380, 5);
    this._ring(x, y, 60, 0xffb347, 280, 3);
    this._tint(this.fireEmitter, 0xff4500);
    this.fireEmitter.emitParticleAt(x, y, 14);
  }

  // Golden shimmer burst (Gilgamesh blades/gate)
  goldenBurst(x, y, count = 8) {
    this._flash(x, y, 10, 0xffd700, 0.8, 160);
    this._tint(this.goldEmitter, 0xffd700);
    this.goldEmitter.emitParticleAt(x, y, count);
  }

  // Golden projectile glint trail (brighter than normal)
  goldenTrail(x, y) {
    if (this.budgetTrail <= 0) return;
    this.budgetTrail -= 1;
    this._tint(this.goldEmitter, 0xffd700);
    this.goldEmitter.emitParticleAt(x, y, 1);
  }

  // Gate of Babylon golden portal flash on cast — enhanced for the secondary
  // spear-fan: a heavy golden supernova with two rings and a dense gold burst.
  gateFlash(x, y) {
    this._flash(x, y, 30, 0xffd700, 1.0, 130);
    this._flash(x, y, 20, 0xffffff, 0.95, 85);
    this._flash(x, y, 14, 0xffe87a, 0.7, 200);
    this._ring(x, y, 80, 0xffd700, 380, 5);
    this._ring(x, y, 48, 0xfff0a0, 260, 2);
    this._tint(this.goldEmitter, 0xffd700);
    this.goldEmitter.emitParticleAt(x, y, 18);
    this._tint(this.spark, 0xfff5b0);
    this.spark.emitParticleAt(x, y, 8);
  }

  // Spawning flash for an individual orbiter blade — a tiny golden portal ripple
  // that appears at the blade's starting position when orbiters are first created.
  orbiterSpawn(x, y) {
    this._flash(x, y, 10, 0xffd700, 0.9, 140);
    this._ring(x, y, 28, 0xffd700, 280, 2);
    this._tint(this.goldEmitter, 0xffe87a);
    this.goldEmitter.emitParticleAt(x, y, 5);
  }

  // Meteor streak: fiery multi-layer line + animated fireball falling from above.
  // The fireball moves from startY to ty so it reads as a genuine falling rock.
  meteorStreak(tx, ty, delay, color = 0xffd34d) {
    const scene = this.scene;
    const startX = tx + Phaser.Math.Between(-50, 50);
    const startY = ty - Phaser.Math.Between(160, 240);
    const travelMs = 300; // how long the streak is visible before impact
    scene.time.delayedCall(Math.max(0, delay - travelMs), () => {
      // Outer fiery glow layer
      const streak = scene.add.graphics().setDepth(10).setBlendMode('ADD');
      streak.lineStyle(7, color, 0.75);
      streak.beginPath();
      streak.moveTo(startX, startY);
      streak.lineTo(tx, ty);
      streak.strokePath();
      // Bright white core on top
      const core = scene.add.graphics().setDepth(11).setBlendMode('ADD');
      core.lineStyle(2.5, 0xffffff, 0.9);
      core.beginPath();
      core.moveTo(startX, startY);
      core.lineTo(tx, ty);
      core.strokePath();
      scene.tweens.add({ targets: [streak, core], alpha: 0, duration: travelMs, onComplete: () => { streak.destroy(); core.destroy(); } });
      // Fireball: a bright circle that moves from top to impact point
      const ball = scene.add.circle(startX, startY, 9, 0xffffff, 1.0).setDepth(12).setBlendMode('ADD');
      const glow = scene.add.circle(startX, startY, 16, color, 0.7).setDepth(11).setBlendMode('ADD');
      scene.tweens.add({
        targets: [ball, glow], x: tx, y: ty, duration: travelMs,
        ease: 'Quad.easeIn',
        onComplete: () => { ball.destroy(); glow.destroy(); },
      });
      // Fire embers trailing the falling rock
      let emberTick = 0;
      const emberTimer = scene.time.addEvent({
        delay: 28,
        repeat: Math.floor(travelMs / 28),
        callback: () => {
          const t = emberTick / Math.floor(travelMs / 28);
          const ex = startX + (tx - startX) * t;
          const ey = startY + (ty - startY) * t;
          this._tint(this.embers, color);
          this.embers.emitParticleAt(ex, ey, 2);
          emberTick++;
        },
      });
      // clean up embers timer in case of early destroy
      scene.time.delayedCall(travelMs + 50, () => emberTimer.remove(false));
    });
  }

  // Dust/earth explosion for meteor impact — big three-layer detonation.
  craterImpact(x, y, radius = 100) {
    // Triple flash: instant white core → orange fireball → fading heat bloom
    this._flash(x, y, radius * 0.4, 0xffffff, 1.0, 90);
    this._flash(x, y, radius * 0.6, 0xff8c00, 0.85, 200);
    this._flash(x, y, radius * 0.8, 0xff4400, 0.5, 340);
    // Dual expanding rings — close fast white, wide slow orange
    this._ring(x, y, radius * 1.5, 0xff8c00, 420, 6);
    this._ring(x, y, radius * 0.9, 0xffffff, 260, 2);
    // Fiery embers + dust clods erupting upward
    this._tint(this.embers, 0xff6a00);
    this.embers.emitParticleAt(x, y, 18);
    this._tint(this.fireEmitter, 0xff4400);
    this.fireEmitter.emitParticleAt(x, y, 10);
    this._tint(this.dustEmitter, 0x908070);
    this.dustEmitter.emitParticleAt(x, y, 10);
    this._tint(this.poof, 0xb0a090);
    this.poof.emitParticleAt(x, y, 6);
  }

  // Cannon shell arc smoke tail — drops a puff at the shell position each call
  shellSmoke(x, y) {
    if (this.budgetTrail <= 0) return;
    this.budgetTrail -= 1;
    this._tint(this.dustEmitter, 0xa0a098);
    this.dustEmitter.emitParticleAt(x, y, 1);
  }

  // Cataphract hoofbeat dust — scattered dirt puffs along a path
  hoofDust(x, y) {
    this._tint(this.dustEmitter, 0xb8a878);
    this.dustEmitter.emitParticleAt(x, y, 4);
    this._tint(this.poof, 0xb8a068);
    this.poof.emitParticleAt(x, y, 2);
  }

  // A bold horizontal motion-streak (additive blurred line) — cavalry charge blur
  chargeStreak(x, y, angle, length = 80, color = 0xffffff) {
    const ex = x - Math.cos(angle) * length;
    const ey = y - Math.sin(angle) * length;
    const streak = this.scene.add.graphics().setDepth(9).setBlendMode('ADD');
    streak.lineStyle(6, color, 0.55);
    streak.beginPath();
    streak.moveTo(x, y);
    streak.lineTo(ex, ey);
    streak.strokePath();
    this.scene.tweens.add({ targets: streak, alpha: 0, duration: 120, onComplete: () => streak.destroy() });
  }

  // Sharp thrust lunge arc for Lü Bu's Sky Piercer Thrust — bold piercing LUNGE:
  // a thick shaft line, a blazing tip flash, and energy flickers along the blade.
  thrustArc(x, y, angle, length = 90) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const tx = x + cos * length;
    const ty = y + sin * length;

    // Thick golden lance shaft — starts dim, SLAMS to full alpha, then fades
    const shaft = this.scene.add.graphics().setDepth(9).setBlendMode('ADD');
    shaft.lineStyle(7, 0xffe08a, 0.0);
    shaft.beginPath();
    shaft.moveTo(x, y);
    shaft.lineTo(tx, ty);
    shaft.strokePath();
    // thin bright core on top (the razor edge)
    const core = this.scene.add.graphics().setDepth(10).setBlendMode('ADD');
    core.lineStyle(2, 0xffffff, 0.0);
    core.beginPath();
    core.moveTo(x, y);
    core.lineTo(tx, ty);
    core.strokePath();

    // Flash the shaft in then out — the "lunge" snap
    this.scene.tweens.add({
      targets: shaft,
      alpha: { from: 0, to: 1 },
      duration: 35,
      ease: 'Quad.easeIn',
      onComplete: () => {
        this.scene.tweens.add({ targets: shaft, alpha: 0, scaleX: 1.25, duration: 200, ease: 'Quad.easeOut', onComplete: () => shaft.destroy() });
      },
    });
    this.scene.tweens.add({
      targets: core,
      alpha: { from: 0, to: 1 },
      duration: 30,
      ease: 'Linear',
      onComplete: () => {
        this.scene.tweens.add({ targets: core, alpha: 0, duration: 160, ease: 'Quad.easeOut', onComplete: () => core.destroy() });
      },
    });

    // Blazing spear tip — large white core + golden corona
    this._flash(tx, ty, 13, 0xffffff, 1.0, 80);
    this._flash(tx, ty, 9, 0xffd050, 0.85, 160);
    // Bright mid-shaft energy flicker (halfway down the lance)
    const midX = x + cos * length * 0.55;
    const midY = y + sin * length * 0.55;
    this._flash(midX, midY, 5, 0xffe08a, 0.6, 110);
    // Sparks at tip
    this._tint(this.spark, 0xffe08a);
    this.spark.emitParticleAt(tx, ty, 5);
    // Faint perpendicular "slash wing" at the lance tip — the war-tip crescent
    const perpX = -sin * 18;
    const perpY = cos * 18;
    const wing = this.scene.add.graphics().setDepth(9).setBlendMode('ADD');
    wing.lineStyle(3, 0xffd050, 0.85);
    wing.beginPath();
    wing.moveTo(tx - perpX, ty - perpY);
    wing.lineTo(tx + perpX, ty + perpY);
    wing.strokePath();
    this.scene.tweens.add({ targets: wing, alpha: 0, scaleX: 1.4, duration: 180, ease: 'Quad.easeOut', onComplete: () => wing.destroy() });
  }

  // A WEAPON STAB: drives an actual weapon sprite (halberd / sarissa) lunging forward
  // from the wielder along `angle`, then snapping back — so a thrust reads as the hero
  // STABBING with their weapon, not a flying projectile. Layers thrustArc's energy on
  // top for punch. Falls back to thrustArc alone if the weapon sprite isn't loaded.
  weaponLunge(key, x, y, angle, reach = 110, color = null) {
    if (!this.scene.textures.exists(key)) { this.thrustArc(x, y, angle, reach); return; }
    const img = this.scene.add.image(x, y, key)
      .setOrigin(0.08, 0.5) // pivot near the butt so the blade extends forward
      .setRotation(angle)
      .setDepth(11);
    const sx = reach / img.width;            // length ≈ the thrust reach
    img.setScale(sx, Math.min(sx, 1.3));     // keep the haft thin even when long
    if (color) img.setTint(color);
    const lunge = reach * 0.5;
    const tx = x + Math.cos(angle) * lunge;
    const ty = y + Math.sin(angle) * lunge;
    // snap forward (the stab), then retract + fade
    this.scene.tweens.add({
      targets: img, x: tx, y: ty, duration: 70, ease: 'Quad.easeOut',
      onComplete: () => this.scene.tweens.add({
        targets: img, x, y, alpha: 0, duration: 130, ease: 'Quad.easeIn',
        onComplete: () => img.destroy(),
      }),
    });
    // sharp tip flash + sparks at the point of the lunge
    const tipX = x + Math.cos(angle) * reach;
    const tipY = y + Math.sin(angle) * reach;
    this._flash(tipX, tipY, 11, 0xffffff, 0.85, 120);
    this._tint(this.spark, color || 0xffe08a);
    this.spark.emitParticleAt(tipX, tipY, 4);
  }

  // Flame tongue licks — a set of short, outward-angling curved lines emanating from
  // the origin for fireburst's radial nova. Creates the "ring of fire petals" read.
  flameTongues(x, y, count = 12, reach = 68) {
    const scene = this.scene;
    const step = (Math.PI * 2) / count;
    for (let i = 0; i < count; i++) {
      const ang = i * step + Phaser.Math.FloatBetween(-0.08, 0.08);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      // Each tongue: a tapering line from near-origin to tip, with a random slight bend
      const len = reach * Phaser.Math.FloatBetween(0.65, 1.0);
      const midLen = len * 0.55;
      const bend = Phaser.Math.FloatBetween(-12, 12);
      const perpX = -sin * bend;
      const perpY = cos * bend;
      const g = scene.add.graphics().setDepth(10).setBlendMode('ADD');
      // Outer (thick orange base) + inner (thin bright core)
      g.lineStyle(4, 0xff6200, 0.9);
      g.beginPath();
      g.moveTo(x + cos * 10, y + sin * 10);
      g.lineTo(x + cos * midLen + perpX, y + sin * midLen + perpY);
      g.lineTo(x + cos * len, y + sin * len);
      g.strokePath();
      g.lineStyle(2, 0xffcc00, 0.75);
      g.beginPath();
      g.moveTo(x + cos * 10, y + sin * 10);
      g.lineTo(x + cos * len * 0.8, y + sin * len * 0.8);
      g.strokePath();
      // Flicker tip dot
      const tip = scene.add.circle(x + cos * len, y + sin * len, 3, 0xffffff, 0.9).setDepth(11).setBlendMode('ADD');
      scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.1, scaleY: 1.1, duration: 320 + i * 8, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
      scene.tweens.add({ targets: tip, alpha: 0, scale: 0, duration: 240, ease: 'Quad.easeOut', onComplete: () => tip.destroy() });
    }
  }

  // Golden spear launch streak — a very brief bright directional line per spear
  // showing the barrel-to-target flight path from the Gate of Babylon.
  goldenSpearStreak(x, y, angle, speed) {
    const scene = this.scene;
    const length = Math.min(260, 180 + speed * 0.08);
    const ex = x + Math.cos(angle) * length;
    const ey = y + Math.sin(angle) * length;
    const g = scene.add.graphics().setDepth(10).setBlendMode('ADD');
    // Outer golden glow
    g.lineStyle(4, 0xffd700, 0.85);
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
    // Bright white core
    g.lineStyle(1.5, 0xffffff, 0.9);
    g.beginPath(); g.moveTo(x, y); g.lineTo(ex, ey); g.strokePath();
    // Tip bright dot
    const dot = scene.add.circle(ex, ey, 4, 0xffd700, 1.0).setDepth(11).setBlendMode('ADD');
    scene.tweens.add({ targets: g, alpha: 0, duration: 110, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
    scene.tweens.add({ targets: dot, alpha: 0, scale: 0, duration: 120, ease: 'Quad.easeOut', onComplete: () => dot.destroy() });
  }

  // Gate of Babylon portal — an ornate rectangular gate silhouette that flashes
  // open and collapses. Used when the secondary gate_spear is cast.
  gatePortal(x, y) {
    const scene = this.scene;
    const W = 52; const H = 70;
    // Position the graphics AT (x,y) and draw in LOCAL (centred) coords. Drawing at
    // world coords on a graphics whose origin is (0,0) made the scale tween pivot on the
    // world origin — so the gate slid in from the top-left as it grew (the "rectangle
    // fired across the screen" bug). Local coords keep it scaling in place.
    const g = scene.add.graphics({ x, y }).setDepth(11).setBlendMode('ADD');
    g.lineStyle(3, 0xffd700, 1.0);
    // Outer gate frame
    g.strokeRect(-W / 2, -H / 2, W, H);
    // Inner decorative border
    g.lineStyle(1.5, 0xffe87a, 0.7);
    g.strokeRect(-W / 2 + 5, -H / 2 + 5, W - 10, H - 10);
    // Arch top: two diagonal lines like a pointed arch
    g.lineStyle(2, 0xffd700, 0.9);
    g.beginPath();
    g.moveTo(-W / 2 + 5, -H / 2 + 5);
    g.lineTo(0, -H / 2 - 8);
    g.lineTo(W / 2 - 5, -H / 2 + 5);
    g.strokePath();
    // Animate: scale up from nothing, flash, then collapse
    g.setScale(0.1);
    scene.tweens.add({
      targets: g,
      scale: 1.0,
      duration: 80,
      ease: 'Back.easeOut',
      onComplete: () => {
        scene.tweens.add({ targets: g, alpha: 0, scale: 1.6, duration: 220, ease: 'Quad.easeIn', onComplete: () => g.destroy() });
      },
    });
    // bright interior core flash
    this._flash(x, y, 22, 0xffffff, 0.95, 60);
    this._flash(x, y, 16, 0xffd700, 0.8, 120);
  }

  // Arcing lob arc-indicator — draws the parabolic path of the greek fire pot
  // as a brief bright line so the lob reads as "thrown", not teleported.
  lobArcTrail(x, y, tx, ty, color = 0xff7b1c) {
    const scene = this.scene;
    const steps = 10;
    const g = scene.add.graphics().setDepth(7).setBlendMode('ADD');
    const peakY = Math.min(y, ty) - 55; // arc peak above mid-point
    g.lineStyle(2, color, 0.65);
    g.beginPath();
    let first = true;
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      // quadratic bezier from (x,y) through peak to (tx,ty)
      const px = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * ((x + tx) / 2) + t * t * tx;
      const py = (1 - t) * (1 - t) * y + 2 * (1 - t) * t * peakY + t * t * ty;
      if (first) { g.moveTo(px, py); first = false; } else g.lineTo(px, py);
    }
    g.strokePath();
    scene.tweens.add({ targets: g, alpha: 0, duration: 280, ease: 'Quad.easeOut', onComplete: () => g.destroy() });
  }

  // Cannon muzzle blast — a hefty flash + side jets for Nobunaga's barrage cast
  cannonMuzzle(x, y, angle) {
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    const ox = cos * 18;
    const oy = sin * 18;
    // Large white core blast
    this._flash(x + ox, y + oy, 18, 0xffffff, 1.0, 55);
    this._flash(x + ox, y + oy, 14, 0xffc060, 0.9, 110);
    this._flash(x + ox, y + oy, 10, 0xff8000, 0.75, 200);
    // Crown jets perpendicular
    const perpX = -sin * 7;
    const perpY = cos * 7;
    this._flash(x + ox + perpX, y + oy + perpY, 7, 0xffcc80, 0.8, 90);
    this._flash(x + ox - perpX, y + oy - perpY, 7, 0xffcc80, 0.8, 90);
    // Heavy smoke cloud
    this._tint(this.dustEmitter, 0x909088);
    this.dustEmitter.emitParticleAt(x + ox, y + oy, 10);
    // Hot sparks
    this._tint(this.spark, 0xfff0a0);
    this.spark.emitParticleAt(x + ox, y + oy, 6);
    // Expanding ring
    this._ring(x + ox, y + oy, 48, 0xffc060, 200, 3);
  }

  // Meteor telegraph ring — a pulsing circle on the ground showing where a meteor
  // will land, a couple frames before impact so the player can read the danger.
  meteorTelegraph(x, y, radius = 90, delay = 400) {
    const scene = this.scene;
    scene.time.delayedCall(Math.max(0, delay - 450), () => {
      // Outer danger ring — pulses from small to full, then snaps gone at impact
      const ring = scene.add.circle(x, y, 8).setDepth(7)
        .setStrokeStyle(3, 0xff4400, 0.85).setFillStyle(0, 0).setScale(0.1).setAlpha(0.9);
      scene.tweens.add({
        targets: ring,
        scale: radius / 8,
        duration: 400,
        ease: 'Quad.easeOut',
        onComplete: () => {
          scene.tweens.add({ targets: ring, alpha: 0, duration: 120, onComplete: () => ring.destroy() });
        },
      });
      // Red floor glow growing to mark the zone
      const glow = scene.add.circle(x, y, radius * 0.45, 0xff2200, 0.0).setDepth(6);
      scene.tweens.add({ targets: glow, alpha: 0.18, duration: 350, ease: 'Quad.easeOut',
        onComplete: () => scene.tweens.add({ targets: glow, alpha: 0, duration: 120, onComplete: () => glow.destroy() }) });
    });
  }

  // ── Caesar ────────────────────────────────────────────────────────────────
  // Rally horn — the cohort forms up (gold ring + standard glint + dust kick).
  legionRally(x, y) {
    this._ring(x, y, 74, 0xffe08a, 360, 4);
    this._flash(x, y, 15, 0xffd700, 0.7, 230);
    this._tint(this.dustEmitter, 0xcfc0a0);
    this.dustEmitter.emitParticleAt(x, y, 7);
  }

  // A single legionary materialising into the line — gold shield glint + dust.
  legionDeploy(x, y) {
    this._flash(x, y, 12, 0xffe08a, 0.8, 200);
    this._tint(this.dustEmitter, 0xc8c0b0);
    this.dustEmitter.emitParticleAt(x, y, 3);
  }

  // A heavy bronze pilum launch streak (one per javelin in the volley).
  pilaStreak(x, y, angle) {
    const len = 30;
    const tx = x + Math.cos(angle) * len;
    const ty = y + Math.sin(angle) * len;
    const g = this.scene.add.graphics().setDepth(10).setBlendMode('ADD');
    g.lineStyle(3, 0xc0a060, 0.9);
    g.beginPath(); g.moveTo(x, y); g.lineTo(tx, ty); g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 150, onComplete: () => g.destroy() });
    this._flash(x, y, 7, 0xffe0a0, 0.7, 110);
  }

  // Testudo — a ring of legion shields snaps up into a wall, then the shockwave.
  shieldWall(x, y, radius) {
    const n = 12;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const sx = x + Math.cos(a) * radius * 0.62;
      const sy = y + Math.sin(a) * radius * 0.62;
      const shield = this.scene.add.rectangle(x, y, 12, 16, 0xd4af37, 0.92)
        .setDepth(11).setStrokeStyle(1.5, 0x6b4e07).setRotation(a);
      this.scene.tweens.add({ targets: shield, x: sx, y: sy, alpha: 0, scale: 1.2, duration: 320, ease: 'Quad.easeOut', onComplete: () => shield.destroy() });
    }
    this._ring(x, y, radius, 0xffe08a, 320, 5);
  }

  // ── Genghis ──────────────────────────────────────────────────────────────
  // Bow loose — a recurve-bow string snap (reads as archery, not a gun muzzle).
  bowLoose(x, y, angle) {
    const perp = angle + Math.PI / 2;
    const bx = x + Math.cos(angle) * 6;
    const by = y + Math.sin(angle) * 6;
    const g = this.scene.add.graphics().setDepth(10).setBlendMode('ADD');
    g.lineStyle(2, 0xffe0a0, 0.9);
    g.beginPath();
    g.moveTo(bx + Math.cos(perp) * 9, by + Math.sin(perp) * 9);
    g.lineTo(bx + Math.cos(angle) * 6, by + Math.sin(angle) * 6);
    g.lineTo(bx - Math.cos(perp) * 9, by - Math.sin(perp) * 9);
    g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, scaleX: 1.3, duration: 130, onComplete: () => g.destroy() });
    this._flash(bx, by, 5, 0xfff0c0, 0.6, 90);
  }

  // A ricochet chain bolt arcing from one struck enemy to the next.
  chainArc(x1, y1, x2, y2, color = 0xffe08a) {
    const g = this.scene.add.graphics().setDepth(10).setBlendMode('ADD');
    g.lineStyle(2, color, 0.85);
    const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 16;
    const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 16;
    g.beginPath(); g.moveTo(x1, y1); g.lineTo(mx, my); g.lineTo(x2, y2); g.strokePath();
    this.scene.tweens.add({ targets: g, alpha: 0, duration: 170, onComplete: () => g.destroy() });
  }

  // ── Ragnar ───────────────────────────────────────────────────────────────
  // Shield bash — the round shield slams forward with a shockwave cone (NOT the sweep).
  shieldBash(x, y, angle, radius) {
    const bx = x + Math.cos(angle) * radius * 0.45;
    const by = y + Math.sin(angle) * radius * 0.45;
    const shield = this.scene.add.circle(x, y, 11, 0xb0b0c0, 0.95).setDepth(11).setStrokeStyle(2.5, 0x6a6f7a);
    const boss = this.scene.add.circle(x, y, 4, 0xe8e8f0, 1).setDepth(12);
    this.scene.tweens.add({ targets: [shield, boss], x: bx, y: by, duration: 90, yoyo: true, hold: 40, ease: 'Quad.easeOut', onComplete: () => { shield.destroy(); boss.destroy(); } });
    this._ring(bx, by, radius, 0xcfd6e0, 240, 5);
    this._flash(bx, by, 12, 0xffffff, 0.7, 140);
    this._tint(this.dustEmitter, 0xc8c0b0);
    this.dustEmitter.emitParticleAt(bx, by, 4);
  }

  // Berserker rage burst on cast — a red shockwave + ember spray.
  rageBurst(x, y) {
    this._ring(x, y, 120, 0xd23a3a, 300, 6);
    this._flash(x, y, 22, 0xff5030, 0.7, 260);
    this._tint(this.embers, 0xff4030);
    this.embers.emitParticleAt(x, y, 14);
  }

  // Genghis sky-arrows: a thin ARROW shaft dropping to (tx,ty) — not a fiery meteor.
  arrowFall(tx, ty, delay, color = 0xb8860b) {
    const scene = this.scene;
    const startX = tx + Phaser.Math.Between(-26, 26);
    const startY = ty - Phaser.Math.Between(150, 210);
    const travelMs = 250;
    scene.time.delayedCall(Math.max(0, delay - travelMs), () => {
      const ang = Math.atan2(ty - startY, tx - startX);
      const key = scene.textures.exists('proj_arrow_storm') ? 'proj_arrow_storm' : 'spark';
      const arrow = scene.add.image(startX, startY, key).setDepth(11).setRotation(ang).setTint(color);
      const trail = scene.add.graphics().setDepth(10).setBlendMode('ADD');
      trail.lineStyle(1.5, color, 0.8);
      trail.beginPath(); trail.moveTo(startX, startY); trail.lineTo(startX - Math.cos(ang) * 22, startY - Math.sin(ang) * 22); trail.strokePath();
      scene.tweens.add({ targets: arrow, x: tx, y: ty, duration: travelMs, ease: 'Quad.easeIn', onComplete: () => arrow.destroy() });
      scene.tweens.add({ targets: trail, x: tx - startX, y: ty - startY, alpha: 0, duration: travelMs, onComplete: () => trail.destroy() });
    });
  }

  // Lü Bu war cry — a heroic crimson ring burst + dust roar (so it reads as bespoke,
  // like Caesar's shield-wall and Ragnar's rage burst, not a plain nova).
  warCryFx(x, y) {
    this._ring(x, y, 150, 0xff3b3b, 320, 6);
    this._flash(x, y, 24, 0xff5252, 0.7, 260);
    this._tint(this.dustEmitter, 0xc8b0a0);
    this.dustEmitter.emitParticleAt(x, y, 8);
    this._tint(this.spark, 0xffd0d0);
    this.spark.emitParticleAt(x, y, 8);
  }
}
