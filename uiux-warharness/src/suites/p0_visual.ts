/**
 * p0_visual.ts — P0 Visual suite definition (P0_VISUAL_SPEC@6.4)
 *
 * Focused on visual regression: screenshot diffs, design token compliance,
 * responsive layout checks, and dark mode contrast ratios.
 */

import type { SuiteScenario } from "../core/manifest.js";

// ─────────────────────────────────────────────────────────────────────────────
// Suite blockers
// ─────────────────────────────────────────────────────────────────────────────

export interface P0VisualBlockers {
  visual_critical_diff:     number;   // must be 0
  layout_regression:        number;   // must be 0
  design_token_violation:   number;   // must be 0
  contrast_fail_wcag_aa:    number;   // must be 0
  missing_baseline:         number;   // must be 0
}

// ─────────────────────────────────────────────────────────────────────────────
// Suite definition
// ─────────────────────────────────────────────────────────────────────────────

export const P0_VISUAL_SUITE = {
  name:              "p0_visual",
  spec:              "P0_VISUAL_SPEC@6.4",
  include_allowlist: [
    "playwright/screenshots/**/*.png",
    "playwright/visual-diffs/**/*.png",
    "playwright/reports/visual/**/*.json",
  ],
  blockers: {
    visual_critical_diff:   0,
    layout_regression:      0,
    design_token_violation: 0,
    contrast_fail_wcag_aa:  0,
    missing_baseline:       0,
  } satisfies P0VisualBlockers,
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Scenarios
// ─────────────────────────────────────────────────────────────────────────────

export const P0_VISUAL_SCENARIOS: SuiteScenario[] = [
  {
    name:               "design-system-components",
    expectedAssertions: 20,
    include_allowlist:  ["playwright/screenshots/design-system/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "responsive-breakpoints",
    expectedAssertions: 15,
    include_allowlist:  ["playwright/screenshots/responsive/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "dark-mode-contrast",
    expectedAssertions: 10,
    include_allowlist:  ["playwright/screenshots/dark-mode/**/*.png"],
    version:            "1.0",
  },
  {
    name:               "visual-diff-report",
    expectedAssertions: 5,
    include_allowlist:  ["playwright/reports/visual/**/*.json"],
    version:            "1.0",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Blocker validation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Validate P0 visual blockers.
 * Throws if any blocker exceeds its threshold.
 */
export function assertP0VisualBlockers(actual: P0VisualBlockers): void {
  const required = P0_VISUAL_SUITE.blockers;
  const failures: string[] = [];

  if (actual.visual_critical_diff > required.visual_critical_diff) {
    failures.push(`visual_critical_diff=${actual.visual_critical_diff} (max=${required.visual_critical_diff})`);
  }
  if (actual.layout_regression > required.layout_regression) {
    failures.push(`layout_regression=${actual.layout_regression} (max=${required.layout_regression})`);
  }
  if (actual.design_token_violation > required.design_token_violation) {
    failures.push(`design_token_violation=${actual.design_token_violation} (max=${required.design_token_violation})`);
  }
  if (actual.contrast_fail_wcag_aa > required.contrast_fail_wcag_aa) {
    failures.push(`contrast_fail_wcag_aa=${actual.contrast_fail_wcag_aa} (max=${required.contrast_fail_wcag_aa})`);
  }
  if (actual.missing_baseline > required.missing_baseline) {
    failures.push(`missing_baseline=${actual.missing_baseline} (max=${required.missing_baseline})`);
  }

  if (failures.length > 0) {
    throw new Error(
      `P0_VISUAL_BLOCKERS_FAIL [${P0_VISUAL_SUITE.spec}]: ` + failures.join(", "),
    );
  }
}
