// TipScene — paused tip card with animated mechanic demo.
//
// Launched over a paused GameScene (same pattern as UpgradeScene).
// Sets gs.tipOpen = true on entry; clears it + resumes GameScene on close.
//
// init(data) expects:
//   data.gameScene  — the live GameScene reference
//   data.mechanic   — mechanic id string (matches TIP_DEFS keys)

import Phaser from 'phaser';
import { drawPanel } from '../art/ui.js';
import { Settings, keyLabel } from '../systems/Settings.js';

// ── Tip definitions ────────────────────────────────────────────────────────────
// Each entry: { title, caption(binds), demo(scene, area) }
// area = { x, y, w, h } in scene coords (the demo viewport rect).
// demo() starts a looping tween vignette; must return a cleanup function.

function tipDefs(binds) {
  const kDash = keyLabel(binds.dash);
  const kPri  = keyLabel(binds.primary);
  const kSec  = keyLabel(binds.secondary);

  return {
    dash: {
      title: 'DASH',
      caption: `[${kDash}] — 2 charges, ~300 ms i-frames. You pass through hits.`,
    },
    perfect_dodge: {
      title: 'PERFECT DODGE',
      caption: `Dash THROUGH an attack at the last instant → "PERFECT". Resets [${kSec}] CD.`,
    },
    deflect: {
      title: 'DEFLECT',
      caption: `Perfect Dodge also REFLECTS nearby enemy projectiles back at 1.5× speed.`,
    },
    counter: {
      title: 'COUNTER',
      caption: `Enemies flash red before striking. Hit them THEN (while [${kPri}] is ready) for a Counter.`,
    },
    charge: {
      title: 'CHARGE ATTACK',
      caption: `Hold [${kPri}] until the ring fills, then release for 1.8× damage. Release at 95%+ for bonus.`,
    },
    slam: {
      title: 'SLAM COMBO',
      caption: `Press [${kPri}] within 0.18 s of a dash landing → ground-slam AoE (1.2× damage, 90 px).`,
    },
    execution: {
      title: 'EXECUTION',
      caption: `Dash-strike an elite at ≤18% HP (☠ appears) to instantly finish it.`,
    },
    wall_crunch: {
      title: 'WALL CRUNCH',
      caption: `Knock enemies into solid walls → bonus damage + 400 ms stun.`,
    },
    momentum: {
      title: 'MOMENTUM',
      caption: `Kills without taking damage empower you — streak counter builds bonus damage. Don't get hit.`,
    },
    combo: {
      title: 'COMBO STRING',
      caption: `Tap [${kPri}] up to 4 times — each tap fires a different swing. Press [${kSec}] MID-STRING for an instant Charge Finisher (C2/C3/C4). Hold [${kPri}] for the same finisher. Depth pips glow gold below the HP bar.`,
    },
  };
}

// ── Shared demo helpers ────────────────────────────────────────────────────────

const PLAYER_COLOR  = 0x44ccff;
const ENEMY_COLOR   = 0xff5544;
const PROJ_COLOR    = 0xffbb44;
const WALL_COLOR    = 0x6a5f8a;
const GOLD_COLOR    = 0xffd700;
const CYAN_COLOR    = 0x00e5ff;

/** Draw a tiny humanoid stick-sprite as a filled rect + round head. */
function makeActor(scene, x, y, color, opts = {}) {
  const g = scene.add.graphics().setDepth(opts.depth || 91);
  const s = opts.scale || 1;
  const bw = 10 * s, bh = 14 * s, hr = 5 * s;
  g.fillStyle(color, 1);
  g.fillRect(-bw / 2, -bh / 2, bw, bh); // body
  g.fillCircle(0, -bh / 2 - hr, hr);     // head
  g.x = x; g.y = y;
  return g;
}

/** Small filled circle (projectile / ring). */
function makeCircle(scene, x, y, r, color, alpha = 1, depth = 90) {
  const g = scene.add.graphics().setDepth(depth);
  g.fillStyle(color, alpha).fillCircle(0, 0, r);
  g.x = x; g.y = y;
  return g;
}

/** Solid wall block. */
function makeWall(scene, x, y, w, h) {
  const g = scene.add.graphics().setDepth(89);
  g.fillStyle(WALL_COLOR, 0.9).fillRect(-w / 2, -h / 2, w, h);
  g.lineStyle(1, 0xc0b8e0, 0.5).strokeRect(-w / 2, -h / 2, w, h);
  g.x = x; g.y = y;
  return g;
}

/** Text label in demo area. */
function makeLabel(scene, x, y, text, color = '#e8e2ff', size = '11px') {
  return scene.add.text(x, y, text, {
    fontFamily: 'monospace', fontSize: size, color,
    stroke: '#000000', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(95);
}

// Cleanup helper — destroy an array of Phaser objects and clear tweens.
function cleanObjs(scene, objs) {
  for (const o of objs) { if (o && o.destroy) o.destroy(); }
  objs.length = 0;
}

// ── Demo builders ──────────────────────────────────────────────────────────────
// Each returns a { stop } object. They loop indefinitely via tweenChain tricks.

function demoDash(scene, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  // Red attack flash (stationary)
  const flash = makeCircle(scene, cx + 40, cy, 18, 0xff3333, 0.6, 90);
  objs.push(flash);

  // Player ghost trail (3 ghosts fading left→right across flash)
  const player = makeActor(scene, cx - 55, cy, PLAYER_COLOR);
  objs.push(player);

  function loop() {
    if (stopped) return;
    player.x = cx - 55; player.alpha = 1;
    // Spawn afterimage ghosts
    const ghosts = [0, 1, 2].map((i) => {
      const g = makeActor(scene, cx - 55 + i * 18, cy, CYAN_COLOR, { depth: 90 });
      g.alpha = 0.5 - i * 0.15;
      objs.push(g);
      return g;
    });
    scene.tweens.add({
      targets: player, x: cx + 65, duration: 320, ease: 'Quad.easeIn',
      onUpdate: () => {
        ghosts.forEach((g, i) => {
          g.x = player.x - 20 - i * 18;
          g.alpha = Math.max(0, 0.4 - i * 0.12);
        });
      },
      onComplete: () => {
        ghosts.forEach((g) => g.destroy());
        ghosts.forEach((g, idx) => { const i = objs.indexOf(g); if (i >= 0) objs.splice(i, 1); });
        if (!stopped) scene.time.delayedCall(800, loop);
      },
    });
    // Flash briefly red when player overlaps
    scene.time.delayedCall(160, () => {
      if (stopped) return;
      scene.tweens.add({ targets: flash, alpha: 0.15, duration: 120, yoyo: true, onComplete: () => { flash.alpha = 0.6; } });
    });
  }
  loop();

  return {
    stop() { stopped = true; cleanObjs(scene, objs); },
  };
}

function demoPerfectDodge(scene, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const enemy = makeActor(scene, cx + 70, cy, ENEMY_COLOR);
  objs.push(enemy);
  // Incoming projectile
  const proj = makeCircle(scene, cx + 50, cy, 5, PROJ_COLOR, 0.9, 91);
  objs.push(proj);
  const player = makeActor(scene, cx - 30, cy, PLAYER_COLOR);
  objs.push(player);
  // "PERFECT" label (initially hidden)
  const label = makeLabel(scene, cx - 30, cy - 36, 'PERFECT', '#00e5ff');
  label.setAlpha(0); objs.push(label);
  // Reflected proj (initially hidden)
  const reflProj = makeCircle(scene, cx - 30, cy, 5, CYAN_COLOR, 0, 91);
  objs.push(reflProj);

  function loop() {
    if (stopped) return;
    proj.x = cx + 50; proj.y = cy; proj.alpha = 0.9;
    player.x = cx - 30; player.y = cy; player.alpha = 1;
    label.setAlpha(0);
    reflProj.x = cx - 30; reflProj.alpha = 0;

    // Projectile travels left toward player
    scene.tweens.add({
      targets: proj, x: cx - 30, duration: 400, ease: 'Linear',
      onComplete: () => {
        if (stopped) return;
        // Perfect dodge: player dashes through
        proj.alpha = 0;
        label.setAlpha(1);
        reflProj.x = cx - 30; reflProj.alpha = 0.9;
        scene.tweens.add({ targets: label, alpha: 0, duration: 600, delay: 500 });
        // Reflected shot flies back
        scene.tweens.add({
          targets: reflProj, x: cx + 80, alpha: 0, duration: 400, ease: 'Linear',
          onComplete: () => { if (!stopped) scene.time.delayedCall(700, loop); },
        });
      },
    });
    // Player dashes through
    scene.tweens.add({ targets: player, x: cx + 10, duration: 260, delay: 200, ease: 'Quad.easeIn' });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoDeflect(scene, area) {
  // Same as perfect_dodge but show multiple projectiles reversing
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const player = makeActor(scene, cx, cy, PLAYER_COLOR);
  objs.push(player);
  const label = makeLabel(scene, cx, cy - 38, 'DEFLECT', CYAN_COLOR.toString(16).padStart(6, '0'));
  label.setColor('#00e5ff').setAlpha(0); objs.push(label);

  // 3 incoming projs at angles
  const angles = [-20, 0, 20];
  const projs = angles.map((a) => {
    const rad = Phaser.Math.DegToRad(180 + a);
    const p = makeCircle(scene, cx + Math.cos(Phaser.Math.DegToRad(a)) * 70, cy + Math.sin(Phaser.Math.DegToRad(a)) * 70, 5, PROJ_COLOR, 0.9, 91);
    objs.push(p);
    return { p, rad };
  });

  function loop() {
    if (stopped) return;
    projs.forEach(({ p }) => { p.alpha = 0.9; });
    player.alpha = 1; label.setAlpha(0);

    // Projs fly toward player
    projs.forEach(({ p }, i) => {
      const a = Phaser.Math.DegToRad(angles[i]);
      p.x = cx + Math.cos(a) * 70;
      p.y = cy + Math.sin(a) * 70;
      scene.tweens.add({
        targets: p, x: cx + Math.cos(a) * 8, y: cy + Math.sin(a) * 8, duration: 340, ease: 'Linear',
        onComplete: () => {
          if (stopped) return;
          // Deflect: reverse them cyan
          p.setTint(CYAN_COLOR);
          label.setAlpha(1);
          scene.tweens.add({ targets: label, alpha: 0, duration: 500, delay: 400 });
          scene.tweens.add({
            targets: p, x: cx + Math.cos(a) * 100, y: cy + Math.sin(a) * 100, alpha: 0, duration: 380, ease: 'Quad.easeOut',
            onComplete: () => {
              p.clearTint();
              if (i === 0 && !stopped) scene.time.delayedCall(700, loop);
            },
          });
        },
      });
    });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoCounter(scene, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const enemy = makeActor(scene, cx + 50, cy, ENEMY_COLOR);
  objs.push(enemy);
  const player = makeActor(scene, cx - 40, cy, PLAYER_COLOR);
  objs.push(player);
  const ring = makeCircle(scene, cx - 40, cy, 20, GOLD_COLOR, 0, 92);
  objs.push(ring);
  const label = makeLabel(scene, cx - 40, cy - 38, 'COUNTER!', '#ffd700');
  label.setAlpha(0); objs.push(label);

  function loop() {
    if (stopped) return;
    enemy.setTint(ENEMY_COLOR); enemy.alpha = 1;
    ring.alpha = 0;
    label.setAlpha(0);
    player.x = cx - 40; player.alpha = 1;

    // Enemy winds up (flash red)
    scene.time.delayedCall(300, () => {
      if (stopped) return;
      enemy.setTint(0xff0000);
      scene.tweens.add({ targets: enemy, scaleX: 1.25, scaleY: 0.8, duration: 180, yoyo: true });
      // Gold ring arms on player
      ring.x = player.x; ring.y = player.y;
      scene.tweens.add({ targets: ring, alpha: 0.85, duration: 200 });
      // Player strikes (counter hits)
      scene.time.delayedCall(280, () => {
        if (stopped) return;
        scene.tweens.add({ targets: ring, alpha: 0, duration: 120 });
        label.x = cx - 40; label.setAlpha(1);
        scene.tweens.add({ targets: label, y: label.y - 14, alpha: 0, duration: 600 });
        enemy.setTint(0xffffff);
        scene.tweens.add({ targets: enemy, alpha: 0.3, duration: 120, yoyo: true, onComplete: () => { enemy.clearTint(); } });
        scene.time.delayedCall(1000, () => { label.y = cy - 38; if (!stopped) loop(); });
      });
    });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoCharge(scene, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const player = makeActor(scene, cx - 40, cy, PLAYER_COLOR);
  objs.push(player);
  // Charge ring (arc that fills)
  const ringG = scene.add.graphics().setDepth(92);
  objs.push(ringG);
  const label = makeLabel(scene, cx - 40, cy - 40, 'HEAVY!', '#ffd700');
  label.setAlpha(0); objs.push(label);
  // Heavy projectile
  const heavyProj = makeCircle(scene, cx - 40, cy, 0, GOLD_COLOR, 0.9, 91);
  objs.push(heavyProj);

  let fillPct = 0;

  function drawRing(pct) {
    ringG.clear();
    ringG.lineStyle(3, GOLD_COLOR, 0.5 + pct * 0.5);
    ringG.beginPath();
    ringG.arc(cx - 40, cy, 20, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false);
    ringG.strokePath();
    // Inner glow at full
    if (pct >= 0.95) {
      ringG.lineStyle(2, 0xffffff, 0.4);
      ringG.strokeCircle(cx - 40, cy, 22);
    }
  }

  function loop() {
    if (stopped) return;
    fillPct = 0;
    label.setAlpha(0);
    heavyProj.setRadius ? heavyProj.setRadius(0) : null;
    heavyProj.x = cx - 40; heavyProj.alpha = 0;
    drawRing(0);

    scene.tweens.add({
      targets: { v: 0 }, v: 1, duration: 800, ease: 'Linear',
      onUpdate: (tw) => {
        fillPct = tw.targets[0].v;
        drawRing(fillPct);
      },
      onComplete: () => {
        if (stopped) return;
        ringG.clear();
        label.setAlpha(1);
        heavyProj.x = cx - 40; heavyProj.alpha = 1;
        const bigR = scene.add.graphics().setDepth(91);
        bigR.fillStyle(GOLD_COLOR, 0.9).fillCircle(0, 0, 10);
        bigR.x = cx - 40; bigR.y = cy;
        objs.push(bigR);
        scene.tweens.add({
          targets: bigR, x: cx + 90, alpha: 0, duration: 380, ease: 'Quad.easeOut',
          onComplete: () => { bigR.destroy(); const i = objs.indexOf(bigR); if (i >= 0) objs.splice(i, 1); },
        });
        scene.tweens.add({ targets: label, alpha: 0, duration: 300, delay: 500 });
        if (!stopped) scene.time.delayedCall(1000, loop);
      },
    });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoSlam(scene, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const player = makeActor(scene, cx - 60, cy, PLAYER_COLOR);
  objs.push(player);
  const slamRing = makeCircle(scene, cx, cy, 0, GOLD_COLOR, 0, 90);
  objs.push(slamRing);
  const label = makeLabel(scene, cx, cy - 30, 'SLAM!', '#ffe08a');
  label.setAlpha(0); objs.push(label);

  // Enemies
  const enemies = [-30, 30, 0].map((dy) => {
    const e = makeActor(scene, cx + 20, cy + dy, ENEMY_COLOR);
    objs.push(e);
    return e;
  });

  function loop() {
    if (stopped) return;
    player.x = cx - 60; player.alpha = 1;
    enemies.forEach((e, i) => { e.x = cx + 20; e.y = cy + [-30, 30, 0][i]; e.alpha = 1; e.setScale(1); });
    slamRing.setRadius ? slamRing.setRadius(0) : null;
    slamRing.alpha = 0;
    label.setAlpha(0);

    // Dash to target
    scene.tweens.add({
      targets: player, x: cx - 10, duration: 250, ease: 'Quad.easeIn',
      onComplete: () => {
        if (stopped) return;
        // Slam ring expands
        const ringG2 = scene.add.graphics().setDepth(90);
        objs.push(ringG2);
        scene.tweens.add({
          targets: { r: 0 }, r: 80, duration: 280, ease: 'Quad.easeOut',
          onUpdate: (tw) => {
            ringG2.clear();
            ringG2.lineStyle(3, GOLD_COLOR, 0.8 - tw.targets[0].r / 100).strokeCircle(cx - 10, cy, tw.targets[0].r);
          },
          onComplete: () => { ringG2.destroy(); const i2 = objs.indexOf(ringG2); if (i2 >= 0) objs.splice(i2, 1); },
        });
        label.x = cx - 10; label.setAlpha(1);
        scene.tweens.add({ targets: label, y: label.y - 12, alpha: 0, duration: 500 });
        enemies.forEach((e) => {
          const ang = Math.atan2(e.y - cy, e.x - (cx - 10));
          scene.tweens.add({ targets: e, x: e.x + Math.cos(ang) * 22, y: e.y + Math.sin(ang) * 22, alpha: 0.4, duration: 300 });
        });
        if (!stopped) scene.time.delayedCall(1200, () => { label.y = cy - 30; loop(); });
      },
    });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoExecution(scene, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const enemy = makeActor(scene, cx + 50, cy, ENEMY_COLOR);
  objs.push(enemy);
  // Low-HP skull label above enemy
  const skull = makeLabel(scene, cx + 50, cy - 30, '☠ 15% HP', '#ff4444');
  objs.push(skull);
  const player = makeActor(scene, cx - 50, cy, PLAYER_COLOR);
  objs.push(player);
  const exLabel = makeLabel(scene, cx + 50, cy - 45, 'EXECUTION!', '#ff4444', '12px');
  exLabel.setAlpha(0); objs.push(exLabel);

  function loop() {
    if (stopped) return;
    player.x = cx - 50; player.alpha = 1;
    enemy.alpha = 1; enemy.x = cx + 50; enemy.setScale(1);
    skull.alpha = 1; skull.x = cx + 50;
    exLabel.setAlpha(0);

    scene.time.delayedCall(400, () => {
      if (stopped) return;
      // Player dashes through enemy
      scene.tweens.add({ targets: player, x: cx + 65, duration: 260, ease: 'Quad.easeIn' });
      scene.time.delayedCall(160, () => {
        if (stopped) return;
        // Flash + enemy dies
        enemy.setTint(0xffffff);
        scene.tweens.add({ targets: [enemy, skull], alpha: 0, duration: 200 });
        exLabel.x = cx + 50; exLabel.setAlpha(1);
        scene.tweens.add({ targets: exLabel, y: exLabel.y - 16, alpha: 0, duration: 600 });
        scene.time.delayedCall(1000, () => {
          enemy.clearTint(); exLabel.y = cy - 45;
          if (!stopped) loop();
        });
      });
    });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoWallCrunch(scene, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const wall = makeWall(scene, cx + 60, cy, 16, 50);
  objs.push(wall);
  const enemy = makeActor(scene, cx, cy, ENEMY_COLOR);
  objs.push(enemy);
  const player = makeActor(scene, cx - 50, cy, PLAYER_COLOR);
  objs.push(player);
  const dustLabel = makeLabel(scene, cx + 60, cy - 30, 'CRUNCH! STUN', '#c8c0b0');
  dustLabel.setAlpha(0); objs.push(dustLabel);
  // Stars (stun)
  const stars = [0, 1, 2].map((i) => makeLabel(scene, cx + 50 + i * 10, cy - 20, '★', '#ffd700', '10px'));
  stars.forEach((s) => { s.setAlpha(0); objs.push(s); });

  function loop() {
    if (stopped) return;
    enemy.x = cx; enemy.y = cy; enemy.alpha = 1; enemy.setScale(1);
    player.x = cx - 50; player.alpha = 1;
    dustLabel.setAlpha(0);
    stars.forEach((s) => s.setAlpha(0));

    scene.time.delayedCall(300, () => {
      if (stopped) return;
      // Player attacks, enemy flies into wall
      scene.tweens.add({ targets: enemy, x: cx + 52, duration: 280, ease: 'Quad.easeOut' });
      scene.time.delayedCall(280, () => {
        if (stopped) return;
        dustLabel.setAlpha(1);
        stars.forEach((s, i) => { s.setAlpha(1); scene.tweens.add({ targets: s, y: s.y - 10, alpha: 0, duration: 500, delay: i * 100 }); });
        scene.tweens.add({ targets: dustLabel, alpha: 0, duration: 400, delay: 600 });
        if (!stopped) scene.time.delayedCall(1200, () => { stars.forEach((s) => { s.y = cy - 20; }); loop(); });
      });
    });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoMomentum(scene, area) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const player = makeActor(scene, cx - 50, cy, PLAYER_COLOR);
  objs.push(player);
  // Kill counters
  const killLabels = [1, 2, 3].map((n, i) => {
    const lbl = makeLabel(scene, cx - 20 + i * 45, cy - 5, `×${n}`, '#ffe08a', '13px');
    lbl.setAlpha(0); objs.push(lbl);
    return lbl;
  });
  const streakBar = scene.add.graphics().setDepth(91);
  objs.push(streakBar);
  const empLabel = makeLabel(scene, cx, cy - 36, 'EMPOWERED', '#ffd700', '12px');
  empLabel.setAlpha(0); objs.push(empLabel);

  // Enemies
  const enemyX = [cx + 10, cx + 55, cx + 100];
  const enemies = enemyX.map((ex) => {
    const e = makeActor(scene, ex, cy, ENEMY_COLOR);
    objs.push(e); return e;
  });

  function drawBar(pct) {
    streakBar.clear();
    streakBar.fillStyle(0x222244, 0.7).fillRect(cx - 50, cy + 22, 100, 8);
    streakBar.fillStyle(GOLD_COLOR, 1).fillRect(cx - 50, cy + 22, 100 * pct, 8);
  }
  drawBar(0);

  function loop() {
    if (stopped) return;
    enemies.forEach((e, i) => { e.x = enemyX[i]; e.alpha = 1; });
    killLabels.forEach((l) => l.setAlpha(0));
    empLabel.setAlpha(0);
    drawBar(0);

    enemies.forEach((e, i) => {
      scene.time.delayedCall(400 + i * 500, () => {
        if (stopped) return;
        scene.tweens.add({ targets: e, alpha: 0, scaleX: 1.3, scaleY: 0.7, duration: 160 });
        killLabels[i].setAlpha(1);
        scene.tweens.add({ targets: killLabels[i], alpha: 0, y: killLabels[i].y - 12, duration: 500 });
        drawBar((i + 1) / 3);
        if (i === 2) {
          empLabel.setAlpha(1);
          scene.tweens.add({ targets: empLabel, alpha: 0, duration: 500, delay: 700 });
          scene.time.delayedCall(1400, () => {
            killLabels.forEach((l) => { l.y = cy - 5; });
            empLabel.y = cy - 36;
            if (!stopped) loop();
          });
        }
      });
    });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoCombo(scene, area) {
  // Shows: player taps J three times (pips light up S1→S3), then K branches
  // into a C3 charge finisher that launches an enemy airborne.
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2;
  const objs = [];
  let stopped = false;

  const player = makeActor(scene, cx - 60, cy, PLAYER_COLOR);
  objs.push(player);
  const enemy = makeActor(scene, cx + 40, cy, ENEMY_COLOR);
  objs.push(enemy);

  // 4 depth pips (row above demo area bottom)
  const PIP_W = 9, PIP_H = 9, PIP_GAP = 4;
  const pipRow = [];
  const pip0X = cx - 62;
  const pipY  = cy + 32;
  for (let i = 0; i < 4; i++) {
    const pg = scene.add.graphics().setDepth(93);
    pg.x = pip0X + i * (PIP_W + PIP_GAP); pg.y = pipY;
    objs.push(pg);
    pipRow.push(pg);
  }

  // [K] glyph text
  const kGlyph = makeLabel(scene, pip0X + 4 * (PIP_W + PIP_GAP) + 8, pipY, '[K]', '#ffd700', '11px');
  kGlyph.setAlpha(0); objs.push(kGlyph);

  // Step labels (J tap flash)
  const stepLabel = makeLabel(scene, cx - 60, cy - 36, '', '#aae8ff', '12px');
  stepLabel.setAlpha(0); objs.push(stepLabel);

  // Finisher label
  const finLabel = makeLabel(scene, cx + 40, cy - 40, 'C3!', '#ff8800', '14px');
  finLabel.setAlpha(0); objs.push(finLabel);

  // Shadow ellipse for tumble
  const shadow = scene.add.graphics().setDepth(88);
  objs.push(shadow);

  function drawPips(depth) {
    pipRow.forEach((pg, i) => {
      pg.clear();
      const filled = i < depth;
      pg.fillStyle(0x000000, 0.55).fillRect(-1, -1, PIP_W + 2, PIP_H + 2);
      pg.fillStyle(filled ? 0xffd700 : 0x1a1400, filled ? 0.95 : 0.35).fillRect(0, 0, PIP_W, PIP_H);
    });
  }

  function loop() {
    if (stopped) return;
    player.x = cx - 60; player.alpha = 1; player.setScale(1);
    enemy.x = cx + 40; enemy.y = cy; enemy.alpha = 1; enemy.setScale(1);
    shadow.clear();
    stepLabel.setAlpha(0);
    finLabel.setAlpha(0);
    kGlyph.setAlpha(0);
    drawPips(0);

    // S1 tap
    scene.time.delayedCall(300, () => {
      if (stopped) return;
      drawPips(1);
      stepLabel.setText('S1').setAlpha(1);
      scene.tweens.add({ targets: player, x: cx - 52, duration: 80, yoyo: true });
      scene.tweens.add({ targets: stepLabel, alpha: 0, duration: 350 });
    });

    // S2 tap
    scene.time.delayedCall(650, () => {
      if (stopped) return;
      drawPips(2);
      stepLabel.setText('S2').setAlpha(1);
      scene.tweens.add({ targets: player, x: cx - 46, duration: 80, yoyo: true });
      scene.tweens.add({ targets: stepLabel, alpha: 0, duration: 350 });
    });

    // S3 tap
    scene.time.delayedCall(1000, () => {
      if (stopped) return;
      drawPips(3);
      stepLabel.setText('S3').setAlpha(1);
      scene.tweens.add({ targets: player, x: cx - 40, duration: 80, yoyo: true });
      scene.tweens.add({ targets: stepLabel, alpha: 0, duration: 350 });
      // [K] glyph appears
      kGlyph.setAlpha(1);
      scene.tweens.add({ targets: kGlyph, scaleX: 1.5, scaleY: 1.5, duration: 100, yoyo: true });
    });

    // K fires C3 finisher
    scene.time.delayedCall(1380, () => {
      if (stopped) return;
      kGlyph.setAlpha(0);
      drawPips(0); // depth resets
      finLabel.setAlpha(1);
      scene.tweens.add({ targets: finLabel, y: finLabel.y - 16, alpha: 0, duration: 600 });

      // Enemy tumble: scale pop + float up
      scene.tweens.add({
        targets: enemy, scaleX: 1.25, scaleY: 1.25, duration: 100, ease: 'Quad.easeOut',
        onComplete: () => {
          if (stopped) return;
          enemy.setTint(0xffeedd); // pale tint
          // shadow ellipse under enemy
          shadow.clear().fillStyle(0x000000, 0.35).fillEllipse(cx + 40, cy + 18, 26, 8);
          scene.tweens.add({
            targets: enemy, y: cy - 22, duration: 300, ease: 'Quad.easeOut',
            onUpdate: () => { shadow.clear().fillStyle(0x000000, 0.25).fillEllipse(enemy.x, cy + 18, 26, 8); },
            onComplete: () => {
              if (stopped) return;
              scene.tweens.add({
                targets: enemy, y: cy, scaleX: 1, scaleY: 1, duration: 350, ease: 'Bounce.easeOut',
                onUpdate: () => { shadow.clear().fillStyle(0x000000, 0.3).fillEllipse(enemy.x, cy + 18, 26, 8); },
                onComplete: () => {
                  shadow.clear(); enemy.clearTint();
                  finLabel.y = cy - 40;
                  if (!stopped) scene.time.delayedCall(900, loop);
                },
              });
            },
          });
        },
      });
    });
  }
  loop();

  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

// ── Demo registry ──────────────────────────────────────────────────────────────
const DEMO_FNS = {
  dash: demoDash,
  perfect_dodge: demoPerfectDodge,
  deflect: demoDeflect,
  counter: demoCounter,
  charge: demoCharge,
  slam: demoSlam,
  execution: demoExecution,
  wall_crunch: demoWallCrunch,
  momentum: demoMomentum,
  combo: demoCombo,
};

// ── TipScene ───────────────────────────────────────────────────────────────────

export default class TipScene extends Phaser.Scene {
  constructor() {
    super('TipScene');
  }

  init(data) {
    this.gs = data.gameScene;
    this.mechanic = data.mechanic;
    this._demoHandle = null;
  }

  create() {
    const { width, height } = this.scale;
    const PANEL_W = 520;
    const PANEL_H = 300;
    const px = (width - PANEL_W) / 2;
    const py = (height - PANEL_H) / 2;

    // Dark dim overlay
    this.add.rectangle(0, 0, width, height, 0x020108, 0.80).setOrigin(0);

    // Panel background
    const g = this.add.graphics();
    drawPanel(g, px, py, PANEL_W, PANEL_H, 0xffd700, { fill: 0x0d0b18, alpha: 0.98, radius: 12, header: 34 });

    // Title bar (centered)
    const defs = tipDefs(Settings.binds);
    const def = defs[this.mechanic] || { title: this.mechanic.toUpperCase(), caption: '' };

    this.add.text(width / 2, py + 18, def.title, {
      fontFamily: 'monospace', fontSize: '20px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(10);

    // Demo area (bordered rect inside panel)
    const DEMO_W = PANEL_W - 40;
    const DEMO_H = 150;
    const DEMO_X = px + 20;
    const DEMO_Y = py + 42;

    // Demo backing
    const dg = this.add.graphics().setDepth(88);
    dg.fillStyle(0x06050f, 0.95).fillRect(DEMO_X, DEMO_Y, DEMO_W, DEMO_H);
    dg.lineStyle(1, 0xffd700, 0.25).strokeRect(DEMO_X, DEMO_Y, DEMO_W, DEMO_H);

    // Mask demo objects to the demo area
    const maskShape = this.make.graphics({ add: false });
    maskShape.fillStyle(0xffffff).fillRect(DEMO_X, DEMO_Y, DEMO_W, DEMO_H);
    const mask = maskShape.createGeometryMask();

    // Run demo
    const demoArea = { x: DEMO_X, y: DEMO_Y, w: DEMO_W, h: DEMO_H };
    const demoFn = DEMO_FNS[this.mechanic];
    if (demoFn) {
      this._demoHandle = demoFn(this, demoArea);
      // Apply mask to all demo objects added after this point (by traversing new children)
      // Demo objects get depth 89-95 which is above the backing.
    }

    // Caption (with actual keybinds)
    this.add.text(width / 2, DEMO_Y + DEMO_H + 16, def.caption, {
      fontFamily: 'monospace', fontSize: '13px', color: '#c9c4e0',
      align: 'center', wordWrap: { width: PANEL_W - 40 },
    }).setOrigin(0.5, 0).setDepth(10);

    // Continue hint
    this.add.text(width / 2, py + PANEL_H - 14, 'press any key or click to continue', {
      fontFamily: 'monospace', fontSize: '11px', color: '#6a637e',
    }).setOrigin(0.5, 1).setDepth(10);

    // Input — any key or pointer closes
    this.input.keyboard.once('keydown', () => this._close());
    this.input.once('pointerdown', () => this._close());
  }

  _close() {
    if (this._demoHandle) { this._demoHandle.stop(); this._demoHandle = null; }
    this.gs.tipOpen = false;
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
