/**
 * E2E Smoke — Landing Page
 *
 * Verifies that the public landing / root page loads correctly,
 * key CTA elements are visible, and no console errors are thrown.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';

test.describe('Landing page smoke', () => {
  test('landing page loads and React mounts', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // React root must be present
    await expect(page.locator('#root')).toHaveCount(1);

    // Wait for async rendering
    await page.waitForTimeout(1500);

    // The body must contain visible content (not a blank white screen)
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.trim().length).toBeGreaterThan(5);
  });

  test('page title is set (not empty or default)', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
    // Should not be the browser default fallback
    expect(title).not.toBe('about:blank');
  });

  test('primary CTA button is visible', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Look for any call-to-action button or link
    const ctaSelectors = [
      'button:has-text("Get Started")',
      'button:has-text("Join")',
      'button:has-text("Sign Up")',
      'button:has-text("Register")',
      'button:has-text("Login")',
      'button:has-text("Giriş")',
      'button:has-text("Kayıt")',
      'button:has-text("Başla")',
      'a:has-text("Get Started")',
      'a:has-text("Join")',
      'a:has-text("Sign Up")',
      '[data-testid="cta-button"]',
      '[data-testid="login-button"]',
    ];

    let ctaVisible = false;
    for (const selector of ctaSelectors) {
      const visible = await page.locator(selector).first().isVisible().catch(() => false);
      if (visible) {
        ctaVisible = true;
        break;
      }
    }

    expect(ctaVisible).toBe(true);
  });

  test('no uncaught JavaScript errors on page load', async ({ page }) => {
    const errors: string[] = [];

    page.on('pageerror', (err) => {
      // Ignore known browser quirks unrelated to the app
      const ignore = [
        'ResizeObserver loop',
        'Non-Error promise rejection',
        'Script error.',
      ];
      const isIgnored = ignore.some((msg) => err.message.includes(msg));
      if (!isIgnored) {
        errors.push(err.message);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    expect(errors).toHaveLength(0);
  });

  test('no failed network requests for critical resources (JS bundles)', async ({ page }) => {
    const failedRequests: string[] = [];

    page.on('requestfailed', (request) => {
      const url = request.url();
      // Only flag JS/CSS/HTML failures — ignore third-party trackers
      if (url.includes(BASE_URL) && (url.endsWith('.js') || url.endsWith('.css'))) {
        failedRequests.push(url);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    expect(failedRequests).toHaveLength(0);
  });

  test('page is responsive at mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // React root must still mount at mobile size
    await expect(page.locator('#root')).toHaveCount(1);

    // No horizontal scroll — content fits within viewport
    const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
    const viewportWidth = 375;
    expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 5); // 5px tolerance
  });
});
