import { defineConfig, devices } from '@playwright/test';

const isCI        = Boolean(process.env.CI);
const usePreview  = process.env.E2E_PREVIEW === '1';
const baseURL     = process.env.BASE_URL ?? 'http://localhost:4173';

const webServerCommand = usePreview
  ? 'npm run preview -- --host 0.0.0.0 --port 4173 --strictPort'
  : 'npm run dev   -- --host 0.0.0.0 --port 4173';

export default defineConfig({
  testDir: './e2e',

  /** Global test timeout */
  timeout: 45_000,

  /** Assertion timeout */
  expect: {
    timeout: 10_000,
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.02,   // 2 % pixel tolerance
      threshold:         0.2,    // per-pixel sensitivity
      animations:        'disabled',
    },
  },

  retries:       isCI ? 2 : 0,
  fullyParallel: true,
  forbidOnly:    isCI,
  workers:       isCI ? 2 : undefined,

  reporter: isCI
    ? [
        ['github'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'playwright-report/results.json' }],
      ]
    : [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'on-failure' }],
      ],

  use: {
    baseURL,
    trace:       'on-first-retry',
    screenshot:  'only-on-failure',
    video:       'retain-on-failure',
    colorScheme: 'light',   // default; overridden per project
    locale:      'tr-TR',
    timezoneId:  'Europe/Istanbul',
  },

  outputDir: 'test-results',

  /** Visual regression baselines */
  snapshotDir:          'e2e/__snapshots__',
  snapshotPathTemplate: '{snapshotDir}/{testFilePath}/{arg}-{projectName}{ext}',

  webServer: {
    command:             webServerCommand,
    url:                 baseURL,
    reuseExistingServer: !isCI,
    timeout:             90_000,
    stdout:              'ignore',
    stderr:              'pipe',
  },

  projects: [
    // ──────────────────────────────────────────────────────────────────
    // Smoke — fast cross-browser sanity (runs first in CI)
    // ──────────────────────────────────────────────────────────────────
    {
      name: 'chromium-smoke',
      use:  { ...devices['Desktop Chrome'] },
      testMatch: ['**/smoke/**/*.spec.ts', '**/basic.spec.ts'],
    },
    {
      name: 'firefox-smoke',
      use:  { ...devices['Desktop Firefox'] },
      testMatch: ['**/smoke/**/*.spec.ts'],
    },
    {
      name: 'webkit-smoke',
      use:  { ...devices['Desktop Safari'] },
      testMatch: ['**/smoke/**/*.spec.ts'],
    },
    {
      name: 'mobile-chrome-smoke',
      use:  { ...devices['Pixel 7'] },
      testMatch: ['**/smoke/**/*.spec.ts'],
    },
    {
      name: 'mobile-safari-smoke',
      use:  { ...devices['iPhone 14'] },
      testMatch: ['**/smoke/**/*.spec.ts'],
    },

    // ──────────────────────────────────────────────────────────────────
    // Accessibility — WCAG 2.2 AA (axe-core)
    // ──────────────────────────────────────────────────────────────────
    {
      name: 'a11y-chromium',
      use:  { ...devices['Desktop Chrome'] },
      testMatch: '**/a11y/**/*.spec.ts',
    },

    // ──────────────────────────────────────────────────────────────────
    // Visual regression — light + dark × desktop + mobile
    // ──────────────────────────────────────────────────────────────────
    {
      name: 'visual-desktop-light',
      use:  {
        ...devices['Desktop Chrome'],
        viewport:    { width: 1280, height: 800 },
        colorScheme: 'light',
      },
      testMatch: '**/visual/**/*.spec.ts',
    },
    {
      name: 'visual-desktop-dark',
      use:  {
        ...devices['Desktop Chrome'],
        viewport:    { width: 1280, height: 800 },
        colorScheme: 'dark',
      },
      testMatch: '**/visual/**/*.spec.ts',
    },
    {
      name: 'visual-mobile-light',
      use:  {
        ...devices['iPhone 14'],
        colorScheme: 'light',
      },
      testMatch: '**/visual/**/*.spec.ts',
    },

    // ──────────────────────────────────────────────────────────────────
    // Responsive / Reflow — WCAG 1.4.10 / 1.4.4
    // ──────────────────────────────────────────────────────────────────
    {
      name: 'responsive-320',
      use:  {
        ...devices['Desktop Chrome'],
        viewport: { width: 320, height: 568 },
      },
      testMatch: '**/responsive/**/*.spec.ts',
    },
    {
      name: 'responsive-375',
      use:  {
        ...devices['Desktop Chrome'],
        viewport: { width: 375, height: 667 },
      },
      testMatch: '**/responsive/**/*.spec.ts',
    },
    {
      name: 'responsive-768',
      use:  {
        ...devices['Desktop Chrome'],
        viewport: { width: 768, height: 1024 },
      },
      testMatch: '**/responsive/**/*.spec.ts',
    },
    {
      name: 'responsive-1440',
      use:  {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
      testMatch: '**/responsive/**/*.spec.ts',
    },

    // ──────────────────────────────────────────────────────────────────
    // Performance / Core Web Vitals budgets
    // ──────────────────────────────────────────────────────────────────
    {
      name: 'performance-desktop',
      use:  {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 800 },
      },
      testMatch: '**/performance/**/*.spec.ts',
    },
    {
      name: 'performance-mobile',
      use:  { ...devices['Pixel 7'] },
      testMatch: '**/performance/**/*.spec.ts',
    },
  ],
});
