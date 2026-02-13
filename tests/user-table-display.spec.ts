import { test, expect } from '@playwright/test';

test.describe('Users table display', () => {
  let managerEmail: string;
  let managerPassword: string;

  test.beforeEach(async ({ page }) => {
    managerEmail = process.env.TEST_MANAGER_EMAIL!;
    managerPassword = process.env.TEST_MANAGER_PASSWORD!;
    if (!managerEmail || !managerPassword) {
      throw new Error('Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD');
    }

    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', managerEmail);
    await page.fill('#password', managerPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).toBeVisible({ timeout: 10000 });
    await page.click('nav.sidebar-nav >> text=ניהול משתמשים');
    await expect(page.locator('.users-table')).toBeVisible({ timeout: 10000 });
  });

  test('table shows all expected column headers', async ({ page }) => {
    const table = page.locator('.users-table');
    await expect(table.getByRole('columnheader', { name: 'שם', exact: true })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'שם משתמש' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'תפקיד' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'סטטוס' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'תאריך רישום' })).toBeVisible();
    await expect(table.getByRole('columnheader', { name: 'כניסה אחרונה למערכת' })).toBeVisible();
  });

  test('table header shows user count', async ({ page }) => {
    // The card header shows "משתמשים (N)"
    await expect(page.locator('text=/משתמשים \\(\\d+\\)/')).toBeVisible({ timeout: 10000 });
  });

  test('manager user appears in the table with correct data', async ({ page }) => {
    const managerRow = page.locator(`.users-table tr:has-text("${managerEmail}")`);
    await expect(managerRow).toBeVisible({ timeout: 10000 });
    // Manager should have active status
    await expect(managerRow).toContainText('פעיל');
  });

  test('clicking a user row opens the edit dialog', async ({ page }) => {
    await page.click(`.users-table tr:has-text("${managerEmail}")`);
    await expect(page.locator('text=ערוך משתמש')).toBeVisible({ timeout: 5000 });
    // Email should be disabled in edit mode
    await expect(page.locator('#email')).toBeDisabled();
  });
});
