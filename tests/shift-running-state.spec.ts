import { test, expect } from '@playwright/test';
import { insertTestShift, cleanupTestShift } from './helpers/shifts';

// TSK-SHF-012: Derived running state
//
// Shifts do not transition to "running" via a DB write. The API computes the
// effective state on every GET /api/shifts read:
//   if start_at <= now() AND stored state is open OR full  →  return "running"
//   otherwise                                              →  return stored state
//
// These tests assert the API response field `state` — never the DB column.
// They exercise computeEffectiveState() (app/api/shifts/route.ts) through the
// full HTTP stack.
//
// Note: TSK-SHF-012 is currently marked "todo" in tasks-shifts.csv.
// Tests are written ahead of final integration per the PM brief.

const PAST  = () => new Date(Date.now() - 24 * 60 * 60 * 1000); // yesterday
const FUTURE = () => new Date(Date.now() + 24 * 60 * 60 * 1000); // tomorrow
const JUST_NOW = () => new Date(Date.now() - 1_000);              // 1 s ago — reliably <= now()

test.describe('Shift derived running state — GET /api/shifts', () => {
  let shiftId: number | undefined;

  test.afterEach(async () => {
    if (shiftId !== undefined) {
      await cleanupTestShift(shiftId);
      shiftId = undefined;
    }
  });

  // ── Shift has not started ──────────────────────────────────────────────────

  test('future start, stored state open — API returns open', async ({ request }) => {
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: FUTURE() });

    const res = await request.get('/api/shifts');
    expect(res.ok()).toBeTruthy();

    const { shifts } = await res.json();
    const shift = shifts.find((s: { id: number }) => s.id === shiftId);
    expect(shift, 'test shift should be present in response').toBeDefined();
    expect(shift.state).toBe('פתוחה');
  });

  test('future start, stored state full — API returns full', async ({ request }) => {
    shiftId = await insertTestShift({ state: 'מלאה', startAt: FUTURE() });

    const res = await request.get('/api/shifts');
    expect(res.ok()).toBeTruthy();

    const { shifts } = await res.json();
    const shift = shifts.find((s: { id: number }) => s.id === shiftId);
    expect(shift, 'test shift should be present in response').toBeDefined();
    expect(shift.state).toBe('מלאה');
  });

  // ── Shift start time has passed ────────────────────────────────────────────

  test('past start, stored state open — API returns running', async ({ request }) => {
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: PAST() });

    const res = await request.get('/api/shifts');
    expect(res.ok()).toBeTruthy();

    const { shifts } = await res.json();
    const shift = shifts.find((s: { id: number }) => s.id === shiftId);
    expect(shift, 'test shift should be present in response').toBeDefined();
    expect(shift.state).toBe('running');
  });

  test('past start, stored state full — API returns running', async ({ request }) => {
    shiftId = await insertTestShift({ state: 'מלאה', startAt: PAST() });

    const res = await request.get('/api/shifts');
    expect(res.ok()).toBeTruthy();

    const { shifts } = await res.json();
    const shift = shifts.find((s: { id: number }) => s.id === shiftId);
    expect(shift, 'test shift should be present in response').toBeDefined();
    expect(shift.state).toBe('running');
  });

  // ── Closed shift is never overridden ──────────────────────────────────────

  test('past start, stored state closed — API returns closed, no running override', async ({ request }) => {
    shiftId = await insertTestShift({ state: 'סגורה', startAt: PAST() });

    const res = await request.get('/api/shifts');
    expect(res.ok()).toBeTruthy();

    const { shifts } = await res.json();
    const shift = shifts.find((s: { id: number }) => s.id === shiftId);
    expect(shift, 'test shift should be present in response').toBeDefined();
    expect(shift.state).toBe('סגורה');
  });

  // ── Boundary: start_at exactly at now ─────────────────────────────────────

  test('start_at at now boundary — API returns running', async ({ request }) => {
    // start_at is set to 1 second ago so that start_at <= now() is reliably
    // true by the time the API call is made, regardless of network latency.
    shiftId = await insertTestShift({ state: 'פתוחה', startAt: JUST_NOW() });

    const res = await request.get('/api/shifts');
    expect(res.ok()).toBeTruthy();

    const { shifts } = await res.json();
    const shift = shifts.find((s: { id: number }) => s.id === shiftId);
    expect(shift, 'test shift should be present in response').toBeDefined();
    expect(shift.state).toBe('running');
  });
});
