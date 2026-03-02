# ARTIFACT_NORMALIZATION_SPEC@1.0

## Purpose
Defines deterministic normalization procedures for all artifact types before hashing. Normalization eliminates non-content differences (timestamps, tool versions, metadata) to produce stable, reproducible hashes.

## Normalization Algorithms

### PNG_STRIP_META_V1
- Input: `.png` files
- Strips: all PNG metadata chunks (tEXt, iTXt, zTXt, tIME, etc.)
- Preserves: pixel data (IDAT), color profile (iCCP/gAMA/cHRM)
- Output: minimal PNG with stripped metadata
- Use case: Playwright screenshots vary in metadata; pixel data is evidence

### JSON_JCS_V1
- Input: `.json` files
- Applies RFC 8785 JCS (JSON Canonicalization Scheme) — see AUDIT_ROOT_SPEC
- Output: UTF-8 bytes of JCS-canonical JSON
- Use case: Test reports, Lighthouse JSON, bundle analysis JSON

## NormMeta Shape
Each artifact carries normalization metadata in the index:
```json
{
  "spec": "ARTIFACT_NORMALIZATION_SPEC@1.0",
  "alg": "PNG_STRIP_META_V1"
}
```

## LeafPayload Shape
After normalization, each artifact is represented as:
```typescript
interface LeafPayload {
  path:   string;   // canonical path (PATH_CANON_SPEC@1.0)
  sha256: string;   // hex SHA-256 of NORMALIZED bytes
  bytes:  number;   // byte count of NORMALIZED artifact
  norm:   NormMeta; // normalization metadata
}
```

## Security Properties
- `sha256` always computed from normalized bytes — not raw bytes
- Re-normalization is deterministic: same input → same output → same hash
- Non-PNG, non-JSON files are rejected (unknown normalization = P0 fail)

## Implementation
`src/core/artifactNormalize.ts`
