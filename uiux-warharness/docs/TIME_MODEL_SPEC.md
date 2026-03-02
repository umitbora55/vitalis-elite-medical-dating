# TIME_MODEL_SPEC@1.1

## Purpose
Defines all time fields in the evidence/verification/anchor pipeline and the freshness check rule. Prevents stale verification (verifier from a prior run signing new evidence).

## Time Fields

| Field | Table | Description |
|-------|-------|-------------|
| `created_at_claimed` | uiux_artifacts | Producer payload time (UTC RFC3339) |
| `ingested_at` | uiux_artifacts | DB INSERT time (server-set, default now()) |
| `verified_at_claimed` | uiux_verifications | Verifier payload time (UTC RFC3339) |
| `created_at` (verifications) | uiux_verifications | DB INSERT time = verified_at_observed |
| `created_at` (anchors) | uiux_anchors | DB INSERT time = anchor_written_at_observed |
| `notarized_at` | (from notarization token) | Externally-attested timestamp |

## Freshness Rule (P0)
```
verified_at_observed IN [ingested_at, ingested_at + freshness_window + drift_budget]
```

- `freshness_window_seconds` = 1800 (30 min) — from policy snapshot
- `drift_budget_seconds` = 300 (5 min) — network/clock drift allowance
- `verified_at_observed` = `uiux_verifications.created_at` (DB server time)
- Failure → `STALE_VERIFICATION` → `freshness_ok = false` → quorum degraded/failed

## Effective Time (for revocation)
```typescript
effectiveTime = notarized_at ?? ingested_at
```
- If notarized (TSA/tlog): `notarized_at` is externally attested — preferred
- Otherwise: `ingested_at` (DB server time)

## RFC3339 Format
All timestamps: `2026-02-28T12:00:00.000Z` (UTC, with milliseconds, Z suffix)

## Clock Drift
Verifier must run within `freshness_window + drift_budget` of ingestion. CI pipeline typically completes within minutes — 30 min window accommodates queue delays and parallel verifier startup.

## Implementation
`src/core/timeModel.ts`
- `checkFreshness(args)` → `FreshnessResult`
- `effectiveTime(args)` → `Date`
- `toRfc3339(d?)` → RFC3339 string

## Default Values
```typescript
DEFAULT_FRESHNESS_WINDOW_SECONDS = 1800
DEFAULT_DRIFT_BUDGET_SECONDS     = 300
```
