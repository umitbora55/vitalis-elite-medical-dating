# TRUST_ROOT_SPEC@1.1

## Purpose
Defines how public keys are resolved for signature verification. Three backend types are supported. Trust root enforces key validity and revocation at a specific effective_time.

## Trust Root Types

| Type | Description |
|------|-------------|
| `SIGSTORE` | Sigstore TUF metadata + bundle verification |
| `SIGNED_KEYRING` | JSON keyring file signed by known authority |
| `KMS_ATTEST` | Cloud KMS (AWS/GCP) with hardware attestation |

## Key Entry Shape (SIGNED_KEYRING)
```typescript
interface KeyEntry {
  kid:          string;    // opaque key identifier
  publicKeyPem: string;    // Ed25519 public key PEM
  valid_from:   string;    // RFC3339 — earliest valid time
  valid_to:     string;    // RFC3339 — expiry
  revoked_at?:  string;    // RFC3339 — if present: revoked
  alg:          "ed25519";
}
```

## Revocation Semantics (P0)
- `valid_from <= effective_time <= valid_to` — must be satisfied
- If `revoked_at` is present AND `revoked_at <= effective_time` → FAIL
- **No grace window** — revocation is immediate at `revoked_at`

## Effective Time
From TIME_MODEL_SPEC@1.1:
- Default: `evidence.ingested_at`
- If notarized: `notarized_at` (externally attested, preferred)

## Key Rotation Procedure
1. Generate new Ed25519 key pair
2. Add new key to keyring with `valid_from = now`
3. Set `valid_to` on old key (or set `revoked_at`)
4. Update `WAR_TRUST_ROOT_REF` env var (new keyring JSON)
5. Update `WAR_PRODUCER_KID` / `WAR_VERIFIER_KID` for new key
6. Old evidence rows remain verifiable via their `kid` + old keyring

## resolvePublicKey
```typescript
resolvePublicKey(kid, type, ref, effectiveTime): Promise<TrustRootResult>
```
Returns `{ publicKeyPem, kid, valid, reason? }`.

- `SIGNED_KEYRING`: `ref` is JSON string of `SignedKeyring`
- `SIGSTORE`: `ref` is Sigstore bundle URL or JSON (stub)
- `KMS_ATTEST`: `ref` is KMS ARN (stub)

## CLI Management
`src/cli/trust.ts`
- `WAR_TRUST_OP=list|add|rotate|revoke|verify`
- `WAR_KEYRING_PATH` — path to keyring JSON file

## Implementation
`src/core/trustRoot.ts`
- `resolvePublicKey(kid, type, ref, effectiveTime)` → `Promise<TrustRootResult>`
- `checkKeyValidity(entry, effectiveTime)` → `{ valid, reason? }`
- `buildInMemoryKeyring(entries)` — for testing
