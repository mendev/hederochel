import { test, expect } from '@playwright/test';

test.describe.serial('User management lifecycle', () => {
  const newUserEmail = `test-user-${Date.now()}@test.com`;
  const newUserPassword = 'TestPass123!';
  const newUserFullName = 'Test User';

  let managerEmail: string;
  let managerPassword: string;

  test.beforeAll(() => {
    if (!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD) {
      throw new Error(
        'Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD environment variables'
      );
    }
    managerEmail = process.env.TEST_MANAGER_EMAIL;
    managerPassword = process.env.TEST_MANAGER_PASSWORD;
  });

  test('Step 1 — Manager logs in', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', managerEmail);
    await page.fill('#password', managerPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible({ timeout: 10000 });
  });

  test('Step 2 — Manager creates a new user', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', managerEmail);
    await page.fill('#password', managerPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible({ timeout: 10000 });

    await page.click('nav.sidebar-nav >> text=ניהול משתמשים');
    await page.click('button:has-text("הוסף משתמש")');
    await page.fill('#email', newUserEmail);
    await page.fill('#full_name', newUserFullName);
    await page.fill('#password', newUserPassword);
    await page.click('button[type="submit"]:has-text("הוסף")');

    await expect(page.locator('.users-table')).toContainText(newUserEmail, { timeout: 10000 });
  });

  test('Step 3 — Manager logs out', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', managerEmail);
    await page.fill('#password', managerPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible({ timeout: 10000 });

    await page.click('a.logout-link');
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible({ timeout: 10000 });
  });

  test('Step 4 — New user logs in', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', newUserEmail);
    await page.fill('#password', newUserPassword);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).not.toBeVisible();
  });

  test('Step 5 — New user logs out', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', newUserEmail);
    await page.fill('#password', newUserPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible({ timeout: 10000 });

    await page.click('a.logout-link');
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible({ timeout: 10000 });
  });

  test('Step 6 — Manager logs back in and deletes the user', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', managerEmail);
    await page.fill('#password', managerPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible({ timeout: 10000 });

    await page.click('nav.sidebar-nav >> text=ניהול משתמשים');
    await expect(page.locator('.users-table')).toContainText(newUserEmail, { timeout: 10000 });

    await page.click(`.users-table >> text=${newUserEmail}`);

    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("מחק משתמש")');

    await expect(page.locator('.users-table')).not.toContainText(newUserEmail, { timeout: 10000 });
  });
});
