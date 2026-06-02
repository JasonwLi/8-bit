// Shared procedural UI chrome. AI textures won't 9-slice cleanly (uneven borders,
// no transparent centre), and a tiling frame reveals seams — so panels are DRAWN, the
// same lesson as the ground/effects. drawPanel renders an ornate themed frame into a
// Phaser.Graphics at any rect: a shadowed body, a double accent border, and ornate
// corner brackets. The accent colour is passed in (use the civ theme's accent in-run,
// or a default gold on the menus) so the chrome is per-civ themed for free.

// Draw an ornate themed panel into graphics `g` at (x,y,w,h). `accent` is the trim
// colour. opts: { fill, alpha, radius, header (px header-strip height), bracket }.
export function drawPanel(g, x, y, w, h, accent, opts = {}) {
  const r = opts.radius ?? 10;
  const fill = opts.fill ?? 0x1d1a2e;
  const alpha = opts.alpha ?? 0.97;

  // drop shadow
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x + 4, y + 5, w, h, r);
  // body
  g.fillStyle(fill, alpha).fillRoundedRect(x, y, w, h, r);
  // faint accent sheen along the top (reads as a title bar when header is set)
  const hh = opts.header ?? 22;
  g.fillStyle(accent, opts.header ? 0.16 : 0.06).fillRoundedRect(x + 2, y + 2, w - 4, Math.min(h - 4, hh), Math.max(2, r - 2));

  // double frame: bold outer line + faint inset line
  g.lineStyle(2, accent, 1).strokeRoundedRect(x, y, w, h, r);
  g.lineStyle(1, accent, 0.35).strokeRoundedRect(x + 5, y + 5, w - 10, h - 10, Math.max(2, r - 4));

  // ornate corner brackets (a short accent angle just inside each corner)
  if (opts.bracket !== false) {
    const m = 11;
    const len = 13;
    g.lineStyle(2, accent, 0.9);
    const corner = (cx, cy, sx, sy) => {
      g.beginPath();
      g.moveTo(cx + sx * len, cy);
      g.lineTo(cx, cy);
      g.lineTo(cx, cy + sy * len);
      g.strokePath();
    };
    corner(x + m, y + m, 1, 1);
    corner(x + w - m, y + m, -1, 1);
    corner(x + m, y + h - m, 1, -1);
    corner(x + w - m, y + h - m, -1, -1);
  }
}

// Signature props that make each battlefield preview recognisable (back → front).
const PREVIEW_PROPS = {
  china: ['decor_cn_tree', 'decor_cn_banner', 'decor_cn_vase'],
  japan: ['decor_jp_cherry', 'decor_jp_torii', 'decor_jp_lantern'],
  byzantium: ['decor_bz_column', 'decor_bz_statue', 'decor_bz_urn'],
  sumer: ['decor_sm_palm', 'decor_sm_obelisk', 'decor_sm_pot'],
  rome:     ['decor_rm_column', 'decor_rm_statue', 'decor_rm_cypress'],
  macedon:  ['decor_mc_column', 'decor_mc_olive', 'decor_mc_shield'],
  mongolia: ['decor_mn_yurt', 'decor_mn_banner', 'decor_mn_grass'],
  norse:    ['decor_no_runestone', 'decor_no_pine', 'decor_no_longship'],
  default: ['decor_rubble', 'decor_grass'],
};

// Render a clipped mini-battlefield into the rect (rx,ry,pw,ph) on `scene`: the real
// procedural ground texture tiled to fill, plus the civ's signature props standing on
// it, masked to the window and bordered in the theme accent. Used by the map/conquest
// selection cards so each preview actually looks like the battlefield it represents.
export function drawMapPreview(scene, rx, ry, pw, ph, theme) {
  const civ = theme.id;
  const maskG = scene.make.graphics({ add: false });
  maskG.fillStyle(0xffffff).fillRect(rx, ry, pw, ph);
  const mask = maskG.createGeometryMask();

  const groundKey = scene.textures.exists(`bg_ground_${civ}`) ? `bg_ground_${civ}` : 'bg_ground_default';
  scene.add.tileSprite(rx, ry, pw, ph, groundKey).setOrigin(0).setMask(mask);

  const props = PREVIEW_PROPS[civ] || PREVIEW_PROPS.default;
  const spots = [[0.26, 0.96, 0.92], [0.56, 1.0, 0.78], [0.82, 0.94, 0.86]];
  props.forEach((key, idx) => {
    const spot = spots[idx];
    if (!spot || !scene.textures.exists(key)) return;
    scene.add.image(rx + pw * spot[0], ry + ph * spot[1], key).setOrigin(0.5, 1).setScale(spot[2]).setMask(mask);
  });

  scene.add.graphics().lineStyle(1, theme.accent, 0.7).strokeRect(rx, ry, pw, ph);
}

// A title banner ribbon centred on (cx, y): a tapered bar with accent trim, behind a
// title string. Returns nothing — draw your text on top afterwards.
export function drawBanner(g, cx, y, w, h, accent, opts = {}) {
  const fill = opts.fill ?? 0x1d1a2e;
  const x = cx - w / 2;
  const tab = Math.min(16, h / 2); // pointed ribbon ends
  g.fillStyle(0x000000, 0.3).fillRect(x, y + 4, w, h);
  // accent-coloured ribbon tails behind the body
  g.fillStyle(accent, 1);
  g.fillTriangle(x, y, x - tab, y + h / 2, x, y + h);
  g.fillTriangle(x + w, y, x + w + tab, y + h / 2, x + w, y + h);
  // body bar + accent trim top/bottom
  g.fillStyle(fill, 0.96).fillRect(x, y, w, h);
  g.lineStyle(2, accent, 1);
  g.lineBetween(x, y, x + w, y);
  g.lineBetween(x, y + h, x + w, y + h);
}
