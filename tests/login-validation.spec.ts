import { test, expect } from '@playwright/test';

test.describe('Login validation', () => {
  test('shows error for invalid credentials', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');

    await page.fill('#email', 'nonexistent@test.com');
    await page.fill('#password', 'WrongPassword123!');
    await page.click('button.login-button');

    await expect(page.locator('.error-message')).toBeVisible();
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

    await expect(page.locator('.error-message')).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible();
  });

  // US-002 AF-3: empty fields
  test('shows validation when fields are empty', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');

    // Submit without filling anything
    await page.click('button.login-button');

    // User must remain on the login page — no session created
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).not.toBeVisible();

    // Browser native required validation marks the email field as invalid
    const emailInvalid = await page.locator('#email').evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(emailInvalid).toBe(true);
  });
});
