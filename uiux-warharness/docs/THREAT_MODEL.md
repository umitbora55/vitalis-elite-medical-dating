# THREAT_MODEL.md — UI/UX WAR Harness v6.4

## Scope
This document enumerates threat actors, attack vectors, and mitigations for the Vitalis UI/UX WAR Harness evidence system.

## Trust Boundaries

```
[CI Runner] → signs → [Evidence DB (Supabase)]
                              ↓
                    [Verifier (independent)] → signs → [Verification DB]
                                                               ↓
                                                       [Anchor DB] → [External WORM / TSA]
```

## Threat Actors

| Actor | Capability | Goal |
|-------|-----------|------|
| Compromised CI runner | Write to DB with valid producer key | Insert false evidence |
| Malicious producer | Forge evidence payload | Bypass gate with fake results |
| DB administrator | Modify/delete DB rows | Remove incriminating evidence |
| Replay attacker | Resubmit old valid evidence | Pass gate without running tests |
| Fork attacker | Concurrent conflicting inserts | Split chain, confuse verifier |
| Key thief | Steal producer private key | Sign forged evidence |
| Downgrade attacker | Use old policy/spec version | Exploit known weaknesses |

## Mitigations

### T1: Compromised CI runner
- **Mitigation**: Producer key in env secret (never in repo or DB). Evidence is append-only (DB trigger blocks UPDATE/DELETE). Idempotency key prevents duplicate insertion.
- **Residual risk**: If runner is compromised AND key is stolen simultaneously.

### T2: Forge evidence payload
- **Mitigation**: Producer signature over `signed_root_hash` (Ed25519). Verifier independently re-computes all hashes. Policy pin prevents mismatched spec versions.
- **Detection**: Verification checks producer_sig_ok.

### T3: DB row modification/deletion
- **Mitigation**: DB triggers block UPDATE/DELETE. Append-only constraint at DB level. Chain root links all rows — any deletion breaks continuity.
- **Detection**: Chain continuity verification by verifier.

### T4: Replay attack (old evidence)
- **Mitigation**: Freshness check — `verified_at_observed` must be within 30 min of `ingested_at`. Idempotency key per run prevents re-insert.
- **Detection**: `freshness_ok = false` → quorum degraded.

### T5: Fork attack (concurrent inserts)
- **Mitigation**: PostgreSQL advisory lock serializes inserts. Client-side `validateAntiFork()` pre-checks. DB trigger validates `expected_prev_chain_root`.
- **Detection**: `ANTI_FORK_FAIL` exception on second insert.

### T6: Key theft
- **Mitigation**: Key in CI secret (not in repo). Trust root revocation list. Revocation takes effect at `revoked_at` with no grace window.
- **Response**: Revoke key immediately via `WAR_TRUST_OP=revoke` CLI.

### T7: Downgrade attack
- **Mitigation**: `assertSpecVersionAllowed()` in verifier checks that spec versions are in policy allowlist. `policy_pin_hash` commits to exact policy at evidence write time.
- **Detection**: `POLICY_DOWNGRADE` error during verification.

### T8: PII leakage
- **Mitigation**: `redaction_state` must be "full" before signing. `redactionReportHash` committed in signed root. P0 assertion blocks evidence write if not "full".
- **Compliance**: KVKK (Turkish data protection), equivalent to GDPR.

## P0 Failure Modes
Any of these cause quorum to fail and block RC:
- `producer_sig_ok = false`
- `audit_root_ok = false`
- `chain_ok = false` / `anti_fork_ok = false`
- `redaction_ok = false` (redaction_state ≠ "full")
- `freshness_ok = false`
- `attestation_ok = false`
- Quorum = 0/2

## Non-Repudiation Chain
Evidence → (producer_sig) → Verification × 2 → (verifier_sig × 2) → Anchor → (notarization token) → External TSA/tlog

Each step is cryptographically linked; tampering at any point is detectable.
