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
    await expect(drawer.getByRole('link')).toHaveCount(16);
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


test('knowledge map exposes prerequisite depth, gaps and learning paths', async ({ page }) => {
  await page.goto('/map?concept=derivative-definition');
  await expect(page.getByRole('heading', { name: 'Bản đồ cấu trúc toán học' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Định nghĩa đạo hàm', exact: true })).toBeVisible();

  const prerequisites = page.locator('.concept-relations').filter({ hasText: 'Cần biết trước' });
  await expect(prerequisites).toBeVisible();
  await expect(prerequisites.getByRole('button', { name: 'Giới hạn', exact: true })).toBeVisible();
  await expect(prerequisites.getByRole('button', { name: 'Tính liên tục', exact: true })).toBeVisible();
  await expect(page.locator('.learning-path-card')).toContainText('Đường học tới “Định nghĩa đạo hàm”');

  await prerequisites.getByRole('button', { name: 'Tính liên tục', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Tính liên tục', exact: true })).toBeVisible();
  await expect(page.getByText('Nút kiến thức chưa có tài nguyên riêng')).toBeVisible();
});



test('deep ontology exposes definitions, misconceptions and evidence mastery', async ({ page }) => {
  await page.goto('/map?concept=derivative-definition');
  await expect(page.getByText('DEEP ONTOLOGY')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Bên trong “Định nghĩa đạo hàm”' })).toBeVisible();
  await expect(page.getByText('Mức thành thạo theo bằng chứng')).toBeVisible();
  await expect(page.getByText('Độ sâu nội dung')).toBeVisible();

  await page.locator('.ontology-atom-list').getByRole('button', { name: /Liên tục không suy ra khả vi/ }).click();
  await expect(page.locator('.atom-inspector')).toContainText('Liên tục không suy ra khả vi');
  await expect(page.locator('.atom-inspector')).toContainText('Đây là lỗi tư duy cần chủ động kiểm tra');

  await page.locator('.ontology-atom-list').getByRole('button', { name: /Đạo hàm từ định nghĩa/ }).click();
  await expect(page.locator('.atom-inspector')).toContainText('Đạo hàm từ định nghĩa');
  await expect(page.locator('.ontology-practice-link')).toBeVisible();

  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Bản đồ bằng chứng học tập' })).toBeVisible();
  await expect(page.getByText('Chưa đánh giá').first()).toBeVisible();
  await expect(page.getByRole('link', { name: /Mở bản đồ toán học/ })).toBeVisible();
});



test('Math Cosmos exposes the 3D knowledge universe and spatial node search', async ({ page }, info) => {
  await page.goto('/cosmos');
  await expect(page.getByRole('heading', { name: 'Vũ trụ tri thức toán học 3D' })).toBeVisible();
  const canvas = page.getByTestId('math-cosmos-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-quality', info.project.name === 'desktop-chromium' ? 'desktop' : 'mobile');
  await expect(page.getByText('InstancedMesh', { exact: true })).toBeVisible();
  await expect(page.locator('.cosmos-runtime-badges')).toContainText(/Worker layout|Layout fallback/);

  await page.getByLabel('Tìm node trong Math Cosmos').fill('Taylor');
  const searchPanel = page.locator('.cosmos-search-panel');
  await searchPanel.getByRole('button', { name: /Chuỗi Taylor/ }).click();
  await expect(page.locator('.cosmos-hud')).toContainText('Chuỗi Taylor');
  await expect(page.locator('.cosmos-hud')).toContainText('CONCEPT');
  await expect(page.locator('.cosmos-hud').getByRole('link', { name: 'Mở cấu trúc đầy đủ' })).toHaveAttribute('href', '/map?concept=taylor');

  await page.getByRole('button', { name: 'Số phức', exact: true }).click();
  await expect(page.locator('.cosmos-hud')).toContainText('Số phức');
  await expect(page.locator('.cosmos-runtime-badges')).toContainText('node đang render');

  await page.getByRole('button', { name: 'N-body', exact: true }).click();
  await expect(page.locator('.cosmos-hud')).toContainText('Bài toán N-body');
});

test('Math Cosmos degrades to deterministic layout fallback and honors reduced motion', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop-chromium', 'One browser is sufficient to verify forced Worker fallback.');

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript(() => {
    Object.defineProperty(window, 'Worker', { configurable: true, value: undefined });
  });
  await page.goto('/cosmos');

  const canvas = page.getByTestId('math-cosmos-canvas');
  await expect(canvas).toHaveAttribute('data-reduced-motion', 'true');
  await expect(page.locator('.cosmos-runtime-badges')).toContainText('Layout fallback');
  await expect(page.locator('.cosmos-hud')).toContainText('Định nghĩa đạo hàm');
});


test('N-body gravity lab runs a real CPU simulation with deterministic controls', async ({ page }, info) => {
  await page.goto('/simulations/gravity');
  await expect(page.getByRole('heading', { name: 'Phòng mô phỏng hấp dẫn N-body' })).toBeVisible();

  const canvas = page.getByTestId('nbody-canvas');
  await expect(canvas).toBeVisible();
  await expect(canvas).toHaveAttribute('data-backend', 'cpu');
  await expect(canvas).toHaveAttribute('data-quality', info.project.name === 'desktop-chromium' ? 'desktop' : 'mobile');
  await expect(page.locator('.gravity-runtime')).toContainText('CPU engine · Float64');
  await expect(page.getByText('Energy drift', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Tạm dừng mô phỏng' }).click();
  await expect(page.getByRole('button', { name: 'Tiếp tục mô phỏng' })).toBeVisible();

  await page.getByLabel('Số vật thể N-body').selectOption('48');
  await expect(page.locator('.gravity-runtime')).toContainText('48 vật thể');

  await page.getByLabel('Seed mô phỏng').fill('123');
  await page.getByRole('button', { name: /Reset cùng tham số/ }).click();
  await expect(page.getByRole('button', { name: 'Tiếp tục mô phỏng' })).toBeVisible();
  const nbodyLink = page.getByRole('link', { name: /Bài toán N-body/ });
  await expect(nbodyLink).toHaveAttribute('href', '/map?concept=nbody-problem');
  await nbodyLink.click();
  await expect(page).toHaveURL(/\/map\?concept=nbody-problem/);
  await expect(page.getByRole('heading', { name: 'Bài toán N-body', exact: true })).toBeVisible();
  await expect(page.getByText('Gravity Lab của MathNexus')).toBeVisible();
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


test('dashboard and progress prioritize weak-question review', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.setItem('mathnexus_progress', JSON.stringify({
      lessonsRead: [],
      questionsDone: 1,
      booksOpened: [],
      streak: 0,
      lastDate: '',
      dailyGoal: 5,
      displayName: 'Bạn học Toán',
      questionsCorrect: 0,
      lastLesson: '',
      activity: {},
      practice: {
        'comb-5-2': {
          attempts: 1,
          correct: 0,
          correctStreak: 0,
          lastCorrect: false,
          updatedAt: '2026-09-21T08:00:00.000Z',
        },
      },
    }));
  });
  await page.reload();

  const practicePlan = page.locator('.plan-item').filter({ hasText: 'Ôn 1 câu đang yếu' });
  await expect(practicePlan).toBeVisible();
  await expect(practicePlan).toHaveAttribute('href', /mode=review/);
  await expect(page.getByRole('link', { name: /Ôn câu đang yếu/ })).toBeVisible();

  await page.goto('/progress');
  await expect(page.getByRole('heading', { name: 'Độ vững qua luyện tập' })).toBeVisible();
  const combinatorics = page.locator('.mastery-row').filter({ hasText: 'Tổ hợp' });
  await expect(combinatorics).toContainText('1 câu cần ôn');
  await combinatorics.click();
  await expect(page).toHaveURL(/\/practice\?.*mode=review/);
});

test('interactive graph draws immediately and validates math inputs', async ({ page }, info) => {
  await page.goto('/graph');
  const path = page.getByTestId('function-path');
  await expect(path).toHaveAttribute('d', /^M/);
  const initial = await path.getAttribute('d');
  await page.getByLabel('Hệ số a', { exact: true }).fill('2');
  await expect(path).not.toHaveAttribute('d', initial!);
  await expect(page.locator('.graph-probe output').first()).toContainText('1');
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


test('advanced math workbench solves linear algebra, statistics and sequences', async ({ page }) => {
  await page.goto('/tools');

  const system = page.getByRole('region', { name: 'Hệ phương trình 2×2' });
  await expect(system.locator('output')).toContainText('x = 2');
  await expect(system.locator('output')).toContainText('y = 3');

  const matrix = page.getByRole('region', { name: 'Ma trận 2×2' });
  await expect(matrix.locator('output')).toContainText('det(A) = 5');

  const stats = page.getByRole('region', { name: 'Thống kê mô tả' });
  await stats.getByLabel('Dữ liệu').fill('1, 2, 3, 4');
  await expect(stats.locator('output')).toContainText('trung bình = 2,5');
  await expect(stats.locator('output')).toContainText('trung vị = 2,5');

  const sequence = page.getByRole('region', { name: 'Cấp số' });
  await expect(sequence.locator('output')).toContainText('uₙ = 11');
  await expect(sequence.locator('output')).toContainText('Sₙ = 35');
  await sequence.getByLabel('Loại cấp số').selectOption('geometric');
  await expect(sequence.locator('output')).toContainText('uₙ = 48');
  await expect(sequence.locator('output')).toContainText('Sₙ = 93');
});

test('function laboratory exposes mathematical analysis and tangent lines', async ({ page }) => {
  await page.goto('/graph');
  await expect(page.locator('.function-analysis')).toContainText('16');
  await expect(page.locator('.function-analysis')).toContainText('(1; -4)');
  await expect(page.locator('.function-analysis')).toContainText('-1, 3');
  await expect(page.locator('[data-testid="tangent-path"]')).toHaveAttribute('d', /^M/);
  await expect(page.locator('.graph-probe')).toContainText('f′(x) =');
  await expect(page.locator('.graph-probe')).toContainText('2');

  await page.getByLabel('Họ hàm').selectOption('log');
  await page.getByLabel('Hệ số b', { exact: true }).fill('1');
  await page.getByLabel('Giá trị x').fill('1');
  await expect(page.locator('.function-analysis')).toContainText('Tiệm cận đứng');
  await expect(page.locator('.function-analysis')).toContainText('x = 0');
  await expect(page.locator('[data-testid="tangent-path"]')).toHaveAttribute('d', /^M/);
});


test('calculus lab parses free expressions and computes core numerical calculus', async ({ page }) => {
  await page.goto('/calculus');
  await expect(page.getByRole('heading', { name: 'Phòng thí nghiệm giải tích' })).toBeVisible();

  await page.getByLabel('Biểu thức f(x)').fill('x^2 - 2');
  await page.getByLabel('Điểm khảo sát x₀').fill('1.5');
  await expect(page.locator('.calculus-metric').filter({ hasText: 'Nghiệm gần x₀' })).toContainText('1,414');

  await page.getByLabel('Biểu thức f(x)').fill('x^2');
  await page.getByLabel('Điểm khảo sát x₀').fill('2');
  await page.getByLabel('Cận a').fill('0');
  await page.getByLabel('Cận b').fill('1');
  await expect(page.locator('.calculus-metric').filter({ hasText: 'Đạo hàm f′(x₀)' })).toContainText('4');
  await expect(page.locator('.calculus-result-panel').filter({ hasText: 'Tiếp tuyến tại x₀' })).toContainText('y = 4');
  await expect(page.locator('.calculus-result-panel').filter({ hasText: 'Tích phân xác định' })).toContainText('0,333');

  await page.getByLabel('Biểu thức f(x)').fill('abs(x)');
  await page.getByLabel('Điểm khảo sát x₀').fill('0');
  await expect(page.locator('.calculus-metric').filter({ hasText: 'Đạo hàm f′(x₀)' })).toContainText('Không tồn tại');

  await page.getByLabel('Biểu thức f(x)').fill('window.alert(1)');
  await expect(page.getByRole('alert')).toBeVisible();
});


test('Infinite Math Canvas persists spatial objects and viewport locally', async ({ page }) => {
  await page.goto('/canvas');
  await expect(page.getByRole('heading', { name: 'Không gian toán học vô hạn' })).toBeVisible();
  await expect(page.getByTestId('math-canvas-stage')).toBeVisible();

  await page.getByRole('button', { name: 'Thêm LaTeX' }).click();
  await page.getByLabel('Nội dung LaTeX').fill('\\int_0^1 x^2\\,dx=\\frac{1}{3}');
  await expect(page.locator('.canvas-latex-card .katex')).toBeVisible();

  await page.getByRole('button', { name: 'Thêm khái niệm' }).click();
  await page.getByLabel('Khái niệm trên Canvas').selectOption('nbody-problem');
  await expect(page.locator('.canvas-concept-card')).toContainText('Bài toán N-body');

  await page.getByRole('button', { name: 'Thêm mô phỏng' }).click();
  await expect(page.locator('.canvas-simulation-card')).toContainText('N-body Gravity Lab');
  await expect(page.locator('.canvas-simulation-card').getByRole('link', { name: 'Mở mô phỏng' })).toHaveAttribute('href', '/simulations/gravity');

  await page.getByRole('button', { name: 'Phóng to' }).click();
  await expect(page.locator('.canvas-coordinate-hud')).toContainText('120%');

  await page.getByLabel('Tên Math Canvas').fill('Không gian Giải tích & Vật lý');
  await expect(page.getByRole('status')).toContainText('Đã lưu cục bộ');

  await page.reload();
  await expect(page.getByLabel('Tên Math Canvas')).toHaveValue('Không gian Giải tích & Vật lý');
  await expect(page.locator('.canvas-latex-card .katex')).toBeVisible();
  await expect(page.locator('.canvas-concept-card')).toContainText('Bài toán N-body');
  await expect(page.locator('.canvas-simulation-card')).toContainText('N-body Gravity Lab');
  await expect(page.locator('.canvas-coordinate-hud')).toContainText('120%');
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
  await expect(page.locator('.chat-links a[href="/lesson/cplx"]')).toBeVisible();
  await expect(page.locator('.chat-links a[href="/map?concept=complex-numbers"]')).toBeVisible();
  await expect(page.locator('.chat-links a[href*="concept=complex-numbers&atom="]').first()).toBeVisible();
});

test('AI renders a successful Gemini math response', async ({ browser }) => {
  const context = await browser.newContext({
    baseURL: 'http://127.0.0.1:4173',
    serviceWorkers: 'block',
  });
  const page = await context.newPage();

  try {
    await context.route('**/api/gemini', route => route.fulfill({ status: 200, json: { text: 'Đáp án là $2+2=4$.' } }));
    await page.goto('/ai');
    await page.getByRole('textbox', { name: 'Câu hỏi cho trợ lý' }).fill('2+2 bằng mấy?');
    await page.getByRole('button', { name: 'Gửi câu hỏi' }).click();
    await expect(page.locator('.chat-message').last()).toContainText('Đáp án là');
    await expect(page.locator('.chat-message').last().locator('.katex')).toBeVisible();
  } finally {
    await context.close();
  }
});

test('every route fits the viewport and has no client-side errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  for (const route of ['/library', '/map', '/cosmos', '/books', '/book/unknown', '/think', '/practice', '/graph', '/tools', '/calculus', '/simulations/gravity', '/formulas', '/formula/deMoivre', '/ai', '/notebook', '/canvas', '/progress', '/does-not-exist']) {
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
  await page.goto('/canvas');
  await expect(page.getByRole('heading', { name: 'Không gian toán học vô hạn' })).toBeVisible();
  await page.getByRole('button', { name: 'Thêm văn bản' }).click();
  await expect(page.locator('.canvas-object-text')).toBeVisible();
  await page.goto('/notebook');
  await page.getByRole('textbox', { name: 'Nội dung sổ tay' }).fill('Ghi chú khi không có mạng');
  await page.reload();
  await expect(page.getByRole('textbox', { name: 'Nội dung sổ tay' })).toHaveValue('Ghi chú khi không có mạng');
  await context.setOffline(false);
});
