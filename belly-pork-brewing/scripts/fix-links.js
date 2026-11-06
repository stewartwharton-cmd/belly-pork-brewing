/**
 * One-off maintenance script: normalise the shared <head> icons, nav logo and
 * footer across every page in public/ so they are byte-identical and use
 * root-relative, self-hosted assets.
 *
 * Run with: node scripts/fix-links.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PAGES = ['index.html', 'merch.html', 'taproom.html', 'reviews.html', 'discover.html', 'quiz.html'];

const ICONS = `  <link rel="icon" href="/images/logo.png" type="image/png">
  <link rel="shortcut icon" href="/images/logo.png" type="image/png">
  <link rel="apple-touch-icon" href="/images/logo.png">`;

const FOOTER = `  <footer>
    <div class="footer-brand">
      <img
        src="/images/logo.png"
        alt="Belly Pork Brewing Co."
        height="44"
        loading="lazy"
      />
      <p>Independent craft beer from Graham's kitchen to your glass. One batch at a time.</p>
    </div>

    <div class="footer-col">
      <h4>Navigate</h4>
      <ul>
        <li><a href="/#about">About Us</a></li>
        <li><a href="/#beers">The Beers</a></li>
        <li><a href="/#graham">Graham</a></li>
        <li><a href="/taproom">Tap Room</a></li>
        <li><a href="/reviews">Reviews</a></li>
        <li><a href="/discover">Discover</a></li>
        <li><a href="/merch">Merch</a></li>
      </ul>
    </div>

    <div class="footer-col">
      <h4>Connect</h4>
      <ul>
        <li><a href="/">bellyporkbrewing.com</a></li>
        <li><a href="/#newsletter">Newsletter</a></li>
        <!-- TODO: add Instagram/Facebook URLs -->
      </ul>
    </div>

    <div class="footer-bottom">
      <p>&copy; 2024 Belly Pork Brewing Co. &mdash; All Rights Reserved.</p>
      <p>Powered by <span>vapes</span> and Graham's questionable decisions.</p>
    </div>
  </footer>`;

// The GoDaddy CDN URL the logo used to be hot-linked from, in any attribute.
const CDN_LOGO = /https:\/\/img1\.wsimg\.com\/isteam\/ip\/c5f4da44-74a7-4ebd-b7a0-a83c516ecd85\/Belly%20Pork%20Brewing-37b48db\.PNG\/:\/rs=h:200,cg:true,m\/qt=q:100\/ll/g;

// The three icon <link> tags as they currently stand. Matched line-by-line
// rather than tag-by-tag: the old rel="icon" href is an inline SVG data URI
// containing '>' characters, so a [^>]* tag match stops short.
const ICON_BLOCK = /^[ \t]*<link rel="icon".*$\n^[ \t]*<link rel="shortcut icon".*$\n^[ \t]*<link rel="apple-touch-icon".*$/m;

let failures = 0;

for (const page of PAGES) {
  const file = path.join(PUBLIC_DIR, page);
  if (!fs.existsSync(file)) {
    console.log(`  skip  ${page} (does not exist)`);
    continue;
  }

  const before = fs.readFileSync(file, 'utf8');
  let html = before;
  const applied = [];

  if (ICON_BLOCK.test(html)) {
    html = html.replace(ICON_BLOCK, ICONS);
    applied.push('icons');
  }

  const cdnHits = (html.match(CDN_LOGO) || []).length;
  if (cdnHits) {
    html = html.replace(CDN_LOGO, '/images/logo.png');
    applied.push(`logo x${cdnHits}`);
  }

  if (/<footer>[\s\S]*?<\/footer>/.test(html)) {
    html = html.replace(/[ \t]*<footer>[\s\S]*?<\/footer>/, FOOTER);
    applied.push('footer');
  } else {
    console.log(`  WARN  ${page} has no <footer> block`);
    failures++;
  }

  if (html !== before) {
    fs.writeFileSync(file, html);
    console.log(`  ok    ${page} — ${applied.join(', ')}`);
  } else {
    console.log(`  --    ${page} — already normalised`);
  }
}

process.exit(failures ? 1 : 0);
