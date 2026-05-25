/**
 * mapDistance.spec.ts —— Playwright E2E 测试
 *
 * 测试策略：
 * 1. 页面加载：地图容器和操作卡片正确渲染
 * 2. 初始状态：提示文字显示、重置按钮禁用
 * 3. 单击地图：起点 Tag 出现、进入测距模式
 * 4. 鼠标移动：距离 Tag 更新（数值非空）
 * 5. 重置按钮：点击后恢复初始状态
 * 6. 右键取消：触发 contextmenu 后重置
 *
 * 运行方式：
 *   pnpm test:e2e  （或 npx playwright test e2e/mapDistance.spec.ts）
 */
import { test, expect, Page } from '@playwright/test';

const BASE_URL = process.env.DEMO_URL ?? 'http://localhost:3001';

/** 辅助：等待地图 canvas 渲染完成（百度地图 WebGL 也是 canvas） */
async function waitForMapReady(page: Page) {
  await page.waitForSelector('[data-testid="bmap-map"] canvas', { timeout: 15_000 });
}

/** 辅助：在地图中心点附近模拟单击 */
async function clickMapCenter(page: Page) {
  const mapEl = page.locator('[data-testid="bmap-map"]');
  const box = await mapEl.boundingBox();
  if (!box) throw new Error('bmap-map element not found');
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
}

/** 辅助：从地图中心移动到偏移位置，模拟 mousemove */
async function moveMouseFromCenter(page: Page, offsetX = 80, offsetY = 60) {
  const mapEl = page.locator('[data-testid="bmap-map"]');
  const box = await mapEl.boundingBox();
  if (!box) throw new Error('bmap-map element not found');
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  // 先移到中心，再滑动到偏移位置，模拟连续 pointermove
  await page.mouse.move(cx, cy);
  await page.mouse.move(cx + offsetX, cy + offsetY, { steps: 5 });
}

// ============================================================
test.describe('@critical 地图测距功能', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await waitForMapReady(page);
  });

  // ----------------------------------------------------------
  test('TC01 - 页面初始渲染正确', async ({ page }) => {
    // 卡片存在
    await expect(page.locator('[data-testid="map-distance-card"]')).toBeVisible();
    // 地图 canvas 已渲染
    await expect(page.locator('[data-testid="bmap-map"] canvas')).toBeVisible();
    // 提示文字
    await expect(page.locator('[data-testid="status-bar"]')).toContainText(
      '请单击地图任意位置设置起始点',
    );
    // 重置按钮禁用
    await expect(page.locator('[data-testid="btn-reset"]')).toBeDisabled();
  });

  // ----------------------------------------------------------
  test('TC02 - 单击地图设置起始点', async ({ page }) => {
    await clickMapCenter(page);

    // 起点 Tag 出现
    const tagStart = page.locator('[data-testid="tag-start"]');
    await expect(tagStart).toBeVisible({ timeout: 3_000 });
    // Tag 文本包含经纬度格式
    await expect(tagStart).toContainText('起点：');

    // 重置按钮变为可用
    await expect(page.locator('[data-testid="btn-reset"]')).toBeEnabled();
  });

  // ----------------------------------------------------------
  test('TC03 - 移动鼠标后显示实时距离', async ({ page }) => {
    await clickMapCenter(page);
    await moveMouseFromCenter(page, 100, 80);

    // 距离 Tag 出现，且文本包含 m 或 km
    const tagDist = page.locator('[data-testid="tag-distance"]');
    await expect(tagDist).toBeVisible({ timeout: 3_000 });
    await expect(tagDist).toContainText(/距离：\d+(\.\d+)?\s*(m|km)/);
  });

  // ----------------------------------------------------------
  test('TC04 - 点击重置按钮恢复初始状态', async ({ page }) => {
    await clickMapCenter(page);
    await moveMouseFromCenter(page);

    await page.locator('[data-testid="btn-reset"]').click();

    // 起点 Tag 消失
    await expect(page.locator('[data-testid="tag-start"]')).not.toBeVisible();
    // 提示文字重新显示
    await expect(page.locator('[data-testid="status-bar"]')).toContainText(
      '请单击地图任意位置设置起始点',
    );
    // 重置按钮再次禁用
    await expect(page.locator('[data-testid="btn-reset"]')).toBeDisabled();
  });

  // ----------------------------------------------------------
  test('TC05 - 右键取消测距', async ({ page }) => {
    await clickMapCenter(page);

    // 右键地图触发 contextmenu
    const mapEl = page.locator('[data-testid="bmap-map"]');
    await mapEl.click({ button: 'right' });

    // 应恢复初始状态
    await expect(page.locator('[data-testid="tag-start"]')).not.toBeVisible({ timeout: 2_000 });
    await expect(page.locator('[data-testid="btn-reset"]')).toBeDisabled();
  });
});