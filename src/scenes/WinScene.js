import Phaser from 'phaser';
import { getCharacter } from '../data/characters.js';
import { getTheme } from '../data/themes.js';
import { getArtifact } from '../data/artifacts.js';
import { Audio } from '../systems/AudioManager.js';

// Victory: the champion has conquered every civilization and the final warlord.
export default class WinScene extends Phaser.Scene {
  constructor() {
    super('WinScene');
  }

  init(data) {
    this.run = data.run;
  }

  create() {
    const { width, height } = this.scale;
    const c = getCharacter(this.run.characterId);
    const accent = getTheme(c.civId).accentCss;
    Audio.sfx('bossdown');

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.95).setOrigin(0);
    this.add.text(width / 2, height / 2 - 150, 'THE WORLD IS YOURS', {
      fontFamily: 'monospace', fontSize: '44px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.image(width / 2, height / 2 - 60, `char_${c.id}`).setScale(2.6);

    this.add.text(width / 2, height / 2 + 6,
      `${c.name} of ${c.civ}\nhas conquered all under heaven.`, {
        fontFamily: 'monospace', fontSize: '18px', color: '#ffffff', align: 'center', lineSpacing: 6,
      }).setOrigin(0.5, 0);

    if (this.run.artifacts.length) {
      this.add.text(width / 2, height / 2 + 70,
        `Artifacts claimed: ${this.run.artifacts.map((id) => getArtifact(id).name).join('  •  ')}`, {
          fontFamily: 'monospace', fontSize: '12px', color: '#ffd27a', align: 'center', wordWrap: { width: width - 120 },
        }).setOrigin(0.5, 0);
    }

    const btn = this.add.text(width / 2, height - 70, '[ New Conquest ]', {
      fontFamily: 'monospace', fontSize: '22px', color: accent, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor(accent));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard.once('keydown', () => this.scene.start('MenuScene'));
  }
}
