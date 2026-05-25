import { test, expect, Page } from '@playwright/test';

async function waitForMapReady(page: Page) {
  await page.goto('/');
  await expect(page.getByTestId('map-distance-card')).toBeVisible();
  await page.waitForFunction(() => {
    return Boolean(document.querySelector('[data-testid="bmap-map"] canvas'));
  });
}

async function getMapPoint(page: Page, offsetX = 0, offsetY = 0) {
  const map = page.getByTestId('bmap-map');
  const box = await map.boundingBox();
  if (!box) throw new Error('地图容器不存在，无法执行坐标点击');

  return {
    x: box.x + box.width / 2 + offsetX,
    y: box.y + box.height / 2 + offsetY,
  };
}

async function clickMap(page: Page, offsetX = 0, offsetY = 0, button: 'left' | 'right' = 'left') {
  const point = await getMapPoint(page, offsetX, offsetY);
  await page.mouse.click(point.x, point.y, { button });
}

async function moveOnMap(page: Page, from: { x: number; y: number }, to: { x: number; y: number }) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.move(to.x, to.y, { steps: 8 });
}

async function drawTriangle(page: Page) {
  await clickMap(page, 0, 0);
  await clickMap(page, 120, 0);
  await clickMap(page, 100, 110);
}

test.describe('地图多边形测量 E2E', () => {
  test.beforeEach(async ({ page }) => {
    await waitForMapReady(page);
  });

  test('TC01 - 初始态渲染正确', async ({ page }) => {
    await expect(page.getByTestId('bmap-map')).toBeVisible();
    await expect(page.getByTestId('status-bar')).toContainText('请单击地图开始绘制');
    await expect(page.getByTestId('btn-cancel-current')).toBeDisabled();
    await expect(page.getByTestId('btn-clear-all')).toBeDisabled();
  });

  test('TC02 - 点击首点后进入绘制态并显示橡皮筋距离', async ({ page }) => {
    await clickMap(page, 0, 0);

    await expect(page.getByTestId('tag-current-color')).toContainText('当前绘制');
    await expect(page.getByTestId('tag-current-color')).toContainText('已选 1 点');
    await expect(page.getByTestId('tag-start')).toContainText('首点：');
    await expect(page.getByTestId('btn-cancel-current')).toBeEnabled();

    const start = await getMapPoint(page, 0, 0);
    const end = await getMapPoint(page, 120, 80);
    await moveOnMap(page, start, end);

    await expect(page.getByTestId('tag-cursor')).toBeVisible();
    await expect(page.getByTestId('tag-cursor')).toContainText(/(橡皮筋|靠近首点)/);
    await expect(page.getByTestId('tag-cursor')).toContainText(/\d+(\.\d+)?\s*(m|km)/);
  });

  test('TC03 - 三点闭合后生成历史多边形归档', async ({ page }) => {
    await drawTriangle(page);

    const thirdPoint = await getMapPoint(page, 100, 110);
    const firstPoint = await getMapPoint(page, 0, 0);
    await moveOnMap(page, thirdPoint, firstPoint);

    await expect(page.getByTestId('tag-cursor')).toContainText('靠近首点');
    await clickMap(page, 0, 0);

    await expect(page.getByTestId('history-list')).toBeVisible();
    await expect(page.getByTestId('tag-shape-1')).toContainText('#1');
    await expect(page.getByTestId('tag-shape-1')).toContainText('周长');
    await expect(page.getByTestId('btn-cancel-current')).toBeDisabled();
    await expect(page.getByTestId('btn-clear-all')).toBeEnabled();
    await expect(page.getByTestId('tag-start')).toBeHidden();
  });

  test('TC04 - 绘制中右键只取消当前草稿', async ({ page }) => {
    await clickMap(page, 0, 0);
    await clickMap(page, 100, 0);

    await expect(page.getByTestId('tag-start')).toBeVisible();
    await clickMap(page, 80, 40, 'right');

    await expect(page.getByTestId('status-bar')).toContainText('请单击地图开始绘制');
    await expect(page.getByTestId('btn-cancel-current')).toBeDisabled();
    await expect(page.getByTestId('btn-clear-all')).toBeDisabled();
    await expect(page.getByTestId('tag-start')).toBeHidden();
  });

  test('TC05 - 点击清空全部按钮可清除历史多边形', async ({ page }) => {
    await drawTriangle(page);

    const thirdPoint = await getMapPoint(page, 100, 110);
    const firstPoint = await getMapPoint(page, 0, 0);
    await moveOnMap(page, thirdPoint, firstPoint);
    await clickMap(page, 0, 0);

    await expect(page.getByTestId('tag-shape-1')).toBeVisible();
    await page.getByTestId('btn-clear-all').click();

    await expect(page.getByTestId('status-bar')).toContainText('请单击地图开始绘制');
    await expect(page.getByTestId('history-list')).toBeHidden();
    await expect(page.getByTestId('btn-clear-all')).toBeDisabled();
  });
});
