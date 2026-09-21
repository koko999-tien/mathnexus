import { test, expect } from '@playwright/test';

test('dashboard, theme and complete navigation work at every screen size', async ({ page, isMobile }, info) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Một ngày mới');
  await expect(page.getByRole('heading', { name: 'Kế hoạch hôm nay' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('dashboard.png'), fullPage: true });
  await page.getByRole('button', { name: 'Bật giao diện tối' }).click();
  await expect(page.locator('html')).toHaveClass('dark');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Bật giao diện sáng' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('dashboard-dark.png'), fullPage: true });
  if (isMobile) {
    await page.getByRole('button', { name: 'Mở menu' }).click();
    const drawer = page.getByRole('dialog', { name: 'MathNexus', exact: true });
    await expect(drawer.getByRole('link')).toHaveCount(11);
    await drawer.getByRole('link', { name: 'Tiến độ học tập' }).click();
    await expect(drawer).not.toBeVisible();
  } else await page.getByRole('navigation', { name: 'Điều hướng chính' }).getByRole('link', { name: 'Tiến độ học tập' }).click();
  await expect(page.getByRole('heading', { name: 'Tiến độ học tập', exact: true })).toBeVisible();
  expect(errors).toEqual([]);
});


test('dashboard recommendations and knowledge map adapt to learning history', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('mathnexus_progress', JSON.stringify({
      lessonsRead: ['der'],
      questionsDone: 0,
      booksOpened: [],
      streak: 0,
      lastDate: '',
      dailyGoal: 5,
      displayName: 'Bạn học Toán',
      questionsCorrect: 0,
      lastLesson: 'der',
      activity: {},
    }));
  });
  await page.reload();

  await expect(page.getByRole('heading', { name: 'Nên học gì tiếp?' })).toBeVisible();
  const recommendations = page.locator('.lesson-grid').first();
  await expect(recommendations.getByRole('link', { name: /Giới hạn/ })).toBeVisible();

  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Theo chuyên đề' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Tiến độ Giải tích' })).toHaveAttribute('aria-valuenow', '25');
  await expect(page.getByText('14 ngày gần đây')).toBeVisible();
});

test('search without accents opens lessons and completion survives reload', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').fill('dao ham');
  await dialog.getByRole('link', { name: 'Bài học Đạo hàm THPT · Giải tích', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Đạo hàm', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Đánh dấu đã đọc' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Đã hoàn thành' })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('status').filter({ hasText: 'Đã hoàn thành' })).toBeVisible();
  await page.goto('/progress');
  await expect(page.locator('.stat-card').filter({ hasText: 'Bài học hoàn thành' })).toContainText('1/28');
  await expect(page.locator('.stat-card').filter({ hasText: 'Ngày học liên tiếp' })).toContainText('1');
});

test('natural-language search ranks relevant knowledge and can hand the question to AI', async ({ page }) => {
  const query = 'mình đang yếu đạo hàm nên học gì trước';
  await page.goto('/');
  await page.getByRole('button', { name: 'Tìm kiếm', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').fill(query);
  await expect(dialog.locator('.search-result').first()).toContainText('Đạo hàm');
  await dialog.getByRole('link', { name: new RegExp('Hỏi MathNexus AI') }).click();
  await expect(page).toHaveURL(/\/ai\?q=/);
  await expect(page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý' })).toHaveValue(query);
});

test('library filters have a useful empty state and can be cleared', async ({ page }) => {
  await page.goto('/library');
  await page.getByRole('textbox', { name: 'Tìm bài học' }).fill('khongcotrongthuvien');
  await expect(page.getByRole('heading', { name: 'Chưa có bài học phù hợp' })).toBeVisible();
  await page.getByRole('button', { name: 'Xóa bộ lọc' }).click();
  await expect(page.locator('.lesson-card')).toHaveCount(28);
  await page.getByLabel('Cấp học').selectOption('THCS');
  await expect(page.locator('.lesson-card')).toHaveCount(2);
  await page.reload();
  await expect(page.getByLabel('Cấp học')).toHaveValue('THCS');
});

test('quiz scores a complete session once per answer and persists results', async ({ page }) => {
  await page.goto('/practice?cat=' + encodeURIComponent('Tổ hợp'));
  await expect(page.getByRole('button', { name: 'Câu tiếp theo' })).toBeDisabled();
  await page.getByRole('button', { name: 'A 10', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Chính xác');
  await expect(page.getByRole('button', { name: 'A 10', exact: true })).toBeDisabled();
  await page.getByRole('button', { name: 'Câu tiếp theo' }).click();
  await page.getByRole('button', { name: 'A 25', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Chưa đúng');
  await page.getByRole('button', { name: 'Xem kết quả' }).click();
  await expect(page.getByRole('heading', { name: 'Bạn đã làm đúng 1/2 câu!' })).toBeVisible();
  await page.getByRole('link', { name: 'Xem tiến độ' }).click();
  await expect(page.locator('.stat-card').filter({ hasText: 'Câu hỏi đã luyện' })).toContainText('2');
  await expect(page.locator('.stat-card').filter({ hasText: 'Tỷ lệ trả lời đúng' })).toContainText('50%');
});


test('adaptive practice remembers weak questions and filters by difficulty', async ({ page }) => {
  await page.goto('/practice?cat=' + encodeURIComponent('Tổ hợp'));
  await expect(page.getByRole('heading', { name: 'Luyện tập thích ứng' })).toBeVisible();
  await expect(page.getByLabel('Độ khó luyện tập')).toHaveValue('Tất cả');

  await page.getByRole('button', { name: 'B 20', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('được thêm vào vùng cần ôn');
  await expect(page.locator('.review-card')).toContainText('1');

  await page.getByRole('button', { name: 'Câu tiếp theo' }).click();
  await page.getByRole('button', { name: 'C 120', exact: true }).click();
  await page.getByRole('button', { name: 'Xem kết quả' }).click();
  await expect(page.getByRole('link', { name: 'Ôn câu yếu' })).toBeVisible();

  await page.getByRole('link', { name: 'Ôn câu yếu' }).click();
  await expect(page).toHaveURL(/mode=review/);
  await expect(page.getByText('Đây là một câu MathNexus chọn lại vì bạn từng vấp ở đây.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'C(5,2) bằng?' })).toBeVisible();

  await page.getByLabel('Độ khó luyện tập').selectOption('Vừa');
  await expect(page).not.toHaveURL(/mode=review/);
  await expect(page.getByText('0 câu phù hợp với bộ lọc hiện tại.')).toBeVisible();
});

test('interactive graph draws immediately and validates math inputs', async ({ page }, info) => {
  await page.goto('/graph');
  const path = page.getByTestId('function-path');
  await expect(path).toHaveAttribute('d', /^M/);
  const initial = await path.getAttribute('d');
  await page.getByLabel('Hệ số a', { exact: true }).fill('2');
  await expect(path).not.toHaveAttribute('d', initial!);
  await expect(page.locator('.graph-probe output')).toContainText('1');
  await page.screenshot({ path: info.outputPath('graph.png'), fullPage: true });
  await page.goto('/tools');
  const equation = page.getByRole('region', { name: 'Giải phương trình' });
  await equation.getByLabel('a', { exact: true }).fill('0');
  await expect(equation.locator('output')).toContainText('bậc nhất');
  await expect(equation.locator('output')).not.toContainText('Infinity');
  const percent = page.getByRole('region', { name: 'Tỷ lệ phần trăm' });
  await percent.getByLabel('b', { exact: true }).fill('0');
  await expect(percent.locator('output')).toContainText('phải khác 0');
  const combination = page.getByRole('region', { name: 'Tổ hợp & chỉnh hợp' });
  await combination.getByLabel('n', { exact: true }).fill('1000000000');
  await expect(combination.locator('output')).toContainText('0 ≤ k ≤ n ≤ 170');
});

test('notes, personal goals and exported backup are usable', async ({ page }) => {
  await page.goto('/notebook');
  await page.getByRole('textbox', { name: 'Nội dung sổ tay' }).fill('Đạo hàm của x² bằng 2x.');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Nội dung sổ tay' })).toHaveValue('Đạo hàm của x² bằng 2x.');
  await page.goto('/progress');
  await page.getByLabel('Tên hiển thị').fill('Tiến');
  await page.getByLabel('Mục tiêu câu hỏi mỗi ngày').fill('3');
  await page.getByRole('button', { name: 'Lưu thay đổi' }).click();
  await expect(page.getByRole('status')).toContainText('Đã lưu');
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Tải bản sao lưu' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^mathnexus-.*\.json$/);
  await page.goto('/');
  await expect(page.getByText('Chào Tiến,')).toBeVisible();
  await expect(page.locator('.stat-card').filter({ hasText: 'Mục tiêu hôm nay' })).toContainText('0/3');
});

test('AI shows local fallback when the server is unavailable', async ({ page }) => {
  await page.route('**/api/gemini', route => route.fulfill({ status: 503, json: { code: 'MISSING_API_KEY' } }));
  await page.goto('/ai');
  await page.getByRole('button', { name: 'Số phức là gì?' }).click();
  await expect(page.getByText('Tra cứu cục bộ · Không phải câu trả lời từ Gemini')).toBeVisible();
  await expect(page.locator('.chat-links').getByRole('link', { name: 'Số phức', exact: true })).toBeVisible();
});

test('AI renders a successful Gemini math response', async ({ page }) => {
  await page.route('**/api/gemini', route => route.fulfill({ status: 200, json: { text: 'Đáp án là $2+2=4$.' } }));
  await page.goto('/ai');
  await page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý' }).fill('2+2 bằng mấy?');
  await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
  await expect(page.locator('.chat-message').last()).toContainText('Đáp án là');
  await expect(page.locator('.chat-message').last().locator('.katex')).toBeVisible();
});

test('every route fits the viewport and has no client-side errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/library', '/books', '/book/unknown', '/think', '/practice', '/graph', '/tools', '/formulas', '/formula/deMoivre', '/ai', '/notebook', '/progress', '/does-not-exist']) {
    await page.goto(route);
    await expect(page.locator('main')).not.toBeEmpty();
    await expect(page.getByText('Đang mở góc học tập…')).not.toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1), `Horizontal overflow on ${route}`).toBe(true);
  }
  await expect(page.getByRole('heading', { name: 'Chưa tìm thấy trang này' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('PWA assets and unvisited lessons are available offline', async ({ page, context, browserName }) => {
  test.skip(browserName === 'webkit', 'Playwright WebKit does not reliably simulate offline service workers.');
  await page.goto('/');
  await page.evaluate(async () => { await navigator.serviceWorker.ready; });
  await page.waitForFunction(() => !!navigator.serviceWorker.controller);
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="manifest"]')!;
    return (await fetch(link.href)).json();
  });
  expect(manifest.start_url).toBe('/');
  expect(manifest.icons.some((icon: { sizes: string }) => icon.sizes === '512x512')).toBe(true);
  await context.setOffline(true);
  await page.goto('/lesson/quad');
  await expect(page.getByRole('heading', { name: 'Phương trình bậc hai', exact: true })).toBeVisible();
  await page.goto('/formulas');
  await expect(page.locator('.katex').first()).toBeVisible();
  await page.goto('/notebook');
  await page.getByRole('textbox', { name: 'Nội dung sổ tay' }).fill('Ghi chú khi không có mạng');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Nội dung sổ tay' })).toHaveValue('Ghi chú khi không có mạng');
  await context.setOffline(false);
});
