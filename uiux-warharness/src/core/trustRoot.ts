/**
 * trustRoot.ts — Trust root resolution + revocation (TRUST_ROOT_SPEC@1.1)
 *
 * Three trust root types: SIGSTORE, SIGNED_KEYRING, KMS_ATTEST.
 *
 * Revocation semantics (P0):
 *   valid_from <= effective_time <= valid_to
 *   if revoked_at && revoked_at <= effective_time → FAIL (no grace window by default)
 *
 * Real implementations (Sigstore/KMS) are external dependencies.
 * This module defines the interface and stub implementations.
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type TrustRootType = "SIGSTORE" | "SIGNED_KEYRING" | "KMS_ATTEST";

export interface TrustRootResult {
  publicKeyPem: string;
  kid:          string;
  valid:        boolean;
  reason?:      string;
}

/** Key entry stored in a signed keyring or KMS metadata. */
export interface KeyEntry {
  kid:          string;
  publicKeyPem: string;
  valid_from:   string;   // RFC3339
  valid_to:     string;   // RFC3339
  revoked_at?:  string;   // RFC3339 — if present, key is revoked
  alg:          "ed25519";
}

/** Signed keyring (for SIGNED_KEYRING type) */
export interface SignedKeyring {
  spec:    "TRUST_ROOT_SPEC@1.1";
  entries: KeyEntry[];
  // keyring itself is signed; signature verification is external
}

/** Options for resolving trust roots */
export interface TrustRootResolveOpts {
  /** Allow fetching remote resources (Sigstore, KMS). Default: true */
  allowRemote?: boolean;
  /** Timeout for remote calls in ms. Default: 5000 */
  timeoutMs?:   number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Revocation check (shared logic)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Check if a key entry is valid at effectiveTime.
 * P0 rule: revoked_at present AND revoked_at <= effectiveTime → invalid (no grace).
 */
export function checkKeyValidity(
  entry: KeyEntry,
  effectiveTime: Date,
): { valid: boolean; reason?: string } {
  const effectiveMs = effectiveTime.getTime();
  const validFromMs = new Date(entry.valid_from).getTime();
  const validToMs   = new Date(entry.valid_to).getTime();

  if (effectiveMs < validFromMs) {
    return {
      valid:  false,
      reason: `TRUST_ROOT_NOT_YET_VALID: effectiveTime (${effectiveTime.toISOString()}) < valid_from (${entry.valid_from})`,
    };
  }

  if (effectiveMs > validToMs) {
    return {
      valid:  false,
      reason: `TRUST_ROOT_EXPIRED: effectiveTime (${effectiveTime.toISOString()}) > valid_to (${entry.valid_to})`,
    };
  }

  if (entry.revoked_at !== undefined) {
    const revokedMs = new Date(entry.revoked_at).getTime();
    if (revokedMs <= effectiveMs) {
      return {
        valid:  false,
        reason: `TRUST_ROOT_REVOKED: key was revoked at ${entry.revoked_at} (no grace window)`,
      };
    }
  }

  return { valid: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// Signed Keyring resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a public key from a signed keyring.
 * ref: path to keyring JSON file (in-process or from env).
 */
export async function resolveFromSignedKeyring(
  kid: string,
  keyring: SignedKeyring,
  effectiveTime: Date,
): Promise<TrustRootResult> {
  const entry = keyring.entries.find((e) => e.kid === kid);
  if (!entry) {
    return {
      publicKeyPem: "",
      kid,
      valid:        false,
      reason:       `TRUST_ROOT_NOT_FOUND: kid "${kid}" not in signed keyring`,
    };
  }

  const { valid, reason } = checkKeyValidity(entry, effectiveTime);
  return {
    publicKeyPem: valid ? entry.publicKeyPem : "",
    kid,
    valid,
    ...(reason !== undefined ? { reason } : {}),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sigstore resolver stub
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a public key via Sigstore (STUB).
 * Real implementation delegates to @sigstore/verify or sigstore/sigstore SDK.
 *
 * @param kid         Key identifier (e.g. Sigstore bundle cert fingerprint)
 * @param ref         Sigstore bundle URL or bundle JSON
 * @param effectiveTime Effective time for revocation check
 */
export async function resolveFromSigstore(
  kid: string,
  ref: string,
  effectiveTime: Date,
): Promise<TrustRootResult> {
  // STUB: production implementation fetches Sigstore TUF metadata and verifies bundle
  void ref;
  void effectiveTime;
  return {
    publicKeyPem: "",
    kid,
    valid:        false,
    reason:       `TRUST_ROOT_SIGSTORE_STUB: Sigstore resolution not implemented (kid=${kid})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// KMS resolver stub
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a public key via KMS attestation (STUB).
 * Real implementation calls AWS KMS GetPublicKey or GCP KMS GetPublicKey.
 *
 * @param kid           Key ARN or resource name
 * @param ref           KMS reference string (ARN, resource name, etc.)
 * @param effectiveTime Effective time for revocation check
 */
export async function resolveFromKmsAttest(
  kid: string,
  ref: string,
  effectiveTime: Date,
): Promise<TrustRootResult> {
  // STUB: production implementation calls KMS API and validates attestation document
  void ref;
  void effectiveTime;
  return {
    publicKeyPem: "",
    kid,
    valid:        false,
    reason:       `TRUST_ROOT_KMS_STUB: KMS attestation not implemented (kid=${kid})`,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main resolver
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Resolve a public key by kid, type, and ref.
 * Dispatches to the appropriate trust root backend.
 *
 * @param kid           Key identifier
 * @param type          Trust root type
 * @param ref           Backend-specific reference (keyring JSON, Sigstore bundle URL, KMS ARN)
 * @param effectiveTime Effective time for revocation / validity check (TIME_MODEL_SPEC@1.1)
 */
export async function resolvePublicKey(
  kid: string,
  type: TrustRootType,
  ref: string,
  effectiveTime: Date,
): Promise<TrustRootResult> {
  switch (type) {
    case "SIGNED_KEYRING": {
      // ref is expected to be JSON string of SignedKeyring
      let keyring: SignedKeyring;
      try {
        keyring = JSON.parse(ref) as SignedKeyring;
      } catch {
        return {
          publicKeyPem: "",
          kid,
          valid:        false,
          reason:       "TRUST_ROOT_PARSE_ERROR: ref is not valid SignedKeyring JSON",
        };
      }
      return resolveFromSignedKeyring(kid, keyring, effectiveTime);
    }

    case "SIGSTORE":
      return resolveFromSigstore(kid, ref, effectiveTime);

    case "KMS_ATTEST":
      return resolveFromKmsAttest(kid, ref, effectiveTime);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// In-memory keyring (for testing / CI bootstrap)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an in-memory keyring from a list of key entries.
 * Used for test vectors and CI bootstrap with WAR_PRODUCER_PRIVKEY_PEM.
 */
export function buildInMemoryKeyring(entries: KeyEntry[]): SignedKeyring {
  return { spec: "TRUST_ROOT_SPEC@1.1", entries };
}
