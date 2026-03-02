#!/usr/bin/env node
/**
 * Design Token Lint — P2 Quality Gate
 *
 * PDF Reference: Tasarım Tutarlılığı — Design Token Consistency
 *
 * Validates that hardcoded pixel values in source files align with the
 * project's 8-dp spacing grid and Tailwind design-token scale.
 *
 * Exit codes:
 *   0 — all clear (or warnings only)
 *   1 — hard violations found (pixel values outside the approved token scale)
 *
 * Usage:
 *   node scripts/design-token-lint.mjs                  # scan src/
 *   node scripts/design-token-lint.mjs --strict         # exit 1 on any warning
 *   node scripts/design-token-lint.mjs --path src/components
 */

import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const ROOT = process.cwd();

/** Tailwind 8-dp grid — approved pixel values */
const APPROVED_PX = new Set([
  0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20,
  24, 28, 32, 36, 40, 44, 48, 52, 56, 60, 64, 72, 80, 88, 96, 112, 128, 144,
  160, 176, 192, 208, 224, 240, 256, 288, 320, 384,
  // Border / outline tokens
  0.5, 1.5,
  // Common screen breakpoints (not spacing — reference only)
  320, 375, 390, 430, 640, 768, 1024, 1280, 1440, 1920,
]);

/** Tailwind arbitrary value pattern — allowed as design-token escape hatch */
const TAILWIND_ARBITRARY_RE = /\[(\d+)px\]/g;

/** CSS-in-JS / inline style px pattern */
const HARDCODED_PX_RE = /(?<!\w)(\d+(?:\.\d+)?)px(?!\])/g;

/** Files to scan */
const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.css', '.scss']);

/** Directories to skip */
const SKIP_DIRS = new Set([
  'node_modules', 'dist', '.git', 'playwright-report', 'test-results',
  'uiux-warharness', 'warharness', 'mobile',
]);

/** Lines that contain these strings are exempt from linting */
const EXEMPT_LINE_PATTERNS = [
  /\/\/\s*lint-token-ignore/i,
  /\/\*\s*lint-token-ignore/i,
  // Playwright viewport / CDP
  /viewport/i,
  /Emulation\./,
  // Test assertions
  /expect\(/,
  /toBe\(/,
  /toEqual\(/,
  // CSS custom props (--spacing-*)
  /var\(--/,
  // Comments
  /^\s*\/\//,
  /^\s*\*/,
  // SVG viewBox / icon sizes
  /viewBox/i,
  /stroke-width/i,
  /d="/,
];

// Hard-fail pixel values — too large to be a spacing token, too small for breakpoint
const HARD_FAIL_THRESHOLD_MIN = 21;
const HARD_FAIL_THRESHOLD_MAX = 319;

// ─────────────────────────────────────────────────────────────────────────────
// CLI args
// ─────────────────────────────────────────────────────────────────────────────

const args       = process.argv.slice(2);
const STRICT     = args.includes('--strict');
const pathArg    = args.find((a) => a.startsWith('--path='))?.split('=')[1];
const SCAN_ROOTS = pathArg
  ? [join(ROOT, pathArg)]
  : [join(ROOT, 'src'), join(ROOT, 'components'), join(ROOT, 'services'), join(ROOT, 'stores')];

// ─────────────────────────────────────────────────────────────────────────────
// File walker
// ─────────────────────────────────────────────────────────────────────────────

function* walkFiles(dir) {
  if (!statSync(dir, { throwIfNoEntry: false })) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
    } else if (entry.isFile() && SCAN_EXTENSIONS.has(extname(entry.name))) {
      yield full;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Analyser
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {{ file: string; line: number; col: number; value: number; raw: string; severity: 'warn' | 'error' }} Finding
 */

/** @returns {Finding[]} */
function analyseFile(filePath) {
  const src    = readFileSync(filePath, 'utf8');
  const lines  = src.split('\n');
  const relPath = relative(ROOT, filePath);
  const findings = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (EXEMPT_LINE_PATTERNS.some((re) => re.test(line))) continue;

    // Strip out Tailwind arbitrary values before checking
    const stripped = line.replace(TAILWIND_ARBITRARY_RE, (_, val) => {
      // Tailwind arbitrary px values — always approved (intentional token escape)
      return `[${val}px_approved]`;
    });

    let match;
    HARDCODED_PX_RE.lastIndex = 0;

    while ((match = HARDCODED_PX_RE.exec(stripped)) !== null) {
      const raw   = match[0];
      const value = parseFloat(match[1]);

      if (APPROVED_PX.has(value)) continue;

      const isHardFail =
        value > HARD_FAIL_THRESHOLD_MIN &&
        value < HARD_FAIL_THRESHOLD_MAX &&
        !Number.isInteger(value / 4); // not divisible by 4 (not on 4-dp sub-grid)

      findings.push({
        file:     relPath,
        line:     i + 1,
        col:      match.index + 1,
        value,
        raw,
        severity: isHardFail ? 'error' : 'warn',
      });
    }
  }

  return findings;
}

// ─────────────────────────────────────────────────────────────────────────────
// Runner
// ─────────────────────────────────────────────────────────────────────────────

let totalErrors   = 0;
let totalWarnings = 0;
let totalFiles    = 0;

/** @type {Map<string, Finding[]>} */
const byFile = new Map();

for (const scanRoot of SCAN_ROOTS) {
  for (const filePath of walkFiles(scanRoot)) {
    const findings = analyseFile(filePath);
    if (findings.length > 0) {
      byFile.set(filePath, findings);
      totalFiles++;
      totalErrors   += findings.filter((f) => f.severity === 'error').length;
      totalWarnings += findings.filter((f) => f.severity === 'warn').length;
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report
// ─────────────────────────────────────────────────────────────────────────────

if (byFile.size === 0) {
  console.log('✅ Design Token Lint: All pixel values are within the approved token scale.');
  process.exit(0);
}

const RESET  = '\x1b[0m';
const RED    = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN   = '\x1b[36m';
const BOLD   = '\x1b[1m';

for (const [filePath, findings] of byFile) {
  const relPath = relative(ROOT, filePath);
  console.log(`\n${CYAN}${BOLD}${relPath}${RESET}`);

  for (const f of findings) {
    const icon   = f.severity === 'error' ? `${RED}✖ error${RESET}` : `${YELLOW}⚠ warn ${RESET}`;
    const needle = APPROVED_PX.has(Math.round(f.value / 4) * 4)
      ? `nearest grid: ${Math.round(f.value / 4) * 4}px`
      : 'not on 4-dp sub-grid';

    console.log(`  ${icon}  line ${f.line}:${f.col}  ${BOLD}${f.raw}${RESET}  — off-token value (${needle})`);
  }
}

console.log(`
${BOLD}Design Token Lint Summary${RESET}
  Files affected : ${totalFiles}
  Errors         : ${RED}${totalErrors}${RESET}
  Warnings       : ${YELLOW}${totalWarnings}${RESET}

Approved token scale: https://tailwindcss.com/docs/customizing-spacing
To suppress a line:  // lint-token-ignore
To use escape hatch: Tailwind arbitrary value [Npx]
`);

const shouldFail = totalErrors > 0 || (STRICT && totalWarnings > 0);
process.exit(shouldFail ? 1 : 0);
