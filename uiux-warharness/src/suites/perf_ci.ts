/**
 * perf_ci.ts — Performance CI suite definition (PERF_CI_SPEC@6.4)
 *
 * Web Vitals, bundle size, Time to Interactive, Lighthouse scores,
 * and API response time budgets for CI gating.
 */

import type { SuiteScenario } from "../core/manifest.js";

// ─────────────────────────────────────────────────────────────────────────────
// Suite blockers
// ─────────────────────────────────────────────────────────────────────────────

export interface PerfCiBlockers {
  /** Largest Contentful Paint > 2500ms count */
  lcp_exceed_budget:        number;   // must be 0
  /** First Input Delay > 100ms count */
  fid_exceed_budget:        number;   // must be 0
  /** Cumulative Layout Shift > 0.1 count */
  cls_exceed_budget:        number;   // must be 0
  /** Bundle size increase > 50KB (gzipped) */
  bundle_size_regression:   number;   // must be 0
  /** Lighthouse performance score < 80 */
  lighthouse_perf_below_80: number;   // must be 0
  /** API P95 response time > 2000ms */
  api_p95_exceed_budget:    number;   // must be 0
}

export interface PerfBudgets {
  lcp_ms:           number;   // Largest Contentful Paint budget (ms)
  fid_ms:           number;   // First Input Delay budget (ms)
  cls_threshold:    number;   // CLS threshold (unitless)
  bundle_kb:        number;   // Max bundle size (gzipped KB)
  lighthouse_score: number;   // Min Lighthouse perf score (0–100)
  api_p95_ms:       number;   // API P95 latency budget (ms)
  tbt_ms:           number;   // Total Blocking Time budget (ms)
  ttfb_ms:          number;   // Time to First Byte budget (ms)
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite definition
// ─────────────────────────────────────────────────────────────────────────────

export const PERF_CI_SUITE = {
  name:              "perf_ci",
  spec:              "PERF_CI_SPEC@6.4",
  include_allowlist: [
    "playwright/reports/perf/**/*.json",
    "playwright/reports/lighthouse/**/*.json",
    "playwright/reports/bundle/**/*.json",
  ],
  blockers: {
    lcp_exceed_budget:        0,
    fid_exceed_budget:        0,
    cls_exceed_budget:        0,
    bundle_size_regression:   0,
    lighthouse_perf_below_80: 0,
    api_p95_exceed_budget:    0,
  } satisfies PerfCiBlockers,
  budgets: {
    lcp_ms:           2500,
    fid_ms:           100,
    cls_threshold:    0.1,
    bundle_kb:        650,   // 603KB current + small buffer
    lighthouse_score: 80,
    api_p95_ms:       2000,
    tbt_ms:           300,
    ttfb_ms:          800,
  } satisfies PerfBudgets,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────────────────────

export const PERF_CI_SCENARIOS: SuiteScenario[] = [
  {
    name:               "web-vitals-desktop",
    expectedAssertions: 12,
    include_allowlist:  ["playwright/reports/perf/desktop/**/*.json"],
    version:            "1.0",
  },
  {
    name:               "web-vitals-mobile",
    expectedAssertions: 12,
    include_allowlist:  ["playwright/reports/perf/mobile/**/*.json"],
    version:            "1.0",
  },
  {
    name:               "lighthouse-audit",
    expectedAssertions: 8,
    include_allowlist:  ["playwright/reports/lighthouse/**/*.json"],
    version:            "1.0",
  },
  {
    name:               "bundle-analysis",
    expectedAssertions: 5,
    include_allowlist:  ["playwright/reports/bundle/**/*.json"],
    version:            "1.0",
  },
  {
    name:               "api-latency",
    expectedAssertions: 10,
    include_allowlist:  ["playwright/reports/perf/api/**/*.json"],
    version:            "1.0",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Blocker validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate performance CI blockers.
 * Throws if any budget is exceeded.
 */
export function assertPerfCiBlockers(actual: PerfCiBlockers): void {
  const required = PERF_CI_SUITE.blockers;
  const failures: string[] = [];

  if (actual.lcp_exceed_budget > required.lcp_exceed_budget) {
    failures.push(`lcp_exceed_budget=${actual.lcp_exceed_budget} (budget=${PERF_CI_SUITE.budgets.lcp_ms}ms)`);
  }
  if (actual.fid_exceed_budget > required.fid_exceed_budget) {
    failures.push(`fid_exceed_budget=${actual.fid_exceed_budget} (budget=${PERF_CI_SUITE.budgets.fid_ms}ms)`);
  }
  if (actual.cls_exceed_budget > required.cls_exceed_budget) {
    failures.push(`cls_exceed_budget=${actual.cls_exceed_budget} (budget=${PERF_CI_SUITE.budgets.cls_threshold})`);
  }
  if (actual.bundle_size_regression > required.bundle_size_regression) {
    failures.push(`bundle_size_regression=${actual.bundle_size_regression} (budget=${PERF_CI_SUITE.budgets.bundle_kb}KB)`);
  }
  if (actual.lighthouse_perf_below_80 > required.lighthouse_perf_below_80) {
    failures.push(`lighthouse_perf_below_80=${actual.lighthouse_perf_below_80} (min=${PERF_CI_SUITE.budgets.lighthouse_score})`);
  }
  if (actual.api_p95_exceed_budget > required.api_p95_exceed_budget) {
    failures.push(`api_p95_exceed_budget=${actual.api_p95_exceed_budget} (budget=${PERF_CI_SUITE.budgets.api_p95_ms}ms)`);
  }

  if (failures.length > 0) {
    throw new Error(
      `PERF_CI_GATE_FAIL [${PERF_CI_SUITE.spec}]: ` + failures.join(", "),
    );
  }
}
