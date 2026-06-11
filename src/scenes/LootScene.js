import Phaser from 'phaser';
import { describeMods, getSlot } from '../data/equipment.js';
import { Audio } from '../systems/AudioManager.js';
import { drawPanel } from '../art/ui.js';

// Shown when a chest is opened. Compares the rolled item against whatever is
// currently in that slot, and lets the player Equip (1/Enter) or Skip (2/Esc).
export default class LootScene extends Phaser.Scene {
  constructor() {
    super('LootScene');
  }

  init(data) {
    this.gs = data.gameScene;
    this.item = data.item;
  }

  create() {
    const { width, height } = this.scale;
    const item = this.item;
    const current = this.gs.player.equipment[item.slot];

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.8).setOrigin(0);

    this.add
      .text(width / 2, height / 2 - 160, 'TREASURE', {
        fontFamily: 'monospace', fontSize: '34px', color: '#ffd700', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, height / 2 - 124, `${getSlot(item.slot).name} slot`, {
        fontFamily: 'monospace', fontSize: '14px', color: '#9a93c0',
      })
      .setOrigin(0.5);

    // new item (left) vs current (right)
    this.buildItemPanel(width / 2 - 150, height / 2 + 10, 'NEW', item);
    this.buildItemPanel(width / 2 + 150, height / 2 + 10, 'EQUIPPED', current);

    const equipBtn = this.add
      .text(width / 2 - 150, height - 90, '[1] Equip', {
        fontFamily: 'monospace', fontSize: '20px', color: '#9ef58b', fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    equipBtn.on('pointerdown', () => this.equip());

    const skipBtn = this.add
      .text(width / 2 + 150, height - 90, '[2] Skip', {
        fontFamily: 'monospace', fontSize: '20px', color: '#c9c4e0',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    skipBtn.on('pointerdown', () => this.close());

    this.input.keyboard.on('keydown', (e) => {
      if (e.key === '1' || e.key === 'Enter') this.equip();
      else if (e.key === '2' || e.key === 'Escape') this.close();
    });
  }

  buildItemPanel(cx, cy, label, item) {
    const w = 260;
    // High-rarity items roll up to 4 stat lines — size the panel so they always
    // stay inside the border (4-stat rings used to spill the last line below it).
    const h = 216;
    const g = this.add.graphics();
    const border = item ? item.color : 0x3a3556;
    drawPanel(g, cx - w / 2, cy - h / 2, w, h, border, { header: 28 });

    this.add
      .text(cx, cy - h / 2 + 16, label, {
        fontFamily: 'monospace', fontSize: '12px', color: '#7d7896',
      })
      .setOrigin(0.5);

    if (!item) {
      this.add
        .text(cx, cy, '(empty)', { fontFamily: 'monospace', fontSize: '16px', color: '#5a5570' })
        .setOrigin(0.5);
      return;
    }

    const ikey = this.textures.exists(item.icon) ? item.icon : item.baseIcon;
    if (this.textures.exists(ikey)) {
      this.add.image(cx, cy - h / 2 + 64, ikey).setScale(1.2);
    }
    this.add
      .text(cx, cy - h / 2 + 100, item.name, {
        fontFamily: 'monospace', fontSize: '15px', color: item.textColor, fontStyle: 'bold',
        align: 'center', wordWrap: { width: w - 24 },
      })
      .setOrigin(0.5);
    this.add
      .text(cx, cy - h / 2 + 132, describeMods(item.mods), {
        fontFamily: 'monospace', fontSize: '11px', color: '#c9c4e0', align: 'center',
        lineSpacing: 3,
      })
      .setOrigin(0.5, 0);
  }

  equip() {
    this.gs.player.equip(this.item);
    Audio.sfx('equip');
    this.close();
  }

  close() {
    this.gs.lootOpen = false;
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
