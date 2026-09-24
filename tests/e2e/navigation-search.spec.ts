import { expect, test } from '@playwright/test';

test.use({ serviceWorkers: 'block' });

async function openSearch(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  const input = page.getByRole('textbox', { name: 'Tìm kiếm toàn bộ MathNexus' });
  await expect(input).toBeFocused();
  return input;
}

test('search supports keyboard selection, clearing and focus restoration', async ({ page }) => {
  await page.goto('/graph');
  const input = await openSearch(page);
  await input.fill('dao ham');
  const results = page.locator('.global-search-dialog .search-result');
  await expect(results.first()).toBeVisible();
  await input.press('ArrowDown');
  await expect(results.first()).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(results.nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(results.first()).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(input).toBeFocused();
  await page.getByRole('button', { name: 'Xóa từ khóa' }).click();
  await expect(input).toHaveValue('');
  await expect(input).toBeFocused();
  await input.fill('dao ham');
  const href = await results.first().getAttribute('href');
  await input.press('Enter');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect.poll(() => new URL(page.url()).pathname + new URL(page.url()).search).toBe(href);
  await expect(page.locator('#main-content')).toBeFocused();
  await openSearch(page);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Tìm kiếm', exact: true })).toBeFocused();
});

test('search stays open on dialog padding and closes on the backdrop', async ({ page }) => {
  await page.goto('/graph');
  await openSearch(page);
  const dialog = page.getByRole('dialog');
  const bounds = await dialog.boundingBox();
  expect(bounds).not.toBeNull();
  await page.mouse.click(bounds!.x + 3, bounds!.y + bounds!.height / 2);
  await expect(dialog).toBeVisible();
  await page.mouse.click(2, 2);
  await expect(dialog).not.toBeVisible();
});

test('detail pages retain their section and a useful page title', async ({ page, isMobile }) => {
  await page.goto('/lesson/der');
  await expect(page).toHaveTitle('Bài học · MathNexus');
  if (isMobile) await page.getByRole('button', { name: 'Mở menu' }).click();
  const nav = isMobile ? page.getByRole('dialog').getByRole('navigation') : page.getByRole('navigation', { name: 'Điều hướng chính' });
  await expect(nav.getByRole('link', { name: 'Thư viện kiến thức' })).toHaveClass(/is-active/);
});

test('a failed route does not trap the user when returning home', async ({ page }) => {
  await page.route('**/assets/Calculus-*.js', route => route.abort());
  await page.goto('/calculus');
  await expect(page.getByRole('heading', { name: 'Trang chưa tải được' })).toBeVisible();
  await page.getByRole('link', { name: 'Về trang chủ', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Cập nhật tài liệu, tìm kiếm và học toán');
});

test('long search text stays inside the dialog at narrow widths', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await page.goto('/graph');
  const input = await openSearch(page);
  await input.fill('z'.repeat(250));
  await expect(page.getByText('Chưa có mục nào khớp trực tiếp')).toBeVisible();
  expect(await page.getByRole('dialog').evaluate(element => element.scrollWidth <= element.clientWidth)).toBe(true);
  await page.getByRole('link', { name: /Hỏi trợ lý toán học/ }).click();
  await expect(page).toHaveURL(/\/ai\?q=z+/);
});
