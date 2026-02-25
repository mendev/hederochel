import { createClient } from '@supabase/supabase-js';

// Use the Supabase admin client directly so cleanup doesn't depend on the
// API routes (which require a manager session).
const supabaseUrl = process.env.SUPABASE_URL ?? 'http://127.0.0.1:54321';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function cleanupTestUser(email: string): Promise<void> {
  if (!supabaseKey) return;
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) return;
    const user = users.find((u) => u.email === email);
    if (!user) return;
    await supabase.auth.admin.deleteUser(user.id);
  } catch {
    // Cleanup is best-effort — don't fail the test suite
  }
}
