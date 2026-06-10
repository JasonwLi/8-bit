import Phaser from 'phaser';
import { rollArtifacts } from '../data/artifacts.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/AudioManager.js';
import { drawPanel } from '../art/ui.js';

// After conquering a civilization, claim one permanent artifact to carry forward.
export default class ArtifactScene extends Phaser.Scene {
  constructor() {
    super('ArtifactScene');
  }

  create() {
    const { width, height } = this.scale;
    this._run = this.registry.get('run');
    Audio.sfx('bossdown');

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.9).setOrigin(0);
    this.add.text(width / 2, height / 2 - 180, 'SPOILS OF CONQUEST', {
      fontFamily: 'monospace', fontSize: '34px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.add.text(width / 2, height / 2 - 142, 'Claim one artifact to carry into the next land', {
      fontFamily: 'monospace', fontSize: '14px', color: '#c9c4e0',
    }).setOrigin(0.5);

    // one reroll per presentation
    this._rerolled = false;
    this._choices = rollArtifacts(3 + (this._run.artifactBonus || 0), this._run.artifacts);
    this._cardObjs = [];
    this._buildCards(width, height);

    this.input.keyboard.on('keydown', (e) => {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= this._choices.length) this.pick(this._choices[n - 1]);
      if (e.key === 'r' || e.key === 'R') this._doReroll(width, height);
    });
  }

  _buildCards(width, height) {
    if (this._cardObjs) this._cardObjs.forEach((o) => o.destroy());
    this._cardObjs = [];
    const reg = (o) => { this._cardObjs.push(o); return o; };

    const choices = this._choices;
    const cardW = 250;
    const gap = 22;
    const total = choices.length * cardW + (choices.length - 1) * gap;
    const startX = (width - total) / 2 + cardW / 2;
    const cy = height / 2 + 30;
    choices.forEach((a, i) => this.buildCard(startX + i * (cardW + gap), cy, cardW, a, i + 1, reg));

    // reroll button — one-use
    const rerollColor = this._rerolled ? '#555566' : '#9a93c0';
    const rerollLabel = this._rerolled ? '↻ rerolled' : '↻ reroll  [R]';
    const rb = reg(this.add.text(width / 2, cy + 128, rerollLabel, {
      fontFamily: 'monospace', fontSize: '13px', color: rerollColor,
    }).setOrigin(0.5));
    if (!this._rerolled) {
      rb.setInteractive({ useHandCursor: true });
      rb.on('pointerover', () => rb.setColor('#ffffff'));
      rb.on('pointerout', () => rb.setColor(rerollColor));
      rb.on('pointerdown', () => this._doReroll(width, height));
    }
  }

  _doReroll(width, height) {
    if (this._rerolled) return;
    this._rerolled = true;
    this._choices = rollArtifacts(3 + (this._run.artifactBonus || 0), this._run.artifacts);
    this._buildCards(width, height);
  }

  buildCard(cx, cy, w, a, num, reg = (o) => o) {
    const h = 230;
    const top = cy - h / 2;
    const g = reg(this.add.graphics());
    drawPanel(g, cx - w / 2, top, w, h, a.color || 0xffd700, { radius: 12, header: 32 });

    reg(this.add.text(cx, top + 22, `${num}. ${a.name}`, {
      fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
      align: 'center', wordWrap: { width: w - 24 },
    }).setOrigin(0.5, 0));
    reg(this.add.text(cx, cy + 6, a.desc, {
      fontFamily: 'monospace', fontSize: '13px', color: '#ffd27a',
      align: 'center', wordWrap: { width: w - 30 },
    }).setOrigin(0.5));

    const zone = reg(this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }));
    zone.on('pointerover', () => g.setAlpha(0.82));
    zone.on('pointerout', () => g.setAlpha(1));
    zone.on('pointerdown', () => this.pick(a));
  }

  pick(a) {
    const run = this.registry.get('run');
    run.artifacts.push(a.id);
    this.registry.set('run', run);
    Save.save(run);
    Audio.sfx('levelup');
    this.scene.start('ConquestScene'); // chooses next land, or routes to the final stage
  }
}
