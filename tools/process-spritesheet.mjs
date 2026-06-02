#!/usr/bin/env node
// Turn a raw AI-generated image into a game-ready pixel sprite:
//   - trims transparent/uniform borders
//   - resizes to the target cell size with nearest-neighbor (keeps pixels crisp)
//   - writes a clean PNG into public/sprites/
//
// Usage:
//   npm run sprites -- --in raw/lubu.png --out public/sprites/char_lubu.png --size 48
//   npm run sprites -- --in raw/lubu.png --out public/sprites/char_lubu.png --size 48 --no-trim
//
// Requires `sharp` (one-time): npm i -D sharp
import { mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

function parseArgs(argv) {
  const args = { size: 48, trim: true };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--in') args.in = argv[++i];
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--size') args.size = parseInt(argv[++i], 10);
    else if (a === '--no-trim') args.trim = false;
  }
  return args;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (!args.in || !args.out) {
    console.error('Usage: npm run sprites -- --in <raw.png> --out <public/sprites/key.png> --size <px> [--no-trim]');
    process.exit(1);
  }

  let sharp;
  try {
    sharp = (await import('sharp')).default;
  } catch {
    console.error('\nThis tool needs `sharp`. Install it once with:\n\n    npm i -D sharp\n');
    process.exit(1);
  }

  await mkdir(dirname(args.out), { recursive: true });

  let img = sharp(args.in).ensureAlpha();
  if (args.trim) img = img.trim();

  await img
    .resize(args.size, args.size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
      kernel: 'nearest', // crisp pixels, no blur
    })
    .png()
    .toFile(args.out);

  console.log(`✓ ${args.in} -> ${args.out} (${args.size}x${args.size})`);
  console.log(`  Register it in src/scenes/BootScene.js preload():`);
  const key = args.out.split('/').pop().replace(/\.png$/, '');
  console.log(`    this.load.image('${key}', 'sprites/${key}.png');`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
