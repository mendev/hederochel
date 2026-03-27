import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { insertTestShift, cleanupTestShift } from './helpers/shifts';

// TSK-SHF-016: Manager creates a shift
//
// UI tests exercise the ShiftFormDialog (POST /api/shifts) via the manager
// dashboard.  API tests verify auth and validation directly.

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function adminClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Deletes a shift by exact title — used to clean up UI-created shifts whose
// id is not returned by the form.
async function cleanupShiftByTitle(title: string): Promise<void> {
  if (!supabaseKey) return;
  try {
    await adminClient().from('shifts').delete().eq('title', title);
  } catch { /* best-effort */ }
}

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

test.describe('TSK-SHF-016 — Shift create — UI', () => {
  let shiftTitle: string | undefined;

  test.afterEach(async () => {
    if (shiftTitle) {
      await cleanupShiftByTitle(shiftTitle);
      shiftTitle = undefined;
    }
  });

  test('happy path — shift is created and appears in the calendar', async ({ page }) => {
    await loginAsManager(page);

    // Use today's date so the shift appears in the current-month calendar.
    shiftTitle = `test-create-${Date.now()}`;
    const shiftDate = new Date().toISOString().slice(0, 10);

    await page.getByRole('button', { name: /הוסף משמרת/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'הוסף משמרת חדשה' })).toBeVisible();

    await page.fill('#title', shiftTitle);
    await page.fill('#shift_date', shiftDate);
    await page.fill('#shift_start_time', '20:00');
    // shift_type and state left at their defaults (משמרת רגילה / פתוחה)

    await page.getByRole('button', { name: 'הוסף' }).click();

    // Success: dialog closes automatically
    await expect(page.getByRole('dialog')).not.toBeVisible();

    // Calendar refreshes (refreshKey increments) — shift dot must be visible
    await expect(page.locator(`button[title="${shiftTitle}"]`)).toBeVisible();
  });

  test('create dialog opens with empty form', async ({ page }) => {
    await loginAsManager(page);

    await page.getByRole('button', { name: /הוסף משמרת/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'הוסף משמרת חדשה' })).toBeVisible();

    // Submit button is "הוסף" (not "עדכן") and delete button is absent
    await expect(page.getByRole('button', { name: 'הוסף' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'מחק משמרת' })).not.toBeVisible();
  });

  test('missing required fields — form does not submit', async ({ page }) => {
    await loginAsManager(page);

    await page.getByRole('button', { name: /הוסף משמרת/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill title only; leave date and time empty (both are `required`)
    await page.fill('#title', 'incomplete-shift');
    await page.getByRole('button', { name: 'הוסף' }).click();

    // Browser native validation blocks submission — dialog stays open
    await expect(page.getByRole('heading', { name: 'הוסף משמרת חדשה' })).toBeVisible();
  });
});

// ── API tests ─────────────────────────────────────────────────────────────────

test.describe('TSK-SHF-016 — Shift create — POST /api/shifts', () => {
  test('unauthenticated request — returns 401', async ({ request }) => {
    const res = await request.post('/api/shifts', {
      data: {
        title: 'unauth-test',
        shift_date: '2030-06-01',
        shift_start_time: '10:00:00',
        shift_type: 'משמרת רגילה',
      },
    });
    expect(res.status()).toBe(401);
  });

  test('missing required fields — authenticated request returns 400', async ({ page }) => {
    await loginAsManager(page);

    const res = await page.request.post('/api/shifts', {
      data: { title: 'missing-fields-test' }, // shift_date, shift_start_time, shift_type omitted
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('valid payload — shift is created and returned', async ({ page }) => {
    await loginAsManager(page);
    const title = `test-api-create-${Date.now()}`;

    const res = await page.request.post('/api/shifts', {
      data: {
        title,
        shift_date: '2030-06-15',
        shift_start_time: '20:00:00',
        shift_type: 'משמרת רגילה',
        bartenders_required: 3,
      },
    });

    expect(res.status()).toBe(201);
    const body = await res.json();
    expect(body.shift.title).toBe(title);

    // Cleanup
    await cleanupShiftByTitle(title);
  });
});
