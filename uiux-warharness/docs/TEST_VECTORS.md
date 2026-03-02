# TEST_VECTORS.md — WAR Harness v6.4

## Purpose
Cryptographic test vectors for all security-critical operations. CI MUST verify all vectors pass (exit 0) before allowing any gate PASS.

## Running Vectors
```bash
npm run vectors
# or
node dist/cli/vectors.js
# Exit 0 = all pass; Exit 2 = one or more fail
```

## Vector Categories

### JCS (JSON Canonicalization)
Tests RFC 8785 compliance.

| Vector | Input | Expected |
|--------|-------|----------|
| JCS: null | `null` | `"null"` |
| JCS: number 0 | `0` | `"0"` |
| JCS: key sort | `{b:2, a:1}` | `'{"a":1,"b":2}'` |
| JCS: nested key sort | `{z:{y:1,x:2},a:0}` | `'{"a":0,"z":{"x":2,"y":1}}'` |
| JCS: string escaping | `{k:"hello\nworld"}` | `'{"k":"hello\\nworld"}'` |
| JCS: NaN throws | `NaN` | throws TypeError |
| JCS: Infinity throws | `Infinity` | throws TypeError |

### Domain Hash (H function)
Tests `H(tag, bytes) = sha256(tag_ASCII || 0x00 || bytes)`.

| Vector | Expectation |
|--------|-------------|
| Different tags → different hashes | `hHex("TAG_A", bytes) ≠ hHex("TAG_B", bytes)` |
| Deterministic | Same call twice → same result |

### Path Canonicalization
| Vector | Input | Expected |
|--------|-------|----------|
| Backslash → slash | `playwright\screenshots\1.png` | `playwright/screenshots/1.png` |
| Strip `./` | `./screenshots/1.png` | `screenshots/1.png` |
| `..` throws | `screenshots/../secret.png` | throws PATH_TRAVERSAL |
| NFC normalization | `e\u0301.png` (NFD) | `\u00E9.png` (NFC) |
| Casefold | `Screenshots/Test.PNG` with `{casefold: true}` | `screenshots/test.png` |

### Glob Matching
| Vector | Expectation |
|--------|-------------|
| `*` matches single segment | `screenshots/a.png` matches `screenshots/*.png` |
| `*` does NOT cross `/` | `screenshots/sub/a.png` does NOT match `screenshots/*.png` |
| `**` matches multiple segments | `screenshots/sub/a.png` matches `screenshots/**/*.png` |
| Outside allowlist | `secret.json` does NOT match `["screenshots/**"]` |

### Merkle / Audit Root
| Vector | Expectation |
|--------|-------------|
| Single leaf is own root | 64-char hex returned |
| Path sort produces same root | Input order invariant |
| Different leaves → different roots | Distinct sha256 → distinct roots |

### Chain Node
| Vector | Expectation |
|--------|-------------|
| First node null prev | 64-char hex chain root |
| First node with non-null expected throws | `ANTI_FORK_FAIL` |
| Mismatch expected vs actual throws | `ANTI_FORK_FAIL` |

## Adding New Vectors
Add to the appropriate vector array in `src/core/testVectors.ts`:
```typescript
{
  name: "my-feature: description",
  run: () => {
    const result = computeSomething(input);
    assertEqual(result, expectedValue, "failure message");
  }
}
```

## CI Integration
```yaml
# .github/workflows/release-gate.yml
- name: Run test vectors
  run: npm run vectors
  # Exits 2 if any vector fails — blocks pipeline
```

## Implementation
`src/core/testVectors.ts`
- `ALL_VECTORS: TestVector[]` — complete vector set
- `runAllVectors(throwOnFail?)` → `{ passed, failed, failures }`
