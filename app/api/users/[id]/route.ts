import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/server"

// PUT /api/users/[id] - Update user (admin operation)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()
    const { full_name, role, password } = body

    // Validate required fields
    if (!full_name || !role) {
      return NextResponse.json(
        { error: "Missing required fields: full_name, role" },
        { status: 400 }
      )
    }

    // Update profile in profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name,
        role,
      })
      .eq("id", id)

    if (profileError) {
      console.error("Error updating profile:", profileError)
      return NextResponse.json({ error: profileError.message }, { status: 500 })
    }

    // Update password if provided
    if (password) {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(id, {
        password,
      })

      if (passwordError) {
        console.error("Error updating password:", passwordError)
        return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
      }
    }

    // Update user metadata
    const { error: metadataError } = await supabase.auth.admin.updateUserById(id, {
      user_metadata: {
        name: full_name,
      },
    })

    if (metadataError) {
      console.error("Error updating metadata:", metadataError)
      // Don't fail the request for metadata errors
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PATCH /api/users/[id] - Suspend/unsuspend user (admin operation)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (action === "suspend") {
      // Ban user for 100 years (effectively permanent until unsuspended)
      const banDuration = "876000h" // 100 years in hours
      const { error: banError } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: banDuration,
      })

      if (banError) {
        console.error("Error suspending user:", banError)
        return NextResponse.json({ error: banError.message }, { status: 500 })
      }

      // Remove user from all non-closed shifts
      const { data: shifts, error: shiftsError } = await supabase
        .from("shifts")
        .select("*")
        .neq("state", "סגורה")
        .contains("bartenders", [id])

      if (shiftsError) {
        console.error("Error fetching shifts:", shiftsError)
      } else if (shifts) {
        for (const shift of shifts) {
          const updatedBartenders = shift.bartenders.filter((bartenderId: string) => bartenderId !== id)
          const newState = updatedBartenders.length >= shift.bartenders_required ? "מלאה" : "פתוחה"

          await supabase
            .from("shifts")
            .update({
              bartenders: updatedBartenders,
              state: newState,
            })
            .eq("id", shift.id)
        }
      }

      return NextResponse.json({ success: true })
    }

    if (action === "unsuspend") {
      // Remove ban by setting ban duration to none
      const { error: unbanError } = await supabase.auth.admin.updateUserById(id, {
        ban_duration: "none",
      })

      if (unbanError) {
        console.error("Error unsuspending user:", unbanError)
        return NextResponse.json({ error: unbanError.message }, { status: 500 })
      }

      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/users/[id] - Delete user (admin operation)
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = createAdminClient()
    const { id } = await params

    // Remove user from all non-closed shifts
    const { data: shifts, error: shiftsError } = await supabase
      .from("shifts")
      .select("*")
      .neq("state", "סגורה")
      .contains("bartenders", [id])

    if (shiftsError) {
      console.error("Error fetching shifts:", shiftsError)
    } else if (shifts) {
      for (const shift of shifts) {
        const updatedBartenders = shift.bartenders.filter((bartenderId: string) => bartenderId !== id)
        const newState = updatedBartenders.length >= shift.bartenders_required ? "מלאה" : "פתוחה"

        await supabase
          .from("shifts")
          .update({
            bartenders: updatedBartenders,
            state: newState,
          })
          .eq("id", shift.id)
      }
    }

    // Delete profile from profiles table
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", id)

    if (profileError) {
      console.error("Error deleting profile:", profileError)
      // Continue with auth deletion even if profile deletion fails
    }

    // Delete user from Supabase Auth
    const { error: authError } = await supabase.auth.admin.deleteUser(id)

    if (authError) {
      console.error("Error deleting user:", authError)
      return NextResponse.json({ error: authError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Unexpected error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
