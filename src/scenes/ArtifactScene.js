import Phaser from 'phaser';
import { rollArtifacts, getArtifact } from '../data/artifacts.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/AudioManager.js';
import { drawPanel } from '../art/ui.js';
import { MANDATE_ARTIFACT_HEAT, MANDATE_CROWN_HEAT } from './ContractScene.js';

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
    // ITEM C: pass the just-conquered civ so its relic is always offered
    this._civId = this._run.currentCiv; // null if this is reached from somewhere else

    // Mandate of Heaven: at heat >= 5 inject Seal; at heat >= 10 also inject Crown.
    const heat = this._run.mandateHeat || 0;
    const mandateArtifacts = [];
    if (heat >= MANDATE_CROWN_HEAT) {
      const crown = getArtifact('crown_of_heaven');
      if (crown && !this._run.artifacts.includes(crown.id)) mandateArtifacts.push(crown);
    }
    if (heat >= MANDATE_ARTIFACT_HEAT) {
      const seal = getArtifact('seal_of_the_mandate');
      if (seal && !this._run.artifacts.includes(seal.id)) mandateArtifacts.push(seal);
    }
    this._choices = rollArtifacts(3 + (this._run.artifactBonus || 0), this._run.artifacts, this._civId, mandateArtifacts);
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
    // Size the cards to fit the 960-wide viewport — with up to three contracts the
    // artifact draft can offer 5–6 cards, which overflowed at the old fixed 250px width.
    const n = choices.length;
    const sideMargin = 16;
    const gap = n > 4 ? 14 : 22;
    const cardW = Math.min(250, Math.floor((width - sideMargin * 2 - gap * (n - 1)) / n));
    const total = n * cardW + (n - 1) * gap;
    const startX = (width - total) / 2 + cardW / 2;
    // Centre the card row a touch higher than mid-screen so even the tallest
    // (lore-bearing) card clears the reroll prompt pinned near the bottom edge.
    const cy = height / 2 + 18;
    this._cardW = cardW;
    // Pass 1: measure the tallest card so the whole row shares a uniform height
    // (ragged card tops/bottoms look broken). Pass 2: render them all at that height.
    const cardH = choices.reduce((mx, a) => Math.max(mx, this._measureCardH(cardW, a)), 0);
    choices.forEach((a, i) => this.buildCard(startX + i * (cardW + gap), cy, cardW, a, i + 1, reg, cardH));
    const maxBottom = cy + cardH / 2;

    // reroll button — one-use; placed just below the tallest card (clamped to the viewport)
    const rerollColor = this._rerolled ? '#555566' : '#9a93c0';
    const rerollLabel = this._rerolled ? '↻ rerolled' : '↻ reroll  [R]';
    const rerollY = Math.min(maxBottom + 18, height - 16);
    const rb = reg(this.add.text(width / 2, rerollY, rerollLabel, {
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
    // Preserve mandate artifacts on reroll so heat rewards are never lost
    const heat = this._run.mandateHeat || 0;
    const mandateArtifacts = [];
    if (heat >= MANDATE_CROWN_HEAT) {
      const crown = getArtifact('crown_of_heaven');
      if (crown && !this._run.artifacts.includes(crown.id)) mandateArtifacts.push(crown);
    }
    if (heat >= MANDATE_ARTIFACT_HEAT) {
      const seal = getArtifact('seal_of_the_mandate');
      if (seal && !this._run.artifacts.includes(seal.id)) mandateArtifacts.push(seal);
    }
    this._choices = rollArtifacts(3 + (this._run.artifactBonus || 0), this._run.artifacts, this._civId, mandateArtifacts);
    this._buildCards(width, height);
  }

  // Card layout constants shared by the measure + render passes.
  _cardStyle(w, a, num) {
    const compact = w < 210; // narrower cards (5–6 choices) use smaller type
    const iconKey = (a.icon && this.textures.exists(a.icon)) ? a.icon
      : (a.iconFallback && this.textures.exists(a.iconFallback)) ? a.iconFallback
      : null;
    const iconScale = compact ? 0.72 : 0.9;
    const iconH = iconKey ? this.textures.get(iconKey).getSourceImage().height * iconScale : 0;
    return {
      compact, iconKey, iconScale, iconH,
      nameStyle: { fontFamily: 'monospace', fontSize: compact ? '14px' : '17px', color: '#ffffff', fontStyle: 'bold', align: 'center', wordWrap: { width: w - 20 } },
      descStyle: { fontFamily: 'monospace', fontSize: compact ? '11px' : '13px', color: '#ffd27a', align: 'center', wordWrap: { width: w - 22 }, lineSpacing: 1 },
      loreStyle: { fontFamily: 'monospace', fontSize: compact ? '10px' : '11px', color: '#9a9aaa', fontStyle: 'italic', align: 'center', wordWrap: { width: w - 22 }, lineSpacing: 1 },
      pad: { top: 18, afterName: 10, afterIcon: 10, afterDesc: 8, bottom: 16 },
    };
  }

  // Measure the content height a card needs (off-screen temp text, destroyed after).
  _measureCardH(w, a) {
    const num = 1; // numbering doesn't change height
    const s = this._cardStyle(w, a, num);
    const name = this.add.text(0, 0, `${num}. ${a.name}`, s.nameStyle).setVisible(false);
    const desc = this.add.text(0, 0, a.desc, s.descStyle).setVisible(false);
    const lore = a.lore ? this.add.text(0, 0, a.lore, s.loreStyle).setVisible(false) : null;
    const contentH = s.pad.top + name.height + s.pad.afterName + s.iconH + s.pad.afterIcon
      + desc.height + (lore ? s.pad.afterDesc + lore.height : 0) + s.pad.bottom;
    name.destroy(); desc.destroy(); if (lore) lore.destroy();
    return Math.max(a.lore ? 260 : 230, contentH);
  }

  buildCard(cx, cy, w, a, num, reg = (o) => o, forcedH = null) {
    const s = this._cardStyle(w, a, num);
    const g = reg(this.add.graphics());

    const name = reg(this.add.text(cx, 0, `${num}. ${a.name}`, s.nameStyle).setOrigin(0.5, 0));
    const desc = reg(this.add.text(cx, 0, a.desc, s.descStyle).setOrigin(0.5, 0));
    const lore = a.lore ? reg(this.add.text(cx, 0, a.lore, s.loreStyle).setOrigin(0.5, 0)) : null;

    const contentH = s.pad.top + name.height + s.pad.afterName + s.iconH + s.pad.afterIcon
      + desc.height + (lore ? s.pad.afterDesc + lore.height : 0) + s.pad.bottom;
    const h = forcedH || Math.max(a.lore ? 260 : 230, contentH);
    const top = cy - h / 2;

    drawPanel(g, cx - w / 2, top, w, h, a.color || 0xffd700, { radius: 12, header: 32 });

    let y = top + s.pad.top;
    name.setY(y);
    y += name.height + s.pad.afterName;
    if (s.iconKey) { reg(this.add.image(cx, y + s.iconH / 2, s.iconKey).setScale(s.iconScale)); }
    y += s.iconH + s.pad.afterIcon;
    desc.setY(y);
    y += desc.height + s.pad.afterDesc;
    if (lore) lore.setY(y);

    const zone = reg(this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }));
    zone.on('pointerover', () => g.setAlpha(0.82));
    zone.on('pointerout', () => g.setAlpha(1));
    zone.on('pointerdown', () => this.pick(a));
    return h;
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
