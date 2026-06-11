// CombatManualScene — static scrollable reference panel for all advanced
// combat mechanics.  Opened from PauseScene ("Combat Manual") and from
// MenuScene ("? Manual").  Shares the monospace / drawPanel chrome used
// by every other overlay in the game.
//
// The panel is split into pages (keyboard ← / → or click arrows) so it
// stays readable at 960×540.  All content is static text.

import Phaser from 'phaser';
import { drawPanel } from '../art/ui.js';
import { Settings, keyLabel } from '../systems/Settings.js';

// Page content.  Each page has a `title` and an array of `sections`,
// each with a `heading` and `lines` (string array, blank string = blank line).
function buildPages(binds) {
  const kPri  = keyLabel(binds.primary);
  const kSec  = keyLabel(binds.secondary);
  const kUlt  = keyLabel(binds.ultimate);
  const kDash = keyLabel(binds.dash);

  return [
    {
      title: 'Combat Manual — Movement & Defence',
      sections: [
        {
          heading: 'MOVEMENT',
          lines: [
            'Move: WASD / Arrow keys',
            'Attack direction follows your last move heading.',
          ],
        },
        {
          heading: `DASH  [${kDash}]`,
          lines: [
            '2 charges, each recharges in 1.8 s.',
            'During the ~300 ms burst you are invulnerable (i-frames).',
            'Cyan pips below your HP bar show available charges.',
            'Direction: current movement input, or last heading if standing still.',
            '',
            'Tip: use dashes to escape melee crushes, not just dodge bullets.',
          ],
        },
        {
          heading: 'PERFECT DODGE',
          lines: [
            'Dash THROUGH an attack while it overlaps you.',
            '→ "PERFECT" floats above your head.',
            '→ Secondary cooldown resets immediately.',
            '→ +25% damage buff for 1.2 s.',
            'One proc per 3 s cooldown — don\'t spam it.',
            '',
            'Tip: anticipate the slash arc or bullet — dash late, not early.',
          ],
        },
      ],
    },
    {
      title: 'Combat Manual — Offense',
      sections: [
        {
          heading: `COMBO STRING  [${kPri}] TAP × 4`,
          lines: [
            `Tap [${kPri}] up to 4 times within ~0.9 s — each tap is a DIFFERENT swing`,
            '  (wider arc, thrust, radial spin…).  Four gold pips below the HP bar',
            '  show how deep into the string you are.',
            '',
            `CHARGE FINISHER — tap [${kSec}] MID-STRING for an INSTANT finisher:`,
            `  [${kPri}],[${kSec}]           → C2  (medium hit, ~1.4× base)`,
            `  [${kPri}],[${kPri}],[${kSec}]       → C3  (heavy hit, ~1.7×, wider)`,
            `  [${kPri}],[${kPri}],[${kPri}],[${kSec}]   → C4  GRAND FINISHER (~2.5×, full nova)`,
            `A [${kSec}] glyph pulses gold when a finisher is ready.`,
            '',
            `Accessibility: hold [${kPri}] mid-string to release the same finisher`,
            '  (same 1.2 s per-finisher cooldown applies either way).',
            '',
            'Dash preserves string depth — the chain window keeps ticking.',
            'Taking a real hit resets the string to neutral.',
            '',
            '→ See per-hero move names, effect tags, and live demos:',
            '  open the full Combo List from the Pause menu.',
          ],
        },
        {
          heading: `SECONDARY  [${kSec}]  (from neutral)`,
          lines: [
            `[${kSec}] from neutral = secondary skill (~3 s cooldown).`,
            `[${kSec}] DURING an active string = charge finisher (see above).`,
            'After a Perfect Dodge the secondary cooldown resets: punish immediately.',
          ],
        },
        {
          heading: `ULTIMATE  [${kUlt}]`,
          lines: [
            '~10 s cooldown.  Upgraded every 5 levels (★ milestone cards).',
            'GRAZE charges the ult: enemy bullets that nearly miss you (≈30 px)',
            '  shave 150 ms off the cooldown.  Rate-capped to ~5/sec.',
            '  Dodge and graze work together — a near-miss dash still grazes.',
          ],
        },
        {
          heading: 'COUNTER-HIT',
          lines: [
            'Enemies FLASH RED during their windup telegraph.',
            'Hit them during the flash → ×1.5 damage, cancel the attack,',
            '  gold burst FX, 0.3 s stun.',
            '',
            'Tip: watch for the red flash; commit a swing and stay aggressive.',
          ],
        },
      ],
    },
    {
      title: 'Combat Manual — Momentum & Rewards',
      sections: [
        {
          heading: 'MOMENTUM (Streak)',
          lines: [
            'Every kill without taking damage adds 1 to your streak (x counter',
            '  shown below the HP bar).',
            'Streak bonus — up to streak 30:',
            '  +1% damage per streak  (cap: +30%)',
            '  +0.4% move speed per streak  (cap: +10%)',
            'Any real hit resets the streak to 0.',
            '',
            'Tip: once you hit x10 the bonus is significant — protect it.',
          ],
        },
        {
          heading: 'FLAWLESS FLOOR',
          lines: [
            'Clear a floor without taking a single real hit.',
            '→ A bonus chest spawns at the stairs.',
            'Blocked damage (dodge / i-frames) does NOT break flawless.',
          ],
        },
        {
          heading: 'GRAZE',
          lines: [
            'An enemy bullet passing within ~30 px without hitting you.',
            '→ Cyan spark at your edge + 150 ms shaved from ult cooldown.',
            'Rate-limited to ~5 grazes/sec; blocked while dash-invulnerable.',
          ],
        },
      ],
    },
    {
      title: 'Combat Manual — Level-up Draft',
      sections: [
        {
          heading: 'DRAFT CONTROLS',
          lines: [
            '[R]  Reroll — one free reroll per level-up presentation.',
            '[B]  Banish — remove an axis from all future drafts this run.',
            '     2 banish charges per run.',
            '[L]  Lock — guarantee a specific card appears in the NEXT draft.',
            '     Click a numbered card, or press the card\'s number key.',
          ],
        },
        {
          heading: 'EVOLVE CARDS  (golden border)',
          lines: [
            'Requires: skill at upgrade cap + at least one artifact equipped.',
            'Replaces all normal cards for that skill with one golden EVOLVE card.',
            'Picking it permanently transforms the skill into its evolved form.',
            '',
            'Tip: collect artifacts at the ArtifactScene between stages.',
          ],
        },
        {
          heading: 'MUTATION CARDS  (purple border)',
          lines: [
            'Available from level 10+.  ~35% chance per draft.',
            'Permanently alters your playstyle for the rest of the run.',
            'Each mutation can only be picked once per run.',
            'Examples: Ricochet · Echo · Deathburst · Bloodrush · Billiards',
          ],
        },
        {
          heading: 'RESONANCES',
          lines: [
            'Investing 4+ points in matching weapon + ability axes unlocks a',
            '  passive synergy bonus (shown in the HUD left column).',
            'Blade & Breath · Range & Reach · Storm & Haste · Arsenal & Multitude',
          ],
        },
      ],
    },
  ];
}

export default class CombatManualScene extends Phaser.Scene {
  constructor() {
    super('CombatManualScene');
  }

  init(data) {
    // 'caller' is the scene key to return to ('PauseScene' or 'MenuScene').
    // When returning to PauseScene we also need the gameScene reference.
    this.caller = (data && data.caller) || 'MenuScene';
    this.gs = (data && data.gameScene) || null;
    this._page = 0;
  }

  create() {
    const { width, height } = this.scale;
    const pages = buildPages(Settings.binds);
    this._pages = pages;

    this.add.rectangle(0, 0, width, height, 0x05040a, 0.95).setOrigin(0);

    // Build the first page.
    this._pageObjs = [];
    this._buildPage(this._page);

    // Navigation: left / right arrows + keyboard.
    const navY = height - 22;

    this._leftBtn = this.add.text(50, navY, '◀ Prev', {
      fontFamily: 'monospace', fontSize: '15px', color: '#9a93c0',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._leftBtn.on('pointerover', () => this._leftBtn.setColor('#ffffff'));
    this._leftBtn.on('pointerout', () => this._leftBtn.setColor('#9a93c0'));
    this._leftBtn.on('pointerdown', () => this._changePage(-1));

    this._rightBtn = this.add.text(width - 50, navY, 'Next ▶', {
      fontFamily: 'monospace', fontSize: '15px', color: '#9a93c0',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    this._rightBtn.on('pointerover', () => this._rightBtn.setColor('#ffffff'));
    this._rightBtn.on('pointerout', () => this._rightBtn.setColor('#9a93c0'));
    this._rightBtn.on('pointerdown', () => this._changePage(1));

    // "[ Close ]" sits left-of-centre and the page label right-of-centre, on the same
    // nav row — they previously shared width/2,navY and rendered on top of each other
    // ("[Pa[ Close ] 4]").
    const back = this.add.text(width / 2 - 70, navY, '[ Close ]', {
      fontFamily: 'monospace', fontSize: '16px', color: '#9ef58b', fontStyle: 'bold',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this._pageLabel = this.add.text(width / 2 + 80, navY, '', {
      fontFamily: 'monospace', fontSize: '12px', color: '#7d7896',
    }).setOrigin(0.5);
    back.on('pointerover', () => back.setColor('#ffffff'));
    back.on('pointerout', () => back.setColor('#9ef58b'));
    back.on('pointerdown', () => this._close());

    this._updateNav();

    this.input.keyboard.on('keydown-LEFT',      () => this._changePage(-1));
    this.input.keyboard.on('keydown-RIGHT',     () => this._changePage(1));
    this.input.keyboard.on('keydown-ESC',       () => this._close());
    this.input.keyboard.on('keydown-BACKSPACE', () => this._close());
    this.input.keyboard.on('keydown-DELETE',    () => this._close());
  }

  _buildPage(idx) {
    // Destroy previous page objects.
    for (const o of this._pageObjs) if (o && o.destroy) o.destroy();
    this._pageObjs = [];
    const reg = (o) => { this._pageObjs.push(o); return o; };

    const { width, height } = this.scale;
    const pages = this._pages;
    const pg = pages[idx];
    if (!pg) return;

    const PANEL_X = 40, PANEL_Y = 20;
    const PANEL_W = width - 80;
    const PANEL_H = height - 60;
    const ACCENT = 0xffd27a;

    const g = reg(this.add.graphics());
    drawPanel(g, PANEL_X, PANEL_Y, PANEL_W, PANEL_H, ACCENT, { header: 36 });

    // Title
    reg(this.add.text(width / 2, PANEL_Y + 20, pg.title, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5, 0.5));

    // Sections — laid out top-down with small margins.
    const CONTENT_X = PANEL_X + 28;
    const CONTENT_W = PANEL_W - 56;
    const contentTop = PANEL_Y + 48;
    const contentBottom = PANEL_Y + PANEL_H - 14; // keep clear of the panel's bottom border

    // The longest page (Offense) overflowed the panel at the default metrics. Measure
    // the content's natural height and, if it exceeds the available space, step the line
    // height / fonts / gaps down so every page always fits inside its panel.
    const sectionCount = pg.sections.length;
    let lineCount = 0, blankCount = 0;
    for (const sec of pg.sections) {
      for (const line of sec.lines) (line === '' ? blankCount++ : lineCount++);
    }
    const avail = contentBottom - contentTop;
    // Candidate metric tiers, roomiest first.
    const tiers = [
      { LINE_H: 16, HEAD_H: 20, GAP: 14, BLANK: 6,  head: '13px', body: '11px' },
      { LINE_H: 14, HEAD_H: 18, GAP: 11, BLANK: 5,  head: '12px', body: '10px' },
      { LINE_H: 13, HEAD_H: 16, GAP: 9,  BLANK: 4,  head: '11px', body: '10px' },
      { LINE_H: 12, HEAD_H: 15, GAP: 7,  BLANK: 3,  head: '11px', body: '9px'  },
    ];
    const needed = (t) => sectionCount * (t.HEAD_H + t.GAP) + lineCount * t.LINE_H + blankCount * t.BLANK;
    const m = tiers.find((t) => needed(t) <= avail) || tiers[tiers.length - 1];

    let y = contentTop;
    for (const sec of pg.sections) {
      // Section heading
      reg(this.add.text(CONTENT_X, y, sec.heading, {
        fontFamily: 'monospace', fontSize: m.head, color: '#8fe6ff', fontStyle: 'bold',
      }));
      y += m.HEAD_H;

      for (const line of sec.lines) {
        if (line === '') { y += m.BLANK; continue; }
        reg(this.add.text(CONTENT_X + 10, y, line, {
          fontFamily: 'monospace', fontSize: m.body, color: '#dcd8ee',
          wordWrap: { width: CONTENT_W - 10 },
        }));
        y += m.LINE_H;
      }
      y += m.GAP; // section gap
    }
  }

  _changePage(dir) {
    const next = this._page + dir;
    if (next < 0 || next >= this._pages.length) return;
    this._page = next;
    this._buildPage(this._page);
    this._updateNav();
  }

  _updateNav() {
    const total = this._pages.length;
    if (this._pageLabel) this._pageLabel.setText(`Page ${this._page + 1} / ${total}`);
    // Show/hide nav arrows based on position.
    if (this._leftBtn) this._leftBtn.setAlpha(this._page > 0 ? 1 : 0.3);
    if (this._rightBtn) this._rightBtn.setAlpha(this._page < total - 1 ? 1 : 0.3);
  }

  _close() {
    if (this.caller === 'PauseScene' && this.gs) {
      this.scene.start('PauseScene', { gameScene: this.gs });
    } else {
      this.scene.start('MenuScene');
    }
  }
}
