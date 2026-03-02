/**
 * p0_smoke.ts — P0 Smoke UI suite definition (P0_SMOKE_SPEC@6.4)
 *
 * Blockers: zero e2e failures, zero flaky, zero a11y critical,
 *           zero protected route bypasses, zero visual critical diffs.
 */

import type { SuiteScenario } from "../core/manifest.js";

// ─────────────────────────────────────────────────────────────────────────────
// Suite blockers
// ─────────────────────────────────────────────────────────────────────────────

export interface P0SmokeBlockers {
  e2e_failed:              number;   // must be 0
  flaky:                   number;   // must be 0
  a11y_critical:           number;   // must be 0
  protected_route_bypass:  number;   // must be 0
  visual_critical_diff:    number;   // must be 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite definition
// ─────────────────────────────────────────────────────────────────────────────

export const P0_SMOKE_SUITE = {
  name:              "p0_smoke",
  spec:              "P0_SMOKE_SPEC@6.4",
  include_allowlist: [
    "playwright/screenshots/**/*.png",
    "playwright/reports/**/*.json",
  ],
  blockers: {
    e2e_failed:             0,
    flaky:                  0,
    a11y_critical:          0,
    protected_route_bypass: 0,
    visual_critical_diff:   0,
  } satisfies P0SmokeBlockers,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────────────────────

export const P0_SMOKE_SCENARIOS: SuiteScenario[] = [
  {
    name:               "login-flow",
    expectedAssertions: 8,
    include_allowlist:  ["playwright/screenshots/login/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "profile-view",
    expectedAssertions: 12,
    include_allowlist:  ["playwright/screenshots/profile/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "matching-flow",
    expectedAssertions: 10,
    include_allowlist:  ["playwright/screenshots/matching/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "admin-moderation",
    expectedAssertions: 6,
    include_allowlist:  ["playwright/screenshots/admin/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "auth-protected-routes",
    expectedAssertions: 4,
    include_allowlist:  ["playwright/reports/auth/**/*.json"],
    version:            "1.0",
  },
  {
    name:               "a11y-audit",
    expectedAssertions: 5,
    include_allowlist:  ["playwright/reports/a11y/**/*.json"],
    version:            "1.0",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Blocker validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a blockers result meets P0 thresholds.
 * Throws with detailed failure reason if any blocker exceeds threshold.
 */
export function assertP0SmokeBlockers(actual: P0SmokeBlockers): void {
  const required = P0_SMOKE_SUITE.blockers;
  const failures: string[] = [];

  if (actual.e2e_failed > required.e2e_failed) {
    failures.push(`e2e_failed=${actual.e2e_failed} (max=${required.e2e_failed})`);
  }
  if (actual.flaky > required.flaky) {
    failures.push(`flaky=${actual.flaky} (max=${required.flaky})`);
  }
  if (actual.a11y_critical > required.a11y_critical) {
    failures.push(`a11y_critical=${actual.a11y_critical} (max=${required.a11y_critical})`);
  }
  if (actual.protected_route_bypass > required.protected_route_bypass) {
    failures.push(`protected_route_bypass=${actual.protected_route_bypass} (max=${required.protected_route_bypass})`);
  }
  if (actual.visual_critical_diff > required.visual_critical_diff) {
    failures.push(`visual_critical_diff=${actual.visual_critical_diff} (max=${required.visual_critical_diff})`);
  }

  if (failures.length > 0) {
    throw new Error(
      `P0_SMOKE_BLOCKERS_FAIL [${P0_SMOKE_SUITE.spec}]: ` + failures.join(", "),
    );
  }
}
