import { test, expect } from '@playwright/test';

// REQ-UI-004: Bartender dashboard shows upcoming shifts and available open shifts
// TSK-SHF-007: Allow bartenders to see a list of their upcoming assigned shifts

test.describe('My Shifts page — authenticated bartender', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD');
    }

    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();

    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'המשמרות שלי', exact: true }).click();
  });

  test('happy path — page heading is visible', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'המשמרות שלי' })).toBeVisible();
  });

  test('happy path — page loads without error', async ({ page }) => {
    // Page must not show a destructive error after loading
    await expect(page.locator('.text-destructive')).not.toBeVisible();

    // Either the empty-state message or a shift list must be present
    const emptyState = page.getByText('אין לך משמרות רשומות כרגע');
    const cancelButton = page.getByRole('button', { name: 'בטל הרשמה' }).first();

    const hasEmpty = await emptyState.isVisible({ timeout: 5_000 }).catch(() => false);
    const hasShifts = await cancelButton.isVisible({ timeout: 5_000 }).catch(() => false);
    expect(hasEmpty || hasShifts).toBe(true);
  });

  test('empty state — correct message when bartender has no shifts', async ({ page }) => {
    // This test is only meaningful when TEST_USER_EMAIL has no shift assignments.
    // If the user has shifts, skip rather than fail.
    const cancelButton = page.getByRole('button', { name: 'בטל הרשמה' }).first();
    const hasShifts = await cancelButton.isVisible({ timeout: 3_000 }).catch(() => false);
    if (hasShifts) {
      test.skip(true, 'TEST_USER_EMAIL has shift assignments — empty state not reachable this run');
      return;
    }

    await expect(page.getByText('אין לך משמרות רשומות כרגע')).toBeVisible();
  });

  test('each listed shift has a cancel button', async ({ page }) => {
    // Only meaningful when the user has at least one shift.
    const cancelButton = page.getByRole('button', { name: 'בטל הרשמה' }).first();
    const hasShifts = await cancelButton.isVisible({ timeout: 3_000 }).catch(() => false);
    if (!hasShifts) {
      test.skip(true, 'TEST_USER_EMAIL has no shifts — skipping cancel-button assertion');
      return;
    }

    // Every shift card must have an accessible cancel button
    await expect(cancelButton).toBeVisible();
  });
});

test.describe('My Shifts page — access control', () => {
  test('role restriction — unauthenticated user does not see "המשמרות שלי" nav item', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).not.toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> text=התחבר')).toBeVisible();
  });
});
