# OPERATIONS.md — WAR Harness v6.4 Operational Runbook

## Prerequisites
- Node.js >= 20
- Supabase project with schemas: `war_evidence`, `war_verify`, `war_anchor`
- Ed25519 key pairs for producer and verifier roles
- Signed keyring JSON (for `SIGNED_KEYRING` trust root type)

## Required Environment Variables

### Producer (run CLI)
| Variable | Description |
|----------|-------------|
| `WAR_RUN_ID` | Unique run identifier (e.g. `ci-${GITHUB_RUN_ID}`) |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key |
| `WAR_SUITE` | Suite name: `p0_smoke`, `p0_visual`, `p1_fullux`, `perf_ci` |
| `WAR_PRODUCER_PRIVKEY_PEM` | Ed25519 private key PEM (CI secret) |
| `WAR_PRODUCER_KID` | Producer key identifier |
| `WAR_POLICY_PIN_HASH` | Expected policy pin hash (from policy snapshot) |
| `GITHUB_REPOSITORY` | For provenance attestation |
| `GITHUB_SHA` | For provenance attestation |
| `GITHUB_WORKFLOW` | For provenance attestation |
| `GITHUB_REF` | For provenance attestation |
| `RUNNER_IMAGE_DIGEST` | Custom: runner image digest |
| `WAR_BUILD_STARTED_AT` | RFC3339 build start time |
| `GITHUB_RUN_ID` | CI run ID |
| `WAR_SUBJECT_HASH` | Hex hash of the attested artifact |

### Verifier (verify CLI)
| Variable | Description |
|----------|-------------|
| `WAR_RUN_ID`, `WAR_SUITE` | As above |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | As above |
| `WAR_VERIFIER_PRIVKEY_PEM` | Verifier Ed25519 private key |
| `WAR_VERIFIER_KID` | Verifier key identifier |
| `WAR_VERIFIER_ID` | Verifier identity string (e.g. `verifier-1`) |
| `WAR_TRUST_ROOT_TYPE` | `SIGNED_KEYRING` \| `SIGSTORE` \| `KMS_ATTEST` |
| `WAR_TRUST_ROOT_REF` | Trust root reference (keyring JSON, etc.) |
| `WAR_POLICY_JSON` | Full PolicySnapshot JSON string |

### Anchor (anchor CLI)
| Variable | Description |
|----------|-------------|
| `WAR_RUN_ID`, `WAR_SUITE` | As above |
| `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` | As above |
| `WAR_POLICY_PIN_HASH` | Policy pin hash |
| `WAR_ANCHOR_WRITER_ID` | Anchor writer identity |
| `WAR_ANCHOR_POINTER` | Opaque pointer to external WORM store |
| `WAR_ANCHOR_TYPE` | `EXTERNAL_WORM` \| `TLOG` \| `TSA` |
| `WAR_NOTARIZATION_MODE` | (optional) `NOTARIZATION_MODE_TSA` \| `NOTARIZATION_MODE_TLOG` |

## CI Pipeline Flow

```
1. npm run vectors       # Test vectors MUST pass (exit 0)
2. [Run Playwright tests]
3. npm run run:suite     # Producer: write evidence
4. npm run verify        # Verifier 1: write verification
5. npm run verify        # Verifier 2: write verification (different WAR_VERIFIER_ID)
6. npm run anchor        # Anchor: check quorum, write anchor
7. [Optional: notify / gate downstream deploy]
```

## Key Rotation
```bash
WAR_TRUST_OP=rotate \
WAR_KEYRING_PATH=./keyring.json \
WAR_REVOKE_KID=old-producer-key-1 \
WAR_REVOKE_AT=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
WAR_KEY_KID=producer-key-2 \
WAR_KEY_PEM="$(cat new_producer_pub.pem)" \
WAR_KEY_VALID_FROM=$(date -u +%Y-%m-%dT%H:%M:%SZ) \
WAR_KEY_VALID_TO="2027-01-01T00:00:00Z" \
node dist/cli/trust.js
```

## Incident Response

### P0: quorum = 0/2
1. Check verification records: `SELECT * FROM war_verify.uiux_verifications WHERE run_id = '...'`
2. Identify failing checks (notes column)
3. If producer_sig_ok = false: check key rotation, policy mismatch
4. If freshness_ok = false: check CI pipeline timing
5. Block RC deployment

### P1: degraded quorum (1/2)
1. Investigate failed verifier's notes
2. Anchor proceeds but with `degraded = true` flag
3. File incident within 1 hour

### Chain fork detected
1. Check advisory lock configuration
2. Check for concurrent CI runs on same run_id+suite
3. Ensure WAR_RUN_ID is unique per CI run

## Database Maintenance
- Tables are append-only — no DELETE/TRUNCATE access to harness_writer role
- Archive old runs via SELECT INTO external table (never DELETE)
- Monitor index sizes: `pg_relation_size('war_evidence.uiux_artifacts')`
