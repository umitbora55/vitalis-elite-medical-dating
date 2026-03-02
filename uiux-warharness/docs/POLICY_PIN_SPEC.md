# POLICY_PIN_SPEC@1.2

## Purpose
Defines the policy snapshot that pins all spec version allowlists, freshness windows, storage policy, provenance pins, and notarization requirements. Policy hash is committed in every evidence row.

## Policy Snapshot Shape
```typescript
interface PolicySnapshot {
  spec:  "POLICY_PIN_SPEC@1.2";
  allowed: {
    SIGNED_ROOT_SPEC:            string[];  // e.g. ["6.4"]
    VERIFICATION_SPEC:           string[];
    AUDIT_ROOT_SPEC:             string[];
    ARTIFACT_INDEX_SPEC:         string[];
    PATH_CANON_SPEC:             string[];
    GLOB_SPEC:                   string[];
    ARTIFACT_NORMALIZATION_SPEC: string[];
    ATTESTATION_SPEC:            string[];
  };
  freshness_window_seconds:    number;  // 1800 (30 min)
  drift_budget_seconds:        number;  // 300 (5 min)
  storage_policy_ref:          string;  // "STORAGE_IMMUTABILITY_SPEC@1.0"
  provenance_pin:              ProvEnancePin;
  notarization_policy:         NotarizationPolicy;
  trusted_identities_allowlist_hash: string;
  trusted_issuers_allowlist_hash:    string;
  revocation_list_hash:        string;
}
```

## Hash Formula
```
policy_pin_hash = H("UIUX_POLICY_PIN_V1", JCS(policy_snapshot))
```

## Downgrade Protection
`assertSpecVersionAllowed(policy, specKey, version)` throws `POLICY_DOWNGRADE` if the version is not in the allowlist. Called during verification to reject evidence from old/unauthorized spec versions.

## Policy Update Procedure
1. Draft new policy snapshot
2. Sign with trust root key (external)
3. Compute new `policy_pin_hash`
4. Update `WAR_POLICY_PIN_HASH` env var in CI
5. Update `WAR_POLICY_JSON` env var for verifier
6. All new evidence rows reference new hash; old rows reference old hash (immutable)

## Provenance Pin
```typescript
interface ProvEnancePin {
  repo_allowlist_hash:                    string;
  workflow_allowlist_hash:                string;
  ref_allowlist_hash:                     string;
  runner_image_digest_allowlist_hash:     string;
}
```
Each field = `H("UIUX_ATTESTATION_V1", utf8(allowed_value))`. Used by `verifyAttestation` to check CI provenance.

## Implementation
`src/core/policyPin.ts`
- `computePolicyPinHash(policy)` → hex
- `verifyPolicyPinHash(policy, claimedHash)` → boolean
- `assertSpecVersionAllowed(policy, specKey, version)` — throws on downgrade
- `POLICY_V64` — canonical v6.4 policy (partial; requires provenance_pin from deployment)
