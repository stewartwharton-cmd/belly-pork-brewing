/**
 * One-off: swap the nav and footer logo <img> (old /images/logo.png) for the
 * new brush-stroke wordmark across every page. Nav/footer markup is
 * byte-identical across all six pages, so one find/replace pair covers all.
 *
 * Run with: node scripts/swap-logo.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PAGES = ['index.html', 'merch.html', 'taproom.html', 'reviews.html', 'discover.html', 'quiz.html'];

const OLD_NAV = `    <a href="index.html" class="nav-logo">
      <img src="/images/logo.png" alt="Belly Pork Brewing Co." height="39" />
    </a>`;

const NEW_NAV = `    <a href="/" class="nav-logo">
      <img
        src="/images/wordmark-cream.png"
        srcset="/images/wordmark-cream-600.png 600w, /images/wordmark-cream.png 1200w"
        sizes="142px"
        width="1200" height="438"
        alt="Belly Pork Brewing"
      />
    </a>`;

const OLD_FOOTER = `      <img
        src="/images/logo.png"
        alt="Belly Pork Brewing Co."
        height="44"
        loading="lazy"
      />`;

const NEW_FOOTER = `      <img
        src="/images/wordmark-cream.png"
        srcset="/images/wordmark-cream-600.png 600w, /images/wordmark-cream.png 1200w"
        sizes="197px"
        width="1200" height="438"
        alt="Belly Pork Brewing"
        loading="lazy"
      />`;

let failures = 0;

for (const page of PAGES) {
  const file = path.join(PUBLIC_DIR, page);
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  // Normalise to LF for matching/replacing (the blocks above are LF), restore CRLF on write.
  let html = crlf ? raw.replace(/\r\n/g, '\n') : raw;
  const applied = [];

  if (html.includes(OLD_NAV)) {
    html = html.replace(OLD_NAV, NEW_NAV);
    applied.push('nav');
  } else {
    console.log(`  WARN  ${page} — nav block not found verbatim`);
    failures++;
  }

  if (html.includes(OLD_FOOTER)) {
    html = html.replace(OLD_FOOTER, NEW_FOOTER);
    applied.push('footer');
  } else {
    console.log(`  WARN  ${page} — footer block not found verbatim`);
    failures++;
  }

  if (crlf) html = html.replace(/\n/g, '\r\n');

  fs.writeFileSync(file, html);
  console.log(`  ok    ${page} — ${applied.join(', ') || 'no changes'}`);
}

process.exit(failures ? 1 : 0);
