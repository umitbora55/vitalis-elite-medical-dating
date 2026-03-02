/**
 * signatures.ts  — FINAL++++
 *
 * Ed25519 sign / verify helpers for producer evidence signing.
 *
 * Flow:
 *   1. Producer builds signed_root locally via anchors.buildSignedRoot()
 *   2. Producer signs signed_root with their Ed25519 private key → sigB64
 *   3. Evidence insert carries { signed_root, producer_sig: sigB64, producer_alg: "ed25519", ... }
 *   4. DB trigger verifies signed_root formula (recomputes and compares)
 *      — does NOT verify the Ed25519 sig (no public key in DB)
 *   5. Gate script (parse_outcome.mjs) fetches the row, recomputes signed_root,
 *      and verifies the Ed25519 sig with WAR_PRODUCER_PUBKEY_PEM
 *
 * Key management:
 *   - Private key: env WAR_PRODUCER_PRIVKEY_PEM (CI secret, never in repo)
 *   - Public key:  env WAR_PRODUCER_PUBKEY_PEM  (safe to store; used by gate)
 *   - kid:         env WAR_PRODUCER_KID          (opaque string; e.g. git SHA of key)
 *
 * Upgrading to KMS / Sigstore / OIDC:
 *   Replace signPayloadEd25519 / verifyPayloadEd25519 with your KMS SDK calls.
 *   The ProducerSignature shape stays the same; alg changes to e.g. "ecdsa-p256".
 */

import { sign, verify } from "crypto";

export type SupportedAlg = "ed25519";

export interface ProducerSignature {
  alg: SupportedAlg;
  kid: string;
  /** Base64-encoded Ed25519 signature over the signed_root string (UTF-8). */
  sigB64: string;
  /** Arbitrary attestation metadata (issuer, subject, CI run id, …). */
  claims: Record<string, unknown>;
}

/**
 * Sign a payload string with an Ed25519 private key.
 *
 * @param payloadText  - The exact string to sign (in practice: the signed_root hex string).
 * @param privateKeyPem - PEM-encoded Ed25519 private key.
 * @param kid           - Key identifier (stored alongside the signature).
 * @param claims        - Attestation metadata included in the evidence row.
 */
export function signPayloadEd25519(args: {
  payloadText: string;
  privateKeyPem: string;
  kid: string;
  claims: Record<string, unknown>;
}): ProducerSignature {
  const sig = sign(null, Buffer.from(args.payloadText, "utf8"), args.privateKeyPem);
  return {
    alg: "ed25519",
    kid: args.kid,
    sigB64: sig.toString("base64"),
    claims: args.claims,
  };
}

/**
 * Verify an Ed25519 signature over a payload string.
 * Returns true if the signature is valid; false otherwise.
 *
 * @param payloadText  - The exact string that was signed (signed_root hex).
 * @param sigB64        - Base64-encoded signature from ProducerSignature.sigB64.
 * @param publicKeyPem  - PEM-encoded Ed25519 public key.
 */
export function verifyPayloadEd25519(args: {
  payloadText: string;
  sigB64: string;
  publicKeyPem: string;
}): boolean {
  try {
    return verify(
      null,
      Buffer.from(args.payloadText, "utf8"),
      args.publicKeyPem,
      Buffer.from(args.sigB64, "base64"),
    );
  } catch {
    // Invalid key format, corrupted sig, etc. → treat as failed verify.
    return false;
  }
}
