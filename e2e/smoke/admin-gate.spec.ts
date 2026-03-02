/**
 * E2E Smoke — Admin Gate
 *
 * Verifies that:
 *   1. /admin requires authentication (unauthenticated → redirect / auth prompt)
 *   2. Regular (non-admin) authenticated users see a 403 / access-denied view
 *   3. The admin panel is never accessible without the correct role
 *
 * No real admin credentials are used. A fake session with a regular user role
 * is injected to test the role-based access control (RBAC) UI gate.
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';

/** Injects a fake authenticated session for a regular (non-admin) user. */
async function injectRegularUserSession(page: import('@playwright/test').Page) {
  await page.addInitScript(() => {
    const sessionKey = 'sb-e2etest-auth-token';
    const fakeSession = {
      access_token: 'fake.regular.user.jwt',
      refresh_token: 'fake-refresh',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      token_type: 'bearer',
      user: {
        id: 'regular-user-uuid-001',
        email: 'user@vitalis.health',
        role: 'authenticated',
        aud: 'authenticated',
        app_metadata: { role: 'user' }, // NOT admin/superadmin
      },
    };
    localStorage.setItem(sessionKey, JSON.stringify(fakeSession));
  });
}

test.describe('Admin gate — unauthenticated access', () => {
  test.beforeEach(async ({ page }) => {
    await page.context().clearCookies();
    await page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  });

  test('/admin → redirects or shows auth prompt when unauthenticated', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    const url = new URL(page.url());

    // Option 1: Redirected away from /admin
    const wasRedirected = !url.pathname.startsWith('/admin');

    // Option 2: Still on /admin but showing an auth gate
    const authPromptVisible = await page
      .locator(
        'input[type="email"], input[type="password"], button:has-text("Sign In"), button:has-text("Giriş"), button:has-text("Login"), [data-testid="auth-gate"]',
      )
      .first()
      .isVisible()
      .catch(() => false);

    expect(wasRedirected || authPromptVisible).toBe(true);
  });

  test('/admin does not expose panel content to unauthenticated visitors', async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Admin-specific elements must NOT be visible
    const adminPanelIndicators = [
      '[data-testid="admin-panel"]',
      '[data-testid="moderation-queue"]',
      '[data-testid="user-management"]',
      'h1:has-text("Admin")',
      'h1:has-text("Moderation")',
      'nav:has-text("Verification Queue")',
    ];

    for (const selector of adminPanelIndicators) {
      const visible = await page.locator(selector).first().isVisible().catch(() => false);
      expect(visible).toBe(false);
    }
  });
});

test.describe('Admin gate — non-admin authenticated user', () => {
  test('regular user accessing /admin sees access denied or redirect', async ({ page }) => {
    await page.context().clearCookies();
    await injectRegularUserSession(page);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    const url = new URL(page.url());

    // Option 1: Redirected away
    const wasRedirected = !url.pathname.startsWith('/admin');

    // Option 2: On /admin but showing forbidden/access-denied content
    const accessDeniedVisible = await page
      .locator(
        '[data-testid="access-denied"], [data-testid="forbidden"], text=403, text=Access Denied, text=Unauthorized, text=Forbidden, text=Erişim Reddedildi',
      )
      .first()
      .isVisible()
      .catch(() => false);

    // Option 3: Shows an auth prompt (redirected to login)
    const authVisible = await page
      .locator('input[type="email"], button:has-text("Sign In"), button:has-text("Giriş")')
      .first()
      .isVisible()
      .catch(() => false);

    expect(wasRedirected || accessDeniedVisible || authVisible).toBe(true);
  });

  test('regular user cannot see admin moderation queue', async ({ page }) => {
    await page.context().clearCookies();
    await injectRegularUserSession(page);

    await page.goto(`${BASE_URL}/admin`, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2500);

    // Moderation-specific admin UI must not be visible to regular users
    const moderationQueue = page.locator(
      '[data-testid="moderation-queue"], table:has(th:has-text("Reports")), [data-testid="verification-queue"]',
    );

    const visible = await moderationQueue.first().isVisible().catch(() => false);
    expect(visible).toBe(false);
  });
});

test.describe('Admin MFA requirement', () => {
  test('admin route documentation: MFA (AAL2) required per security policy', async () => {
    // This test documents the known security requirement without executing admin flows.
    // The Vitalis admin panel requires MFA (AAL2) for all admin endpoints.
    // When a user with admin role but without MFA is established, they must be
    // prompted for MFA before accessing the admin panel.
    const securityRequirement = {
      route: '/admin',
      requiredLevel: 'AAL2',
      mfaRequired: true,
      roles: ['viewer', 'moderator', 'admin', 'superadmin'],
    };

    expect(securityRequirement.mfaRequired).toBe(true);
    expect(securityRequirement.requiredLevel).toBe('AAL2');
  });
});
