# AUDIT_ROOT_SPEC@6.4

## Purpose
Defines the Merkle tree structure used to compute the `audit_root_hash` — a single cryptographic commitment to all normalized artifacts in a run. Enables efficient subset proofs and tamper detection.

## Merkle Construction

### Step 1: Sort
Leaves are sorted lexicographically by path using UTF-8 byte order (not locale-specific):
```
sorted = leaves.sort((a, b) => Buffer.compare(utf8(a.path), utf8(b.path)))
```

### Step 2: Compute leaf hashes
```
leaf_hash = H("UIUX_MERKLE_LEAF_V1", JCS(leaf_payload))
```

### Step 3: Build tree
- If leaf count is odd: duplicate the last leaf (standard padding)
- Parent nodes: `H("UIUX_MERKLE_NODE_V1", left_hash_bytes || right_hash_bytes)`
  - The 64-byte concatenation of raw 32-byte hashes is the input
  - Domain tag separates parent from leaf hashes

### Step 4: audit_root_hash
Top-level Merkle root as hex string.

## Hash Formulas
```
leaf_hash   = H("UIUX_MERKLE_LEAF_V1",  JCS(leaf_payload))
parent_hash = H("UIUX_MERKLE_NODE_V1",  left_bytes || right_bytes)
audit_root  = top-level parent_hash (hex)
```

## LeafPayload
```typescript
interface LeafPayload {
  path:   string;  // canonical path
  sha256: string;  // hex SHA-256 of normalized bytes
  bytes:  number;  // byte count
  norm:   { spec: string; alg: string }
}
```

## DB Column
`war_evidence.uiux_artifacts.audit_root_hash` — NOT NULL

## Security Properties
- Duplicate path detection: throws `auditRoot: duplicate path in leaf set`
- Empty set rejection: throws `auditRoot: leaf set must not be empty`
- Domain separation prevents leaf/node hash collision
- Byte-order sort ensures determinism across locales

## Implementation
`src/core/auditRoot.ts`
- `computeAuditRootHash(leaves)` → hex
- `verifyAuditRootHash(leaves, claimedHash)` → boolean
