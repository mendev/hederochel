import { test, expect } from '@playwright/test';

// REQ-UI-005: Manager dashboard shows all shifts in a calendar view with management actions
// REQ-UI-012: Shift form dialog supports creating and editing shifts with validation

test.describe('Manager shift management page — authenticated manager', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_MANAGER_EMAIL;
    const password = process.env.TEST_MANAGER_PASSWORD;
    if (!email || !password) {
      throw new Error('Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD');
    }

    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משמרות')).toBeVisible();

    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'ניהול משמרות', exact: true }).click();
  });

  test('happy path — page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'ניהול משמרות' })).toBeVisible();
  });

  test('happy path — shift calendar renders with a month heading', async ({ page }) => {
    // The ShiftsCalendar renders an h2 with the current month and year
    await expect(page.locator('h2.text-2xl')).toBeVisible();
  });

  test('happy path — "הוסף משמרת" button is visible', async ({ page }) => {
    await expect(page.getByRole('button', { name: /הוסף משמרת/ })).toBeVisible();
  });

  test('happy path — clicking "הוסף משמרת" opens the shift form dialog', async ({ page }) => {
    await page.getByRole('button', { name: /הוסף משמרת/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  });

  test('happy path — dismissing shift dialog closes it', async ({ page }) => {
    await page.getByRole('button', { name: /הוסף משמרת/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
  });

  test('calendar can navigate to next month', async ({ page }) => {
    await expect(page.locator('h2.text-2xl')).toBeVisible();
    const initialMonth = await page.locator('h2.text-2xl').textContent();

    await page.locator('button:has(svg.lucide-chevron-right)').click();

    await expect(page.locator('h2.text-2xl')).not.toHaveText(initialMonth!);
  });

  test('calendar can navigate to previous month', async ({ page }) => {
    await expect(page.locator('h2.text-2xl')).toBeVisible();
    const initialMonth = await page.locator('h2.text-2xl').textContent();

    await page.locator('button:has(svg.lucide-chevron-left)').click();

    await expect(page.locator('h2.text-2xl')).not.toHaveText(initialMonth!);
  });
});

test.describe('Manager shift management page — role restriction', () => {
  test('bartender does not see "ניהול משמרות" nav item', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD');

    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משמרות')).not.toBeVisible();
  });

  test('unauthenticated user does not see "ניהול משמרות" nav item', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משמרות')).not.toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible();
  });
});
