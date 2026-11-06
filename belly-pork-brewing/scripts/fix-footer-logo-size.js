/**
 * One-off: normalise .footer-brand img sizing to 72px tall across every
 * page. The rule's formatting (single-line vs multi-line, height value)
 * drifted between pages, and quiz.html has no rule at all — without one the
 * logo would render at its raw intrinsic height (438px) there.
 *
 * Run with: node scripts/fix-footer-logo-size.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PAGES = ['index.html', 'merch.html', 'taproom.html', 'reviews.html', 'discover.html', 'quiz.html'];

const NEW_RULE = '.footer-brand img { height: 72px; width: auto; margin-bottom: 1rem; display: block; }';
// Matches both "`.footer-brand img { ...single line... }`" and the multi-line
// brace form, regardless of exact property list/order inside.
const RULE_RE = /\.footer-brand img\s*\{[^}]*\}/;

for (const page of PAGES) {
  const file = path.join(PUBLIC_DIR, page);
  const raw = fs.readFileSync(file, 'utf8');
  const crlf = raw.includes('\r\n');
  let html = crlf ? raw.replace(/\r\n/g, '\n') : raw;

  if (RULE_RE.test(html)) {
    html = html.replace(RULE_RE, NEW_RULE);
    console.log(`  ok    ${page} — updated existing rule`);
  } else {
    // No rule at all (quiz.html) — insert right after the matching selector
    // for .footer-brand p, which exists on every page's footer block.
    const anchor = /\.footer-brand p\s*\{[^}]*\}/;
    if (anchor.test(html)) {
      html = html.replace(anchor, m => `${NEW_RULE}\n    ${m}`);
      console.log(`  ok    ${page} — inserted new rule (none existed)`);
    } else {
      console.log(`  WARN  ${page} — no .footer-brand img or .footer-brand p rule found, skipped`);
      continue;
    }
  }

  if (crlf) html = html.replace(/\n/g, '\r\n');
  fs.writeFileSync(file, html);
}
