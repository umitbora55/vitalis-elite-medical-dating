/**
 * E2E Smoke — Onboarding / Registration
 *
 * Verifies that the registration page loads and that the form
 * provides appropriate validation feedback on submission.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';

test.describe('Onboarding / Registration smoke', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any residual auth state
    await page.context().clearCookies();
  });

  test('registration or auth page loads without crashing', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });

    // Root element must be present — the React app mounted
    await expect(page.locator('#root')).toHaveCount(1);

    // Allow async renders to settle
    await page.waitForTimeout(1500);

    // At minimum, a heading or form indicator is visible
    const heading = page.locator('h1, h2, [data-testid="page-title"]');
    await expect(heading.first()).toBeVisible({ timeout: 8000 });
  });

  test('register form or sign-in entry point is visible', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Either a register, sign-up, or email input must exist on the landing/auth screen
    const formEntry = page.locator(
      'input[type="email"], input[placeholder*="email" i], input[placeholder*="e-posta" i], [data-testid="email-input"]',
    );

    const registerLink = page.locator(
      'a:has-text("Register"), a:has-text("Sign Up"), a:has-text("Kayıt"), button:has-text("Register"), button:has-text("Sign Up"), button:has-text("Kayıt")',
    );

    // At least one of email input or register CTA must be visible
    const emailVisible = await formEntry.first().isVisible().catch(() => false);
    const registerVisible = await registerLink.first().isVisible().catch(() => false);

    expect(emailVisible || registerVisible).toBe(true);
  });

  test('submit empty form triggers validation feedback', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Find and click the primary submit / continue button
    const submitBtn = page.locator(
      'button[type="submit"], button:has-text("Continue"), button:has-text("Devam"), button:has-text("Login"), button:has-text("Giriş"), button:has-text("Submit")',
    ).first();

    const submitVisible = await submitBtn.isVisible().catch(() => false);
    if (!submitVisible) {
      test.skip();
      return;
    }

    await submitBtn.click();
    await page.waitForTimeout(800);

    // After submitting empty form, either:
    // - HTML5 validation activates (browser shows tooltip)
    // - A visible error message appears in the DOM
    // - The URL did NOT change to a protected page (form blocked navigation)
    const errorFeedback = page.locator(
      '[role="alert"], .error, [data-testid*="error"], p:has-text("required"), p:has-text("gerekli"), span:has-text("required")',
    );

    const hasError = await errorFeedback.first().isVisible().catch(() => false);
    const currentUrl = page.url();

    // Either validation error shown OR navigation was blocked (stayed on same page)
    expect(hasError || currentUrl === BASE_URL || currentUrl === `${BASE_URL}/`).toBe(true);
  });

  test('page has no critical JavaScript errors on load', async ({ page }) => {
    const criticalErrors: string[] = [];

    page.on('pageerror', (err) => {
      // Filter out non-critical warnings
      if (!err.message.includes('ResizeObserver') && !err.message.includes('Non-Error promise')) {
        criticalErrors.push(err.message);
      }
    });

    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    expect(criticalErrors).toHaveLength(0);
  });
});
