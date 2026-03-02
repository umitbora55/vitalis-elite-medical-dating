# ANCHOR_SPEC@6.4

## Purpose

External anchor provides a time-ordered, append-only record of all quorum-approved evidence runs. An anchor row ties the `signed_root_hash` of a completed evidence record to an external notarization timestamp, producing a forensic chain that survives DB compromise.

---

## Schema Location

```
war_anchor.uiux_anchors
```

**Unique constraint:** `(run_id, suite)` — one anchor per run per suite.

---

## Anchor Content Hash

```
anchor_content_hash = H("UIUX_ANCHOR_CONTENT_V1", JCS(content_payload))
```

`content_payload` structure:

```json
{
  "spec":             "ANCHOR_SPEC@6.4",
  "run_id":           "<run_id>",
  "suite":            "<suite>",
  "artifact_hash":    "<hex>",
  "signed_root_hash": "<hex>",
  "chain_root":       "<hex>",
  "policy_pin_hash":  "<hex>",
  "quorum_verifier_ids": ["<verifier_a>", "<verifier_b>"],
  "created_at":       "<RFC3339>"
}
```

---

## Anchor Pointer Hash

```
anchor_pointer_hash = H("UIUX_ANCHOR_POINTER_V1", JCS(pointer_payload))
```

`pointer_payload` structure:

```json
{
  "spec":                 "ANCHOR_SPEC@6.4",
  "anchor_content_hash":  "<hex>",
  "notarization_ref":     "<string>",
  "notarized_at":         "<RFC3339>"
}
```

---

## Anchor Set Hash

```
anchor_set_hash = H("UIUX_ANCHOR_SET_V1", JCS(set_payload))
```

`set_payload` structure:

```json
{
  "spec":                 "ANCHOR_SPEC@6.4",
  "anchor_content_hash":  "<hex>",
  "anchor_pointer_hash":  "<hex>",
  "anchor_set_hash":      null
}
```

> The `anchor_set_hash` field in the input is always `null`; the hash is computed over the struct with that null value, then stored separately.

---

## Lifecycle

1. **Producer** submits evidence → DB trigger assigns `artifact_hash`, `chain_root`.
2. **Verifier-A** verifies and signs → inserts row in `war_verify.uiux_verifications`.
3. **Verifier-B** verifies and signs → inserts second row.
4. **`checkQuorum()`** confirms 2/2 verifiers passed.
5. **`writeAnchor()`** computes `anchor_content_hash`, `anchor_pointer_hash`, `anchor_set_hash` and inserts into `war_anchor.uiux_anchors`.
6. **Notarization** stores `notarization_ref` and `notarized_at` on the anchor row.

---

## P0 Rules

- Anchor MUST NOT be written until quorum is confirmed (P0).
- `notarization_ref` is **required** for RC gate (NOTARIZATION_SPEC@1.0).
- Anchor row is **append-only** — UPDATE/DELETE blocked by DB trigger.
- `anchor_content_hash` MUST match re-computation over `content_payload`.

---

## Immutability

The `war_anchor` schema has the same UPDATE/DELETE trigger protection as `war_evidence` and `war_verify`. Once written, anchor rows are permanent.
