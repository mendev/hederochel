import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"

async function requireManager() {
  // Use getSession() to read the session from the cookie locally — no GoTrue network call.
  // The role check against the admin client immediately below ensures the session user
  // is a real manager; a tampered cookie with a fake ID would find no profile.
  const supabase = await createServerClientWithCookies()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return { forbidden: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", session.user.id).single()
  if (profile?.role !== "manager") {
    return { forbidden: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { forbidden: null }
}

// GET /api/users - List all users (manager only)
export async function GET() {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden
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
        banned_until: user.banned_until || null,
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

// POST /api/users - Create a new user (manager only)
export async function POST(request: Request) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { email, password, full_name, role } = body

    // Validate required fields
    if (!email || !password || !full_name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, full_name, role" },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: full_name,
      },
    })

    if (authError) {
      console.error("Error creating user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Create profile in profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        full_name,
        role,
      })

    if (profileError) {
      console.error("Error creating profile:", profileError)
      // Try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)
      return NextResponse.json({ error: "Failed to create user profile" }, { status: 500 })
    }

    return NextResponse.json({ user: authData.user }, { status: 201 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
