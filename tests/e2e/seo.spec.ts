import { test, expect } from '@playwright/test';

const SITE = 'https://mathnexus-three.vercel.app';

test('deep lesson content and per-route metadata stay crawlable', async ({ page }) => {
  await page.goto('/lesson/trig');
  await expect(page).toHaveTitle('Đường tròn lượng giác · MathNexus');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/lesson/trig`);
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'index,follow');
  const description = await page.locator('meta[name="description"]').getAttribute('content');
  expect(description?.length).toBeGreaterThan(80);
  expect(description?.length).toBeLessThanOrEqual(158);
  const words = (await page.locator('.lesson-body').innerText()).split(/\s+/).filter(Boolean);
  expect(words.length).toBeGreaterThanOrEqual(150);
  await expect(page.locator('.lesson-body h2')).toHaveCount(3);

  await page.goto('/privacy');
  await expect(page).toHaveTitle('Quyền riêng tư · MathNexus');
  await expect(page.getByRole('heading', { level: 1, name: 'Dữ liệu học tập của bạn' })).toBeVisible();
  await page.getByRole('link', { name: 'Điều khoản', exact: true }).click();
  await expect(page).toHaveTitle('Điều khoản sử dụng · MathNexus');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${SITE}/terms`);

  await page.goto('/progress');
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,nofollow');

  await page.goto('/this-route-does-not-exist');
  await expect(page.getByRole('heading', { name: 'Chưa tìm thấy trang này' })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex,follow');
});
