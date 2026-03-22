import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"

// GET /api/auth/user - Get current authenticated user
export async function GET() {
  try {
    const supabase = await createServerClientWithCookies()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ user: null }, { status: 200 })
    }

    // Check suspension via admin client — banned_until exists at runtime but is absent
    // from the SDK's User type definition, so we cast to access it.
    const adminClient = createAdminClient()
    const { data: { user: adminUser } } = await adminClient.auth.admin.getUserById(user.id)
    const bannedUntil = (adminUser as unknown as { banned_until?: string | null })?.banned_until
    const suspended = bannedUntil ? new Date(bannedUntil) > new Date() : false

    return NextResponse.json({ user: { ...user, suspended } })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
