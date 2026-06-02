import Phaser from 'phaser';
import { remainingCivs, CIV_NAME, CIV_ORDER } from '../data/campaign.js';
import { getTheme } from '../data/themes.js';
import { getMap } from '../data/maps.js';
import { getCharacter } from '../data/characters.js';
import { getArtifact } from '../data/artifacts.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/AudioManager.js';
import { drawPanel } from '../art/ui.js';

// Signature props that make each battlefield preview recognisable (back → front).
const PREVIEW_PROPS = {
  china: ['decor_cn_tree', 'decor_cn_banner', 'decor_cn_vase'],
  japan: ['decor_jp_cherry', 'decor_jp_torii', 'decor_jp_lantern'],
  byzantium: ['decor_bz_column', 'decor_bz_statue', 'decor_bz_urn'],
  sumer: ['decor_sm_palm', 'decor_sm_obelisk', 'decor_sm_pot'],
  rome: ['decor_rm_column', 'decor_rm_statue', 'decor_rm_cypress'],
  macedon: ['decor_mc_column', 'decor_mc_olive', 'decor_mc_shield'],
  mongolia: ['decor_mn_yurt', 'decor_mn_banner', 'decor_mn_grass'],
  norse: ['decor_no_runestone', 'decor_no_pine', 'decor_no_longship'],
  default: ['decor_rubble', 'decor_grass'],
};

// Between stages: choose which remaining civilization to invade next. When none
// remain, advance to the final stage automatically.
export default class ConquestScene extends Phaser.Scene {
  constructor() {
    super('ConquestScene');
  }

  create() {
    const run = this.registry.get('run');
    const champ = getCharacter(run.characterId);
    const { width, height } = this.scale;

    const remaining = remainingCivs(run);
    if (remaining.length === 0) {
      // all civilizations conquered — on to the final stage (via contracts)
      run.final = true;
      run.stageTime = 0;
      run.bossPhase = 0;
      this.registry.set('run', run);
      Save.save(run);
      this.scene.start('ContractScene');
      return;
    }

    this.add.text(width / 2, 36, 'CHOOSE YOUR CONQUEST', {
      fontFamily: 'monospace', fontSize: '34px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 74,
      `${champ.name} — ${run.conquered.length} of ${CIV_ORDER.length - 1} lands conquered`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#c9c4e0',
      }).setOrigin(0.5);

    // carried artifacts
    if (run.artifacts.length) {
      this.add.text(width / 2, 98, `Artifacts: ${run.artifacts.map((id) => getArtifact(id).name).join('  •  ')}`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#ffd27a', align: 'center', wordWrap: { width: width - 80 },
      }).setOrigin(0.5);
    }

    const cardW = 220;
    const gap = 22;
    const cardH = 280;
    const cy = height / 2 + 30;

    // Paged carousel: fit as many cards as possible per page with room for arrows.
    const perPage = Math.max(1, Math.floor((width - 80) / (cardW + gap)));
    const pages = Math.ceil(remaining.length / perPage);
    this._page = 0;
    this._pageObjs = [];

    const renderPage = () => {
      this._pageObjs.forEach((o) => o.destroy());
      this._pageObjs = [];
      const start = this._page * perPage;
      const slice = remaining.slice(start, start + perPage);
      const totalW = slice.length * cardW + (slice.length - 1) * gap;
      const startX = (width - totalW) / 2 + cardW / 2;
      slice.forEach((civ, j) => {
        const objs = this.buildCard(startX + j * (cardW + gap), cy, cardW, civ, start + j);
        this._pageObjs.push(...objs);
      });
      if (this._pageLabel) {
        this._pageLabel.setText(pages > 1 ? `Page ${this._page + 1} / ${pages}` : '');
      }
      if (this._arrowL) this._arrowL.setVisible(pages > 1);
      if (this._arrowR) this._arrowR.setVisible(pages > 1);
    };

    const changePage = (d) => {
      this._page = (this._page + d + pages) % pages;
      renderPage();
    };

    if (pages > 1) {
      this._arrowL = this.add.text(28, cy, '◀', {
        fontFamily: 'monospace', fontSize: '40px', color: '#ffd27a',
      }).setOrigin(0.5).setDepth(50).setInteractive({ useHandCursor: true });
      this._arrowR = this.add.text(width - 28, cy, '▶', {
        fontFamily: 'monospace', fontSize: '40px', color: '#ffd27a',
      }).setOrigin(0.5).setDepth(50).setInteractive({ useHandCursor: true });
      this._arrowL.on('pointerover', () => this._arrowL.setColor('#ffffff'));
      this._arrowL.on('pointerout', () => this._arrowL.setColor('#ffd27a'));
      this._arrowR.on('pointerover', () => this._arrowR.setColor('#ffffff'));
      this._arrowR.on('pointerout', () => this._arrowR.setColor('#ffd27a'));
      this._arrowL.on('pointerdown', () => changePage(-1));
      this._arrowR.on('pointerdown', () => changePage(1));
      // Page label just below the cards, above the bottom hint
      this._pageLabel = this.add.text(width / 2, cy + cardH / 2 + 18, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#7d7896',
      }).setOrigin(0.5);
    }

    renderPage();

    this.add.text(width / 2, height - 24, `Press 1–${remaining.length} or click a land to invade`, {
      fontFamily: 'monospace', fontSize: '13px', color: '#7d7896',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= remaining.length) this.start(remaining[n - 1]);
    });
    // Arrow keys flip pages
    this.input.keyboard.on('keydown-LEFT', () => changePage(-1));
    this.input.keyboard.on('keydown-RIGHT', () => changePage(1));
    // Backspace / Delete = back to character select
    this.input.keyboard.addCapture('BACKSPACE,DELETE');
    const back = () => this.scene.start('MenuScene');
    this.input.keyboard.on('keydown-BACKSPACE', back);
    this.input.keyboard.on('keydown-DELETE', back);
  }

  buildCard(cx, cy, w, civ, i) {
    const h = 280;
    const top = cy - h / 2;
    const theme = getTheme(civ);
    const map = getMap(civ);

    const objs = [];
    const reg = (o) => { objs.push(o); return o; };

    const g = reg(this.add.graphics());
    drawPanel(g, cx - w / 2, top, w, h, theme.accent, { fill: theme.ground, header: 30 });

    // Inline drawMapPreview so all created objects flow through reg and are
    // destroyed on page teardown (drawMapPreview adds to scene without returning).
    const rx = cx - w / 2 + 14;
    const ry = top + 44;
    const pw = w - 28;
    const ph = 82;
    const civId = theme.id;
    const maskG = this.make.graphics({ add: false });
    maskG.fillStyle(0xffffff).fillRect(rx, ry, pw, ph);
    const mask = maskG.createGeometryMask();
    const groundKey = this.textures.exists(`bg_ground_${civId}`) ? `bg_ground_${civId}` : 'bg_ground_default';
    reg(this.add.tileSprite(rx, ry, pw, ph, groundKey)).setOrigin(0).setMask(mask);
    const props = PREVIEW_PROPS[civId] || PREVIEW_PROPS.default;
    const spots = [[0.26, 0.96, 0.92], [0.56, 1.0, 0.78], [0.82, 0.94, 0.86]];
    props.forEach((key, idx) => {
      const spot = spots[idx];
      if (!spot || !this.textures.exists(key)) return;
      reg(this.add.image(rx + pw * spot[0], ry + ph * spot[1], key))
        .setOrigin(0.5, 1).setScale(spot[2]).setMask(mask);
    });
    reg(this.add.graphics()).lineStyle(1, theme.accent, 0.7).strokeRect(rx, ry, pw, ph);
    // maskG is not added to the scene display list but needs cleanup
    objs.push(maskG);

    reg(this.add.text(cx, top + 18, `${i + 1}. ${map.name}`, {
      fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
    })).setOrigin(0.5);
    reg(this.add.text(cx, top + 132, CIV_NAME[civ], {
      fontFamily: 'monospace', fontSize: '11px', color: theme.accentCss,
    })).setOrigin(0.5);
    reg(this.add.text(cx, top + 158, map.blurb, {
      fontFamily: 'monospace', fontSize: '11px', color: '#c9c4e0', align: 'center', wordWrap: { width: w - 24 },
    })).setOrigin(0.5, 0);

    const zone = reg(this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }));
    zone.on('pointerover', () => g.setAlpha(0.85));
    zone.on('pointerout', () => g.setAlpha(1));
    zone.on('pointerdown', () => this.start(civ));

    return objs;
  }

  start(civ) {
    Audio.resume();
    Audio.startMusic();
    const run = this.registry.get('run');
    run.currentCiv = civ;
    run.final = false;
    run.stageTime = 0;
    run.bossPhase = 0;
    this.registry.set('run', run);
    Save.save(run);
    this.scene.start('ContractScene');
  }
}
