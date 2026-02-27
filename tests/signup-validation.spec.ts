import { test, expect } from '@playwright/test';

test.describe('Signup form validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.click('button.signup-button');
    await expect(page.locator('text=הרשמה למערכת')).toBeVisible();
  });

  test('shows error when passwords do not match', async ({ page }) => {
    await page.fill('#signup-email', 'mismatch@test.com');
    await page.fill('#signup-full-name', 'Test');
    await page.fill('#signup-password', 'Password123!');
    await page.fill('#signup-confirm-password', 'DifferentPassword!');
    await page.locator('[role="dialog"] button[type="submit"]').click();

    await expect(page.locator('text=הסיסמאות אינן תואמות')).toBeVisible();
  });

  test('prevents submission when password is too short via native validation', async ({ page }) => {
    await page.fill('#signup-email', 'short@test.com');
    await page.fill('#signup-full-name', 'Test');
    await page.fill('#signup-password', '12345');
    await page.fill('#signup-confirm-password', '12345');
    await page.locator('[role="dialog"] button[type="submit"]').click();

    // The password input has minLength=6, so HTML5 validation prevents submission.
    // The form should NOT submit — no success message, dialog stays open.
    await expect(page.locator('text=הרשמה למערכת')).toBeVisible();
    await expect(page.locator('text=המשתמש נוצר בהצלחה!')).not.toBeVisible();

    // Verify the password field is marked as invalid by the browser
    const isInvalid = await page.locator('#signup-password').evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(isInvalid).toBe(true);
  });

  // US-001 AF-4: missing required fields
  test('shows validation when required fields are empty', async ({ page }) => {
    // Submit without filling anything
    await page.locator('[role="dialog"] button[type="submit"]').click();

    // Dialog must stay open — no success and no server call
    await expect(page.locator('text=הרשמה למערכת')).toBeVisible();
    await expect(page.locator('text=המשתמש נוצר בהצלחה!')).not.toBeVisible();

    // Browser native required validation marks the email field as invalid
    const emailInvalid = await page.locator('#signup-email').evaluate(
      (el: HTMLInputElement) => !el.checkValidity()
    );
    expect(emailInvalid).toBe(true);
  });

  test('shows error for duplicate email', async ({ page }) => {
    const existingEmail = process.env.TEST_USER_EMAIL;
    if (!existingEmail) throw new Error('Missing TEST_USER_EMAIL');

    await page.fill('#signup-email', existingEmail);
    await page.fill('#signup-full-name', 'Duplicate Test');
    await page.fill('#signup-password', 'Password123!');
    await page.fill('#signup-confirm-password', 'Password123!');
    await page.locator('[role="dialog"] button[type="submit"]').click();

    // The API may return the error in Hebrew or English depending on Supabase response.
    // Match either the Hebrew translation or the English Supabase message.
    const errorBox = page.locator('[role="dialog"] .text-destructive');
    await expect(errorBox).toBeVisible();
    const errorText = await errorBox.textContent();
    expect(
      errorText?.includes('שם משתמש זה כבר תפוס') ||
      errorText?.includes('already been registered') ||
      errorText?.includes('already exists')
    ).toBe(true);
  });
});
