/**
 * CI seed script — creates the two test accounts that Playwright tests
 * expect to exist before they run. Mirrors the same steps the signup
 * route takes: createUser in auth, then insert into profiles.
 *
 * Run with: node tests/helpers/seed.mjs
 *
 * Required env vars:
 *   NEXT_PUBLIC_SUPABASE_URL   (defaults to http://127.0.0.1:54321)
 *   SUPABASE_SERVICE_ROLE_KEY
 *   TEST_USER_EMAIL / TEST_USER_PASSWORD
 *   TEST_MANAGER_EMAIL / TEST_MANAGER_PASSWORD
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'http://127.0.0.1:54321';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

if (!serviceRoleKey) {
  console.error('ERROR: SUPABASE_SERVICE_ROLE_KEY is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function createTestUser(email, password, fullName, role) {
  // 1 — create auth user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name: fullName },
  });

  if (authError) {
    console.error(`ERROR creating auth user ${email}:`, authError.message);
    process.exit(1);
  }

  // 2 — insert profile (same as signup route)
  const { error: profileError } = await supabase
    .from('profiles')
    .insert({ id: authData.user.id, full_name: fullName, role });

  if (profileError) {
    console.error(`ERROR creating profile for ${email}:`, profileError.message);
    process.exit(1);
  }

  console.log(`  ✓ ${role.padEnd(10)} ${email}`);
}

const bartenderEmail  = process.env.TEST_USER_EMAIL       ?? '';
const bartenderPass   = process.env.TEST_USER_PASSWORD    ?? '';
const managerEmail    = process.env.TEST_MANAGER_EMAIL    ?? '';
const managerPass     = process.env.TEST_MANAGER_PASSWORD ?? '';

if (!bartenderEmail || !bartenderPass || !managerEmail || !managerPass) {
  console.error('ERROR: one or more TEST_* env vars are not set');
  process.exit(1);
}

console.log('Seeding test users...');
await createTestUser(bartenderEmail, bartenderPass, 'Test Bartender', 'bartender');
await createTestUser(managerEmail,   managerPass,   'Test Manager',   'manager');
console.log('Done.');
