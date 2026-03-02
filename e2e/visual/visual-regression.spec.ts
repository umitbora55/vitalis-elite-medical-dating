/**
 * Visual Regression Tests — P0 Release Gate
 *
 * PDF Reference: Görsel QA (regresyon) — P0
 *
 * Pass criteria (ölçülebilir eşikler):
 *   ✓ Hiçbir kritik ekranda review edilmemiş görsel fark → merge yok
 *   ✓ Dinamik bölgeler maskelendi (timestamps, avatar URLs, random content)
 *   ✓ maxDiffPixelRatio = 0.02 (2% piksel farkı toleransı)
 *   ✓ Animasyonlar devre dışı (kararlı snapshot için)
 *   ✓ Light + Dark mode ayrı screenshot
 *   ✓ Desktop (1280) + Mobile (390) viewport
 *
 * Araçlar: Playwright toHaveScreenshot() built-in visual comparison
 *
 * İlk çalıştırma → baseline oluşturur (e2e/__snapshots__/)
 * CI → baseline ile karşılaştırır, fark varsa FAIL
 * Baseline güncelleme: npx playwright test --update-snapshots
 *
 * Maskeleme politikası:
 *   - Zaman damgaları ("3 dakika önce"), rastgele avatarlar, skeleton
 *   - Supabase realtime bağlantı göstergeleri
 *   - Yüklenen resimler (src=blob veya storage URL)
 */

import { test, expect, type Page, type Locator } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';

// ─────────────────────────────────────────────────────────────────────────────
// Config
// ─────────────────────────────────────────────────────────────────────────────

const SCREENSHOT_OPTS = {
  animations:        'disabled' as const,
  maxDiffPixelRatio: 0.02,   // 2% tolerance
  threshold:         0.2,    // per-pixel sensitivity
} satisfies Parameters<typeof expect.prototype.toHaveScreenshot>[1];

/** Selectors for dynamic content that should be masked */
const DYNAMIC_SELECTORS = [
  // Timestamps
  '[data-testid*="timestamp"]',
  '[data-testid*="time"]',
  'time',
  '[class*="timestamp"]',
  '[class*="time-ago"]',
  // Avatars & profile images
  '[data-testid*="avatar"] img',
  '.avatar img',
  '[class*="avatar"] img',
  // Random / external images
  'img[src*="storage.googleapis.com"]',
  'img[src*="supabase"]',
  'img[src*="placeholder"]',
  'img[src^="blob:"]',
  // Loading states
  '[aria-busy="true"]',
  '[data-testid*="skeleton"]',
  '[class*="skeleton"]',
  '[class*="shimmer"]',
  // Online/presence indicators
  '[data-testid*="online"]',
  '[class*="presence"]',
  // Counters that may fluctuate
  '[data-testid*="count"]',
  '[data-testid*="badge-count"]',
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Collect dynamic element locators for masking */
async function collectMasks(page: Page): Promise<Locator[]> {
  const masks: Locator[] = [];
  for (const sel of DYNAMIC_SELECTORS) {
    const loc   = page.locator(sel);
    const count = await loc.count();
    for (let i = 0; i < count; i++) {
      masks.push(loc.nth(i));
    }
  }
  return masks;
}

/** Disable all CSS animations + transitions for pixel-stable captures */
async function freezeMotion(page: Page): Promise<void> {
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration:   0ms !important;
        animation-delay:      0ms !important;
        transition-duration:  0ms !important;
        transition-delay:     0ms !important;
        animation-iteration-count: 1 !important;
      }
    `,
  });
  await page.waitForTimeout(300);
}

/** Navigate to URL and wait for stable render */
async function gotoStable(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await freezeMotion(page);
}

/** Take a full-page screenshot with masking */
async function screenshotFull(page: Page, name: string): Promise<void> {
  const masks = await collectMasks(page);
  await expect(page).toHaveScreenshot(`${name}-full.png`, {
    ...SCREENSHOT_OPTS,
    fullPage: true,
    mask: masks,
  });
}

/** Take a viewport screenshot with masking */
async function screenshotViewport(page: Page, name: string): Promise<void> {
  const masks = await collectMasks(page);
  await expect(page).toHaveScreenshot(`${name}-viewport.png`, {
    ...SCREENSHOT_OPTS,
    fullPage: false,
    mask: masks,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Light mode — critical screens
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual Regression — Light mode (P0)', () => {
  test.use({ colorScheme: 'light' });

  test('Landing — hero / above-fold', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await screenshotViewport(page, 'landing-hero-light');
  });

  test('Landing — full page', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await screenshotFull(page, 'landing-full-light');
  });

  test('Auth / Login — full page', async ({ page }) => {
    try {
      await gotoStable(page, `${BASE_URL}/auth`);
    } catch {
      await gotoStable(page, BASE_URL);
    }
    await screenshotFull(page, 'auth-full-light');
  });

  test('Navigation header', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const header = page.locator('header, [role="banner"], nav').first();
    if ((await header.count()) === 0) return;
    const masks = await collectMasks(page);
    await expect(header).toHaveScreenshot('nav-header-light.png', {
      ...SCREENSHOT_OPTS,
      mask: masks,
    });
  });

  test('Primary CTA button — default state', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    // Target the most prominent action button
    const cta = page.locator(
      'button:visible, [role="button"]:visible',
    ).first();
    if (!(await cta.isVisible())) return;
    await expect(cta).toHaveScreenshot('cta-primary-light.png', {
      ...SCREENSHOT_OPTS,
    });
  });

  test('Primary CTA button — hover state', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const cta = page.locator('button:visible').first();
    if (!(await cta.isVisible())) return;
    await cta.hover();
    await page.waitForTimeout(100);
    await expect(cta).toHaveScreenshot('cta-primary-hover-light.png', {
      ...SCREENSHOT_OPTS,
    });
  });

  test('Form — empty state', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const form = page.locator('form:visible').first();
    if (!(await form.isVisible())) return;
    const masks = await collectMasks(page);
    await expect(form).toHaveScreenshot('form-empty-light.png', {
      ...SCREENSHOT_OPTS,
      mask: masks,
    });
  });

  test('Form — error state (after failed submit)', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const submitBtn = page.locator('button[type="submit"]:visible').first();
    if (!(await submitBtn.isVisible())) return;

    await submitBtn.click();
    await page.waitForTimeout(600);

    const form = page.locator('form:visible').first();
    if (!(await form.isVisible())) return;
    const masks = await collectMasks(page);
    await expect(form).toHaveScreenshot('form-error-state-light.png', {
      ...SCREENSHOT_OPTS,
      mask: masks,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Dark mode — critical screens
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual Regression — Dark mode (P0)', () => {
  test.use({ colorScheme: 'dark' });

  test.beforeEach(async ({ page }) => {
    // Also set dark class for Tailwind dark mode if app uses class strategy
    await page.addInitScript(() => {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    });
  });

  test('Landing — hero dark mode', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await screenshotViewport(page, 'landing-hero-dark');
  });

  test('Landing — full page dark mode', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await screenshotFull(page, 'landing-full-dark');
  });

  test('Auth — full page dark mode', async ({ page }) => {
    try {
      await gotoStable(page, `${BASE_URL}/auth`);
    } catch {
      await gotoStable(page, BASE_URL);
    }
    await screenshotFull(page, 'auth-full-dark');
  });

  test('Navigation header — dark mode', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const header = page.locator('header, [role="banner"], nav').first();
    if ((await header.count()) === 0) return;
    const masks = await collectMasks(page);
    await expect(header).toHaveScreenshot('nav-header-dark.png', {
      ...SCREENSHOT_OPTS,
      mask: masks,
    });
  });

  test('Primary CTA — dark mode', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const cta = page.locator('button:visible').first();
    if (!(await cta.isVisible())) return;
    await expect(cta).toHaveScreenshot('cta-primary-dark.png', {
      ...SCREENSHOT_OPTS,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Mobile viewport (390px — iPhone 14)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual Regression — Mobile viewport (P0)', () => {
  test.use({
    viewport:    { width: 390, height: 844 },
    colorScheme: 'light',
  });

  test('Landing — mobile viewport', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await screenshotViewport(page, 'landing-mobile');
  });

  test('Auth — mobile viewport', async ({ page }) => {
    try {
      await gotoStable(page, `${BASE_URL}/auth`);
    } catch {
      await gotoStable(page, BASE_URL);
    }
    await screenshotFull(page, 'auth-mobile');
  });

  test('Navigation — mobile (hamburger or bottom nav)', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const nav = page.locator('header, nav, [role="navigation"]').first();
    if ((await nav.count()) === 0) return;
    const masks = await collectMasks(page);
    await expect(nav).toHaveScreenshot('nav-mobile.png', {
      ...SCREENSHOT_OPTS,
      mask: masks,
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Component-level — design system consistency
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Visual Regression — Design system components', () => {
  test('Border radius consistency: no broken card corners', async ({ page }) => {
    await gotoStable(page, BASE_URL);

    // Capture any card-like elements
    const cards = page.locator('[class*="card"], [class*="Card"]').first();
    if (!(await cards.isVisible())) return;
    const masks = await collectMasks(page);
    await expect(cards).toHaveScreenshot('component-card.png', {
      ...SCREENSHOT_OPTS,
      mask: masks,
    });
  });

  test('Input field — default + focus state visual', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const input = page.locator('input[type="email"], input[type="text"]').first();
    if (!(await input.isVisible())) return;

    // Default state
    await expect(input).toHaveScreenshot('input-default.png', { ...SCREENSHOT_OPTS });

    // Focus state
    await input.focus();
    await page.waitForTimeout(100);
    await expect(input).toHaveScreenshot('input-focused.png', { ...SCREENSHOT_OPTS });
  });
});
