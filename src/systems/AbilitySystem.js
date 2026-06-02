import Phaser from 'phaser';
import { getAbility } from '../data/abilities.js';
import { Audio } from './AudioManager.js';

// Duration of the "musou" empowered window opened when the ultimate is cast —
// during it the player's regular attack surges (see WeaponSystem.computeStats).
export const EMPOWER_MS = 4500;
// Brief invulnerability granted on cast — the ultimate is also a panic/escape
// button (and, in duels, lets you unleash it through the boss's pressure).
export const ULT_INVULN_MS = 1100;

// Owns the character's ULTIMATE and its upgrade points. The player fires it
// manually (Spacebar) on a long (~10s) cooldown; casting grants brief invuln and
// opens the empowered window that fuses with the regular attack. Stats derive
// from base + invested points + player modifiers along its own axes
// (power/haste/area/amount).
export default class AbilitySystem {
  constructor(scene, player, abilityId) {
    this.scene = scene;
    this.player = player;
    this.abilityId = abilityId;
    this.points = { power: 0, haste: 0, area: 0, amount: 0 };
    this.cdRemaining = 0; // starts ready
    this.lastCooldown = getAbility(abilityId).base.cooldown;
  }

  upgrade(axis) {
    if (this.points[axis] === undefined) return;
    this.points[axis] += 1;
  }

  totalLevel() {
    const p = this.points;
    return p.power + p.haste + p.area + p.amount;
  }

  ready() {
    return this.cdRemaining <= 0;
  }

  readyFraction() {
    if (this.cdRemaining <= 0) return 1;
    return Phaser.Math.Clamp(1 - this.cdRemaining / this.lastCooldown, 0, 1);
  }

  // Player-triggered (Spacebar). Returns true if it fired.
  tryCast(now) {
    if (this.cdRemaining > 0) return false;
    const s = this.computeStats();
    this.lastCooldown = s.cooldown;
    this.cdRemaining = s.cooldown;
    this.cast(s);
    // per-ability self-buffs: Caesar's testudo fortifies (defense), Ragnar's berserker
    // enrages (damage+speed) — gives same-`kind` ultimates distinct mechanical identities.
    if (s.def.selfBuffs) for (const bf of s.def.selfBuffs) this.player.addBuff(bf.kind, bf.mult, bf.dur, now);
    // brief invulnerability on cast (the "ultimate" escape/burst window)
    this.player.addBuff('invuln', 1, ULT_INVULN_MS, now);
    // open the empowered window that surges the regular attack
    this.player.empowerUntil = now + EMPOWER_MS;
    this.player.empowerMax = now + EMPOWER_MS + 3000; // momentum can extend up to +3s
    this.player.empowerColor = s.def.color;
    this.player.momentumStacks = 0;
    return true;
  }

  computeStats() {
    const def = getAbility(this.abilityId);
    const b = def.base;
    const pt = this.points;
    const areaMult = (1 + pt.area * 0.15) * this.player.reachMult;
    return {
      def,
      damage: Math.round(b.damage * (1 + pt.power * 0.2) * this.player.damageMult * this.player.buffDamageMult),
      cooldown: b.cooldown * this.player.cooldownMult * Math.pow(1 - 0.08, pt.haste),
      radius: (b.radius || 0) * areaMult,
      width: (b.width || 0) * areaMult,
      knockback: (b.knockback || 0) * areaMult,
      count: (b.count || 1) + pt.amount + (this.player.bonusAbilityCount || 0),
      speed: b.speed,
      length: b.length,
      delay: b.delay,
    };
  }

  // Ticks cooldown; fires the momentum "finishing surge" when the musou window ends.
  update(_time, delta) {
    if (this.cdRemaining > 0) this.cdRemaining -= delta;
    const emp = this.player.empowered;
    if (this._wasEmpowered && !emp) this.onMusouEnd();
    this._wasEmpowered = emp;
  }

  onMusouEnd() {
    const stacks = this.player.momentumStacks;
    this.player.momentumStacks = 0;
    if (stacks <= 0 || !this.player.active) return;
    const s = this.computeStats();
    const dmg = Math.round(s.damage * 0.15 * stacks);
    const radius = Math.max(s.radius || 0, 120) * (1 + 0.04 * stacks);
    this.scene.abilityNova(this.player.x, this.player.y, radius, dmg, s.def.color, 0);
  }

  cast(s) {
    switch (s.def.kind) {
      case 'nova':
        return this.castNova(s);
      case 'artillery':
        return this.castArtillery(s);
      case 'charge':
        return this.castCharge(s);
      case 'meteor':
        return this.castMeteor(s);
      case 'encircle':
        return this.castEncircle(s);
      case 'solar_beam':
        return this.castSolarBeam(s);
      default:
        return undefined;
    }
  }

  // --- targeting helpers ---
  randomEnemy() {
    const list = this.scene.enemies.getChildren().filter((e) => e.active);
    return list.length ? list[Phaser.Math.Between(0, list.length - 1)] : null;
  }

  aimAngle() {
    if (this.scene.cursorAim != null) return this.scene.cursorAim; // mouse aim wins
    let best = null;
    let bestD = Infinity;
    const px = this.player.x;
    const py = this.player.y;
    for (const e of this.scene.enemies.getChildren()) {
      if (!e.active) continue;
      const d = (e.x - px) ** 2 + (e.y - py) ** 2;
      if (d < bestD) { bestD = d; best = e; }
    }
    return best ? Math.atan2(best.y - py, best.x - px) : (this.player.flipX ? Math.PI : 0);
  }

  // --- behaviors ---
  castNova(s) {
    Audio.sfx('melee');
    // Per-hero signature flourish so the three nova ultimates read differently
    if (s.def.id === 'testudo') this.scene.fx.shieldWall(this.player.x, this.player.y, s.radius); // Caesar: shield wall snaps up
    else if (s.def.id === 'berserker') this.scene.fx.rageBurst(this.player.x, this.player.y); // Ragnar: red rage burst
    else if (s.def.id === 'warcry') this.scene.fx.warCryFx(this.player.x, this.player.y); // Lü Bu: crimson war-cry roar
    // War cry wind-up: a brief rotating sweep glow before the shockwave erupts
    const sweepFx = this.scene.add.image(this.player.x, this.player.y, 'sweep')
      .setDepth(9).setScale((s.radius / 60) * 0.3).setAlpha(0.7).setTint(s.def.color);
    this.scene.tweens.add({
      targets: sweepFx,
      rotation: Math.PI * 2,
      scale: s.radius / 60 * 0.6,
      alpha: 0,
      duration: 280,
      ease: 'Quad.easeOut',
      onComplete: () => sweepFx.destroy(),
    });
    for (let i = 0; i < s.count; i++) {
      this.scene.time.delayedCall(i * 180, () => {
        if (!this.player.active) return;
        this.scene.abilityNova(this.player.x, this.player.y, s.radius, s.damage, s.def.color, s.knockback);
      });
    }
  }

  // A DIRECTED creeping barrage: shells march outward in the aim direction, each
  // landing further than the last (a gunline carpet-bomb) — distinct from Gilgamesh's
  // omnidirectional meteor rain, and true to Nobunaga's forward firepower identity.
  castArtillery(s) {
    Audio.sfx('shoot');
    const px = this.player.x;
    const py = this.player.y;
    const ang = this.aimAngle();
    const perp = ang + Math.PI / 2;
    // Cannon blast cast: big muzzle flash + heavy smoke at the player's position
    this.scene.fx.cannonMuzzle(px, py, ang);
    for (let i = 0; i < s.count; i++) {
      const dist = 130 + i * 115; // each blast lands further forward → a creeping line
      const off = Phaser.Math.Between(-45, 45); // slight lateral scatter
      const tx = px + Math.cos(ang) * dist + Math.cos(perp) * off;
      const ty = py + Math.sin(ang) * dist + Math.sin(perp) * off;
      const shell = this.scene.add.image(px, py, 'cannonball').setScale(1.4).setDepth(8);
      const dur = (Phaser.Math.Distance.Between(px, py, tx, ty) / s.speed) * 1000;
      const delay = i * 90;
      // shell smoke trail: drop puffs along the arc during flight
      const totalTicks = Math.floor(Math.max(150, dur) / 35);
      this.scene.time.delayedCall(delay, () => {
        // Per-shell muzzle flash on delayed shots (second+) — a smaller repeat pop
        if (i > 0) this.scene.fx.cannonMuzzle(px, py, ang);
        let tick = 0;
        const trailTimer = this.scene.time.addEvent({
          delay: 35,
          repeat: totalTicks,
          callback: () => {
            if (shell.active) this.scene.fx.shellSmoke(shell.x, shell.y);
            tick++;
            if (tick >= totalTicks) trailTimer.remove(false);
          },
        });
      });
      this.scene.tweens.add({
        targets: shell, x: tx, y: ty, duration: Math.max(150, dur), ease: 'Quad.easeIn',
        delay,
        onComplete: () => {
          shell.destroy();
          // Enhanced explosion with smoke/debris
          this.scene.abilityBlast(tx, ty, s.radius, s.damage, s.def.color);
          // Extra debris ring + dust cloud on landing
          this.scene.fx._ring(tx, ty, s.radius * 1.1, 0xffc060, 320, 4);
          this.scene.fx.hoofDust(tx, ty); // debris cloud
          this.scene.fx._tint(this.scene.fx.dustEmitter, 0x807868);
          this.scene.fx.dustEmitter.emitParticleAt(tx, ty, 6);
        },
      });
    }
  }

  // Pick the charge heading that deals the MOST damage: score each candidate direction
  // (toward each enemy) by the total EFFECTIVE damage its corridor would deal — each
  // enemy contributes min(chargeDamage, its HP), so overkill is wasted. This favours
  // plowing a line of weak foes (5×20) OR lancing a high-HP boss (1×102), whichever is
  // worth more — instead of just charging the nearest target.
  bestChargeAngle(s) {
    const enemies = this.scene.enemies.getChildren().filter((e) => e.active);
    if (!enemies.length) return this.aimAngle();
    const px = this.player.x;
    const py = this.player.y;
    const length = s.length || 820;
    const halfW = (s.width || 88) / 2 + 22; // a touch generous so near-line foes count
    const dmg = s.damage;
    let bestAng = this.aimAngle();
    let bestScore = -1;
    for (const target of enemies) {
      const ang = Math.atan2(target.y - py, target.x - px);
      const cos = Math.cos(ang);
      const sin = Math.sin(ang);
      let score = 0;
      for (const e of enemies) {
        const dx = e.x - px;
        const dy = e.y - py;
        const along = dx * cos + dy * sin; // distance down the charge line
        if (along < 0 || along > length) continue;
        if (Math.abs(-dx * sin + dy * cos) > halfW) continue; // off to the side
        score += Math.min(dmg, e.hp); // damage actually landed (overkill wasted)
      }
      if (score > bestScore) { bestScore = score; bestAng = ang; }
    }
    return bestAng;
  }

  castCharge(s) {
    Audio.sfx('melee');
    const base = this.bestChargeAngle(s);
    for (let i = 0; i < s.count; i++) {
      const spread = s.count === 1 ? 0 : (i / (s.count - 1) - 0.5) * 0.5;
      const angle = base + spread;
      this.scene.spawnFriendlyLance(this.player.x, this.player.y, angle, s);
      // Alexander's wedge uses a spear-streak visual; Belisarius uses the cataphract sprite
      if (s.def.chargeStyle === 'spears') this._spawnSpearChargeVisual(this.player.x, this.player.y, angle, s);
      else this._spawnCataphractVisual(this.player.x, this.player.y, angle, s);
    }
  }

  // Alexander's Companion wedge: a fast bronze spear-streak down the lane + dust, with
  // a tip flash at the end — reads as a phalanx charge, NOT the Byzantine horseman.
  _spawnSpearChargeVisual(startX, startY, angle, s) {
    const scene = this.scene;
    const travel = s.length || 440;
    scene.fx.chargeStreak(startX, startY, angle, travel, s.def.color);
    scene.fx.chargeStreak(startX, startY, angle, travel * 0.8, 0xffffff);
    for (let k = 1; k <= 3; k++) {
      const t = k / 4;
      scene.fx.hoofDust(startX + Math.cos(angle) * travel * t, startY + Math.sin(angle) * travel * t);
    }
    const ex = startX + Math.cos(angle) * travel;
    const ey = startY + Math.sin(angle) * travel;
    scene.fx._flash(ex, ey, 16, s.def.color, 0.85, 220);
  }

  // Sends a real charging cataphract SPRITE galloping along the charge path, kicking up
  // dust with speed-line streaks and a heavy impact at the end. Purely visual — the
  // damage is done by the underlying lance projectile.
  _spawnCataphractVisual(startX, startY, angle, s) {
    const scene = this.scene;
    const color = s.def.color; // Belisarius purple / Alexander gold-bronze
    const TRAVEL = s.length || 820;
    const DURATION = (TRAVEL / s.speed) * 1000;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    // per-ability charging sprite (Alexander's Companion cavalry vs Belisarius's
    // cataphract); fall back to the cataphract sprite until the AI art is generated.
    const key = (s.def.chargeSprite && scene.textures.exists(s.def.chargeSprite)) ? s.def.chargeSprite : 'cataphract';

    // the sprite faces RIGHT; flip it when charging leftward (stays upright — a rotated
    // horse reads badly, so we move along the angle but keep the figure vertical)
    const horseman = scene.add.image(startX, startY, key)
      .setOrigin(0.5, 0.62)
      .setDepth(10)
      .setScale(0.95)
      .setFlipX(cos < 0);
    // a soft accent aura trailing the charge (additive copy behind the sprite)
    const aura = scene.add.image(startX, startY, key)
      .setOrigin(0.5, 0.62).setDepth(9).setScale(1.05).setFlipX(cos < 0)
      .setTint(color).setAlpha(0.35).setBlendMode('ADD');

    let chargeComplete = false;

    // gallop bounce — a subtle vertical squash that won't fight the position tween
    scene.tweens.add({ targets: [horseman, aura], scaleY: 0.85, yoyo: true, repeat: -1, duration: 95, ease: 'Sine.easeInOut' });

    const endX = startX + cos * TRAVEL;
    const endY = startY + sin * TRAVEL;
    scene.tweens.add({
      targets: [horseman, aura],
      x: endX, y: endY,
      duration: DURATION,
      ease: 'Quad.easeIn',
      onComplete: () => {
        chargeComplete = true;
        scene.fx._flash(endX, endY, 26, 0xffffff, 0.95, 160);
        scene.fx._flash(endX, endY, 18, color, 0.7, 280);
        scene.fx._ring(endX, endY, 96, color, 360, 5);
        scene.fx.hoofDust(endX, endY);
        horseman.destroy();
        aura.destroy();
      },
    });
    // stay solid through the charge, fade only on the last stretch into the impact
    scene.tweens.add({ targets: [horseman, aura], alpha: 0, duration: DURATION * 0.25, delay: DURATION * 0.7, ease: 'Quad.easeIn' });

    // speed-line streaks trailing the charge
    const streakCount = Math.floor(DURATION / 55);
    let streakTick = 0;
    const streakTimer = scene.time.addEvent({
      delay: 55,
      repeat: streakCount,
      callback: () => {
        if (chargeComplete) { streakTimer.remove(false); return; }
        scene.fx.chargeStreak(horseman.x - cos * 30, horseman.y - sin * 30 + 16, angle, 50 + streakTick * 1.5, color);
        streakTick++;
      },
    });

    // hoofbeat dust kicked up behind the horse
    const dustCount = Math.floor(DURATION / 75);
    const dustTimer = scene.time.addEvent({
      delay: 75,
      repeat: dustCount,
      callback: () => {
        if (chargeComplete) { dustTimer.remove(false); return; }
        scene.fx.hoofDust(horseman.x - cos * 26 + Phaser.Math.Between(-8, 8), horseman.y - sin * 26 + 20 + Phaser.Math.Between(-6, 6));
      },
    });

    // charge-start kick
    scene.fx._flash(startX, startY, 18, color, 0.7, 150);
    scene.fx.hoofDust(startX, startY + 18);
  }

  castMeteor(s) {
    Audio.sfx('shoot');
    const arrows = s.def.variant === 'arrows';
    if (arrows) {
      // Genghis: a quick volley-loose flash (no golden Gate of Babylon portal)
      this.scene.fx.muzzle(this.player.x, this.player.y, s.def.color);
    } else {
      // Gilgamesh: golden cast flash — the king pointing at the sky
      this.scene.fx.gateFlash(this.player.x, this.player.y);
      this.scene.fx.gatePortal(this.player.x, this.player.y);
    }
    const boss = this.scene.activeBoss;
    for (let i = 0; i < s.count; i++) {
      let x;
      let y;
      if (this.scene.dueling && boss && boss.active) {
        // 1v1: rain ACROSS the arena around the boss so they don't all stack on the one
        // target (that turned the ult into a ~5× single-target nuke). Only ~1-2 land on
        // it now — a burst in line with the other ultimates.
        const a = Math.random() * Math.PI * 2;
        const r = 50 + Math.random() * 210;
        x = boss.x + Math.cos(a) * r;
        y = boss.y + Math.sin(a) * r;
      } else {
        const target = this.randomEnemy();
        x = target ? target.x + Phaser.Math.Between(-40, 40) : this.player.x + Phaser.Math.Between(-200, 200);
        y = target ? target.y + Phaser.Math.Between(-40, 40) : this.player.y + Phaser.Math.Between(-200, 200);
      }
      const delay = s.delay + i * 80;
      // Falling from above — a thin ARROW shaft for Genghis, a fiery meteor for Gilgamesh
      if (arrows) this.scene.fx.arrowFall(x, y, delay, s.def.color);
      else this.scene.fx.meteorStreak(x, y, delay, s.def.color);
      this.scene.fx.meteorTelegraph(x, y, s.radius * 0.9, delay);
      // Telegraph + damage (existing abilityBlast handles the explosion fx)
      this.scene.abilityBlast(x, y, s.radius, s.damage, s.def.color, { telegraph: true, delay });
      this.scene.time.delayedCall(delay, () => {
        if (arrows) {
          // sharp arrow strike: a quick flash + dust, no fiery crater
          this.scene.fx._flash(x, y, 11, s.def.color, 0.85, 170);
          this.scene.fx.hoofDust(x, y);
        } else {
          this.scene.fx.craterImpact(x, y, s.radius);
          this.scene.fx._ring(x, y, s.radius * 1.5, 0xff8c00, 360, 5); // meaty fire ring
        }
      });
    }
  }

  // Alexander — WRATH OF RA: a beam of solar fire sweeps a wide arc in front of the
  // player, scorching every enemy it crosses. A unique beam-sweep (not a charge/nova).
  castSolarBeam(s) {
    const px = this.player.x;
    const py = this.player.y;
    const len = s.length || 440;
    const halfW = (s.width || 78) / 2;
    const arc = ((s.def.arc || 155) * Math.PI) / 180;
    const sweepMs = s.def.sweepMs || 780;
    const passes = Math.max(1, s.count || 1);
    const damage = Math.round(s.damage);
    const base = this.bestChargeAngle(s); // centre the sweep on the densest enemy heading
    Audio.sfx('melee');
    // sun-disk burst at the player
    this.scene.fx._flash(px, py, 32, 0xfff0c0, 0.95, 220);
    this.scene.fx._flash(px, py, 22, 0xffd24a, 0.8, 360);
    this.scene.fx._ring(px, py, len * 0.55, 0xffd24a, 460, 6);

    for (let p = 0; p < passes; p++) {
      const dir = p % 2 === 0 ? 1 : -1;          // alternate sweep direction on extra passes
      const startA = base - (arc / 2) * dir;
      const hit = new Set();
      const beam = this.scene.add.graphics().setDepth(11).setBlendMode('ADD');
      const tickMs = 28;
      const steps = Math.ceil(sweepMs / tickMs);
      let step = 0;
      this.scene.time.delayedCall(p * (sweepMs + 120), () => {
        const ev = this.scene.time.addEvent({
          delay: tickMs,
          repeat: steps,
          callback: () => {
            step++;
            const t = Math.min(1, step / steps);
            const ang = startA + arc * t * dir;
            // redraw the tapering solar beam at the current angle
            const c = Math.cos(ang);
            const si = Math.sin(ang);
            const perpX = -si;
            const perpY = c;
            beam.clear();
            beam.fillStyle(0xffd24a, 0.45);
            beam.fillPoints([
              { x: px + perpX * 7, y: py + perpY * 7 },
              { x: px + c * len + perpX * halfW, y: py + si * len + perpY * halfW },
              { x: px + c * len - perpX * halfW, y: py + si * len - perpY * halfW },
              { x: px - perpX * 7, y: py - perpY * 7 },
            ], true);
            beam.lineStyle(3, 0xffffff, 0.85);
            beam.beginPath(); beam.moveTo(px, py); beam.lineTo(px + c * len, py + si * len); beam.strokePath();
            // scorch every enemy the beam now covers (once each)
            for (const e of this.scene.enemies.getChildren()) {
              if (!e.active || hit.has(e)) continue;
              const dx = e.x - px;
              const dy = e.y - py;
              const dist = Math.hypot(dx, dy);
              if (dist > len) continue;
              const diff = Math.abs(Phaser.Math.Angle.Wrap(Math.atan2(dy, dx) - ang));
              if (diff <= Math.atan2(halfW, Math.max(24, dist)) + 0.06) {
                this.scene.damageEnemy(e, damage);
                hit.add(e);
                this.scene.fx._flash(e.x, e.y, 9, 0xffd24a, 0.7, 150);
              }
            }
            if (t >= 1) this.scene.tweens.add({ targets: beam, alpha: 0, duration: 160, onComplete: () => beam.destroy() });
          },
        });
        void ev;
      });
    }
  }

  // Genghis — ENCIRCLEMENT: arrows rain down in a RING around the player, leaving a
  // perimeter of caltrop fields, while a shockwave knocks the swarm OUTWARD onto the
  // spikes. Self-centred area-control — distinct from Gilgamesh's targeted meteor scatter.
  castEncircle(s) {
    Audio.sfx('shoot');
    const px = this.player.x;
    const py = this.player.y;
    const R = s.radius;
    const n = s.count;
    const fieldR = s.def.fieldRadius || 58;
    this.scene.fx.bowLoose(px, py, -Math.PI / 2);          // loose to the sky
    this.scene.fx._ring(px, py, R, s.def.color, 420, 6);   // the encircling sweep
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2;
      const fx = px + Math.cos(a) * R;
      const fy = py + Math.sin(a) * R;
      const delay = 220 + i * 22;
      this.scene.fx.arrowFall(fx, fy, delay, s.def.color);          // an arrow drops at each ring point
      // (no red meteor-danger telegraph — it clashes with the gold/brown caltrop palette;
      //  the falling arrow + the field's own tan landing flash are the tell)
      this.scene.time.delayedCall(delay, () => this.scene.spawnCaltropField(fx, fy, fieldR, Math.round(s.damage), s.def.duration || 3000, s.def.tick || 320));
    }
    // shockwave: damage + drive the inner swarm OUTWARD into the ring of caltrops
    this.scene.abilityNova(px, py, R * 0.85, Math.round(s.damage * 1.4), s.def.color, s.knockback);
  }
}
