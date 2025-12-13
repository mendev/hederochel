import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

// GET /api/users - List all users (admin operation)
// This requires the service_role key because listing users
// is a privileged operation in Supabase

export async function GET() {
  try {
    // Check if environment variables are set
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        {
          error: "Missing environment variables",
          hint: "Make sure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set in .env.local",
        },
        { status: 500 },
      )
    }

    // Use admin client for privileged operations
    const supabase = createAdminClient()

    // List all users - requires service_role key
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers()

    if (error) {
      console.error("Error listing users:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    
    const userIds = users.map((user) => user.id)
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name, role")
      .in("id", userIds)

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError)
      // Continue without profile data rather than failing completely
    }

    const profilesMap = new Map(profiles?.map((profile) => [profile.id, profile]) || [])
    

    // IMPORTANT: Only return safe fields!
    // Never expose sensitive data like password hashes
    const safeUsers = users.map((user) => {
      const profile = profilesMap.get(user.id)
      return {
        id: user.id,
        email: user.email,
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        email_confirmed_at: user.email_confirmed_at,
        // Profile data from public.profiles table
        full_name: profile?.full_name || null,
        role: profile?.role || null,
        user_metadata: {
          name: user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || null,
        },
      }
    })

    return NextResponse.json({
      users: safeUsers,
      count: safeUsers.length,
    })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
