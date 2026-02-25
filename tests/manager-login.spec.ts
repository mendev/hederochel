import { test, expect } from '@playwright/test';

test('manager can log in and see management nav items', async ({ page }) => {
  const email = process.env.TEST_MANAGER_EMAIL;
  const password = process.env.TEST_MANAGER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD environment variables'
    );
  }

  // Navigate to the app root
  await page.goto('/');

  // Click the login nav button in the sidebar ("התחבר")
  await page.click('nav.sidebar-nav >> text=התחבר');

  // Verify the login page heading is visible
  await expect(page.locator('h2', { hasText: 'התחברות' })).toBeVisible();

  // Fill in email and password
  await page.fill('#email', email);
  await page.fill('#password', password);

  // Submit the login form
  await page.click('button.login-button');

  // After login, the sidebar should show authenticated nav items
  await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
  await expect(page.locator('nav.sidebar-nav >> text=התחבר')).not.toBeVisible();

  // Manager-only nav items should be visible
  await expect(page.locator('nav.sidebar-nav >> text=דוחות')).toBeVisible();
  await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible();
  await expect(page.locator('nav.sidebar-nav >> text=ניהול משמרות')).toBeVisible();
});
