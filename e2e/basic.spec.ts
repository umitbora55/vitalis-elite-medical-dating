import { test, expect } from '@playwright/test';

test('landing renders', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('VITALIS')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Apply Now' })).toBeVisible();
});
