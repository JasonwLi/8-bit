import Phaser from 'phaser';
import { getBoss } from '../data/bosses.js';
import { Audio } from './AudioManager.js';
import BossArena, { ARENA_ORIGIN } from './BossArena.js';
import { HERO_DIALOGUE, BOSS_DIALOGUE, pickRandom } from '../data/dialogue.js';

// Owns the 1v1 boss-duel feature: the accept/decline challenge prompt, the
// cinematic arena (camera zoom + ring + letterbox), the fighting-game combat,
// arena clamping, and the win finisher. Operates on GameScene, which keeps the
// `dueling`/`challengePending` flags it reads in its loop.
//
// COMBAT. The duel uses the character's REAL attacks (same primary / secondary /
// ultimate as the open world) — not a separate moveset — but governed by the
// EXHAUST system: each attack has startup -> active -> recovery phases and ROOTS
// the player. You can't attack faster than the state machine resolves; mashing
// only buffers one input and locks you in punishable recovery.
//   J = primary   (exhaust-gated only — fires at its own pace)
//   K = secondary (exhaust + the secondary's ~3s cooldown)
//   SPACE = ultimate (exhaust + ~10s cooldown; BREAKS the boss guard + grants invuln)
// Ranged attacks are AIMED with the movement keys (hold a direction while firing;
// no input aims at the boss). The boss has full parity: it blocks (soaking 80% of
// any attack until the ultimate breaks its guard), swings combos, and has its own
// RAGE musou (see Boss.bossDuelUpdate).
export default class DuelController {
  constructor(scene) {
    this.s = scene;
    this.radius = 360; // 1v1 arena radius (roomy enough to kite around the boss)
    this.arena = new BossArena(scene); // themed environment built on duel begin
    this.fieldReturn = null; // where to drop the player back after the duel
    this.clean = true; // stayed above 50% HP this duel
    this.center = { x: 0, y: 0 };
    this.fx = null;
    this.comboText = null;
    this.challengeUI = null;
    this.stunText = null;
    this.flawlessText = null; // gold "★ flawless" indicator while clean is true

    // player attack state machine
    this.atkState = 'ready'; // 'ready' | 'startup' | 'active' | 'recovery'
    this.atkKind = null; // 'primary' | 'secondary' | 'ultimate'
    this.atkTimer = 0;
    this.chain = 0; // consecutive hits, for the COMBO xN flair
    this.chainGrace = 0; // ms left before the combo counter lapses
    this.buffered = null; // one-slot input buffer pressed mid-swing
    this.pStunUntil = 0; // player interrupted/stunned (by the boss rage burst)
    this.countdown = 0;

    // parry cooldown: prevents rapid-fire parry chains (~1.5s between parries)
    this._parryCooldownUntil = 0;
  }

  // commitment frames (ms) per attack tier — the real attack-speed cap
  static get PHASES() {
    return {
      primary: { startup: 60, active: 40, recovery: 150 },
      secondary: { startup: 150, active: 50, recovery: 300 },
      ultimate: { startup: 220, active: 90, recovery: 480 },
    };
  }
  static get CHAIN_GRACE() { return 700; }

  // Per-frame: challenge countdown + in-duel combat state machine.
  update(delta) {
    const s = this.s;
    if (s.challengePending) {
      this.countdown -= delta;
      // countdown text is always the last element of the challengeUI array
      if (this.challengeUI && this.challengeUI.length > 0) {
        const cdText = this.challengeUI[this.challengeUI.length - 1];
        if (cdText) cdText.setText(`auto-accept in ${Math.max(0, Math.ceil(this.countdown / 1000))}...`);
      }
      if (this.countdown <= 0) this.accept();
    }
    if (!s.dueling) return;

    this.arena.update(delta); // tick bait-hazards (hurt player + boss)
    this.clampToArena();
    if (s.player.hp / s.player.maxHp < 0.5) this.clean = false;
    // keep flawless indicator in sync with clean status
    if (this.flawlessText) this.flawlessText.setVisible(this.clean);

    const now = s.time.now;
    const stunned = this.pStunUntil > now;
    if (stunned) {
      if (this.stunText) this.stunText.setVisible(true).setPosition(s.player.x, s.player.y - 38);
    } else if (this.stunText && this.stunText.visible) {
      this.stunText.setVisible(false);
      s.player.clearTint();
    }

    this.advanceAttack(delta, now, stunned);

    // root the player while committed to a swing or while stunned
    s.player.rooted = stunned || this.atkState !== 'ready';

    if (this.chain > 0) {
      this.chainGrace -= delta;
      if (this.chainGrace <= 0) this.chain = 0;
    }
    if (this.comboText) this.comboText.setVisible(this.chain > 1).setText(`COMBO x${this.chain}`);
  }

  // Drive the attack phases; the hit fires at the start of the active window.
  advanceAttack(delta, now, stunned) {
    if (stunned || this.atkState === 'ready') return;
    this.atkTimer -= delta;
    if (this.atkTimer > 0) return;
    const ph = DuelController.PHASES[this.atkKind];
    if (this.atkState === 'startup') {
      this.atkState = 'active';
      this.atkTimer = ph.active;
      this.applyHit(now);
    } else if (this.atkState === 'active') {
      this.atkState = 'recovery';
      this.atkTimer = ph.recovery;
    } else { // recovery finished
      const buffered = this.buffered;
      this.buffered = null;
      this.atkState = 'ready';
      this.atkKind = null;
      if (buffered) this.tryBegin(buffered); // flow into the next move if still allowed
    }
  }

  // --- input entry points (GameScene maps J / K / SPACE here during a duel) ---
  primary() { this.input('primary'); }
  secondary() { this.input('secondary'); }
  ultimate() { this.input('ultimate'); }

  input(kind) {
    if (this.pStunUntil > this.s.time.now) return; // interrupted: locked out
    if (this.atkState === 'ready') this.tryBegin(kind);
    else this.buffered = kind; // one-slot buffer
  }

  // Begin a swing if its cooldown allows (primary is exhaust-gated only).
  tryBegin(kind) {
    if (kind === 'secondary' && !this.s.secondary.ready()) return;
    if (kind === 'ultimate' && !this.s.ability.ready()) return;
    this.atkKind = kind;
    this.atkState = 'startup';
    this.atkTimer = DuelController.PHASES[kind].startup;
  }

  applyHit(now) {
    if (this.atkKind === 'primary') this.applyPrimaryHit();
    else if (this.atkKind === 'secondary') this.applySecondaryHit();
    else this.applyUltimateHit(now);
  }

  // Aim from the held movement keys; with no input, face the boss.
  aimAngle() {
    const s = this.s;
    const k = s.keys;
    let dx = 0;
    let dy = 0;
    if (k.A.isDown || k.LEFT.isDown) dx -= 1;
    if (k.D.isDown || k.RIGHT.isDown) dx += 1;
    if (k.W.isDown || k.UP.isDown) dy -= 1;
    if (k.S.isDown || k.DOWN.isDown) dy += 1;
    if (dx !== 0 || dy !== 0) return Math.atan2(dy, dx);
    if (s.activeBoss) return Math.atan2(s.activeBoss.y - s.player.y, s.activeBoss.x - s.player.x);
    return s.player.flipX ? Math.PI : 0;
  }

  applyPrimaryHit() {
    const s = this.s;
    const now = s.time.now;
    const aim = this.aimAngle();
    s.player.setFlipX(Math.cos(aim) < 0);
    s.weapons.castManual(aim, false); // exhaust is the only gate; ignore weapon cooldown
    this.bumpCombo();

    // PARRY: if the boss is in its telegraph (windup) state and our cooldown allows,
    // cancel that attack, stagger the boss, drop its block, and flash it white.
    // Boss.state === 'telegraph' is its windup window (the player's dodge/counter window).
    const b = s.activeBoss;
    if (b && b.active && b.state === 'telegraph' && now >= this._parryCooldownUntil) {
      this._parryCooldownUntil = now + 1500; // ~1.5s between parries
      // cancel the boss's telegraph and stagger it
      b.state = 'idle';
      b.telegraphTimer = 0;
      if (b.blocking) { b.blocking = false; }
      b.stunUntil = Math.max(b.stunUntil || 0, now + 400); // 400ms stagger
      b.setTintFill(0xffffff); // white flash
      s.time.delayedCall(80, () => { if (b.active) b.clearTint(); });
      s.fx.shockwave(b.x, b.y, 0xffd700, 140);
      Audio.sfx('parry');
      s.showBanner('✦ PARRY!', '#ffd700', 'critical');
    }
  }

  applySecondaryHit() {
    const s = this.s;
    const aim = this.aimAngle();
    s.player.setFlipX(Math.cos(aim) < 0);
    s.secondary.castManual(aim, true); // consumes the ~3s cooldown (checked at input)
    this.bumpCombo();
  }

  applyUltimateHit(now) {
    const s = this.s;
    const fired = s.ability.tryCast(now); // casts the ult (invuln + empower), consumes ~10s CD
    if (!fired) return;
    const b = s.activeBoss;
    if (b && b.active) {
      if (b.blocking) { b.blocking = false; b.clearTint(); }
      b.stunUntil = Math.max(b.stunUntil || 0, now + 900); // guard broken + staggered
      s.fx.shockwave(b.x, b.y, s.theme.accent, 260);
      s.cameras.main.shake(140, 0.01);
      s.showBanner('⚡ ULTIMATE — GUARD BROKEN!', '#ffd700', 'critical');
    }
    // Ult speech floating text
    const heroId = s.characterDef && s.characterDef.id;
    const heroLines = heroId && HERO_DIALOGUE[heroId];
    if (heroLines && heroLines.ultCast) {
      const line = pickRandom(heroLines.ultCast);
      if (line && s.showSpeechText) s.showSpeechText(line);
    }
    this.chain = 0;
  }

  bumpCombo() {
    this.chain = Math.min(this.chain + 1, 99);
    this.chainGrace = DuelController.CHAIN_GRACE;
  }

  // The boss rage burst calls this to interrupt the player: drop the combo,
  // shove them back, and lock out input for `ms`.
  stunPlayer(ms) {
    const s = this.s;
    const now = s.time.now;
    this.pStunUntil = now + ms;
    this.atkState = 'ready';
    this.atkKind = null;
    this.atkTimer = 0;
    this.buffered = null;
    this.chain = 0;
    if (s.activeBoss) {
      const a = Math.atan2(s.player.y - s.activeBoss.y, s.player.x - s.activeBoss.x);
      let nx = s.player.x + Math.cos(a) * 150;
      let ny = s.player.y + Math.sin(a) * 150;
      const dx = nx - this.center.x;
      const dy = ny - this.center.y;
      const d = Math.hypot(dx, dy);
      if (d > this.radius) { nx = this.center.x + (dx / d) * this.radius; ny = this.center.y + (dy / d) * this.radius; }
      if (s.player.body) s.player.body.reset(nx, ny);
    }
    s.player.setTint(0x6688ff);
    s.cameras.main.shake(180, 0.012);
    if (!this.stunText) {
      this.stunText = s.add.text(0, 0, 'STUNNED!', {
        fontFamily: 'monospace', fontSize: '14px', color: '#9ec1ff', fontStyle: 'bold',
      }).setOrigin(0.5).setDepth(51);
    }
    this.stunText.setVisible(true).setPosition(s.player.x, s.player.y - 38);
  }

  // --- challenge: accept a duel, or decline and fight the boss in the open ---
  promptChallenge() {
    const s = this.s;
    s.challengePending = true;
    this.countdown = 5000;
    const def = getBoss(s.bossSeq[s.bossPhase]);
    const W = s.scale.width;
    const H = s.scale.height;

    // Boss taunt + hero reply dialogue
    const bossDlg = BOSS_DIALOGUE[def.id];
    const bossTaunt = bossDlg ? pickRandom(bossDlg.preDuel) : '';
    const heroId = s.characterDef && s.characterDef.id;
    const heroDlg = heroId && HERO_DIALOGUE[heroId];
    const heroReply = heroDlg ? pickRandom(heroDlg.duelReply) : '';

    // panel height: taller when dialogue lines are present
    const panelH = (bossTaunt || heroReply) ? 180 : 120;
    const panelY = H / 2 - (panelH / 2 - 16);

    this.challengeUI = [
      s.add.rectangle(W / 2, panelY + panelH / 2 - 16, 600, panelH, 0x05040a, 0.88).setScrollFactor(0).setDepth(59)
        .setStrokeStyle(2, 0xff5252, 0.9),
      s.add.text(W / 2, panelY - 8, `⚔  ${def.name} challenges you to a duel!`, {
        fontFamily: 'monospace', fontSize: '20px', color: '#ff5252', fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(60),
    ];

    let dialogY = panelY + 24;
    if (bossTaunt) {
      this.challengeUI.push(s.add.text(W / 2, dialogY,
        `"${bossTaunt}"`, {
          fontFamily: 'monospace', fontSize: '12px', color: '#ffaa88',
          wordWrap: { width: 560 }, align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(60));
      dialogY += 26;
    }
    if (heroReply) {
      this.challengeUI.push(s.add.text(W / 2, dialogY,
        `"${heroReply}"`, {
          fontFamily: 'monospace', fontSize: '12px', color: '#aaddff',
          wordWrap: { width: 560 }, align: 'center',
        }).setOrigin(0.5).setScrollFactor(0).setDepth(60));
      dialogY += 26;
    }

    this.challengeUI.push(
      s.add.text(W / 2, dialogY + 4, '[Y] Accept duel     [N] Decline — fight in the open', {
        fontFamily: 'monospace', fontSize: '14px', color: '#ffffff',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(60),
    );
    // countdown text — index tracked for update(); always last in the array
    this.challengeUI.push(
      s.add.text(W / 2, dialogY + 26, 'auto-accept in 5...', {
        fontFamily: 'monospace', fontSize: '12px', color: '#9a93c0',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(60),
    );
    Audio.sfx('boss');
  }

  clearChallengeUI() {
    if (this.challengeUI) { this.challengeUI.forEach((o) => o.destroy()); this.challengeUI = null; }
  }

  accept() {
    if (!this.s.challengePending) return;
    this.s.challengePending = false;
    this.clearChallengeUI();
    this.begin();
  }

  decline() {
    this.s.challengePending = false;
    this.clearChallengeUI();
    this.s.showBanner('You decline — face them amid the horde!', '#c9c4e0', 'normal');
    this.s.spawnStageBoss(); // boss joins the swarm; no duel, no finisher
  }

  // Clear the swarm, frame the cinematic arena, zoom in (Dynasty-Warriors style).
  begin() {
    const s = this.s;
    s.dueling = true;
    this.clean = true;
    this.atkState = 'ready';
    this.atkKind = null;
    this.atkTimer = 0;
    this.chain = 0;
    this.buffered = null;
    this.pStunUntil = 0;
    s.player.rooted = false;
    // remember where we pulled the player from, then teleport them + the fight to the
    // reserved arena precinct (world wrap is suppressed while dueling — see GameScene)
    this.fieldReturn = { x: s.player.x, y: s.player.y };
    this.center = { x: ARENA_ORIGIN.x, y: ARENA_ORIGIN.y };
    for (const e of s.enemies.getChildren()) if (e.active && !e.isBoss) s.deactivate(e);
    for (const p of s.enemyProjectiles.getChildren()) if (p.active) s.deactivate(p);
    for (const p of s.projectiles.getChildren()) if (p.active) s.deactivate(p);
    // Caesar's standing legion comes WITH him into the duel — the legion IS his kit, so
    // fighting a boss without it felt wrong. Teleport up to 4 active legionaries into the
    // arena near the player (the rest are dismissed); they seek + chip the boss like normal.
    if (s.allies) {
      let brought = 0;
      for (const a of s.allies.getChildren()) {
        if (!a.active) continue;
        if (brought < 4) {
          const aa = Math.random() * Math.PI * 2, rr = this.radius * (0.25 + Math.random() * 0.2);
          a.body.reset(this.center.x + Math.cos(aa) * rr, this.center.y + Math.sin(aa) * rr);
          brought++;
        } else { s.deactivate(a); }
      }
    }
    s.player.body.reset(this.center.x, this.center.y + this.radius * 0.55); // stand at the near edge

    // ITEM D: suppress ambient particles during the duel
    if (s._stopAmbienceEmitter) s._stopAmbienceEmitter();
    // build the themed arena (floor, walls, dressing, cover, hazards)
    this.arena.build(this.center.x, this.center.y, this.radius);

    const cam = s.cameras.main;
    cam.removeBounds(); // the arena lives far outside the floor rect — let the camera reach it
    cam.stopFollow();
    cam.centerOn(s.player.x, s.player.y); // snap (the teleport is huge — don't pan-slide)
    cam.startFollow(s.player, true, 0.14, 0.14); // follow the player so kiting scrolls the arena
    cam.zoomTo(1.3, 500, 'Sine.easeInOut');
    cam.flash(260, 60, 0, 0);

    const W = s.scale.width;
    const H = s.scale.height;
    this.fx = [
      s.add.rectangle(0, 0, W, 46, 0x000000, 0.92).setOrigin(0).setScrollFactor(0).setDepth(44),
      s.add.rectangle(0, H - 46, W, 46, 0x000000, 0.92).setOrigin(0).setScrollFactor(0).setDepth(44),
      s.add.rectangle(0, 0, W, H, 0x000000, 0.28).setOrigin(0).setScrollFactor(0).setDepth(43),
    ];
    this.comboText = s.add.text(W / 2, 96, '', {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50).setVisible(false);
    // flawless indicator: gold star shown in letterbox while the player hasn't dropped below 50% HP
    this.flawlessText = s.add.text(W - 14, 22, '★ flawless', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(0).setDepth(51).setVisible(true);
    this.fx.push(s.add.text(W / 2, H - 30, 'Arrows move/aim  ·  J primary  ·  F secondary  ·  SPACE ultimate breaks guard', {
      fontFamily: 'monospace', fontSize: '12px', color: '#d8d3ee',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(50));

    const def = getBoss(s.bossSeq[s.bossPhase]);
    s.showBanner(`⚔  ${def.name} challenges you!`, '#ff5252', 'critical');
    Audio.sfx('boss');
    s.spawnStageBoss();
  }

  end() {
    const s = this.s;
    if (!s.dueling) return;
    s.dueling = false;
    s.player.rooted = false;
    this.pStunUntil = 0;
    this.atkState = 'ready';
    this.atkKind = null;
    this.chain = 0;
    s.player.clearTint();
    // tear down the arena and drop the player back where they were in the field
    this.arena.teardown();
    if (this.fieldReturn) {
      s.player.body.reset(this.fieldReturn.x, this.fieldReturn.y);
      // surviving legionaries followed the player into the arena — bring them back too
      if (s.allies) for (const a of s.allies.getChildren()) {
        if (a.active) a.body.reset(s.player.x + (Math.random() * 80 - 40), s.player.y + (Math.random() * 80 - 40));
      }
      this.fieldReturn = null;
    }
    const cam = s.cameras.main;
    cam.stopFollow();
    // dungeon mode: re-clamp the camera to the floor rect (removed for the arena teleport)
    if (s.dungeonMode && s.floorSys && s.floorSys.data) cam.setBounds(0, 0, s.floorSys.pixelW(), s.floorSys.pixelH());
    cam.centerOn(s.player.x, s.player.y); // snap back from the precinct (no long pan)
    cam.zoomTo(1, 500, 'Sine.easeInOut');
    cam.startFollow(s.player, true, 0.12, 0.12);
    if (this.fx) {
      for (const o of this.fx) s.tweens.add({ targets: o, alpha: 0, duration: 400, onComplete: () => o.destroy() });
      this.fx = null;
    }
    if (this.comboText) { this.comboText.destroy(); this.comboText = null; }
    if (this.stunText) { this.stunText.destroy(); this.stunText = null; }
    if (this.flawlessText) { this.flawlessText.destroy(); this.flawlessText = null; }
    // ITEM D: restore ambient particles now that the duel arena has been torn down
    if (s._startAmbienceEmitter) s._startAmbienceEmitter();
  }

  // Dramatic kill flourish (called from GameScene.defeatBoss when wasDuel).
  finisher(boss) {
    const s = this.s;
    s.cameras.main.flash(280, 255, 255, 255);
    s.cameras.main.setZoom(1.65);
    s.fx.shockwave(boss.x, boss.y, 0xffffff, 480);
    s.fx.shockwave(boss.x, boss.y, s.theme.accent, 300);
    s.physics.world.timeScale = 2.4;
    s.tweens.add({ targets: s.physics.world, timeScale: 1, duration: 750 });
    s.showBanner(this.clean ? '⚔  FLAWLESS DUEL!' : '⚔  FINISHED!', '#ffd700', 'critical');
  }

  // Soft wall keeping the player + boss inside the arena ring.
  // Uses position clamping WITHOUT body.reset() so velocity is preserved, then
  // strips only the outward (radial) velocity component so the entity slides along
  // the wall instead of being pinned — input can steer them inward immediately.
  clampToArena() {
    const s = this.s;
    const r = this.radius;
    const c = this.center;
    const fix = (o) => {
      if (!o || !o.active || !o.body) return;
      const dx = o.x - c.x;
      const dy = o.y - c.y;
      const d = Math.hypot(dx, dy);
      if (d <= r) return;

      // Clamp position to the ring edge — move the sprite and sync the arcade body
      // offset so they stay together.  Do NOT call body.reset() (it zeroes velocity).
      const nx = c.x + (dx / d) * r;
      const ny = c.y + (dy / d) * r;
      const deltaX = nx - o.x;
      const deltaY = ny - o.y;
      o.x = nx;
      o.y = ny;
      o.body.x += deltaX;
      o.body.y += deltaY;

      // Remove only the outward radial component of velocity so the entity can
      // slide along the wall (tangential component kept) and steer back inward.
      // Normal pointing outward: (dx/d, dy/d).
      const nx_ = dx / d;
      const ny_ = dy / d;
      const dot = o.body.velocity.x * nx_ + o.body.velocity.y * ny_;
      if (dot > 0) {
        // Velocity has an outward component — cancel it, keep the tangential part.
        o.body.velocity.x -= dot * nx_;
        o.body.velocity.y -= dot * ny_;
      }
    };
    fix(s.player);
    fix(s.activeBoss);
  }
}
