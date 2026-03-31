# Developer Schema Brief — Reports Domain

Applied via migrations `20260331000000` and `20260331000001`.

---

## Table map

### Configuration tables (manager-maintained, shared across reports)

| Table | Key columns | Notes |
|---|---|---|
| `task_templates` | `id`, `name`, `is_active`, `created_at` | At most one row may have `is_active = true` — enforced by partial unique index. To activate a new template, set the current one to `false` first (or in one transaction). |
| `task_template_items` | `id`, `template_id`, `position`, `description`, `created_at` | FK → `task_templates` CASCADE. `position > 0`. Ordering is managed by app. |
| `stock_items` | `id`, `name`, `unit`, `position`, `created_at` | Global list. `position > 0`. |
| `report_sections` | `id`, `name`, `position`, `created_at` | Global Part III section list. `position > 0`. |

### Reports

| Table | Key columns | Notes |
|---|---|---|
| `reports` | `id`, `shift_id`, `status`, `created_at`, `submitted_at`, `submitted_by` | `shift_id` is UNIQUE — one report per shift. `status` is `in_progress` \| `completed`. DB constraint enforces: if `status = completed` then `submitted_at` must be set. `submitted_by` may be NULL if user was deleted post-submission. FK on `shifts.report_id` → `reports.id` is now also wired (SET NULL on delete). |

### Part I — snapshot + completions

| Table | Key columns | Notes |
|---|---|---|
| `report_task_items` | `id`, `report_id`, `position`, `description` | Snapshot — text stored directly, no FK to `task_template_items`. Created once at report initialisation. |
| `report_task_completions` | `id`, `task_item_id`, `completed_by`, `completed_at` | UNIQUE on `task_item_id` — one row = task checked. Delete row = task unchecked. `completed_by` SET NULL on user delete. |

### Part II — snapshot + entries

| Table | Key columns | Notes |
|---|---|---|
| `report_stock_items` | `id`, `report_id`, `position`, `name`, `unit` | Snapshot. Text stored directly. |
| `report_stock_entries` | `id`, `stock_item_id`, `quantity`, `not_relevant` | UNIQUE on `stock_item_id`. `CHECK`: `not_relevant = true OR quantity IS NOT NULL`. A missing row means the bartender hasn't filled it yet. App must verify all items have entries before enabling Submit. |

### Part III — snapshot + responses

| Table | Key columns | Notes |
|---|---|---|
| `report_section_items` | `id`, `report_id`, `position`, `name` | Snapshot. Text stored directly. |
| `report_section_responses` | `id`, `section_item_id`, `response` | UNIQUE on `section_item_id`. `response` is nullable — Part III is entirely optional. |

---

## Report initialisation flow

When a shift transitions to `running` (REQ-RPT-001), the app must create a report
and snapshot all three configuration lists in a single transaction:

```
1. INSERT INTO reports (shift_id, status) VALUES ($shiftId, 'in_progress')
2. INSERT INTO report_task_items — copy all items from the active task_template
3. INSERT INTO report_stock_items — copy all current stock_items
4. INSERT INTO report_section_items — copy all current report_sections
5. UPDATE shifts SET report_id = $reportId WHERE id = $shiftId
```

Steps 2–4 must use the state of the configuration tables **at the moment of creation**.
Do not query them lazily at display time — the snapshot tables are the source of truth
for a report's content once created.

---

## Submission flow

```
1. Verify all report_stock_items for this report have a report_stock_entries row
   where (quantity IS NOT NULL OR not_relevant = true)
2. Verify all report_task_items for this report have a report_task_completions row
3. UPDATE reports SET status = 'completed', submitted_at = now(), submitted_by = $userId
4. UPDATE shifts SET state = 'סגורה' WHERE id = $shiftId
```

Submission is irreversible. The DB allows a second submit (no constraint prevents it),
so the application must guard against re-submission explicitly.

---

## RLS — what the developer needs to know

RLS is now enabled on all tables. **`createAdminClient()` bypasses RLS entirely** —
routes using it are unaffected. Routes using `createServerClientWithCookies()`
are now subject to policies.

### Immediate review required

| Route | Current client | Issue after RLS |
|---|---|---|
| `GET /api/shifts` | `createAdminClient()` | No change — continues to work |
| `PATCH /api/shifts/[id]` (signup state update) | `createServerClientWithCookies()` | `shifts` UPDATE is manager-only under RLS. State update (`state = 'מלאה'`) must move to `createAdminClient()` |
| `DELETE /api/shifts/[id]/bartenders/[userId]` | `createAdminClient()` | No change |
| `PATCH /api/users/[id]` (suspend — removes from shifts) | `createAdminClient()` | No change |
| `DELETE /api/users/[id]` | `createAdminClient()` | No change |

### Bartender access pattern for reports

A bartender may only access report data for shifts they are in `shift_assignments` for.
All RLS policies on report tables enforce this via a join through `shift_assignments`.
The `shift_assignments_bartender_insert` policy enforces `user_id = auth.uid()` —
a bartender cannot sign up as another user.

### Role detection

Policies use two helper functions (defined in the RLS migration):
- `public.is_manager()` — true if `profiles.role = 'manager'` for the current user
- `public.is_bartender()` — true if `profiles.role IN ('bartender', 'shift-manager')`

These are `SECURITY DEFINER STABLE` — evaluated once per query, not per row.

---

## Notable constraints summary

| Constraint | Where enforced |
|---|---|
| One report per shift | `reports.shift_id UNIQUE` |
| One active task template | Partial unique index on `task_templates (is_active) WHERE is_active = true` |
| One completion per task | `report_task_completions.task_item_id UNIQUE` |
| One entry per stock item | `report_stock_entries.stock_item_id UNIQUE` |
| One response per section | `report_section_responses.section_item_id UNIQUE` |
| Submission consistency | `reports` CHECK: `status = completed ↔ submitted_at IS NOT NULL` |
| Stock entry validity | `report_stock_entries` CHECK: `not_relevant = true OR quantity IS NOT NULL` |
| Snapshot isolation | `report_task_items`, `report_stock_items`, `report_section_items` store text directly — no FK to live config tables |
| User deletion safety | `completed_by`, `submitted_by` use `ON DELETE SET NULL` |
| Shift deletion safety | `reports.shift_id` uses `ON DELETE RESTRICT` — a shift with a report cannot be deleted |
