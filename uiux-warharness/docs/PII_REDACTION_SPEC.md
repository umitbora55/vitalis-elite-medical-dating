# PII_REDACTION_SPEC@1.0

## Purpose
Defines PII/KVKK redaction requirements for artifacts before evidence is committed. Turkish KVKK (Personal Data Protection Law) compliance — equivalent to GDPR. Redaction must be "full" before any production evidence write.

## Redaction States

| State | Meaning | Production allowed? |
|-------|---------|---------------------|
| `none` | No redaction applied | No — P0 fail |
| `partial` | Some files redacted | No — P0 fail |
| `full` | All files redacted | Yes |

## P0 Rule
```typescript
assertP0RedactionComplete(state: RedactionState): void
// Throws if state !== "full"
```

## Default PII Patterns (KVKK + General)

| Pattern Name | Description |
|-------------|-------------|
| `TC_KIMLIK` | Turkish National ID (11-digit) |
| `EMAIL` | Email addresses |
| `PHONE_TR` | Turkish mobile phone numbers |
| `IBAN_TR` | Turkish IBAN |
| `CREDIT_CARD` | Visa/Mastercard/Amex |
| `JWT_TOKEN` | JWT tokens (3-part Base64url) |
| `SUPABASE_KEY` | Supabase anon/service keys |
| `BEARER_TOKEN` | HTTP Bearer tokens |

## RedactionReport Shape
```typescript
interface RedactionReport {
  spec:               "PII_REDACTION_SPEC@1.0";
  run_id:             string;
  suite:              string;
  redaction_state:    RedactionState;
  patterns_applied:   string[];
  files_processed:    number;
  pii_found:          boolean;
  redaction_time_ms:  number;
}
```

## Hash Formula
```
redaction_report_hash = H("UIUX_REDACTION_REPORT_V1", JCS(report))
```

The hash is committed in the `signed_root_payload` before producer signing — any PII state change invalidates the signature.

## Redaction Scope
- Playwright screenshots (PNG): metadata stripped; pixel data redacted if PII detected
- Playwright reports (JSON): PII patterns replaced with `[REDACTED]`
- Traces, logs: fully processed

## Implementation
`src/core/piiRedaction.ts`
- `computeRedactionReportHash(report)` → hex
- `assertP0RedactionComplete(state)` — throws if not "full"
- `buildRedactionReport(args)` → `{ report, reportHash }`
- `computeRedactionState(args)` → `RedactionState`
- `DEFAULT_PII_PATTERNS` — 8 built-in patterns
