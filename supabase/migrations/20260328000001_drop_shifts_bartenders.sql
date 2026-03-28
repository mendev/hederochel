-- Migration: 20260328000001_drop_shifts_bartenders.sql
-- Description: Drops the shifts.bartenders JSONB column after shift_assignments is live.
--
--   PRODUCTION DEPLOYMENT ORDER — do not apply this until:
--     1. Migration 20260328000000_add_shift_assignments.sql is applied and verified
--     2. The updated application code (reading/writing shift_assignments) is deployed to Vercel
--     3. Smoke-test confirms signup, signoff, and removal all function correctly
--
--   For local dev and CI, supabase db reset applies both migrations in sequence automatically.
--   No manual sequencing is needed outside of production.
--
-- Rollback:
--   ALTER TABLE public.shifts
--     ADD COLUMN bartenders jsonb NOT NULL DEFAULT '[]'::jsonb;
--
--   UPDATE public.shifts s
--   SET bartenders = (
--     SELECT COALESCE(jsonb_agg(sa.user_id::text ORDER BY sa.created_at), '[]'::jsonb)
--     FROM public.shift_assignments sa
--     WHERE sa.shift_id = s.id
--   );


ALTER TABLE public.shifts DROP COLUMN bartenders;
