import Phaser from 'phaser';
import { generatePlaceholders } from './art/placeholders.js';

// Sprite gallery. Unlike a static PNG viewer, this boots a hidden Phaser instance and
// runs the EXACT texture pipeline the game uses — load the AI sprites from
// sprites/index.json (mirroring BootScene, including the bg_ground skip), then
// generatePlaceholders() bakes every procedural texture (the 12 ability icons, attack
// FX, the organic ground, etc.). It then renders every resulting texture to the page,
// so the gallery shows what the game ACTUALLY uses, AI or procedural.

const GROUPS = [
  ['Characters', (k) => k.startsWith('char_')],
  ['Bosses', (k) => k.startsWith('boss_')],
  ['Enemies', (k) => k.startsWith('enemy_')],
  ['Ability icons', (k) => k.startsWith('abil_')], // abil_<id> (AI) + abil_icon_<id> (procedural)
  ['Upgrade / axis icons', (k) => k.startsWith('axis_')],
  ['Item icons', (k) => k.startsWith('icon_')],
  ['Projectiles', (k) => k.startsWith('proj_')],
  ['Decorations', (k) => k.startsWith('decor_')],
  ['Gameplay objects', (k) => /^(rock|block|crate|shrine)_/.test(k) || ['rock', 'pillar', 'crate', 'shrine', 'spikes', 'chest'].includes(k)],
  ['Backgrounds', (k) => k.startsWith('bg_')],
  ['UI', (k) => k.startsWith('ui_')],
  ['Effects & misc', () => true], // everything else
];
const INTERNAL = /^__|^_/; // Phaser internal textures (__DEFAULT, __MISSING, __WHITE…)

let bgMode = 'checker';
let zoom = 4;
const cards = [];

function render(scene) {
  const keys = scene.textures.getTextureKeys().filter((k) => !INTERNAL.test(k) && k !== '__spriteIndex').sort();
  document.getElementById('count').textContent = `${keys.length} sprites`;
  const main = document.getElementById('main');
  main.innerHTML = '';
  const used = new Set();
  for (const [title, match] of GROUPS) {
    const inGroup = keys.filter((k) => !used.has(k) && match(k));
    inGroup.forEach((k) => used.add(k));
    if (!inGroup.length) continue;
    const sec = document.createElement('section');
    sec.innerHTML = `<h2>${title} <span class="count">(${inGroup.length})</span></h2>`;
    const grid = document.createElement('div');
    grid.className = 'grid';
    for (const k of inGroup) grid.appendChild(card(scene, k));
    sec.appendChild(grid);
    main.appendChild(sec);
  }
}

function card(scene, key) {
  const src = scene.textures.get(key).getSourceImage(); // HTMLImageElement (AI) or Canvas (procedural)
  const w = src.width;
  const h = src.height;

  const c = document.createElement('div');
  c.className = 'card';
  const stage = document.createElement('div');
  stage.className = 'stage ' + bgMode;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(src, 0, 0);
  canvas.style.imageRendering = 'pixelated';
  canvas.style.width = w * zoom + 'px';
  canvas.style.height = h * zoom + 'px';
  stage.appendChild(canvas);

  const name = document.createElement('div');
  name.className = 'name';
  name.textContent = key;
  const dim = document.createElement('div');
  dim.className = 'dim';
  dim.textContent = `${w}×${h}`;
  c.append(stage, name, dim);
  c._canvas = canvas;
  c._w = w;
  c._h = h;
  c._stage = stage;
  cards.push(c);
  return c;
}

function wireControls() {
  document.querySelectorAll('button.bg').forEach((b) => {
    b.onclick = () => {
      document.querySelectorAll('button.bg').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      bgMode = b.dataset.bg;
      document.querySelectorAll('.stage').forEach((s) => { s.className = 'stage ' + bgMode; });
    };
  });
  document.getElementById('zoom').oninput = (e) => {
    zoom = +e.target.value;
    for (const c of cards) { c._canvas.style.width = c._w * zoom + 'px'; c._canvas.style.height = c._h * zoom + 'px'; }
  };
}

// Hidden Phaser instance — same load path as BootScene, then bake placeholders.
class GalleryScene extends Phaser.Scene {
  constructor() { super('GalleryScene'); }
  preload() {
    this.load.json('__spriteIndex', 'sprites/index.json');
    this.load.on('loaderror', () => {});
  }
  create() {
    const index = this.cache.json.get('__spriteIndex');
    const finish = () => { generatePlaceholders(this); render(this); wireControls(); };
    if (Array.isArray(index) && index.length) {
      index.filter((k) => !k.startsWith('bg_ground_')).forEach((k) => this.load.image(k, `sprites/${k}.png`));
      this.load.once('complete', finish);
      this.load.start();
    } else {
      finish();
    }
  }
}

// eslint-disable-next-line no-new
new Phaser.Game({
  type: Phaser.AUTO,
  width: 32,
  height: 32,
  parent: 'phaser-hidden',
  banner: false,
  audio: { noAudio: true },
  scene: [GalleryScene],
});
