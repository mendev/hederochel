import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';
import { insertTestShift, insertCalendarTestShift, cleanupTestShift } from './helpers/shifts';

// TSK-SHF-014: State-based signup guard
// TSK-SHF-015: Suspended user signup guard
//
// API tests use page.request (inherits browser session cookies) after login.
// UI tests navigate the shifts calendar and assert dialog button/error state.
//
// The following guards are tested ahead of implementation per project convention
// (same pattern as TSK-SHF-012 in shift-running-state.spec.ts):
//   • Running-shift block  (SHF-014) — PATCH handler does not yet check start_at
//   • Closed-shift message (SHF-014) — current message differs from spec
//   • Suspended-user 403   (SHF-015) — PATCH handler does not yet check ban status
//   • Running-shift UI     (SHF-014) — calendar dialog disabled condition not yet extended

const PAST   = () => new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
const FUTURE = () => new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function adminClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// Shared login helper — logs in as TEST_USER_EMAIL and waits for nav.
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

// ── TSK-SHF-014: State-based signup guard — API ─────────────────────────────
//
// Exercises PATCH /api/shifts/:id { action: "signup" } via page.request so
// the browser session cookie is included. Each test isolates its shift and
// cleans up in afterEach.

test.describe('TSK-SHF-014 — State-based signup guard — PATCH /api/shifts/:id', () => {
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

  test('full shift — returns 400 with "המשמרת מלאה"', async ({ page }) => {
    shiftId = await insertTestShift({ state: 'מלאה', startAt: FUTURE() });

    // Set capacity to 1 and fill the slot with a placeholder UUID so the
    // API's bartenders.length >= bartenders_required check triggers.
    await adminClient()
      .from('shifts')
      .update({
        bartenders_required: 1,
        bartenders: ['00000000-0000-0000-0000-000000000001'],
      })
      .eq('id', shiftId);

    const res = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('המשמרת מלאה');
  });

  test('running shift — returns 400 with "המשמרת כבר התחילה"', async ({ page }) => {
    // start_at in the past + state open → computeEffectiveState → "running".
    // The PATCH handler must detect this and block signup.
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: PAST() });

    const res = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('המשמרת כבר התחילה');
  });

  test('closed shift — returns 400 with "המשמרת הסתיימה"', async ({ page }) => {
    shiftId = await insertTestShift({ state: 'סגורה', startAt: PAST() });

    const res = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });

    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('המשמרת הסתיימה');
  });

  test('open future shift — signup succeeds (200)', async ({ page }) => {
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: FUTURE() });

    const res = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.shift).toBeDefined();
  });
});

// ── TSK-SHF-014: State-based signup guard — UI ──────────────────────────────
//
// Shifts are inserted with shift_date = today so they appear in the current-
// month calendar without needing to navigate. Each shift is located in the
// calendar via its unique title: button[title="<title>"].

test.describe('TSK-SHF-014 — State-based signup guard — UI', () => {
  let shiftId: number | undefined;

  test.afterEach(async () => {
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  // Navigate to the shifts calendar and open the dialog for a specific shift.
  async function openShiftDialog(page: import('@playwright/test').Page, title: string) {
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'משמרות', exact: true }).click();
    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    await page.locator(`button[title="${title}"]`).click();
    await expect(page.getByRole('dialog')).toBeVisible();
  }

  test('full shift — "הרשם למשמרת" button is disabled', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'מלאה', startAt: FUTURE() });
    shiftId = id;
    // Set to capacity
    await adminClient()
      .from('shifts')
      .update({
        bartenders_required: 1,
        bartenders: ['00000000-0000-0000-0000-000000000001'],
      })
      .eq('id', id);

    await loginAsBartender(page);
    await openShiftDialog(page, title);

    await expect(page.getByRole('button', { name: 'הרשם למשמרת' })).toBeDisabled();
  });

  test('running shift — "הרשם למשמרת" button is disabled', async ({ page }) => {
    // start_at in the past → GET /api/shifts returns state "running".
    // The calendar dialog must disable the signup button for running shifts.
    const { id, title } = await insertCalendarTestShift({ state: 'פתוחה', startAt: PAST() });
    shiftId = id;

    await loginAsBartender(page);
    await openShiftDialog(page, title);

    await expect(page.getByRole('button', { name: 'הרשם למשמרת' })).toBeDisabled();
  });

  test('closed shift — "הרשם למשמרת" button is disabled', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'סגורה', startAt: PAST() });
    shiftId = id;

    await loginAsBartender(page);
    await openShiftDialog(page, title);

    await expect(page.getByRole('button', { name: 'הרשם למשמרת' })).toBeDisabled();
  });
});

// ── TSK-SHF-015: Suspended user signup guard ────────────────────────────────
//
// Suspension in this app = auth.admin.updateUserById(id, { ban_duration: '876000h' }).
// There is no `suspended` column in profiles.
//
// Tests run serially so suspension state is tightly controlled.
//
// A DEDICATED test user is created in beforeAll and deleted in afterAll.
// Using a dedicated account (rather than TEST_USER_EMAIL) means other spec files
// that log in as TEST_USER_EMAIL can never be blocked by a suspension window here.

test.describe.serial('TSK-SHF-015 — Suspended user signup guard', () => {
  let shiftId: number | undefined;
  let suspendUserId: string;
  let suspendUserEmail: string;
  const suspendUserPassword = 'TestSuspend123!';

  // Login helper scoped to this block — uses the dedicated suspend-test account.
  async function loginAsSuspendUser(page: import('@playwright/test').Page) {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', suspendUserEmail);
    await page.fill('#password', suspendUserPassword);
    await page.click('button.login-button');
    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
  }

  test.beforeAll(async () => {
    if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

    // Create a fresh bartender account exclusively for suspension tests.
    suspendUserEmail = `test-suspend-${crypto.randomUUID().slice(0, 8)}@test.local`;

    const { data: { user }, error: createError } = await adminClient().auth.admin.createUser({
      email: suspendUserEmail,
      password: suspendUserPassword,
      email_confirm: true,
    });
    if (createError || !user) throw new Error(`Could not create suspend test user: ${createError?.message}`);
    suspendUserId = user.id;

    const { error: profileError } = await adminClient()
      .from('profiles')
      .insert({ id: suspendUserId, full_name: 'Suspend Test User', role: 'bartender' });
    if (profileError) throw new Error(`Could not create profile: ${profileError.message}`);
  });

  test.afterAll(async () => {
    // Best-effort cleanup — delete the dedicated test account.
    if (suspendUserId) {
      try { await adminClient().from('profiles').delete().eq('id', suspendUserId); } catch { /* best-effort */ }
      try { await adminClient().auth.admin.deleteUser(suspendUserId); } catch { /* best-effort */ }
    }
  });

  test.afterEach(async () => {
    // Always unsuspend first — never leave the account in a banned state between tests.
    if (suspendUserId) {
      await adminClient().auth.admin.updateUserById(suspendUserId, { ban_duration: 'none' });
    }
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  test('suspended user signup attempt — API returns 403', async ({ page }) => {
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: FUTURE() });

    // Establish a valid browser session BEFORE suspension.
    await loginAsSuspendUser(page);

    // Suspend the user while the session cookie remains active.
    await adminClient().auth.admin.updateUserById(suspendUserId, { ban_duration: '876000h' });

    // Use the existing session to attempt signup — the API must reject it.
    const res = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });

    expect(res.status()).toBe(403);
    const body = await res.json();
    expect(body.error).toBeTruthy();
  });

  test('suspended user — shift dialog shows error on signup attempt', async ({ page }) => {
    const { id, title } = await insertCalendarTestShift({ state: 'פתוחה', startAt: FUTURE() });
    shiftId = id;

    // Log in and navigate to the shift BEFORE suspending.
    await loginAsSuspendUser(page);
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'משמרות', exact: true }).click();
    await expect(page.locator(`button[title="${title}"]`)).toBeVisible();
    await page.locator(`button[title="${title}"]`).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Confirm the button is enabled before suspending — ensures GET /api/auth/user
    // has resolved with suspended:false (eliminates any GoTrue propagation delay).
    await expect(page.getByRole('button', { name: 'הרשם למשמרת' })).toBeEnabled();

    // Suspend mid-session.
    await adminClient().auth.admin.updateUserById(suspendUserId, { ban_duration: '876000h' });

    // Two valid outcomes: the UI proactively disables the button (realtime detection),
    // or the user clicks and the API returns a 403 error shown in the dialog.
    // Both correctly block the suspended user — accept either.
    try {
      await page.getByRole('button', { name: 'הרשם למשמרת' }).click({ timeout: 3000 });
      await expect(page.locator('.text-destructive')).toBeVisible();
    } catch {
      // Button became disabled before the click landed — UI detected the suspension.
      await expect(page.getByRole('button', { name: 'הרשם למשמרת' })).toBeDisabled();
    }
  });

  test('active user signup succeeds after unsuspension', async ({ page }) => {
    // afterEach from the previous test already unsuspended; this call is defensive.
    await adminClient().auth.admin.updateUserById(suspendUserId, { ban_duration: 'none' });

    shiftId = await insertTestShift({ state: 'פתוחה', startAt: FUTURE() });

    await loginAsSuspendUser(page);

    const res = await page.request.patch(`/api/shifts/${shiftId}`, {
      data: { action: 'signup' },
    });

    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.shift).toBeDefined();
  });
});
