// ComboCodexScene — per-hero combo command list with looping scripted demos.
//
// Launch modes:
//   Paused over GameScene (like UpgradeScene):
//     data = { gameScene, heroId? }
//   Standalone from menu (no live GameScene):
//     data = { heroId }   (falls back to first character)
//
// Layout (960×540):
//   Left panel  (~490px) — scrollable move list, one row per combo entry.
//   Right pane  (~420×300) — looping scripted demo of the selected row.
//
// The demo uses REAL texture keys (char_<id>, enemy_soldier) if they exist in
// the cache, otherwise falls back to the same stick-figure helpers from TipScene.
// Attack visuals are driven by the def's real numbers (arc, count, spread, radius)
// so the demo always reflects current tuning.
//
// Navigation: up/down arrows or click selects row; Esc/Backspace closes.

import Phaser from 'phaser';
import { WEAPONS } from '../data/weapons.js';
import { CHARACTERS as CHAR_LIST } from '../data/characters.js';
import { drawPanel } from '../art/ui.js';
import { Settings, keyLabel } from '../systems/Settings.js';

// ── Colour palette (matches TipScene) ─────────────────────────────────────────
const C_PLAYER  = 0x44ccff;
const C_ENEMY   = 0xff5544;
const C_GOLD    = 0xffd700;
const C_CYAN    = 0x00e5ff;
const C_ORANGE  = 0xff8800;
const C_RED     = 0xff2222;
const C_FIRE    = 0xff6a10;
const C_WALL    = 0x6a5f8a;
const C_PROJ    = 0xffcc44;
const C_BLADE   = 0xc8d0ff;

// ── Build the ordered move-list for one weapon def ─────────────────────────────
function buildMoveList(weaponId, binds) {
  const def = WEAPONS[weaponId];
  if (!def) return [];
  const P = keyLabel(binds.primary);
  const S = keyLabel(binds.secondary);
  const entries = [];

  // String steps S1-S4
  const stepInputs = [P, `${P},${P}`, `${P},${P},${P}`, `${P},${P},${P},${P}`];
  if (def.string) {
    def.string.forEach((step, i) => {
      entries.push({
        id: step.stepId,
        input: stepInputs[i] || `${P}×${i + 1}`,
        name: _stepName(step, i, def.id),
        desc: step.desc || '',
        kind: 'string',
        stepIndex: i,
        demoKind: step.kind,
        def: step,
      });
    });
  }

  // Charge finishers C2-C4
  const chargeDepths = [
    { key: 'C2', input: `${P},${S}`, chargeInput: `${P},hold-${P}` },
    { key: 'C3', input: `${P},${P},${S}`, chargeInput: `${P},${P},hold-${P}` },
    { key: 'C4', input: `${P},${P},${P},${S}`, chargeInput: `${P},${P},${P},hold-${P}` },
  ];
  if (def.chargeFinishers) {
    chargeDepths.forEach(({ key, input }) => {
      const cf = def.chargeFinishers[key];
      if (!cf) return;
      entries.push({
        id: key,
        input,
        name: cf.label || key,
        desc: cf.desc || '',
        kind: 'finisher',
        chargeKey: key,
        demoKind: cf.kind,
        launcher: !!cf.launcher,
        grandFinisher: !!cf.grandFinisher,
        def: cf,
      });
    });
  }

  // Hold-primary (charge finisher shorthand note)
  entries.push({
    id: 'hold_note',
    input: `hold ${P}`,
    name: 'Charge Attack',
    desc: `Hold ${P} to charge. Release mid-string for same finisher as ${S}. Max at 95%+ for +15% dmg.`,
    kind: 'note',
    demoKind: 'note',
    def: null,
  });

  return entries;
}

function _stepName(step, i, weaponId) {
  const names = {
    halberd_sweep:    ['Wide Sweep', 'Reverse Sweep', 'Forward Thrust', 'Full Spin'],
    matchlock_volley: ['Rail Shot', 'Double Shot', 'Burst Volley', 'Deep Piercer'],
    greek_fire:       ['Fire Pot', 'Double Lob', 'Triangle Scatter', 'Mega-Pot'],
    divine_arsenal:   ['Blade Burst', 'Dense Volley', 'Blade Eruption', 'Treasury Fusillade'],
    gladius:          ['Short Slash', 'Shield Drive', 'Legion Thrust', 'Formation Sweep'],
    sarissa:          ['Quick Jab', 'Power Thrust', 'Butt Sweep', 'Phalanx Charge'],
    composite_bow:    ['Swift Arrow', 'Twin Arrows', 'Arrow Fan', 'Deep Piercer'],
    axe_throw:        ['Axe Throw', 'Twin Axes', 'Berserker Spin', 'Berserker Hurl'],
  };
  const arr = names[weaponId] || [];
  return arr[i] || `S${i + 1}`;
}

// ── Stick-figure helpers (same API as TipScene) ───────────────────────────────
function makeActor(scene, x, y, color, opts = {}) {
  const g = scene.add.graphics().setDepth(opts.depth || 91);
  const s = opts.scale || 1;
  const bw = 10 * s, bh = 14 * s, hr = 5 * s;
  const baseColor = color;
  const draw = (c) => {
    g.clear();
    g.fillStyle(c, 1);
    g.fillRect(-bw / 2, -bh / 2, bw, bh);
    g.fillCircle(0, -bh / 2 - hr, hr);
  };
  draw(color);
  g.x = x; g.y = y;
  g.setTint = (c) => { draw(c); return g; };
  g.clearTint = () => { draw(baseColor); return g; };
  return g;
}

function makeSprite(scene, x, y, key, fallbackColor, scale = 1.5) {
  if (scene.textures.exists(key)) {
    // Real images keep their NATIVE setTint/clearTint. Overriding setTint to call
    // setTintFill recursed infinitely: Phaser's setTintFill internally calls
    // this.setTint, which was the override (stack overflow in live demos).
    return scene.add.image(x, y, key).setScale(scale).setDepth(91);
  }
  return makeActor(scene, x, y, fallbackColor);
}

function makeCircle(scene, x, y, r, color, alpha = 1, depth = 90) {
  const g = scene.add.graphics().setDepth(depth);
  const draw = (c) => { g.clear(); g.fillStyle(c, alpha).fillCircle(0, 0, r); };
  draw(color);
  g.x = x; g.y = y;
  g.setTint = (c) => { draw(c); return g; };
  g.clearTint = () => { draw(color); return g; };
  return g;
}

function makeLabel(scene, x, y, text, color = '#e8e2ff', size = '11px', depth = 95) {
  return scene.add.text(x, y, text, {
    fontFamily: 'monospace', fontSize: size, color,
    stroke: '#000000', strokeThickness: 2,
  }).setOrigin(0.5).setDepth(depth);
}

function makeWall(scene, x, y, w, h) {
  const g = scene.add.graphics().setDepth(89);
  g.fillStyle(C_WALL, 0.9).fillRect(-w / 2, -h / 2, w, h);
  g.lineStyle(1, 0xc0b8e0, 0.5).strokeRect(-w / 2, -h / 2, w, h);
  g.x = x; g.y = y;
  return g;
}

function cleanObjs(scene, objs) {
  for (const o of objs) { if (o && o.destroy) o.destroy(); }
  objs.length = 0;
}

// ── Floating caption effect ("LAUNCHED!", "WALL CRUNCH", "BURN") ──────────────
function floatCaption(scene, x, y, text, color = '#ffffff', objs) {
  const lbl = makeLabel(scene, x, y, text, color, '11px', 96);
  lbl.setAlpha(1);
  objs.push(lbl);
  scene.tweens.add({
    targets: lbl, y: y - 20, alpha: 0, duration: 700, ease: 'Quad.easeOut',
    onComplete: () => {
      lbl.destroy();
      const idx = objs.indexOf(lbl); if (idx >= 0) objs.splice(idx, 1);
    },
  });
}

// ── Apply tumble effect (1.25× scale pop + shadow + pale tint) ───────────────
function applyTumble(scene, enemy, cx, cy, objs, label = 'LAUNCHED!', onDone) {
  const shadow = scene.add.graphics().setDepth(88);
  objs.push(shadow);
  scene.tweens.add({
    targets: enemy, scaleX: 1.25, scaleY: 1.25, duration: 80, ease: 'Quad.easeOut',
    onComplete: () => {
      enemy.setTint(0xffeedd);
      shadow.clear().fillStyle(0x000000, 0.35).fillEllipse(enemy.x, cy + 18, 26, 8);
      floatCaption(scene, enemy.x, enemy.y - 20, label, '#00e5ff', objs);
      scene.tweens.add({
        targets: enemy, y: cy - 22, duration: 300, ease: 'Quad.easeOut',
        onUpdate: () => { shadow.clear().fillStyle(0x000000, 0.25).fillEllipse(enemy.x, cy + 18, 26, 8); },
        onComplete: () => {
          scene.tweens.add({
            targets: enemy, y: cy, scaleX: 1, scaleY: 1, duration: 350, ease: 'Bounce.easeOut',
            onUpdate: () => { shadow.clear().fillStyle(0x000000, 0.3).fillEllipse(enemy.x, cy + 18, 26, 8); },
            onComplete: () => {
              shadow.clear(); enemy.clearTint();
              if (onDone) onDone();
            },
          });
        },
      });
    },
  });
}

// Apply knockback + wall crunch effect
function applyKnockback(scene, enemy, wallX, cy, objs, onDone) {
  scene.tweens.add({
    targets: enemy, x: wallX - 14, duration: 260, ease: 'Quad.easeOut',
    onComplete: () => {
      // dust particles
      for (let k = 0; k < 4; k++) {
        const dust = scene.add.graphics().setDepth(93);
        dust.fillStyle(0xd0c8b8, 0.7).fillCircle(0, 0, 3 + k);
        dust.x = wallX - 14; dust.y = cy + Phaser.Math.Between(-12, 12);
        objs.push(dust);
        scene.tweens.add({
          targets: dust, x: dust.x - Phaser.Math.Between(8, 20), y: dust.y - Phaser.Math.Between(4, 14),
          alpha: 0, duration: 350,
          onComplete: () => { dust.destroy(); const i = objs.indexOf(dust); if (i >= 0) objs.splice(i, 1); },
        });
      }
      floatCaption(scene, wallX - 14, cy - 20, 'WALL CRUNCH', '#d0c8b8', objs);
      if (onDone) scene.time.delayedCall(400, onDone);
    },
  });
}

// Apply burn pool
function applyBurn(scene, x, y, radius, objs, caption = 'BURN') {
  const pool = scene.add.graphics().setDepth(87);
  pool.fillStyle(C_FIRE, 0.4).fillCircle(0, 0, radius);
  pool.lineStyle(1.5, 0xff3300, 0.6).strokeCircle(0, 0, radius);
  pool.x = x; pool.y = y;
  objs.push(pool);
  floatCaption(scene, x, y - radius - 4, caption, '#ff8a30', objs);
  return pool;
}

// ── Demo builders, one per combo kind ─────────────────────────────────────────

function demoMeleeArc(scene, entry, area, heroId) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2 + 10;
  const objs = [];
  let stopped = false;
  const def = entry.def;

  const player = makeSprite(scene, cx - 80, cy, `char_${heroId}`, C_PLAYER);
  objs.push(player);

  // 2-3 dummy enemies
  const exs = [cx + 30, cx + 60, cx + 90];
  const enemies = exs.map((ex) => {
    const e = makeSprite(scene, ex, cy, 'enemy_soldier', C_ENEMY, 1.2);
    objs.push(e); return e;
  });

  const arcRad = ((def.arcOverride || 200) / 180) * Math.PI;
  const radius = (def.radiusMult || 1) * 80;
  const launcher = entry.launcher || (def.launcher);
  const grandFinisher = entry.grandFinisher || (def.grandFinisher);
  const knockback = def.knockbackOverride || 14;

  // wall on the right for knockback demos
  let wall = null;
  if (knockback >= 28 || grandFinisher) {
    wall = makeWall(scene, cx + 130, cy, 14, 52);
    objs.push(wall);
  }

  function loop() {
    if (stopped) return;
    enemies.forEach((e, i) => { e.x = exs[i]; e.y = cy; e.alpha = 1; e.setScale(1.2); e.clearTint(); });
    player.x = cx - 80; player.alpha = 1; player.setScale(1.5);

    // anticipation lean
    scene.tweens.add({ targets: player, x: player.x - 4, duration: 80, yoyo: true });

    scene.time.delayedCall(180, () => {
      if (stopped) return;

      // draw arc flash
      const arcG = scene.add.graphics().setDepth(92);
      objs.push(arcG);
      arcG.fillStyle(C_GOLD, 0.22).slice(cx - 70, cy, radius, 0, arcRad, false);
      arcG.lineStyle(2, C_GOLD, 0.7).arc(cx - 70, cy, radius, 0, arcRad, false);
      arcG.strokePath();

      scene.tweens.add({
        targets: arcG, alpha: 0, duration: 300,
        onComplete: () => { arcG.destroy(); const i = objs.indexOf(arcG); if (i >= 0) objs.splice(i, 1); },
      });

      // lunge
      scene.tweens.add({ targets: player, x: player.x + 10, duration: 70, yoyo: true });

      // React enemies in arc range
      const hitEnemies = enemies.filter((e) => e.x < cx - 70 + radius + 10);
      hitEnemies.forEach((e) => {
        if (launcher) {
          applyTumble(scene, e, e.x, cy, objs, 'LAUNCHED!', null);
        } else if (knockback >= 28 && wall) {
          applyKnockback(scene, e, wall.x, cy, objs, null);
        } else {
          // simple flinch
          scene.tweens.add({ targets: e, x: e.x + knockback * 0.4, alpha: 0.6, duration: 150, yoyo: true });
        }
      });

      scene.time.delayedCall(1200, () => { if (!stopped) loop(); });
    });
  }
  loop();
  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoLineThrust(scene, entry, area, heroId) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2 + 10;
  const objs = [];
  let stopped = false;
  const def = entry.def;

  const player = makeSprite(scene, cx - 90, cy, `char_${heroId}`, C_PLAYER);
  objs.push(player);

  const eX = [cx + 20, cx + 55, cx + 90];
  const enemies = eX.map((ex) => {
    const e = makeSprite(scene, ex, cy, 'enemy_soldier', C_ENEMY, 1.2);
    objs.push(e); return e;
  });

  const length = (def.lengthMult || 1) * 130;
  const width = (def.widthMult || 1) * 40;
  const launcher = entry.launcher || def.launcher;
  const knockback = def.knockbackOverride || 12;

  const wall = makeWall(scene, cx + 140, cy, 14, 52);
  objs.push(wall);

  function loop() {
    if (stopped) return;
    enemies.forEach((e, i) => { e.x = eX[i]; e.y = cy; e.alpha = 1; e.setScale(1.2); e.clearTint(); });
    player.x = cx - 90; player.alpha = 1;

    scene.tweens.add({ targets: player, x: player.x - 5, duration: 60, yoyo: true });
    scene.time.delayedCall(160, () => {
      if (stopped) return;

      // thrust line flash
      const lineG = scene.add.graphics().setDepth(92);
      objs.push(lineG);
      lineG.fillStyle(C_CYAN, 0.18).fillRect(cx - 80, cy - width / 2, length, width);
      lineG.lineStyle(1.5, C_CYAN, 0.6).strokeRect(cx - 80, cy - width / 2, length, width);
      scene.tweens.add({
        targets: lineG, alpha: 0, duration: 280,
        onComplete: () => { lineG.destroy(); const i = objs.indexOf(lineG); if (i >= 0) objs.splice(i, 1); },
      });

      // lunge player forward
      scene.tweens.add({ targets: player, x: player.x + 14, duration: 90, yoyo: true });

      enemies.forEach((e) => {
        if (e.x < cx - 80 + length + 10) {
          if (launcher) {
            applyTumble(scene, e, e.x, cy, objs, 'LAUNCHED!', null);
          } else {
            applyKnockback(scene, e, wall.x, cy, objs, null);
          }
        }
      });

      scene.time.delayedCall(1200, () => { if (!stopped) loop(); });
    });
  }
  loop();
  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoProjectile(scene, entry, area, heroId) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2 + 10;
  const objs = [];
  let stopped = false;
  const def = entry.def;

  const player = makeSprite(scene, cx - 100, cy, `char_${heroId}`, C_PLAYER);
  objs.push(player);

  const eX = [cx + 50, cx + 90];
  const enemies = eX.map((ex) => {
    const e = makeSprite(scene, ex, cy, 'enemy_soldier', C_ENEMY, 1.2);
    objs.push(e); return e;
  });

  const count = 1 + (def.countAdd || 0);
  const spread = def.spreadOverride || 0;
  const launcher = entry.launcher || def.launcher;
  const pierce = (def.pierceMod || 0) > 0;

  // Use weapon-specific proj textures if available; fallback to circles.
  const projKey = scene.textures.exists(`proj_${heroId}`) ? `proj_${heroId}` : null;

  function spawnProj(sx, sy, angle, idx) {
    const cosA = Math.cos(angle), sinA = Math.sin(angle);
    let proj;
    if (projKey) {
      proj = scene.add.image(sx, sy, projKey).setScale(0.8).setDepth(92).setRotation(angle);
    } else {
      proj = makeCircle(scene, sx, sy, 4, C_PROJ, 0.9, 92);
    }
    objs.push(proj);

    scene.tweens.add({
      targets: proj, x: proj.x + cosA * 220, y: proj.y + sinA * 220, duration: 350, ease: 'Linear',
      onUpdate: () => {
        // Hit first enemy in path
        enemies.forEach((e) => {
          if (e.alpha > 0.5 && Math.abs(e.x - proj.x) < 14 && Math.abs(e.y - proj.y) < 16) {
            if (launcher) {
              applyTumble(scene, e, e.x, cy, objs, 'LAUNCHED!', null);
            } else {
              e.alpha = 0.5;
              scene.tweens.add({ targets: e, alpha: 1, duration: 200 });
            }
            if (pierce) {
              floatCaption(scene, e.x, e.y - 18, 'PIERCE', '#aaffff', objs);
            }
          }
        });
      },
      onComplete: () => {
        proj.destroy(); const i = objs.indexOf(proj); if (i >= 0) objs.splice(i, 1);
      },
    });
  }

  function loop() {
    if (stopped) return;
    enemies.forEach((e, i) => { e.x = eX[i]; e.y = cy; e.alpha = 1; e.setScale(1.2); e.clearTint(); });
    player.x = cx - 100; player.alpha = 1;

    scene.tweens.add({ targets: player, x: player.x - 5, duration: 40, yoyo: true });
    scene.time.delayedCall(180, () => {
      if (stopped) return;
      scene.tweens.add({ targets: player, x: player.x + 8, duration: 60, yoyo: true });
      const baseAngle = 0;
      if (count === 1) {
        spawnProj(player.x + 8, player.y, baseAngle, 0);
      } else {
        const halfSpread = Phaser.Math.DegToRad(spread / 2);
        for (let j = 0; j < count; j++) {
          const angle = count > 1 ? baseAngle - halfSpread + (halfSpread * 2 * j / (count - 1)) : baseAngle;
          const delay = (def.burstDelay || 0) * j;
          scene.time.delayedCall(delay, () => {
            if (!stopped) spawnProj(player.x + 8, player.y, angle, j);
          });
        }
      }
      scene.time.delayedCall(1100, () => { if (!stopped) loop(); });
    });
  }
  loop();
  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoProjectileRadial(scene, entry, area, heroId) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2 + 10;
  const objs = [];
  let stopped = false;
  const def = entry.def;

  const player = makeSprite(scene, cx, cy, `char_${heroId}`, C_PLAYER);
  objs.push(player);

  const count = Math.min(12, 4 + (def.countAdd || 0));
  const launcher = entry.launcher || def.launcher;

  const enemyAngles = [0.2, -0.2, 0.8, -0.8, 1.4];
  const eRadius = 60;
  const enemies = enemyAngles.map((a) => {
    const ex = cx + Math.cos(a) * eRadius;
    const ey = cy + Math.sin(a) * eRadius;
    const e = makeSprite(scene, ex, ey, 'enemy_soldier', C_ENEMY, 1.0);
    objs.push(e); return e;
  });

  const projKey = scene.textures.exists(`proj_${heroId}`) ? `proj_${heroId}` : null;

  function loop() {
    if (stopped) return;
    enemies.forEach((e, i) => {
      e.x = cx + Math.cos(enemyAngles[i]) * eRadius;
      e.y = cy + Math.sin(enemyAngles[i]) * eRadius;
      e.alpha = 1; e.setScale(1.0); e.clearTint();
    });
    player.x = cx; player.alpha = 1;

    // pulse expand
    scene.tweens.add({ targets: player, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true });

    scene.time.delayedCall(100, () => {
      if (stopped) return;
      for (let j = 0; j < count; j++) {
        const angle = (j / count) * Math.PI * 2;
        const cosA = Math.cos(angle), sinA = Math.sin(angle);
        let proj;
        if (projKey) {
          proj = scene.add.image(cx, cy, projKey).setScale(0.8).setDepth(92).setRotation(angle);
        } else {
          const g = scene.add.graphics().setDepth(92);
          g.fillStyle(C_BLADE, 0.9).fillRect(-6, -2, 12, 4);
          g.x = cx; g.y = cy;
          g.rotation = angle;
          proj = g;
        }
        objs.push(proj);
        scene.tweens.add({
          targets: proj, x: cx + cosA * 130, y: cy + sinA * 130, duration: 320, ease: 'Quad.easeOut',
          onUpdate: () => {
            enemies.forEach((e) => {
              if (e.alpha > 0.5 && Math.hypot(e.x - proj.x, e.y - proj.y) < 14) {
                if (launcher) {
                  applyTumble(scene, e, e.x, e.y, objs, 'LAUNCHED!', null);
                } else {
                  scene.tweens.add({ targets: e, alpha: 0.5, duration: 120, yoyo: true });
                }
              }
            });
          },
          onComplete: () => {
            proj.destroy(); const i = objs.indexOf(proj); if (i >= 0) objs.splice(i, 1);
          },
        });
      }
      scene.time.delayedCall(1300, () => { if (!stopped) loop(); });
    });
  }
  loop();
  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoLobAoe(scene, entry, area, heroId) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2 + 10;
  const objs = [];
  let stopped = false;
  const def = entry.def;

  const player = makeSprite(scene, cx - 90, cy, `char_${heroId}`, C_PLAYER);
  objs.push(player);

  const count = 1 + (def.countAdd || 0);
  const radius = (def.radiusMult || 1) * 60;
  const launcher = entry.launcher || def.launcher;

  const eX = [cx + 40, cx + 80];
  const enemies = eX.map((ex) => {
    const e = makeSprite(scene, ex, cy, 'enemy_soldier', C_ENEMY, 1.2);
    objs.push(e); return e;
  });

  // Triangle or linear spread
  const isTriangle = entry.demoKind === 'lob_triangle';
  function getLobTargets(baseX, baseY) {
    if (isTriangle) {
      return [
        { x: baseX + 50, y: baseY },
        { x: baseX + 30, y: baseY - 30 },
        { x: baseX + 30, y: baseY + 30 },
      ];
    }
    const targets = [];
    for (let j = 0; j < Math.min(count, 4); j++) {
      targets.push({ x: baseX + 35 + j * 25, y: baseY + (j % 2 === 0 ? -10 : 10) });
    }
    return targets;
  }

  function spawnPot(sx, sy, tx, ty, onLand) {
    const potKey = `proj_${heroId}`;
    const pot = scene.textures.exists(potKey)
      ? scene.add.image(sx, sy, potKey).setScale(0.9).setDepth(92)
      : makeCircle(scene, sx, sy, 6, C_FIRE, 0.9, 92);
    objs.push(pot);

    // shadow under arc
    const shadow = makeCircle(scene, sx, sy + 24, 5, 0x000000, 0.3, 88);
    objs.push(shadow);

    // arc tween
    const midY = Math.min(sy, ty) - 40;
    scene.tweens.add({
      targets: pot, x: tx, y: ty, duration: 420, ease: 'Linear',
      onUpdate: (tw) => {
        const t = tw.progress;
        const arcY = sy + (ty - sy) * t - 4 * 40 * t * (1 - t);
        pot.y = arcY;
        shadow.x = pot.x; shadow.y = ty + 14;
        shadow.alpha = 0.3 * t;
      },
      onComplete: () => {
        shadow.destroy(); const si = objs.indexOf(shadow); if (si >= 0) objs.splice(si, 1);
        pot.destroy(); const pi = objs.indexOf(pot); if (pi >= 0) objs.splice(pi, 1);
        if (onLand) onLand(tx, ty);
      },
    });
  }

  function loop() {
    if (stopped) return;
    enemies.forEach((e, i) => { e.x = eX[i]; e.y = cy; e.alpha = 1; e.setScale(1.2); e.clearTint(); });
    player.x = cx - 90; player.alpha = 1;

    scene.tweens.add({ targets: player, x: player.x + 4, scaleY: 0.9, duration: 80, yoyo: true });

    scene.time.delayedCall(160, () => {
      if (stopped) return;
      const targets = getLobTargets(cx - 70, cy);
      let landsLeft = targets.length;
      const burnPools = [];

      targets.forEach((t, idx) => {
        scene.time.delayedCall(idx * 80, () => {
          if (stopped) return;
          spawnPot(player.x + 5, player.y - 8, t.x, t.y, (lx, ly) => {
            const pool = applyBurn(scene, lx, ly, radius * 0.6, objs, 'BURN');
            burnPools.push(pool);
            // hit nearby enemies
            enemies.forEach((e) => {
              if (Math.hypot(e.x - lx, e.y - ly) < radius * 0.7) {
                if (launcher) {
                  applyTumble(scene, e, e.x, cy, objs, 'LAUNCHED!', null);
                } else {
                  scene.tweens.add({ targets: e, tint: 0xff5500, duration: 200, yoyo: true });
                }
              }
            });
            landsLeft--;
            if (landsLeft <= 0) {
              scene.time.delayedCall(800, () => {
                burnPools.forEach((p) => {
                  scene.tweens.add({ targets: p, alpha: 0, duration: 400, onComplete: () => {
                    p.destroy(); const i = objs.indexOf(p); if (i >= 0) objs.splice(i, 1);
                  }});
                });
                scene.time.delayedCall(500, () => { if (!stopped) loop(); });
              });
            }
          });
        });
      });
    });
  }
  loop();
  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoBoomerang(scene, entry, area, heroId) {
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2 + 10;
  const objs = [];
  let stopped = false;
  const def = entry.def;

  const player = makeSprite(scene, cx - 90, cy, `char_${heroId}`, C_PLAYER);
  objs.push(player);

  const count = 1 + (def.countAdd || 0);
  const launcher = entry.launcher || def.launcher;
  const knockback = def.knockbackOverride || 0;

  const eX = [cx + 40, cx + 80];
  const enemies = eX.map((ex) => {
    const e = makeSprite(scene, ex, cy, 'enemy_soldier', C_ENEMY, 1.2);
    objs.push(e); return e;
  });

  // range multiplier for berserker hurl
  const rangeMult = 1 + (def.rangeMultAdd || 0);
  const maxRange = 170 * rangeMult;

  function throwAxe(startX, startY, spreadY, idx, onReturn) {
    const axeKey = `proj_${heroId}`;
    const axe = scene.textures.exists(axeKey)
      ? scene.add.image(startX, startY, axeKey).setScale(0.9).setDepth(92)
      : makeCircle(scene, startX, startY, 5, C_BLADE, 0.9, 92);
    objs.push(axe);

    let hitOnOut = false;
    // outbound
    scene.tweens.add({
      targets: axe, x: startX + maxRange, y: startY + spreadY, duration: 350, ease: 'Linear',
      onUpdate: (tw) => {
        axe.rotation = tw.progress * Math.PI * 4;
        enemies.forEach((e) => {
          if (!hitOnOut && e.alpha > 0.5 && Math.hypot(e.x - axe.x, e.y - axe.y) < 16) {
            hitOnOut = true;
            if (launcher) {
              applyTumble(scene, e, e.x, cy, objs, 'LAUNCHED!', null);
            } else if (knockback >= 30) {
              scene.tweens.add({ targets: e, x: e.x + 30, duration: 200, yoyo: true });
              floatCaption(scene, e.x, e.y - 18, 'KNOCKBACK', '#ffcc88', objs);
            } else {
              scene.tweens.add({ targets: e, alpha: 0.5, duration: 120, yoyo: true });
            }
          }
        });
      },
      onComplete: () => {
        // return arc
        let hitOnReturn = false;
        scene.tweens.add({
          targets: axe, x: startX - 10, y: startY, duration: 380, ease: 'Quad.easeIn',
          onUpdate: (tw) => {
            axe.rotation = tw.progress * Math.PI * 4;
            enemies.forEach((e) => {
              if (!hitOnReturn && e.alpha > 0.7 && Math.hypot(e.x - axe.x, e.y - axe.y) < 16) {
                hitOnReturn = true;
                floatCaption(scene, e.x, e.y - 18, 'RETURN HIT', '#aaffff', objs);
                scene.tweens.add({ targets: e, alpha: 0.5, duration: 120, yoyo: true });
              }
            });
          },
          onComplete: () => {
            axe.destroy(); const i = objs.indexOf(axe); if (i >= 0) objs.splice(i, 1);
            if (onReturn) onReturn();
          },
        });
      },
    });
  }

  function loop() {
    if (stopped) return;
    enemies.forEach((e, i) => { e.x = eX[i]; e.y = cy; e.alpha = 1; e.setScale(1.2); e.clearTint(); });
    player.x = cx - 90; player.alpha = 1;

    scene.tweens.add({ targets: player, x: player.x - 4, duration: 60, yoyo: true });
    scene.time.delayedCall(140, () => {
      if (stopped) return;
      let done = 0;
      for (let j = 0; j < Math.min(count, 3); j++) {
        const spreadY = (j - Math.floor(count / 2)) * 14;
        scene.time.delayedCall(j * 90, () => {
          if (stopped) return;
          throwAxe(player.x + 8, player.y, spreadY, j, () => {
            done++;
            if (done >= Math.min(count, 3) && !stopped) scene.time.delayedCall(400, loop);
          });
        });
      }
    });
  }
  loop();
  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

function demoNote(scene, entry, area, heroId) {
  // For the hold/charge note, show a charge ring filling up then releasing
  const cx = area.x + area.w / 2;
  const cy = area.y + area.h / 2 + 10;
  const objs = [];
  let stopped = false;

  const player = makeSprite(scene, cx - 30, cy, `char_${heroId}`, C_PLAYER);
  objs.push(player);

  const ringG = scene.add.graphics().setDepth(92);
  objs.push(ringG);
  const label = makeLabel(scene, cx - 30, cy - 40, 'HEAVY!', '#ffd700', '12px', 95);
  label.setAlpha(0); objs.push(label);

  function drawRing(pct) {
    ringG.clear();
    ringG.lineStyle(3, C_GOLD, 0.4 + pct * 0.6);
    ringG.beginPath();
    ringG.arc(cx - 30, cy, 22, -Math.PI / 2, -Math.PI / 2 + pct * Math.PI * 2, false);
    ringG.strokePath();
    if (pct >= 0.95) {
      ringG.lineStyle(2, 0xffffff, 0.45);
      ringG.strokeCircle(cx - 30, cy, 24);
    }
  }
  drawRing(0);

  function loop() {
    if (stopped) return;
    label.setAlpha(0);
    drawRing(0);

    scene.tweens.add({
      targets: { v: 0 }, v: 1, duration: 800, ease: 'Linear',
      onUpdate: (tw) => { drawRing(tw.targets[0].v); },
      onComplete: () => {
        if (stopped) return;
        ringG.clear();
        label.setAlpha(1);
        scene.tweens.add({ targets: label, alpha: 0, duration: 350, delay: 500 });
        const flash = makeCircle(scene, cx - 30, cy, 10, C_GOLD, 0.9, 92);
        objs.push(flash);
        scene.tweens.add({
          targets: flash, x: cx + 90, alpha: 0, duration: 360, ease: 'Quad.easeOut',
          onComplete: () => { flash.destroy(); const i = objs.indexOf(flash); if (i >= 0) objs.splice(i, 1); },
        });
        scene.time.delayedCall(1100, () => { if (!stopped) loop(); });
      },
    });
  }
  loop();
  return { stop() { stopped = true; cleanObjs(scene, objs); } };
}

// ── Demo dispatcher ────────────────────────────────────────────────────────────
function runDemo(scene, entry, area, heroId) {
  const kind = entry.demoKind;
  if (!entry.def && kind === 'note') return demoNote(scene, entry, area, heroId);
  if (!entry.def) return demoNote(scene, entry, area, heroId);

  switch (kind) {
    case 'melee_arc':         return demoMeleeArc(scene, entry, area, heroId);
    case 'line_thrust':       return demoLineThrust(scene, entry, area, heroId);
    case 'projectile_aimed':
    case 'burst_line_volley': return demoProjectile(scene, entry, area, heroId);
    case 'projectile_radial': return demoProjectileRadial(scene, entry, area, heroId);
    case 'lob_aoe':
    case 'lob_triangle':      return demoLobAoe(scene, entry, area, heroId);
    case 'boomerang':         return demoBoomerang(scene, entry, area, heroId);
    case 'kings_fusillade':   return demoProjectile(scene, entry, area, heroId); // treated as projectile
    default:                  return demoNote(scene, entry, area, heroId);
  }
}

// ── ComboCodexScene ────────────────────────────────────────────────────────────

export default class ComboCodexScene extends Phaser.Scene {
  constructor() {
    super('ComboCodexScene');
  }

  init(data) {
    this._gs = data.gameScene || null;
    // Determine hero: prefer explicit heroId from data, then live gameScene's character,
    // then last used (registry), then default to first char.
    let heroId = data.heroId || null;
    if (!heroId && this._gs && this._gs.characterDef) heroId = this._gs.characterDef.id;
    if (!heroId) heroId = this.registry.get('lastHeroId') || CHAR_LIST[0].id;
    this._heroId = heroId;
    this.registry.set('lastHeroId', heroId);

    this._selectedRow = 0;
    this._demoHandle = null;
    this._rowObjs = [];
    this._pageObjs = [];
  }

  create() {
    const W = 960, H = 540;

    // Background overlay
    this.add.rectangle(0, 0, W, H, 0x05040a, 0.96).setOrigin(0);

    const char = CHAR_LIST.find((c) => c.id === this._heroId) || CHAR_LIST[0];
    const weaponId = char.startingWeapon;
    const weaponDef = WEAPONS[weaponId];
    const binds = Settings.binds;

    this._entries = buildMoveList(weaponId, binds);

    // ── Layout constants ──────────────────────────────────────────────────────
    const PANEL_X = 20, PANEL_Y = 14;
    const PANEL_W = W - 40, PANEL_H = H - 28;
    const SPLIT_X = 490; // left/right divider
    const LEFT_W = SPLIT_X - PANEL_X - 10;
    const RIGHT_X = PANEL_X + SPLIT_X - PANEL_X + 14;
    const RIGHT_W = PANEL_W - (SPLIT_X - PANEL_X) - 18;

    // Draw main panel
    const bg = this.add.graphics();
    drawPanel(bg, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, 0xffd700, { fill: 0x0c0b18, alpha: 0.98, radius: 10, header: 30 });

    // Header
    const heroName = char.name;
    const weaponName = weaponDef ? weaponDef.name : weaponId;
    this.add.text(W / 2, PANEL_Y + 16, `COMBO CODEX  —  ${heroName.toUpperCase()}  ·  ${weaponName.toUpperCase()}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5).setDepth(5);

    // ── Left column header ─────────────────────────────────────────────────────
    const LX = PANEL_X + 14;
    const LY_TOP = PANEL_Y + 36;
    this.add.text(LX, LY_TOP, 'INPUT', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7d7896', fontStyle: 'bold',
    }).setDepth(5);
    this.add.text(LX + 100, LY_TOP, 'MOVE', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7d7896', fontStyle: 'bold',
    }).setDepth(5);
    this.add.text(LX + 220, LY_TOP, 'EFFECT', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7d7896', fontStyle: 'bold',
    }).setDepth(5);

    // separator line
    this.add.graphics().lineStyle(1, 0xffd700, 0.2)
      .lineBetween(LX, LY_TOP + 11, LX + LEFT_W - 4, LY_TOP + 11).setDepth(4);

    // vertical divider
    this.add.graphics().lineStyle(1, 0xffd700, 0.2)
      .lineBetween(PANEL_X + SPLIT_X - PANEL_X - 4, PANEL_Y + 36, PANEL_X + SPLIT_X - PANEL_X - 4, PANEL_Y + PANEL_H - 30).setDepth(4);

    // ── Render move rows ───────────────────────────────────────────────────────
    this._ROW_H = 29;
    this._ROW_Y0 = LY_TOP + 15;
    this._buildRows();

    // ── Right pane: demo area ──────────────────────────────────────────────────
    const DEMO_X = RIGHT_X;
    const DEMO_Y = PANEL_Y + 36;
    const DEMO_W = RIGHT_W;
    const DEMO_H = 280;

    const demoBack = this.add.graphics().setDepth(3);
    demoBack.fillStyle(0x080715, 0.97).fillRect(DEMO_X, DEMO_Y, DEMO_W, DEMO_H);
    demoBack.lineStyle(1, 0xffd700, 0.18).strokeRect(DEMO_X, DEMO_Y, DEMO_W, DEMO_H);

    this._demoArea = { x: DEMO_X, y: DEMO_Y, w: DEMO_W, h: DEMO_H };

    // Demo mask
    const maskG = this.make.graphics({ add: false });
    maskG.fillStyle(0xffffff).fillRect(DEMO_X, DEMO_Y, DEMO_W, DEMO_H);
    this._demoMask = maskG.createGeometryMask();

    // Move name + effect caption area (below demo viewport)
    this._moveNameText = this.add.text(DEMO_X + DEMO_W / 2, DEMO_Y + DEMO_H + 8, '', {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(5);
    this._moveDescText = this.add.text(DEMO_X + DEMO_W / 2, DEMO_Y + DEMO_H + 24, '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#c9c4e0',
      align: 'center', wordWrap: { width: DEMO_W - 10 },
    }).setOrigin(0.5, 0).setDepth(5);

    // ── Close button / hint ────────────────────────────────────────────────────
    this.add.text(W / 2, PANEL_Y + PANEL_H - 14, 'Esc / Backspace = close  ·  ↑↓ or click row to select', {
      fontFamily: 'monospace', fontSize: '10px', color: '#6a637e',
    }).setOrigin(0.5, 1).setDepth(5);

    // ── Keyboard navigation ────────────────────────────────────────────────────
    this.input.keyboard.on('keydown-UP',        () => this._selectRow(this._selectedRow - 1));
    this.input.keyboard.on('keydown-DOWN',      () => this._selectRow(this._selectedRow + 1));
    this.input.keyboard.on('keydown-W',         () => this._selectRow(this._selectedRow - 1));
    this.input.keyboard.on('keydown-S',         () => this._selectRow(this._selectedRow + 1));
    this.input.keyboard.on('keydown-ESC',       () => this._close());
    this.input.keyboard.on('keydown-BACKSPACE',  () => this._close());
    this.input.keyboard.on('keydown-DELETE',    () => this._close());

    // Initial selection
    this._selectRow(0, true);
  }

  _buildRows() {
    // Destroy previous row objects
    for (const o of this._rowObjs) if (o && o.destroy) o.destroy();
    this._rowObjs = [];

    const LX = 34;
    const ROW_H = this._ROW_H;
    const ROW_Y0 = this._ROW_Y0;
    const entries = this._entries;

    entries.forEach((entry, idx) => {
      const rowY = ROW_Y0 + idx * ROW_H;

      // Row highlight rect (initially invisible, shown on selection)
      const highlight = this.add.graphics().setDepth(4);
      highlight.fillStyle(0x1e1840, 0);
      highlight.fillRect(LX - 4, rowY - 2, 440, ROW_H - 2);
      this._rowObjs.push(highlight);
      entry._highlightGraphic = highlight;

      // Color by kind
      const kindColor = entry.kind === 'note' ? '#6a637e'
        : entry.kind === 'finisher' ? (entry.grandFinisher ? '#ff5555' : entry.launcher ? '#00ccff' : '#ff8800')
        : '#aae8ff';

      // Input glyph (monospace, truncated if needed)
      const inputText = entry.input.length > 16 ? entry.input.slice(0, 15) + '…' : entry.input;
      const iT = this.add.text(LX, rowY + 5, inputText, {
        fontFamily: 'monospace', fontSize: '10px', color: kindColor, fontStyle: 'bold',
      }).setDepth(5);
      this._rowObjs.push(iT);

      // Move name
      const nT = this.add.text(LX + 100, rowY + 5, entry.name, {
        fontFamily: 'monospace', fontSize: '10px', color: '#e8e4f8', fontStyle: 'bold',
      }).setDepth(5);
      this._rowObjs.push(nT);

      // Short desc (truncated to ~35 chars for the narrow col)
      const shortDesc = entry.desc.length > 38 ? entry.desc.slice(0, 37) + '…' : entry.desc;
      const dT = this.add.text(LX + 220, rowY + 5, shortDesc, {
        fontFamily: 'monospace', fontSize: '9px', color: '#9990c0',
      }).setDepth(5);
      this._rowObjs.push(dT);

      // Interactive zone
      const zone = this.add.zone(LX - 4, rowY - 2, 444, ROW_H - 2).setOrigin(0, 0).setInteractive({ useHandCursor: true });
      zone.on('pointerover', () => { if (this._selectedRow !== idx) { highlight.clear(); highlight.fillStyle(0x16122a, 1).fillRect(LX - 4, rowY - 2, 440, ROW_H - 2); } });
      zone.on('pointerout',  () => { if (this._selectedRow !== idx) { highlight.clear(); } });
      zone.on('pointerdown', () => this._selectRow(idx));
      this._rowObjs.push(zone);
    });
  }

  _selectRow(idx, force = false) {
    const entries = this._entries;
    if (!entries || entries.length === 0) return;
    idx = Phaser.Math.Clamp(idx, 0, entries.length - 1);
    if (idx === this._selectedRow && !force) return;

    // Clear previous highlight
    const prev = entries[this._selectedRow];
    if (prev && prev._highlightGraphic) {
      prev._highlightGraphic.clear();
    }

    this._selectedRow = idx;
    const entry = entries[idx];

    // Draw new highlight
    if (entry && entry._highlightGraphic) {
      const rowY = this._ROW_Y0 + idx * this._ROW_H;
      entry._highlightGraphic.clear();
      entry._highlightGraphic.fillStyle(0x1e1840, 1)
        .fillRect(34 - 4, rowY - 2, 440, this._ROW_H - 2);
      // left accent bar
      entry._highlightGraphic.fillStyle(0xffd700, 0.9)
        .fillRect(34 - 5, rowY - 2, 3, this._ROW_H - 2);
    }

    // Update name/desc texts
    const nameColor = entry.kind === 'finisher'
      ? (entry.grandFinisher ? '#ff5555' : entry.launcher ? '#00ccff' : '#ff8800')
      : '#ffd700';
    if (this._moveNameText) this._moveNameText.setText(entry.name).setColor(nameColor);
    if (this._moveDescText) this._moveDescText.setText(entry.desc);

    // Stop previous demo
    if (this._demoHandle) {
      this._demoHandle.stop();
      this._demoHandle = null;
    }

    // Start new demo
    if (this._demoArea) {
      this._demoHandle = runDemo(this, entry, this._demoArea, this._heroId);
    }
  }

  _close() {
    if (this._demoHandle) { this._demoHandle.stop(); this._demoHandle = null; }
    if (this._gs) {
      // Launched over a paused GameScene — resume it
      this.scene.stop();
      this.scene.resume('GameScene');
    } else {
      // Standalone from menu — go back to menu
      this.scene.start('MenuScene');
    }
  }

  shutdown() {
    if (this._demoHandle) { this._demoHandle.stop(); this._demoHandle = null; }
  }
}
