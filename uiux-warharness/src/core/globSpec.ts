/**
 * globSpec.ts — GLOB_SPEC@1.0
 *
 * Rules:
 *   * = single path segment (no / in match)
 *   ** = multiple path segments (may cross /)
 *   Separator: /
 *   Encoding: UTF-8
 *   Case: follows PATH_CANON_SPEC (case-sensitive by default)
 *
 * This module provides:
 *   1. matchesGlob() — test a canonical path against one glob pattern
 *   2. matchesAnyGlob() — test against an allowlist of patterns
 *   3. filterByAllowlist() — filter paths to those matching the allowlist
 *
 * Note: exclude patterns are NOT supported (spec: "Exclude yok").
 * Only suite-scoped include allowlists are permitted.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Glob → RegExp compiler
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compile a GLOB_SPEC@1.0 pattern to a RegExp.
 * The pattern must use forward-slash separators.
 */
function compileGlob(pattern: string, caseSensitive = true): RegExp {
  let re = "^";

  let i = 0;
  while (i < pattern.length) {
    if (pattern[i] === "*" && pattern[i + 1] === "*") {
      // ** matches zero or more path segments including /
      re += "(?:[^/]*/)*[^/]*";
      i += 2;
      // consume surrounding /
      if (pattern[i] === "/") i++;
    } else if (pattern[i] === "*") {
      // * matches one path segment (no /)
      re += "[^/]*";
      i++;
    } else if (pattern[i] === "?") {
      // ? matches any single char except /
      re += "[^/]";
      i++;
    } else {
      // Escape literal regex special chars
      re += escapeRegex(pattern[i]!);
      i++;
    }
  }

  re += "$";
  return new RegExp(re, caseSensitive ? undefined : "i");
}

function escapeRegex(c: string): string {
  return c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Test a canonical path against a single GLOB_SPEC@1.0 pattern.
 */
export function matchesGlob(
  canonicalPath: string,
  pattern: string,
  caseSensitive = true,
): boolean {
  const re = compileGlob(pattern, caseSensitive);
  return re.test(canonicalPath);
}

/**
 * Test a canonical path against an allowlist of glob patterns.
 * Returns true if the path matches at least one pattern.
 * (No exclude patterns — spec: "Exclude yok")
 */
export function matchesAnyGlob(
  canonicalPath: string,
  allowlist: string[],
  caseSensitive = true,
): boolean {
  return allowlist.some((p) => matchesGlob(canonicalPath, p, caseSensitive));
}

/**
 * Filter a list of canonical paths to those matching the include allowlist.
 * Paths NOT in the allowlist are silently excluded.
 * If a path matches and is NOT in the allowlist, it must NOT appear in the index (P0).
 */
export function filterByAllowlist(
  paths: string[],
  allowlist: string[],
  caseSensitive = true,
): string[] {
  return paths.filter((p) => matchesAnyGlob(p, allowlist, caseSensitive));
}

/**
 * Validate that ALL provided paths are covered by the allowlist.
 * Throws if any path is not covered (P0: allowlist-dışı dosya index'e giremez).
 */
export function assertAllInAllowlist(
  paths: string[],
  allowlist: string[],
  caseSensitive = true,
): void {
  const violations = paths.filter(
    (p) => !matchesAnyGlob(p, allowlist, caseSensitive),
  );
  if (violations.length > 0) {
    throw new Error(
      `GLOB_SPEC P0: paths not in include allowlist: ${violations.join(", ")}`,
    );
  }
}
