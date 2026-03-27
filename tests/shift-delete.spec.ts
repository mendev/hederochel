import { test, expect } from '@playwright/test';
import { insertCalendarTestShift, insertTestShift, cleanupTestShift } from './helpers/shifts';

// TSK-SHF-016: Manager deletes a shift
//
// UI tests exercise the "מחק משמרת" button in ShiftFormDialog.
// The button triggers window.confirm(); Playwright handles it via page.on('dialog').

const FUTURE = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

async function loginAsManager(page: import('@playwright/test').Page) {
  const email = process.env.TEST_MANAGER_EMAIL;
  const password = process.env.TEST_MANAGER_PASSWORD;
  if (!email || !password) throw new Error('Missing TEST_MANAGER_EMAIL or TEST_MANAGER_PASSWORD');

  await page.goto('/');
  await page.click('nav.sidebar-nav >> text=התחבר');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button.login-button');
  await expect(page.locator('nav.sidebar-nav >> text=ניהול משמרות')).toBeVisible();
  await page.locator('nav.sidebar-nav').getByRole('button', { name: 'ניהול משמרות', exact: true }).click();
}

// ── UI tests ─────────────────────────────────────────────────────────────────

test.describe('TSK-SHF-016 — Shift delete — UI', () => {
  let shiftId: number | undefined;

  test.afterEach(async () => {
    // Best-effort: shift may already be deleted by a passing test
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  test('happy path — shift is deleted and removed from calendar', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'פתוחה', startAt: FUTURE() });
    shiftId = id;

    await loginAsManager(page);

    // Verify shift is visible before deletion
    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();

    // Click shift dot → edit dialog opens
    await page.locator(`button[title="${title}"]`).click();
    await expect(page.getByRole('heading', { name: 'ערוך משמרת' })).toBeVisible();

    // Accept the confirm dialog and click delete
    page.on('dialog', async (dialog) => {
      expect(dialog.type()).toBe('confirm');
      await dialog.accept();
    });
    await page.getByRole('button', { name: 'מחק משמרת' }).click();

    // Dialog closes on success
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Shift dot is gone from the calendar
    await expect(page.locator(`button[title="${title}"]`)).not.toBeVisible();

    // Mark as cleaned up so afterEach doesn't try to delete again
    shiftId = undefined;
  });

  test('delete is cancelled — shift remains in calendar', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'פתוחה', startAt: FUTURE() });
    shiftId = id;

    await loginAsManager(page);

    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    await page.locator(`button[title="${title}"]`).click();
    await expect(page.getByRole('heading', { name: 'ערוך משמרת' })).toBeVisible();

    // Dismiss the confirm dialog
    page.on('dialog', async (dialog) => {
      await dialog.dismiss();
    });
    await page.getByRole('button', { name: 'מחק משמרת' }).click();

    // Dialog stays open; shift dot still present
    await expect(page.getByRole('heading', { name: 'ערוך משמרת' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
  });
});

// ── API tests ─────────────────────────────────────────────────────────────────

test.describe('TSK-SHF-016 — Shift delete — DELETE /api/shifts/:id', () => {
  test('unauthenticated request — returns 401', async ({ request }) => {
    const res = await request.delete('/api/shifts/999999');
    expect(res.status()).toBe(401);
  });

  test('authenticated manager — deletes shift and returns success', async ({ page }) => {
    const shiftId = await insertTestShift({ state: 'פתוחה', startAt: FUTURE() });

    await loginAsManager(page);

    const res = await page.request.delete(`/api/shifts/${shiftId}`);

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);

    // No cleanup needed — shift was deleted by the test
  });
});
