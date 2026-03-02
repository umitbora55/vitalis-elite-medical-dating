/**
 * provenance.ts — Provenance JSON builder (ATTESTATION_SPEC@1.0)
 *
 * Builds the provenance_json field from CI environment variables.
 * Used by the producer CLI to populate evidence rows.
 */

import type { AttestedPayload } from "./attestation.js";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ProvenanceArgs {
  repo:                string;    // e.g. "github.com/vitalis/app"
  commitSha:           string;    // 40-char git SHA
  workflow:            string;    // e.g. ".github/workflows/release-gate.yml"
  ref:                 string;    // e.g. "refs/heads/main"
  runnerImageDigest:   string;    // e.g. "sha256:..."
  buildStartedAt:      string;    // RFC3339
  ciRunId:             string;    // CI run identifier
  subjectHash:         string;    // hex — attested artifact hash
  /** Additional fields for provenance_json (CI context, etc.) */
  extra?:              Record<string, unknown>;
}

export interface ProvenancePayload extends AttestedPayload {
  readonly ci_run_id:  string;
  readonly extra?:     Record<string, unknown>;
}

// ─────────────────────────────────────────────────────────────────────────────
// Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build a ProvenancePayload from CI environment arguments.
 * The result satisfies AttestedPayload (ATTESTATION_SPEC@1.0).
 */
export function buildProvenance(args: ProvenanceArgs): ProvenancePayload {
  const payload: ProvenancePayload = {
    spec:                 "ATTESTATION_SPEC@1.0",
    repo:                 args.repo,
    commit_sha:           args.commitSha,
    workflow:             args.workflow,
    ref:                  args.ref,
    runner_image_digest:  args.runnerImageDigest,
    build_started_at:     args.buildStartedAt,
    subject_hash:         args.subjectHash,
    ci_run_id:            args.ciRunId,
    ...(args.extra !== undefined ? { extra: args.extra } : {}),
  };
  return payload;
}

// ─────────────────────────────────────────────────────────────────────────────
// Env-variable reader (CI bootstrap)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Read provenance args from standard CI environment variables.
 *
 * Expected env vars:
 *   GITHUB_REPOSITORY       → repo
 *   GITHUB_SHA              → commitSha
 *   GITHUB_WORKFLOW         → workflow
 *   GITHUB_REF              → ref
 *   RUNNER_IMAGE_DIGEST     → runnerImageDigest (custom, must be set in CI)
 *   WAR_BUILD_STARTED_AT    → buildStartedAt (RFC3339, set by CI step)
 *   GITHUB_RUN_ID           → ciRunId
 *   WAR_SUBJECT_HASH        → subjectHash (set after artifact is built)
 */
export function provenanceArgsFromEnv(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): ProvenanceArgs {
  function req(key: string): string {
    const v = env[key];
    if (!v) throw new Error(`provenance: missing required env var ${key}`);
    return v;
  }

  return {
    repo:               req("GITHUB_REPOSITORY"),
    commitSha:          req("GITHUB_SHA"),
    workflow:           req("GITHUB_WORKFLOW"),
    ref:                req("GITHUB_REF"),
    runnerImageDigest:  req("RUNNER_IMAGE_DIGEST"),
    buildStartedAt:     req("WAR_BUILD_STARTED_AT"),
    ciRunId:            req("GITHUB_RUN_ID"),
    subjectHash:        req("WAR_SUBJECT_HASH"),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Env fingerprint builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build an env_fingerprint object for the evidence row.
 * Captures non-sensitive CI context for forensic traceability.
 */
export function buildEnvFingerprint(
  env: Record<string, string | undefined> = process.env as Record<string, string | undefined>,
): Record<string, unknown> {
  return {
    github_run_id:       env["GITHUB_RUN_ID"]       ?? null,
    github_run_attempt:  env["GITHUB_RUN_ATTEMPT"]  ?? null,
    github_actor:        env["GITHUB_ACTOR"]        ?? null,
    github_event_name:   env["GITHUB_EVENT_NAME"]   ?? null,
    runner_os:           env["RUNNER_OS"]           ?? null,
    runner_arch:         env["RUNNER_ARCH"]         ?? null,
    node_version:        process.version,
    captured_at:         new Date().toISOString(),
  };
}
