/**
 * Builds clean transparent wordmark PNGs from the black brush-stroke source
 * (public/images/photos/ originally — see assets-src/ after this runs).
 *
 * The source has a faint pale backdrop behind the black lettering, so instead
 * of using its own alpha channel we derive a fresh one from luminance: fully
 * opaque at luminance <= 60 (the black strokes), fully transparent at
 * luminance >= 200 (the pale backdrop), linear in between. That new alpha is
 * combined with the source's existing alpha (so the already-transparent
 * corners stay transparent) and the lettering is filled flat with the given
 * colour — producing a clean silhouette with no halo.
 *
 * Run with: node scripts/build-wordmark.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'assets-src');
const OUT_DIR = path.join(__dirname, '..', 'public', 'images');
const SOURCE = 'belly_pork_wordmark_label_2048.png'; // the black-on-pale file

const LUMA_OPAQUE_AT = 60;   // luminance <= this -> fully opaque
const LUMA_CLEAR_AT = 200;   // luminance >= this -> fully transparent

const OUTPUTS = [
  { name: 'wordmark-cream', fill: [0xf6, 0xef, 0xe3] }, // #F6EFE3
  { name: 'wordmark-black', fill: [0x12, 0x12, 0x12] }, // #121212
];
const WIDTHS = [1200, 600];

function luminance(r, g, b) {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function maskAlpha(luma) {
  if (luma <= LUMA_OPAQUE_AT) return 255;
  if (luma >= LUMA_CLEAR_AT) return 0;
  return Math.round(255 * (LUMA_CLEAR_AT - luma) / (LUMA_CLEAR_AT - LUMA_OPAQUE_AT));
}

async function run() {
  const srcPath = path.join(SRC_DIR, SOURCE);
  if (!fs.existsSync(srcPath)) {
    console.error(`Source not found: ${srcPath}`);
    process.exit(1);
  }

  const img = sharp(srcPath).ensureAlpha();
  const { data, info } = await img.raw().toBuffer({ resolveWithObject: true });
  const { width, height } = info;

  for (const { name, fill } of OUTPUTS) {
    const out = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i], g = data[i + 1], b = data[i + 2], origAlpha = data[i + 3];
      const luma = luminance(r, g, b);
      const mAlpha = maskAlpha(luma);
      const finalAlpha = Math.round((mAlpha / 255) * (origAlpha / 255) * 255);
      out[i] = fill[0];
      out[i + 1] = fill[1];
      out[i + 2] = fill[2];
      out[i + 3] = finalAlpha;
    }

    const masked = sharp(out, { raw: { width, height, channels: 4 } }).png();
    const trimmedBuffer = await masked.trim().toBuffer();
    const trimmedMeta = await sharp(trimmedBuffer).metadata();

    for (const w of WIDTHS) {
      const isPrimary = w === WIDTHS[0];
      const outName = isPrimary ? `${name}.png` : `${name}-${w}.png`;
      const outPath = path.join(OUT_DIR, outName);
      await sharp(trimmedBuffer)
        .resize({ width: w, withoutEnlargement: true })
        .png()
        .toFile(outPath);
      const finalMeta = await sharp(outPath).metadata();
      console.log(`  ok    public/images/${outName} (${finalMeta.width}x${finalMeta.height}, trimmed from ${trimmedMeta.width}x${trimmedMeta.height})`);
    }
  }

  console.log('\nDone.');
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
