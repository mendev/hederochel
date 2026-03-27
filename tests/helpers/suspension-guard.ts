import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

/**
 * Polls until TEST_USER_EMAIL is confirmed not suspended (max ~5 s).
 *
 * TSK-SHF-015 in shift-signup-guard.spec.ts suspends this account mid-test on
 * a separate worker.  Any spec that logs in as TEST_USER_EMAIL should call
 * this in its beforeEach to avoid a login failure during the suspension window.
 *
 * No-ops when SUPABASE_SERVICE_ROLE_KEY is absent (e.g. CI without the key).
 */
export async function waitForTestUserNotSuspended(): Promise<void> {
  if (!supabaseKey || !process.env.TEST_USER_EMAIL) return;
  const email = process.env.TEST_USER_EMAIL;
  const admin = createClient(supabaseUrl, supabaseKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  for (let i = 0; i < 10; i++) {
    const { data } = await admin.auth.admin.listUsers();
    const user = data?.users?.find(u => u.email === email);
    const bannedUntil = (user as unknown as { banned_until?: string | null })?.banned_until;
    if (!bannedUntil || new Date(bannedUntil) <= new Date()) return;
    await new Promise(r => setTimeout(r, 500));
  }
}
