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
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible();
    await page.click('nav.sidebar-nav >> text=ניהול משתמשים');
    await expect(page.locator('.users-table')).toBeVisible();
  }

  test('setup — manager creates a test user', async ({ page }) => {
    await loginAsManager(page);

    await page.click('button:has-text("הוסף משתמש")');
    await page.fill('#email', testEmail);
    await page.fill('#full_name', testFullName);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]:has-text("הוסף")');

    await expect(page.locator('.users-table')).toContainText(testEmail);
  });

  test('verify user can log in before suspension', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
  });

  test('manager suspends the user', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible();

    // Click the suspend button and accept the confirmation
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("השעה משתמש")');

    // Wait for dialog to close and table to refresh
    await expect(page.locator('text=ערוך משתמש')).not.toBeVisible();

    // Verify the user's row shows suspended status
    const userRow = page.locator(`.users-table tr:has-text("${testEmail}")`);
    await expect(userRow).toContainText('מושעה');
  });

  test('suspended user cannot log in', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button.login-button');

    // Login should fail — either error message or user stays on login page
    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible();
  });

  // US-002 AF-2: suspended account shows the specific Hebrew message
  test('suspended user sees account-suspended error message', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button.login-button');

    const errorMessage = page.locator('.error-message');
    await expect(errorMessage).toBeVisible();
    // US-002 AF-2 requires the message to indicate the account is suspended
    await expect(errorMessage).toContainText('מושע');
  });

  test('manager unsuspends the user', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible();

    // Dialog should show the suspended badge
    await expect(page.locator('[role="dialog"]').getByText('מושעה')).toBeVisible();

    // Click unsuspend button
    await page.click('button:has-text("בטל השעיה")');

    // Wait for dialog to close and table to refresh
    await expect(page.locator('text=ערוך משתמש')).not.toBeVisible();

    // Verify the user's row shows active status
    const userRow = page.locator(`.users-table tr:has-text("${testEmail}")`);
    await expect(userRow).toContainText('פעיל');
  });

  test('unsuspended user can log in again', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
  });

  test('cleanup — manager deletes the test user', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("מחק משתמש")');

    await expect(page.locator('.users-table')).not.toContainText(testEmail);
  });

  // US-014 precondition: managers cannot suspend other managers
  test('manager cannot suspend another manager', async ({ page }) => {
    await loginAsManager(page);

    // Open the manager's own row — a manager account should never show a suspend option
    await page.click(`.users-table tr:has-text("${managerEmail}")`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible();

    await expect(page.locator('button:has-text("השעה משתמש")')).not.toBeVisible();

    await page.keyboard.press('Escape');
  });
});
