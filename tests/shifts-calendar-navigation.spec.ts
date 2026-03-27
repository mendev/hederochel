import { test, expect } from '@playwright/test';
import { waitForTestUserNotSuspended } from './helpers/suspension-guard';

test.describe('Shifts calendar navigation', () => {
  test.beforeEach(async ({ page }) => {
    const email = process.env.TEST_USER_EMAIL;
    const password = process.env.TEST_USER_PASSWORD;
    if (!email || !password) {
      throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD');
    }

    await waitForTestUserNotSuspended();
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav').getByRole('button', { name: 'משמרות', exact: true })).toBeVisible();
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'משמרות', exact: true }).click();
  });

  // The calendar month heading is the h2 with class text-2xl inside the calendar
  const calendarHeading = 'h2.text-2xl';

  test('can navigate to previous month without errors', async ({ page }) => {
    await expect(page.locator(calendarHeading)).toBeVisible();
    const initialText = await page.locator(calendarHeading).textContent();

    // Click previous month (left chevron)
    await page.locator('button:has(svg.lucide-chevron-left)').click();

    // Verify the month header changed
    await expect(page.locator(calendarHeading)).not.toHaveText(initialText!);

    // Verify no crash — calendar grid with day headers still renders
    await expect(page.locator('text=א׳')).toBeVisible();
  });

  test('can navigate to next month without errors', async ({ page }) => {
    await expect(page.locator(calendarHeading)).toBeVisible();
    const initialText = await page.locator(calendarHeading).textContent();

    await page.locator('button:has(svg.lucide-chevron-right)').click();

    await expect(page.locator(calendarHeading)).not.toHaveText(initialText!);
    await expect(page.locator('text=א׳')).toBeVisible();
  });

  test('can navigate multiple months back without errors', async ({ page }) => {
    await expect(page.locator(calendarHeading)).toBeVisible();

    // Navigate 3 months back
    for (let i = 0; i < 3; i++) {
      await page.locator('button:has(svg.lucide-chevron-left)').click();
      // Wait for the calendar to finish loading
      await page.waitForTimeout(500);
    }

    // Calendar should still be functional — heading and day grid present
    await expect(page.locator(calendarHeading)).toBeVisible();
    await expect(page.locator('text=א׳')).toBeVisible();
  });
});
