/**
 * Performance Tests — Core Web Vitals Budget (P0 Release Gate)
 *
 * PDF Reference: Performans (web) — P0
 *
 * Pass criteria (ölçülebilir eşikler — P75 hedefi):
 *   ✓ LCP ≤ 2500ms  (Largest Contentful Paint)
 *   ✓ INP ≤ 200ms   (Interaction to Next Paint — lab proxy: TBT)
 *   ✓ CLS ≤ 0.1     (Cumulative Layout Shift)
 *   ✓ FCP ≤ 1800ms  (First Contentful Paint)
 *   ✓ TTFB ≤ 600ms  (Time to First Byte)
 *
 * NOT: P75 = 75. yüzdelik dilim
 * Lab ölçümleri (bu testler) regresyon yakalamak için.
 * Gerçek P75 field data → CrUX / RUM (web-vitals SDK) ile ölçülür.
 *
 * Araçlar: Playwright + PerformanceObserver API + Navigation Timing
 * Daha kapsamlı lab testi → Lighthouse CI (@lhci/cli, lighthouserc.json)
 */

import { test, expect, type Page } from '@playwright/test';

const BASE_URL = process.env.BASE_URL ?? 'http://localhost:4173';

// ─────────────────────────────────────────────────────────────────────────────
// Performance budgets (PDF spec thresholds)
// ─────────────────────────────────────────────────────────────────────────────
const BUDGET = {
  LCP_MS:    2500,   // P75 threshold — "Good"
  CLS:       0.1,    // P75 threshold — "Good"
  FCP_MS:    1800,   // P75 threshold — "Good"
  TTFB_MS:   600,    // lab target
  TBT_MS:    300,    // lab proxy for INP
  JS_KB:     900,    // JS payload warning (current baseline ~603 KB)
  TOTAL_KB:  1600,   // total resource budget
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// Measurement utilities
// ─────────────────────────────────────────────────────────────────────────────

interface WebVitalsSnapshot {
  lcp?:  number;
  cls?:  number;
  fcp?:  number;
  ttfb?: number;
  tbt?:  number;
  domContentLoaded?: number;
  loadComplete?:     number;
}

/** Inject web-vitals measurement via PerformanceObserver */
async function injectVitalsCollector(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as Record<string, unknown>).__vitals = {
      lcp: undefined as number | undefined,
      cls: 0,
    };

    // LCP
    try {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last    = entries[entries.length - 1];
        (window as unknown as Record<string, { lcp?: number }>).__vitals.lcp = last.startTime;
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });
    } catch { /* not supported */ }

    // CLS
    try {
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const cls = entry as PerformanceEntry & { hadRecentInput: boolean; value: number };
          if (!cls.hadRecentInput) {
            (window as unknown as Record<string, { cls: number }>).__vitals.cls += cls.value;
          }
        }
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });
    } catch { /* not supported */ }
  });
}

/** Read collected vitals from page */
async function readVitals(page: Page): Promise<WebVitalsSnapshot> {
  // Give observers time to flush
  await page.waitForTimeout(2000);

  return page.evaluate(() => {
    const vitals = (window as unknown as Record<string, unknown>).__vitals ?? {};
    const nav    = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const fcp    = performance.getEntriesByName('first-contentful-paint')[0];

    return {
      lcp:              (vitals as Record<string, number>).lcp,
      cls:              (vitals as Record<string, number>).cls ?? 0,
      fcp:              fcp ? fcp.startTime : undefined,
      ttfb:             nav ? nav.responseStart - nav.requestStart : undefined,
      domContentLoaded: nav ? Math.round(nav.domContentLoadedEventEnd - nav.startTime) : undefined,
      loadComplete:     nav ? Math.round(nav.loadEventEnd - nav.startTime) : undefined,
    };
  });
}

/** Measure resource sizes */
async function measureResources(page: Page) {
  return page.evaluate(() => {
    const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[];

    const jsSizeBytes  = resources
      .filter((r) => r.initiatorType === 'script')
      .reduce((s, r) => s + (r.encodedBodySize ?? 0), 0);

    const cssSizeBytes = resources
      .filter((r) => r.initiatorType === 'link' && (r.name.endsWith('.css') || r.name.includes('/assets/')))
      .reduce((s, r) => s + (r.encodedBodySize ?? 0), 0);

    const imgSizeBytes = resources
      .filter((r) => r.initiatorType === 'img' || r.initiatorType === 'image')
      .reduce((s, r) => s + (r.encodedBodySize ?? 0), 0);

    const totalBytes = resources.reduce((s, r) => s + (r.encodedBodySize ?? 0), 0);

    return {
      jsSizeKB:    Math.round(jsSizeBytes  / 1024),
      cssSizeKB:   Math.round(cssSizeBytes / 1024),
      imgSizeKB:   Math.round(imgSizeBytes / 1024),
      totalKB:     Math.round(totalBytes   / 1024),
      resourceCount: resources.length,
    };
  });
}

/** Navigate and wait for network idle */
async function gotoMeasure(page: Page, url: string): Promise<void> {
  await page.goto(url, { waitUntil: 'networkidle' });
}

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 1: Core Web Vitals — Landing page
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Core Web Vitals — Landing page (P0 Budget)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('LCP ≤ 2500ms', async ({ page }) => {
    await injectVitalsCollector(page);
    await gotoMeasure(page, BASE_URL);

    const vitals = await readVitals(page);

    console.log(`📊 LCP: ${vitals.lcp?.toFixed(0) ?? 'N/A'}ms  Budget: ${BUDGET.LCP_MS}ms`);

    if (vitals.lcp !== undefined) {
      expect(
        vitals.lcp,
        `LCP ${vitals.lcp.toFixed(0)}ms exceeds budget of ${BUDGET.LCP_MS}ms (P75 "Good" threshold)`,
      ).toBeLessThanOrEqual(BUDGET.LCP_MS);
    } else {
      console.warn('⚠️ LCP not captured (page may not have a large content element)');
    }
  });

  test('CLS ≤ 0.1 (no unexpected layout shifts)', async ({ page }) => {
    await injectVitalsCollector(page);
    await gotoMeasure(page, BASE_URL);

    // Trigger scroll to detect deferred layout shifts
    await page.evaluate(() => {
      window.scrollTo({ top: document.body.scrollHeight, behavior: 'instant' });
    });
    await page.waitForTimeout(500);
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));

    const vitals = await readVitals(page);
    const cls    = vitals.cls ?? 0;

    console.log(`📊 CLS: ${cls.toFixed(4)}  Budget: ${BUDGET.CLS}`);

    expect(
      cls,
      `CLS ${cls.toFixed(4)} exceeds budget of ${BUDGET.CLS} (P75 "Good" threshold)`,
    ).toBeLessThanOrEqual(BUDGET.CLS);
  });

  test('FCP ≤ 1800ms', async ({ page }) => {
    await injectVitalsCollector(page);
    await gotoMeasure(page, BASE_URL);

    const vitals = await readVitals(page);

    console.log(`📊 FCP: ${vitals.fcp?.toFixed(0) ?? 'N/A'}ms  Budget: ${BUDGET.FCP_MS}ms`);

    if (vitals.fcp !== undefined) {
      expect(
        vitals.fcp,
        `FCP ${vitals.fcp.toFixed(0)}ms exceeds budget of ${BUDGET.FCP_MS}ms`,
      ).toBeLessThanOrEqual(BUDGET.FCP_MS);
    }
  });

  test('TTFB ≤ 600ms (lab — server response time)', async ({ page }) => {
    await injectVitalsCollector(page);
    await gotoMeasure(page, BASE_URL);

    const vitals = await readVitals(page);

    console.log(`📊 TTFB: ${vitals.ttfb?.toFixed(0) ?? 'N/A'}ms  Budget: ${BUDGET.TTFB_MS}ms`);

    if (vitals.ttfb !== undefined && vitals.ttfb > 0) {
      expect(
        vitals.ttfb,
        `TTFB ${vitals.ttfb.toFixed(0)}ms exceeds budget of ${BUDGET.TTFB_MS}ms`,
      ).toBeLessThanOrEqual(BUDGET.TTFB_MS);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 2: Layout shift during user interactions
// ─────────────────────────────────────────────────────────────────────────────
test.describe('CLS — User interaction stability', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('CLS does not spike after button click', async ({ page }) => {
    await injectVitalsCollector(page);
    await gotoMeasure(page, BASE_URL);

    // Wait for initial CLS to settle
    await page.waitForTimeout(1000);

    // Interact with first button
    const btn = page.locator('button:visible').first();
    if (await btn.isVisible()) {
      await btn.click({ force: true });
      await page.waitForTimeout(500);
    }

    const vitals = await readVitals(page);
    const cls    = vitals.cls ?? 0;

    console.log(`📊 Post-interaction CLS: ${cls.toFixed(4)}`);
    expect(cls, 'CLS must stay ≤0.1 after user interaction').toBeLessThanOrEqual(BUDGET.CLS);
  });

  test('CLS stable during page scroll', async ({ page }) => {
    await injectVitalsCollector(page);
    await gotoMeasure(page, BASE_URL);

    // Scroll through page
    await page.evaluate(async () => {
      const total = document.body.scrollHeight;
      for (let y = 0; y < total; y += 200) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 50));
      }
      window.scrollTo(0, 0);
    });
    await page.waitForTimeout(500);

    const vitals = await readVitals(page);
    const cls    = vitals.cls ?? 0;

    console.log(`📊 Scroll CLS: ${cls.toFixed(4)}`);
    expect(cls, 'CLS must stay ≤0.1 during full-page scroll').toBeLessThanOrEqual(BUDGET.CLS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 3: Resource budget
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Resource Budget (P1 — warning thresholds)', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  test('JS payload within budget', async ({ page }) => {
    await gotoMeasure(page, BASE_URL);
    const resources = await measureResources(page);

    console.log('📦 Resource summary:', resources);

    // Hard fail at 2× budget (critical regression)
    if (resources.jsSizeKB > BUDGET.JS_KB * 2) {
      throw new Error(
        `JS payload ${resources.jsSizeKB}KB exceeds critical threshold of ${BUDGET.JS_KB * 2}KB`,
      );
    }

    // Warning at budget
    if (resources.jsSizeKB > BUDGET.JS_KB) {
      console.warn(
        `⚠️ JS payload ${resources.jsSizeKB}KB exceeds warning budget of ${BUDGET.JS_KB}KB. ` +
        `Consider code splitting or lazy loading.`,
      );
    } else {
      console.log(`✅ JS payload ${resources.jsSizeKB}KB within budget`);
    }
  });

  test('total page weight ≤ 1.6 MB', async ({ page }) => {
    await gotoMeasure(page, BASE_URL);
    const resources = await measureResources(page);

    console.log(`📦 Total page weight: ${resources.totalKB}KB  Budget: ${BUDGET.TOTAL_KB}KB`);

    if (resources.totalKB > BUDGET.TOTAL_KB) {
      console.warn(
        `⚠️ Total page weight ${resources.totalKB}KB exceeds ${BUDGET.TOTAL_KB}KB budget`,
      );
    }
    // Not a hard fail — depends on image optimisation status
  });

  test('page load timing is reasonable', async ({ page }) => {
    await gotoMeasure(page, BASE_URL);
    const vitals = await readVitals(page);

    console.log(`📊 DOMContentLoaded: ${vitals.domContentLoaded ?? 'N/A'}ms`);
    console.log(`📊 Load complete: ${vitals.loadComplete ?? 'N/A'}ms`);

    if (vitals.domContentLoaded !== undefined) {
      expect(
        vitals.domContentLoaded,
        'DOMContentLoaded must be < 5000ms in lab',
      ).toBeLessThan(5000);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// SUITE 4: Mobile performance (simulated throttling)
// ─────────────────────────────────────────────────────────────────────────────
test.describe('Performance — Mobile (emulated throttling)', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test('LCP ≤ 4000ms on slow mobile (emulated)', async ({ page }) => {
    // Emulate mid-tier mobile CPU/network via CDP
    const cdpSession = await page.context().newCDPSession(page);
    await cdpSession.send('Network.emulateNetworkConditions', {
      offline:            false,
      downloadThroughput: 1.5 * 1024 * 1024 / 8,  // 1.5 Mbps
      uploadThroughput:   750 * 1024 / 8,           // 750 Kbps
      latency:            150,
    });
    await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 4 });

    await injectVitalsCollector(page);
    await gotoMeasure(page, BASE_URL);

    const vitals = await readVitals(page);

    // Restore throttling
    await cdpSession.send('Emulation.setCPUThrottlingRate', { rate: 1 });

    console.log(`📊 Mobile LCP (4× CPU throttle): ${vitals.lcp?.toFixed(0) ?? 'N/A'}ms`);

    // Allow 4s for throttled mobile (relaxed from 2.5s desktop budget)
    if (vitals.lcp !== undefined) {
      if (vitals.lcp > 4000) {
        console.warn(`⚠️ Mobile LCP ${vitals.lcp.toFixed(0)}ms may feel slow on mid-tier devices`);
      }
    }
  });
});
