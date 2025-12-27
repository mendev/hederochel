import { NextResponse } from "next/server"
import { createServerClientWithCookies } from "@/lib/supabase/server"

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

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error fetching user:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
