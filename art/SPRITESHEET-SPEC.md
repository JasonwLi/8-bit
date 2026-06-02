# Spritesheet Spec & How to Swap in Real Art

The gameplay code references textures **only by key** (e.g. `char_lubu`,
`enemy_soldier`, `proj_matchlock_volley`). Today those keys are generated as
flat placeholder textures in `src/art/placeholders.js`. To use real art, load a
PNG under the same key — nothing else changes.

## Texture keys the engine expects

| Key                       | Used for                | Suggested size |
|---------------------------|-------------------------|----------------|
| `char_<id>`               | playable character      | 48×48          |
| `enemy_<id>`              | enemy archetype         | 34–46          |
| `proj_<weaponId>`         | projectile sprite       | 16×16          |
| `gem`                     | XP pickup               | 16×16          |
| `flame_pool`              | Greek fire AoE          | 64×64          |
| `sweep`                   | melee arc VFX           | 128×128        |

`<id>` values come from `src/data/characters.js` and `src/data/enemies.js`.
`<weaponId>` values come from `src/data/weapons.js`.

## Workflow

1. Generate art with the prompts in `PROMPTS.md`.
2. Process each image into a game-ready PNG:
   ```bash
   npm run sprites -- --in raw/lubu.png --out public/sprites/char_lubu.png --size 48
   ```
   (Trims, resizes with nearest-neighbor to keep crisp pixels. See
   `tools/process-spritesheet.mjs`.)
3. Register the file in `src/scenes/BootScene.js` **before** `generatePlaceholders`:
   ```js
   preload() {
     this.load.image('char_lubu', 'sprites/char_lubu.png');
     // ...one line per real asset
   }
   ```
   `generatePlaceholders` already skips any key that's already loaded
   (`if (scene.textures.exists(key)) return;`), so real art wins automatically
   and the rest stay as placeholders. Migrate the roster incrementally.

## Animated spritesheets (later)

For walk/idle animation, export a horizontal strip of equal-size frames and load
it as a spritesheet, then define an animation:
```js
preload() {
  this.load.spritesheet('char_lubu', 'sprites/char_lubu.png',
    { frameWidth: 48, frameHeight: 48 });
}
// after load:
this.anims.create({
  key: 'lubu_walk',
  frames: this.anims.generateFrameNumbers('char_lubu', { start: 0, end: 3 }),
  frameRate: 8, repeat: -1,
});
```
Then call `this.player.play('lubu_walk')` in `Player`. The static-frame code
keeps working until you do this.
