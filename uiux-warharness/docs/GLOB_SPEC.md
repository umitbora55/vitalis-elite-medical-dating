# GLOB_SPEC@1.0

## Purpose
Defines glob pattern matching rules for suite include allowlists. All artifacts must match at least one allowlist pattern — paths outside the allowlist are a P0 failure.

## Glob Syntax

| Pattern | Meaning |
|---------|---------|
| `*` | Matches any characters within a single path segment (does not cross `/`) |
| `**` | Matches zero or more path segments (crosses `/`) |
| `?` | Matches exactly one character (not `/`) |
| `[abc]` | Character class |
| `{a,b}` | Alternation |

## Semantics

### `*` (single-segment wildcard)
- Matches any characters within one segment only
- `screenshots/*.png` matches `screenshots/a.png`
- `screenshots/*.png` does NOT match `screenshots/sub/a.png`

### `**` (multi-segment wildcard)
- Matches zero or more path segments
- `screenshots/**/*.png` matches `screenshots/sub/a.png` and `screenshots/a.png`

## Allowlist Enforcement (P0)
```typescript
function assertAllInAllowlist(paths: string[], allowlist: string[]): void
```
- Every path must match at least one glob in `allowlist`
- Any non-matching path throws: `ALLOWLIST_VIOLATION: path "x" not in allowlist`
- Empty allowlist → every path fails

## Suite Allowlist Examples
```
p0_smoke:
  - playwright/screenshots/**/*.png
  - playwright/reports/**/*.json

p0_visual:
  - playwright/screenshots/**/*.png
  - playwright/visual-diffs/**/*.png
  - playwright/reports/visual/**/*.json
```

## Implementation
`src/core/globSpec.ts`
- `matchesGlob(path, pattern)` → `boolean`
- `matchesAnyGlob(path, patterns)` → `boolean`
- `assertAllInAllowlist(paths, allowlist)` — throws on violation
