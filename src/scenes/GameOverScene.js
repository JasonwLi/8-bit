import Phaser from 'phaser';
import { getCharacter } from '../data/characters.js';
import { getTheme } from '../data/themes.js';

export default class GameOverScene extends Phaser.Scene {
  constructor() {
    super('GameOverScene');
  }

  init(data) {
    this.result = data;
  }

  create() {
    const { width, height } = this.scale;
    const r = this.result;
    const c = getCharacter(r.characterId);
    const accent = getTheme(c.civId).accentCss;

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.92).setOrigin(0);

    this.add
      .text(width / 2, height / 2 - 140, 'YOU FELL IN BATTLE', {
        fontFamily: 'monospace', fontSize: '40px', color: '#ff4d4d', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add.image(width / 2, height / 2 - 60, `char_${c.id}`).setScale(2.5);

    const total = Math.floor(r.time / 1000);
    const mm = String(Math.floor(total / 60)).padStart(2, '0');
    const ss = String(total % 60).padStart(2, '0');

    this.add
      .text(width / 2, height / 2 + 10,
        `${c.name}  •  ${c.civ}\n\nSurvived  ${mm}:${ss}\nReached  Level ${r.level}\nSlew  ${r.kills} foes`,
        { fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center', lineSpacing: 6 })
      .setOrigin(0.5, 0);

    const btn = this.add
      .text(width / 2, height - 70, '[ Play Again ]', {
        fontFamily: 'monospace', fontSize: '22px', color: accent, fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor(accent));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));

    this.input.keyboard.once('keydown', () => this.scene.start('MenuScene'));
  }
}
