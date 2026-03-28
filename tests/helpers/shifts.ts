import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

type StoredShiftState = 'פתוחה' | 'מלאה' | 'סגורה';

interface InsertShiftOptions {
  state: StoredShiftState;
  /**
   * The wall-clock instant the shift should appear to start.
   * Written directly to start_at AFTER the initial insert, bypassing the
   * fn_shifts_compute_start_at trigger (which only fires on INSERT and on
   * UPDATE OF shift_date, shift_start_time — not on a bare start_at update).
   * This lets tests place a shift precisely in the past or future regardless
   * of the DB server's timezone or the pub's configured timezone.
   */
  startAt: Date;
}

/**
 * Inserts a minimal test shift via the service-role client and overrides
 * start_at to the requested instant. Returns the new shift's id.
 *
 * Cleanup: call cleanupTestShift(id) in afterEach.
 */
export async function insertTestShift(opts: InsertShiftOptions): Promise<number> {
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Insert with a placeholder date — the trigger will compute start_at from
  // shift_date + shift_start_time, but we overwrite it immediately below.
  const { data, error } = await supabase
    .from('shifts')
    .insert({
      title: `test-running-state-${Date.now()}`,
      shift_date: '2030-01-01',
      shift_start_time: '10:00:00',
      shift_type: 'משמרת רגילה',
      state: opts.state,
      bartenders_required: 3,
    })
    .select('id')
    .single();

  if (error) throw new Error(`insertTestShift insert failed: ${error.message}`);

  // Override start_at without touching shift_date or shift_start_time so the
  // trigger does NOT re-fire and overwrite the value we want.
  const { error: updateError } = await supabase
    .from('shifts')
    .update({ start_at: opts.startAt.toISOString() })
    .eq('id', data.id);

  if (updateError) {
    // Best-effort cleanup before throwing
    await supabase.from('shifts').delete().eq('id', data.id);
    throw new Error(`insertTestShift start_at override failed: ${updateError.message}`);
  }

  return data.id as number;
}

export interface InsertCalendarShiftOptions {
  state: StoredShiftState;
  startAt: Date;
  /**
   * shift_date in YYYY-MM-DD format.
   * Defaults to today so the shift appears in the current-month calendar
   * without having to navigate forward/backward.
   */
  shiftDate?: string;
  /**
   * Title prefix; made unique by appending Date.now().
   * The full title is returned so callers can locate the shift dot in the
   * calendar via button[title="..."].
   */
  titlePrefix?: string;
}

/**
 * Inserts a test shift with a specific shift_date and returns both the shift
 * id and the generated title.  Use this for UI tests that need the shift to
 * appear in the visible calendar month.
 *
 * Cleanup: call cleanupTestShift(id) in afterEach.
 */
export async function insertCalendarTestShift(
  opts: InsertCalendarShiftOptions,
): Promise<{ id: number; title: string }> {
  if (!supabaseKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not set');

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const shiftDate = opts.shiftDate ?? new Date().toISOString().slice(0, 10);
  const prefix = opts.titlePrefix ?? 'test-signup-guard';
  const title = `${prefix}-${crypto.randomUUID()}`;

  const { data, error } = await supabase
    .from('shifts')
    .insert({
      title,
      shift_date: shiftDate,
      shift_start_time: '10:00:00',
      shift_type: 'משמרת רגילה',
      state: opts.state,
      bartenders_required: 3,
    })
    .select('id')
    .single();

  if (error) throw new Error(`insertCalendarTestShift insert failed: ${error.message}`);

  const { error: updateError } = await supabase
    .from('shifts')
    .update({ start_at: opts.startAt.toISOString() })
    .eq('id', data.id);

  if (updateError) {
    await supabase.from('shifts').delete().eq('id', data.id);
    throw new Error(`insertCalendarTestShift start_at override failed: ${updateError.message}`);
  }

  return { id: data.id as number, title };
}

/**
 * Deletes a test shift by id. Best-effort — never fails the test suite.
 */
export async function cleanupTestShift(id: number): Promise<void> {
  if (!supabaseKey) return;
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    await supabase.from('shifts').delete().eq('id', id);
  } catch {
    // Cleanup is best-effort
  }
}
