import Phaser from 'phaser';
import { getCharacter } from '../data/characters.js';
import { getTheme } from '../data/themes.js';
import { getArtifact } from '../data/artifacts.js';
import { Audio } from '../systems/AudioManager.js';
import { CIV_NAME } from '../data/campaign.js';
import { HERO_DIALOGUE, pickRandom } from '../data/dialogue.js';
import { getOmen } from '../data/omens.js';
import { Legacy } from '../systems/SaveSystem.js';

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

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.97).setOrigin(0);

    // ── Title
    this.add.text(width / 2, 34, 'THE WORLD IS YOURS', {
      fontFamily: 'monospace', fontSize: '36px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5);

    // ── Hero portrait
    this.add.image(width / 2, 120, `char_${c.id}`).setScale(2.0);

    // ── Hero name + flavour victory line
    const victoryLine = (HERO_DIALOGUE[c.id] && HERO_DIALOGUE[c.id].victory)
      ? pickRandom(HERO_DIALOGUE[c.id].victory)
      : `${c.name} stands supreme.`;

    this.add.text(width / 2, 186,
      `${c.name}  ·  ${c.civ}`, {
        fontFamily: 'monospace', fontSize: '16px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5);

    this.add.text(width / 2, 208,
      `"${victoryLine}"`, {
        fontFamily: 'monospace', fontSize: '13px', color: '#d8d3ee',
        fontStyle: 'italic', wordWrap: { width: width - 120 }, align: 'center',
      }).setOrigin(0.5, 0);

    // ── Conquered civilizations recap. The whole bottom block now FLOWS from this
    // running Y (the 7-civ list + final stage used to collide with the fixed-position
    // stats / artifacts / omen / button rows pinned near the bottom).
    let winY = 248;
    const conquered = (this.run.conquered || []).filter(Boolean);
    if (conquered.length) {
      this.add.text(width / 2, winY, 'CIVILIZATIONS CONQUERED', {
        fontFamily: 'monospace', fontSize: '11px', color: '#888888', fontStyle: 'bold',
      }).setOrigin(0.5);
      winY += 16;

      const civColors = {
        china: '#e0563f', japan: '#7c8cff', byzantium: '#c074e0',
        sumer: '#33b8d6', rome: '#d23b3b', macedon: '#3a7bd5',
        mongolia: '#c9a13a', norse: '#4f9fd6',
      };
      conquered.forEach((civId, i) => {
        const name = CIV_NAME[civId] || civId;
        const col = civColors[civId] || '#aaaaaa';
        this.add.text(width / 2, winY, `${i + 1}.  ${name}`, {
          fontFamily: 'monospace', fontSize: '12px', color: col,
        }).setOrigin(0.5);
        winY += 15;
      });
      // Final stage indicator
      this.add.text(width / 2, winY, `${conquered.length + 1}.  Warlord of Warlords  ·  Xerxes the Undying`, {
        fontFamily: 'monospace', fontSize: '12px', color: '#ffd700',
      }).setOrigin(0.5);
      winY += 18;
    }

    // ── Stats bar: total kills + run time
    const kills = this.run.kills || 0;
    const totalMs = this.run.runTimeTotal || 0;
    let statsStr = `${kills.toLocaleString()} enemies slain`;
    if (totalMs > 0) {
      const totalSec = Math.round(totalMs / 1000);
      const mins = Math.floor(totalSec / 60);
      const secs = totalSec % 60;
      statsStr += `   ·   ${mins}m ${String(secs).padStart(2, '0')}s`;
    }
    this.add.text(width / 2, winY, statsStr, {
      fontFamily: 'monospace', fontSize: '12px', color: '#9a93c0',
    }).setOrigin(0.5);
    winY += 18;

    // ── Artifacts
    if (this.run.artifacts && this.run.artifacts.length) {
      this.add.text(width / 2, winY,
        `Artifacts: ${this.run.artifacts.map((id) => getArtifact(id).name).join('  •  ')}`, {
          fontFamily: 'monospace', fontSize: '11px', color: '#ffd27a', align: 'center',
          wordWrap: { width: width - 120 },
        }).setOrigin(0.5, 0);
      winY += 18;
    }

    // ── War Omen recap
    if (this.run.omen) {
      const omenDef = getOmen(this.run.omen);
      if (omenDef) {
        this.add.text(width / 2, winY,
          `War Omen: ${omenDef.name} — ${omenDef.desc}`, {
            fontFamily: 'monospace', fontSize: '10px', color: '#b080e8', align: 'center',
            wordWrap: { width: width - 120 },
          }).setOrigin(0.5, 0);
        winY += 16;
      }
    }

    // ── Mandate of Heaven heat recap
    const heat = this.run.mandateHeat || 0;
    if (heat > 0) {
      const flames = '🔥'.repeat(Math.min(heat, 10));
      this.add.text(width / 2, winY,
        `${flames} Mandate Heat ${heat}  ·  +${Math.round(heat * 15)}% Legacy Coins  ·  +${Math.round(heat * 5)}% Gold  ·  +${Math.round(heat * 1.5)} Loot Luck`, {
          fontFamily: 'monospace', fontSize: '11px', color: '#ff8c00', fontStyle: 'bold',
          align: 'center', wordWrap: { width: width - 120 },
        }).setOrigin(0.5, 0);
      winY += 18;

      // Show personal-best heat for this hero (conquerStage already called recordHeroHeat)
      const heroId = this.run.characterId;
      const bestHeat = Legacy.getHeroBestHeat(heroId);
      if (bestHeat > 0) {
        const newRecord = heat >= bestHeat;
        this.add.text(width / 2, winY,
          `Personal Best: Heat ${bestHeat}${newRecord ? '  ★ NEW RECORD!' : ''}`, {
            fontFamily: 'monospace', fontSize: '10px', color: '#ffd700', align: 'center',
          }).setOrigin(0.5, 0);
      }
    }

    // ── Button
    const btn = this.add.text(width / 2, height - 52, '[ New Conquest ]', {
      fontFamily: 'monospace', fontSize: '22px', color: accent, fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor(accent));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
    this.input.keyboard.once('keydown', () => this.scene.start('MenuScene'));
  }
}
