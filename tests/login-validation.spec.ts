import { test, expect } from '@playwright/test';

test.describe('Login validation', () => {
  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');

    await page.fill('#email', 'nonexistent@test.com');
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button.login-button');

    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
    // User should remain on login page, login button still in nav
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible();
  });

  test('shows error for wrong password with existing user', async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    if (!email) throw new Error('Missing TEST_USER_EMAIL');

    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');

    await page.fill('#email', email);
    await page.fill('#password', 'DefinitelyWrongPassword999!');
    await page.click('button.login-button');

    await expect(page.locator('.error-message')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible();
  });
});
