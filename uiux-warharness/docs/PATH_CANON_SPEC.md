# PATH_CANON_SPEC@1.0

## Purpose
Defines canonical path representation for all artifact paths in the WAR Harness. Ensures deterministic, cross-platform path hashing regardless of OS or file system.

## Rules

### Mandatory transforms (applied in order):
1. **Backslash → forward slash**: `\` becomes `/` (Windows compatibility)
2. **Strip leading `./`**: `./foo/bar.png` becomes `foo/bar.png`
3. **Reject `..` segments**: Any path containing `..` throws `PATH_TRAVERSAL`
4. **NFC normalization**: Unicode characters normalized to NFC (UNICODE_NORMALIZATION_FORM_C)
5. **No leading slash**: Paths are relative, never absolute (`/foo` is rejected)
6. **No trailing slash**: `foo/bar/` becomes `foo/bar`

### Optional transform:
- **Casefold**: `{ casefold: true }` → lower-cases the path. Stored in `path_casefold` field (not used for hashing).

## Output Shape
```typescript
interface CanonicalizedPath {
  path:          string;   // canonical path (used for all hashing)
  path_casefold?: string;  // optional lowercase variant
}
```

## Security Properties
- Path traversal (`..`) is rejected as P0 — attacker cannot escape artifact root
- NFC normalization prevents Unicode homograph attacks on file names
- Deterministic: same logical path always produces same canonical form

## Hash Usage
Canonical paths are the `path` field in `LeafPayload` and sorted byte-order before Merkle root computation:
```
sorted = leaves.sort((a, b) => Buffer.compare(utf8(a.path), utf8(b.path)))
```

## Implementation
`src/core/pathCanon.ts` — `canonicalizePath(raw, opts?)` → `CanonicalizedPath`
