/**
 * storage.ts — STORAGE_IMMUTABILITY_SPEC@1.0
 *
 * Content-addressed object storage with immutability enforcement.
 * Three modes: MODE_A (WORM/Object Lock), MODE_B (append-only), MODE_C (signed hash).
 *
 * Real implementations (S3/GCS) are external — provide base class only.
 */

import { sha256Hex } from "./canonicalJson.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type StorageMode = "MODE_A" | "MODE_B" | "MODE_C";

export interface StorageObject {
  objHash:    string;   // hex sha256 of content
  path:       string;   // content-addressed path: /objects/sha256/<hex>
  bytes:      number;   // byte count
  uploadedAt: string;   // RFC3339
}

export interface ImmutabilityCheck {
  ok:     boolean;
  mode:   StorageMode;
  reason?: string;
}

export interface StorageClient {
  /**
   * Put an object. Throws 409-like error if content already exists (overwrite blocked).
   * Content-addressed: path is derived from hash, not supplied externally.
   */
  put(hash: string, bytes: Buffer): Promise<StorageObject>;

  /**
   * Get an object by hash. Throws if not found.
   */
  get(hash: string): Promise<Buffer>;

  /**
   * Verify that an object is immutable (cannot be overwritten or deleted).
   */
  verifyImmutability(hash: string): Promise<ImmutabilityCheck>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Content-addressed path
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the canonical content-addressed path for a hash.
 * Returns "/objects/sha256/<hex>" — used as the storage key.
 */
export function contentAddressedPath(hash: string): string {
  return `/objects/sha256/${hash}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Base class (override in production)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Abstract base StorageClient.
 * Subclass this with real S3/GCS implementations.
 *
 * Provides:
 *   - hash validation
 *   - content-addressed path derivation
 *   - overwrite detection (via existsCheck)
 */
export abstract class BaseStorageClient implements StorageClient {
  readonly mode: StorageMode;

  constructor(mode: StorageMode) {
    this.mode = mode;
  }

  /**
   * Check if an object exists. Subclass must implement.
   */
  protected abstract exists(hash: string): Promise<boolean>;

  /**
   * Upload raw bytes. Subclass must implement.
   * @throws Error if overwrite would occur (409 semantics)
   */
  protected abstract upload(path: string, bytes: Buffer): Promise<{ uploadedAt: string }>;

  /**
   * Download raw bytes. Subclass must implement.
   */
  protected abstract download(path: string): Promise<Buffer>;

  /**
   * Check backend immutability guarantee. Subclass must implement.
   */
  protected abstract checkImmutability(hash: string): Promise<ImmutabilityCheck>;

  async put(hash: string, bytes: Buffer): Promise<StorageObject> {
    // Validate content hash
    const actualHash = sha256Hex(bytes);
    if (actualHash !== hash) {
      throw new Error(
        `STORAGE_HASH_MISMATCH: provided hash ${hash} !== computed hash ${actualHash}`,
      );
    }

    const path = contentAddressedPath(hash);

    // Overwrite protection: throw 409 if exists
    const alreadyExists = await this.exists(hash);
    if (alreadyExists) {
      throw new Error(
        `STORAGE_OVERWRITE_BLOCKED: object ${path} already exists (STORAGE_IMMUTABILITY_SPEC@1.0)`,
      );
    }

    const { uploadedAt } = await this.upload(path, bytes);

    return {
      objHash:    hash,
      path,
      bytes:      bytes.length,
      uploadedAt,
    };
  }

  async get(hash: string): Promise<Buffer> {
    const path = contentAddressedPath(hash);
    const bytes = await this.download(path);

    // Verify on read
    const actualHash = sha256Hex(bytes);
    if (actualHash !== hash) {
      throw new Error(
        `STORAGE_CORRUPTION: object ${path} hash mismatch on read — expected ${hash}, got ${actualHash}`,
      );
    }

    return bytes;
  }

  async verifyImmutability(hash: string): Promise<ImmutabilityCheck> {
    return this.checkImmutability(hash);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory storage (for testing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * In-memory StorageClient for testing.
 * Uses MODE_B (append-only: no overwrite, no delete in-process).
 */
export class InMemoryStorageClient extends BaseStorageClient {
  private readonly store = new Map<string, Buffer>();

  constructor() {
    super("MODE_B");
  }

  protected async exists(hash: string): Promise<boolean> {
    return this.store.has(hash);
  }

  protected async upload(path: string, bytes: Buffer): Promise<{ uploadedAt: string }> {
    // Extract hash from path
    const hash = path.replace("/objects/sha256/", "");
    this.store.set(hash, Buffer.from(bytes));
    return { uploadedAt: new Date().toISOString() };
  }

  protected async download(path: string): Promise<Buffer> {
    const hash = path.replace("/objects/sha256/", "");
    const stored = this.store.get(hash);
    if (!stored) {
      throw new Error(`STORAGE_NOT_FOUND: object ${path} does not exist`);
    }
    return stored;
  }

  protected async checkImmutability(hash: string): Promise<ImmutabilityCheck> {
    const exists = this.store.has(hash);
    return {
      ok:   exists,
      mode: this.mode,
      ...(exists ? {} : { reason: `STORAGE_NOT_FOUND: ${hash}` }),
    };
  }
}
