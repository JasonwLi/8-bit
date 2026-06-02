// Procedural placeholder art. Everything is drawn from chunky rectangles into a
// Phaser.Graphics, then baked into a texture with generateTexture(). When real
// spritesheets arrive, swap these keys in BootScene for loaded images — nothing
// in the gameplay code changes because it only references texture keys.
import { CHARACTERS } from '../data/characters.js';
import { ENEMIES } from '../data/enemies.js';
import { BOSSES } from '../data/bosses.js';
import { WEAPONS } from '../data/weapons.js';
import { SECONDARIES } from '../data/secondaries.js';
import { ABILITIES } from '../data/abilities.js';
import { THEMES } from '../data/themes.js';
import { SPRITE, GAME } from '../config.js';

// Draw into a fresh graphics object, bake to texture `key`, then clean up.
function bake(scene, key, w, h, drawFn) {
  if (scene.textures.exists(key)) return;
  const g = scene.add.graphics();
  drawFn(g);
  g.generateTexture(key, w, h);
  g.destroy();
}

// Natural mid-tone ground palettes (NOT the near-black theme.ground) — a base earth
// colour plus a few close tones for mottling and small specks for grit. Low contrast
// so the tile's repetition stays invisible, VS-style.
const GROUND_PAL = {
  china: { base: 0x6f5538, tones: [0x7d6244, 0x5c4630, 0x836b48], specks: [0x6f7a3e, 0x8a8276, 0x4f3c28] },
  japan: { base: 0x4d6b3e, tones: [0x5a7a48, 0x3f5a33, 0x6b5a3a], specks: [0x80883c, 0x86763a, 0x37502c] },
  byzantium: { base: 0x8a8576, tones: [0x9a9588, 0x787264, 0x9d9a8e], specks: [0x6b7050, 0x615c50, 0xa8a496] },
  sumer: { base: 0xb89a6a, tones: [0xc6aa78, 0xa6885a, 0xc9b083], specks: [0x9a8868, 0x8a7550, 0xd8c290] },
  rome:     { base: 0x8a7a5c, tones: [0x9a8a6c, 0x7a6a4c, 0xa89870], specks: [0xb0a080, 0x6a5c44, 0xcfc0a0] },
  macedon:  { base: 0x6e7a4a, tones: [0x7e8a5a, 0x5e6a3a, 0x88945e], specks: [0x98a468, 0x4e5a30, 0xb0b878] },
  mongolia: { base: 0x8a8048, tones: [0x9a9058, 0x7a7038, 0xa89860], specks: [0xb0a868, 0x6a6030, 0xc8b878] },
  norse:    { base: 0x6a7682, tones: [0x7a8692, 0x5a6672, 0x8a96a2], specks: [0x9aa6b0, 0x4a5662, 0xb0c0cc] },
  default: { base: 0x6a6258, tones: [0x756d62, 0x5a5249, 0x7c7468], specks: [0x837b6f, 0x4f4840, 0x8a8276] },
};

// Paint a seamless, organic ground tile. Every blob is also drawn at its ±size wrap
// positions so the texture tiles with no seam; mottled patches + grit, no grid lines.
function drawGround(g, pal, size) {
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  // draw a shape at its 9 toroidal positions so only edge-crossers wrap; rest no-op
  const wrapped = (fn) => {
    for (const ox of [-size, 0, size]) for (const oy of [-size, 0, size]) fn(ox, oy);
  };
  g.fillStyle(pal.base, 1);
  g.fillRect(0, 0, size, size);
  // large soft mottling patches
  for (let i = 0; i < 22; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = rnd(30, 72), c = pick(pal.tones), a = rnd(0.16, 0.3);
    g.fillStyle(c, a);
    wrapped((ox, oy) => g.fillCircle(x + ox, y + oy, r));
  }
  // medium patches
  for (let i = 0; i < 34; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = rnd(10, 24), c = pick(pal.tones), a = rnd(0.16, 0.28);
    g.fillStyle(c, a);
    wrapped((ox, oy) => g.fillCircle(x + ox, y + oy, r));
  }
  // fine grit (stones / grass flecks / pebbles)
  for (let i = 0; i < 150; i++) {
    const x = Math.random() * size, y = Math.random() * size, w = rnd(2, 5), c = pick(pal.specks), a = rnd(0.35, 0.7);
    g.fillStyle(c, a);
    wrapped((ox, oy) => g.fillRect(x + ox, y + oy, w, w));
  }
}

// A blocky humanoid that fills most of a `size`x`size` canvas. `opts` lets each
// figure add a signature accessory so silhouettes differ.
function drawFigure(g, size, palette, opts = {}) {
  const u = size / 16; // pixel unit
  const px = (x, y, w, h, color) => {
    g.fillStyle(color, 1);
    g.fillRect(Math.round(x * u), Math.round(y * u), Math.round(w * u), Math.round(h * u));
  };

  // shadow
  g.fillStyle(0x000000, 0.25);
  g.fillEllipse(size / 2, size - u * 1.2, u * 8, u * 2.4);

  // legs
  px(5, 12, 2.4, 4, palette.accent);
  px(8.6, 12, 2.4, 4, palette.accent);

  // torso (primary armor)
  px(4.5, 7, 7, 6, palette.primary);
  // secondary trim down the chest
  px(7.2, 7, 1.6, 6, palette.secondary);
  // pauldrons
  px(3.5, 7, 1.8, 2.4, palette.secondary);
  px(10.7, 7, 1.8, 2.4, palette.secondary);

  // head
  px(6, 3.5, 4, 4, palette.skin);
  // helmet/cap
  px(5.5, 2.5, 5, 2, palette.secondary);

  // signature plume / crest on top of helmet
  if (opts.plume) px(7.2, 0.5, 1.6, 2.5, opts.plume);

  // optional cape behind one shoulder
  if (opts.cape) px(2.5, 7, 1.6, 5.5, opts.cape);

  // optional crown ridge (Gilgamesh) — horns
  if (opts.horns) {
    px(4.6, 2.4, 1.2, 1.4, opts.horns);
    px(10.2, 2.4, 1.2, 1.4, opts.horns);
  }

  // optional long weapon hint along the right side
  if (opts.weapon) {
    px(12.3, 1, 0.9, 13, opts.weapon);
    px(11.8, 1, 1.9, 1.6, opts.weapon); // blade head
  }
}

export function generatePlaceholders(scene) {
  // --- Characters ---
  for (const c of CHARACTERS) {
    const opts = { plume: c.palette.plume, weapon: WEAPONS[c.startingWeapon]?.color };
    if (c.id === 'nobunaga') opts.cape = c.palette.secondary;
    if (c.id === 'gilgamesh') opts.horns = c.palette.plume;
    if (c.id === 'belisarius') opts.cape = c.palette.plume;
    if (c.id === 'caesar') opts.cape = c.palette.primary;
    if (c.id === 'alexander') opts.cape = c.palette.primary;
    if (c.id === 'genghis') opts.cape = c.palette.primary;
    if (c.id === 'ragnar') opts.cape = c.palette.primary;
    bake(scene, `char_${c.id}`, SPRITE.size, SPRITE.size, (g) =>
      drawFigure(g, SPRITE.size, c.palette, opts)
    );
  }

  // --- Bosses: larger, ornate champions ---
  for (const id of Object.keys(BOSSES)) {
    const b = BOSSES[id];
    const opts = { plume: b.palette.plume, weapon: b.palette.secondary, ...b.opts };
    bake(scene, `boss_${b.id}`, b.size, b.size, (g) => drawFigure(g, b.size, b.palette, opts));
  }

  // --- Enemies ---
  for (const key of Object.keys(ENEMIES)) {
    const e = ENEMIES[key];
    const pal = { skin: 0xd8b08a, ...e.palette };
    bake(scene, `enemy_${e.id}`, e.size, e.size, (g) => {
      if (e.id === 'machine' || e.id === 'ballista') {
        // a boxy siege engine instead of a humanoid
        const u = e.size / 16;
        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(e.size / 2, e.size - u, u * 9, u * 2.5);
        g.fillStyle(e.palette.primary, 1);
        g.fillRect(u * 2, u * 5, u * 12, u * 8);
        g.fillStyle(e.palette.secondary, 1);
        g.fillRect(u * 3, u * 3, u * 10, u * 2.5); // arm
        g.fillStyle(e.palette.accent, 1);
        g.fillCircle(u * 4, u * 13, u * 2.2);
        g.fillCircle(u * 12, u * 13, u * 2.2);

      } else if (e.id === 'harpy') {
        // Winged aerial unit: small body + two swept wings
        const u = e.size / 16;
        g.fillStyle(0x000000, 0.25);
        g.fillEllipse(e.size / 2, e.size - u * 0.5, u * 7, u * 1.8);
        // left wing (swept back triangle)
        g.fillStyle(e.palette.secondary, 1);
        g.fillTriangle(
          Math.round(u * 8), Math.round(u * 7),   // body centre
          Math.round(u * 0.5), Math.round(u * 3), // wingtip upper
          Math.round(u * 2), Math.round(u * 10)   // wingtip lower
        );
        // right wing
        g.fillTriangle(
          Math.round(u * 8), Math.round(u * 7),
          Math.round(u * 15.5), Math.round(u * 3),
          Math.round(u * 14), Math.round(u * 10)
        );
        // wing accent edge stripes
        g.fillStyle(e.palette.accent, 1);
        g.fillTriangle(
          Math.round(u * 7.5), Math.round(u * 7.5),
          Math.round(u * 1), Math.round(u * 3.5),
          Math.round(u * 2.5), Math.round(u * 10)
        );
        g.fillTriangle(
          Math.round(u * 8.5), Math.round(u * 7.5),
          Math.round(u * 15), Math.round(u * 3.5),
          Math.round(u * 13.5), Math.round(u * 10)
        );
        // compact body
        g.fillStyle(e.palette.primary, 1);
        g.fillRect(Math.round(u * 6), Math.round(u * 6), Math.round(u * 4), Math.round(u * 6));
        // head
        g.fillStyle(0xd8b08a, 1);
        g.fillRect(Math.round(u * 6.5), Math.round(u * 3.5), Math.round(u * 3), Math.round(u * 3));
        // beak
        g.fillStyle(e.palette.secondary, 1);
        g.fillTriangle(
          Math.round(u * 7), Math.round(u * 5),
          Math.round(u * 9), Math.round(u * 5),
          Math.round(u * 8), Math.round(u * 6.5)
        );

      } else if (e.id === 'catapult') {
        // Siege catapult: wide frame, long throwing arm, bucket
        const u = e.size / 16;
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(e.size / 2, e.size - u * 0.5, u * 14, u * 2.5);
        // base frame
        g.fillStyle(e.palette.primary, 1);
        g.fillRect(Math.round(u * 1), Math.round(u * 9), Math.round(u * 14), Math.round(u * 5));
        // crossbeam
        g.fillStyle(e.palette.secondary, 1);
        g.fillRect(Math.round(u * 0.5), Math.round(u * 8), Math.round(u * 15), Math.round(u * 1.5));
        // throwing arm (long diagonal beam)
        g.fillStyle(e.palette.secondary, 1);
        g.fillRect(Math.round(u * 7), Math.round(u * 2), Math.round(u * 1.5), Math.round(u * 7));
        g.fillRect(Math.round(u * 2), Math.round(u * 7), Math.round(u * 5), Math.round(u * 1.5));
        // counterweight box on short end
        g.fillStyle(e.palette.accent, 1);
        g.fillRect(Math.round(u * 1.5), Math.round(u * 5), Math.round(u * 3), Math.round(u * 2.5));
        // projectile bucket / sling on long end
        g.fillStyle(e.palette.secondary, 1);
        g.fillCircle(Math.round(u * 8), Math.round(u * 1.5), Math.round(u * 1.5));
        // wheels
        g.fillStyle(e.palette.accent, 1);
        g.fillCircle(Math.round(u * 3), Math.round(u * 13.5), Math.round(u * 2));
        g.fillCircle(Math.round(u * 13), Math.round(u * 13.5), Math.round(u * 2));
        // wheel spokes
        g.fillStyle(e.palette.primary, 1);
        g.fillRect(Math.round(u * 2.6), Math.round(u * 11.8), Math.round(u * 0.8), Math.round(u * 3.4));
        g.fillRect(Math.round(u * 1.5), Math.round(u * 13), Math.round(u * 3), Math.round(u * 0.8));
        g.fillRect(Math.round(u * 12.6), Math.round(u * 11.8), Math.round(u * 0.8), Math.round(u * 3.4));
        g.fillRect(Math.round(u * 11.5), Math.round(u * 13), Math.round(u * 3), Math.round(u * 0.8));

      } else if (e.id === 'bomber') {
        // Round bomb body with a lit fuse on top; squat legs
        const u = e.size / 16;
        g.fillStyle(0x000000, 0.3);
        g.fillEllipse(e.size / 2, e.size - u * 0.5, u * 9, u * 2);
        // bomb body (large dark circle)
        g.fillStyle(e.palette.primary, 1);
        g.fillCircle(Math.round(u * 8), Math.round(u * 8.5), Math.round(u * 5.5));
        // sheen highlight
        g.fillStyle(e.palette.secondary, 0.7);
        g.fillCircle(Math.round(u * 6.5), Math.round(u * 6.5), Math.round(u * 2));
        // fuse stub at top
        g.fillStyle(e.palette.secondary, 1);
        g.fillRect(Math.round(u * 7.5), Math.round(u * 2.5), Math.round(u * 1), Math.round(u * 1));
        g.fillRect(Math.round(u * 8), Math.round(u * 1.5), Math.round(u * 1.2), Math.round(u * 1));
        g.fillRect(Math.round(u * 7.5), Math.round(u * 0.8), Math.round(u * 1), Math.round(u * 1));
        // fuse spark
        g.fillStyle(0xffee00, 1);
        g.fillCircle(Math.round(u * 8), Math.round(u * 0.7), Math.round(u * 0.8));
        // stubby legs
        g.fillStyle(e.palette.accent, 1);
        g.fillRect(Math.round(u * 5), Math.round(u * 13), Math.round(u * 2), Math.round(u * 2.5));
        g.fillRect(Math.round(u * 9), Math.round(u * 13), Math.round(u * 2), Math.round(u * 2.5));

      } else if (e.id === 'blinker') {
        // Mystical robed caster with a glowing void-purple aura ring
        const u = e.size / 16;
        // outer aura glow ring
        g.fillStyle(e.palette.secondary, 0.25);
        g.fillCircle(Math.round(u * 8), Math.round(u * 8), Math.round(u * 7.5));
        // draw base humanoid figure in dark robes
        drawFigure(g, e.size, pal, {});
        // overlay void-rune glyph in the chest area
        g.fillStyle(e.palette.secondary, 0.9);
        g.fillCircle(Math.round(u * 8), Math.round(u * 9.5), Math.round(u * 1.2));
        // blink-charge ring around the body
        g.lineStyle(Math.round(u * 0.8), e.palette.secondary, 0.7);
        g.strokeCircle(Math.round(u * 8), Math.round(u * 8), Math.round(u * 6));

      } else {
        drawFigure(g, e.size, pal, {});
      }
    });
  }

  // --- XP gem ---
  bake(scene, 'gem', SPRITE.gem, SPRITE.gem, (g) => {
    const s = SPRITE.gem;
    g.fillStyle(0x3ad1ff, 1);
    g.fillTriangle(s / 2, 1, s - 1, s / 2, s / 2, s - 1);
    g.fillTriangle(s / 2, 1, 1, s / 2, s / 2, s - 1);
    g.fillStyle(0xbfeeff, 1);
    g.fillTriangle(s / 2, 2, s / 2 + 3, s / 2, s / 2, s / 2 + 2);
  });

  // --- Projectiles: one per weapon/secondary color (also used as upgrade icons) ---
  for (const id of [...Object.keys(WEAPONS), ...Object.keys(SECONDARIES)]) {
    const w = WEAPONS[id] || SECONDARIES[id];
    bake(scene, `proj_${id}`, SPRITE.projectile, SPRITE.projectile, (g) => {
      const s = SPRITE.projectile;
      if (id === 'thrust_sky' || id === 'gate_spear') {
        // a slim lance/spear pointing right (rotated to its travel direction at runtime)
        g.fillStyle(w.color, 1);
        g.fillRect(1, s / 2 - 1.5, s - 5, 3); // shaft
        g.fillTriangle(s - 6, s / 2 - 4, s - 1, s / 2, s - 6, s / 2 + 4); // spearhead
        g.fillStyle(0xffffff, 0.8);
        g.fillRect(2, s / 2 - 0.5, s - 8, 1); // glint
        return;
      }
      if (id === 'divine_arsenal') {
        // Crisp 16×16 golden sword — tip at top (y=0), pommel at bottom (y=15).
        // WeaponSystem sets setRotation(ang + PI/2) so it faces along the orbit.
        // Drawn SOLID (no ADD blend) with a 1px dark outline so it reads on any bg.
        const cx = s / 2; // 8
        // --- dark outline layer ---
        g.fillStyle(0x1a0e00, 1);
        // blade outline: wide triangle covering blade + 1px fringe
        g.fillTriangle(cx - 4, 9, cx + 4, 9, cx, 0);
        // guard outline: 10px wide, 1px above/below the gold guard
        g.fillRect(cx - 5, 8, 10, 4);
        // grip + pommel outline
        g.fillRect(cx - 2, 11, 4, 5);
        // --- gold blade body ---
        g.fillStyle(0xffb800, 1);
        g.fillTriangle(cx - 3, 8, cx + 3, 8, cx, 1);
        // --- bright fuller highlight (central ridge) ---
        g.fillStyle(0xfff070, 1);
        g.fillTriangle(cx - 1, 7, cx + 1, 7, cx, 2);
        // --- crossguard (wider than blade, two-tone) ---
        g.fillStyle(0xffd040, 1);
        g.fillRect(cx - 4, 9, 8, 2);
        g.fillStyle(0xffe890, 1);
        g.fillRect(cx - 4, 9, 8, 1); // highlight on top edge of guard
        // --- grip ---
        g.fillStyle(0x8b5a10, 1);
        g.fillRect(cx - 1, 11, 2, 3);
        // --- pommel (small bright dot) ---
        g.fillStyle(0xffd040, 1);
        g.fillRect(cx - 2, 13, 4, 2);
        return;
      }
      if (id === 'matchlock_volley') {
        // A slim elongated bullet: bright white core, pale yellow shell — reads
        // as a fast piercing round rather than a magic orb.
        g.fillStyle(w.color, 1);
        g.fillRect(s / 2 - 2, 1, 4, s - 2); // shaft
        g.fillStyle(0xffffff, 1);
        g.fillRect(s / 2 - 1, 2, 2, s / 2 - 2); // bright core
        g.fillStyle(0xfff0c0, 0.6);
        g.fillRect(s / 2 - 1.5, s / 2, 3, s / 2 - 2); // casing tail
        return;
      }
      if (id === 'scattershot') {
        // Slightly larger bright round for the rapid burst shots
        g.fillStyle(w.color, 1);
        g.fillCircle(s / 2, s / 2, s / 2 - 1);
        g.fillStyle(0xffffff, 1);
        g.fillCircle(s / 2, s / 2, s / 2 - 3);
        g.fillStyle(w.color, 0.5);
        g.fillCircle(s / 2, s / 2, s / 2 - 5);
        return;
      }
      if (id === 'halberd_sweep') {
        // Melee arc icon: a golden crescent-sweep slash using strokePath arcs.
        // Rendered as thick colored strokes so the crescent reads cleanly.
        const r = (deg) => (deg * Math.PI) / 180;
        const cx2 = s / 2, cy2 = s / 2;
        // dark outline arc (slightly larger radius, thicker stroke)
        g.lineStyle(5, 0x1a1200, 1);
        g.beginPath();
        g.arc(cx2, cy2, s / 2 - 3, r(-70), r(70), false);
        g.strokePath();
        // gold main arc
        g.lineStyle(3, 0xd4af37, 1);
        g.beginPath();
        g.arc(cx2, cy2, s / 2 - 3, r(-70), r(70), false);
        g.strokePath();
        // bright highlight arc (slightly shorter span, inner)
        g.lineStyle(1, 0xfff280, 0.9);
        g.beginPath();
        g.arc(cx2, cy2, s / 2 - 3, r(-50), r(50), false);
        g.strokePath();
        // small blade-tip triangle at the arc end-right
        const tipX = Math.round(cx2 + Math.cos(r(70)) * (s / 2 - 3));
        const tipY = Math.round(cy2 + Math.sin(r(70)) * (s / 2 - 3));
        g.fillStyle(0xffe08a, 1);
        g.fillTriangle(tipX - 2, tipY - 2, tipX + 3, tipY, tipX - 2, tipY + 2);
        return;
      }
      if (id === 'greek_fire') {
        // Fire-drop icon: an orange teardrop with bright inner core.
        const cx = s / 2, cy = s / 2;
        g.fillStyle(0x1a0500, 1);
        g.fillCircle(cx, cy + 1, s / 2 - 1); // outline
        g.fillTriangle(cx - 2, cy, cx + 2, cy, cx, 1); // flame tip outline
        g.fillStyle(0xff6a00, 1);
        g.fillCircle(cx, cy + 1, s / 2 - 2);
        g.fillTriangle(cx - 2, cy, cx + 2, cy, cx, 2); // flame tip
        g.fillStyle(0xffcc00, 1);
        g.fillCircle(cx, cy + 2, s / 2 - 5); // hot core
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(cx - 1, cy, 2); // bright inner highlight
        return;
      }
      if (id === 'fireburst') {
        // Radial burst icon: small sun-burst / starburst of fire.
        const cx = s / 2, cy = s / 2;
        g.fillStyle(0xff6a00, 1);
        g.fillCircle(cx, cy, s / 2 - 2);
        // 6 spiky rays
        for (let i = 0; i < 6; i++) {
          const a = (Math.PI / 3) * i;
          const rx = cx + Math.cos(a) * (s / 2 - 1);
          const ry = cy + Math.sin(a) * (s / 2 - 1);
          const ax = cx + Math.cos(a - 0.35) * (s / 2 - 4);
          const ay = cy + Math.sin(a - 0.35) * (s / 2 - 4);
          const bx = cx + Math.cos(a + 0.35) * (s / 2 - 4);
          const by = cy + Math.sin(a + 0.35) * (s / 2 - 4);
          g.fillTriangle(Math.round(ax), Math.round(ay), Math.round(rx), Math.round(ry), Math.round(bx), Math.round(by));
        }
        g.fillStyle(0xffd040, 1);
        g.fillCircle(cx, cy, s / 2 - 5);
        g.fillStyle(0xffffff, 0.9);
        g.fillCircle(cx - 1, cy - 1, 2);
        return;
      }
      if (id === 'composite_bow' || id === 'arrow_storm') {
        // arrow: thin shaft, triangular head (right), fletching (left)
        g.fillStyle(0x8a6a3a, 1);
        g.fillRect(2, s / 2 - 1, s - 6, 2); // shaft
        g.fillStyle(w.color, 1);
        g.fillTriangle(s - 6, s / 2 - 3.5, s - 1, s / 2, s - 6, s / 2 + 3.5); // head
        g.fillStyle(0xffffff, 0.85);
        g.fillTriangle(1, s / 2 - 3, 5, s / 2, 1, s / 2 + 3); // fletching
        return;
      }
      if (id === 'axe_throw') {
        // double-bit throwing axe (spins at runtime): wooden haft + steel head
        const c = s / 2;
        g.fillStyle(0x6a4a2a, 1);
        g.fillRect(c - 1, 2, 2, s - 4); // haft (vertical)
        g.fillStyle(w.color, 1);
        g.fillTriangle(c, 3, s - 2, 6, c, 11); // right bit
        g.fillTriangle(c, 3, 2, 6, c, 11); // left bit
        g.fillStyle(0xffffff, 0.7);
        g.fillRect(c, 4, 1, 5); // glint
        return;
      }
      if (id === 'pilum_volley' || id === 'companion_javelin') {
        // slim javelin: long wooden shaft + small iron pyramidal head
        g.fillStyle(0x8a6a3a, 1);
        g.fillRect(1, s / 2 - 0.5, s - 4, 1.6); // shaft
        g.fillStyle(w.color, 1);
        g.fillTriangle(s - 5, s / 2 - 2.5, s - 1, s / 2, s - 5, s / 2 + 2.5); // head
        return;
      }
      // glowing energy bolt: colored body + white-hot core (pops with the Fx trail)
      g.fillStyle(w.color, 1);
      g.fillCircle(s / 2, s / 2, s / 2 - 1);
      g.fillStyle(0xffffff, 1);
      g.fillCircle(s / 2, s / 2, s / 2 - 4);
    });
  }

  // Weapon-stab sprites used by the THRUST lunge animation (Fx.weaponLunge) — drawn
  // pointing RIGHT so they rotate to the aim. AI versions (weapon_*) override these.
  bake(scene, 'weapon_halberd', 56, 18, (g) => {
    g.fillStyle(0x5a3a1a, 1); g.fillRect(0, 7, 42, 4); // wooden haft
    g.fillStyle(0xd4af37, 1);
    g.fillTriangle(40, 9, 56, 2, 40, 16); // long spear point
    g.fillTriangle(38, 1, 50, 5, 38, 9); // crescent axe blade
    g.fillStyle(0xfff0a0, 0.7); g.fillRect(2, 8, 36, 1); // glint
  });
  bake(scene, 'weapon_sarissa', 64, 12, (g) => {
    g.fillStyle(0x8a6a3a, 1); g.fillRect(0, 5, 56, 2.5); // very long thin shaft
    g.fillStyle(0xcdb070, 1); g.fillTriangle(54, 2, 64, 6, 54, 10); // bronze leaf point
    g.fillStyle(0xffffff, 0.5); g.fillRect(2, 5.5, 50, 0.8);
  });

  // Legionary ally (Caesar's summon) — a small Roman soldier. AI ally_legionary overrides.
  bake(scene, 'ally_legionary', 40, 40, (g) => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(20, 37, 16, 5); // shadow
    g.fillStyle(0x8a6a3a, 1); g.fillRect(16, 31, 3, 7); g.fillRect(21, 31, 3, 7); // legs
    g.fillStyle(0xb02a2a, 1); g.fillRect(15, 17, 10, 15); // red tunic
    g.fillStyle(0xcfd6e0, 1); g.fillRect(16, 18, 8, 8); // lorica
    g.fillStyle(0xe2b0a0, 1); g.fillCircle(20, 13, 5); // head
    g.fillStyle(0xd4af37, 1); g.fillRect(13, 7, 14, 5); g.fillRect(19, 3, 2, 5); // helmet + crest
    g.fillStyle(0xc0a060, 1); g.fillRoundedRect(25, 16, 7, 14, 2); // scutum shield (right)
    g.fillStyle(0xcfd6e0, 1); g.fillRect(9, 19, 3, 11); // gladius (left)
  });

  // Flame-pool texture for Greek fire AoE (player only — orange)
  bake(scene, 'flame_pool', 64, 64, (g) => {
    g.fillStyle(0xff7b1c, 0.45);
    g.fillCircle(32, 32, 30);
    g.fillStyle(0xffb347, 0.5);
    g.fillCircle(32, 32, 18);
  });

  // Acid-pool texture for catapult/siege hazard zones — sickly green, clearly
  // distinct from the player's orange flame_pool.
  bake(scene, 'acid_pool', 64, 64, (g) => {
    g.fillStyle(0x22aa22, 0.5);
    g.fillCircle(32, 32, 30);
    g.fillStyle(0x88ff44, 0.55);
    g.fillCircle(32, 32, 18);
    g.fillStyle(0xccff00, 0.35);
    g.fillCircle(32, 32, 9);
  });

  // Dungeon-floor tiles — drawn WHITE so FloorSystem can tint them to the civ theme
  // (floor → theme.ground, walls → theme.grid). stairs_down is a dark recessed staircase.
  bake(scene, 'dungeon_floor', 32, 32, (g) => {
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 32, 32);
    g.fillStyle(0x000000, 0.06).fillRect(0, 0, 32, 1).fillRect(0, 0, 1, 32); // faint grid seam
  });
  bake(scene, 'dungeon_wall', 32, 32, (g) => {
    // Grayscale ROCK tile (FloorSystem tints it per-civ). Mottled blobs + grit +
    // hairline cracks so meshed wall strips read as textured stone, not flat blocks.
    // Drawn to tile reasonably when repeated as a tileSprite across a strip.
    g.fillStyle(0xffffff, 1).fillRect(0, 0, 32, 32);
    // darker mottling (rock patches)
    const blobs = [[7, 9, 8], [23, 6, 7], [15, 21, 9], [28, 25, 7], [3, 25, 6], [20, 30, 6]];
    g.fillStyle(0x000000, 0.15);
    for (const [x, y, r] of blobs) g.fillCircle(x, y, r);
    // lighter mottling (catch-light on raised stone)
    g.fillStyle(0xffffff, 0.10);
    for (const [x, y, r] of [[12, 6, 5], [25, 16, 4], [6, 18, 4]]) g.fillCircle(x, y, r);
    // grit speckle (dark pit + light fleck pairs)
    const specks = [[6, 6], [18, 12], [26, 10], [11, 17], [23, 27], [30, 19], [14, 29], [3, 13], [19, 4]];
    for (const [x, y] of specks) {
      g.fillStyle(0x000000, 0.24).fillRect(x, y, 2, 2);
      g.fillStyle(0xffffff, 0.16).fillRect(x + 1, y + 1, 1, 1);
    }
    // hairline cracks
    g.lineStyle(1, 0x000000, 0.28);
    g.beginPath(); g.moveTo(9, 1); g.lineTo(12, 11); g.lineTo(8, 19); g.strokePath();
    g.beginPath(); g.moveTo(25, 3); g.lineTo(22, 13); g.strokePath();
    // faint lit top edge so a strip's upper rim catches light (kept subtle to avoid banding)
    g.fillStyle(0xffffff, 0.12).fillRect(0, 0, 32, 2);
  });
  bake(scene, 'stairs_down', 32, 32, (g) => {
    g.fillStyle(0x0a0a12, 1).fillRect(2, 2, 28, 28);
    for (let i = 0; i < 4; i++) g.fillStyle(0xffffff, 0.10 + i * 0.06).fillRect(4, 6 + i * 6, 24 - i * 5, 4);
  });

  // Caltrop field — Genghis's trail hazard: a dirt patch bristling with stuck arrows /
  // iron spikes the chasing swarm runs over. (Distinct from the fire/acid pools.)
  bake(scene, 'caltrops', 48, 48, (g) => {
    g.fillStyle(0x6a5630, 0.30); g.fillCircle(24, 24, 22); // scuffed dirt
    g.fillStyle(0x8a7038, 0.22); g.fillCircle(24, 24, 14);
    const spikes = [[14, 17], [31, 14], [20, 28], [34, 31], [12, 33], [27, 21], [37, 22], [18, 38], [24, 11]];
    for (const [sx, sy] of spikes) {
      g.fillStyle(0x2e2412, 1); g.fillRect(sx - 1, sy - 5, 2, 10);          // arrow shaft / spike
      g.fillStyle(0xc0c0c8, 1); g.fillTriangle(sx - 2, sy - 5, sx + 2, sy - 5, sx, sy - 9); // metal head
    }
  });

  // Melee sweep arc texture (a bright crescent), reused and rotated/scaled.
  const rad = (deg) => (deg * Math.PI) / 180;
  bake(scene, 'sweep', 128, 128, (g) => {
    g.fillStyle(0xffffff, 0.9);
    g.slice(64, 64, 60, rad(-60), rad(60), false);
    g.fillPath();
    g.fillStyle(0xd4af37, 0.6);
    g.slice(64, 64, 40, rad(-60), rad(60), false);
    g.fillPath();
  });

  // --- Upgrade icons: colored chips with a simple glyph ---
  const iconColors = {
    up_might: 0xff5252,
    up_haste: 0x42a5f5,
    up_swift: 0x66bb6a,
    up_vigor: 0xec407a,
    up_regen: 0x26a69a,
    up_magnet: 0xab47bc,
    up_area: 0xffa726,
  };
  for (const [key, color] of Object.entries(iconColors)) {
    bake(scene, key, 48, 48, (g) => {
      g.fillStyle(0x101018, 1);
      g.fillRoundedRect(0, 0, 48, 48, 8);
      g.fillStyle(color, 1);
      g.fillRoundedRect(6, 6, 36, 36, 6);
      g.fillStyle(0xffffff, 0.85);
      g.fillCircle(24, 24, 8);
    });
  }

  // --- Weapon axis icons (48×48 chips) — damage/reach/speed/effect ---
  // Each gets a distinct glyph so upgrade cards are immediately readable.
  // DAMAGE — crossed swords / upward chevrons
  bake(scene, 'axis_damage', 48, 48, (g) => {
    g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
    // red tint chip
    g.fillStyle(0xff3a3a, 0.18).fillRoundedRect(4, 4, 40, 40, 6);
    // two upward chevrons (double angle-bracket "rise" symbol)
    g.lineStyle(3, 0xff5252, 1);
    g.beginPath(); g.moveTo(14, 34); g.lineTo(24, 18); g.lineTo(34, 34); g.strokePath();
    g.beginPath(); g.moveTo(14, 26); g.lineTo(24, 10); g.lineTo(34, 26); g.strokePath();
    // red sword tip at center-top
    g.fillStyle(0xff7070, 1);
    g.fillTriangle(22, 10, 26, 10, 24, 5);
  });

  // REACH — double-headed horizontal arrow with expanding end-brackets
  bake(scene, 'axis_reach', 48, 48, (g) => {
    g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
    g.fillStyle(0x42a5f5, 0.18).fillRoundedRect(4, 4, 40, 40, 6);
    g.lineStyle(3, 0x64c8ff, 1);
    // main horizontal shaft
    g.beginPath(); g.moveTo(8, 24); g.lineTo(40, 24); g.strokePath();
    // left arrowhead
    g.beginPath(); g.moveTo(14, 18); g.lineTo(8, 24); g.lineTo(14, 30); g.strokePath();
    // right arrowhead
    g.beginPath(); g.moveTo(34, 18); g.lineTo(40, 24); g.lineTo(34, 30); g.strokePath();
    // end brackets (the "expanding" look)
    g.lineStyle(2, 0x64c8ff, 0.7);
    g.beginPath(); g.moveTo(8, 16); g.lineTo(8, 32); g.strokePath();
    g.beginPath(); g.moveTo(40, 16); g.lineTo(40, 32); g.strokePath();
  });

  // SPEED — lightning bolt
  bake(scene, 'axis_speed', 48, 48, (g) => {
    g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
    g.fillStyle(0xffee00, 0.15).fillRoundedRect(4, 4, 40, 40, 6);
    // yellow lightning bolt (classic zig-zag)
    g.fillStyle(0xffe030, 1);
    g.fillPoints([
      { x: 27, y: 6 }, { x: 18, y: 24 }, { x: 24, y: 24 },
      { x: 21, y: 42 }, { x: 30, y: 22 }, { x: 24, y: 22 },
    ], true);
    // bright highlight on the bolt face
    g.fillStyle(0xfff8a0, 0.9);
    g.fillPoints([
      { x: 26, y: 8 }, { x: 20, y: 22 }, { x: 24, y: 22 },
    ], true);
  });

  // EFFECT — four-pointed star / sparkle
  bake(scene, 'axis_effect', 48, 48, (g) => {
    g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
    g.fillStyle(0xab47bc, 0.18).fillRoundedRect(4, 4, 40, 40, 6);
    // four-point star (diamond + perpendicular thin bars)
    g.fillStyle(0xcc66ff, 1);
    g.fillPoints([
      { x: 24, y: 7 }, { x: 28, y: 20 }, { x: 41, y: 24 },
      { x: 28, y: 28 }, { x: 24, y: 41 }, { x: 20, y: 28 },
      { x: 7, y: 24 }, { x: 20, y: 20 },
    ], true);
    // bright centre
    g.fillStyle(0xf0b0ff, 1);
    g.fillCircle(24, 24, 5);
    // tiny corner sparkle dots
    g.fillStyle(0xcc66ff, 0.7);
    g.fillCircle(14, 14, 2); g.fillCircle(34, 14, 2);
    g.fillCircle(14, 34, 2); g.fillCircle(34, 34, 2);
  });

  // --- Ability axis icons (48×48 chips) — power/haste/area/amount ---
  // POWER — fist / burst
  bake(scene, 'axis_power', 48, 48, (g) => {
    g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
    g.fillStyle(0xff5252, 0.18).fillRoundedRect(4, 4, 40, 40, 6);
    // starburst (impact)
    g.fillStyle(0xff6a40, 1);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const x2 = 24 + Math.cos(a) * 18;
      const y2 = 24 + Math.sin(a) * 18;
      const la = a - 0.28, ra = a + 0.28;
      g.fillTriangle(
        Math.round(24 + Math.cos(la) * 10), Math.round(24 + Math.sin(la) * 10),
        Math.round(x2), Math.round(y2),
        Math.round(24 + Math.cos(ra) * 10), Math.round(24 + Math.sin(ra) * 10)
      );
    }
    g.fillStyle(0xff9060, 1);
    g.fillCircle(24, 24, 9);
    g.fillStyle(0xffd0b0, 0.9);
    g.fillCircle(22, 22, 4);
  });

  // HASTE — lightning bolt (same glyph as speed but cyan-tinted)
  bake(scene, 'axis_haste', 48, 48, (g) => {
    g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
    g.fillStyle(0x00e5ff, 0.15).fillRoundedRect(4, 4, 40, 40, 6);
    g.fillStyle(0x00d8f0, 1);
    g.fillPoints([
      { x: 27, y: 6 }, { x: 18, y: 24 }, { x: 24, y: 24 },
      { x: 21, y: 42 }, { x: 30, y: 22 }, { x: 24, y: 22 },
    ], true);
    g.fillStyle(0xb0f8ff, 0.9);
    g.fillPoints([{ x: 26, y: 8 }, { x: 20, y: 22 }, { x: 24, y: 22 }], true);
    // speed-lines to left of bolt
    g.lineStyle(2, 0x00d8f0, 0.5);
    g.beginPath(); g.moveTo(8, 18); g.lineTo(15, 18); g.strokePath();
    g.beginPath(); g.moveTo(6, 24); g.lineTo(15, 24); g.strokePath();
    g.beginPath(); g.moveTo(8, 30); g.lineTo(15, 30); g.strokePath();
  });

  // AREA — concentric rings / expanding circle
  bake(scene, 'axis_area', 48, 48, (g) => {
    g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
    g.fillStyle(0xffa726, 0.18).fillRoundedRect(4, 4, 40, 40, 6);
    g.lineStyle(2, 0xffcc44, 1);
    g.strokeCircle(24, 24, 6);
    g.lineStyle(2, 0xffaa22, 0.85);
    g.strokeCircle(24, 24, 12);
    g.lineStyle(2, 0xff8800, 0.7);
    g.strokeCircle(24, 24, 18);
    g.lineStyle(2, 0xff7700, 0.5);
    g.strokeCircle(24, 24, 20);
    // bright centre dot
    g.fillStyle(0xffd060, 1);
    g.fillCircle(24, 24, 4);
  });

  // AMOUNT — stacked dots / plus sign (more of a thing)
  bake(scene, 'axis_amount', 48, 48, (g) => {
    g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
    g.fillStyle(0x66bb6a, 0.18).fillRoundedRect(4, 4, 40, 40, 6);
    // 3×3 dot grid (3 cols × 3 rows) to read as "multiple"
    g.fillStyle(0x66dd88, 1);
    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 3; col++) {
        g.fillCircle(14 + col * 10, 14 + row * 10, 3.5);
      }
    }
    // bottom row dimmer to imply "adding more"
    g.fillStyle(0x44aa66, 1);
    for (let col = 0; col < 3; col++) {
      g.fillCircle(14 + col * 10, 34, 3.5);
    }
    // bright top-left dot = the "new" one
    g.fillStyle(0xaaffc0, 1);
    g.fillCircle(14, 14, 3.5);
  });

  // --- Enemy projectile: a slow, clearly-visible warning orb ---
  bake(scene, 'enemy_proj', SPRITE.projectile, SPRITE.projectile, (g) => {
    const s = SPRITE.projectile;
    g.fillStyle(0xff3b3b, 1);
    g.fillCircle(s / 2, s / 2, s / 2 - 2);
    g.fillStyle(0xffd2d2, 0.9);
    g.fillCircle(s / 2, s / 2, s / 2 - 4);
    g.fillStyle(0xff3b3b, 1);
    g.fillCircle(s / 2, s / 2, s / 2 - 6);
  });

  // --- Treasure chest ---
  bake(scene, 'chest', 32, 28, (g) => {
    g.fillStyle(0x000000, 0.25);
    g.fillEllipse(16, 26, 26, 5);
    g.fillStyle(0x6b3f1d, 1).fillRect(3, 10, 26, 16); // body
    g.fillStyle(0x8a572b, 1).fillRect(3, 6, 26, 6); // lid
    g.fillStyle(0xd4af37, 1).fillRect(14, 6, 4, 20); // gold strap
    g.fillStyle(0xffe08a, 1).fillRect(14, 14, 4, 4); // lock
    g.lineStyle(1, 0x3a2412, 1).strokeRect(3, 6, 26, 20);
  });

  // --- Equipment slot icons: distinct color + glyph per slot ---
  const slotIcons = {
    icon_weapon: { color: 0xd4af37, draw: (g) => g.fillRect(20, 8, 8, 34) },
    icon_hat: { color: 0x6a8cff, draw: (g) => { g.fillRect(10, 22, 28, 8); g.fillRect(16, 12, 16, 12); } },
    icon_armor: { color: 0x8a8f9c, draw: (g) => { g.fillRect(12, 12, 24, 28); g.fillRect(8, 14, 6, 12); g.fillRect(34, 14, 6, 12); } },
    icon_gloves: { color: 0xf0a24b, draw: (g) => { g.fillRect(14, 16, 8, 22); g.fillRect(26, 16, 8, 22); } },
    icon_boots: { color: 0x66bb6a, draw: (g) => { g.fillRect(12, 14, 10, 22); g.fillRect(12, 32, 22, 6); } },
    icon_cape: { color: 0xab47bc, draw: (g) => g.fillTriangle(24, 10, 12, 40, 36, 40) },
    icon_shield: { color: 0x9aa6b8, draw: (g) => { g.fillTriangle(24, 40, 10, 14, 38, 14); g.fillRect(10, 12, 28, 6); } },
    icon_ring: { color: 0xff5252, draw: (g) => { g.fillCircle(24, 26, 12); g.fillStyle(0x1d1a2e, 1); g.fillCircle(24, 26, 6); } },
    icon_pendant: { color: 0x26c6da, draw: (g) => { g.lineStyle(3, 0xeeeeee, 1); g.strokeCircle(24, 16, 6); g.fillStyle(0x26c6da, 1); g.fillTriangle(24, 22, 16, 38, 32, 38); } },
  };
  for (const [key, spec] of Object.entries(slotIcons)) {
    bake(scene, key, 48, 48, (g) => {
      g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
      g.fillStyle(spec.color, 1);
      spec.draw(g);
    });
  }

  // --- Background tile: subtle grid so motion is readable on the empty field ---
  bake(scene, 'bg_tile', 64, 64, (g) => {
    g.fillStyle(0x1b1828, 1);
    g.fillRect(0, 0, 64, 64);
    g.lineStyle(1, 0x2a2740, 1);
    g.strokeRect(0, 0, 64, 64);
    g.fillStyle(0x232038, 1);
    g.fillRect(30, 30, 4, 4);
  });

  // --- Particle dot (impact sparks / death poofs), tinted at emit time ---
  bake(scene, 'spark', 8, 8, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 3);
  });

  // --- Cannonball (Nobunaga's barrage shells) ---
  bake(scene, 'cannonball', 16, 16, (g) => {
    g.fillStyle(0x111017, 1).fillCircle(8, 8, 7); // dark iron ball
    g.fillStyle(0x3a3550, 1).fillCircle(8, 8, 5);
    g.fillStyle(0x8a86a0, 0.9).fillCircle(6, 6, 2.5); // highlight
    g.fillStyle(0xffd27a, 1).fillCircle(13, 4, 1.6); // fuse spark
  });

  // --- Per-civilization ground tiles + parallax motif layers ---
  for (const key of Object.keys(THEMES)) {
    const th = THEMES[key];
    // procedural seamless organic ground (256px, tiles with no visible grid/repeat)
    bake(scene, `bg_ground_${key}`, 256, 256, (g) => drawGround(g, GROUND_PAL[key] || GROUND_PAL.default, 256));
    // 200x200 faint motif tile, scrolled slower than ground for parallax depth
    bake(scene, `bg_motif_${key}`, 200, 200, (g) => drawMotif(g, key, th.motif));
  }

  // --- Vignette overlay (four edge gradients), sized to the viewport ---
  bake(scene, 'vignette', GAME.width, GAME.height, (g) => {
    const W = GAME.width;
    const H = GAME.height;
    const d = 130; // edge thickness
    const a = 0.55;
    // top
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, a, a, 0, 0);
    g.fillRect(0, 0, W, d);
    // bottom
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, 0, a, a);
    g.fillRect(0, H - d, W, d);
    // left
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, a, 0, a, 0);
    g.fillRect(0, 0, d, H);
    // right
    g.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0, a, 0, a);
    g.fillRect(W - d, 0, d, H);
  });

  // --- Map: terrain decal, pickups, obstacles, breakables, shrine, hazard ---

  // soft blob used for terrain zones (tinted per type at placement)
  bake(scene, 'soft_circle', 128, 128, (g) => {
    g.fillStyle(0xffffff, 0.16); g.fillCircle(64, 64, 62);
    g.fillStyle(0xffffff, 0.26); g.fillCircle(64, 64, 46);
    g.fillStyle(0xffffff, 0.4); g.fillCircle(64, 64, 28);
  });

  // health pickup (heart)
  bake(scene, 'pickup_heart', 18, 18, (g) => {
    g.fillStyle(0xff4d6d, 1);
    g.fillCircle(6, 7, 4);
    g.fillCircle(12, 7, 4);
    g.fillTriangle(2, 8, 16, 8, 9, 17);
    g.fillStyle(0xffd2da, 0.8);
    g.fillCircle(5, 6, 1.4);
  });

  // boulder obstacle
  bake(scene, 'rock', 60, 50, (g) => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(30, 46, 50, 8);
    g.fillStyle(0x5b606b, 1); g.fillRoundedRect(6, 10, 48, 34, 10);
    g.fillStyle(0x6f747f, 1); g.fillRoundedRect(10, 8, 34, 22, 8);
    g.fillStyle(0x474b54, 1); g.fillRect(16, 30, 12, 4);
    g.fillRect(34, 24, 10, 4);
  });

  // stone pillar obstacle
  bake(scene, 'pillar', 40, 70, (g) => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(20, 66, 34, 7);
    g.fillStyle(0x8a8f9c, 1); g.fillRect(11, 8, 18, 56); // shaft
    g.fillStyle(0xa3a8b5, 1); g.fillRect(6, 2, 28, 8); // capital
    g.fillStyle(0xa3a8b5, 1); g.fillRect(6, 60, 28, 8); // base
    g.fillStyle(0x6f747f, 1); g.fillRect(15, 8, 3, 56); g.fillRect(22, 8, 3, 56); // flutes
  });

  // breakable crate
  bake(scene, 'crate', 36, 36, (g) => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(18, 34, 30, 5);
    g.fillStyle(0x7a4f25, 1); g.fillRect(3, 3, 30, 30);
    g.fillStyle(0x9a6a38, 1); g.fillRect(5, 5, 26, 26);
    g.lineStyle(2, 0x5a3a1c, 1);
    g.strokeRect(5, 5, 26, 26);
    g.beginPath(); g.moveTo(5, 5); g.lineTo(31, 31); g.moveTo(31, 5); g.lineTo(5, 31); g.strokePath();
  });

  // shrine / altar (glowing orb on a stone base)
  bake(scene, 'shrine', 44, 58, (g) => {
    g.fillStyle(0x000000, 0.25); g.fillEllipse(22, 54, 38, 7);
    g.fillStyle(0x6b6f7a, 1); g.fillRect(8, 30, 28, 24); // base
    g.fillStyle(0x868c98, 1); g.fillRect(12, 24, 20, 8); // pedestal top
    g.fillStyle(0xffe9a8, 1); g.fillCircle(22, 16, 11); // orb glow
    g.fillStyle(0xffd34d, 1); g.fillCircle(22, 16, 7);
  });

  // hazard spikes
  bake(scene, 'spikes', 52, 52, (g) => {
    g.fillStyle(0x2a2d33, 1); g.fillRect(2, 40, 48, 8); // base
    g.fillStyle(0xb9c0cc, 1);
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 10;
      g.fillTriangle(x, 42, x + 9, 42, x + 4.5, 14);
    }
    g.fillStyle(0xe6ebf2, 0.7);
    for (let i = 0; i < 5; i++) {
      const x = 4 + i * 10;
      g.fillTriangle(x + 3, 42, x + 5, 42, x + 4.5, 18);
    }
  });

  // --- Secondary-ability icons (for the level-up cards) + charge lance ---
  for (const id of Object.keys(ABILITIES)) {
    const a = ABILITIES[id];
    bake(scene, `abil_${id}`, 48, 48, (g) => {
      g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
      g.lineStyle(3, a.color, 1);
      g.fillStyle(a.color, 1);
      switch (a.kind) {
        case 'nova': // concentric rings
          g.strokeCircle(24, 24, 16);
          g.strokeCircle(24, 24, 10);
          g.fillCircle(24, 24, 4);
          break;
        case 'artillery': // bomb + fuse
          g.fillCircle(22, 28, 11);
          g.lineStyle(3, a.color, 1);
          g.beginPath(); g.moveTo(30, 18); g.lineTo(36, 10); g.strokePath();
          g.fillStyle(0xfff2c0, 1); g.fillCircle(37, 9, 2.5);
          break;
        case 'charge': // lance chevron
          g.fillTriangle(10, 38, 24, 10, 30, 16);
          g.fillTriangle(24, 10, 38, 22, 30, 16);
          break;
        case 'meteor': // comet / star
        default:
          g.fillCircle(30, 18, 8);
          g.fillTriangle(8, 40, 24, 24, 30, 30);
          break;
      }
    });
  }

  // -----------------------------------------------------------------------
  // ABILITY EMBLEM ICONS — 12 distinct 48×48 chips, one per ability.
  // Key convention: abil_icon_<abilityId>
  // Each chip: dark rounded-rect bg + bold symbol + strong outline so it
  // reads clearly at 24–48px. Colours follow each hero's palette.
  // -----------------------------------------------------------------------

  // Helper shared by all 12 icons: dark chip background.
  const chipBg = (g, accent) => {
    g.fillStyle(0x0d0c18, 1).fillRoundedRect(0, 0, 48, 48, 8);
    g.fillStyle(accent, 0.14).fillRoundedRect(3, 3, 42, 42, 6);
  };

  // ---- Lü Bu ----

  // PRIMARY: halberd_sweep — crescent slash arc (gold / crimson)
  bake(scene, 'abil_icon_halberd_sweep', 48, 48, (g) => {
    chipBg(g, 0xd4af37);
    const r = (deg) => (deg * Math.PI) / 180;
    const cx = 24, cy = 26;
    // dark outline arc
    g.lineStyle(7, 0x1a0e00, 1);
    g.beginPath(); g.arc(cx, cy, 18, r(-130), r(50), false); g.strokePath();
    // gold main arc
    g.lineStyle(4, 0xd4af37, 1);
    g.beginPath(); g.arc(cx, cy, 18, r(-130), r(50), false); g.strokePath();
    // bright highlight
    g.lineStyle(1.5, 0xfff280, 0.9);
    g.beginPath(); g.arc(cx, cy, 18, r(-110), r(30), false); g.strokePath();
    // blade tip at arc end
    const tipX = Math.round(cx + Math.cos(r(50)) * 18);
    const tipY = Math.round(cy + Math.sin(r(50)) * 18);
    g.fillStyle(0xff5252, 1);
    g.fillTriangle(tipX - 3, tipY - 3, tipX + 5, tipY + 1, tipX - 1, tipY + 5);
    // haft stub (diagonal line from arc start toward bottom-left)
    const haftX = Math.round(cx + Math.cos(r(-130)) * 18);
    const haftY = Math.round(cy + Math.sin(r(-130)) * 18);
    g.lineStyle(3, 0x8a6020, 1);
    g.beginPath(); g.moveTo(haftX, haftY); g.lineTo(haftX - 6, haftY + 8); g.strokePath();
  });

  // SECONDARY: thrust_sky — piercing lance thrust (gold lance pointing right/up)
  bake(scene, 'abil_icon_thrust_sky', 48, 48, (g) => {
    chipBg(g, 0xffe08a);
    // dark outline shaft (diagonal, bottom-left to top-right)
    g.fillStyle(0x1a0e00, 1);
    g.fillRect(6, 27, 30, 6);          // shaft outline
    g.fillTriangle(33, 20, 43, 30, 33, 40); // head outline
    // gold shaft
    g.fillStyle(0xd4af37, 1);
    g.fillRect(7, 28, 28, 4);
    // crimson spearhead
    g.fillStyle(0xff5252, 1);
    g.fillTriangle(34, 22, 42, 30, 34, 38);
    // spearhead highlight
    g.fillStyle(0xffd27a, 1);
    g.fillTriangle(34, 25, 40, 30, 34, 30);
    // butt ferrule (small rect at left end)
    g.fillStyle(0xd4af37, 1);
    g.fillRect(6, 27, 4, 6);
    // speed lines behind the shaft (motion)
    g.lineStyle(1, 0xffe08a, 0.55);
    g.beginPath(); g.moveTo(4, 24); g.lineTo(18, 24); g.strokePath();
    g.beginPath(); g.moveTo(4, 36); g.lineTo(16, 36); g.strokePath();
  });

  // ULTIMATE: warcry — war-cry shockwave / horn (crimson shockwave rings)
  bake(scene, 'abil_icon_warcry', 48, 48, (g) => {
    chipBg(g, 0xff5252);
    const cx = 24, cy = 24;
    // three expanding shockwave arcs (semi-circle, left-open)
    for (let i = 0; i < 3; i++) {
      const r2 = 8 + i * 6;
      const alpha = 1 - i * 0.22;
      g.lineStyle(3 - i * 0.5, 0xff5252, alpha);
      g.beginPath(); g.arc(cx, cy, r2, -Math.PI * 0.65, Math.PI * 0.65, false); g.strokePath();
    }
    // horn silhouette (a bold curved horn glyph)
    g.fillStyle(0xd4af37, 1);
    // horn bell (wide end, right side)
    g.fillTriangle(28, 16, 40, 20, 40, 28);
    g.fillTriangle(28, 32, 40, 20, 40, 28);
    // horn tube (narrowing to left)
    g.fillRect(14, 22, 16, 4);
    // mouthpiece (small circle, leftmost)
    g.fillCircle(14, 24, 4);
    g.fillStyle(0x1a0e00, 1); g.fillCircle(14, 24, 2.5);
    g.fillStyle(0xffe08a, 1); g.fillCircle(14, 24, 1.5);
    // bright highlight on horn bell
    g.fillStyle(0xfff0b0, 0.7);
    g.fillTriangle(30, 18, 38, 22, 30, 22);
  });

  // ---- Oda Nobunaga ----

  // PRIMARY: matchlock_volley — piercing musket round (steel/gold bullet)
  bake(scene, 'abil_icon_matchlock_volley', 48, 48, (g) => {
    chipBg(g, 0xffe08a);
    // musket barrel (horizontal, steel grey)
    g.fillStyle(0x1a1820, 1);
    g.fillRect(4, 19, 30, 10);   // barrel outline
    g.fillStyle(0x8a8698, 1);
    g.fillRect(5, 20, 28, 8);    // barrel body
    g.fillStyle(0xbbbac6, 1);
    g.fillRect(6, 21, 26, 3);    // highlight on top
    // muzzle flash (bright starburst at right end)
    g.fillStyle(0xffe08a, 1);
    g.fillCircle(36, 24, 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(36, 24, 3);
    // flash rays
    g.lineStyle(2, 0xffc060, 0.9);
    g.beginPath(); g.moveTo(36, 24); g.lineTo(44, 17); g.strokePath();
    g.beginPath(); g.moveTo(36, 24); g.lineTo(44, 24); g.strokePath();
    g.beginPath(); g.moveTo(36, 24); g.lineTo(44, 31); g.strokePath();
    // piercing bullet trail (to the right of muzzle)
    g.fillStyle(0xffe08a, 0.7);
    g.fillRect(38, 22, 8, 4);
    // stock hint (left side, wood-colored rect)
    g.fillStyle(0x7a4f25, 1);
    g.fillRect(2, 21, 6, 6);
  });

  // SECONDARY: scattershot — 3-round burst (3 pellets spreading out)
  bake(scene, 'abil_icon_scattershot', 48, 48, (g) => {
    chipBg(g, 0xffe08a);
    // small barrel hint (left side)
    g.fillStyle(0x8a8698, 1);
    g.fillRect(4, 21, 14, 6);
    // 3 pellet lines spreading right (top / center / bottom)
    const pellets = [
      { sx: 18, sy: 14, ex: 44, ey: 10 },
      { sx: 18, sy: 24, ex: 44, ey: 24 },
      { sx: 18, sy: 34, ex: 44, ey: 38 },
    ];
    for (const p2 of pellets) {
      // trail
      g.lineStyle(1.5, 0xffe08a, 0.45);
      g.beginPath(); g.moveTo(p2.sx, p2.sy); g.lineTo(p2.ex, p2.ey); g.strokePath();
      // pellet dot (bright filled circle at tip)
      g.fillStyle(0x1a1820, 1); g.fillCircle(p2.ex, p2.ey, 4.5);
      g.fillStyle(0xffe08a, 1); g.fillCircle(p2.ex, p2.ey, 3);
      g.fillStyle(0xffffff, 0.8); g.fillCircle(p2.ex - 1, p2.ey - 1, 1.2);
    }
    // muzzle dot
    g.fillStyle(0xffffff, 0.9); g.fillCircle(18, 24, 2.5);
  });

  // ULTIMATE: barrage — cannon bombardment (cannon + shells falling)
  bake(scene, 'abil_icon_barrage', 48, 48, (g) => {
    chipBg(g, 0xffc14d);
    // cannon barrel (pointing upper-right, dark iron)
    g.fillStyle(0x1a1820, 1);
    g.fillRect(4, 26, 24, 12);   // barrel outline
    g.fillStyle(0x3a3550, 1);
    g.fillRect(5, 27, 22, 10);
    g.fillStyle(0x8a86a0, 0.8);
    g.fillRect(6, 28, 20, 4);    // highlight
    // cannon wheels (two dark circles)
    g.fillStyle(0x1a1820, 1); g.fillCircle(10, 38, 5);
    g.fillStyle(0x3a3550, 1); g.fillCircle(10, 38, 3.5);
    g.fillStyle(0x1a1820, 1); g.fillCircle(22, 38, 5);
    g.fillStyle(0x3a3550, 1); g.fillCircle(22, 38, 3.5);
    // cannon balls falling (3, different sizes / positions)
    const balls = [{ x: 34, y: 12, r: 4 }, { x: 42, y: 22, r: 3.5 }, { x: 38, y: 32, r: 3 }];
    for (const b of balls) {
      g.fillStyle(0x1a1820, 1); g.fillCircle(b.x, b.y, b.r + 1);
      g.fillStyle(0x3a3550, 1); g.fillCircle(b.x, b.y, b.r);
      g.fillStyle(0x8a86a0, 0.7); g.fillCircle(b.x - 1, b.y - 1, b.r * 0.5);
      // fuse spark
      g.fillStyle(0xffd27a, 1); g.fillCircle(b.x + b.r - 1, b.y - b.r + 1, 1.2);
    }
    // muzzle flash
    g.fillStyle(0xffc14d, 1); g.fillCircle(27, 27, 5);
    g.fillStyle(0xffffff, 1); g.fillCircle(27, 27, 2.5);
  });

  // ---- Belisarius ----

  // PRIMARY: greek_fire — lobbed fire pot (arcing flame pot)
  bake(scene, 'abil_icon_greek_fire', 48, 48, (g) => {
    chipBg(g, 0xff7b1c);
    // pot body (dark ceramic jug)
    g.fillStyle(0x1a0500, 1); g.fillCircle(22, 32, 12);
    g.fillStyle(0x5a3010, 1); g.fillCircle(22, 32, 10);
    g.fillStyle(0x7a5030, 1); g.fillCircle(22, 32, 8);
    g.fillStyle(0xc08040, 0.6); g.fillCircle(20, 30, 4); // highlight
    // pot neck & mouth
    g.fillStyle(0x5a3010, 1); g.fillRect(19, 20, 6, 8);
    g.fillStyle(0x7a5030, 1); g.fillRect(18, 19, 8, 4);
    // arc trajectory (dashed curve from left to right-up)
    g.lineStyle(1.5, 0xff7b1c, 0.6);
    g.beginPath(); g.arc(34, 20, 16, Math.PI * 0.7, Math.PI * 1.5, true); g.strokePath();
    // flame eruption from pot mouth
    g.fillStyle(0xff6a00, 1);
    g.fillTriangle(19, 20, 29, 20, 24, 10);
    g.fillStyle(0xffcc00, 1);
    g.fillTriangle(21, 20, 27, 20, 24, 12);
    g.fillStyle(0xffffff, 0.8); g.fillCircle(24, 14, 2);
    // impact splash hint (right side)
    g.fillStyle(0xff6a00, 0.75);
    g.fillCircle(40, 30, 6);
    g.fillStyle(0xffcc00, 0.7);
    g.fillCircle(40, 30, 3);
  });

  // SECONDARY: fireburst — radial fire nova (ring of flame)
  bake(scene, 'abil_icon_fireburst', 48, 48, (g) => {
    chipBg(g, 0xff7b1c);
    const cx = 24, cy = 24;
    // outer flame ring (8 rays)
    g.fillStyle(0xff6a00, 1);
    for (let i = 0; i < 8; i++) {
      const a = (Math.PI / 4) * i;
      const rx = cx + Math.cos(a) * 19, ry = cy + Math.sin(a) * 19;
      const ax = cx + Math.cos(a - 0.3) * 13, ay = cy + Math.sin(a - 0.3) * 13;
      const bx = cx + Math.cos(a + 0.3) * 13, by = cy + Math.sin(a + 0.3) * 13;
      g.fillTriangle(Math.round(ax), Math.round(ay), Math.round(rx), Math.round(ry), Math.round(bx), Math.round(by));
    }
    // mid ring (yellow-orange)
    g.lineStyle(3, 0xffb347, 0.85);
    g.strokeCircle(cx, cy, 12);
    // hot inner core
    g.fillStyle(0xffcc00, 1); g.fillCircle(cx, cy, 7);
    g.fillStyle(0xffffff, 0.9); g.fillCircle(cx - 1, cy - 1, 3);
    // purple arc hint (Byzantine accent)
    g.lineStyle(1.5, 0x9b6bff, 0.55);
    g.beginPath(); g.arc(cx, cy, 16, -Math.PI * 0.4, Math.PI * 0.4, false); g.strokePath();
  });

  // ULTIMATE: cataphract — armored horse charge (charging horseman silhouette)
  bake(scene, 'abil_icon_cataphract', 48, 48, (g) => {
    chipBg(g, 0x9b6bff);
    // horse body (large filled ellipse, dark purple-grey)
    g.fillStyle(0x1a1228, 1); g.fillEllipse(26, 30, 32, 18);
    g.fillStyle(0x4a3870, 1); g.fillEllipse(26, 30, 28, 14);
    // horse legs (4 short rects angled for gallop)
    g.fillStyle(0x3a2858, 1);
    g.fillRect(12, 36, 4, 8); g.fillRect(20, 38, 4, 7);
    g.fillRect(30, 36, 4, 8); g.fillRect(38, 34, 4, 9);
    // horse neck + head
    g.fillStyle(0x1a1228, 1); g.fillEllipse(12, 22, 12, 18);
    g.fillStyle(0x4a3870, 1); g.fillEllipse(12, 22, 9, 14);
    // mane (small vertical strokes)
    g.fillStyle(0x9b6bff, 1);
    g.fillRect(8, 14, 3, 10);
    // rider torso (purple armor)
    g.fillStyle(0x1a1228, 1); g.fillRect(16, 12, 14, 16);
    g.fillStyle(0x6a3fb0, 1); g.fillRect(17, 13, 12, 14);
    g.fillStyle(0xd4af37, 1); g.fillRect(18, 13, 10, 3); // gold gorget
    // rider helmet
    g.fillStyle(0x1a1228, 1); g.fillRect(19, 6, 8, 8);
    g.fillStyle(0x8a6ad8, 1); g.fillRect(20, 7, 6, 6);
    g.fillStyle(0xd4af37, 0.7); g.fillRect(19, 6, 8, 2); // crest
    // couched lance (long diagonal, upper-right)
    g.fillStyle(0x1a0e00, 1);
    g.fillRect(20, 8, 28, 5);    // lance outline (pointing right)
    g.fillStyle(0x8a6020, 1);
    g.fillRect(21, 9, 24, 3);    // wooden shaft
    g.fillStyle(0xd4af37, 1);
    g.fillTriangle(43, 8, 48, 10.5, 43, 13); // lance tip
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(22, 9.5, 18, 1); // glint
    // motion lines (speed)
    g.lineStyle(2, 0x9b6bff, 0.45);
    g.beginPath(); g.moveTo(2, 22); g.lineTo(10, 22); g.strokePath();
    g.beginPath(); g.moveTo(2, 28); g.lineTo(8, 28); g.strokePath();
    g.beginPath(); g.moveTo(2, 34); g.lineTo(12, 34); g.strokePath();
  });

  // ---- Gilgamesh ----

  // PRIMARY: divine_arsenal — orbiting golden swords (2 crossing swords in orbit)
  bake(scene, 'abil_icon_divine_arsenal', 48, 48, (g) => {
    chipBg(g, 0xffd700);
    const cx = 24, cy = 24;
    // orbit ring (faint gold circle)
    g.lineStyle(1.5, 0xd4af37, 0.4);
    g.strokeCircle(cx, cy, 17);
    // draw two crossed swords at ±45° angles
    const sword = (angle) => {
      const cos = Math.cos(angle), sin = Math.sin(angle);
      // blade (narrow elongated triangle along the angle direction)
      const len = 14, tipX = cx + cos * len, tipY = cy + sin * len;
      const baseX = cx - cos * 5, baseY = cy - sin * 5;
      const perpX = -sin * 2.5, perpY = cos * 2.5;
      // dark outline
      g.fillStyle(0x1a0e00, 1);
      g.fillTriangle(
        Math.round(baseX + perpX * 1.4), Math.round(baseY + perpY * 1.4),
        Math.round(tipX), Math.round(tipY),
        Math.round(baseX - perpX * 1.4), Math.round(baseY - perpY * 1.4),
      );
      // gold blade
      g.fillStyle(0xffd700, 1);
      g.fillTriangle(
        Math.round(baseX + perpX), Math.round(baseY + perpY),
        Math.round(tipX), Math.round(tipY),
        Math.round(baseX - perpX), Math.round(baseY - perpY),
      );
      // fuller highlight
      g.fillStyle(0xfff070, 1);
      g.fillTriangle(
        Math.round(baseX), Math.round(baseY),
        Math.round(tipX), Math.round(tipY),
        Math.round(cx + cos * (len - 4)), Math.round(cy + sin * (len - 4)),
      );
      // guard (perpendicular bar — drawn as a filled quad via two triangles)
      const guardW = 5;
      const gx = baseX + cos * 2.5, gy = baseY + sin * 2.5;
      g.fillStyle(0xd4af37, 1);
      // 4 corners of the guard bar
      const gx0 = Math.round(gx - perpX * guardW), gy0 = Math.round(gy - perpY * guardW);
      const gx1 = Math.round(gx + perpX * guardW), gy1 = Math.round(gy + perpY * guardW);
      const gx2 = Math.round(gx + perpX * guardW + cos * 2), gy2 = Math.round(gy + perpY * guardW + sin * 2);
      const gx3 = Math.round(gx - perpX * guardW + cos * 2), gy3 = Math.round(gy - perpY * guardW + sin * 2);
      g.fillTriangle(gx0, gy0, gx1, gy1, gx2, gy2);
      g.fillTriangle(gx0, gy0, gx2, gy2, gx3, gy3);
      // grip (line from base toward grip end)
      g.lineStyle(3, 0x7a4010, 1);
      g.beginPath();
      g.moveTo(Math.round(baseX), Math.round(baseY));
      g.lineTo(Math.round(baseX - cos * 5), Math.round(baseY - sin * 5));
      g.strokePath();
    };
    sword(Math.PI * 0.25);   // upper-right sword
    sword(Math.PI * 1.25);   // lower-left sword
    // centre glow dot
    g.fillStyle(0xfff8a0, 1); g.fillCircle(cx, cy, 3);
  });

  // SECONDARY: gate_spear — fan of golden spears (3 spears fanning out)
  bake(scene, 'abil_icon_gate_spear', 48, 48, (g) => {
    chipBg(g, 0xffd700);
    // 5 golden spears fanning from bottom-left toward upper-right
    const angles = [-0.55, -0.28, 0, 0.28, 0.55];  // radians from straight-right
    const baseAngle = -0.4; // overall fan direction (upper-right)
    for (let i = 0; i < angles.length; i++) {
      const a = baseAngle + angles[i];
      const cos = Math.cos(a), sin = Math.sin(a);
      const ox = 10, oy = 38;
      const len = 32;
      const tipX = ox + cos * len, tipY = oy + sin * len;
      const perp = 1.5;
      const perpX = -sin * perp, perpY = cos * perp;
      const alpha = i === 2 ? 1 : 0.75; // centre spear brightest
      // shaft
      g.fillStyle(0xd4af37, alpha);
      g.fillRect(
        Math.round(ox + perpX - cos * 2), Math.round(oy + perpY - sin * 2),
        Math.round(cos * (len - 5) - perpX * 0 + 1), Math.round(sin * (len - 5) + 1),
      );
      // dark outline
      g.lineStyle(1, 0x1a0e00, alpha);
      g.beginPath(); g.moveTo(ox - perpX * 2, oy - perpY * 2); g.lineTo(ox + perpX * 2, oy + perpY * 2); g.strokePath();
      // actual shaft (line from base to tip)
      g.lineStyle(2.5, 0xd4af37, alpha);
      g.beginPath(); g.moveTo(ox, oy); g.lineTo(Math.round(tipX - cos * 5), Math.round(tipY - sin * 5)); g.strokePath();
      // spearhead (golden triangle at tip)
      g.fillStyle(0xffd700, alpha);
      g.fillTriangle(
        Math.round(tipX - cos * 7 + perpX * 3), Math.round(tipY - sin * 7 + perpY * 3),
        Math.round(tipX), Math.round(tipY),
        Math.round(tipX - cos * 7 - perpX * 3), Math.round(tipY - sin * 7 - perpY * 3),
      );
      // highlight on spearhead
      g.fillStyle(0xfff8a0, alpha * 0.9);
      g.fillTriangle(
        Math.round(tipX - cos * 6 + perpX), Math.round(tipY - sin * 6 + perpY),
        Math.round(tipX - 1), Math.round(tipY - 1),
        Math.round(tipX - cos * 4), Math.round(tipY - sin * 4),
      );
    }
    // gate portal hint (small arch outline at origin)
    g.lineStyle(2, 0xffd700, 0.5);
    g.beginPath(); g.arc(10, 38, 8, -Math.PI, 0, false); g.strokePath();
  });

  // ULTIMATE: meteors — falling meteor (comet with tail)
  bake(scene, 'abil_icon_meteors', 48, 48, (g) => {
    chipBg(g, 0xffd34d);
    // comet tail (gradient lines from top-left to lower-right)
    const tailLines = [
      { x1: 8, y1: 6, x2: 26, y2: 24, w: 4, a: 0.55 },
      { x1: 10, y1: 4, x2: 28, y2: 22, w: 2.5, a: 0.35 },
      { x1: 6, y1: 8, x2: 24, y2: 26, w: 2, a: 0.25 },
    ];
    for (const l of tailLines) {
      g.lineStyle(l.w, 0xffd34d, l.a);
      g.beginPath(); g.moveTo(l.x1, l.y1); g.lineTo(l.x2, l.y2); g.strokePath();
    }
    // outer glow halo
    g.fillStyle(0xff9a30, 0.35); g.fillCircle(32, 28, 14);
    // rock body (dark, slightly irregular circle)
    g.fillStyle(0x1a0e00, 1); g.fillCircle(32, 28, 12);
    g.fillStyle(0x3a2010, 1); g.fillCircle(32, 28, 10);
    g.fillStyle(0x5a3820, 1); g.fillCircle(32, 28, 8);
    // molten cracks / glow on surface
    g.fillStyle(0xff6a00, 0.8); g.fillCircle(29, 25, 4);
    g.fillStyle(0xffd34d, 0.9); g.fillCircle(28, 24, 2.5);
    g.fillStyle(0xffffff, 0.85); g.fillCircle(27, 23, 1.2);
    // impact crater hint (small dark circle lower-left on rock)
    g.fillStyle(0x1a0e00, 0.7); g.fillCircle(35, 32, 3);
    // secondary small meteor (upper-left, faint)
    g.fillStyle(0xff9a30, 0.45); g.fillCircle(14, 14, 5);
    g.fillStyle(0x3a2010, 1); g.fillCircle(14, 14, 3.5);
    g.fillStyle(0xffd34d, 0.7); g.fillCircle(13, 13, 1.5);
  });

  // charging lance projectile (tinted at spawn)
  bake(scene, 'abil_lance', 64, 22, (g) => {
    g.fillStyle(0xffffff, 1);
    g.fillTriangle(0, 11, 44, 2, 44, 20); // shaft
    g.fillTriangle(44, 2, 64, 11, 44, 20); // head
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(6, 9, 38, 4);
  });

  // --- Power-up orbs (also used as HUD buff icons) ---
  const powerChip = (key, color, draw) =>
    bake(scene, key, 48, 48, (g) => {
      g.fillStyle(0x101018, 1).fillRoundedRect(0, 0, 48, 48, 8);
      g.fillStyle(color, 0.25).fillCircle(24, 24, 20);
      g.fillStyle(color, 1);
      draw(g);
    });
  powerChip('pu_atk', 0xff5252, (g) => { // sword
    g.fillTriangle(24, 8, 20, 30, 28, 30);
    g.fillRect(18, 30, 12, 4);
    g.fillRect(22, 34, 4, 8);
  });
  powerChip('pu_def', 0x5aa0ff, (g) => { // shield
    g.fillTriangle(24, 40, 10, 14, 38, 14);
    g.fillRect(10, 12, 28, 6);
  });
  powerChip('pu_spd', 0x66dd88, (g) => { // lightning bolt
    g.fillTriangle(26, 8, 14, 28, 24, 26);
    g.fillTriangle(22, 40, 34, 20, 24, 22);
  });
  powerChip('pu_invuln', 0xffd34d, (g) => { // star
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = (Math.PI / 5) * i - Math.PI / 2;
      const r = i % 2 === 0 ? 16 : 7;
      pts.push({ x: 24 + Math.cos(a) * r, y: 24 + Math.sin(a) * r });
    }
    g.fillPoints(pts, true);
  });
}

// Faint civilization silhouette used as the parallax motif tile.
function drawMotif(g, civ, color) {
  g.fillStyle(color, 0.55);
  const at = (cx, cy, fn) => fn(cx, cy);
  switch (civ) {
    case 'china': // pagoda + banner
      at(50, 60, (x, y) => {
        g.fillRect(x - 22, y + 40, 44, 8);
        g.fillRect(x - 16, y + 20, 32, 20);
        g.fillTriangle(x - 26, y + 20, x + 26, y + 20, x, y + 2);
        g.fillRect(x - 3, y - 30, 6, 32); // pole
      });
      at(150, 150, (x, y) => {
        g.fillRect(x - 3, y - 20, 6, 60);
        g.fillRect(x, y - 20, 22, 30); // banner
      });
      break;
    case 'japan': // torii gate
      at(60, 70, (x, y) => {
        g.fillRect(x - 30, y, 60, 7);
        g.fillRect(x - 36, y - 12, 72, 8);
        g.fillRect(x - 22, y + 7, 7, 50);
        g.fillRect(x + 15, y + 7, 7, 50);
      });
      at(150, 150, (x, y) => {
        g.fillRect(x - 18, y, 36, 5);
        g.fillRect(x - 12, y + 5, 5, 32);
        g.fillRect(x + 7, y + 5, 5, 32);
      });
      break;
    case 'byzantium': // column + arch
      at(55, 60, (x, y) => {
        g.fillRect(x - 8, y, 16, 70);
        g.fillRect(x - 14, y - 6, 28, 8);
        g.fillRect(x - 14, y + 70, 28, 8);
      });
      at(150, 150, (x, y) => {
        g.fillRect(x - 24, y + 16, 8, 30);
        g.fillRect(x + 16, y + 16, 8, 30);
        g.slice(x, y + 16, 24, Math.PI, Math.PI * 2, false);
        g.fillPath();
      });
      break;
    case 'sumer': // ziggurat steps
      at(60, 70, (x, y) => {
        g.fillRect(x - 36, y + 44, 72, 12);
        g.fillRect(x - 26, y + 28, 52, 16);
        g.fillRect(x - 16, y + 12, 32, 16);
        g.fillRect(x - 7, y, 14, 12);
      });
      at(155, 155, (x, y) => {
        g.fillRect(x - 20, y + 16, 40, 8);
        g.fillRect(x - 13, y + 6, 26, 10);
      });
      break;
    case 'rome': // Roman temple (columns + pediment) + aquila standard
      at(55, 80, (x, y) => {
        // temple base
        g.fillRect(x - 36, y + 52, 72, 8);
        // row of 5 columns
        for (let i = 0; i < 5; i++) g.fillRect(x - 30 + i * 14, y, 6, 52);
        // pediment (triangular gable)
        g.fillTriangle(x - 38, y, x + 38, y, x, y - 22);
      });
      at(155, 140, (x, y) => {
        // aquila standard: vertical pole + horizontal crossbar + eagle block on top
        g.fillRect(x - 2, y - 30, 5, 60); // pole
        g.fillRect(x - 14, y - 10, 30, 5); // crossbar (SPQR bar)
        g.fillRect(x - 8, y - 30, 17, 12); // eagle silhouette block
        g.fillTriangle(x - 8, y - 30, x + 9, y - 30, x, y - 44); // eagle head/wings hint
      });
      break;
    case 'macedon': // phalanx sarissa lines + Vergina sunburst
      at(60, 100, (x, y) => {
        // row of tall vertical sarissa lines (spear formation)
        for (let i = 0; i < 7; i++) g.fillRect(x - 36 + i * 12, y - 50, 4, 90);
        // spear butts — short base
        g.fillRect(x - 38, y + 38, 76, 5);
      });
      at(150, 148, (x, y) => {
        // Vergina sunburst: 8 short radiating lines from centre
        for (let i = 0; i < 8; i++) {
          const a = (Math.PI / 4) * i;
          g.fillRect(
            Math.round(x + Math.cos(a) * 6) - 2,
            Math.round(y + Math.sin(a) * 6) - 2,
            Math.round(Math.cos(a) * 16) + 4,
            Math.round(Math.sin(a) * 16) + 4,
          );
        }
        g.fillRect(x - 4, y - 4, 8, 8); // centre dot
      });
      break;
    case 'mongolia': // yurt (half-dome + door) + tug banner (pole + hanging strands)
      at(60, 110, (x, y) => {
        // yurt base rectangle
        g.fillRect(x - 30, y, 60, 22);
        // dome (upper half-circle approximated as stacked rects)
        g.fillRect(x - 28, y - 10, 56, 12);
        g.fillRect(x - 22, y - 20, 44, 12);
        g.fillRect(x - 14, y - 28, 28, 10);
        g.fillRect(x - 6, y - 33, 12, 7);
        // door opening (small cutout — drawn darker but we just skip it; keep simple)
        g.fillRect(x - 8, y + 4, 16, 18); // door recess slightly darker via overlap
      });
      at(150, 140, (x, y) => {
        // tug banner: vertical pole with short horizontal hanging strands
        g.fillRect(x - 2, y - 38, 5, 60); // pole
        for (let i = 0; i < 5; i++) g.fillRect(x + 3, y - 34 + i * 8, 18, 4); // strands
      });
      break;
    case 'norse': // longship (curved hull + prow + mast) + runestone
    default:
      at(55, 110, (x, y) => {
        // longship hull (wide flat body)
        g.fillRect(x - 38, y, 76, 16);
        // curved prow (triangle pointing right)
        g.fillTriangle(x + 38, y + 8, x + 58, y - 6, x + 38, y + 16);
        // stern (smaller triangle)
        g.fillTriangle(x - 38, y, x - 52, y + 4, x - 38, y + 14);
        // mast (vertical) + sail hint (rectangle)
        g.fillRect(x - 2, y - 34, 5, 36); // mast
        g.fillRect(x - 14, y - 30, 28, 20); // sail
        // dragon prow spike
        g.fillTriangle(x + 55, y - 8, x + 68, y - 18, x + 56, y - 2);
      });
      at(155, 155, (x, y) => {
        // runestone: tall narrow rectangle with rounded top
        g.fillRect(x - 9, y - 40, 18, 60);
        g.fillTriangle(x - 9, y - 40, x + 9, y - 40, x, y - 52); // rounded top hint
        // simple rune cross-lines
        g.fillRect(x - 9, y - 20, 18, 4);
        g.fillRect(x - 9, y - 4, 18, 4);
      });
      break;
  }
}
