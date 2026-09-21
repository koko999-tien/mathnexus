import { expect, test } from '@playwright/test';

test('PWA lazy-caches Math Cosmos after first visit and keeps it available offline', async ({ page, context }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Service-worker cache policy is verified once on desktop Chromium.');

  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller));

  const initialCacheUrls = await page.evaluate(async () => {
    const urls: string[] = [];
    for (const cacheName of await caches.keys()) {
      const cache = await caches.open(cacheName);
      for (const request of await cache.keys()) urls.push(request.url);
    }
    return urls;
  });

  expect(initialCacheUrls.some(url => /\/assets\/MathCosmos-[^/]+\.js$/.test(url))).toBe(false);
  expect(initialCacheUrls.some(url => /\/assets\/react-three-fiber\.esm-[^/]+\.js$/.test(url))).toBe(false);

  await page.goto('/cosmos');
  await expect(page.getByRole('heading', { name: 'Vũ trụ tri thức toán học 3D' })).toBeVisible();
  await expect(page.getByTestId('math-cosmos-canvas')).toBeVisible();

  const cosmosResources = await page.evaluate(() =>
    performance.getEntriesByType('resource')
      .map(entry => entry.name)
      .filter(url =>
        /\/assets\/MathCosmos-[^/]+\.js$/.test(url)
        || /\/assets\/react-three-fiber\.esm-[^/]+\.js$/.test(url),
      ),
  );

  expect(cosmosResources.some(url => /\/assets\/MathCosmos-[^/]+\.js$/.test(url))).toBe(true);
  expect(cosmosResources.some(url => /\/assets\/react-three-fiber\.esm-[^/]+\.js$/.test(url))).toBe(true);

  await page.waitForTimeout(500);
  await context.setOffline(true);
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Vũ trụ tri thức toán học 3D' })).toBeVisible();
  await expect(page.getByTestId('math-cosmos-canvas')).toBeVisible();

  await context.setOffline(false);
});
