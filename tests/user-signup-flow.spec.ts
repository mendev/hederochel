import { test, expect } from '@playwright/test';
import { cleanupTestUser } from './helpers/cleanup';

test.describe.serial('User self-signup flow', () => {
  let signupEmail: string;
  const signupPassword = 'SignUp123!';
  const signupFullName = 'Signup Test User';

  test.beforeAll(async () => {
    // UUID-based email ensures no collision even when the serial block is
    // retried (retries: 2 in CI re-runs the entire serial group from test 1).
    signupEmail = `signup-test-${crypto.randomUUID().slice(0, 8)}@test.com`;
  });

  test.afterAll(async () => {
    // Safety net: if the UI-based cleanup test fails, remove the user directly
    // so the DB is clean for the next retry / run.
    await cleanupTestUser(signupEmail);
  });

  test('user can self-register via the signup dialog', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');

    // Click the signup button on the login page
    await page.click('button.signup-button');

    // Verify the signup dialog opened
    await expect(page.locator('text=הרשמה למערכת')).toBeVisible();

    // Fill signup form
    await page.fill('#signup-email', signupEmail);
    await page.fill('#signup-full-name', signupFullName);
    await page.fill('#signup-password', signupPassword);
    await page.fill('#signup-confirm-password', signupPassword);

    // Submit (scoped to dialog to avoid matching the login page signup button)
    await page.locator('[role="dialog"] button[type="submit"]').click();

    // Verify success message
    await expect(page.locator('text=המשתמש נוצר בהצלחה!')).toBeVisible();
  });

  test('newly registered user can log in', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');

    await page.fill('#email', signupEmail);
    await page.fill('#password', signupPassword);
    await page.click('button.login-button');

    // Should see bartender nav items (default role for self-signup)
    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
    // Should NOT see manager-only items
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).not.toBeVisible();
  });

  test('cleanup — manager deletes the self-registered user', async ({ page }) => {
    const managerEmail = process.env.TEST_MANAGER_EMAIL;
    const managerPassword = process.env.TEST_MANAGER_PASSWORD;
    if (!managerEmail || !managerPassword) {
      throw new Error('Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD');
    }

    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', managerEmail);
    await page.fill('#password', managerPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible();

    await page.click('nav.sidebar-nav >> text=ניהול משתמשים');
    await expect(page.locator('.users-table')).toContainText(signupEmail);

    await page.click(`.users-table >> text=${signupEmail}`);
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('button:has-text("מחק משתמש")');

    await expect(page.locator('.users-table')).not.toContainText(signupEmail);
  });
});
