-- Migration: 20260321000000_add_shift_start_at.sql
-- Description: Adds start_at timestamptz to shifts for timezone-correct comparisons.
--
--   shift_date (date) + shift_start_time (time without time zone) are stored without
--   timezone context. Comparing their combination to now() is ambiguous when the DB
--   server and users are in different timezones (e.g. DB in US, pub in Israel).
--
--   This migration adds a start_at timestamptz column that stores the wall-clock
--   start time of each shift in the pub's local timezone (Asia/Jerusalem), so that
--   now() >= start_at is always a correct, timezone-safe comparison regardless of
--   where the DB server or the client is running.
--
--   Assumption: the pub operates in Asia/Jerusalem. If this changes, update the
--   timezone literal in fn_shifts_compute_start_at() and re-backfill the column.
--
--   Existing columns (shift_date, shift_start_time) are preserved so that current
--   API routes continue to work without modification. start_at is derived from them
--   automatically by the trigger on every INSERT and UPDATE.
--
-- Rollback:
--   DROP TRIGGER IF EXISTS trg_shifts_compute_start_at ON public.shifts;
--   DROP FUNCTION IF EXISTS public.fn_shifts_compute_start_at();
--   DROP INDEX IF EXISTS idx_shifts_start_at;
--   ALTER TABLE public.shifts DROP COLUMN IF EXISTS start_at;


-- 1. Add the column (nullable initially to allow backfill)
ALTER TABLE public.shifts
  ADD COLUMN start_at timestamptz;


-- 2. Backfill all existing rows.
--    Concatenate date and time as a local timestamp string, then cast to
--    timestamptz at the pub's timezone to produce the correct UTC instant.
UPDATE public.shifts
SET start_at = (shift_date::text || ' ' || shift_start_time::text)::timestamp
               AT TIME ZONE 'Asia/Jerusalem';


-- 3. Now that backfill is complete, enforce NOT NULL
ALTER TABLE public.shifts
  ALTER COLUMN start_at SET NOT NULL;


-- 4. Trigger function: recomputes start_at whenever shift_date or shift_start_time
--    is written. The API layer does not need to supply start_at — the DB handles it.
CREATE OR REPLACE FUNCTION public.fn_shifts_compute_start_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.start_at :=
    (NEW.shift_date::text || ' ' || NEW.shift_start_time::text)::timestamp
    AT TIME ZONE 'Asia/Jerusalem';
  RETURN NEW;
END;
$$;


-- 5. Attach trigger — fires before every INSERT and before any UPDATE that touches
--    shift_date or shift_start_time, keeping start_at always in sync.
CREATE TRIGGER trg_shifts_compute_start_at
  BEFORE INSERT OR UPDATE OF shift_date, shift_start_time
  ON public.shifts
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_shifts_compute_start_at();


-- 6. Index for efficient time-range queries used by:
--    - TSK-SHF-012: finding shifts whose start_at <= now() (open/full → running)
--    - TSK-SHF-013: finding shifts whose start_at is in the past (running → closed)
--    - Calendar views filtered by date range
CREATE INDEX idx_shifts_start_at ON public.shifts (start_at);
