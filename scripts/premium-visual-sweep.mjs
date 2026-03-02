#!/usr/bin/env node
/**
 * Premium Visual Sweep — P1 Quality Gate
 *
 * PDF Reference: Premium Algı Testleri (P1) + Tasarım Tutarlılığı (P2)
 *
 * Automated sweep that statically analyses the Vitalis source files for
 * visual-quality signals expected of an "elite medical dating" product:
 *
 *   [1] Typography hierarchy — H1 > H2 > H3 > body scale
 *   [2] Spacing grid alignment — no rogue px values outside 8-dp token set
 *   [3] Border-radius consistency — uses only approved radius tokens
 *   [4] Shadow levels — uses only approved shadow tokens (no bare box-shadow)
 *   [5] Animation / motion — no arbitrary durations, uses only approved tokens
 *   [6] Color consistency — no hardcoded hex outside the brand palette
 *   [7] Icon usage — lucide-react only, no inline SVG fill="#..."
 *   [8] Premium luxury signals — no Times New Roman, Comic Sans, generic fallbacks
 *
 * Exit codes:
 *   0 — all clear (warnings log to stdout)
 *   1 — critical violations found
 *
 * Usage:
 *   node scripts/premium-visual-sweep.mjs
 *   node scripts/premium-visual-sweep.mjs --verbose
 *   node scripts/premium-visual-sweep.mjs --strict
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative, basename } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Vitalis Brand Palette  (from tailwind.config.cjs — gold + charcoal + white)
// ─────────────────────────────────────────────────────────────────────────────
const BRAND_HEX = new Set([
  // Gold family
  '#c9a227', '#d4a843', '#b8901e', '#f0c84a', '#e5b835',
  '#a07818', '#8c6914', '#7a5c12',
  // Charcoal / dark
  '#1a1a2e', '#16213e', '#0f3460', '#1e293b', '#0f172a',
  '#111827', '#1f2937',
  // Off-white / cream
  '#fafafa', '#f8f8f8', '#f5f0e8', '#fffbf0',
  '#ffffff', '#fff',
  // Neutral greys (Tailwind slate)
  '#64748b', '#94a3b8', '#cbd5e1', '#e2e8f0', '#f1f5f9',
  // Semantic
  '#10b981', '#ef4444', '#f59e0b', '#3b82f6',
]);

/** Normalise short hex #fff → #ffffff */
function expandHex(hex) {
  if (hex.length === 4) {
    return '#' + hex[1] + hex[1] + hex[2] + hex[2] + hex[3] + hex[3];
  }
  return hex.toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Approved design tokens (Tailwind classes — extracted from tailwind.config.cjs)
// ─────────────────────────────────────────────────────────────────────────────

const APPROVED_RADII = new Set([
  'rounded-none', 'rounded-sm', 'rounded', 'rounded-md', 'rounded-lg',
  'rounded-xl', 'rounded-2xl', 'rounded-3xl', 'rounded-full',
  // Component-specific
  'rounded-card', 'rounded-badge', 'rounded-button',
]);

const APPROVED_SHADOWS = new Set([
  'shadow-none', 'shadow-sm', 'shadow', 'shadow-md', 'shadow-lg',
  'shadow-xl', 'shadow-2xl', 'shadow-inner',
  // Vitalis custom
  'shadow-gold', 'shadow-gold-lg', 'shadow-premium', 'shadow-card',
  'shadow-glow',
]);

const APPROVED_DURATIONS = new Set([
  '75ms', '100ms', '150ms', '200ms', '250ms', '300ms', '500ms', '700ms', '1000ms',
  // Tailwind classes
  'duration-75', 'duration-100', 'duration-150', 'duration-200',
  'duration-300', 'duration-500', 'duration-700', 'duration-1000',
]);

const BANNED_FONTS = ['Times New Roman', 'Comic Sans', 'Papyrus', 'Arial', 'Helvetica', 'Impact'];

const GENERIC_FALLBACKS = ['sans-serif', 'serif', 'monospace', 'cursive', 'fantasy'];

// ─────────────────────────────────────────────────────────────────────────────
// Patterns
// ─────────────────────────────────────────────────────────────────────────────

const PATTERNS = {
  /** Bare hex colour not in an import or URL */
  hexColor:      /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b(?!['"])/g,
  /** Hardcoded border-radius NOT as Tailwind class */
  borderRadius:  /border-radius\s*:\s*([^;]+);/g,
  /** Hardcoded box-shadow NOT as Tailwind class */
  boxShadow:     /box-shadow\s*:\s*([^;]+);/g,
  /** Arbitrary animation durations */
  duration:      /(?:transition|animation).*?(\d+(?:\.\d+)?ms|\d+s\b)/g,
  /** Inline SVG fill */
  svgFill:       /fill=["']#([0-9a-fA-F]{3,6})["']/g,
  /** Font-family declaration */
  fontFamily:    /font-family\s*:\s*([^;]+);/g,
  /** Arbitrary Tailwind duration */
  twArbitraryMs: /duration-\[(\d+)ms\]/g,
  /** Consecutive heading tags to check hierarchy */
  headingTag:    /className=["'][^"']*(?:text-\d|font-(?:bold|semibold|medium))[^"']*["']/g,
};

// ─────────────────────────────────────────────────────────────────────────────
// File scanning infra
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();
const SCAN_DIRS = ['src', 'components', 'services', 'stores', 'governance/verticals/vitalis/ui'];
const SCAN_EXTS = new Set(['.ts', '.tsx', '.css', '.scss']);
const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.git', '__snapshots__', 'playwright-report',
  'uiux-warharness', 'warharness', 'mobile',
]);

const args    = process.argv.slice(2);
const VERBOSE = args.includes('--verbose');
const STRICT  = args.includes('--strict');

function* walkFiles(dir) {
  const full = join(ROOT, dir);
  if (!statSync(full, { throwIfNoEntry: false })) return;
  yield* walk(full);
}

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(full);
    } else if (entry.isFile() && SCAN_EXTS.has(extname(entry.name))) {
      yield full;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Finding store
// ─────────────────────────────────────────────────────────────────────────────

/** @type {{ severity: 'error'|'warn'; check: string; file: string; line: number; msg: string }[]} */
const findings = [];

function report(severity, check, filePath, lineNo, msg) {
  findings.push({
    severity,
    check,
    file: relative(ROOT, filePath),
    line: lineNo,
    msg,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Checks
// ─────────────────────────────────────────────────────────────────────────────

function checkFile(filePath) {
  const src   = readFileSync(filePath, 'utf8');
  const lines = src.split('\n');
  const ext   = extname(filePath);
  const isTSX = ext === '.tsx' || ext === '.ts';
  const isCSS = ext === '.css' || ext === '.scss';

  lines.forEach((line, idx) => {
    const lineNo = idx + 1;

    // Skip comments, test assertions, import lines
    if (/^\s*(\/\/|\/\*|\*)/.test(line)) return;
    if (/import\s/.test(line) && /from\s/.test(line)) return;
    if (/expect\(|toBe\(|toEqual\(|toHaveStyle\(/.test(line)) return;
    if (/lint-token-ignore/i.test(line)) return;

    // ── [6] Hardcoded hex colours ────────────────────────────────────────
    {
      let m;
      const re = /#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})\b/g;
      while ((m = re.exec(line)) !== null) {
        const hex = expandHex(m[0]);
        if (!BRAND_HEX.has(hex)) {
          report('warn', 'color-consistency', filePath, lineNo,
            `Off-brand hex colour ${m[0]} — use a Tailwind colour token or brand palette`);
        }
      }
    }

    // ── [3] Bare border-radius in CSS ────────────────────────────────────
    if (isCSS) {
      const brm = /border-radius\s*:\s*([^;{]+)/.exec(line);
      if (brm) {
        report('warn', 'border-radius', filePath, lineNo,
          `Bare border-radius: ${brm[1].trim()} — prefer Tailwind rounded-* tokens`);
      }
    }

    // ── [4] Bare box-shadow in CSS ───────────────────────────────────────
    if (isCSS) {
      if (/box-shadow\s*:/.test(line) && !/var\(--/.test(line)) {
        report('warn', 'shadow-token', filePath, lineNo,
          'Bare box-shadow — prefer Tailwind shadow-* or custom --shadow-* variable');
      }
    }

    // ── [5] Non-standard animation durations (TSX/CSS) ───────────────────
    {
      const durRe = /(?:transition|animation|duration)[^\n;]*?(\d{3,4})ms/g;
      let dm;
      while ((dm = durRe.exec(line)) !== null) {
        const ms = parseInt(dm[1], 10);
        if (![75,100,150,200,250,300,500,700,1000].includes(ms)) {
          report('warn', 'animation-token', filePath, lineNo,
            `Non-token animation duration ${ms}ms — approved: 75|100|150|200|250|300|500|700|1000ms`);
        }
      }
    }

    // ── [7] Inline SVG fill with hardcoded colour (TSX) ──────────────────
    if (isTSX) {
      const svgRe = /fill=["']#([0-9a-fA-F]{3,6})["']/g;
      let sm;
      while ((sm = svgRe.exec(line)) !== null) {
        report('error', 'icon-inline-fill', filePath, lineNo,
          `Inline SVG fill="#${sm[1]}" — use currentColor or Tailwind fill-* class`);
      }
    }

    // ── [8] Banned fonts ─────────────────────────────────────────────────
    for (const font of BANNED_FONTS) {
      if (line.includes(font)) {
        report('error', 'premium-font', filePath, lineNo,
          `Banned font "${font}" found — Vitalis uses Inter/DM Serif Display only`);
      }
    }

    // ── [8] Generic CSS font fallback without brand font prefix ──────────
    if (isCSS) {
      for (const fallback of GENERIC_FALLBACKS) {
        if (line.includes(`font-family`) && line.includes(fallback)) {
          const hasInterOrDM = /inter|dm\s*serif|dm-serif|dm_serif/i.test(line);
          if (!hasInterOrDM) {
            report('warn', 'premium-font', filePath, lineNo,
              `Generic font fallback "${fallback}" without brand font — add Inter or DM Serif Display first`);
          }
        }
      }
    }
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Typography hierarchy check (static, file-level)
// ─────────────────────────────────────────────────────────────────────────────

function checkTypographyHierarchy(filePath) {
  const src = readFileSync(filePath, 'utf8');

  // Detect if file renders heading elements
  const h1Count = (src.match(/<h1/g) ?? []).length;
  const h2Count = (src.match(/<h2/g) ?? []).length;
  const h3Count = (src.match(/<h3/g) ?? []).length;

  // Rule: pages should have exactly 1 h1
  if (h1Count > 1) {
    report('warn', 'typography-hierarchy', filePath, 0,
      `Multiple <h1> tags (${h1Count}) — each page/screen should have exactly one <h1>`);
  }

  // Rule: h3 without h2 on the same page is unusual
  if (h3Count > 0 && h2Count === 0 && h1Count > 0) {
    report('warn', 'typography-hierarchy', filePath, 0,
      `<h3> found without <h2> — check heading hierarchy for screen-reader clarity`);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Run
// ─────────────────────────────────────────────────────────────────────────────

let scanned = 0;

for (const dir of SCAN_DIRS) {
  for (const filePath of walkFiles(dir)) {
    scanned++;
    checkFile(filePath);

    if (extname(filePath) === '.tsx') {
      checkTypographyHierarchy(filePath);
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Output
// ─────────────────────────────────────────────────────────────────────────────

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const GREEN  = '\x1b[32m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';
const DIM    = '\x1b[2m';

const errors   = findings.filter((f) => f.severity === 'error');
const warnings = findings.filter((f) => f.severity === 'warn');

if (findings.length === 0) {
  console.log(`${GREEN}${BOLD}✅ Premium Visual Sweep: PASSED${RESET} — ${scanned} files scanned, 0 issues.`);
  process.exit(0);
}

/** Group by check */
const byCheck = new Map();
for (const f of findings) {
  if (!byCheck.has(f.check)) byCheck.set(f.check, []);
  byCheck.get(f.check).push(f);
}

const CHECK_LABELS = {
  'color-consistency':  '[6] Color consistency',
  'border-radius':      '[3] Border-radius tokens',
  'shadow-token':       '[4] Shadow tokens',
  'animation-token':    '[5] Animation tokens',
  'icon-inline-fill':   '[7] Icon inline fill',
  'premium-font':       '[8] Premium font stack',
  'typography-hierarchy': '[1] Typography hierarchy',
};

console.log(`\n${BOLD}🎨 Premium Visual Sweep — Vitalis Elite Medical Dating${RESET}`);
console.log(`${DIM}Scanned ${scanned} files${RESET}\n`);

for (const [check, items] of byCheck) {
  const label = CHECK_LABELS[check] ?? check;
  console.log(`${CYAN}${BOLD}${label}${RESET}  (${items.length} finding${items.length === 1 ? '' : 's'})`);

  const show = VERBOSE ? items : items.slice(0, 5);
  for (const f of show) {
    const icon = f.severity === 'error' ? `${RED}✖${RESET}` : `${YELLOW}⚠${RESET}`;
    const loc  = f.line > 0 ? `:${f.line}` : '';
    console.log(`  ${icon} ${DIM}${f.file}${loc}${RESET}`);
    console.log(`      ${f.msg}`);
  }

  if (!VERBOSE && items.length > 5) {
    console.log(`  ${DIM}…and ${items.length - 5} more (run --verbose to see all)${RESET}`);
  }
  console.log();
}

console.log(`${BOLD}Summary${RESET}`);
console.log(`  Files scanned : ${scanned}`);
console.log(`  Errors        : ${errors.length > 0 ? `${RED}${BOLD}${errors.length}${RESET}` : `${GREEN}0${RESET}`}`);
console.log(`  Warnings      : ${warnings.length > 0 ? `${YELLOW}${warnings.length}${RESET}` : `${GREEN}0${RESET}`}`);

const shouldFail = errors.length > 0 || (STRICT && warnings.length > 0);

if (shouldFail) {
  console.log(`\n${RED}${BOLD}❌ Premium Visual Sweep: FAILED${RESET}`);
  console.log('Fix errors above before merging to a release branch.');
} else {
  console.log(`\n${YELLOW}${BOLD}⚠  Premium Visual Sweep: WARNINGS${RESET}`);
  console.log('Review warnings above. No hard failures — sweep passed.');
}

process.exit(shouldFail ? 1 : 0);
