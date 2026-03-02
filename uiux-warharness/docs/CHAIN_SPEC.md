# CHAIN_SPEC@1.1

## Purpose
Defines the tamper-evident chain linking consecutive evidence rows for a `(run_id, suite)` pair. Prevents silent evidence substitution and detects forks (concurrent conflicting inserts).

## Chain Node Payload
```json
{
  "spec": "CHAIN_NODE_SPEC@1.1",
  "run_id": "...",
  "suite": "p0_smoke",
  "artifact_hash": "<hex>",
  "prev_chain_root": "<hex | null>",
  "expected_prev_chain_root": "<hex | null>",
  "policy_pin_hash": "<hex>",
  "created_at_claimed": "2026-02-28T12:00:00.000Z"
}
```

## Hash Formula
```
chain_root = H("UIUX_CHAIN_NODE_V1", JCS(chain_node_payload))
```

## Anti-Fork Rules (P0) — enforced client-side AND in DB trigger

### First node (no prior entries for this run+suite):
- `prev_chain_root = null`
- `expected_prev_chain_root = null`
- Both must be null — any non-null expected throws `ANTI_FORK_FAIL`

### Non-first node:
- `prev_chain_root` = DB's canonical head (`chain_root` of latest row)
- `expected_prev_chain_root` = producer's claimed prev — must match `prev_chain_root`
- Mismatch → `ANTI_FORK_FAIL: expected_prev_chain_root mismatch`

## Fork Detection
A fork is detected when `expected_prev_chain_root ≠ DB head`. This means two concurrent producers both read the same head and attempted to insert — the second insert fails.

## DB Lock
PostgreSQL advisory lock on `hash(run_id || '|' || suite)` serializes concurrent inserts within a transaction.

## Continuity Verification
For a chain of entries, verify: each `prev_chain_root` equals the prior entry's `chain_root`.

## DB Columns
- `prev_chain_root` — set by DB trigger (from DB head)
- `expected_prev_chain_root` — submitted by producer
- `chain_root` — computed by producer, verified by trigger and verifier
- `chain_node` (jsonb) — full chain node payload
- `chain_node_c14n_hash` — sha256(JCS(chain_node)) forensic field

## Implementation
`src/core/chain.ts`
- `buildChainNode(args)` → `ChainNodeResult`
- `validateAntiFork(args)` — throws on violation
- `verifyChainRoot(node, claimedRoot)` → boolean
- `verifyChainContinuity(entries)` → boolean
