/**
 * signatures.ts — Ed25519 producer / verifier signing (FINAL v6.4)
 *
 * Producer signs: signed_root_hash (hex bytes, UTF-8)
 * Verifier signs: verification_root (hex bytes, UTF-8)
 *
 * Neither key ever touches the DB. Public keys are resolved via trust root
 * (Sigstore / Signed keyring / KMS attestation — see trustRoot.ts).
 *
 * Key management:
 *   Private key: env WAR_PRODUCER_PRIVKEY_PEM  or  WAR_VERIFIER_PRIVKEY_PEM
 *   Public key:  resolved at verify time from trust root (not from DB)
 *   kid:         opaque key identifier stored in DB for observability only
 *
 * To upgrade to KMS / Sigstore / OIDC:
 *   Replace signEd25519 / verifyEd25519 with KMS SDK calls.
 *   The SignatureResult shape is stable; change alg field accordingly.
 */

import { sign, verify } from "crypto";

export type SupportedAlg = "ed25519";

export interface SignatureResult {
  /** Algorithm identifier. */
  alg:    SupportedAlg;
  /** Key identifier (stored for observability; trust root resolves pubkey by kid). */
  kid:    string;
  /** Base64-encoded Ed25519 signature over the payload (UTF-8 string). */
  sigB64: string;
  /** Attestation / provenance metadata stored alongside signature. */
  claims: Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Sign
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Sign a payload string (typically the signed_root_hash hex string) with Ed25519.
 *
 * @param payloadText   Exact UTF-8 string to sign.
 * @param privateKeyPem PEM-encoded Ed25519 private key (env-provided; never in repo).
 * @param kid           Key identifier.
 * @param claims        Attestation metadata (issuer, subject, ci_run_id, …).
 */
export function signEd25519(args: {
  payloadText:    string;
  privateKeyPem:  string;
  kid:            string;
  claims:         Record<string, unknown>;
}): SignatureResult {
  const sig = sign(
    null,                                        // Ed25519: hash algorithm = null
    Buffer.from(args.payloadText, "utf-8"),
    args.privateKeyPem,
  );
  return {
    alg:    "ed25519",
    kid:    args.kid,
    sigB64: sig.toString("base64"),
    claims: args.claims,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Verify
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Verify an Ed25519 signature over a payload string.
 * Returns true if valid; false on any failure (invalid key, corrupted sig, etc.).
 *
 * @param payloadText  Exact UTF-8 string that was signed.
 * @param sigB64       Base64-encoded signature from SignatureResult.sigB64.
 * @param publicKeyPem PEM-encoded Ed25519 public key (resolved from trust root).
 */
export function verifyEd25519(args: {
  payloadText:   string;
  sigB64:        string;
  publicKeyPem:  string;
}): boolean {
  try {
    return verify(
      null,
      Buffer.from(args.payloadText, "utf-8"),
      args.publicKeyPem,
      Buffer.from(args.sigB64, "base64"),
    );
  } catch {
    return false;
  }
}
