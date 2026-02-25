import { test, expect } from '@playwright/test';

test('user can log in with valid credentials', async ({ page }) => {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Missing TEST_USER_EMAIL or TEST_USER_PASSWORD environment variables'
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

  // After login, the sidebar should show authenticated-only nav items
  // and the login button should no longer be visible
  await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
  await expect(page.locator('nav.sidebar-nav >> text=התחבר')).not.toBeVisible();
});
