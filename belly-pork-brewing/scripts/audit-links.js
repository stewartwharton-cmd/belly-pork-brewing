/**
 * Link audit for public/. Reports:
 *   - href="#" / href="" placeholders
 *   - page links whose target file is missing
 *   - in-page #anchors with no matching id in the page they resolve to
 *   - local asset references (img/script/link) that do not exist on disk
 *   - whether the <footer> block is byte-identical across every page
 *
 * Run with: node scripts/audit-links.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const pages = fs.readdirSync(PUBLIC_DIR).filter(f => f.endsWith('.html'));

// id="..." present in a given page
const idsOf = {};
// raw source of each page
const src = {};

for (const p of pages) {
  src[p] = fs.readFileSync(path.join(PUBLIC_DIR, p), 'utf8');
  idsOf[p] = new Set([...src[p].matchAll(/\bid="([^"]+)"/g)].map(m => m[1]));
}

const problems = [];
const note = (page, line, msg) => problems.push(`${page}:${line}  ${msg}`);

/** Which page file does a link target resolve to? null = external/not a page. */
function resolvePage(target) {
  if (!target || /^(https?:|mailto:|tel:|data:|javascript:)/i.test(target)) return null;
  let p = target.split('#')[0].split('?')[0];
  if (p === '' ) return null;             // pure anchor, same page
  if (p === '/') return 'index.html';
  p = p.replace(/^\//, '');
  if (p === '') return 'index.html';
  if (p.endsWith('.html')) return p;
  // extensionless pretty URL, e.g. /taproom
  if (pages.includes(p + '.html')) return p + '.html';
  return p + '.html';                      // report as missing if absent
}

for (const page of pages) {
  const lines = src[page].split('\n');

  lines.forEach((line, i) => {
    const lineNo = i + 1;

    // ─── hrefs ───
    for (const m of line.matchAll(/href="([^"]*)"/g)) {
      const href = m[1];

      if (href === '#') { note(page, lineNo, `placeholder href="#"`); continue; }
      if (href === '')  { note(page, lineNo, `empty href=""`); continue; }

      // Built at runtime inside a JS template literal — nothing static to check.
      if (href.includes('${')) continue;

      // stylesheet / icon links are assets, handled below
      if (/rel="(stylesheet|icon|shortcut icon|apple-touch-icon|preconnect)"/.test(line)) continue;

      // On an SVG <image>, href is the bitmap source, not a page link.
      if (/<image\b/.test(line)) continue;

      const anchor = href.includes('#') ? href.split('#')[1] : null;
      const targetPage = resolvePage(href);

      if (targetPage) {
        if (!pages.includes(targetPage)) {
          note(page, lineNo, `link target missing: ${href}  ->  public/${targetPage}`);
          continue;
        }
        if (anchor && !idsOf[targetPage].has(anchor)) {
          note(page, lineNo, `anchor #${anchor} not found in ${targetPage}  (href="${href}")`);
        }
      } else if (anchor && href.startsWith('#')) {
        // same-page anchor. SVG textPath/filter refs are legitimate.
        if (!idsOf[page].has(anchor)) {
          note(page, lineNo, `same-page anchor #${anchor} has no matching id`);
        }
      }
    }

    // ─── local assets: src="..." and stylesheet/icon hrefs ───
    const assetRefs = [
      ...[...line.matchAll(/\bsrc="([^"]*)"/g)].map(m => m[1]),
      // stylesheet/icon <link> hrefs and SVG <image> hrefs are both assets
      ...(/rel="(stylesheet|icon|shortcut icon|apple-touch-icon)"/.test(line) || /<image\b/.test(line)
        ? [...line.matchAll(/href="([^"]*)"/g)].map(m => m[1])
        : []),
    ];

    for (const ref of assetRefs) {
      if (!ref || /^(https?:|\/\/|data:|mailto:)/i.test(ref)) continue;
      if (ref.includes('${')) continue; // runtime-built path
      const rel = ref.split('?')[0].replace(/^\//, '');
      if (!fs.existsSync(path.join(PUBLIC_DIR, rel))) {
        note(page, lineNo, `asset missing: ${ref}  ->  public/${rel}`);
      }
    }
  });
}

// ─── footer parity ───
const footers = {};
for (const page of pages) {
  const m = src[page].match(/<footer>[\s\S]*?<\/footer>/);
  footers[page] = m ? m[0] : null;
}
const baseline = footers['index.html'];
const footerDiffs = pages.filter(p => footers[p] !== baseline);

// ─── report ───
console.log(`Scanned ${pages.length} pages: ${pages.join(', ')}\n`);

if (problems.length) {
  console.log(`LINK / ASSET ISSUES (${problems.length}):`);
  problems.forEach(p => console.log('  ' + p));
} else {
  console.log('LINK / ASSET ISSUES: none');
}

console.log('');
if (footerDiffs.length) {
  console.log('FOOTER PARITY: differs from index.html in -> ' + footerDiffs.join(', '));
} else {
  console.log('FOOTER PARITY: identical across all ' + pages.length + ' pages');
}

process.exit(problems.length || footerDiffs.length ? 1 : 0);
