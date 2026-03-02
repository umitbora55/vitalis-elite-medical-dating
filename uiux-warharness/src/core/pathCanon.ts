/**
 * pathCanon.ts — PATH_CANON_SPEC@1.0
 *
 * Rules:
 *   1. \ → /
 *   2. Strip leading ./
 *   3. .. segments → FAIL (throws)
 *   4. Unicode NFC normalization
 *   5. UTF-8 encoding (JS strings are already Unicode)
 *   6. Case: case-sensitive by default
 *      If runner FS is case-insensitive, set casefold = true
 *        → path_casefold = lower(unicode_casefold(path))
 *   7. Null bytes / control characters → FAIL
 */

// ─────────────────────────────────────────────────────────────────────────────
// Control char detector (ASCII 0x00–0x1F, 0x7F, U+0080–U+009F)
// ─────────────────────────────────────────────────────────────────────────────

function hasControlChars(s: string): boolean {
  for (let i = 0; i < s.length; i++) {
    const cp = s.codePointAt(i) ?? 0;
    if (cp === 0 || (cp <= 0x1f) || cp === 0x7f || (cp >= 0x80 && cp <= 0x9f)) {
      return true;
    }
  }
  return false;
}

// ─────────────────────────────────────────────────────────────────────────────
// Canonical path
// ─────────────────────────────────────────────────────────────────────────────

export interface CanonicalizationOptions {
  /**
   * If true, apply Unicode case-folding (lower) to produce path_casefold.
   * Use when the runner FS is case-insensitive (e.g. macOS HFS+, Windows NTFS).
   */
  casefold?: boolean;
}

export interface CanonicalPathResult {
  path:          string;   // canonical path (case-sensitive by default)
  path_casefold?: string;  // lower Unicode casefold (only if casefold=true)
}

/**
 * Canonicalize a file path per PATH_CANON_SPEC@1.0.
 * Throws on any violation.
 */
export function canonicalizePath(
  input: string,
  opts: CanonicalizationOptions = {},
): CanonicalPathResult {
  // 1. Replace backslashes
  let p = input.replace(/\\/g, "/");

  // 2. Strip leading ./
  p = p.replace(/^\.\//, "");

  // 3. NFC normalization
  p = p.normalize("NFC");

  // 4. Null byte / control char check
  if (hasControlChars(p)) {
    throw new Error(`PATH_CANON: path contains null byte or control character: ${JSON.stringify(p)}`);
  }

  // 5. Reject .. segments
  const segments = p.split("/");
  for (const seg of segments) {
    if (seg === "..") {
      throw new Error(`PATH_CANON: path traversal (..) is forbidden: ${JSON.stringify(input)}`);
    }
  }

  const result: CanonicalPathResult = { path: p };

  // 6. Optional casefold
  if (opts.casefold) {
    result.path_casefold = p.toLocaleLowerCase(); // Unicode casefold
  }

  return result;
}

/**
 * Detect casefold collision: two different paths that are equal after casefold.
 * Verifier MUST fail if any collision is detected.
 */
export function detectCasefoldCollisions(paths: string[]): string[][] {
  const byFolded = new Map<string, string[]>();
  for (const p of paths) {
    const folded = p.toLocaleLowerCase();
    const group = byFolded.get(folded) ?? [];
    group.push(p);
    byFolded.set(folded, group);
  }
  return [...byFolded.values()].filter((g) => g.length > 1);
}
