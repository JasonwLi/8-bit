// AI sprite generator. Reads FAL_KEY from .env.local, renders manifest assets via
// Recraft v3 (pixel_art), removes the background (birefnet) for transparent assets,
// resizes to the game's sprite dimensions (nearest-neighbour = crisp pixels), and
// writes public/sprites/<key>.png. Finally writes public/sprites/index.json listing
// every generated key, which BootScene loads to override the procedural placeholders.
//
// Usage:
//   node scripts/gen-sprites.mjs character          # one category (pilot)
//   node scripts/gen-sprites.mjs character enemy     # several categories
//   node scripts/gen-sprites.mjs --key char_lubu     # a single asset
//   node scripts/gen-sprites.mjs --all               # everything
//   add --force to regenerate assets that already have a file
import { readFileSync, existsSync, mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import { MANIFEST } from './sprite-manifest.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = join(ROOT, 'public', 'sprites');
const RAW_DIR = join(OUT_DIR, '.raw'); // full-res pre-matte source, kept so sprites can be refined in place
const APPROVED_DIR = join(OUT_DIR, '.approved'); // blessed final+raw; refine sources from here so a bad refine can't ruin the good base
const GEN_MODEL = 'fal-ai/recraft/v3/text-to-image'; // opaque background tiles
const IDEO_MODEL = 'fal-ai/ideogram/v3/generate-transparent'; // transparent sprites (native alpha, no matting)
const I2I_MODEL = 'fal-ai/recraft/v3/image-to-image';
const RMBG_MODEL = 'fal-ai/birefnet/v2';
const CONCURRENCY = 4;

function loadKey() {
  const envPath = join(ROOT, '.env.local');
  if (!existsSync(envPath)) return process.env.FAL_KEY || null;
  const line = readFileSync(envPath, 'utf8').split('\n').find((l) => l.trim().startsWith('FAL_KEY'));
  return line ? line.split('=').slice(1).join('=').trim().replace(/^["']|["']$/g, '') : (process.env.FAL_KEY || null);
}

async function fal(model, input, key) {
  const res = await fetch(`https://fal.run/${model}`, {
    method: 'POST',
    headers: { Authorization: `Key ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new Error(`${model} → ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return res.json();
}

const aspectPreset = (w, h) => (Math.abs(w - h) <= 4 ? 'square_hd' : h > w ? 'portrait_4_3' : 'landscape_4_3');
const ideoAspect = (w, h) => {
  const r = w / h;
  if (r > 2.4) return '3:1'; if (r > 1.2) return '4:3';
  if (r < 0.42) return '1:3'; if (r < 0.85) return '3:4';
  return '1:1';
};

// FULL generation. Transparent sprites use Ideogram v3 which outputs a NATIVE
// transparent PNG — no matting step, so no blank cuts / clipped weapons / residue.
// Opaque background tiles use Recraft (pixel_art style). Retries up to 3× on a dud.
// Some ornate/abstract props (statues, wrapped bundles) make Ideogram render flat
// MONOCHROME LINE-ART. Recraft's pixel_art style is reliably solid-filled, so route
// these through Recraft + background matte instead.
const RECRAFT_SOLID = new Set([
  'crate_japan', 'crate_mongolia', 'crate_norse', 'crate_macedon',
  'block_china', 'block_norse', 'block_macedon', 'block_mongolia',
  'rock_japan', 'rock_macedon', 'shrine_mongolia',
  // enemies whose Ideogram pass came out hollow/speckled (see-through interior) — the
  // crate bug. Recraft's solid pixel-art fill + matte renders them densely filled.
  'enemy_charger', 'enemy_harpy',
]);

async function generateOne(asset, key) {
  let lastErr;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      if (asset.transparent && RECRAFT_SOLID.has(asset.key)) await generateSolidMatted(asset, key);
      else if (asset.transparent) await generateTransparent(asset, key);
      else await generateOpaque(asset, key);
      return;
    } catch (e) { lastErr = e; }
  }
  throw lastErr;
}

// Solid pixel-art via Recraft + background matte (for subjects Ideogram sketches).
async function generateSolidMatted(asset, key) {
  const gen = await fal(GEN_MODEL, {
    prompt: `${asset.prompt}. solid fully-coloured pixel art, NOT a line drawing or outline`.slice(0, 1000),
    style: 'digital_illustration/pixel_art',
    image_size: aspectPreset(asset.w, asset.h),
  }, key);
  const url = gen.images?.[0]?.url;
  if (!url) throw new Error(`no image url from generator (${JSON.stringify(gen).slice(0, 200)})`);
  await finalize(asset, url, key); // caches raw, mattes (transparent), size-normalises, blank-guards
}

// Transparent sprite via Ideogram v3 (native alpha — no matting). Cache the raw,
// trim+fit, blank-guard.
async function generateTransparent(asset, key) {
  const gen = await fal(IDEO_MODEL, {
    prompt: `flat-colour 16-bit pixel art sprite, FULLY FILLED IN with solid opaque colours, a complete fully-coloured game sprite — NOT a line drawing, NOT an outline, NOT a sketch. clean crisp hard pixels, no painterly shading. ${asset.prompt}`.slice(0, 1000),
    negative_prompt: 'line art, lineart, outline drawing, outline only, contour drawing, sketch, monochrome, single flat colour, blueprint, wireframe, unfilled, hollow outline, coloring book page, painterly, realistic, photorealistic, 3d render, blurry, soft shading, gradients, gritty, dark, muddy, noisy, anti-aliased',
    aspect_ratio: ideoAspect(asset.w, asset.h),
    rendering_speed: 'QUALITY',
    expand_prompt: false,
  }, key);
  const url = gen.images?.[0]?.url;
  if (!url) throw new Error(`no image from ideogram (${JSON.stringify(gen).slice(0, 200)})`);
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(join(RAW_DIR, `${asset.key}.png`), bytes); // transparent raw, for --refine
  const out = await fitSprite(sharp(bytes), asset, true);
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 30) opaque++;
  if (opaque / (info.width * info.height) < 0.04) throw new Error('near-empty generation');
  writeFileSync(join(OUT_DIR, `${asset.key}.png`), out);
}

// Opaque background tile via Recraft (pixel_art) — fills the frame, no transparency.
async function generateOpaque(asset, key) {
  const gen = await fal(GEN_MODEL, {
    prompt: asset.prompt.slice(0, 1000),
    style: 'digital_illustration/pixel_art',
    image_size: aspectPreset(asset.w, asset.h),
  }, key);
  const url = gen.images?.[0]?.url;
  if (!url) throw new Error(`no image url from generator (${JSON.stringify(gen).slice(0, 200)})`);
  const bytes = Buffer.from(await (await fetch(url)).arrayBuffer());
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(join(RAW_DIR, `${asset.key}.png`), bytes);
  writeFileSync(join(OUT_DIR, `${asset.key}.png`), await fitSprite(sharp(bytes), asset, false));
}

// REFINE: improve an EXISTING sprite in place via image-to-image — fix one thing (e.g.
// "show the complete legs") while preserving the rest, instead of re-rolling from scratch.
// Operates on the cached full-res raw, so quality stays high; chains (saves a new raw).
async function refineOne(asset, key, instruction, strength) {
  // prefer the blessed/approved base so a bad refine can't degrade a good sprite
  const approvedRaw = join(APPROVED_DIR, `${asset.key}.raw.png`);
  const rawPath = existsSync(approvedRaw) ? approvedRaw : join(RAW_DIR, `${asset.key}.png`);
  if (!existsSync(rawPath)) throw new Error(`no cached raw for ${asset.key} — generate it once first (raws are saved from then on)`);
  // keep the i2i input well under fal's 5MB limit
  const inputBuf = await sharp(readFileSync(rawPath)).resize(1024, 1024, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  const dataUri = `data:image/png;base64,${inputBuf.toString('base64')}`;
  const gen = await fal(I2I_MODEL, {
    image_url: dataUri,
    prompt: `${instruction}. keep the same subject, pose, colours and pixel-art style`,
    strength,
    style: 'digital_illustration/pixel_art',
  }, key);
  const url = gen.images?.[0]?.url;
  if (!url) throw new Error(`no image url from image-to-image (${JSON.stringify(gen).slice(0, 200)})`);
  await finalize(asset, url, key);
}

// Shared tail: download the generation source, cache it as the raw, matte (if
// transparent) + size-normalise, blank-guard, and write the final sprite.
async function finalize(asset, srcUrl, key) {
  const srcBytes = Buffer.from(await (await fetch(srcUrl)).arrayBuffer());
  mkdirSync(RAW_DIR, { recursive: true });
  writeFileSync(join(RAW_DIR, `${asset.key}.png`), srcBytes); // cache raw for future --refine

  if (!asset.transparent) {
    writeFileSync(join(OUT_DIR, `${asset.key}.png`), await fitSprite(sharp(srcBytes), asset, false));
    return;
  }
  // "General Use (Heavy)" + refine_foreground preserves thin protruding shapes
  // (sword blades, spear shafts) that the default light model clips as background.
  const cut = await fal(RMBG_MODEL, {
    image_url: srcUrl, output_format: 'png',
    model: 'General Use (Heavy)', refine_foreground: true,
  }, key);
  const cutUrl = cut.image?.url || cut.images?.[0]?.url;
  if (!cutUrl) throw new Error('matting returned no image');
  const bytes = Buffer.from(await (await fetch(cutUrl)).arrayBuffer());
  const out = await fitSprite(sharp(bytes), asset, true);
  const { data, info } = await sharp(out).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  let opaque = 0; for (let i = 3; i < data.length; i += 4) if (data[i] > 30) opaque++;
  if (opaque / (info.width * info.height) < 0.08) throw new Error('matting near-empty');
  writeFileSync(join(OUT_DIR, `${asset.key}.png`), out);
}

// For transparent sprites: trim the empty margin to the silhouette, then re-fit to a
// CONSISTENT fill ratio + centre. This makes every character/enemy/boss occupy the same
// share of its canvas no matter how the model framed it (fixes size inconsistency
// deterministically, instead of hoping each generation frames the subject the same).
// Full-bleed backgrounds just resize to fill.
async function fitSprite(img, asset, transparent) {
  if (!transparent) {
    return img.resize(asset.w, asset.h, { kernel: 'nearest', fit: 'fill' }).png().toBuffer();
  }
  let src = img;
  try { src = sharp(await src.trim({ threshold: 30 }).png().toBuffer()); } catch { /* blank → leave as-is */ }
  const FILL = 0.92; // silhouette fills ~92% of the canvas, leaving a small uniform margin
  const iw = Math.max(1, Math.round(asset.w * FILL));
  const ih = Math.max(1, Math.round(asset.h * FILL));
  const fitted = await src
    .resize(iw, ih, { kernel: 'nearest', fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  const padX = asset.w - iw;
  const padY = asset.h - ih;
  return sharp(fitted).extend({
    top: Math.floor(padY / 2), bottom: Math.ceil(padY / 2),
    left: Math.floor(padX / 2), right: Math.ceil(padX / 2),
    background: { r: 0, g: 0, b: 0, alpha: 0 },
  }).png().toBuffer();
}

async function main() {
  const key = loadKey();
  if (!key) {
    console.error('✗ No FAL_KEY found. Create .env.local with:  FAL_KEY=your_key_here');
    process.exit(1);
  }
  mkdirSync(OUT_DIR, { recursive: true });

  const args = process.argv.slice(2);

  // --approve <key...> : bless the current sprite(s) — snapshot final + raw into
  // .approved/. refine then sources from the approved raw, so a bad refine can't ruin
  // a good base. Re-approve after a refine you like to make it the new base.
  if (args[0] === '--approve') {
    mkdirSync(APPROVED_DIR, { recursive: true });
    for (const k of args.slice(1).filter((a) => !a.startsWith('--'))) {
      const fin = join(OUT_DIR, `${k}.png`);
      const raw = join(RAW_DIR, `${k}.png`);
      if (!existsSync(fin)) { console.log(`  ✗ ${k}: no sprite to approve`); continue; }
      writeFileSync(join(APPROVED_DIR, `${k}.png`), readFileSync(fin));
      if (existsSync(raw)) writeFileSync(join(APPROVED_DIR, `${k}.raw.png`), readFileSync(raw));
      console.log(`  ✓ approved ${k}${existsSync(raw) ? '' : ' (final only — no raw to refine from)'}`);
    }
    return;
  }

  // --refine <key> "<instruction>" [--strength 0.5] : improve an existing sprite in
  // place (image-to-image) instead of re-rolling. Needs a cached raw (auto-saved on gen).
  if (args[0] === '--refine') {
    const k = args[1];
    const si = args.indexOf('--strength');
    const strength = si >= 0 ? parseFloat(args[si + 1]) : 0.5;
    const instrParts = [];
    for (let i = 2; i < args.length; i++) {
      if (args[i] === '--strength') { i++; continue; }
      if (args[i].startsWith('--')) continue;
      instrParts.push(args[i]);
    }
    const instruction = instrParts.join(' ');
    const asset = MANIFEST.find((a) => a.key === k);
    if (!asset) { console.error(`Unknown key: ${k}`); process.exit(1); }
    if (!instruction) { console.error('Usage: --refine <key> "<what to fix>" [--strength 0.5]'); process.exit(1); }
    console.log(`Refining ${k} (strength ${strength}): "${instruction}"…`);
    try {
      await refineOne(asset, key, instruction, strength); // `key` is the FAL api key
      console.log(`  ✓ ${k} refined`);
    } catch (e) { console.error(`  ✗ ${e.message}`); process.exit(1); }
    const onDisk = readdirSync(OUT_DIR).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''));
    writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(onDisk.sort(), null, 0));
    return;
  }

  const force = args.includes('--force');
  const all = args.includes('--all');
  const keyArg = args.includes('--key') ? args[args.indexOf('--key') + 1] : null;
  const categories = args.filter((a) => !a.startsWith('--') && a !== keyArg);

  let selected = MANIFEST;
  if (keyArg) selected = MANIFEST.filter((a) => a.key === keyArg);
  else if (!all) {
    if (!categories.length) {
      console.error('Specify a category (character|enemy|boss|item|prop|effect|ability_icon|background), --key <key>, or --all');
      console.error('Categories available:', [...new Set(MANIFEST.map((a) => a.category))].join(', '));
      process.exit(1);
    }
    selected = MANIFEST.filter((a) => categories.includes(a.category));
  }
  if (!force) selected = selected.filter((a) => !existsSync(join(OUT_DIR, `${a.key}.png`)));

  if (!selected.length) { console.log('Nothing to generate (use --force to regenerate existing).'); return; }
  console.log(`Generating ${selected.length} sprite(s) via Recraft v3 (pixel_art)…\n`);

  let done = 0; const failures = [];
  for (let i = 0; i < selected.length; i += CONCURRENCY) {
    const batch = selected.slice(i, i + CONCURRENCY);
    await Promise.all(batch.map(async (asset) => {
      try {
        await generateOne(asset, key);
        console.log(`  ✓ ${asset.key}  (${asset.w}×${asset.h})`);
      } catch (e) {
        failures.push(asset.key);
        console.log(`  ✗ ${asset.key} — ${e.message}`);
      } finally {
        done++;
      }
    }));
  }

  // refresh the index BootScene reads (every key that now has a file)
  const onDisk = readdirSync(OUT_DIR).filter((f) => f.endsWith('.png')).map((f) => f.replace(/\.png$/, ''));
  writeFileSync(join(OUT_DIR, 'index.json'), JSON.stringify(onDisk.sort(), null, 0));

  console.log(`\nDone: ${done - failures.length}/${done} generated. ${onDisk.length} total sprites on disk.`);
  if (failures.length) console.log('Failed:', failures.join(', '));
}

main().catch((e) => { console.error(e); process.exit(1); });
