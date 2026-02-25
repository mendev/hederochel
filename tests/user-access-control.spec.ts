import { test, expect } from '@playwright/test';

// REQ-USR-011: Bartenders cannot access manager-only pages or API routes

test.describe('User management access control', () => {
  let userEmail: string;
  let userPassword: string;

  test.beforeEach(() => {
    if (!process.env.TEST_USER_EMAIL || !process.env.TEST_USER_PASSWORD) {
      throw new Error('Missing TEST_USER_EMAIL or TEST_USER_PASSWORD');
    }
    userEmail = process.env.TEST_USER_EMAIL;
    userPassword = process.env.TEST_USER_PASSWORD;
  });

  // ── UI access ──────────────────────────────────────────────────────────────

  test('non-manager does not see user management nav item', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', userEmail);
    await page.fill('#password', userPassword);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();
    await expect(page.locator('nav.sidebar-nav >> text=ניהול משתמשים')).not.toBeVisible();
  });

  test('non-manager does not see users table after login', async ({ page }) => {
    await page.goto('/');
    await page.click('nav.sidebar-nav >> text=התחבר');
    await page.fill('#email', userEmail);
    await page.fill('#password', userPassword);
    await page.click('button.login-button');

    await expect(page.locator('nav.sidebar-nav >> text=המשמרות שלי')).toBeVisible();

    // The users table must not be rendered anywhere on the page
    await expect(page.locator('.users-table')).not.toBeVisible();
  });

  // ── API access ─────────────────────────────────────────────────────────────
  // These tests call the API without a manager session and assert that the
  // endpoints reject the request. A failure here means REQ-USR-011 is not
  // enforced at the API level.

  test('GET /api/users requires manager authentication', async ({ request }) => {
    const response = await request.get('/api/users');
    // Must return 401 Unauthorized or 403 Forbidden — never 200
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThanOrEqual(403);
  });

  test('POST /api/users requires manager authentication', async ({ request }) => {
    const response = await request.post('/api/users', {
      data: {
        email: 'probe@test.com',
        password: 'Probe123!',
        full_name: 'Probe User',
        role: 'bartender',
      },
    });
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThanOrEqual(403);
  });

  test('DELETE /api/users/:id requires manager authentication', async ({ request }) => {
    // The auth check must happen before any DB lookup, so any UUID is valid for this probe
    const response = await request.delete(
      '/api/users/00000000-0000-0000-0000-000000000000'
    );
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThanOrEqual(403);
  });

  test('PATCH /api/users/:id (suspend) requires manager authentication', async ({ request }) => {
    const response = await request.patch(
      '/api/users/00000000-0000-0000-0000-000000000000',
      { data: { action: 'suspend' } }
    );
    expect(response.status()).toBeGreaterThanOrEqual(401);
    expect(response.status()).toBeLessThanOrEqual(403);
  });
});
