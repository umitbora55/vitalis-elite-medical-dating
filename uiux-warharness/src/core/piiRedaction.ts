/**
 * piiRedaction.ts — PII/KVKK redaction (PII_REDACTION_SPEC@1.0)
 *
 * Manages PII redaction state tracking and report generation.
 * P0: redaction must be "full" before evidence is written for production runs.
 */

import { hJcsHex, TAGS } from "./canonicalJson.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export type RedactionState = "none" | "partial" | "full";

export interface RedactionReport {
  readonly spec:               "PII_REDACTION_SPEC@1.0";
  readonly run_id:             string;
  readonly suite:              string;
  readonly redaction_state:    RedactionState;
  readonly patterns_applied:   string[];
  readonly files_processed:    number;
  readonly pii_found:          boolean;
  readonly redaction_time_ms:  number;
}

export interface RedactionPattern {
  name:    string;
  /** Regex pattern source (for documentation; actual redaction uses pattern) */
  pattern: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in PII patterns (KVKK + general)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Default PII redaction patterns for KVKK compliance.
 * These are documentation-level patterns; actual redaction uses regex.
 */
export const DEFAULT_PII_PATTERNS: RedactionPattern[] = [
  { name: "TC_KIMLIK",        pattern: "\\b[1-9][0-9]{10}\\b" },
  { name: "EMAIL",            pattern: "[a-zA-Z0-9._%+\\-]+@[a-zA-Z0-9.\\-]+\\.[a-zA-Z]{2,}" },
  { name: "PHONE_TR",         pattern: "(\\+?90|0)?[ \\-]?5[0-9]{2}[ \\-]?[0-9]{3}[ \\-]?[0-9]{2}[ \\-]?[0-9]{2}" },
  { name: "IBAN_TR",          pattern: "TR[0-9]{2}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{4}[ ]?[0-9]{2}" },
  { name: "CREDIT_CARD",      pattern: "\\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13})\\b" },
  { name: "JWT_TOKEN",        pattern: "eyJ[A-Za-z0-9_-]+\\.eyJ[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+" },
  { name: "SUPABASE_KEY",     pattern: "eyJ[A-Za-z0-9_-]{50,}\\.[A-Za-z0-9_-]{50,}\\.[A-Za-z0-9_-]+" },
  { name: "BEARER_TOKEN",     pattern: "Bearer [A-Za-z0-9\\-._~+/]+=*" },
];

// ─────────────────────────────────────────────────────────────────────────────
// Hash computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute redaction_report_hash = H("UIUX_REDACTION_REPORT_V1", JCS(report))
 */
export function computeRedactionReportHash(report: RedactionReport): string {
  return hJcsHex(TAGS.REDACTION_REPORT, report);
}

// ─────────────────────────────────────────────────────────────────────────────
// P0 assertion
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Assert that redaction is complete (state === "full").
 * Throws with P0 error if not. Required before writing production evidence.
 */
export function assertP0RedactionComplete(state: RedactionState): void {
  if (state !== "full") {
    throw new Error(
      `P0_REDACTION_INCOMPLETE: redaction_state is "${state}", must be "full" for production evidence`,
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Report builder
// ─────────────────────────────────────────────────────────────────────────────

export interface BuildRedactionReportArgs {
  runId:           string;
  suite:           string;
  state:           RedactionState;
  patternsApplied: string[];
  filesProcessed:  number;
  piiFound:        boolean;
  redactionTimeMs: number;
}

/**
 * Build a RedactionReport from processing results.
 */
export function buildRedactionReport(args: BuildRedactionReportArgs): {
  report:     RedactionReport;
  reportHash: string;
} {
  const report: RedactionReport = {
    spec:               "PII_REDACTION_SPEC@1.0",
    run_id:             args.runId,
    suite:              args.suite,
    redaction_state:    args.state,
    patterns_applied:   args.patternsApplied,
    files_processed:    args.filesProcessed,
    pii_found:          args.piiFound,
    redaction_time_ms:  args.redactionTimeMs,
  };

  const reportHash = computeRedactionReportHash(report);

  return { report, reportHash };
}

// ─────────────────────────────────────────────────────────────────────────────
// Redaction state computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determine overall redaction state from individual file results.
 *   - All files redacted:  "full"
 *   - Some files redacted: "partial"
 *   - No files processed:  "none"
 */
export function computeRedactionState(args: {
  filesProcessed:  number;
  filesRedacted:   number;
}): RedactionState {
  if (args.filesProcessed === 0) return "none";
  if (args.filesRedacted === args.filesProcessed) return "full";
  return "partial";
}
