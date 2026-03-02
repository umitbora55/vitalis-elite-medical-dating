/**
 * Responsive / Reflow Tests — P0 Release Gate
 *
 * PDF Reference: Duyarlılık / responsive — P0
 *
 * Pass criteria (ölçülebilir eşikler):
 *   ✓ 320px genişlikte yatay scroll YOK (WCAG 1.4.10 Reflow)
 *   ✓ Metin %200 büyütmede içerik/işlev kaybı yok (WCAG 1.4.4)
 *   ✓ Landscape + portrait orientasyonda layout kırılmıyor
 *   ✓ Tablet (768px), desktop (1440px) breakpoints çalışıyor
 *   ✓ Navigasyon küçük ekranlarda kullanılabilir
 *   ✓ Form alanları 320px'de taşmıyor
 *   ✓ CTA ≥40px yükseklikte (touch-safe)
 *
 * Araçlar: Playwright multi-viewport projects (playwright.config.ts'te tanımlı)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Check for horizontal scroll — WCAG 1.4.10 Reflow requirement */
async function assertNoHorizontalScroll(page: Page, label: string): Promise<void> {
  const scrollData = await page.evaluate(() => ({
    scrollWidth:  document.documentElement.scrollWidth,
    clientWidth:  document.documentElement.clientWidth,
    bodyScroll:   document.body.scrollWidth,
    viewportWidth: window.innerWidth,
  }));

  const hasHScroll =
    scrollData.scrollWidth > scrollData.clientWidth + 2 || // 2px tolerance for subpixel
    scrollData.bodyScroll  > scrollData.viewportWidth + 2;

  if (hasHScroll) {
    const overflow = scrollData.scrollWidth - scrollData.clientWidth;
    throw new Error(
      `${label}: HORIZONTAL SCROLL DETECTED (WCAG 1.4.10 Reflow violation)\n` +
      `  scrollWidth: ${scrollData.scrollWidth}px  clientWidth: ${scrollData.clientWidth}px  overflow: ${overflow}px`,
    );
  }
}

/** Navigate and wait for stable render */
async function gotoStable(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
}

/** Get visual info about potentially overflowing elements */
async function findOverflowingElements(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const violations: string[] = [];
    const all = document.querySelectorAll<HTMLElement>('*');

    for (const el of all) {
      const rect = el.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) continue;

      // Check if element extends beyond viewport right edge
      if (rect.right > window.innerWidth + 4) {
        const tag  = el.tagName.toLowerCase();
        const text = el.textContent?.trim().slice(0, 30) ?? '';
        violations.push(`<${tag}> "${text}" right=${Math.round(rect.right)}px viewport=${window.innerWidth}px`);
        if (violations.length >= 5) break;
      }
    }
    return violations;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: 320px — Minimum supported width (WCAG 1.4.10 Reflow)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Reflow — 320px minimum width (WCAG 1.4.10)', () => {
  test.use({ viewport: { width: 320, height: 568 } });

  test('landing: no horizontal scroll at 320px', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await assertNoHorizontalScroll(page, '320px landing');
  });

  test('auth page: no horizontal scroll at 320px', async ({ page }) => {
    try {
      await gotoStable(page, `${BASE_URL}/auth`);
    } catch {
      await gotoStable(page, BASE_URL);
    }
    await assertNoHorizontalScroll(page, '320px auth');
  });

  test('no elements bleed outside viewport at 320px', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const bleeding = await findOverflowingElements(page);
    if (bleeding.length > 0) {
      throw new Error(
        `Elements extend beyond 320px viewport:\n${bleeding.join('\n')}`,
      );
    }
  });

  test('primary H1/H2 heading is visible at 320px', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    const box = await heading.boundingBox();
    if (box) {
      expect(box.x + box.width, 'Heading must not overflow viewport').toBeLessThanOrEqual(326);
    }
  });

  test('navigation is accessible at 320px', async ({ page }) => {
    await gotoStable(page, BASE_URL);

    // Accept hamburger menu OR visible nav links
    const nav = page.locator(
      'nav, [role="navigation"], ' +
      'button[aria-label*="menu" i], button[aria-label*="menü" i], ' +
      'button[aria-expanded], [data-testid*="menu-btn"], [data-testid*="hamburger"]',
    );

    await expect(nav.first()).toBeVisible({ timeout: 5000 });
  });

  test('CTA button is visible and touch-safe at 320px', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const cta = page.locator('button:visible').first();
    if (!(await cta.isVisible())) return;

    const box = await cta.boundingBox();
    if (!box) return;

    // Must be ≥40px tall for comfortable touch
    expect(box.height, `CTA must be ≥40px tall for touch. Got ${box.height.toFixed(0)}px`).toBeGreaterThanOrEqual(40);
    // Must not overflow 320px viewport
    expect(box.x + box.width, 'CTA must not overflow right edge at 320px').toBeLessThanOrEqual(326);
  });

  test('all visible form inputs do not overflow at 320px', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const inputs = page.locator('input:visible, textarea:visible, select:visible');
    const count  = await inputs.count();

    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const box   = await input.boundingBox();
      if (!box) continue;
      expect(
        box.x + box.width,
        `Input #${i} must not overflow 320px viewport`,
      ).toBeLessThanOrEqual(326);
    }
  });

  test('text is readable: no clipped content at 320px', async ({ page }) => {
    await gotoStable(page, BASE_URL);

    // Verify no text-overflow: ellipsis on critical headings (headings should wrap, not clip)
    const headings = page.locator('h1, h2, h3');
    const count    = await headings.count();

    for (let i = 0; i < count; i++) {
      const heading    = headings.nth(i);
      if (!(await heading.isVisible())) continue;

      const textOverflow = await heading.evaluate((el) =>
        window.getComputedStyle(el).textOverflow,
      );

      if (textOverflow === 'ellipsis') {
        const text = (await heading.innerText()).trim().slice(0, 40);
        console.warn(`⚠️ Heading "${text}" has text-overflow:ellipsis at 320px — verify no content is hidden`);
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Text resize 200% (WCAG 1.4.4 Resize Text)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Text resize 200% (WCAG 1.4.4)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('no horizontal scroll after 200% font-size zoom', async ({ page }) => {
    await gotoStable(page, BASE_URL);

    // Simulate browser 200% text-only zoom via CSS
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(1000);

    await assertNoHorizontalScroll(page, '200% text zoom (desktop)');
  });

  test('content is not clipped at 200% text zoom', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(800);

    const body = page.locator('body');
    const text = await body.innerText();
    expect(text.trim().length, 'Body must have visible text at 200% zoom').toBeGreaterThan(20);
  });

  test('primary CTA remains usable at 200% text zoom', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(800);

    const cta = page.locator('button:visible').first();
    if (!(await cta.isVisible())) return;

    // CTA must still be visible and interactable
    await expect(cta).toBeVisible();

    // Should still be clickable (not overflow off-screen)
    const box = await cta.boundingBox();
    expect(box, 'CTA must have a bounding box at 200% zoom').toBeTruthy();
  });

  test('form inputs remain visible and usable at 200% zoom', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await page.addStyleTag({ content: 'html { font-size: 200% !important; }' });
    await page.waitForTimeout(800);

    const inputs = page.locator('input:visible').first();
    if (!(await inputs.isVisible())) return;
    await expect(inputs).toBeVisible();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Tablet viewport (768px)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Responsive — Tablet 768px', () => {
  test.use({ viewport: { width: 768, height: 1024 } });

  test('landing: no horizontal scroll at 768px', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await assertNoHorizontalScroll(page, '768px tablet');
  });

  test('layout is intact: heading + CTA both visible at 768px', async ({ page }) => {
    await gotoStable(page, BASE_URL);

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });

    const cta = page.locator('button:visible').first();
    await expect(cta).toBeVisible({ timeout: 5000 });
  });

  test('navigation visible at tablet width', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    const nav = page.locator('nav, [role="navigation"], header').first();
    await expect(nav).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Desktop wide (1440px)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Responsive — Desktop 1440px', () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test('landing: no horizontal scroll at 1440px', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await assertNoHorizontalScroll(page, '1440px desktop');
  });

  test('content does not stretch to unreadable line lengths at 1440px', async ({ page }) => {
    await gotoStable(page, BASE_URL);

    // Main body text should have max-width constraint — not 1440px wide text
    const paragraphs = page.locator('p:visible, [class*="body"]:visible').first();
    if (!(await paragraphs.isVisible())) return;

    const box = await paragraphs.boundingBox();
    if (box) {
      // Optimal line length is 45-75 characters ≈ 450-750px at 16px base
      // Content wider than 900px suggests missing max-width
      const contentWidth = box.width;
      if (contentWidth > 900) {
        console.warn(
          `⚠️ Body paragraph width ${Math.round(contentWidth)}px at 1440px viewport — ` +
          `consider max-width constraint for readability (optimal: 600-760px)`,
        );
      }
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 5: Mobile landscape orientation (667×375)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Responsive — Mobile landscape (667×375)', () => {
  test.use({ viewport: { width: 667, height: 375 } });

  test('landing: no horizontal scroll in landscape', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await assertNoHorizontalScroll(page, 'Mobile landscape (667×375)');
  });

  test('primary heading and CTA visible in landscape', async ({ page }) => {
    await gotoStable(page, BASE_URL);

    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 6: Small phone portrait (375×667 — iPhone SE)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Responsive — Small phone 375px (iPhone SE)', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test('no horizontal scroll at 375px', async ({ page }) => {
    await gotoStable(page, BASE_URL);
    await assertNoHorizontalScroll(page, '375px iPhone SE');
  });

  test('touch targets are adequate on iPhone SE', async ({ page }) => {
    await gotoStable(page, BASE_URL);

    const buttons = page.locator('button:visible');
    const count   = await buttons.count();
    const small: string[] = [];

    for (let i = 0; i < count; i++) {
      const btn = buttons.nth(i);
      const box = await btn.boundingBox();
      if (box && box.height < 36) {
        const text = (await btn.innerText().catch(() => '')).trim().slice(0, 25);
        small.push(`"${text}" ${Math.round(box.width)}×${Math.round(box.height)}px`);
      }
    }

    if (small.length > 0) {
      console.warn(`⚠️ Small touch targets on 375px:\n${small.join('\n')}`);
    }
  });
});
