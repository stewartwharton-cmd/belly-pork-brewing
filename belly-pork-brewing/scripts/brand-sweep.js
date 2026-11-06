/**
 * Brand refresh — mechanical sweep over each page's inline <style> block.
 *
 * Two passes, applied only inside <style>...</style> (never touches <script>
 * or markup), on a per-rule-block basis (selector { ...body... }):
 *
 *  1. Syne Mono -> Syne 600 uppercase, letter-spacing 0.12em, 12px floor.
 *     Any block whose font-family is 'Syne Mono', monospace is rewritten to
 *     var(--font-mono) (redefined in global.css as Syne), gets font-weight:
 *     600, text-transform: uppercase and letter-spacing: 0.12em, and any
 *     font-size under 0.75rem (12px) is floored to 0.75rem.
 *
 *  2. Magenta reduction. Any block whose selector does NOT indicate a
 *     keep-state (hover/focus/active/selected/open/done/flipped/filled/
 *     today/visible/current/revealed/checked) has its magenta borders
 *     swapped for var(--border), and decorative magenta glows (radial-
 *     gradient fills, flat magenta-tinted backgrounds, magenta box-shadows)
 *     stripped. An orphaned filter: blur(...) left behind by a removed glow
 *     is removed too, and a ::before/::after block left with nothing but
 *     positioning boilerplate is dropped entirely.
 *
 * Run with: node scripts/brand-sweep.js
 */

const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, '..', 'public');
const PAGES = ['index.html', 'merch.html', 'taproom.html', 'reviews.html', 'discover.html', 'quiz.html'];

const KEEP_STATE = /(:hover|:focus(-visible)?|:active\b|\.selected\b|\.active\b|\.open\b|\.done\b|\.flipped\b|\.filled\b|\.today\b|\.visible\b|\.current\b|\.revealed\b|\.checked\b|\.rank-1\b|\.chat-msg\.user|\.btn-primary\b|\.btn-ghost\b|nav\.site-nav|\.nav-burger\b|marquee|#chat-toggle\b)/;

function transformBlocks(css, fn) {
  return css.replace(/([^{}]*)\{([^{}]*)\}/g, (full, sel, body) => {
    const result = fn(sel, body);
    if (result === null) return ''; // drop the whole rule
    return sel + '{' + result + '}';
  });
}

// Keyframe steps (0%, 50%, 100%...) don't carry their @keyframes NAME in the
// per-block selector text once the block-splitting regex has consumed it, so
// a named animation can't reliably be kept via KEEP_STATE once it has more
// than one step. Brace-balanced extraction protects whole @keyframes blocks
// from the magenta pass instead (chatPulse / dotPulse are persistent CTA
// pulses, not ambient decoration — kept as-is, same as #chat-toggle itself).
function extractKeyframes(css) {
  const blocks = [];
  let out = '';
  let i = 0;
  const re = /@keyframes\s+[\w-]+\s*\{/g;
  let m;
  while ((m = re.exec(css))) {
    out += css.slice(i, m.index);
    let depth = 1;
    let j = re.lastIndex;
    while (depth > 0 && j < css.length) {
      if (css[j] === '{') depth++;
      else if (css[j] === '}') depth--;
      j++;
    }
    const token = `/*__KEYFRAMES_${blocks.length}__*/`;
    blocks.push(css.slice(m.index, j));
    out += token;
    i = j;
    re.lastIndex = j;
  }
  out += css.slice(i);
  return { css: out, blocks };
}
function restoreKeyframes(css, blocks) {
  return css.replace(/\/\*__KEYFRAMES_(\d+)__\*\//g, (m, n) => blocks[+n]);
}

// Split a box-shadow value on its top-level commas (not the commas inside
// an rgba(...)), so a magenta glow layer can be dropped from a multi-layer
// shadow without losing the other layers (e.g. a black elevation shadow
// combined with a faint magenta ring).
function splitShadowLayers(value) {
  const layers = [];
  let depth = 0, start = 0;
  for (let i = 0; i < value.length; i++) {
    const c = value[i];
    if (c === '(') depth++;
    else if (c === ')') depth--;
    else if (c === ',' && depth === 0) { layers.push(value.slice(start, i)); start = i + 1; }
  }
  layers.push(value.slice(start));
  return layers.map(l => l.trim()).filter(Boolean);
}

// ─── Pass 1: Syne Mono normalisation ───
function fixSyneMono(sel, body) {
  if (!/'Syne Mono',\s*monospace/.test(body)) return body;

  let b = body.replace(/font-family:\s*'Syne Mono',\s*monospace;/, 'font-family: var(--font-mono);');

  if (!/font-weight:\s*600/.test(b)) {
    b = b.replace(/(font-family:\s*var\(--font-mono\);)/, '$1\n      font-weight: 600;');
  }
  if (/letter-spacing:\s*[^;]+;/.test(b)) {
    b = b.replace(/letter-spacing:\s*[^;]+;/, 'letter-spacing: 0.12em;');
  } else {
    b = b.replace(/(font-weight:\s*600;)/, '$1\n      letter-spacing: 0.12em;');
  }
  if (!/text-transform:\s*uppercase/.test(b)) {
    b = b.replace(/(letter-spacing:\s*0\.12em;)/, '$1\n      text-transform: uppercase;');
  }
  // 12px floor on any font-size inside this block
  b = b.replace(/font-size:\s*([\d.]+)rem;/g, (m, n) => {
    const v = parseFloat(n);
    return v < 0.75 ? 'font-size: 0.75rem;' : m;
  });

  return b;
}

// ─── Pass 2: magenta reduction ───
const MAGENTA_BORDER = /\bborder([a-z-]*):\s*([\d.]+px\s+\w+\s+)(rgba\(255,29,188,[^)]+\)|var\(--magenta-dim\)|var\(--magenta-glow\)|var\(--magenta\));/g;
const MAGENTA_BG_FLAT = /^\s*background:\s*(rgba\(255,29,188,[^)]+\)|var\(--magenta-dim\)|var\(--magenta-glow\));\s*$/m;
const MAGENTA_BG_GRADIENT = /^\s*background:\s*radial-gradient\([^;]*rgba\(255,29,188[^;]*\);\s*$/m;
const BOX_SHADOW_LINE = /^(\s*)box-shadow:\s*([^;]*rgba\(255,29,188[^;]*);\s*$/m;
const FILTER_BLUR = /^\s*filter:\s*blur\([^;]*\);\s*$/m;

function fixMagenta(sel, body) {
  const hasMagenta =
    MAGENTA_BORDER.test(body) || MAGENTA_BG_FLAT.test(body) || MAGENTA_BG_GRADIENT.test(body) || BOX_SHADOW_LINE.test(body);
  MAGENTA_BORDER.lastIndex = 0;
  if (!hasMagenta) return body;
  if (KEEP_STATE.test(sel)) return body; // interactive/selected states keep their magenta

  let b = body;
  let removedGradientGlow = false;

  b = b.replace(MAGENTA_BORDER, (m, suffix, lead) => `border${suffix}: ${lead}var(--border);`);
  // A flat tint is a solid-colour indicator (progress pips, dividers) — neutralise it like a
  // border, don't delete it outright, or state-bearing elements go invisible at rest.
  if (MAGENTA_BG_FLAT.test(b)) { b = b.replace(MAGENTA_BG_FLAT, '      background: var(--border);'); }
  // A gradient/blur wash is pure ambient decoration — remove it outright.
  if (MAGENTA_BG_GRADIENT.test(b)) { b = b.replace(MAGENTA_BG_GRADIENT, ''); removedGradientGlow = true; }
  if (BOX_SHADOW_LINE.test(b)) {
    b = b.replace(BOX_SHADOW_LINE, (m, indent, value) => {
      const kept = splitShadowLayers(value).filter(l => !l.includes('rgba(255,29,188'));
      return kept.length ? `${indent}box-shadow: ${kept.join(', ')};` : '';
    });
  }
  if (removedGradientGlow && FILTER_BLUR.test(b)) { b = b.replace(FILTER_BLUR, ''); }

  // A ::before/::after left with nothing but positioning boilerplate is dead weight — drop it.
  if (/::(before|after)/.test(sel)) {
    const stripped = b.replace(/\s+/g, '');
    const boilerplateOnly = /^(content:'';|position:(absolute|relative|fixed);|inset:[^;]+;|top:[^;]+;|left:[^;]+;|right:[^;]+;|bottom:[^;]+;|width:[^;]+;|height:[^;]+;|pointer-events:none;|z-index:\d+;)*$/.test(stripped);
    if (boilerplateOnly) return null; // nothing visual left (possibly nothing at all) — drop whole rule
  }

  return b;
}

let totalFontMono = 0;
let totalMagenta = 0;

for (const page of PAGES) {
  const file = path.join(PUBLIC_DIR, page);
  let html = fs.readFileSync(file, 'utf8');

  const styleMatch = html.match(/<style>([\s\S]*?)<\/style>/);
  if (!styleMatch) {
    console.log(`  --    ${page} — no <style> block`);
    continue;
  }

  let css = styleMatch[1];
  const beforeFM = (css.match(/'Syne Mono',\s*monospace/g) || []).length;
  css = transformBlocks(css, fixSyneMono);
  const afterFM = (css.match(/'Syne Mono',\s*monospace/g) || []).length;

  const beforeMG = (css.match(/rgba\(255,29,188/g) || []).length;
  const { css: cssNoKeyframes, blocks: keyframeBlocks } = extractKeyframes(css);
  css = restoreKeyframes(transformBlocks(cssNoKeyframes, fixMagenta), keyframeBlocks);
  const afterMG = (css.match(/rgba\(255,29,188/g) || []).length;

  html = html.slice(0, styleMatch.index) + '<style>' + css + '</style>' + html.slice(styleMatch.index + styleMatch[0].length);

  // Drop Syne Mono from the Google Fonts link (outside the style block).
  html = html.replace(/&family=Syne\+Mono/, '');

  fs.writeFileSync(file, html);
  totalFontMono += beforeFM - afterFM;
  totalMagenta += beforeMG - afterMG;
  console.log(`  ok    ${page} — Syne Mono blocks fixed: ${beforeFM - afterFM} (${afterFM} left), magenta refs removed: ${beforeMG - afterMG} (${afterMG} left)`);
}

console.log(`\nTotals — Syne Mono fixed: ${totalFontMono}, magenta refs removed: ${totalMagenta}`);
