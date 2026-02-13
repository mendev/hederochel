import { test, expect } from '@playwright/test';

test.describe.serial('User suspend and unsuspend flow', () => {
  const testEmail = `suspend-test-${Date.now()}@test.com`;
  const testPassword = 'Suspend123!';
  const testFullName = 'Suspend Test User';

  let managerEmail: string;
  let managerPassword: string;

  test.beforeAll(() => {
    if (!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD) {
      throw new Error('Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD');
    }
    managerEmail = process.env.TEST_MANAGER_EMAIL;
    managerPassword = process.env.TEST_MANAGER_PASSWORD;
  });

  async function loginAsManager(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', managerEmail);
    await page.fill('#password', managerPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible({ timeout: 10000 });
    await page.click('nav.sidebar-nav >> text=ניהול משתמשים');
    await expect(page.locator('.users-table')).toBeVisible({ timeout: 10000 });
  }

  test('setup — manager creates a test user', async ({ page }) => {
    await loginAsManager(page);

    await page.click('button:has-text("הוסף משתמש")');
    await page.fill('#email', testEmail);
    await page.fill('#full_name', testFullName);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]:has-text("הוסף")');

    await expect(page.locator('.users-table')).toContainText(testEmail, { timeout: 10000 });
  });

  test('verify user can log in before suspension', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible({ timeout: 10000 });
  });

  test('manager suspends the user', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible({ timeout: 5000 });

    // Click the suspend button and accept the confirmation
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("השעה משתמש")');

    // Wait for dialog to close and table to refresh
    await expect(page.locator('text=ערוך משתמש')).not.toBeVisible({ timeout: 10000 });

    // Verify the user's row shows suspended status
    const userRow = page.locator(`.users-table tr:has-text("${testEmail}")`);
    await expect(userRow).toContainText('מושעה', { timeout: 10000 });
  });

  test('suspended user cannot log in', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button.login-button');

    // Login should fail — either error message or user stays on login page
    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible();
  });

  test('manager unsuspends the user', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible({ timeout: 5000 });

    // Dialog should show the suspended badge
    await expect(page.locator('[role="dialog"]').getByText('מושעה')).toBeVisible();

    // Click unsuspend button
    await page.click('button:has-text("בטל השעיה")');

    // Wait for dialog to close and table to refresh
    await expect(page.locator('text=ערוך משתמש')).not.toBeVisible({ timeout: 10000 });

    // Verify the user's row shows active status
    const userRow = page.locator(`.users-table tr:has-text("${testEmail}")`);
    await expect(userRow).toContainText('פעיל', { timeout: 10000 });
  });

  test('unsuspended user can log in again', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible({ timeout: 10000 });
  });

  test('cleanup — manager deletes the test user', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("מחק משתמש")');

    await expect(page.locator('.users-table')).not.toContainText(testEmail, { timeout: 10000 });
  });
});
