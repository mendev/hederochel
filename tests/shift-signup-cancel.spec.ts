import { test, expect } from '@playwright/test';
import { insertTestShift, insertCalendarTestShift, cleanupTestShift } from './helpers/shifts';

// TSK-SHF-016: Bartender signs up for and cancels shifts
//
// Covers the full signup→cancel cycle: UI feedback via the calendar dialog,
// cancel via the "המשמרות שלי" page, and the already-registered API guard.
// This is a dedicated spec; the basic open-shift-200 case is in
// shift-signup-guard.spec.ts and is not duplicated here.

const FUTURE = () => new Date(Date.now() + 24 * 60 * 60 * 1000);

async function loginAsBartender(page: import('@playwright/test').Page) {
  const email = process.env.TEST_USER_EMAIL;
  const password = process.env.TEST_USER_PASSWORD;
  if (!email || !password) throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD');

  await page.goto('/');
  await page.click('nav.sidebar-nav >> text=התחבר');
  await page.fill('#email', email);
  await page.fill('#password', password);
  await page.click('button.login-button');
  await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
}

// ── Calendar dialog: signup and cancel ───────────────────────────────────────

test.describe('TSK-SHF-016 — Bartender signup via calendar dialog', () => {
  let shiftId: number | undefined;

  test.afterEach(async () => {
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  test('signup — button changes to "בטל הרשמה" and bartender count increments', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'פתוחה', startAt: FUTURE() });
    shiftId = id;

    await loginAsBartender(page);
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'משמרות', exact: true }).click();

    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    await page.locator(`button[title="${title}"]`).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Before signup: count shows 0 bartenders
    await expect(page.getByText(/0 \/ 3 ברמנים/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'הרשם למשמרת' })).toBeVisible();

    await page.getByRole('button', { name: 'הרשם למשמרת' }).click();

    // After signup: button changes, count increments
    await expect(page.getByRole('button', { name: 'בטל הרשמה' })).toBeVisible();
    await expect(page.getByText(/1 \/ 3 ברמנים/)).toBeVisible();
  });

  test('cancel via dialog — reverts to signed-out state', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'פתוחה', startAt: FUTURE() });
    shiftId = id;

    await loginAsBartender(page);
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'משמרות', exact: true }).click();

    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    await page.locator(`button[title="${title}"]`).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Sign up
    await page.getByRole('button', { name: 'הרשם למשמרת' }).click();
    await expect(page.getByRole('button', { name: 'בטל הרשמה' })).toBeVisible();

    // Cancel
    await page.getByRole('button', { name: 'בטל הרשמה' }).click();

    // Should revert: signup button returns, count drops back to 0
    await expect(page.getByRole('button', { name: 'הרשם למשמרת' })).toBeVisible();
    await expect(page.getByText(/0 \/ 3 ברמנים/)).toBeVisible();
  });
});

// ── "המשמרות שלי" page: cancel ───────────────────────────────────────────────

test.describe('TSK-SHF-016 — Bartender cancel via "המשמרות שלי"', () => {
  let shiftId: number | undefined;

  test.afterEach(async () => {
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  test('signing off removes shift from "המשמרות שלי" list', async ({ page }) => {
    // Insert a shift with a future date — any date works for MyShiftsPage
    // since it shows all shifts where the user is in bartenders.
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: FUTURE() });

    await loginAsBartender(page);

    // Sign up via API so the shift appears in "המשמרות שלי"
    const signupRes = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });
    expect(signupRes.status()).toBe(200);

    // Navigate to "המשמרות שלי"
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'המשמרות שלי', exact: true }).click();

    // Shift title must be visible in the list
    await expect(page.locator('h3.font-semibold').filter({ hasText: /test-running-state/ })).toBeVisible();

    // Click the cancel button on that shift card
    await page.getByRole('button', { name: 'בטל הרשמה' }).first().click();

    // Shift is removed from the list (either empty state or no more cancel buttons for it)
    await expect(page.locator('h3.font-semibold').filter({ hasText: /test-running-state/ })).not.toBeVisible();
  });
});

// ── Already-registered guard ─────────────────────────────────────────────────

test.describe('TSK-SHF-016 — Signup duplicate guard — PATCH /api/shifts/:id', () => {
  let shiftId: number | undefined;

  test.beforeEach(async ({ page }) => {
    await loginAsBartender(page);
  });

  test.afterEach(async () => {
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  test('second signup attempt returns 400 "כבר רשום למשמרת"', async ({ page }) => {
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: FUTURE() });

    // First signup — must succeed
    const first = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });
    expect(first.status()).toBe(200);

    // Second signup on the same shift — must be rejected
    const second = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });

    expect(second.status()).toBe(400);
    const body = await second.json();
    expect(body.error).toBe('כבר רשום למשמרת');
  });
});
