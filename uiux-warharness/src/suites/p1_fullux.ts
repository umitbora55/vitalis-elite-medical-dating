/**
 * p1_fullux.ts — P1 Full UX suite definition (P1_FULLUX_SPEC@6.4)
 *
 * RC blocker criteria. Comprehensive UX validation:
 * navigation flows, form validation, error states, onboarding,
 * accessibility (full WCAG 2.1 AA), and interaction patterns.
 */

import type { SuiteScenario } from "../core/manifest.js";

// ─────────────────────────────────────────────────────────────────────────────
// Suite blockers (RC gate — P1 severity)
// ─────────────────────────────────────────────────────────────────────────────

export interface P1FullUxBlockers {
  e2e_failed:              number;   // must be 0
  a11y_critical:           number;   // must be 0
  a11y_serious:            number;   // max 2 (tolerated for RC)
  form_validation_broken:  number;   // must be 0
  error_state_missing:     number;   // must be 0
  navigation_broken:       number;   // must be 0
  flaky:                   number;   // max 3 (tolerated for P1)
  visual_critical_diff:    number;   // must be 0
  visual_serious_diff:     number;   // max 5 (tolerated for RC)
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite definition
// ─────────────────────────────────────────────────────────────────────────────

export const P1_FULLUX_SUITE = {
  name:              "p1_fullux",
  spec:              "P1_FULLUX_SPEC@6.4",
  include_allowlist: [
    "playwright/screenshots/**/*.png",
    "playwright/reports/**/*.json",
    "playwright/traces/**/*.zip",
  ],
  blockers: {
    e2e_failed:             0,
    a11y_critical:          0,
    a11y_serious:           2,
    form_validation_broken: 0,
    error_state_missing:    0,
    navigation_broken:      0,
    flaky:                  3,
    visual_critical_diff:   0,
    visual_serious_diff:    5,
  } satisfies P1FullUxBlockers,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────────────────────

export const P1_FULLUX_SCENARIOS: SuiteScenario[] = [
  {
    name:               "onboarding-flow",
    expectedAssertions: 25,
    include_allowlist:  ["playwright/screenshots/onboarding/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "profile-creation",
    expectedAssertions: 20,
    include_allowlist:  ["playwright/screenshots/profile-creation/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "matching-and-discovery",
    expectedAssertions: 18,
    include_allowlist:  ["playwright/screenshots/matching/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "messaging-flow",
    expectedAssertions: 15,
    include_allowlist:  ["playwright/screenshots/messaging/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "date-planning-flow",
    expectedAssertions: 12,
    include_allowlist:  ["playwright/screenshots/dates/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "verification-flow",
    expectedAssertions: 10,
    include_allowlist:  ["playwright/screenshots/verification/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "safety-and-reporting",
    expectedAssertions: 8,
    include_allowlist:  ["playwright/screenshots/safety/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "subscription-and-payments",
    expectedAssertions: 10,
    include_allowlist:  ["playwright/screenshots/subscription/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "a11y-full-audit",
    expectedAssertions: 30,
    include_allowlist:  ["playwright/reports/a11y/**/*.json"],
    version:            "1.0",
  },
  {
    name:               "form-validation-states",
    expectedAssertions: 20,
    include_allowlist:  ["playwright/reports/forms/**/*.json"],
    version:            "1.0",
  },
  {
    name:               "error-state-coverage",
    expectedAssertions: 15,
    include_allowlist:  ["playwright/screenshots/errors/**/*.png", "playwright/reports/errors/**/*.json"],
    version:            "1.0",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Blocker validation (RC gate)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate P1 full UX blockers against RC thresholds.
 * Throws with detailed failure if any blocker exceeds threshold.
 */
export function assertP1FullUxBlockers(actual: P1FullUxBlockers): void {
  const required = P1_FULLUX_SUITE.blockers;
  const failures: string[] = [];

  if (actual.e2e_failed > required.e2e_failed) {
    failures.push(`e2e_failed=${actual.e2e_failed} (max=${required.e2e_failed})`);
  }
  if (actual.a11y_critical > required.a11y_critical) {
    failures.push(`a11y_critical=${actual.a11y_critical} (max=${required.a11y_critical})`);
  }
  if (actual.a11y_serious > required.a11y_serious) {
    failures.push(`a11y_serious=${actual.a11y_serious} (max=${required.a11y_serious})`);
  }
  if (actual.form_validation_broken > required.form_validation_broken) {
    failures.push(`form_validation_broken=${actual.form_validation_broken} (max=${required.form_validation_broken})`);
  }
  if (actual.error_state_missing > required.error_state_missing) {
    failures.push(`error_state_missing=${actual.error_state_missing} (max=${required.error_state_missing})`);
  }
  if (actual.navigation_broken > required.navigation_broken) {
    failures.push(`navigation_broken=${actual.navigation_broken} (max=${required.navigation_broken})`);
  }
  if (actual.flaky > required.flaky) {
    failures.push(`flaky=${actual.flaky} (max=${required.flaky})`);
  }
  if (actual.visual_critical_diff > required.visual_critical_diff) {
    failures.push(`visual_critical_diff=${actual.visual_critical_diff} (max=${required.visual_critical_diff})`);
  }
  if (actual.visual_serious_diff > required.visual_serious_diff) {
    failures.push(`visual_serious_diff=${actual.visual_serious_diff} (max=${required.visual_serious_diff})`);
  }

  if (failures.length > 0) {
    throw new Error(
      `P1_FULLUX_RC_GATE_FAIL [${P1_FULLUX_SUITE.spec}]: ` + failures.join(", "),
    );
  }
}
