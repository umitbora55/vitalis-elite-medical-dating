# SIGNED_ROOT_SPEC@6.4

## Purpose
Defines the signed root payload — the canonical producer commitment to a run's evidence. The producer signs `signed_root_hash` (the hex string) with Ed25519. This is the primary integrity anchor.

## Signed Root Payload
```json
{
  "spec": "SIGNED_ROOT_SPEC@6.4",
  "run_id": "...",
  "suite": "p0_smoke",
  "artifact_hash": "<hex>",
  "audit_root_hash": "<hex>",
  "artifact_index_hash": "<hex>",
  "manifest_hash": "<hex>",
  "policy_pin_hash": "<hex>",
  "chain_root": "<hex>",
  "redaction_report_hash": "<hex>",
  "attestation_hash": "<hex>",
  "created_at_claimed": "2026-02-28T12:00:00.000Z"
}
```

## Hash Formula
```
artifact_hash     = H("UIUX_SIGNED_ROOT_V1", JCS(signed_root_payload))
signed_root_hash  = H("UIUX_SIGNED_ROOT_V1", JCS(signed_root_payload))
```
(artifact_hash and signed_root_hash are the same — the signed_root_payload is the canonical artifact)

## Signature
```
producer_sig = Ed25519_Sign(signed_root_hash_hex_utf8, producer_private_key)
```
- Signs the hex string as UTF-8 bytes (not raw hash bytes)
- Base64-encoded in DB column `producer_sig`
- Key identified by `producer_kid` (resolved via trust root at verify time)

## DB Columns
- `signed_root_payload` (jsonb) — full canonical payload
- `signed_root_hash` (text) — hex
- `signed_root_c14n_hash` (text) — sha256(JCS(payload)) forensic field
- `producer_kid`, `producer_sig`, `producer_alg`, `producer_claims`

## Security Properties
- Producer key never touches DB — key is env-provided, public key in trust root
- `chain_root` links this payload into the tamper-evident chain
- `policy_pin_hash` ensures verifier rejects evidence from wrong policy version
- `redaction_report_hash` ensures PII status is committed before signing

## Implementation
`src/core/evidence.ts`
- `computeArtifactHash(signedRootPayload)` → hex
- `writeEvidence(args, sbAdmin)` → `EvidenceWriteResult`
