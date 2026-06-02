import Phaser from 'phaser';
import { CHARACTERS } from '../data/characters.js';
import { WEAPONS } from '../data/weapons.js';
import { SECONDARIES } from '../data/secondaries.js';
import { ABILITIES } from '../data/abilities.js';
import { THEMES } from '../data/themes.js';
import { drawPanel } from '../art/ui.js';
import { getCivTrait, getPersonalTrait } from '../data/traits.js';
import { newRun, CIV_BOSS, CIV_ORDER, CIV_NAME } from '../data/campaign.js';
import { BOSSES, CIV_LIEUTENANTS } from '../data/bosses.js';
import { DROP_SLOTS, rollItem } from '../data/equipment.js';
import { getCharacter } from '../data/characters.js';
import { Save } from '../systems/SaveSystem.js';
import { Audio } from '../systems/AudioManager.js';
import { Settings, keyLabel } from '../systems/Settings.js';

// Character-select. Click a card (or press 1-4) to start a run.
export default class MenuScene extends Phaser.Scene {
  constructor() {
    super('MenuScene');
  }

  create() {
    // Phaser reuses this scene instance across restarts, so clear stale refs to
    // the previous panel's (now-destroyed) objects — otherwise unlockDuels()'s
    // `if (this._duelsPanel) return` guard bails and the panel never reopens.
    this._duelsPanel = null;
    this._suspended = null;

    Settings.applyAudio(); // honor saved volume settings as soon as the title loads

    const { width, height } = this.scale;

    this.add
      .text(width / 2, 36, '8-BIT DYNASTIES', {
        fontFamily: 'monospace', fontSize: '44px', color: '#ffd700', fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.add
      .text(width / 2, 78, 'Choose your champion — conquer the world', {
        fontFamily: 'monospace', fontSize: '16px', color: '#c9c4e0',
      })
      .setOrigin(0.5);

    // Continue an in-progress run, if one is saved
    const saved = Save.load();
    if (saved) {
      const champ = getCharacter(saved.characterId);
      const btn = this.add.text(width / 2, 100,
        `▶ CONTINUE — ${champ.name} (${saved.conquered.length}/${CIV_ORDER.length - 1} conquered)`, {
          fontFamily: 'monospace', fontSize: '15px', color: '#9ef58b', fontStyle: 'bold',
        }).setOrigin(0.5).setInteractive({ useHandCursor: true });
      btn.on('pointerover', () => btn.setColor('#ffffff'));
      btn.on('pointerout', () => btn.setColor('#9ef58b'));
      btn.on('pointerdown', () => this.continueRun(saved));
    }

    // Character carousel — paginate so ANY number of heroes fits cleanly (the row
    // used to overflow the screen once there were more than ~4 cards).
    const cardW = 210;
    const gap = 18;
    const cy = height / 2 + 26; // nudged up so the page label clears the bottom controls hint
    const perPage = Math.max(1, Math.floor((width - 80) / (cardW + gap))); // 80px reserved for the arrows
    const pages = Math.ceil(CHARACTERS.length / perPage);
    this._heroPage = this._heroPage || 0;
    this._pageObjs = [];

    const renderPage = () => {
      this._pageObjs.forEach((o) => o.destroy());
      this._pageObjs = [];
      const start = this._heroPage * perPage;
      const slice = CHARACTERS.slice(start, start + perPage);
      const totalW = slice.length * cardW + (slice.length - 1) * gap;
      const startX = (width - totalW) / 2 + cardW / 2;
      slice.forEach((c, j) => {
        this._pageObjs.push(...this.buildCard(startX + j * (cardW + gap), cy, cardW, c, start + j));
      });
      if (this._pageLabel) this._pageLabel.setText(pages > 1 ? `Page ${this._heroPage + 1} / ${pages}` : '');
    };
    const changePage = (d) => {
      if (pages <= 1 || this._duelsPanel) return;
      this._heroPage = (this._heroPage + d + pages) % pages;
      renderPage();
    };
    this._changeHeroPage = changePage;

    if (pages > 1) {
      const arrow = (x, dir) => {
        const t = this.add.text(x, cy, dir < 0 ? '◀' : '▶', {
          fontFamily: 'monospace', fontSize: '40px', color: '#ffd27a',
        }).setOrigin(0.5).setDepth(50).setInteractive({ useHandCursor: true });
        t.on('pointerover', () => t.setColor('#ffffff'));
        t.on('pointerout', () => t.setColor('#ffd27a'));
        t.on('pointerdown', () => changePage(dir));
        return t;
      };
      arrow(28, -1);
      arrow(width - 28, 1);
      this._pageLabel = this.add.text(width / 2, cy + 200, '', {
        fontFamily: 'monospace', fontSize: '12px', color: '#9a93c0', fontStyle: 'bold',
      }).setOrigin(0.5);
    }
    renderPage();

    const kP = keyLabel(Settings.binds.primary), kS = keyLabel(Settings.binds.secondary), kU = keyLabel(Settings.binds.ultimate);
    this.add
      .text(width / 2, height - 22,
        `Move: hold MOUSE / WASD  ·  Aim: mouse  •  ${kP} attack · ${kS} secondary · ${kU} ultimate  •  Chests drop gear`,
        { fontFamily: 'monospace', fontSize: '13px', color: '#7d7896' })
      .setOrigin(0.5);

    // sprite gallery link (opens the standalone inspector in a new tab)
    const gallery = this.add.text(width - 14, 12, '⊞ Sprite Gallery', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8fe6ff', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(150).setInteractive({ useHandCursor: true });
    gallery.on('pointerover', () => gallery.setColor('#ffffff'));
    gallery.on('pointerout', () => gallery.setColor('#8fe6ff'));
    gallery.on('pointerdown', () => window.open('gallery.html', '_blank'));

    // settings (volume + keybindings)
    const settings = this.add.text(width - 14, 30, '⚙ Settings', {
      fontFamily: 'monospace', fontSize: '12px', color: '#8fe6ff', fontStyle: 'bold',
    }).setOrigin(1, 0).setDepth(150).setInteractive({ useHandCursor: true });
    settings.on('pointerover', () => settings.setColor('#ffffff'));
    settings.on('pointerout', () => settings.setColor('#8fe6ff'));
    settings.on('pointerdown', () => this.scene.start('SettingsScene', { caller: 'MenuScene' }));

    // once discovered this session, a small reopen button stays (no re-typing)
    if (this.registry.get('duelsUnlocked')) {
      const reopen = this.add.text(14, 12, '⚔ Duel Test', {
        fontFamily: 'monospace', fontSize: '12px', color: '#ff8a8a', fontStyle: 'bold',
      }).setDepth(150).setInteractive({ useHandCursor: true });
      reopen.on('pointerover', () => reopen.setColor('#ffffff'));
      reopen.on('pointerout', () => reopen.setColor('#ff8a8a'));
      reopen.on('pointerdown', () => this.unlockDuels());
    }

    // returning from a run: drop boss intensity and restore the menu theme even
    // before the next gesture (music plays continuously across scenes)
    Audio.setIntensity(0);
    Audio.setTheme('default');

    // start audio on first user gesture (browser autoplay policy)
    const startAudio = () => { Audio.resume(); Audio.setTheme('default'); Audio.startMusic(); };
    this.input.once('pointerdown', startAudio);
    this.input.keyboard.once('keydown', startAudio);

    this.input.keyboard.on('keydown', (e) => {
      if (this._duelsPanel) return; // duel-test panel handles its own input
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= CHARACTERS.length) this.start(CHARACTERS[n - 1]);
    });
    // ◀ / ▶ flip carousel pages (number keys still select any hero globally)
    this.input.keyboard.on('keydown-LEFT', () => this._changeHeroPage && this._changeHeroPage(-1));
    this.input.keyboard.on('keydown-RIGHT', () => this._changeHeroPage && this._changeHeroPage(1));

    // secret easter egg: type the phrase (no input field) to unlock duel test
    this._cheatBuf = '';
    this._duelChar = 'lubu';
    this.input.keyboard.on('keydown', (e) => {
      if (this._duelsPanel || !e.key || e.key.length !== 1) return;
      this._cheatBuf = (this._cheatBuf + e.key.toLowerCase()).slice(-20);
      if (this._cheatBuf.endsWith('iseedeadpeople')) { this._cheatBuf = ''; this.unlockDuels(); }
    });
    // Esc / Backspace / Delete close the duel-test panel (back to character select)
    this.input.keyboard.addCapture('BACKSPACE,DELETE');
    const back = () => this.closeDuels();
    this.input.keyboard.on('keydown-ESC', back);
    this.input.keyboard.on('keydown-BACKSPACE', back);
    this.input.keyboard.on('keydown-DELETE', back);

    // returning from a duel test (win / death / back) → reopen the fighter picker
    if (this.registry.get('reopenDuelPanel')) {
      this.registry.set('reopenDuelPanel', false);
      this.unlockDuels();
    }
  }

  // Builds one hero card and RETURNS every display object it created, so the
  // carousel can tear a page down cleanly before rendering the next one.
  buildCard(cx, cy, w, c, i) {
    const h = 372;
    const top = cy - h / 2;
    const left = cx - w / 2;
    const civTrait = getCivTrait(c.civId);
    const personal = getPersonalTrait(c.id);
    const s = c.stats;
    const objs = [];
    const reg = (o) => { objs.push(o); return o; };

    const g = reg(this.add.graphics());
    const accent = (THEMES[c.civId] || {}).accent || 0xffd27a; // card framed in the hero's civ colour
    drawPanel(g, left, top, w, h, accent, { header: 30 });
    const divider = (y) => { g.lineStyle(1, 0x35304f, 1).lineBetween(left + 14, y, left + w - 14, y); };

    const portrait = reg(this.add.image(cx, top + 52, `char_${c.id}`).setScale(2.1));

    reg(this.add.text(cx, top + 96, `${i + 1}. ${c.name}`, {
      fontFamily: 'monospace', fontSize: '17px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5, 0));
    reg(this.add.text(cx, top + 118, c.civ, {
      fontFamily: 'monospace', fontSize: '10px', color: '#9a93c0',
    }).setOrigin(0.5, 0));

    // base stats block
    divider(top + 138);
    // show the SAME stat categories on every card (0 shown too) so heroes compare cleanly
    const defParts = [
      `ATK ${s.attack}`,
      `DEF ${Math.round(s.defense * 100)}%`,
      `RDEF ${Math.round(s.rangedDefense * 100)}%`,
      `LS ${Math.round(s.lifesteal * 100)}%`,
      `LCK ${s.luck}`,
    ];
    reg(this.add.text(cx, top + 146, `HP ${s.maxHp}     SPD ${s.speed}`, {
      fontFamily: 'monospace', fontSize: '11px', color: '#9fd0ff',
    }).setOrigin(0.5, 0));
    reg(this.add.text(cx, top + 162, defParts.join('   '), {
      fontFamily: 'monospace', fontSize: '11px', color: '#9fd0ff', align: 'center', wordWrap: { width: w - 16 },
    }).setOrigin(0.5, 0));

    // attack kit (primary / secondary / ultimate) — icon + name per row
    divider(top + 184);
    const kitRows = [
      { icon: `abil_icon_${c.startingWeapon}`, label: `⚔ ${WEAPONS[c.startingWeapon].name}`, fallback: `proj_${c.startingWeapon}` },
      { icon: `abil_icon_${c.secondary}`,      label: `+ ${SECONDARIES[c.secondary].name}`,   fallback: `proj_${c.secondary}` },
      { icon: `abil_icon_${c.ultimate}`,        label: `★ ${ABILITIES[c.ultimate].name}`,       fallback: `abil_${c.ultimate}` },
    ];
    const iconSize = 0.38; // scale for 48×48 icons → ~18px rendered
    const rowH = 20;
    const kitTop = top + 190;
    for (let ri = 0; ri < kitRows.length; ri++) {
      const row = kitRows[ri];
      const ry = kitTop + ri * rowH;
      const iconKey = this.textures.exists(row.icon) ? row.icon : row.fallback;
      reg(this.add.image(cx - w / 2 + 14, ry + 9, iconKey).setScale(iconSize).setDepth(2).setOrigin(0, 0.5));
      reg(this.add.text(cx - w / 2 + 28, ry + 2, row.label, {
        fontFamily: 'monospace', fontSize: '10px', color: '#ffd700',
        wordWrap: { width: w - 44 },
      }).setOrigin(0, 0).setDepth(2));
    }

    // traits — bumped down 6px to give the kit icon rows breathing room
    divider(top + 254);
    reg(this.add.text(cx, top + 262, `🏛 ${civTrait.name}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#7ec8ff', fontStyle: 'bold',
    }).setOrigin(0.5, 0));
    reg(this.add.text(cx, top + 280, civTrait.desc, {
      fontFamily: 'monospace', fontSize: '10px', color: '#c9c4e0',
      align: 'center', lineSpacing: 2, wordWrap: { width: w - 18 },
    }).setOrigin(0.5, 0));
    reg(this.add.text(cx, top + 318, `👤 ${personal.name}`, {
      fontFamily: 'monospace', fontSize: '12px', color: '#ffb86b', fontStyle: 'bold',
    }).setOrigin(0.5, 0));
    reg(this.add.text(cx, top + 336, personal.desc, {
      fontFamily: 'monospace', fontSize: '10px', color: '#c9c4e0',
      align: 'center', lineSpacing: 2, wordWrap: { width: w - 18 },
    }).setOrigin(0.5, 0));

    const zone = reg(this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: true }));
    zone.on('pointerover', () => { g.setAlpha(0.85); portrait.setScale(2.4); });
    zone.on('pointerout', () => { g.setAlpha(1); portrait.setScale(2.1); });
    zone.on('pointerdown', () => this.start(c));
    return objs;
  }

  start(character) {
    const run = newRun(character.id);
    this.registry.set('run', run);
    Save.save(run);
    this.scene.start('ConquestScene');
  }

  continueRun(saved) {
    Audio.resume();
    Audio.startMusic();
    this.registry.set('run', saved);
    if (saved.final || saved.currentCiv) this.scene.start('GameScene');
    else this.scene.start('ConquestScene');
  }

  // --- secret DUEL TEST menu (unlocked by typing the phrase) ---
  bossCivId(bossId) {
    for (const civ of CIV_ORDER) {
      if (CIV_BOSS[civ] === bossId || (CIV_LIEUTENANTS[civ] || []).includes(bossId)) return civ;
    }
    return null; // finalboss / unknown
  }

  unlockDuels() {
    if (this._duelsPanel) return;
    this.registry.set('duelsUnlocked', true); // session: reopen button on the title hereafter
    Audio.resume(); Audio.startMusic(); Audio.sfx('boss');
    // Suspend input on everything behind the panel (card zones, continue, reopen)
    // so panel clicks can't fall through — robust regardless of input depth-sort
    // timing (the bug: clicks were landing on the character-card zones behind).
    this._suspended = this.children.list.filter((o) => o.input && o.input.enabled);
    this._suspended.forEach((o) => { o.input.enabled = false; });
    const W = this.scale.width;   // 960
    const H = this.scale.height;  // 540
    // Plain depth-layered objects (NOT a container — container children lose input
    // priority to scene-level objects). Depth 200 (backdrop) / 201 (buttons).
    const els = [];
    const add = (obj, depth = 201) => { obj.setDepth(depth); els.push(obj); return obj; };

    add(this.add.rectangle(0, 0, W, H, 0x0b0a16, 1).setOrigin(0), 200); // fully opaque — hides the menu behind
    add(this.add.text(W / 2, 22, '⚔  DUEL TEST  ⚔', {
      fontFamily: 'monospace', fontSize: '26px', color: '#ff5252', fontStyle: 'bold',
    }).setOrigin(0.5, 0));
    add(this.add.text(W / 2, 54, 'pick a fighter, then an opponent          Esc / Backspace to close', {
      fontFamily: 'monospace', fontSize: '11px', color: '#9a93c0',
    }).setOrigin(0.5, 0));

    // FIGHTER grid — wraps to multiple rows so any number of heroes fits without overlap
    add(this.add.text(W / 2, 80, 'FIGHTER', {
      fontFamily: 'monospace', fontSize: '11px', color: '#7d7896', fontStyle: 'bold',
    }).setOrigin(0.5, 0));
    this._fighterTexts = [];
    const fCols = Math.min(5, CHARACTERS.length);
    const fRows = Math.ceil(CHARACTERS.length / fCols);
    const fColW = W / fCols;
    CHARACTERS.forEach((c, i) => {
      const x = fColW * ((i % fCols) + 0.5);
      const y = 98 + Math.floor(i / fCols) * 22;
      const t = add(this.add.text(x, y, c.name, {
        fontFamily: 'monospace', fontSize: '13px', color: '#ffffff', fontStyle: 'bold',
      }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }));
      t.on('pointerdown', () => { this._duelChar = c.id; this.refreshFighters(); });
      this._fighterTexts.push({ t, id: c.id });
    });

    // OPPONENT — a grid of civ blocks (≤4 columns, wrapping), each = 2 lieutenants + ★ champion
    const oLabelY = 98 + fRows * 22 + 8;
    add(this.add.text(W / 2, oLabelY, 'OPPONENT', {
      fontFamily: 'monospace', fontSize: '11px', color: '#7d7896', fontStyle: 'bold',
    }).setOrigin(0.5, 0));
    const oCols = Math.min(4, CIV_ORDER.length);
    const oColW = W / oCols;
    const oTop = oLabelY + 24;
    const blockH = 116;
    CIV_ORDER.forEach((civ, ci) => {
      const x = oColW * ((ci % oCols) + 0.5);
      const yTop = oTop + Math.floor(ci / oCols) * blockH;
      add(this.add.text(x, yTop, CIV_NAME[civ] || civ, {
        fontFamily: 'monospace', fontSize: '11px', color: '#7ec8ff', fontStyle: 'bold',
        align: 'center', wordWrap: { width: oColW - 12 },
      }).setOrigin(0.5, 0));
      const ids = [...(CIV_LIEUTENANTS[civ] || []), CIV_BOSS[civ]];
      ids.forEach((id, ri) => {
        const b = BOSSES[id];
        if (!b) return;
        const isChamp = ri === ids.length - 1;
        const base = isChamp ? '#ffd27a' : '#cdd0e0';
        const bt = add(this.add.text(x, yTop + 26 + ri * 24, `${isChamp ? '★ ' : ''}${b.name}`, {
          fontFamily: 'monospace', fontSize: '12px', color: base,
        }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }));
        bt.on('pointerover', () => bt.setColor('#ff8a8a'));
        bt.on('pointerout', () => bt.setColor(base));
        bt.on('pointerdown', () => this.startDuelTest(id));
      });
    });
    const oRows = Math.ceil(CIV_ORDER.length / oCols);
    const xerxes = add(this.add.text(W / 2, oTop + oRows * blockH + 4, '☠  Xerxes the Undying  —  final boss', {
      fontFamily: 'monospace', fontSize: '14px', color: '#ff5252', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setInteractive({ useHandCursor: true }));
    xerxes.on('pointerover', () => xerxes.setColor('#ffffff'));
    xerxes.on('pointerout', () => xerxes.setColor('#ff5252'));
    xerxes.on('pointerdown', () => this.startDuelTest('finalboss'));

    this._duelsPanel = els; // array of plain objects
    this.refreshFighters();
  }

  refreshFighters() {
    if (!this._fighterTexts) return;
    for (const f of this._fighterTexts) f.t.setColor(f.id === this._duelChar ? '#ffd700' : '#8a86a0');
  }

  closeDuels() {
    if (!this._duelsPanel) return;
    this._duelsPanel.forEach((o) => o.destroy());
    this._duelsPanel = null;
    if (this._suspended) { this._suspended.forEach((o) => { if (o.input) o.input.enabled = true; }); this._suspended = null; }
  }

  // lieutenant | champion | final — drives how strong a test loadout to grant.
  bossTier(bossId) {
    if (bossId === 'finalboss') return 'final';
    const lts = Object.values(CIV_LIEUTENANTS).flat();
    return lts.includes(bossId) ? 'lt' : 'champ';
  }

  startDuelTest(bossId) {
    Audio.resume(); Audio.startMusic();
    const run = newRun(this._duelChar || 'lubu');
    run.duelTest = bossId;
    run.currentCiv = this.bossCivId(bossId) || run.ownCiv; // gives a valid theme/map

    // Grant a loadout REPRESENTATIVE of reaching this boss in a real run. Player power
    // comes from upgrade points + gear (not the level number), so a fresh level-1
    // character makes the duel-test wildly harder than the real fight. Scale to tier.
    const cfg = {
      lt: { lvl: 16, wp: 12, sp: 4, ap: 3, gear: 2, luck: 4 },
      champ: { lvl: 30, wp: 22, sp: 8, ap: 8, gear: 4, luck: 12 },
      final: { lvl: 42, wp: 30, sp: 12, ap: 12, gear: 6, luck: 20 },
    }[this.bossTier(bossId)];
    run.level = cfg.lvl;
    run.xp = 0;
    const wDist = (n) => ({ damage: Math.round(n * 0.45), speed: Math.round(n * 0.3), effect: Math.round(n * 0.15), reach: Math.round(n * 0.1) });
    run.weaponPoints = wDist(cfg.wp);
    run.secondaryPoints = wDist(cfg.sp);
    run.abilityPoints = { power: Math.round(cfg.ap * 0.4), area: Math.round(cfg.ap * 0.25), haste: Math.round(cfg.ap * 0.2), amount: Math.round(cfg.ap * 0.15) };
    run.equipment = {};
    for (const slot of DROP_SLOTS.slice(0, cfg.gear)) {
      const it = rollItem(cfg.luck, slot.id);
      if (it) run.equipment[slot.id] = it;
    }

    this.registry.set('run', run);
    this.scene.start('GameScene');
  }
}
