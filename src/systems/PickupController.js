import Phaser from 'phaser';
import { rollItem } from '../data/equipment.js';
import { stageIndex } from '../data/campaign.js';
import { Audio } from './AudioManager.js';

// Owns droppables (XP gems, health hearts, chests, power-up orbs) and the
// interactables they relate to (shrines, breakable crates): their spawn helpers,
// the pickup overlap callbacks, the magnet, and power-up application. Operates
// on GameScene; combat (killEnemy/defeatBoss) calls the spawn helpers via it,
// and SpawnSystem/WeaponSystem reach spawnChest/damageBreakable through thin
// GameScene delegators.
export default class PickupController {
  constructor(scene) {
    this.s = scene;
  }

  // --- spawn helpers ---
  spawnGem(x, y, value) {
    const g = this.s.gems.get(x, y, 'gem');
    if (!g) return;
    g.setActive(true).setVisible(true);
    g.body.reset(x, y);
    g.body.enable = true;
    g.setDepth(4);
    g.value = value;
  }

  // Spawn `amount` coin pickups (1 per coin object — stackable by passing amount > 1
  // which scatters multiple coins in a small burst radius).
  spawnCoins(x, y, amount = 1) {
    const s = this.s;
    if (!s.coins) return;
    const count = Math.max(1, Math.round(amount));
    for (let i = 0; i < count; i++) {
      const ang = (count === 1) ? 0 : (i / count) * Math.PI * 2;
      const d = count === 1 ? 0 : Phaser.Math.Between(8, 28);
      const cx = x + Math.cos(ang) * d;
      const cy = y + Math.sin(ang) * d;
      const pos = this._snap(cx, cy);
      const c = s.coins.get(pos.x, pos.y, 'coin');
      if (!c) continue;
      s.tweens.killTweensOf(c);
      c.setActive(true).setVisible(true);
      c.body.reset(pos.x, pos.y);
      c.body.enable = true;
      c.setDepth(4);
      c.value = 1;
      // brief launch-bounce: pop upward then settle
      if (count > 1) {
        const vx = Math.cos(ang) * Phaser.Math.Between(30, 80);
        const vy = Math.sin(ang) * Phaser.Math.Between(30, 80) - 30;
        c.setVelocity(vx, vy);
        s.time.delayedCall(220, () => { if (c.active) c.setVelocity(0, 0); });
      }
    }
  }

  // Keep a drop out of the dungeon's walls: if (x,y) isn't walkable floor, nudge it to
  // the nearest walkable point so chests/orbs/hearts never spawn embedded in rock.
  _snap(x, y) {
    const s = this.s;
    if (!s.dungeonMode || !s.floorSys) return { x, y };
    if (s.floorSys.isWalkable(x, y)) return { x, y };
    return s.floorSys.randomWalkableNear(x, y, 160);
  }

  spawnHeart(x, y) {
    // Famine mandate: hearts never drop
    if (this.s.contract && this.s.contract.noHearts) return;
    ({ x, y } = this._snap(x, y));
    const h = this.s.pickups.get(x, y, 'pickup_heart');
    if (!h) return;
    h.setActive(true).setVisible(true);
    h.body.reset(x, y);
    h.body.enable = true;
    h.setDepth(4);
  }

  spawnChest(x, y) {
    const s = this.s;
    if (x === undefined) {
      // drop ahead of the player, within view but not on top of them
      const ang = Math.random() * Math.PI * 2;
      const d = Phaser.Math.Between(180, 320);
      x = s.player.x + Math.cos(ang) * d;
      y = s.player.y + Math.sin(ang) * d;
    }
    ({ x, y } = this._snap(x, y));
    const c = s.chests.get(x, y, 'chest');
    if (!c) return;
    s.tweens.killTweensOf(c); // a pooled chest must not carry a stale bob tween
    c.setActive(true).setVisible(true);
    c.body.reset(x, y);
    c.body.enable = true;
    c.setDepth(4);
    c.y = y; // sits still on the floor (no up/down bob)
  }

  spawnPowerup(x, y, type) {
    const s = this.s;
    ({ x, y } = this._snap(x, y));
    const t = type || ['atk', 'def', 'spd', 'invuln'][Phaser.Math.Between(0, 3)];
    const u = s.powerups.get(x, y, `pu_${t}`);
    if (!u) return;
    u.setActive(true).setVisible(true);
    u.body.reset(x, y);
    u.body.enable = true;
    u.setDepth(4).setScale(0.7);
    u.ptype = t;
    s.tweens.add({ targets: u, scale: 0.82, duration: 500, yoyo: true, repeat: -1 });
  }

  // Strong timed effects (from power-up orbs and shrines).
  applyPowerup(type) {
    const s = this.s;
    const p = s.player;
    const now = s.time.now;
    switch (type) {
      case 'atk': p.addBuff('damage', 2, 10000, now); s.showBanner('2× ATTACK (10s)', '#ff8a8a'); break;
      case 'def': p.addBuff('defense', 0.5, 10000, now); s.showBanner('2× DEFENSE (10s)', '#8ac0ff'); break;
      case 'spd': p.addBuff('speed', 2, 10000, now); s.showBanner('2× SPEED (10s)', '#9ef58b'); break;
      case 'invuln': p.addBuff('invuln', 1, 10000, now); s.showBanner('INVULNERABLE (10s)', '#ffe08a'); break;
      case 'heal': p.heal(p.maxHp * 0.15, { overCap: true }); s.showBanner('Restored', '#9ef58b'); break;
      default: break;
    }
    Audio.sfx('levelup');
  }

  openLoot() {
    const s = this.s;
    s.lootOpen = true;
    // Both the RARITY bias and the raw STAT power scale with CONTINUOUS conquest depth
    // (cleared stages × floors + current floor) + character luck — so gear keeps pace with
    // the (now continuous) difficulty all the way through the 7/7 conquest, and a deep floor
    // rolls richer loot than an early one. Early game still stays common.
    const depth = s.conquestDepth;
    // VAULT mod: +8 loot luck for treasure opened on this floor
    const vaultBonus = (s.activeFloorMod && s.activeFloorMod.type === 'VAULT') ? 8 : 0;
    // Mandate of Heaven: heat*1.5 additional loot luck
    const mandateLuck = s._mandateLootLuck || 0;
    const luck = depth * 0.3 + (s.player.luck || 0) + vaultBonus + mandateLuck;
    const powerMult = 1 + depth * 0.012; // deeper floors → bigger stat rolls (≈2.6× by the end)
    const item = rollItem(luck, null, powerMult);
    s.scene.pause();
    s.scene.launch('LootScene', { gameScene: s, item });
  }

  // Gems + hearts + power-ups drift toward the player within pickup range.
  updateMagnet() {
    const s = this.s;
    const px = s.player.x;
    const py = s.player.y;
    // CURSED mod: shrink the pickup radius by 20%
    const cursedMult = (s._cursedPickupMult !== undefined) ? s._cursedPickupMult : 1;
    const effectivePickup = s.player.pickup * cursedMult;
    const pr2 = effectivePickup * effectivePickup;
    const pull = (obj) => {
      const ddx = px - obj.x;
      const ddy = py - obj.y;
      const d2 = ddx * ddx + ddy * ddy;
      if (d2 < pr2) {
        const ang = Math.atan2(ddy, ddx);
        const v = Phaser.Math.Clamp(420 - Math.sqrt(d2), 120, 420);
        obj.setVelocity(Math.cos(ang) * v, Math.sin(ang) * v);
      }
    };
    for (const g of s.gems.getChildren()) if (g.active) pull(g);
    for (const h of s.pickups.getChildren()) if (h.active) pull(h);
    for (const u of s.powerups.getChildren()) if (u.active) pull(u);
    if (s.coins) for (const c of s.coins.getChildren()) if (c.active) pull(c);
  }

  // --- overlap callbacks ---
  onGem(player, gem) {
    if (!gem.active) return;
    const gemX = gem.x, gemY = gem.y; // capture before deactivate clears position
    this.s.deactivate(gem);
    Audio.sfx('pickup');
    const gained = player.addXp(gem.value);
    if (gained > 0) this.s.pendingLevels += gained;
    // Gem Detonator mutation: collecting a gem bursts shrapnel at nearby enemies.
    if (player.mutations && player.mutations.gem_detonator) {
      const gs = this.s;
      gs.abilityNova(gemX, gemY, 72, 8 + Math.round(player.damageMult * 4), 0xffe08a, 0);
      gs.fx.shockwave(gemX, gemY, 0xffe08a, 72);
    }
  }

  onChest(player, chest) {
    if (!chest.active || this.s.lootOpen) return;
    this.s.deactivate(chest);
    // Chest gold bonus: 5-9 coins scatter around the chest position
    const chestX = chest.x, chestY = chest.y;
    const rawBonus = Phaser.Math.Between(5, 9);
    // Iron Frugality omen: chests drop 1 less gold coin (min 1)
    const chestPenalty = (this.s.run && this.s.run._omenChestGoldPenalty) || 0;
    const coinBonus = Math.max(1, rawBonus - chestPenalty);
    this.spawnCoins(chestX, chestY, coinBonus);
    this.openLoot();
  }

  onCoin(player, coin) {
    if (!coin.active) return;
    const s = this.s;
    s.deactivate(coin);
    Audio.sfx('pickup');
    // Accumulate gold on the run object
    if (!s.run.gold) s.run.gold = 0;
    // Mandate of Heaven: gold income scaled by mandateGoldMult (heat*5%)
    const goldMult = (s.run && s.run.mandateGoldMult) || 1;
    const earned = Math.round((coin.value || 1) * goldMult);
    s.run.gold += earned;
  }

  onHeart(player, heart) {
    if (!heart.active) return;
    this.s.deactivate(heart);
    player.heal(8);
    Audio.sfx('pickup');
  }

  onPowerup(player, pu) {
    if (!pu.active) return;
    this.s.deactivate(pu);
    this.applyPowerup(pu.ptype);
  }

  onShrine(player, sh) {
    if (sh.used) return;
    sh.used = true;
    sh.setTint(0x555560);
    // mostly a strong power-up, occasionally a (small) heal
    const type = Math.random() < 0.25 ? 'heal' : ['atk', 'def', 'spd', 'invuln'][Phaser.Math.Between(0, 3)];
    this.applyPowerup(type);
  }

  onProjectileHitBreakable(projectile, b) {
    if (!projectile.active || !b.active) return;
    if (projectile.hitSet && projectile.hitSet.has(b)) return;
    this.damageBreakable(b, projectile.damage);
    if (projectile.hitSet) projectile.hitSet.add(b);
    projectile.pierceLeft -= 1;
    if (projectile.pierceLeft <= 0) this.s.deactivate(projectile);
  }

  damageBreakable(b, amount) {
    const s = this.s;
    if (!b.active) return;
    b.hp -= amount;
    s.fx.impact(b.x, b.y);
    Audio.sfx('hit');
    b.setTintFill(0xffffff);
    s.time.delayedCall(50, () => b.active && b.clearTint());
    if (b.hp <= 0) this.breakBreakable(b);
  }

  breakBreakable(b) {
    const s = this.s;
    s.fx.death(b.x, b.y);
    const drops = Phaser.Math.Between(1, 2);
    for (let i = 0; i < drops; i++) {
      this.spawnGem(b.x + Phaser.Math.Between(-12, 12), b.y + Phaser.Math.Between(-12, 12), 1);
    }
    const roll = Math.random();
    if (roll < 0.16) this.spawnHeart(b.x, b.y);
    else if (roll < 0.18) this.spawnChest(b.x, b.y); // chest from a crate: 4% -> 2%
    b.destroy();
  }
}
