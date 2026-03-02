# NOTARIZATION_SPEC@1.0

## Purpose
Defines external timestamp notarization for the anchor, providing a legally defensible, third-party-verified timestamp. Required for RC releases (`notarization_policy.required_for_rc = true`).

## Modes

| Mode | Protocol | Standard |
|------|----------|----------|
| `NOTARIZATION_MODE_TSA` | RFC 3161 Time-Stamp Authority | RFC 3161 (ITU-T X.509) |
| `NOTARIZATION_MODE_TLOG` | Transparency log | Sigstore Rekor, similar |

## Flow

### MODE_TSA (RFC 3161)
1. Producer/anchor writer hashes `anchor_content_hash`
2. Sends `TimeStampRequest` to TSA endpoint
3. TSA returns `TimeStampResponse` containing `TimeStampToken`
4. `token_hash = H("UIUX_NOTARIZATION_TOKEN_V1", raw_token_bytes)`
5. Token stored in DB; `ref` = TSA server URL + serial number

### MODE_TLOG (Transparency Log)
1. Submits `anchor_content_hash` to tlog (Rekor) as a hashedrekord entry
2. tlog returns an inclusion proof + entry UUID
3. `token_hash = H("UIUX_NOTARIZATION_TOKEN_V1", utf8(entry_uuid))`
4. `ref` = tlog URL + entry UUID

## NotarizationResult
```typescript
interface NotarizationResult {
  mode:       NotarizationMode;
  tokenHash:  string;    // hex
  ref:        string;    // opaque reference
  verifiedAt: string;    // RFC3339
  ok:         boolean;
  reason?:    string;
}
```

## Anchor Integration
Notarization metadata is embedded in `AnchorPayload`:
```json
{
  "notarization": {
    "mode": "NOTARIZATION_MODE_TSA",
    "token_hash": "<hex>",
    "ref": "https://tsa.example.com/ts?serial=123"
  }
}
```

## DB Columns (uiux_anchors)
- `notarization_mode` — nullable text
- `notarization_ref` — nullable text
- `notarization_token_hash` — nullable text

## Effective Time
If notarization succeeds: `notarized_at` replaces `ingested_at` as `effective_time` for trust root revocation checks (TIME_MODEL_SPEC@1.1).

## Implementation
`src/core/notarization.ts`
- `submitNotarization(anchorContentHash, mode, opts)` → `Promise<NotarizationResult>` (stub)
- `verifyNotarizationToken(tokenB64, expectedHash)` → boolean (stub)
- `computeTokenHash(rawTokenBytes)` → hex
