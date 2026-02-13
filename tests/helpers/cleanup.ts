const BASE_URL = 'http://localhost:3000';

export async function cleanupTestUser(email: string): Promise<void> {
  try {
    const res = await fetch(`${BASE_URL}/api/users`);
    if (!res.ok) return;
    const data = await res.json();
    const user = data.users?.find((u: { email: string }) => u.email === email);
    if (!user) return;
    await fetch(`${BASE_URL}/api/users/${user.id}`, { method: 'DELETE' });
  } catch {
    // Cleanup is best-effort — don't fail the test suite
  }
}
