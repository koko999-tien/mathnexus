import { expect, test, type Page } from '@playwright/test';

const CORE_ROUTES = [
  '/',
  '/library',
  '/map?concept=derivative-definition',
  '/practice',
  '/graph',
  '/calculus',
  '/simulations/gravity',
  '/ai',
  '/canvas',
  '/progress',
] as const;

async function semanticViolations(page: Page) {
  return page.evaluate(() => {
    const visible = (element: Element) => {
      const node = element as HTMLElement;
      const style = window.getComputedStyle(node);
      return style.display !== 'none'
        && style.visibility !== 'hidden'
        && style.opacity !== '0'
        && element.getClientRects().length > 0;
    };

    const textByIds = (ids: string | null) => (ids || '')
      .split(/\s+/)
      .filter(Boolean)
      .map(id => document.getElementById(id)?.textContent?.trim() || '')
      .filter(Boolean)
      .join(' ')
      .trim();

    const accessibleName = (element: Element) => {
      const ariaLabel = element.getAttribute('aria-label')?.trim();
      if (ariaLabel) return ariaLabel;

      const labelledBy = textByIds(element.getAttribute('aria-labelledby'));
      if (labelledBy) return labelledBy;

      if (element instanceof HTMLInputElement && element.type === 'image') {
        const alt = element.alt?.trim();
        if (alt) return alt;
      }

      if (
        element instanceof HTMLInputElement
        || element instanceof HTMLSelectElement
        || element instanceof HTMLTextAreaElement
      ) {
        const labels = [...(element.labels || [])]
          .map(label => label.textContent?.trim() || '')
          .filter(Boolean)
          .join(' ')
          .trim();
        if (labels) return labels;
        const placeholder = element.getAttribute('placeholder')?.trim();
        if (placeholder) return placeholder;
      }

      const title = element.getAttribute('title')?.trim();
      if (title) return title;

      return element.textContent?.replace(/\s+/g, ' ').trim() || '';
    };

    const describe = (element: Element) => {
      const id = element.id ? '#' + element.id : '';
      const cls = element.classList.length ? '.' + [...element.classList].slice(0, 3).join('.') : '';
      return element.tagName.toLowerCase() + id + cls;
    };

    const violations: string[] = [];

    const main = document.querySelector('main#main-content');
    if (!main) violations.push('missing main#main-content landmark');

    const h1s = main ? [...main.querySelectorAll('h1')].filter(visible) : [];
    if (h1s.length !== 1) violations.push('expected exactly one visible h1 in main, found ' + h1s.length);

    const ids = [...document.querySelectorAll('[id]')].map(element => element.id).filter(Boolean);
    const duplicates = [...new Set(ids.filter((id, index) => ids.indexOf(id) !== index))];
    if (duplicates.length) violations.push('duplicate ids: ' + duplicates.join(', '));

    const interactive = [
      ...document.querySelectorAll('button, a[href], input:not([type="hidden"]), select, textarea'),
    ].filter(visible);

    for (const element of interactive) {
      if (!accessibleName(element)) violations.push('unnamed interactive element: ' + describe(element));
    }

    const images = [...document.querySelectorAll('img')].filter(visible);
    for (const image of images) {
      if (!image.hasAttribute('alt')) violations.push('image missing alt attribute: ' + describe(image));
    }

    const forms = [
      ...document.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'),
    ].filter(visible);

    for (const element of forms) {
      const hasProgrammaticLabel =
        Boolean(element.getAttribute('aria-label')?.trim())
        || Boolean(textByIds(element.getAttribute('aria-labelledby')))
        || Boolean((element as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement).labels?.length);
      if (!hasProgrammaticLabel) violations.push('form control missing programmatic label: ' + describe(element));
    }

    return violations;
  });
}

test('core routes satisfy the semantic accessibility contract', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Semantic audit only needs one rendering engine; mobile behavior is covered separately.');

  for (const route of CORE_ROUTES) {
    await page.goto(route);
    await expect(page.getByText('Đang mở góc học tập…')).not.toBeVisible();
    await expect(page.locator('html')).toHaveAttribute('lang', /^vi(?:-|$)/);
    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page).toHaveTitle(/MathNexus/);

    const violations = await semanticViolations(page);
    expect(violations, 'Accessibility contract failed on ' + route + ':\n' + violations.join('\n')).toEqual([]);
  }
});

test('skip link and client-side route changes put keyboard focus on main content', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'Keyboard focus behavior is verified on desktop Chromium.');

  await page.goto('/');
  await expect.poll(() => page.evaluate(() => document.activeElement === document.body)).toBe(true);
  await page.keyboard.press('Tab');

  const skipLink = page.getByRole('link', { name: 'Đi đến nội dung chính' });
  await expect(skipLink).toBeFocused();
  await expect(skipLink).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(page.locator('#main-content')).toBeFocused();

  await page.getByRole('navigation', { name: 'Điều hướng chính' })
    .getByRole('link', { name: 'Tiến độ học tập' })
    .click();

  await expect(page).toHaveURL(/\/progress$/);
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1, name: 'Tiến độ học tập' })).toBeVisible();
});

test('mobile navigation dialog has a name and keeps content reachable', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'This contract is specific to compact/mobile navigation.');

  await page.goto('/');
  await page.getByRole('button', { name: 'Mở menu' }).click();

  const drawer = page.getByRole('dialog', { name: 'MathNexus', exact: true });
  await expect(drawer).toBeVisible();
  await expect(drawer.getByRole('link', { name: 'Luyện tập' })).toBeVisible();

  await drawer.getByRole('link', { name: 'Luyện tập' }).click();
  await expect(drawer).not.toBeVisible();
  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page.getByRole('heading', { level: 1, name: 'Luyện tập thích ứng' })).toBeVisible();
});
