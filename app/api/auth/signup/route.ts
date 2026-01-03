import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

// POST /api/auth/signup - Public signup endpoint for new users
export async function POST(request: Request) {
  try {
    const supabase = createAdminClient()

    const body = await request.json()
    const { email, password, full_name } = body

    // Validate required fields
    if (!email || !password || !full_name) {
      return NextResponse.json(
        { error: "Missing required fields: email, password, full_name" },
        { status: 400 }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Create user in Supabase Auth
    // All new signups are created as bartenders
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for self-signup
      user_metadata: {
        name: full_name,
      },
    })

    if (authError) {
      console.error("Error creating user:", authError)

      // Check for duplicate email error
      if (authError.message.includes("already registered") ||
          authError.message.includes("already exists") ||
          authError.code === "user_already_exists") {
        return NextResponse.json(
          { error: "שם משתמש זה כבר תפוס. אנא בחר שם משתמש אחר." },
          { status: 409 }
        )
      }

      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    // Create profile in profiles table with bartender role
    const { error: profileError } = await supabase
      .from("profiles")
      .insert({
        id: authData.user.id,
        full_name,
        role: "bartender", // All new users are bartenders
      })

    if (profileError) {
      console.error("Error creating profile:", profileError)

      // Try to delete the auth user if profile creation fails
      await supabase.auth.admin.deleteUser(authData.user.id)

      return NextResponse.json(
        { error: "Failed to create user profile" },
        { status: 500 }
      )
    }

    return NextResponse.json(
      {
        message: "User created successfully",
        user: {
          id: authData.user.id,
          email: authData.user.email,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
