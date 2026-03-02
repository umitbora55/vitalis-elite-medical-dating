# STORAGE_IMMUTABILITY_SPEC@1.0

## Purpose
Defines requirements for immutable, content-addressed artifact storage. Ensures evidence artifacts cannot be silently overwritten or deleted after upload.

## Storage Modes

| Mode | Description | Backend Examples |
|------|-------------|-----------------|
| `MODE_A` | WORM / S3 Object Lock | AWS S3 with Object Lock, GCS with retention |
| `MODE_B` | Append-only (no overwrite in-process) | Supabase Storage, in-memory test client |
| `MODE_C` | Hash-verified (signed hash registry) | Custom registry with signed manifest |

## Content-Addressed Path
```
path = /objects/sha256/<hex_hash>
```

The path is derived from content — never from a caller-supplied name. This prevents path collision attacks.

## StorageClient Interface
```typescript
interface StorageClient {
  // Throws 409 if hash already exists (overwrite blocked)
  put(hash: string, bytes: Buffer): Promise<StorageObject>

  // Verifies hash on read; throws STORAGE_CORRUPTION if mismatch
  get(hash: string): Promise<Buffer>

  // Checks immutability guarantee for a given hash
  verifyImmutability(hash: string): Promise<ImmutabilityCheck>
}
```

## Overwrite Protection
- `put()` MUST check if object exists before upload
- If exists: throw `STORAGE_OVERWRITE_BLOCKED`
- Backend must enforce at the storage level (Object Lock, append-only policy)

## Hash Verification on Read
- `get()` always verifies: `sha256(downloaded_bytes) == claimed_hash`
- Mismatch → throw `STORAGE_CORRUPTION`

## StorageObject Shape
```typescript
interface StorageObject {
  objHash:    string;  // hex sha256
  path:       string;  // /objects/sha256/<hex>
  bytes:      number;  // byte count
  uploadedAt: string;  // RFC3339
}
```

## Integration with Verifier
`storage_immutability_ok` in verification checks: verifier calls `verifyImmutability(artifactIndexHash)` and records result.

## Implementation
`src/core/storage.ts`
- `contentAddressedPath(hash)` → `/objects/sha256/<hex>`
- `BaseStorageClient` — abstract base; subclass for S3/GCS
- `InMemoryStorageClient` — MODE_B, for testing
