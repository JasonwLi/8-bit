import Phaser from 'phaser';
import { drawPanel } from '../art/ui.js';
import { rollItem } from '../data/equipment.js';
import { Audio } from '../systems/AudioManager.js';

// ── MerchantScene ─────────────────────────────────────────────────────────────
// Modal shop that appears on every 4th floor (non-boss). Pauses GameScene.
// Offers: 3 gear items + HEAL + BANISH CHARGE + REROLL TOKEN + one CURSED BARGAIN.
// Gold is stored on run.gold; all purchases deduct immediately.
// Dismissed by Esc / clicking "Leave" — resumes GameScene via the shutdown event.

const W = 960;
const H = 540;

// Base prices (gold). Scaled by rarity and conquestDepth.
const HEAL_BASE_PRICE  = 18;
const BANISH_PRICE     = 22;
const REROLL_PRICE     = 16;
const CURSED_PRICE_MULT = 0.50; // cursed bargain = 50% of normal gear price

// Rarity price multipliers (applied to gear items)
const RARITY_PRICE = { common: 8, rare: 18, epic: 32, legendary: 55 };

export default class MerchantScene extends Phaser.Scene {
  constructor() { super('MerchantScene'); }

  init(data) {
    this.gs = data.gameScene;
  }

  create() {
    const gs = this.gs;
    const run = gs.run;
    const accent = gs.theme ? gs.theme.accent : 0xffd700;

    Audio.sfx('levelup'); // satisfying chime on open

    // Dim overlay
    this.add.rectangle(0, 0, W, H, 0x05040a, 0.88).setOrigin(0).setDepth(0);

    // Title panel
    const g = this.add.graphics().setDepth(1);
    drawPanel(g, W / 2 - 340, 28, 680, 52, accent, { header: 52, radius: 8 });

    this.add.text(W / 2, 34, 'WAR-CAMP MERCHANT', {
      fontFamily: 'monospace', fontSize: '22px', color: '#ffd700', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setDepth(2);

    // Gold display
    const gold = run.gold || 0;
    this.goldDisplay = this.add.text(W / 2, 58, `Gold: ${gold}`, {
      fontFamily: 'monospace', fontSize: '14px', color: '#ffd700',
    }).setOrigin(0.5, 0).setDepth(2);

    // Compute prices
    const depth = gs.conquestDepth || 0;
    const omenDiscount = (gs.run && gs.run._omenMerchantDiscount) || 1; // Iron Frugality omen
    // War Tithe mandate: merchants charge +50% (or whatever merchantPriceMult is set to)
    const mandatePriceMult = (gs.contract && gs.contract.merchantPriceMult) || 1;
    const priceMult = (gs._cursedPriceMult || 1) * (1 + depth * 0.04) * omenDiscount * mandatePriceMult; // deeper = pricier

    // Roll 3 gear items
    const luck = depth * 0.3 + (gs.player.luck || 0);
    const powerMult = 1 + depth * 0.012;
    this._gearItems = [
      rollItem(luck, null, powerMult),
      rollItem(luck, null, powerMult),
      rollItem(luck, null, powerMult),
    ];
    this._soldOut = [false, false, false, false, false, false, false]; // 3 gear + heal + banish + reroll + cursed

    // Build the shop UI
    this._buildShop(priceMult);

    // Leave button
    const lb = this.add.text(W / 2, H - 28, '[Esc]  Leave', {
      fontFamily: 'monospace', fontSize: '14px', color: '#9a93c0',
    }).setOrigin(0.5, 1).setDepth(2).setInteractive({ useHandCursor: true });
    lb.on('pointerover', () => lb.setColor('#ffffff'));
    lb.on('pointerout', () => lb.setColor('#9a93c0'));
    lb.on('pointerdown', () => this._close());

    this.input.keyboard.on('keydown-ESC', () => this._close());
  }

  _buildShop(priceMult) {
    if (this._shopObjs) this._shopObjs.forEach((o) => o.destroy());
    this._shopObjs = [];
    const reg = (o) => { this._shopObjs.push(o); return o; };

    const gs = this.gs;
    const run = gs.run;
    const gold = run.gold || 0;
    const depth = gs.conquestDepth || 0;

    // ── Row 1: 3 gear items (y ≈ 120) ────────────────────────────────────────
    const gearY = 120;
    const cardW = 180;
    const cardH = 160;
    const gearGap = 16;
    const gearStartX = W / 2 - (3 * cardW + 2 * gearGap) / 2 + cardW / 2;

    for (let i = 0; i < 3; i++) {
      const item = this._gearItems[i];
      const basePrice = RARITY_PRICE[item.rarity] || 10;
      const price = Math.max(1, Math.round(basePrice * priceMult));
      const cx = gearStartX + i * (cardW + gearGap);
      const cy = gearY + cardH / 2;
      this._buildGearCard(cx, cy, cardW, cardH, item, price, i, gold, reg);
    }

    // ── Row 2: service items (y ≈ 310) ───────────────────────────────────────
    const svcY = 310;
    const svcCards = [
      {
        idx: 3,
        label: 'HEAL',
        detail: '+35% max HP',
        color: 0x66dd88,
        price: Math.max(1, Math.round(HEAL_BASE_PRICE * priceMult)),
        desc: `Restore 35% of your maximum HP.`,
      },
      {
        idx: 4,
        label: '+1 BANISH',
        detail: 'Extra banish charge',
        color: 0xe8a040,
        price: Math.max(1, Math.round(BANISH_PRICE * priceMult)),
        desc: 'Gain one extra UpgradeScene banish charge.',
      },
      {
        idx: 5,
        label: 'REROLL',
        detail: 'Extra upgrade reroll',
        color: 0x9a93c0,
        price: Math.max(1, Math.round(REROLL_PRICE * priceMult)),
        desc: 'Grants one extra reroll token in your next upgrade draft.',
      },
      {
        idx: 6,
        label: 'CURSED BARGAIN',
        detail: 'Relic-tier item — 2-floor curse',
        color: 0xb05aff,
        price: Math.max(1, Math.round(RARITY_PRICE.legendary * priceMult * CURSED_PRICE_MULT)),
        desc: 'Powerful legendary gear at half price, but a 2-floor curse is applied.',
        cursed: true,
      },
    ];

    const svcCardW = 196;
    const svcCardH = 130;
    const svcGap = 12;
    const svcTotal = svcCards.length * svcCardW + (svcCards.length - 1) * svcGap;
    const svcStartX = (W - svcTotal) / 2 + svcCardW / 2;

    for (let i = 0; i < svcCards.length; i++) {
      const svc = svcCards[i];
      const cx = svcStartX + i * (svcCardW + svcGap);
      const cy = svcY + svcCardH / 2;
      this._buildSvcCard(cx, cy, svcCardW, svcCardH, svc, gold, depth, reg);
    }
  }

  _buildGearCard(cx, cy, w, h, item, price, idx, gold, reg) {
    const sold = this._soldOut[idx];
    const canAfford = gold >= price && !sold;
    const colAccent = sold ? 0x444455 : (item.color || 0x9a93c0);

    const g = reg(this.add.graphics().setDepth(1));
    drawPanel(g, cx - w / 2, cy - h / 2, w, h, colAccent, { header: 26, radius: 8 });
    if (sold) g.setAlpha(0.45);

    // Item icon
    const ikey = item.icon && this.textures.exists(item.icon) ? item.icon : (item.baseIcon || 'chest');
    if (this.textures.exists(ikey)) {
      reg(this.add.image(cx, cy - 32, ikey).setScale(1.1).setDepth(2).setAlpha(sold ? 0.35 : 1));
    }
    // Item name — top-anchored so long legendary names that wrap to two lines grow
    // downward into the free space above the price instead of overlapping the slot.
    const nameText = reg(this.add.text(cx, cy - 6, item.name || '?', {
      fontFamily: 'monospace', fontSize: '12px', color: sold ? '#555566' : (item.textColor || '#ffffff'),
      fontStyle: 'bold', align: 'center', wordWrap: { width: w - 12 },
    }).setOrigin(0.5, 0).setDepth(2));
    // Slot — placed just below whatever height the (possibly two-line) name took.
    reg(this.add.text(cx, cy - 6 + nameText.height + 4, item.slot || '', {
      fontFamily: 'monospace', fontSize: '10px', color: '#7a7896', align: 'center',
    }).setOrigin(0.5, 0).setDepth(2));
    // Price
    const priceColor = sold ? '#555566' : (gold >= price ? '#ffd700' : '#ff5252');
    reg(this.add.text(cx, cy + h / 2 - 18, sold ? 'SOLD' : `$ ${price}`, {
      fontFamily: 'monospace', fontSize: '13px', color: priceColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2));

    if (!sold) {
      const zone = reg(this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: canAfford }).setDepth(3));
      zone.on('pointerdown', () => this._buyGear(idx, price));
      if (!canAfford) zone.disableInteractive();
    }
  }

  _buildSvcCard(cx, cy, w, h, svc, gold, depth, reg) {
    const sold = this._soldOut[svc.idx];
    const canAfford = gold >= svc.price && !sold;
    const colAccent = sold ? 0x444455 : svc.color;

    const g = reg(this.add.graphics().setDepth(1));
    drawPanel(g, cx - w / 2, cy - h / 2, w, h, colAccent, { header: 24, radius: 8 });
    if (sold) g.setAlpha(0.45);

    // Label
    reg(this.add.text(cx, cy - h / 2 + 13, svc.label, {
      fontFamily: 'monospace', fontSize: '13px', color: sold ? '#555566' : '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2));
    // Detail
    reg(this.add.text(cx, cy - 10, svc.detail, {
      fontFamily: 'monospace', fontSize: '10px', color: '#c9c4e0', align: 'center',
      wordWrap: { width: w - 20 },
    }).setOrigin(0.5).setDepth(2));
    // Desc
    reg(this.add.text(cx, cy + 14, svc.desc, {
      fontFamily: 'monospace', fontSize: '9px', color: '#9a93c0', align: 'center',
      wordWrap: { width: w - 20 },
    }).setOrigin(0.5, 0).setDepth(2));
    // Price
    const priceColor = sold ? '#555566' : (gold >= svc.price ? '#ffd700' : '#ff5252');
    reg(this.add.text(cx, cy + h / 2 - 15, sold ? 'SOLD' : `$ ${svc.price}`, {
      fontFamily: 'monospace', fontSize: '13px', color: priceColor, fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(2));

    if (!sold) {
      const zone = reg(this.add.zone(cx, cy, w, h).setInteractive({ useHandCursor: canAfford }).setDepth(3));
      zone.on('pointerdown', () => this._buySvc(svc, depth));
      if (!canAfford) zone.disableInteractive();
    }
  }

  _deductGold(price) {
    const run = this.gs.run;
    if (!run.gold) run.gold = 0;
    run.gold = Math.max(0, run.gold - price);
    this.goldDisplay.setText(`Gold: ${run.gold}`);
  }

  _buyGear(idx, price) {
    if (this._soldOut[idx]) return;
    const run = this.gs.run;
    if ((run.gold || 0) < price) return;

    this._deductGold(price);
    this._soldOut[idx] = true;
    Audio.sfx('equip');

    const item = this._gearItems[idx];
    // Compare vs current and equip if better (or show compare via LootScene-style modal).
    // For simplicity: auto-equip if the slot is empty, else launch a compare via LootScene.
    const current = this.gs.player.equipment[item.slot];
    if (!current) {
      this.gs.player.equip(item);
      this.gs.showBanner(`Equipped: ${item.name}`, item.textColor || '#9ef58b', 'normal');
    } else {
      // Pause MerchantScene and run LootScene compare — resume on LootScene close.
      this.scene.pause('MerchantScene');
      // LootScene expects gameScene.lootOpen gating
      this.gs.lootOpen = true;
      this.scene.launch('LootScene', { gameScene: this.gs, item });
      this.scene.get('LootScene').events.once('shutdown', () => {
        this.gs.lootOpen = false;
        this.scene.resume('MerchantScene');
        this._rebuildShop();
      });
      return;
    }
    this._rebuildShop();
  }

  _buySvc(svc, depth) {
    if (this._soldOut[svc.idx]) return;
    const run = this.gs.run;
    if ((run.gold || 0) < svc.price) return;

    this._deductGold(svc.price);
    this._soldOut[svc.idx] = true;
    Audio.sfx('equip');

    switch (svc.label) {
      case 'HEAL':
        this.gs.player.heal(Math.round(this.gs.player.maxHp * 0.35));
        this.gs.showBanner('Healed 35% HP', '#9ef58b', 'normal');
        break;
      case '+1 BANISH':
        run.banishesUsed = Math.max(0, (run.banishesUsed || 2) - 1); // add one charge back
        this.gs.showBanner('+1 banish charge', '#e8a040', 'normal');
        break;
      case 'REROLL':
        run.merchantRerolls = (run.merchantRerolls || 0) + 1;
        this.gs.showBanner('Upgrade reroll token acquired', '#9a93c0', 'normal');
        break;
      case 'CURSED BARGAIN': {
        // Roll a legendary item at half price; apply a 2-floor debuff (nextFloorMod chain)
        const powerMult = 1 + depth * 0.012;
        const legendaryItem = rollItem(depth * 0.3 + 50, null, powerMult * 1.5); // luck boosted for legendary
        const current2 = this.gs.player.equipment[legendaryItem.slot];
        if (!current2) {
          this.gs.player.equip(legendaryItem);
          this.gs.showBanner(`Cursed Bargain: ${legendaryItem.name}`, '#b05aff', 'normal');
        } else {
          this.scene.pause('MerchantScene');
          this.gs.lootOpen = true;
          this.scene.launch('LootScene', { gameScene: this.gs, item: legendaryItem });
          this.scene.get('LootScene').events.once('shutdown', () => {
            this.gs.lootOpen = false;
            this.scene.resume('MerchantScene');
            this._rebuildShop();
          });
          // Apply the 2-floor curse after the compare (set regardless of equip choice)
          this._applyCursedBargainDebuff();
          return;
        }
        this._applyCursedBargainDebuff();
        break;
      }
    }
    this._rebuildShop();
  }

  _applyCursedBargainDebuff() {
    const gs = this.gs;
    // Apply a 2-floor cursed modifier: price hike for the next 2 floors.
    gs._cursedPriceMult = Math.max(gs._cursedPriceMult || 1, 1.40); // +40% prices on next merchant
    gs._cursedBargainFloorsLeft = 2;
    // Store backup so the 2-floor re-apply loop can persist the debuff after floor transitions.
    gs._cursedBargainPriceMult  = 1.40;
    gs._cursedBargainPickupMult = null;
    gs._cursedBargainFogRadius  = null;
    gs.showBanner('Cursed Bargain: shop prices cursed for 2 floors', '#b05aff', 'normal');
  }

  _rebuildShop() {
    const depth = this.gs.conquestDepth || 0;
    const priceMult = (this.gs._cursedPriceMult || 1) * (1 + depth * 0.04);
    this._buildShop(priceMult);
  }

  _close() {
    this.gs.captureRunState();
    this.scene.stop('MerchantScene');
    // GameScene.resume is triggered by the shutdown event listener set in _openMerchant().
  }
}
