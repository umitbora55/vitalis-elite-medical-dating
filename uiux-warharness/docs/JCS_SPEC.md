# JCS_SPEC — JSON Canonicalization Scheme (RFC 8785)

## Purpose

All cryptographic hashes over JSON structures use JCS (JSON Canonicalization Scheme, RFC 8785) to ensure bitwise stability across platforms, languages, and JSON serializer implementations.

**Critical rule:** String concatenation of JSON fields is **FORBIDDEN**. All multi-field payloads MUST be hashed via `H(tag, JCS(payload))`.

---

## JCS Rules (RFC 8785)

### 1. Key Ordering

Object keys are sorted by **Unicode code point** (UTF-16 code unit order, ascending). Nested objects are also sorted recursively.

```json
// Input: { "z": 1, "a": 2 }
// JCS:   {"a":2,"z":1}
```

### 2. Number Serialization

- Integers: serialized as-is (e.g., `42`, `-7`).
- Floats: IEEE 754 double precision, shortest representation that round-trips.
- `NaN` and `Infinity` are **forbidden** (throw `JCS_INVALID_NUMBER`).

### 3. String Escaping

Standard JSON escaping:
- `\n`, `\r`, `\t`, `\\`, `\"` for control characters.
- Unicode escapes for U+0000–U+001F.
- No unnecessary escaping of printable ASCII.

### 4. No Whitespace

JCS output contains **no whitespace** between tokens (no spaces, no newlines, no indentation).

### 5. Encoding

Output is **UTF-8 bytes**. The `jcs()` function returns a `Buffer` (Node.js). `jcsString()` returns a `string`.

---

## Implementation

```typescript
import { jcs, jcsString, H, hJcsHex } from "./canonicalJson.js";

// Get JCS bytes
const bytes: Buffer = jcs({ b: 2, a: 1 });
// → Buffer<{"a":1,"b":2}>

// Get JCS string
const str: string = jcsString({ b: 2, a: 1 });
// → '{"a":1,"b":2}'

// Domain-separated hash over JCS
const hash: string = hJcsHex("UIUX_CHAIN_NODE_V1", payload);
// → 64-char hex
```

---

## Test Vectors

| Input | JCS Output |
|-------|-----------|
| `null` | `"null"` |
| `0` | `"0"` |
| `{"b":2,"a":1}` | `{"a":1,"b":2}` |
| `{"z":{"y":1,"x":2},"a":0}` | `{"a":0,"z":{"x":2,"y":1}}` |
| `{"k":"hello\nworld"}` | `{"k":"hello\\nworld"}` |
| `NaN` | throws `JCS_INVALID_NUMBER` |
| `Infinity` | throws `JCS_INVALID_NUMBER` |

---

## Why Not `JSON.stringify`?

Standard `JSON.stringify` does NOT guarantee key ordering. Two calls with the same logical object but different insertion orders can produce different byte strings. JCS normalizes this by always sorting keys, making the output deterministic regardless of object construction order.

---

## Spec Version

This harness implements **RFC 8785** (JCS v1). No external dependencies are required — the implementation in `canonicalJson.ts` is self-contained.
