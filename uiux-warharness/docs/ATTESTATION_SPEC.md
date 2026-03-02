# ATTESTATION_SPEC@1.0

## Purpose
Defines the CI provenance attestation structure. Binds evidence to a specific CI execution: repository, commit, workflow, git ref, and runner image digest. Prevents evidence from unofficial CI environments.

## AttestedPayload
```typescript
interface AttestedPayload {
  spec:                 "ATTESTATION_SPEC@1.0";
  repo:                 string;  // e.g. "github.com/vitalis/app"
  commit_sha:           string;  // 40-char git SHA
  workflow:             string;  // e.g. ".github/workflows/release-gate.yml"
  ref:                  string;  // e.g. "refs/heads/main"
  runner_image_digest:  string;  // e.g. "sha256:..."
  build_started_at:     string;  // RFC3339
  subject_hash:         string;  // hex — hash of attested artifact
}
```

## Hash Formula
```
attestation_hash = H("UIUX_ATTESTATION_V1", JCS(attested_payload))
```

## Verification Logic
`verifyAttestation(att, policy)` checks:
1. `att.spec === "ATTESTATION_SPEC@1.0"`
2. `H("UIUX_ATTESTATION_V1", utf8(att.repo)) === policy.provenance_pin.repo_allowlist_hash`
3. Same hash check for `workflow`, `ref`, `runner_image_digest`

Failures accumulate into `failures[]`. All must pass for `ok: true`.

## Allowlist Population
```typescript
// For each allowed value, compute:
repo_allowlist_hash = H("UIUX_ATTESTATION_V1", utf8("github.com/vitalis/app"))
workflow_allowlist_hash = H("UIUX_ATTESTATION_V1", utf8(".github/workflows/release-gate.yml"))
// ... etc
```

## DB Columns
- `attestation_spec_version` — "ATTESTATION_SPEC@1.0"
- `attestation_ref` — CI run ID (for observability)
- `attestation_hash` — hex, NOT NULL

## ProvenancePayload Extension
`src/core/provenance.ts` extends `AttestedPayload` with:
- `ci_run_id` — CI platform run identifier
- `extra` — optional additional CI metadata

## Environment Variables (producer)
| Var | Field |
|-----|-------|
| `GITHUB_REPOSITORY` | `repo` |
| `GITHUB_SHA` | `commit_sha` |
| `GITHUB_WORKFLOW` | `workflow` |
| `GITHUB_REF` | `ref` |
| `RUNNER_IMAGE_DIGEST` | `runner_image_digest` |
| `WAR_BUILD_STARTED_AT` | `build_started_at` |
| `GITHUB_RUN_ID` | `ci_run_id` |

## Implementation
`src/core/attestation.ts`, `src/core/provenance.ts`
