import Phaser from 'phaser';
import { drawPanel } from '../art/ui.js';
import { Legacy } from '../systems/SaveSystem.js';
import { getCharacter } from '../data/characters.js';
import { CIV_NAME } from '../data/campaign.js';
import { getOmen } from '../data/omens.js';
import { Audio } from '../systems/AudioManager.js';

// Dynasty Chronicle: scrollable run-history screen.
// Launched from MenuScene. Up/Down arrows or mouse wheel scroll; Esc closes.
export default class ChronicleScene extends Phaser.Scene {
  constructor() {
    super('ChronicleScene');
  }

  init(data) {
    this.callerScene = data && data.caller ? data.caller : 'MenuScene';
  }

  create() {
    const { width, height } = this.scale;
    const W = width;   // 960
    const H = height;  // 540

    // Background
    this.add.rectangle(0, 0, W, H, 0x05040a, 0.97).setOrigin(0).setDepth(0);

    // Title bar
    const g = this.add.graphics().setDepth(1);
    drawPanel(g, 20, 10, W - 40, 54, 0xffd700, { header: 54, radius: 8 });
    this.add.text(W / 2, 37, 'DYNASTY CHRONICLE', {
      fontFamily: 'monospace', fontSize: '28px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2);

    const chronicle = Legacy.getChronicle();

    if (!chronicle.length) {
      this._buildEmpty(W, H);
      this._buildCloseHint(W, H);
      this._wireKeys();
      return;
    }

    // Header stats panel
    this._buildStats(W, chronicle);

    // Build the scrollable run list
    this._scrollY = 0;
    this._entries = this._buildEntries(chronicle, W);
    this._totalContentH = this._entries.totalH;
    this._listTop = 196;
    this._listBottom = H - 36;
    this._visibleH = this._listBottom - this._listTop;

    // Create a mask for the list area so rows clip cleanly
    this._listMask = this.make.graphics({ x: 0, y: 0, add: false });
    this._listMask.fillStyle(0xffffff).fillRect(0, this._listTop, W, this._visibleH);
    this._entries.container.setMask(new Phaser.Display.Masks.GeometryMask(this, this._listMask));

    this._buildCloseHint(W, H);
    this._wireKeys();
    this._wireWheel();
  }

  _buildEmpty(W, H) {
    this.add.text(W / 2, H / 2, 'No campaigns yet — history awaits.', {
      fontFamily: 'monospace', fontSize: '18px', color: '#9a93c0',
    }).setOrigin(0.5).setDepth(2);
  }

  _buildStats(W, chronicle) {
    const totalCampaigns = chronicle.length;
    const worldConquests = chronicle.filter((r) => r.outcome === 'conquered').length;
    const bestHeat = chronicle.reduce((best, r) => Math.max(best, r.heat || 0), 0);

    // favourite hero by run count
    const heroCounts = {};
    for (const r of chronicle) {
      if (r.heroId) heroCounts[r.heroId] = (heroCounts[r.heroId] || 0) + 1;
    }
    let favHeroId = null, favCount = 0;
    for (const [id, n] of Object.entries(heroCounts)) {
      if (n > favCount) { favCount = n; favHeroId = id; }
    }
    let favHeroName = favHeroId || '—';
    try { favHeroName = getCharacter(favHeroId).name; } catch (e) { /* unknown hero id */ }

    const flames = bestHeat > 0 ? ' 🔥'.repeat(Math.min(bestHeat, 8)).trim() : '—';
    const statsLine = [
      `${totalCampaigns} campaign${totalCampaigns !== 1 ? 's' : ''}`,
      `${worldConquests} world conquest${worldConquests !== 1 ? 's' : ''}`,
      bestHeat > 0 ? `best heat ${bestHeat} ${flames}` : 'no mandate cleared',
      `favourite: ${favHeroName}`,
    ].join('   ·   ');

    const sg = this.add.graphics().setDepth(1);
    drawPanel(sg, 20, 72, W - 40, 36, 0x8888cc, { header: 0, radius: 6 });
    this.add.text(W / 2, 90, statsLine, {
      fontFamily: 'monospace', fontSize: '11px', color: '#c9c4e0',
      align: 'center', wordWrap: { width: W - 80 },
    }).setOrigin(0.5).setDepth(2);

    // Column headers
    this.add.text(30, 120, 'HERO', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7d7896', fontStyle: 'bold',
    }).setDepth(2);
    this.add.text(220, 120, 'OUTCOME', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7d7896', fontStyle: 'bold',
    }).setDepth(2);
    this.add.text(560, 120, 'KILLS', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7d7896', fontStyle: 'bold',
    }).setDepth(2);
    this.add.text(650, 120, 'OMEN', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7d7896', fontStyle: 'bold',
    }).setDepth(2);
    // divider
    const dg = this.add.graphics().setDepth(2);
    dg.lineStyle(1, 0x35304f, 1).lineBetween(20, 134, W - 20, 134);
  }

  // Build the scrollable container with all run rows.
  // Returns { container, totalH }
  _buildEntries(chronicle, W) {
    const rowH = 40;
    const padX = 30;
    const totalH = chronicle.length * rowH;
    const container = this.add.container(0, 196).setDepth(2);

    chronicle.forEach((rec, i) => {
      const y = i * rowH;
      const isWin = rec.outcome === 'conquered';

      // Row background (subtle alternating)
      const rowBg = this.add.rectangle(W / 2, y + rowH / 2, W - 40, rowH - 4,
        isWin ? 0x0d1a0d : 0x100e1a, 0.85);
      container.add(rowBg);

      // Hero name
      let heroName = rec.heroId || '?';
      try { heroName = getCharacter(rec.heroId).name; } catch (e) { /* unknown */ }
      container.add(this.add.text(padX, y + 8, heroName, {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      }));

      // Outcome line in period voice
      let outcomeLine, outcomeColor;
      if (isWin) {
        const heatTag = rec.heat > 0 ? `  heat ${rec.heat}` : '';
        outcomeLine = `CONQUERED THE WORLD${heatTag}`;
        outcomeColor = '#ffd700';
      } else {
        const stageName = (rec.stage && rec.stage !== 'unknown')
          ? (rec.stage === 'final' ? 'Warlord of Warlords' : (CIV_NAME[rec.stage] || rec.stage))
          : 'the battlefield';
        const killedPart = rec.killedBy
          ? `Fell to ${rec.killedBy} — ${stageName}, floor ${rec.floor || '?'}`
          : `Fell at ${stageName}, floor ${rec.floor || '?'}`;
        outcomeLine = killedPart;
        outcomeColor = '#ff8c8c';
      }
      container.add(this.add.text(220, y + 8, outcomeLine, {
        fontFamily: 'monospace', fontSize: '12px', color: outcomeColor,
        wordWrap: { width: 320 },
      }));

      // Kills
      container.add(this.add.text(560, y + 8, `${rec.kills || 0} slain`, {
        fontFamily: 'monospace', fontSize: '11px', color: '#9a93c0',
      }));

      // Omen tag
      if (rec.omen) {
        let omenName = rec.omen;
        try {
          const od = getOmen(rec.omen);
          if (od) omenName = od.name;
        } catch (e) { /* ignore */ }
        container.add(this.add.text(650, y + 8, omenName, {
          fontFamily: 'monospace', fontSize: '10px', color: '#b080e8',
          wordWrap: { width: 280 },
        }));
      }

      // Civs conquered badge (for fell runs)
      if (!isWin && rec.civsConquered > 0) {
        container.add(this.add.text(W - padX - 20, y + 8, `${rec.civsConquered} civ${rec.civsConquered !== 1 ? 's' : ''}`, {
          fontFamily: 'monospace', fontSize: '10px', color: '#7ec8ff',
        }).setOrigin(1, 0));
      }

      // Row divider
      const dg = this.add.graphics();
      dg.lineStyle(1, 0x2a2840, 0.7).lineBetween(20, y + rowH - 2, W - 20, y + rowH - 2);
      container.add(dg);
    });

    return { container, totalH };
  }

  _buildCloseHint(W, H) {
    this.add.text(W / 2, H - 18, 'Esc — back to menu   ·   ↑ / ↓  or  scroll — navigate', {
      fontFamily: 'monospace', fontSize: '11px', color: '#7d7896',
    }).setOrigin(0.5).setDepth(3);
  }

  _wireKeys() {
    this.input.keyboard.on('keydown-ESC', () => this._close());
    this.input.keyboard.on('keydown-UP', () => this._scroll(-60));
    this.input.keyboard.on('keydown-DOWN', () => this._scroll(60));
  }

  _wireWheel() {
    this.input.on('wheel', (ptr, objs, dx, dy) => {
      this._scroll(dy > 0 ? 60 : -60);
    });
  }

  _scroll(delta) {
    if (!this._entries) return;
    const maxScroll = Math.max(0, this._totalContentH - this._visibleH);
    this._scrollY = Phaser.Math.Clamp(this._scrollY + delta, 0, maxScroll);
    this._entries.container.y = this._listTop - this._scrollY;
  }

  _close() {
    this.scene.start(this.callerScene);
  }
}
