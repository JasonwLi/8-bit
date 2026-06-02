import { DUNGEON } from '../config.js';
import { generateFloor, WALL } from '../data/dungeon.js';

// Realizes one FloorData into the live scene: themed floor backdrop, greedy-meshed
// wall colliders (added to scene.obstacles), the stairs object, and tile<->world
// helpers used by spawning/navigation. Rebuilds itself on each floor.
export default class FloorSystem {
  constructor(scene) {
    this.scene = scene;
    this.tile = DUNGEON.tile;
    this.data = null;          // current FloorData
    this._visuals = [];        // sprites/graphics to destroy on rebuild
    this.stairs = null;        // {x,y,sprite,locked}
    this.fogRT = null;         // RenderTexture covering the floor; erased radially
    this._brush = null;        // reusable soft-circle image used to erase the fog
    this.exploredGrid = null;  // Uint8Array[cols*rows]: 1 where the player has seen the tile
  }

  worldToTile(x, y) { return { col: Math.floor(x / this.tile), row: Math.floor(y / this.tile) }; }
  tileToWorld(col, row) { return { x: col * this.tile + this.tile / 2, y: row * this.tile + this.tile / 2 }; }
  pixelW() { return this.data.cols * this.tile; }
  pixelH() { return this.data.rows * this.tile; }

  isWalkable(x, y) {
    const { col, row } = this.worldToTile(x, y);
    const d = this.data;
    if (!d || col < 0 || row < 0 || col >= d.cols || row >= d.rows) return false;
    return d.grid[row * d.cols + col] !== WALL;
  }

  // Is the straight line between two world points clear of walls? (Used by enemy AI to
  // decide whether to fire/beeline or route around a wall via the flow field.)
  hasLOS(x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const steps = Math.max(1, Math.ceil(Math.hypot(dx, dy) / (this.tile * 0.5)));
    for (let i = 1; i < steps; i++) {
      const t = i / steps;
      if (!this.isWalkable(x1 + dx * t, y1 + dy * t)) return false;
    }
    return true;
  }

  // A walkable world point within `radius` px of (x,y); falls back to room 0 centre.
  randomWalkableNear(x, y, radius = 520) {
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 180 + Math.random() * radius;
      const px = x + Math.cos(a) * r, py = y + Math.sin(a) * r;
      if (this.isWalkable(px, py)) return { x: px, y: py };
    }
    return this.startWorld();
  }

  // Build the floor: render backdrop, mesh walls into obstacle bodies, drop stairs.
  build(seed, opts = {}) {
    this.destroy();
    const theme = this.scene.theme;
    this.data = generateFloor(seed, DUNGEON);
    const d = this.data;

    // Wall tint: use per-civ themed texture when available (no heavy tint needed —
    // the texture's own colour provides the palette). Fall back to the generic
    // dungeon_wall with a dark grid-colour tint when no themed texture exists.
    const themedWallKey = `dungeon_wall_${theme.id}`;
    const wallKey = this.scene.textures.exists(themedWallKey) ? themedWallKey : 'dungeon_wall';
    // For themed walls, only apply a slight darken so the texture colour shows through
    // (walls should read a bit darker/dimmer than the lit floor, but NOT black).
    // For the generic fallback, use the old heavy-darken tint for backward-compat.
    const wallColor = wallKey === themedWallKey
      ? 0xcfcfcf  // slight darken — lets the texture's own colour show
      : Phaser.Display.Color.IntegerToColor(theme.grid).darken(8).color;

    // world + camera bounds = this floor
    this.scene.physics.world.setBounds(0, 0, this.pixelW(), this.pixelH());
    this.scene.cameras.main.setBounds(0, 0, this.pixelW(), this.pixelH());

    // Floor backdrop: reuse the civ's richly-themed procedural ground tile (the same
    // one the open world scrolls) so the cavern carries the map theme — just darkened
    // a touch for an underground mood. Falls back to the flat dungeon_floor tile.
    const civ = theme.id;
    const floorKey = this.scene.textures.exists(`bg_ground_${civ}`) ? `bg_ground_${civ}` : 'dungeon_floor';
    const floorImg = this.scene.add.tileSprite(0, 0, this.pixelW(), this.pixelH(), floorKey)
      .setOrigin(0).setDepth(-10);
    if (floorKey === 'dungeon_floor') floorImg.setTint(Phaser.Display.Color.IntegerToColor(theme.ground).lighten(28).color);
    else floorImg.setTint(0xbdb9c8); // keep the themed ground, dim it for cave atmosphere
    this._visuals.push(floorImg);

    // greedy-mesh wall cells into horizontal strips → fewer static bodies
    for (let row = 0; row < d.rows; row++) {
      let runStart = -1;
      for (let col = 0; col <= d.cols; col++) {
        const isWall = col < d.cols && d.grid[row * d.cols + col] === WALL;
        if (isWall && runStart === -1) runStart = col;
        if (!isWall && runStart !== -1) {
          this._wallStrip(runStart, row, col - runStart, wallColor, wallKey);
          runStart = -1;
        }
      }
    }

    // stairs (the escape) at the far room
    const sp = this.tileToWorld(d.stairs.col, d.stairs.row);
    const sprite = this.scene.add.image(sp.x, sp.y, 'stairs_down').setDepth(3).setScale(1.4);
    this.stairs = { x: sp.x, y: sp.y, sprite, locked: !!opts.lockStairs };
    if (this.stairs.locked) sprite.setAlpha(0.25).setTint(0x884444); // dim while a boss gates it
    this._visuals.push(sprite);

    // ── Fog of war: ONE dark RenderTexture over the whole floor (depth -6, above
    //    the floor backdrop + encounter markers, below walls/sprites/entities).
    //    The player erases a soft circle of it as they explore (radial reveal);
    //    erased terrain stays revealed. `exploredGrid` mirrors this for the minimap.
    this.exploredGrid = new Uint8Array(d.cols * d.rows);
    this.fogRT = this.scene.add.renderTexture(0, 0, this.pixelW(), this.pixelH())
      .setOrigin(0).setDepth(-6);
    this.fogRT.fill(0x05050a, 0.86);
    this._visuals.push(this.fogRT);
    // reusable soft brush (not added to the display list — only used to erase)
    this._brush = this.scene.make.image({ key: 'soft_circle', add: false }).setOrigin(0.5);

    // ── Encounter markers (scattered zones; revealed as fog is erased near them)
    for (const enc of d.encounters || []) {
      const { x: cx, y: cy } = this.tileToWorld(enc.col, enc.row);
      this._drawEncounterMarker(enc.kind, cx, cy);
    }

    // reveal a generous patch around the spawn so the player isn't blind on arrival
    this.revealAt(this.startWorld().x, this.startWorld().y, 300);

    return d;
  }

  // one merged wall rectangle of `len` tiles starting at (col,row). The collider is an
  // invisible greedy-meshed body; the visible rock is a tileSprite so the wall TEXTURE
  // repeats once per tile across the strip (stretching a detailed tile smears it).
  // wallColor is a pre-computed integer (0xRRGGBB) so the caller can vary it per civ.
  // wallKey is the texture key to use for the visible rock (defaults to 'dungeon_wall').
  _wallStrip(col, row, len, wallColor, wallKey = 'dungeon_wall') {
    const t = this.tile;
    // collider (invisible) — always uses the generic dungeon_wall key (physics only)
    const body = this.scene.obstacles.create(col * t + (len * t) / 2, row * t + t / 2, 'dungeon_wall');
    body.setDisplaySize(len * t, t).setVisible(false);
    body.body.setSize(len * t, t);
    body.refreshBody();
    this._visuals.push(body);
    // visible textured rock (repeats per-tile, no smear)
    const rock = this.scene.add.tileSprite(col * t, row * t, len * t, t, wallKey)
      .setOrigin(0, 0).setTint(wallColor).setDepth(4);
    this._visuals.push(rock);
  }

  // ── Encounter visual marker (treasure/trap/ambush glow at the zone centre).
  // Drawn above the floor backdrop (depth -7) but below the fog RT (depth -6), so
  // it stays hidden until the player erases the fog over it.
  _drawEncounterMarker(kind, cx, cy) {
    // Prefer the AI-generated, civ-themed floor feature (treasure/trap/ambush). It sits
    // below the fog (depth -7) so it only reveals as the player explores up to it.
    const key = `enc_${this.scene.theme.id}_${kind}`;
    if (this.scene.textures.exists(key)) {
      const img = this.scene.add.image(cx, cy, key).setDepth(-7).setAlpha(0.9);
      const src = this.scene.textures.get(key).getSourceImage();
      img.setScale(104 / Math.max(src.width, src.height)); // ~104px footprint on the floor
      this._visuals.push(img);
      return;
    }
    // Fallback: subtle procedural glow (used until the AI art is generated).
    const g = this.scene.add.graphics().setDepth(-7);
    if (kind === 'treasure') {
      // Soft gold radial glow: concentric filled circles with decreasing alpha
      g.fillStyle(0xffd700, 0.18).fillCircle(cx, cy, 48);
      g.fillStyle(0xffd700, 0.30).fillCircle(cx, cy, 28);
      g.fillStyle(0xffe066, 0.50).fillCircle(cx, cy, 14);
    } else if (kind === 'trap') {
      // Faint red rune: an X cross + outer ring
      g.lineStyle(3, 0xff3333, 0.55).strokeCircle(cx, cy, 32);
      g.lineStyle(3, 0xff3333, 0.55);
      g.beginPath();
      g.moveTo(cx - 20, cy - 20); g.lineTo(cx + 20, cy + 20);
      g.moveTo(cx + 20, cy - 20); g.lineTo(cx - 20, cy + 20);
      g.strokePath();
      g.fillStyle(0x880000, 0.18).fillCircle(cx, cy, 36);
    } else if (kind === 'ambush') {
      // Faint red tint: a large translucent circle
      g.fillStyle(0xcc0000, 0.14).fillCircle(cx, cy, 56);
      g.fillStyle(0xff2222, 0.22).fillCircle(cx, cy, 28);
    }
    this._visuals.push(g);
  }

  // ── Fog-of-war API (contract shared with GameScene and UIScene) ────────────

  // Erase a soft circle of fog at world (x,y) and mark the covered tiles explored.
  // Called by GameScene as the player moves; reveals are permanent.
  revealAt(x, y, radius = 360) {
    if (!this.fogRT || !this._brush) return;
    this._brush.setDisplaySize(radius * 2, radius * 2).setPosition(x, y);
    this.fogRT.erase(this._brush);
    const t = this.tile, d = this.data;
    const c0 = Math.max(0, Math.floor((x - radius) / t)), c1 = Math.min(d.cols - 1, Math.floor((x + radius) / t));
    const r0 = Math.max(0, Math.floor((y - radius) / t)), r1 = Math.min(d.rows - 1, Math.floor((y + radius) / t));
    const rr = radius * radius;
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const cx = col * t + t / 2, cy = row * t + t / 2;
        const dx = cx - x, dy = cy - y;
        if (dx * dx + dy * dy <= rr) this.exploredGrid[row * d.cols + col] = 1;
      }
    }
  }

  isExplored(col, row) {
    if (!this.exploredGrid || !this.data) return false;
    if (col < 0 || row < 0 || col >= this.data.cols || row >= this.data.rows) return false;
    return this.exploredGrid[row * this.data.cols + col] === 1;
  }

  unlockStairs() {
    if (!this.stairs) return;
    this.stairs.locked = false;
    this.stairs.sprite.setAlpha(1).clearTint();
    if (this.scene.fx) this.scene.fx.shockwave(this.stairs.x, this.stairs.y, this.scene.theme.accent, 220);
  }

  atStairs(x, y, pad = 30) {
    if (!this.stairs || this.stairs.locked) return false;
    return Math.hypot(x - this.stairs.x, y - this.stairs.y) <= pad;
  }

  startWorld() { return this.tileToWorld(this.data.start.col, this.data.start.row); }

  destroy() {
    for (const v of this._visuals) v.destroy();
    this._visuals.length = 0;
    if (this._brush) { this._brush.destroy(); this._brush = null; }
    this.fogRT = null; // destroyed via _visuals above
    this.exploredGrid = null;
    if (this.scene.obstacles) this.scene.obstacles.clear(true, true);
    this.stairs = null;
  }
}
