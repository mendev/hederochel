import { test, expect } from '@playwright/test';
import { cleanupTestUser } from './helpers/cleanup';

test.describe.serial('Bulk user actions', () => {
  const timestamp = Date.now();
  const testUsers = [
    { email: `bulk-test-1-${timestamp}@test.com`, name: 'Bulk User 1' },
    { email: `bulk-test-2-${timestamp}@test.com`, name: 'Bulk User 2' },
    { email: `bulk-test-3-${timestamp}@test.com`, name: 'Bulk User 3' },
  ];
  const testPassword = 'TestPass123!';

  let managerEmail: string;
  let managerPassword: string;

  test.beforeAll(() => {
    if (!process.env.TEST_MANAGER_EMAIL || !process.env.TEST_MANAGER_PASSWORD) {
      throw new Error('Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD');
    }
    managerEmail = process.env.TEST_MANAGER_EMAIL;
    managerPassword = process.env.TEST_MANAGER_PASSWORD;
  });

  test.afterAll(async () => {
    await Promise.all(testUsers.map((u) => cleanupTestUser(u.email)));
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

  test('setup — manager creates 3 test users', async ({ page }) => {
    await loginAsManager(page);

    for (const user of testUsers) {
      await page.click('button:has-text("הוסף משתמש")');
      await page.fill('#email', user.email);
      await page.fill('#full_name', user.name);
      await page.fill('#password', testPassword);
      await page.click('button[type="submit"]:has-text("הוסף")');
      await expect(page.locator('.users-table')).toContainText(user.email);
    }
  });

  test('bulk delete — select 2 users and delete them', async ({ page }) => {
    await loginAsManager(page);
    await expect(page.locator('.users-table')).toContainText(testUsers[0].email);

    // Select first two users via their row checkboxes
    for (const user of [testUsers[0], testUsers[1]]) {
      const row = page.locator('tr', { hasText: user.email });
      await row.locator('[role="checkbox"]').click();
    }

    // Verify the bulk actions bar appears with correct count
    await expect(page.locator('.bulk-actions-bar')).toBeVisible();
    await expect(page.locator('.bulk-actions-bar')).toContainText('2 נבחרו');

    // Click bulk delete and accept the confirmation
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('[data-testid="bulk-delete-btn"]');

    // Verify the two deleted users are gone
    await expect(page.locator('.users-table')).not.toContainText(testUsers[0].email);
    await expect(page.locator('.users-table')).not.toContainText(testUsers[1].email);

    // Verify the third user still exists
    await expect(page.locator('.users-table')).toContainText(testUsers[2].email);

    // Verify the bulk actions bar is gone (selection cleared)
    await expect(page.locator('.bulk-actions-bar')).not.toBeVisible();
  });

  test('bulk suspend — select remaining user and suspend', async ({ page }) => {
    await loginAsManager(page);
    await expect(page.locator('.users-table')).toContainText(testUsers[2].email);

    // Select the remaining user
    const row = page.locator('tr', { hasText: testUsers[2].email });
    await row.locator('[role="checkbox"]').click();

    // Verify the bulk actions bar
    await expect(page.locator('.bulk-actions-bar')).toBeVisible();
    await expect(page.locator('.bulk-actions-bar')).toContainText('1 נבחרו');

    // Click bulk suspend and accept the confirmation
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('[data-testid="bulk-suspend-btn"]');

    // Verify the user now shows the suspended badge
    const updatedRow = page.locator('tr', { hasText: testUsers[2].email });
    await expect(updatedRow.locator('text=מושעה')).toBeVisible();

    // Verify the bulk actions bar is gone (selection cleared)
    await expect(page.locator('.bulk-actions-bar')).not.toBeVisible();
  });

  test('bulk unsuspend — select suspended user and unsuspend', async ({ page }) => {
    await loginAsManager(page);

    // Verify user 3 is suspended from the previous step
    const row = page.locator('tr', { hasText: testUsers[2].email });
    await expect(row.locator('text=מושעה')).toBeVisible();

    // Select the suspended user
    await row.locator('[role="checkbox"]').click();

    // Verify the bulk actions bar shows the unsuspend button
    await expect(page.locator('.bulk-actions-bar')).toBeVisible();
    await expect(page.locator('[data-testid="bulk-unsuspend-btn"]')).toBeVisible();

    // Click bulk unsuspend and accept the confirmation
    page.on('dialog', (dialog) => dialog.accept());
    await page.click('[data-testid="bulk-unsuspend-btn"]');

    // Verify the user now shows the active badge
    const updatedRow = page.locator('tr', { hasText: testUsers[2].email });
    await expect(updatedRow.locator('text=פעיל')).toBeVisible();

    // Verify the bulk actions bar is gone (selection cleared)
    await expect(page.locator('.bulk-actions-bar')).not.toBeVisible();
  });
});
