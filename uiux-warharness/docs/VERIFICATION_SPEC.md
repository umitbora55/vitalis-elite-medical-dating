# VERIFICATION_SPEC@6.4

## Purpose
Defines the complete verification procedure run by the verifier role. The verifier independently checks all P0 integrity properties and produces a signed verification record.

## Verification Checks (all P0 unless noted)

| Check | Description | Failure consequence |
|-------|-------------|---------------------|
| `producer_sig_ok` | Ed25519 signature over signed_root_hash verified against trust root public key | P0 — quorum fail |
| `audit_root_ok` | Recomputed Merkle root matches claimed audit_root_hash | P0 |
| `artifact_index_ok` | artifact_index_hash recomputed from index payload | P0 |
| `manifest_hash_ok` | manifest_hash recomputed from manifest JSON | P0 |
| `chain_ok` | chain_root recomputed from chain_node | P0 |
| `anti_fork_ok` | Chain continuity verified (no fork) | P0 |
| `redaction_ok` | redaction_state == "full" | P0 |
| `storage_immutability_ok` | Storage backend confirms object is immutable | P0 |
| `attestation_ok` | Attested CI provenance in policy allowlists | P0 |
| `freshness_ok` | verified_at_observed within freshness window | P0 — stale |
| `notarization_ok` | TSA/tlog token valid (if checked) | P1 (if required_for_rc) |

## Verification Payload
```json
{
  "spec": "VERIFICATION_SPEC@6.4",
  "run_id": "...",
  "suite": "p0_smoke",
  "artifact_id": 42,
  "verified_at": "2026-02-28T12:15:00.000Z",
  "policy_pin_hash": "<hex>",
  "checks": { ... },
  "verifier_id": "verifier-1"
}
```

## Verification Root + Signature
```
verification_root = H("UIUX_VERIFICATION_ROOT_V1", JCS(verification_payload))
verifier_sig      = Ed25519_Sign(verification_root_hex_utf8, verifier_private_key)
```

## Quorum Model
- Required: 2/2 verifications pass all checks
- Degraded (1/2): P1 incident — anchor allowed but flagged
- 0/2: P0 fail — cannot anchor

## DB Schema
`war_verify.uiux_verifications` — append-only, `(artifact_id, verifier_id)` unique

## Implementation
`src/core/verifier.ts`
- `runVerification(args, sbAdmin)` → `VerificationResult`
