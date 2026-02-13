import { test, expect } from '@playwright/test';

test.describe.serial('User edit flow', () => {
  const testEmail = `edit-test-${Date.now()}@test.com`;
  const testPassword = 'EditTest123!';
  const originalName = 'Original Name';
  const updatedName = 'Updated Name';
  const newPassword = 'NewPassword456!';

  let managerEmail: string;
  let managerPassword: string;

  test.beforeAll(() => {
    if (!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD) {
      throw new Error('Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD');
    }
    managerEmail = process.env.TEST_MANAGER_EMAIL;
    managerPassword = process.env.TEST_MANAGER_PASSWORD;
  });

  /** Helper: log in as manager and navigate to user management */
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
    await page.fill('#full_name', originalName);
    await page.fill('#password', testPassword);
    await page.click('button[type="submit"]:has-text("הוסף")');

    await expect(page.locator('.users-table')).toContainText(testEmail, { timeout: 10000 });
  });

  test('manager can edit user name', async ({ page }) => {
    await loginAsManager(page);

    // Open the user's edit dialog
    await page.click(`.users-table >> text=${testEmail}`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible({ timeout: 5000 });

    // Email field should be disabled in edit mode
    await expect(page.locator('#email')).toBeDisabled();

    // Update the name
    await page.fill('#full_name', updatedName);
    await page.click('button[type="submit"]:has-text("עדכן")');

    // Verify updated name appears in the table
    await expect(page.locator('.users-table')).toContainText(updatedName, { timeout: 10000 });
  });

  test('manager can change user role', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible({ timeout: 5000 });

    // Change role to manager (מנהל משמרת)
    // Note: "מנהל" (admin) is not a valid DB enum value — only bartender, shift-manager, manager
    await page.locator('[role="dialog"] [data-slot="select-trigger"]').click();
    await page.getByRole('option', { name: 'מנהל משמרת' }).click();
    await page.click('button[type="submit"]:has-text("עדכן")');

    // Wait for the dialog to fully close before interacting with the table
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });

    // Re-open the user to verify the role persisted
    await expect(page.locator('.users-table')).toContainText(testEmail, { timeout: 10000 });
    await page.click(`.users-table >> text=${testEmail}`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible({ timeout: 5000 });

    // Role dropdown should show the manager value
    await expect(page.locator('[role="dialog"] [data-slot="select-trigger"]')).toContainText('מנהל משמרת');
  });

  test('manager can reset user password', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible({ timeout: 5000 });

    // Change role back to bartender before testing password
    await page.locator('[role="dialog"] [data-slot="select-trigger"]').click();
    await page.getByRole('option', { name: 'ברמן' }).click();

    // Fill in new password
    await page.fill('#password', newPassword);
    await page.click('button[type="submit"]:has-text("עדכן")');

    // Wait for dialog to close, then verify table
    await expect(page.locator('[role="dialog"]')).not.toBeVisible({ timeout: 10000 });
    await expect(page.locator('.users-table')).toContainText(testEmail, { timeout: 10000 });
  });

  test('user can log in with the new password', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');

    await page.fill('#email', testEmail);
    await page.fill('#password', newPassword);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible({ timeout: 10000 });
  });

  test('user cannot log in with the old password', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');

    await page.fill('#email', testEmail);
    await page.fill('#password', testPassword);
    await page.click('button.login-button');

    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
  });

  test('cleanup — manager deletes the test user', async ({ page }) => {
    await loginAsManager(page);

    await page.click(`.users-table >> text=${testEmail}`);
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("מחק משתמש")');

    await expect(page.locator('.users-table')).not.toContainText(testEmail, { timeout: 10000 });
  });
});
