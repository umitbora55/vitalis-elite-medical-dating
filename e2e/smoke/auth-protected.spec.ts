/**
 * E2E Smoke — Auth-Protected Routes
 *
 * Verifies that unauthenticated visitors are redirected away from
 * protected routes (/discover, /matches, /admin, etc.) to the login page
 * or a public landing page.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';

const PROTECTED_ROUTES = [
  '/discover',
  '/matches',
  '/profile',
  '/settings',
  '/messages',
  '/admin',
] as const;

/**
 * Determines whether the page is showing an auth gate:
 *   - URL changed to a login / root page
 *   - A login form or CTA is visible
 *   - A "sign in required" message appears
 */
async function isAuthGated(page: import('@playwright/test').Page, originalPath: string): Promise<boolean> {
  const currentUrl = new URL(page.url());
  const originalPathNormalized = originalPath.replace(/\/$/, '');

  // If navigation was redirected away from the protected path
  const wasRedirected =
    !currentUrl.pathname.startsWith(originalPathNormalized) ||
    currentUrl.pathname === '/' ||
    currentUrl.pathname.includes('login') ||
    currentUrl.pathname.includes('auth') ||
    currentUrl.pathname.includes('signin');

  if (wasRedirected) return true;

  // Check for a visible auth prompt on the page
  const authIndicators = [
    'input[type="email"]',
    'input[type="password"]',
    'button:has-text("Sign In")',
    'button:has-text("Giriş")',
    'button:has-text("Log In")',
    '[data-testid="auth-gate"]',
    'text=Please sign in',
    'text=Lütfen giriş yapın',
    'text=Login required',
    'text=You must be logged in',
  ];

  for (const selector of authIndicators) {
    const visible = await page.locator(selector).first().isVisible().catch(() => false);
    if (visible) return true;
  }

  return false;
}

test.describe('Auth-protected routes — unauthenticated access', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure no session cookies are present
    await page.context().clearCookies();
    // Clear localStorage to remove any persisted Supabase tokens
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  for (const route of PROTECTED_ROUTES) {
    test(`unauthenticated GET ${route} → redirected or auth-gated`, async ({ page }) => {
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(2000);

      const gated = await isAuthGated(page, route);
      expect(gated).toBe(true);
    });
  }

  test('/discover redirects to root or login when no session', async ({ page }) => {
    await page.goto(`${BASE_URL}/discover`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const url = new URL(page.url());
    // Must not remain on /discover without auth
    const isStillOnDiscover =
      url.pathname === '/discover' && !(await isAuthGated(page, '/discover'));
    expect(isStillOnDiscover).toBe(false);
  });

  test('/admin redirects unauthenticated users', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const url = new URL(page.url());
    // Must not stay on /admin unprotected
    const remainsOnAdmin = url.pathname.startsWith('/admin') && !(await isAuthGated(page, '/admin'));
    expect(remainsOnAdmin).toBe(false);
  });

  test('root route is accessible without authentication', async ({ page }) => {
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);

    // Root should load (even if it's a login page, it should not crash)
    await expect(page.locator('#root')).toHaveCount(1);
    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
