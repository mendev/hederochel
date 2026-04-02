import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

// TSK-RPT-007: Task template CRUD (manager)
// TSK-RPT-008: Set active task template
// TSK-RPT-009: Delete non-active task template
// TSK-RPT-013: Stock items management (manager)
// TSK-RPT-016: Open sections management (manager)
//
// Page: הגדרות דוחות, reached via "דוחות" nav button (manager only).
//
// ⚠️  DATA-TESTID GAP — none of the requested attributes exist in the component.
// Tests use semantic selectors. Developer must add these before selectors can be
// fully decoupled from implementation details:
//   tab-templates, tab-stock-items, tab-sections
//   template-card-{id}, template-active-badge, activate-template-{id}
//   delete-template-{id}, add-template
//   stock-item-{id}, section-{id}
//   move-up-{id}, move-down-{id}
//   empty-state
//
// ⚠️  DELTA vs US-022 AF-3 — delete confirmation dialog not implemented.
// handleDelete() calls DELETE API directly without a confirmation prompt.
// Tests match the built behaviour. Clarify with PM before adding UI confirmation.
//
// ⚠️  DELTA vs US-022 AF-4 — task reordering uses ↑/↓ buttons, not drag-and-drop.
// Tests match the built behaviour. Confirm with PM whether DnD is deferred or dropped.

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

function adminClient() {
  return createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ─── DB cleanup helpers ───────────────────────────────────────────────────────

async function cleanupTemplate(id: number) {
  if (!supabaseKey) return;
  try {
    // Must deactivate before delete — active template cannot be deleted via app,
    // but the DB partial unique index allows direct updates from service role.
    await adminClient().from('task_templates').update({ is_active: false }).eq('id', id);
    await adminClient().from('task_templates').delete().eq('id', id);
  } catch { /* best-effort */ }
}

async function cleanupStockItem(id: number) {
  if (!supabaseKey) return;
  try { await adminClient().from('stock_items').delete().eq('id', id); } catch { /* best-effort */ }
}

async function cleanupSection(id: number) {
  if (!supabaseKey) return;
  try { await adminClient().from('report_sections').delete().eq('id', id); } catch { /* best-effort */ }
}

// ─── Login / navigation helpers ───────────────────────────────────────────────

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
}

async function navigateToReports(page: import('@playwright/test').Page) {
  await page.locator('nav.sidebar-nav').getByRole('button', { name: 'דוחות', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'הגדרות דוחות' })).toBeVisible();
}

// ─── 1. Access control ────────────────────────────────────────────────────────

test.describe('Access control', () => {
  test('unauthenticated — "דוחות" nav button not visible', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('nav.sidebar-nav')).toBeVisible();
    await expect(
      page.locator('nav.sidebar-nav').getByRole('button', { name: 'דוחות', exact: true }),
    ).not.toBeVisible();
  });

  test('bartender — "דוחות" nav button not visible', async ({ page }) => {
    await loginAsBartender(page);
    await expect(
      page.locator('nav.sidebar-nav').getByRole('button', { name: 'דוחות', exact: true }),
    ).not.toBeVisible();
  });

  test('manager — reports page loads with all three tabs visible', async ({ page }) => {
    await loginAsManager(page);
    await navigateToReports(page);
    await expect(page.getByRole('tab', { name: 'תבניות משימות' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'פריטי מלאי' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'סעיפי דוח' })).toBeVisible();
  });
});

// ─── 2. Task templates ────────────────────────────────────────────────────────
// Serial: activation tests mutate the global "active template" DB state — running them in parallel
// with other activation tests causes "deactivate all" to race against our template's active state.

test.describe.serial('Task templates', () => {
  const createdIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
    await navigateToReports(page);
    // Templates tab is the default — assert it's active
    await expect(page.getByRole('tab', { name: 'תבניות משימות' })).toBeVisible();
  });

  test.afterEach(async () => {
    for (const id of createdIds) await cleanupTemplate(id);
    createdIds.length = 0;
  });

  // ── Create ──────────────────────────────────────────────────────────────────

  test('create template with no items — appears in list, success toast', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    await page.getByPlaceholder('שם תבנית חדשה').fill(name);
    await page.getByRole('button', { name: 'צור תבנית' }).click();

    await expect(page.getByText('התבנית נוצרה')).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();

    const { data } = await adminClient().from('task_templates').select('id').eq('name', name).single();
    createdIds.push(data!.id);
  });

  test('create template then add items — items appear in correct position order', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    await page.getByPlaceholder('שם תבנית חדשה').fill(name);
    await page.getByRole('button', { name: 'צור תבנית' }).click();
    await expect(page.getByText('התבנית נוצרה')).toBeVisible();

    const { data } = await adminClient().from('task_templates').select('id').eq('name', name).single();
    createdIds.push(data!.id);

    const card = page.locator('div.border.rounded-lg', { hasText: name });
    await card.getByRole('button', { name: 'ערוך' }).click();
    // In edit mode the name moves to <Input>, so card hasText stops matching — use page-scoped locators
    await page.getByRole('button', { name: '+ הוסף משימה' }).click();
    await page.locator('input[placeholder="תיאור משימה"]').nth(0).fill('משימה ראשונה');
    await page.getByRole('button', { name: '+ הוסף משימה' }).click();
    await page.locator('input[placeholder="תיאור משימה"]').nth(1).fill('משימה שנייה');
    await page.getByRole('button', { name: 'שמור' }).click();

    await expect(page.getByText('התבנית עודכנה')).toBeVisible();

    // Card stays expanded after save — do NOT click name (that would collapse it)
    await expect(card.getByText('משימה ראשונה')).toBeVisible();
    await expect(card.getByText('משימה שנייה')).toBeVisible();
    const items = await card.locator('div.flex.items-center.gap-2.text-sm span').allTextContents();
    // ראשונה must precede שנייה
    expect(items.findIndex(t => t.includes('ראשונה'))).toBeLessThan(
      items.findIndex(t => t.includes('שנייה')),
    );
  });

  // ── Edit ────────────────────────────────────────────────────────────────────

  test('edit template name only — name updates, items unchanged', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    const renamed = `${name}-renamed`;
    const { data } = await adminClient()
      .from('task_templates')
      .insert({ name })
      .select('id')
      .single();
    const id = data!.id;
    createdIds.push(id);
    await adminClient().from('task_template_items').insert([
      { template_id: id, position: 1, description: 'פריט קיים' },
    ]);

    await page.reload();
    await navigateToReports(page);

    const card = page.locator('div.border.rounded-lg', { hasText: name });
    await card.getByRole('button', { name: 'ערוך' }).click();

    // In edit mode the name moves to <Input>, so card hasText stops matching — use page-scoped locator
    const editingCard = page.locator('div.border.rounded-lg').filter({ has: page.getByRole('button', { name: 'שמור' }) });
    await editingCard.locator('input').first().fill(renamed);
    await page.getByRole('button', { name: 'שמור' }).click();

    await expect(page.getByText('התבנית עודכנה')).toBeVisible();
    await expect(page.getByText(renamed)).toBeVisible();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();

    // Card stays expanded after save — do NOT click name (that would collapse it)
    const renamedCard = page.locator('div.border.rounded-lg', { hasText: renamed });
    await expect(renamedCard.getByText('פריט קיים')).toBeVisible();
  });

  test('edit items (replace list) — old items gone, new items appear in order', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await adminClient()
      .from('task_templates')
      .insert({ name })
      .select('id')
      .single();
    const id = data!.id;
    createdIds.push(id);
    await adminClient().from('task_template_items').insert([
      { template_id: id, position: 1, description: 'ישנה א' },
      { template_id: id, position: 2, description: 'ישנה ב' },
    ]);

    await page.reload();
    await navigateToReports(page);

    const card = page.locator('div.border.rounded-lg', { hasText: name });
    await card.getByRole('button', { name: 'ערוך' }).click();

    // In edit mode the name moves to <Input>, so card hasText stops matching — use page-scoped locators
    let removeBtn = page.getByRole('button', { name: '×' }).first();
    while (await removeBtn.isVisible()) {
      await removeBtn.click();
      removeBtn = page.getByRole('button', { name: '×' }).first();
    }

    // Add one new item
    await page.getByRole('button', { name: '+ הוסף משימה' }).click();
    await page.locator('input[placeholder="תיאור משימה"]').fill('חדשה א');
    await page.getByRole('button', { name: 'שמור' }).click();

    await expect(page.getByText('התבנית עודכנה')).toBeVisible();

    // Card stays expanded after save — do NOT click name (that would collapse it)
    await expect(card.getByText('חדשה א')).toBeVisible();
    await expect(card.getByText('ישנה א')).not.toBeVisible();
    await expect(card.getByText('ישנה ב')).not.toBeVisible();
  });

  // ── Reorder items ────────────────────────────────────────────────────────────

  test('reorder items via ↑/↓ — order updates on screen', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await adminClient()
      .from('task_templates')
      .insert({ name })
      .select('id')
      .single();
    const id = data!.id;
    createdIds.push(id);
    await adminClient().from('task_template_items').insert([
      { template_id: id, position: 1, description: 'ראשון' },
      { template_id: id, position: 2, description: 'שני' },
    ]);

    await page.reload();
    await navigateToReports(page);

    const card = page.locator('div.border.rounded-lg', { hasText: name });
    await card.getByRole('button', { name: 'ערוך' }).click();

    // In edit mode card hasText stops matching — use page-scoped locators
    await page.getByRole('button', { name: '↓' }).first().click();

    const inputs = page.locator('input[placeholder="תיאור משימה"]');
    await expect(inputs.nth(0)).toHaveValue('שני');
    await expect(inputs.nth(1)).toHaveValue('ראשון');
  });

  test('reorder items — order persists after save and page reload', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await adminClient()
      .from('task_templates')
      .insert({ name })
      .select('id')
      .single();
    const id = data!.id;
    createdIds.push(id);
    await adminClient().from('task_template_items').insert([
      { template_id: id, position: 1, description: 'ראשון' },
      { template_id: id, position: 2, description: 'שני' },
    ]);

    await page.reload();
    await navigateToReports(page);

    const card = page.locator('div.border.rounded-lg', { hasText: name });
    await card.getByRole('button', { name: 'ערוך' }).click();
    // In edit mode card hasText stops matching — use page-scoped locators
    await page.getByRole('button', { name: '↓' }).first().click();
    await page.getByRole('button', { name: 'שמור' }).click();
    await expect(page.getByText('התבנית עודכנה')).toBeVisible();

    // Navigate away and back
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'ניהול משמרות', exact: true }).click();
    await navigateToReports(page);

    const freshCard = page.locator('div.border.rounded-lg', { hasText: name });
    await freshCard.getByText(name).click();
    const spanTexts = await freshCard.locator('div.flex.items-center.gap-2.text-sm span').allTextContents();
    const idx1 = spanTexts.findIndex(t => t.includes('ראשון'));
    const idx2 = spanTexts.findIndex(t => t.includes('שני'));
    expect(idx2).toBeLessThan(idx1); // שני now leads
  });

  // ── Activate ─────────────────────────────────────────────────────────────────

  test('activate inactive template — active badge appears, previous template loses badge', async ({ page }) => {
    const nameA = `test-tmpl-A-${crypto.randomUUID().slice(0, 6)}`;
    const nameB = `test-tmpl-B-${crypto.randomUUID().slice(0, 6)}`;

    // Insert both as inactive — activate A via UI first, then activate B
    const { data: a } = await adminClient().from('task_templates').insert({ name: nameA }).select('id').single();
    const { data: b } = await adminClient().from('task_templates').insert({ name: nameB }).select('id').single();
    createdIds.push(a!.id, b!.id);

    await page.reload();
    await navigateToReports(page);

    const cardA = page.locator('div.border.rounded-lg', { hasText: nameA });
    const cardB = page.locator('div.border.rounded-lg', { hasText: nameB });

    // Activate A
    await cardA.getByRole('button', { name: 'הגדר כתבנית פעילה' }).click();
    await expect(page.getByText('התבנית הוגדרה כפעילה')).toBeVisible();
    // Use exact:true to match badge "פעילה" only — not partial match on "הגדר כתבנית פעילה" button
    await expect(cardA.getByText('פעילה', { exact: true })).toBeVisible();
    await expect(cardA.getByRole('button', { name: 'הגדר כתבנית פעילה' })).not.toBeVisible();

    // Activate B — A should lose its badge
    await cardB.getByRole('button', { name: 'הגדר כתבנית פעילה' }).click();
    await expect(page.getByText('התבנית הוגדרה כפעילה')).toBeVisible();
    await expect(cardB.getByText('פעילה', { exact: true })).toBeVisible();
    await expect(cardA.getByText('פעילה', { exact: true })).not.toBeVisible();
    await expect(cardA.getByRole('button', { name: 'הגדר כתבנית פעילה' })).toBeVisible();
  });

  test('active template — activate button not shown (already active)', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await adminClient().from('task_templates').insert({ name }).select('id').single();
    createdIds.push(data!.id);

    // Activate via API so we don't depend on existing active-template state
    await page.reload();
    await navigateToReports(page);
    const card = page.locator('div.border.rounded-lg', { hasText: name });
    await card.getByRole('button', { name: 'הגדר כתבנית פעילה' }).click();
    await expect(page.getByText('התבנית הוגדרה כפעילה')).toBeVisible();

    await expect(card.getByText('פעילה', { exact: true })).toBeVisible();
    await expect(card.getByRole('button', { name: 'הגדר כתבנית פעילה' })).not.toBeVisible();
  });

  // ── Delete ───────────────────────────────────────────────────────────────────

  test('delete inactive template — removed from list, success toast', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await adminClient()
      .from('task_templates')
      .insert({ name, is_active: false })
      .select('id')
      .single();
    const id = data!.id;
    createdIds.push(id);

    await page.reload();
    await navigateToReports(page);

    const card = page.locator('div.border.rounded-lg', { hasText: name });
    await card.getByRole('button', { name: 'מחק' }).click();
    await expect(page.getByText('התבנית נמחקה')).toBeVisible();
    await expect(page.getByText(name)).not.toBeVisible();

    // Already deleted — remove from cleanup list
    createdIds.splice(createdIds.indexOf(id), 1);
  });

  test('active template — delete button is disabled in UI', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await adminClient()
      .from('task_templates')
      .insert({ name })
      .select('id')
      .single();
    createdIds.push(data!.id);

    await page.reload();
    await navigateToReports(page);

    // Activate via UI to avoid is_active: true insert conflicting with existing active
    const card = page.locator('div.border.rounded-lg', { hasText: name });
    await card.getByRole('button', { name: 'הגדר כתבנית פעילה' }).click();
    await expect(page.getByText('התבנית הוגדרה כפעילה')).toBeVisible();

    await expect(card.getByRole('button', { name: 'מחק' })).toBeDisabled();
  });

  test('active template — DELETE /api/reports/templates/[id] returns 400', async ({ page }) => {
    const name = `test-tmpl-${crypto.randomUUID().slice(0, 8)}`;
    const { data } = await adminClient()
      .from('task_templates')
      .insert({ name })
      .select('id')
      .single();
    const id = data!.id;
    createdIds.push(id);

    // Activate via direct API call — faster and smaller window for parallel-test interference
    // (UI-based activation takes seconds, giving parallel tests time to deactivate ours)
    const activateRes = await page.request.patch(`/api/reports/templates/${id}/activate`);
    expect(activateRes.ok()).toBeTruthy();

    const res = await page.request.delete(`/api/reports/templates/${id}`);
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('לא ניתן למחוק תבנית פעילה');
  });

  // ── Empty state ──────────────────────────────────────────────────────────────

  test('no templates exist — empty state message shown', async ({ page }) => {
    const { data } = await adminClient().from('task_templates').select('id').limit(1);
    if (data && data.length > 0) {
      test.skip(true, 'Templates exist in DB — empty state not reachable this run');
      return;
    }
    await expect(page.getByText('אין תבניות. צור תבנית ראשונה.')).toBeVisible();
  });

  // ── Error toast ──────────────────────────────────────────────────────────────

  test('API failure on create — error toast shown', async ({ page }) => {
    await page.route('/api/reports/templates', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'server error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByPlaceholder('שם תבנית חדשה').fill('failing template');
    await page.getByRole('button', { name: 'צור תבנית' }).click();
    // Component shows err.message (the intercepted error text), not the fallback string — detect any error toast
    await expect(page.locator('[data-type="error"]')).toBeVisible();
  });
});

// ─── 3. Stock items ───────────────────────────────────────────────────────────

test.describe('Stock items', () => {
  const createdIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
    await navigateToReports(page);
    await page.getByRole('tab', { name: 'פריטי מלאי' }).click();
    await expect(page.getByPlaceholder('שם פריט')).toBeVisible();
  });

  test.afterEach(async () => {
    for (const id of createdIds) await cleanupStockItem(id);
    createdIds.length = 0;
  });

  // ── Add ──────────────────────────────────────────────────────────────────────

  test('add stock item — appears in list, success toast', async ({ page }) => {
    const name = `test-stock-${crypto.randomUUID().slice(0, 8)}`;
    await page.getByPlaceholder('שם פריט').fill(name);
    await page.getByPlaceholder('יחידת מידה').fill('בקבוק');
    await page.getByRole('button', { name: 'הוסף' }).click();

    await expect(page.getByText('הפריט נוסף')).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText('בקבוק')).toBeVisible();

    const { data } = await adminClient().from('stock_items').select('id').eq('name', name).single();
    createdIds.push(data!.id);
  });

  // ── Edit ──────────────────────────────────────────────────────────────────────

  test('edit stock item name and unit — reflected immediately, success toast', async ({ page }) => {
    const name = `test-stock-${crypto.randomUUID().slice(0, 8)}`;
    // Insert at a high position so it lands at the end of the list
    const { count } = await adminClient()
      .from('stock_items')
      .select('*', { count: 'exact', head: true });
    const { data } = await adminClient()
      .from('stock_items')
      .insert({ name, unit: 'יחידות', position: (count ?? 0) + 100 })
      .select('id')
      .single();
    createdIds.push(data!.id);

    await page.reload();
    await navigateToReports(page);
    await page.getByRole('tab', { name: 'פריטי מלאי' }).click();

    const row = page.locator('div.flex.items-center.gap-2.border.rounded', { hasText: name });
    await row.getByRole('button', { name: 'ערוך' }).click();
    // In edit mode the name moves to <Input>, so row hasText stops matching — use page-scoped locator
    const editingRow = page.locator('div.flex.items-center.gap-2.border.rounded').filter({ has: page.getByRole('button', { name: 'שמור' }) });
    await editingRow.locator('input').nth(0).fill(`${name}-updated`);
    await editingRow.locator('input').nth(1).fill('ליטר');
    await editingRow.getByRole('button', { name: 'שמור' }).click();

    await expect(page.getByText('הפריט עודכן')).toBeVisible();
    await expect(page.getByText(`${name}-updated`)).toBeVisible();
    await expect(page.getByText('ליטר')).toBeVisible();
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  test('delete stock item — removed from list, success toast', async ({ page }) => {
    const name = `test-stock-${crypto.randomUUID().slice(0, 8)}`;
    const { count } = await adminClient()
      .from('stock_items')
      .select('*', { count: 'exact', head: true });
    const { data } = await adminClient()
      .from('stock_items')
      .insert({ name, unit: 'יחידות', position: (count ?? 0) + 100 })
      .select('id')
      .single();
    const id = data!.id;
    createdIds.push(id);

    await page.reload();
    await navigateToReports(page);
    await page.getByRole('tab', { name: 'פריטי מלאי' }).click();

    const row = page.locator('div.flex.items-center.gap-2.border.rounded', { hasText: name });
    await row.getByRole('button', { name: 'מחק' }).click();
    await expect(page.getByText('הפריט נמחק')).toBeVisible();
    await expect(page.getByText(name)).not.toBeVisible();
    createdIds.splice(createdIds.indexOf(id), 1);
  });

  // ── Reorder ───────────────────────────────────────────────────────────────────

  test('reorder via ↑/↓ — order updates and persists after page reload', async ({ page }) => {
    // Add two items via UI to guarantee adjacent positions at end of list
    const nameA = `stock-A-${crypto.randomUUID().slice(0, 6)}`;
    const nameB = `stock-B-${crypto.randomUUID().slice(0, 6)}`;

    await page.getByPlaceholder('שם פריט').fill(nameA);
    await page.getByPlaceholder('יחידת מידה').fill('יח');
    await page.getByRole('button', { name: 'הוסף' }).click();
    await expect(page.getByText('הפריט נוסף')).toBeVisible();

    await page.getByPlaceholder('שם פריט').fill(nameB);
    await page.getByPlaceholder('יחידת מידה').fill('יח');
    await page.getByRole('button', { name: 'הוסף' }).click();
    await expect(page.getByText('הפריט נוסף')).toBeVisible();

    // Brief wait for local DB write to be visible before querying via admin client
    await page.waitForTimeout(300);
    const { data: dA } = await adminClient().from('stock_items').select('id').eq('name', nameA).single();
    const { data: dB } = await adminClient().from('stock_items').select('id').eq('name', nameB).single();
    if (!dA || !dB) throw new Error(`Test stock items not found in DB — dA: ${JSON.stringify(dA)}, dB: ${JSON.stringify(dB)}`);
    createdIds.push(dA.id, dB.id);

    // A is above B — move A down
    const rowA = page.locator('div.flex.items-center.gap-2.border.rounded', { hasText: nameA });
    await rowA.getByRole('button', { name: '↓' }).click();
    // allTextContents() doesn't retry — wrap in toPass() so Playwright re-reads until the DOM reflects the swap
    await expect(async () => {
      const names = await page.locator('div.flex.items-center.gap-2.border.rounded span.flex-1').allTextContents();
      const idxA = names.findIndex(t => t.includes(nameA));
      const idxB = names.findIndex(t => t.includes(nameB));
      expect(idxB).toBeLessThan(idxA);
    }).toPass({ timeout: 5000 });

    // Navigate away and back — verify persistence
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'ניהול משמרות', exact: true }).click();
    await navigateToReports(page);
    await page.getByRole('tab', { name: 'פריטי מלאי' }).click();
    // Wait for the async fetch to complete before reading text
    await expect(page.getByText(nameA)).toBeVisible();

    const reloaded = await page.locator('div.flex.items-center.gap-2.border.rounded span.flex-1').allTextContents();
    const rIdxA = reloaded.findIndex(t => t.includes(nameA));
    const rIdxB = reloaded.findIndex(t => t.includes(nameB));
    expect(rIdxB).toBeLessThan(rIdxA);
  });

  // ── Error toast ───────────────────────────────────────────────────────────────

  test('API failure on add — error toast shown', async ({ page }) => {
    await page.route('/api/reports/stock-items', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'server error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByPlaceholder('שם פריט').fill('failing item');
    await page.getByPlaceholder('יחידת מידה').fill('יח');
    await page.getByRole('button', { name: 'הוסף' }).click();
    // Component shows err.message, not the fallback string — detect any error toast
    await expect(page.locator('[data-type="error"]')).toBeVisible();
  });
});

// ─── 4. Open sections ─────────────────────────────────────────────────────────

test.describe('Open sections', () => {
  const createdIds: number[] = [];

  test.beforeEach(async ({ page }) => {
    await loginAsManager(page);
    await navigateToReports(page);
    await page.getByRole('tab', { name: 'סעיפי דוח' }).click();
    await expect(page.getByPlaceholder('שם סעיף חדש')).toBeVisible();
  });

  test.afterEach(async () => {
    for (const id of createdIds) await cleanupSection(id);
    createdIds.length = 0;
  });

  // ── Add ───────────────────────────────────────────────────────────────────────

  test('add section — appears in list, success toast', async ({ page }) => {
    const name = `test-section-${crypto.randomUUID().slice(0, 8)}`;
    await page.getByPlaceholder('שם סעיף חדש').fill(name);
    await page.getByRole('button', { name: 'הוסף' }).click();

    await expect(page.getByText('הסעיף נוסף')).toBeVisible();
    await expect(page.getByText(name)).toBeVisible();

    const { data } = await adminClient().from('report_sections').select('id').eq('name', name).single();
    createdIds.push(data!.id);
  });

  // ── Edit ───────────────────────────────────────────────────────────────────────

  test('edit section name — reflected immediately, success toast', async ({ page }) => {
    const name = `test-section-${crypto.randomUUID().slice(0, 8)}`;
    const { count } = await adminClient()
      .from('report_sections')
      .select('*', { count: 'exact', head: true });
    const { data } = await adminClient()
      .from('report_sections')
      .insert({ name, position: (count ?? 0) + 100 })
      .select('id')
      .single();
    createdIds.push(data!.id);

    await page.reload();
    await navigateToReports(page);
    await page.getByRole('tab', { name: 'סעיפי דוח' }).click();

    const row = page.locator('div.flex.items-center.gap-2.border.rounded', { hasText: name });
    await row.getByRole('button', { name: 'ערוך' }).click();
    // In edit mode the name moves to <Input>, so row hasText stops matching — use page-scoped locator
    await page.locator('div.flex.items-center.gap-2.border.rounded').filter({ has: page.getByRole('button', { name: 'שמור' }) }).locator('input').fill(`${name}-updated`);
    await page.getByRole('button', { name: 'שמור' }).click();

    await expect(page.getByText('הסעיף עודכן')).toBeVisible();
    await expect(page.getByText(`${name}-updated`)).toBeVisible();
    await expect(page.getByText(name, { exact: true })).not.toBeVisible();
  });

  // ── Delete ────────────────────────────────────────────────────────────────────

  test('delete section — removed from list, success toast', async ({ page }) => {
    const name = `test-section-${crypto.randomUUID().slice(0, 8)}`;
    const { count } = await adminClient()
      .from('report_sections')
      .select('*', { count: 'exact', head: true });
    const { data } = await adminClient()
      .from('report_sections')
      .insert({ name, position: (count ?? 0) + 100 })
      .select('id')
      .single();
    const id = data!.id;
    createdIds.push(id);

    await page.reload();
    await navigateToReports(page);
    await page.getByRole('tab', { name: 'סעיפי דוח' }).click();

    const row = page.locator('div.flex.items-center.gap-2.border.rounded', { hasText: name });
    await row.getByRole('button', { name: 'מחק' }).click();
    await expect(page.getByText('הסעיף נמחק')).toBeVisible();
    await expect(page.getByText(name)).not.toBeVisible();
    createdIds.splice(createdIds.indexOf(id), 1);
  });

  // ── Reorder ───────────────────────────────────────────────────────────────────

  test('reorder via ↑/↓ — order updates and persists after page reload', async ({ page }) => {
    // Add two sections via UI for adjacent, end-of-list positions
    const nameA = `sect-A-${crypto.randomUUID().slice(0, 6)}`;
    const nameB = `sect-B-${crypto.randomUUID().slice(0, 6)}`;

    await page.getByPlaceholder('שם סעיף חדש').fill(nameA);
    await page.getByRole('button', { name: 'הוסף' }).click();
    await expect(page.getByText('הסעיף נוסף')).toBeVisible();

    await page.getByPlaceholder('שם סעיף חדש').fill(nameB);
    await page.getByRole('button', { name: 'הוסף' }).click();
    await expect(page.getByText('הסעיף נוסף')).toBeVisible();

    // Brief wait for local DB write to be visible before querying via admin client
    await page.waitForTimeout(600);
    const { data: dA } = await adminClient().from('report_sections').select('id').eq('name', nameA).single();
    const { data: dB } = await adminClient().from('report_sections').select('id').eq('name', nameB).single();
    if (!dA || !dB) throw new Error(`Test sections not found in DB — dA: ${JSON.stringify(dA)}, dB: ${JSON.stringify(dB)}`);
    createdIds.push(dA.id, dB.id);

    // A is above B — move A down
    const rowA = page.locator('div.flex.items-center.gap-2.border.rounded', { hasText: nameA });
    await rowA.getByRole('button', { name: '↓' }).click();
    // allTextContents() doesn't retry — wrap in toPass() so Playwright re-reads until the DOM reflects the swap
    await expect(async () => {
      const names = await page.locator('div.flex.items-center.gap-2.border.rounded span.flex-1').allTextContents();
      const idxA = names.findIndex(t => t.includes(nameA));
      const idxB = names.findIndex(t => t.includes(nameB));
      expect(idxB).toBeLessThan(idxA);
    }).toPass({ timeout: 5000 });

    // Navigate away and back — verify persistence
    await page.locator('nav.sidebar-nav').getByRole('button', { name: 'ניהול משמרות', exact: true }).click();
    await navigateToReports(page);
    await page.getByRole('tab', { name: 'סעיפי דוח' }).click();
    // Wait for the async fetch to complete before reading text
    await expect(page.getByText(nameA)).toBeVisible();

    const reloaded = await page.locator('div.flex.items-center.gap-2.border.rounded span.flex-1').allTextContents();
    const rIdxA = reloaded.findIndex(t => t.includes(nameA));
    const rIdxB = reloaded.findIndex(t => t.includes(nameB));
    expect(rIdxB).toBeLessThan(rIdxA);
  });

  // ── Error toast ───────────────────────────────────────────────────────────────

  test('API failure on add — error toast shown', async ({ page }) => {
    await page.route('/api/reports/sections', async route => {
      if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'server error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.getByPlaceholder('שם סעיף חדש').fill('failing section');
    await page.getByRole('button', { name: 'הוסף' }).click();
    // Component shows err.message, not the fallback string — detect any error toast
    await expect(page.locator('[data-type="error"]')).toBeVisible();
  });
});
