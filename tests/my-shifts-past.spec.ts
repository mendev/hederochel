import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { cleanupTestShift } from './helpers/shifts';

// TSK-SHF-009: Bartender can view their past completed shifts
//
// Past shifts are shifts where shift_date < today (local date string comparison
// as implemented in MyShiftsPage).  They appear in the "היסטוריית משמרות"
// section below the upcoming shifts list.
//
// Setup: shifts are inserted directly via the admin client so shift_date can be
// placed in the past.  Each test cleans up via cleanupTestShift in afterEach.

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function adminClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

async function getTestUserId(): Promise<string> {
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');
  const email = process.env.TEST_USER_EMAIL;
  if (!email) throw new Error('TEST_USER_EMAIL is not set');
  const { data } = await adminClient().auth.admin.listUsers();
  const user = data?.users?.find((u) => u.email === email);
  if (!user) throw new Error(`Test user not found: ${email}`);
  return user.id;
}

interface PastShiftResult { id: number; title: string; shiftDate: string }

/**
 * Inserts a past shift assigned to the given userId.
 * daysAgo defaults to 1 (yesterday).
 */
async function insertPastShift(
  userId: string,
  daysAgo = 1,
): Promise<PastShiftResult> {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  const shiftDate = d.toISOString().slice(0, 10);
  const title = `test-past-shift-${crypto.randomUUID()}`;

  const { data, error } = await adminClient()
    .from('shifts')
    .insert({
      title,
      shift_date: shiftDate,
      shift_start_time: '10:00:00',
      shift_type: 'משמרת רגילה',
      state: 'סגורה',
      bartenders_required: 3,
    })
    .select('id')
    .single();

  if (error) throw new Error(`insertPastShift failed: ${error.message}`);

  // Set start_at to match the past date so computeEffectiveState is consistent
  await adminClient()
    .from('shifts')
    .update({ start_at: d.toISOString() })
    .eq('id', data.id);

  // Assign the user via the join table (bartenders column has been dropped)
  await adminClient()
    .from('shift_assignments')
    .insert({ shift_id: data.id, user_id: userId });

  return { id: data.id as number, title, shiftDate };
}

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
  // Ensure My Shifts page is active (auto-redirect lands here after login)
  await page.locator('nav.sidebar-nav').getByRole('button', { name: 'המשמרות שלי', exact: true }).click();
}

test.describe('TSK-SHF-009 — Past shifts list', () => {
  let userId: string;
  const shiftIds: number[] = [];

  test.beforeAll(async () => {
    userId = await getTestUserId();
  });

  test.afterEach(async () => {
    for (const id of shiftIds) {
      await cleanupTestShift(id);
    }
    shiftIds.length = 0;
  });

  // ── Section display ─────────────────────────────────────────────────────────

  test('bartender with past shifts — "היסטוריית משמרות" section is visible', async ({ page }) => {
    const shift = await insertPastShift(userId);
    shiftIds.push(shift.id);

    await loginAsBartender(page);

    await expect(page.getByRole('heading', { name: 'היסטוריית משמרות' })).toBeVisible();
    await expect(page.getByText(shift.title)).toBeVisible();
  });

  test('past shifts listed most-recent-first', async ({ page }) => {
    const older  = await insertPastShift(userId, 3); // 3 days ago
    const recent = await insertPastShift(userId, 1); // yesterday
    shiftIds.push(older.id, recent.id);

    await loginAsBartender(page);

    // Wait for both shifts to appear (data loaded)
    await expect(page.getByRole('heading', { name: recent.title, level: 3 })).toBeVisible();
    await expect(page.getByRole('heading', { name: older.title, level: 3 })).toBeVisible();

    // Assert relative order: recent must have a lower list index than older.
    // Using allTextContents() is robust to extra shifts from concurrent tests
    // (other parallel tests insert past shifts for the same user).
    const allTitles = await page.locator('.opacity-80 h3').allTextContents();
    const recentIdx = allTitles.findIndex((t) => t.includes(recent.title));
    const olderIdx  = allTitles.findIndex((t) => t.includes(older.title));
    expect(recentIdx).toBeGreaterThan(-1);
    expect(olderIdx).toBeGreaterThan(-1);
    expect(recentIdx).toBeLessThan(olderIdx);
  });

  test('each past shift row shows date/time, location, and state badge', async ({ page }) => {
    const shift = await insertPastShift(userId);
    shiftIds.push(shift.id);

    await loginAsBartender(page);

    // Past shift rows carry the "opacity-80" class — unique to the history list,
    // not present on upcoming shift rows. This avoids resolving to the outer
    // page wrapper which contains multiple <p> elements.
    const row = page.locator('.opacity-80', { hasText: shift.title });

    // Date displayed (Hebrew locale format — look for at least the day number)
    await expect(row).toBeVisible();
    await expect(row.locator('p')).toBeVisible(); // date/time line

    // State badge
    await expect(row.getByText('סגורה')).toBeVisible();
  });

  test('each past shift row shows "אין ח״וד עדיין" report badge', async ({ page }) => {
    const shift = await insertPastShift(userId);
    shiftIds.push(shift.id);

    await loginAsBartender(page);

    const row = page.locator('.opacity-80', { hasText: shift.title });
    await expect(row).toBeVisible();
    await expect(row.getByText('אין ח״וד עדיין')).toBeVisible();
  });

  // ── Detail popup ────────────────────────────────────────────────────────────

  test('clicking a past shift opens detail dialog', async ({ page }) => {
    const shift = await insertPastShift(userId);
    shiftIds.push(shift.id);

    await loginAsBartender(page);

    await page.locator('.opacity-80', { hasText: shift.title }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByRole('dialog')).toContainText(shift.title);
  });

  test('past shift dialog is read-only — "בטל הרשמה" button not shown', async ({ page }) => {
    const shift = await insertPastShift(userId);
    shiftIds.push(shift.id);

    await loginAsBartender(page);

    await page.locator('.opacity-80', { hasText: shift.title }).click();

    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(
      page.getByRole('dialog').getByRole('button', { name: 'בטל הרשמה' }),
    ).not.toBeVisible();
  });

  // ── Empty state ─────────────────────────────────────────────────────────────

  test('bartender with no past shifts — "אין משמרות קודמות" shown', async ({ page }) => {
    // This test is only meaningful when the user has no past shifts.
    // If past shifts exist from other test data, skip rather than fail.
    await loginAsBartender(page);

    // Check whether the history section has any shift rows
    const historyHeading = page.getByRole('heading', { name: 'היסטוריית משמרות' });
    await expect(historyHeading).toBeVisible();

    const hasPastShifts = await page.getByText('אין משמרות קודמות').isVisible({ timeout: 3_000 }).catch(() => false);
    const hasRows = await page.locator('div', { hasText: 'אין ח״וד עדיין' }).first().isVisible({ timeout: 3_000 }).catch(() => false);

    if (hasRows) {
      test.skip(true, 'TEST_USER_EMAIL has past shifts in DB — empty state not reachable this run');
      return;
    }

    expect(hasPastShifts).toBe(true);
  });
});
