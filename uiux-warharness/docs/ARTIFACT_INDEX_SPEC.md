# ARTIFACT_INDEX_SPEC@6.4

## Purpose
Defines the artifact index — the ordered, allowlist-validated manifest of all normalized artifacts in a run. The index hash is a tamper-evident commitment to the exact set of evidence artifacts.

## Rules
- **Exclude: none** — All artifacts matching the allowlist must be included
- **Include: suite-scoped allowlist only** — Paths outside allowlist → P0 fail
- **Index entries reference normalized set only** — Raw artifact hashes are not used
- **Sorted**: entries sorted by path byte order (UTF-8 byte comparison, same as audit root)

## Index Payload
```json
{
  "spec": "ARTIFACT_INDEX_SPEC@6.4",
  "run_id": "...",
  "suite": "p0_smoke",
  "entries": [
    {
      "path": "playwright/reports/a11y/report.json",
      "sha256": "<hex of normalized bytes>",
      "bytes": 1234,
      "norm": { "spec": "ARTIFACT_NORMALIZATION_SPEC@1.0", "alg": "JSON_JCS_V1" }
    },
    ...
  ]
}
```

## Hash Formula
```
artifact_index_hash = H("UIUX_ARTIFACT_INDEX_V1", JCS(index_payload))
```

Domain tag: `UIUX_ARTIFACT_INDEX_V1`

## Verification
```typescript
verifyArtifactIndexHash(index, claimedHash): boolean
```

## DB Column
`war_evidence.uiux_artifacts.artifact_index_hash` — NOT NULL

## Implementation
`src/core/artifactIndex.ts`
- `buildArtifactIndex(args)` → `{ index, artifactIndexHash, c14nHashHex }`
- `verifyArtifactIndexHash(index, claimedHash)` → `boolean`
