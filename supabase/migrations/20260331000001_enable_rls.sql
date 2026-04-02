-- Migration: 20260331000001_enable_rls.sql
-- Description: Enables Row Level Security on all tables and defines access policies.
--   Covers existing tables (profiles, shifts, shift_assignments, products) and
--   all new reports-domain tables.
--
--   Role detection uses a subquery against profiles.role because roles are not
--   embedded in the Supabase JWT for this project. Two SECURITY DEFINER helper
--   functions are created to keep policy definitions readable and avoid repeated
--   subquery expansion per row.
--
--   IMPORTANT — Supabase admin client (service_role key) bypasses RLS entirely.
--   API routes that use createAdminClient() are unaffected by these policies.
--   Routes that use createServerClientWithCookies() will be subject to them.
--   The developer must audit which client each route should use after this
--   migration is applied. See developer brief: docs/dev/TSK-SHF-020-schema-brief.md
--
-- Rollback:
--   DROP FUNCTION IF EXISTS public.is_manager();
--   DROP FUNCTION IF EXISTS public.is_bartender();
--   ALTER TABLE public.profiles              DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.shifts                DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.shift_assignments     DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.products              DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.task_templates        DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.task_template_items   DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.stock_items           DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.report_sections       DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.reports               DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.report_task_items     DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.report_task_completions DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.report_stock_items    DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.report_stock_entries  DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.report_section_items  DISABLE ROW LEVEL SECURITY;
--   ALTER TABLE public.report_section_responses DISABLE ROW LEVEL SECURITY;
--   -- Then drop all policies individually, or just leave RLS disabled.


-- ─── Role helper functions ────────────────────────────────────────────────────
-- SECURITY DEFINER + STABLE: evaluated once per query, not per row.
-- Querying profiles inside a policy without these would cause a per-row lookup.

CREATE OR REPLACE FUNCTION public.is_manager()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'manager'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_bartender()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  -- shift-manager is treated as bartender-level for RLS purposes in v.1
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('bartender', 'shift-manager')
  );
$$;


-- ═══════════════════════════════════════════════════════════════════════════════
-- EXISTING TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── profiles ─────────────────────────────────────────────────────────────────

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Managers: full access
CREATE POLICY "profiles_manager_all" ON public.profiles
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Any authenticated user: read their own profile
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT
  USING (id = auth.uid());

-- Any authenticated user: update their own profile
CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());


-- ─── shifts ───────────────────────────────────────────────────────────────────

ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;

-- Managers: full access
CREATE POLICY "shifts_manager_all" ON public.shifts
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Authenticated users: read all shifts (bartenders need to browse open shifts)
CREATE POLICY "shifts_authenticated_select" ON public.shifts
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- NOTE TO DEVELOPER: shift state updates triggered by signup/signoff
-- (state → 'מלאה' / 'פתוחה') must use createAdminClient() after RLS is enabled,
-- since the authenticated policy above covers SELECT only.


-- ─── shift_assignments ────────────────────────────────────────────────────────

ALTER TABLE public.shift_assignments ENABLE ROW LEVEL SECURITY;

-- Managers: full access
CREATE POLICY "shift_assignments_manager_all" ON public.shift_assignments
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Bartenders: read their own assignments
CREATE POLICY "shift_assignments_bartender_select" ON public.shift_assignments
  FOR SELECT
  USING (user_id = auth.uid());

-- Bartenders: sign up (insert their own assignment only)
CREATE POLICY "shift_assignments_bartender_insert" ON public.shift_assignments
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Bartenders: cancel (delete their own assignment only)
CREATE POLICY "shift_assignments_bartender_delete" ON public.shift_assignments
  FOR DELETE
  USING (user_id = auth.uid());


-- ─── products (v.2 scope — locked down until products feature is built) ───────

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "products_manager_all" ON public.products
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());


-- ═══════════════════════════════════════════════════════════════════════════════
-- REPORTS DOMAIN — CONFIGURATION TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── task_templates ───────────────────────────────────────────────────────────

ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_templates_manager_all" ON public.task_templates
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Bartenders: read the active template only (needed at report creation)
CREATE POLICY "task_templates_bartender_select_active" ON public.task_templates
  FOR SELECT
  USING (public.is_bartender() AND is_active = true);


-- ─── task_template_items ──────────────────────────────────────────────────────

ALTER TABLE public.task_template_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "task_template_items_manager_all" ON public.task_template_items
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Bartenders: read items belonging to the active template only
CREATE POLICY "task_template_items_bartender_select_active" ON public.task_template_items
  FOR SELECT
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.task_templates t
      WHERE t.id = task_template_items.template_id AND t.is_active = true
    )
  );


-- ─── stock_items ──────────────────────────────────────────────────────────────

ALTER TABLE public.stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "stock_items_manager_all" ON public.stock_items
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "stock_items_bartender_select" ON public.stock_items
  FOR SELECT
  USING (auth.role() = 'authenticated');


-- ─── report_sections ──────────────────────────────────────────────────────────

ALTER TABLE public.report_sections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_sections_manager_all" ON public.report_sections
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "report_sections_bartender_select" ON public.report_sections
  FOR SELECT
  USING (auth.role() = 'authenticated');


-- ═══════════════════════════════════════════════════════════════════════════════
-- REPORTS DOMAIN — REPORT + SNAPSHOT + RESPONSE TABLES
-- ═══════════════════════════════════════════════════════════════════════════════

-- ─── reports ──────────────────────────────────────────────────────────────────

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reports_manager_all" ON public.reports
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

-- Bartenders: read reports for shifts they are assigned to
CREATE POLICY "reports_bartender_select" ON public.reports
  FOR SELECT
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.shift_assignments sa
      WHERE sa.shift_id = reports.shift_id AND sa.user_id = auth.uid()
    )
  );

-- Bartenders: update (submit) reports for their own assigned shifts
CREATE POLICY "reports_bartender_update" ON public.reports
  FOR UPDATE
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.shift_assignments sa
      WHERE sa.shift_id = reports.shift_id AND sa.user_id = auth.uid()
    )
  )
  WITH CHECK (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.shift_assignments sa
      WHERE sa.shift_id = reports.shift_id AND sa.user_id = auth.uid()
    )
  );


-- ─── report_task_items (snapshot — read only for bartenders) ─────────────────

ALTER TABLE public.report_task_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_task_items_manager_all" ON public.report_task_items
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "report_task_items_bartender_select" ON public.report_task_items
  FOR SELECT
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE r.id = report_task_items.report_id AND sa.user_id = auth.uid()
    )
  );


-- ─── report_task_completions ──────────────────────────────────────────────────

ALTER TABLE public.report_task_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_task_completions_manager_all" ON public.report_task_completions
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "report_task_completions_bartender_select" ON public.report_task_completions
  FOR SELECT
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.report_task_items rti
      JOIN public.reports r ON r.id = rti.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rti.id = report_task_completions.task_item_id AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "report_task_completions_bartender_insert" ON public.report_task_completions
  FOR INSERT
  WITH CHECK (
    public.is_bartender()
    AND completed_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.report_task_items rti
      JOIN public.reports r ON r.id = rti.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rti.id = report_task_completions.task_item_id
        AND sa.user_id = auth.uid()
        AND r.status = 'in_progress'
    )
  );

CREATE POLICY "report_task_completions_bartender_delete" ON public.report_task_completions
  FOR DELETE
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.report_task_items rti
      JOIN public.reports r ON r.id = rti.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rti.id = report_task_completions.task_item_id
        AND sa.user_id = auth.uid()
        AND r.status = 'in_progress'
    )
  );


-- ─── report_stock_items (snapshot — read only for bartenders) ────────────────

ALTER TABLE public.report_stock_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_stock_items_manager_all" ON public.report_stock_items
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "report_stock_items_bartender_select" ON public.report_stock_items
  FOR SELECT
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE r.id = report_stock_items.report_id AND sa.user_id = auth.uid()
    )
  );


-- ─── report_stock_entries ─────────────────────────────────────────────────────

ALTER TABLE public.report_stock_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_stock_entries_manager_all" ON public.report_stock_entries
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "report_stock_entries_bartender_select" ON public.report_stock_entries
  FOR SELECT
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.report_stock_items rsi
      JOIN public.reports r ON r.id = rsi.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rsi.id = report_stock_entries.stock_item_id AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "report_stock_entries_bartender_insert" ON public.report_stock_entries
  FOR INSERT
  WITH CHECK (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.report_stock_items rsi
      JOIN public.reports r ON r.id = rsi.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rsi.id = report_stock_entries.stock_item_id
        AND sa.user_id = auth.uid()
        AND r.status = 'in_progress'
    )
  );

CREATE POLICY "report_stock_entries_bartender_update" ON public.report_stock_entries
  FOR UPDATE
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.report_stock_items rsi
      JOIN public.reports r ON r.id = rsi.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rsi.id = report_stock_entries.stock_item_id
        AND sa.user_id = auth.uid()
        AND r.status = 'in_progress'
    )
  );


-- ─── report_section_items (snapshot — read only for bartenders) ──────────────

ALTER TABLE public.report_section_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_section_items_manager_all" ON public.report_section_items
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "report_section_items_bartender_select" ON public.report_section_items
  FOR SELECT
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.reports r
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE r.id = report_section_items.report_id AND sa.user_id = auth.uid()
    )
  );


-- ─── report_section_responses ─────────────────────────────────────────────────

ALTER TABLE public.report_section_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "report_section_responses_manager_all" ON public.report_section_responses
  FOR ALL
  USING (public.is_manager())
  WITH CHECK (public.is_manager());

CREATE POLICY "report_section_responses_bartender_select" ON public.report_section_responses
  FOR SELECT
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.report_section_items rsi
      JOIN public.reports r ON r.id = rsi.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rsi.id = report_section_responses.section_item_id AND sa.user_id = auth.uid()
    )
  );

CREATE POLICY "report_section_responses_bartender_insert" ON public.report_section_responses
  FOR INSERT
  WITH CHECK (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.report_section_items rsi
      JOIN public.reports r ON r.id = rsi.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rsi.id = report_section_responses.section_item_id
        AND sa.user_id = auth.uid()
        AND r.status = 'in_progress'
    )
  );

CREATE POLICY "report_section_responses_bartender_update" ON public.report_section_responses
  FOR UPDATE
  USING (
    public.is_bartender() AND EXISTS (
      SELECT 1 FROM public.report_section_items rsi
      JOIN public.reports r ON r.id = rsi.report_id
      JOIN public.shift_assignments sa ON sa.shift_id = r.shift_id
      WHERE rsi.id = report_section_responses.section_item_id
        AND sa.user_id = auth.uid()
        AND r.status = 'in_progress'
    )
  );
