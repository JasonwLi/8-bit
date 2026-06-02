import Phaser from 'phaser';
import { generatePlaceholders } from '../art/placeholders.js';

// Loads any AI-generated sprites listed in public/sprites/index.json (written by
// scripts/gen-sprites.mjs), then fills every remaining texture key with a
// procedural placeholder. generatePlaceholders() skips keys that already loaded,
// so real art overrides placeholders incrementally and per-asset — and if no
// sprites have been generated yet, the game runs fully on placeholders.
export default class BootScene extends Phaser.Scene {
  constructor() {
    super('BootScene');
  }

  preload() {
    // index.json may not exist yet (no sprites generated) — a 404 here is fine.
    this.load.json('__spriteIndex', 'sprites/index.json');
    this.load.on('loaderror', () => {}); // swallow missing-file errors
  }

  create() {
    const index = this.cache.json.get('__spriteIndex');
    if (Array.isArray(index) && index.length) {
      // The tiling GROUND is generated procedurally (a truly seamless organic texture —
      // AI tiles always reveal a repeating pattern), so skip any AI bg_ground_* here.
      index
        .filter((key) => !key.startsWith('bg_ground_'))
        .forEach((key) => this.load.image(key, `sprites/${key}.png`));
      this.load.once('complete', () => this.finish());
      this.load.start(); // second pass: load the real sprites, then hand off
    } else {
      this.finish();
    }
  }

  finish() {
    generatePlaceholders(this); // fills any key the real art didn't provide
    this.scene.start('MenuScene');
  }
}
