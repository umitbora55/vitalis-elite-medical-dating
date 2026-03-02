/**
 * artifactNormalize.ts — ARTIFACT_NORMALIZATION_SPEC@1.0
 *
 * Purpose: bitwise stability for P0 determinism.
 *
 * Format rules:
 *   JSON → JCS canonical bytes                  alg: "JSON_JCS_V1"
 *   PNG  → strip metadata/ancillary chunks      alg: "PNG_STRIP_META_V1"
 *          (tEXt / zTXt / iTXt / time / etc.)
 *   HTML → P0: excluded from index (not normalized)
 *   ZIP/TRACE → P0: forbidden (throws)
 *   Other → pass-through with "PASSTHROUGH_V1" (P1 only)
 *
 * Implementation note:
 *   PNG chunk stripping is done manually (no external deps required at runtime).
 *   The `sharp` library is an optional alternative; prefer the manual approach
 *   for determinism across versions.
 */

import { jcs, sha256Hex, c14nHash } from "./canonicalJson.js";
import { createHash } from "crypto";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export const NORMALIZATION_SPEC = "ARTIFACT_NORMALIZATION_SPEC@1.0";

export type NormAlg =
  | "JSON_JCS_V1"
  | "PNG_STRIP_META_V1"
  | "PASSTHROUGH_V1";   // P1 only; not valid for P0 suites

export interface NormResult {
  bytes:   Buffer;      // normalized bytes
  sha256:  string;      // hex sha256 of normalized bytes
  byteLen: number;
  norm: {
    spec: typeof NORMALIZATION_SPEC;
    alg:  NormAlg;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// JSON normalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize a JSON file: parse → JCS → UTF-8 bytes.
 * Throws on invalid JSON.
 */
export function normalizeJson(rawBytes: Buffer): NormResult {
  const parsed: unknown = JSON.parse(rawBytes.toString("utf-8"));
  const normalized = jcs(parsed);
  return {
    bytes:   normalized,
    sha256:  sha256Hex(normalized),
    byteLen: normalized.length,
    norm:    { spec: NORMALIZATION_SPEC, alg: "JSON_JCS_V1" },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// PNG normalization (chunk stripping)
// ─────────────────────────────────────────────────────────────────────────────

// PNG signature: 8 bytes
const PNG_SIG = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

// Ancillary chunks to remove (all non-critical metadata)
// Critical chunks: IHDR, PLTE, IDAT, IEND — keep all others listed here
const STRIP_CHUNK_TYPES = new Set([
  "tEXt", "zTXt", "iTXt",   // text metadata
  "tIME",                     // modification time
  "bKGD",                     // background colour
  "gAMA",                     // gamma (optional)
  "cHRM",                     // chromaticities
  "sRGB",                     // sRGB colourspace
  "iCCP",                     // ICC profile
  "sBIT",                     // significant bits
  "hIST",                     // colour histogram
  "pHYs",                     // physical pixel dimensions
  "sPLT",                     // suggested palette
  "oFFs",                     // image offset
  "pCAL",                     // pixel calibration
  "sCAL",                     // physical scale
  "vpAg",                     // virtual page
  "caNv",                     // canvas
  "mkBT", "mkBS", "mkTS",    // Fireworks metadata
  "exIf",                     // EXIF (if present as chunk)
]);

/**
 * Strip metadata/ancillary chunks from a PNG buffer.
 * Returns a new buffer containing only critical chunks: IHDR, PLTE, IDAT, IEND.
 */
export function normalizePng(rawBytes: Buffer): NormResult {
  // Validate PNG signature
  if (rawBytes.length < 8 || !rawBytes.subarray(0, 8).equals(PNG_SIG)) {
    throw new Error("PNG_NORM: invalid PNG signature");
  }

  const chunks: Buffer[] = [PNG_SIG];
  let offset = 8;

  while (offset < rawBytes.length) {
    if (offset + 12 > rawBytes.length) {
      throw new Error("PNG_NORM: truncated chunk header");
    }

    const dataLen  = rawBytes.readUInt32BE(offset);
    const typeBytes = rawBytes.subarray(offset + 4, offset + 8);
    const chunkType = typeBytes.toString("ascii");
    const totalLen  = 4 + 4 + dataLen + 4; // length + type + data + crc

    if (offset + totalLen > rawBytes.length) {
      throw new Error(`PNG_NORM: chunk ${chunkType} exceeds buffer`);
    }

    // Keep chunk unless it's in the strip list
    if (!STRIP_CHUNK_TYPES.has(chunkType)) {
      chunks.push(rawBytes.subarray(offset, offset + totalLen));
    }

    offset += totalLen;
    if (chunkType === "IEND") break;
  }

  const normalized = Buffer.concat(chunks);
  return {
    bytes:   normalized,
    sha256:  sha256Hex(normalized),
    byteLen: normalized.length,
    norm:    { spec: NORMALIZATION_SPEC, alg: "PNG_STRIP_META_V1" },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Dispatch
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize an artifact based on its extension.
 *   .json → JSON_JCS_V1
 *   .png  → PNG_STRIP_META_V1
 *   .html → P0 forbidden (throw); use isP0 = false for P1
 *   .zip, .trace → P0 forbidden (always)
 *
 * @param isP0Suite  If true, apply strict P0 rules (HTML forbidden, etc.)
 */
export function normalizeArtifact(
  rawBytes:  Buffer,
  filename:  string,
  isP0Suite = true,
): NormResult {
  const lower = filename.toLowerCase();

  if (lower.endsWith(".json")) {
    return normalizeJson(rawBytes);
  }

  if (lower.endsWith(".png")) {
    return normalizePng(rawBytes);
  }

  if (lower.endsWith(".zip") || lower.endsWith(".trace")) {
    throw new Error(
      `NORM_FAIL P0: format .zip/.trace is forbidden in P0 suites: ${filename}`,
    );
  }

  if (lower.endsWith(".html") || lower.endsWith(".htm")) {
    if (isP0Suite) {
      throw new Error(
        `NORM_FAIL P0: HTML artifacts are excluded from P0 index: ${filename}`,
      );
    }
    // P1: pass-through
  }

  // Pass-through for P1 ops
  if (isP0Suite) {
    throw new Error(
      `NORM_FAIL P0: unsupported/non-deterministic artifact format: ${filename}`,
    );
  }
  return {
    bytes:   rawBytes,
    sha256:  sha256Hex(rawBytes),
    byteLen: rawBytes.length,
    norm:    { spec: NORMALIZATION_SPEC, alg: "PASSTHROUGH_V1" },
  };
}
