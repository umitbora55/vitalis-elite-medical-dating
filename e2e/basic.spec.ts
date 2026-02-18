import { test, expect } from '@playwright/test';

test('landing renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('VITALIS')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply Now' })).toBeVisible();
});

test('nearby map page renders list with seeded deterministic data', async ({ page }) => {
  await page.goto('/?e2eNearby=1');

  await expect(page.getByRole('heading', { name: 'Nearby Active' })).toBeVisible();
  await expect(page.getByText('Smoke Nearby Alpha')).toBeVisible();
  await expect(page.getByText('Smoke Nearby Beta')).toBeVisible();
  await page.screenshot({ path: 'release/evidence/map_fix/nearby-page-smoke.png', fullPage: true });
});
