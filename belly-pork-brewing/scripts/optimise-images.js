/**
 * Brand photo pipeline — converts the raw photos in assets-src/ to WebP at
 * 1600px and 800px wide (1200px only for social-share), quality 80, written
 * into public/images/. The raw originals stay out of public/ entirely so
 * they never ship.
 *
 * Run with: node scripts/optimise-images.js
 */

const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const SRC_DIR = path.join(__dirname, '..', 'assets-src');
const OUT_DIR = path.join(__dirname, '..', 'public', 'images');
const QUALITY = 80;

// Each job: a raw source photo in assets-src/, the output basename(s) it
// feeds, and the widths to render. The first width in the list gets the
// plain "<name>.webp" filename; any further widths get "<name>-<width>.webp".
const JOBS = [
  {
    src: 'belly_pork_beer_garden_scene.png',
    outputs: [
      { name: 'hero-cans', widths: [1600, 800] },
      { name: 'social-share', widths: [1200] },
      { name: 'tap-bucket', widths: [1600, 800] },
    ],
  },
  {
    src: 'Narcoleptic DIPA Brewery Can Ad.png',
    outputs: [{ name: 'beer-narcoleptic', widths: [1600, 800] }],
  },
  {
    src: 'reverse_weave_2048_wide.jpg',
    outputs: [{ name: 'beer-reverse-weave', widths: [1600, 800] }],
  },
  {
    src: 'belly_pork_fanny_buffet_can.png',
    outputs: [{ name: 'beer-fanny-buffet', widths: [1600, 800] }],
  },
  {
    src: 'belly_pork_pouring_scene.png',
    outputs: [{ name: 'merch-pour', widths: [1600, 800] }],
  },
  {
    // ~1536px wide source — never upscale past native resolution.
    src: 'Fish Wagon Pilsner by the Seaside.png',
    outputs: [{ name: 'beer-fish-wagon', widths: [1600, 800] }],
    withoutEnlargement: true,
  },
  {
    // ~1536px wide source — never upscale past native resolution.
    src: 'Lip-Smacking Double IPA Can.png',
    outputs: [{ name: 'beer-lip-slapping', widths: [1600, 800] }],
    withoutEnlargement: true,
  },
  {
    // ~1774px wide source — never upscale past native resolution.
    src: 'Vibrant Belly Pork Brewery Can Lineup.png',
    outputs: [{ name: 'hero-lineup', widths: [1600, 800] }],
    withoutEnlargement: true,
    quality: 82,
  },
];

function outFilename(name, width, isPrimary) {
  return isPrimary ? `${name}.webp` : `${name}-${width}.webp`;
}

async function run() {
  if (!fs.existsSync(SRC_DIR)) {
    console.error(`assets-src/ not found at ${SRC_DIR} — nothing to convert.`);
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  let converted = 0;
  let skipped = 0;

  for (const job of JOBS) {
    const srcPath = path.join(SRC_DIR, job.src);
    if (!fs.existsSync(srcPath)) {
      console.log(`  skip  ${job.src} — not found in assets-src/`);
      skipped += job.outputs.reduce((n, o) => n + o.widths.length, 0);
      continue;
    }

    const withoutEnlargement = job.withoutEnlargement === true;
    const meta = await sharp(srcPath).metadata();
    const upscaling = !withoutEnlargement && job.outputs.some(o => o.widths.some(w => w > meta.width));
    if (upscaling) {
      console.log(`  note  ${job.src} is only ${meta.width}px wide — some outputs below will be upscaled (softer than native resolution)`);
    }
    if (withoutEnlargement && job.outputs.some(o => o.widths.some(w => w > meta.width))) {
      console.log(`  note  ${job.src} is only ${meta.width}px wide — capped there, not upscaled (withoutEnlargement: true)`);
    }

    for (const output of job.outputs) {
      for (let i = 0; i < output.widths.length; i++) {
        const width = output.widths[i];
        const isPrimary = i === 0;
        const outPath = path.join(OUT_DIR, outFilename(output.name, width, isPrimary));

        await sharp(srcPath)
          .resize({ width, withoutEnlargement, kernel: sharp.kernel.lanczos3 })
          .webp({ quality: job.quality || QUALITY })
          .toFile(outPath);

        console.log(`  ok    ${path.relative(path.join(__dirname, '..'), outPath)} (${width}w)`);
        converted++;
      }
    }
  }

  console.log(`\n${converted} file(s) written, ${skipped} skipped (missing source).`);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
