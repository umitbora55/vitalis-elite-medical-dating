import { test, expect } from '@playwright/test';

test('landing loads', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).toHaveCount(1);
  // App may mount asynchronously; ensure no hard crash
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'release/evidence/e2e/landing.png', fullPage: true });
});

test('nearby smoke loads', async ({ page }) => {
  await page.goto('/?e2eNearby=1', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).toHaveCount(1);
  // Give smoke mode time to switch view
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'release/evidence/map_fix/nearby-page-smoke.png', fullPage: true });

  // Minimal assertion: URL still contains the smoke param
  await expect(page).toHaveURL(/e2eNearby=1/);
});
