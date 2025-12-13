import { createBrowserClient } from "@supabase/ssr"

// Browser client - uses the anon (public) key
// Safe to use in client components
// Respects Row Level Security (RLS)

let client: ReturnType<typeof createBrowserClient> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)

  return client
}
