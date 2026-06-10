import Phaser from 'phaser';
import { CONTRACTS } from '../data/contracts.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/AudioManager.js';
import { drawPanel } from '../art/ui.js';

// Optional pre-stage difficulty contracts. Toggle up to 3, then begin the
// invasion. Each active contract grants +1 artifact choice at the conquest.
const MAX_ACTIVE = 3;

export default class ContractScene extends Phaser.Scene {
  constructor() {
    super('ContractScene');
  }

  create() {
    const { width, height } = this.scale;
    this.selected = new Set();

    this.add.text(width / 2, 36, 'HEAT OF CONQUEST', {
      fontFamily: 'monospace', fontSize: '34px', color: '#ff7b3a', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, 74, `Bind up to ${MAX_ACTIVE} contracts — harder stage, richer spoils. Or take none.`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#c9c4e0',
    }).setOrigin(0.5);

    const cardW = 250;
    const gap = 16;
    const perRow = 3;
    const rows = Math.ceil(CONTRACTS.length / perRow);
    this.cards = [];
    CONTRACTS.forEach((c, i) => {
      const row = Math.floor(i / perRow);
      const col = i % perRow;
      const inRow = Math.min(perRow, CONTRACTS.length - row * perRow);
      const rowW = inRow * cardW + (inRow - 1) * gap;
      const startX = (width - rowW) / 2 + cardW / 2;
      const cx = startX + col * (cardW + gap);
      const cy = 150 + row * 150 + (rows === 1 ? 40 : 0);
      this.buildCard(cx, cy, cardW, c, i);
    });

    this.beginText = this.add.text(width / 2, height - 46, '[ Begin Invasion ]', {
      fontFamily: 'monospace', fontSize: '22px', color: '#9ef58b', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this.beginText.on('pointerdown', () => this.begin());

    this.add.text(width / 2, height - 18, 'Press 1–5 to toggle • Enter to begin', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7d7896',
    }).setOrigin(0.5);

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === 'Enter') { this.begin(); return; }
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= CONTRACTS.length) this.toggle(CONTRACTS[n - 1].id);
    });
    // Backspace / Delete = back to the land-select (Conquest) screen
    this.input.keyboard.addCapture('BACKSPACE,DELETE');
    const back = () => this.scene.start('ConquestScene');
    this.input.keyboard.on('keydown-BACKSPACE', back);
    this.input.keyboard.on('keydown-DELETE', back);
  }

  buildCard(cx, cy, w, c, i) {
    const h = 128;
    const top = cy - h / 2;
    const g = this.add.graphics();
    const ref = { c, g, cx, cy, w, h };
    this.cards.push(ref);
    // Small icon on the left side of the header
    const iconX = cx - w / 2 + 24;
    if (c.icon && this.textures.exists(c.icon)) {
      this.add.image(iconX, top + 20, c.icon).setScale(0.5);
    }
    this.add.text(cx + (c.icon ? 12 : 0), top + 12, `${i + 1}. ${c.name}`, {
      fontFamily: 'monospace', fontSize: '15px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    this.add.text(cx, top + 42, `− ${c.penalty}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ff8a8a', align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5, 0);
    this.add.text(cx, top + 84, `+ ${c.reward}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#9ef58b', align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5, 0);
    const zone = this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true });
    zone.on('pointerdown', () => this.toggle(c.id));
    this.drawCard(ref);
  }

  drawCard(ref) {
    const on = this.selected.has(ref.c.id);
    ref.g.clear();
    drawPanel(ref.g, ref.cx - ref.w / 2, ref.cy - ref.h / 2, ref.w, ref.h, on ? 0xff7b3a : 0x3a3556, { fill: on ? 0x2a1f14 : 0x1d1a2e, header: on ? 26 : 0, bracket: on });
  }

  toggle(id) {
    if (this.selected.has(id)) this.selected.delete(id);
    else if (this.selected.size < MAX_ACTIVE) this.selected.add(id);
    this.cards.forEach((r) => this.drawCard(r));
    Audio.sfx('pickup');
  }

  begin() {
    const run = this.registry.get('run');
    run.contracts = [...this.selected];
    run.artifactBonus = run.contracts.length; // +1 artifact choice per contract
    this.registry.set('run', run);
    Save.save(run);
    Audio.resume();
    Audio.startMusic();
    this.scene.start('GameScene');
  }
}
