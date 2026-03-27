import { test, expect } from '@playwright/test';
import { insertTestShift, insertCalendarTestShift, cleanupTestShift } from './helpers/shifts';

// TSK-SHF-016: Manager edits a shift
//
// UI tests exercise ShiftFormDialog in edit mode (PUT /api/shifts/:id).
// API tests verify auth, the valid-edit path, and the running/closed guard.
//
// Running-shift and closed-shift edit guards are tested ahead of
// implementation per project convention — the PUT handler does not yet
// check shift state before writing.

const PAST   = () => new Date(Date.now() - 24 * 60 * 60 * 1000);
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

test.describe('TSK-SHF-016 — Shift edit — UI', () => {
  let shiftId: number | undefined;

  test.afterEach(async () => {
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  test('happy path — edited title is reflected in the calendar', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'פתוחה', startAt: FUTURE() });
    shiftId = id;
    const updatedTitle = `${title}-edited`;

    await loginAsManager(page);

    // In management mode, clicking a shift dot opens the edit dialog
    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    await page.locator(`button[title="${title}"]`).click();
    await expect(page.getByRole('heading', { name: 'ערוך משמרת' })).toBeVisible();

    // Submit button shows "עדכן" and delete button is present
    await expect(page.getByRole('button', { name: 'עדכן' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'מחק משמרת' })).toBeVisible();

    // Edit the title
    await page.fill('#title', updatedTitle);
    await page.getByRole('button', { name: 'עדכן' }).click();

    // Success: dialog closes
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Updated dot appears; old title is gone
    await expect(page.locator(`button[title="${updatedTitle}"]`)).toBeVisible();
    await expect(page.locator(`button[title="${title}"]`)).not.toBeVisible();
  });

  test('edit form is pre-populated with shift data', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'פתוחה', startAt: FUTURE() });
    shiftId = id;

    await loginAsManager(page);

    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    await page.locator(`button[title="${title}"]`).click();
    await expect(page.getByRole('heading', { name: 'ערוך משמרת' })).toBeVisible();

    // Title field is pre-filled with the shift's title
    await expect(page.locator('#title')).toHaveValue(title);
  });
});

// ── API tests ─────────────────────────────────────────────────────────────────

test.describe('TSK-SHF-016 — Shift edit — PUT /api/shifts/:id', () => {
  let shiftId: number | undefined;

  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
  });

  test.afterEach(async () => {
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  test('open shift — returns 200 with updated data', async ({ page }) => {
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: FUTURE() });
    const updatedTitle = `test-edit-open-${Date.now()}`;

    const res = await page.request.put(`/api/shifts/${shiftId}`, {
      data: {
        title: updatedTitle,
        shift_date: '2030-06-15',
        shift_start_time: '20:00:00',
        shift_type: 'משמרת רגילה',
        state: 'פתוחה',
        bartenders_required: 3,
      },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.shift.title).toBe(updatedTitle);
  });

  test('unauthenticated request — returns 401', async ({ request }) => {
    // Use the isolated `request` fixture (no session cookie) to confirm auth guard
    const res = await request.put('/api/shifts/999999', {
      data: {
        title: 'unauth-edit',
        shift_date: '2030-06-15',
        shift_start_time: '20:00:00',
        shift_type: 'משמרת רגילה',
        state: 'פתוחה',
        bartenders_required: 3,
      },
    });
    expect(res.status()).toBe(401);
  });

  test('running shift — edit is blocked', async ({ page }) => {
    // start_at in the past + state open → effective state "running".
    // The PUT handler must reject edits on running shifts.
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: PAST() });

    const res = await page.request.put(`/api/shifts/${shiftId}`, {
      data: {
        title: `test-edit-running-${Date.now()}`,
        shift_date: '2030-01-01',
        shift_start_time: '10:00:00',
        shift_type: 'משמרת רגילה',
        state: 'פתוחה',
        bartenders_required: 3,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('closed shift — edit is blocked', async ({ page }) => {
    shiftId = await insertTestShift({ state: 'סגורה', startAt: PAST() });

    const res = await page.request.put(`/api/shifts/${shiftId}`, {
      data: {
        title: `test-edit-closed-${Date.now()}`,
        shift_date: '2030-01-01',
        shift_start_time: '10:00:00',
        shift_type: 'משמרת רגילה',
        state: 'סגורה',
        bartenders_required: 3,
      },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });
});
