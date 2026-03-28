import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"
import { computeEffectiveState, type DBShift } from "@/app/api/shifts/route"

// Builds the enriched shift response object that includes bartenders (string[])
// and bartender_details, reconstructed from shift_assignments.
async function buildEnrichedShift(
  admin: ReturnType<typeof createAdminClient>,
  shiftId: string,
) {
  const [{ data: shift }, { data: assignments }] = await Promise.all([
    admin.from("shifts").select("*").eq("id", shiftId).single(),
    admin.from("shift_assignments").select("user_id").eq("shift_id", shiftId),
  ])

  const bartenderIds = (assignments || []).map((a: { user_id: string }) => a.user_id)

  let profileMap: Record<string, { full_name: string; role: string }> = {}
  if (bartenderIds.length > 0) {
    const { data: profiles } = await admin
      .from("profiles")
      .select("id, full_name, role")
      .in("id", bartenderIds)
    profileMap = (profiles || []).reduce(
      (acc, p) => {
        acc[p.id] = { full_name: p.full_name, role: p.role }
        return acc
      },
      {} as Record<string, { full_name: string; role: string }>,
    )
  }

  return {
    ...shift,
    shift_state: shift?.state,
    bartenders: bartenderIds,
    bartender_details: bartenderIds.map((id: string) => ({ id, ...profileMap[id] })),
  }
}

// PATCH /api/shifts/[id] - Update a shift (e.g., signup/signoff)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClientWithCookies()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { action } = body

    if (action === "signup") {
      // TSK-SHF-015: block suspended users server-side
      const adminClient = createAdminClient()
      const { data: { user: adminUser } } = await adminClient.auth.admin.getUserById(user.id)
      // banned_until exists at runtime but is absent from the SDK's User type definition
      const bannedUntil = (adminUser as unknown as { banned_until?: string | null })?.banned_until
      const isSuspended = bannedUntil ? new Date(bannedUntil) > new Date() : false
      if (isSuspended) {
        return NextResponse.json(
          { error: "המשתמש מושעה ואינו יכול להירשם למשמרות" },
          { status: 403 },
        )
      }

      // Fetch the current shift
      const { data: shift, error: fetchError } = await adminClient
        .from("shifts")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError || !shift) {
        return NextResponse.json({ error: "Shift not found" }, { status: 404 })
      }

      // TSK-SHF-014: block signup based on effective state (handles running, full, closed)
      const effectiveState = computeEffectiveState(shift as DBShift)
      if (effectiveState === "running") {
        return NextResponse.json({ error: "המשמרת כבר התחילה" }, { status: 400 })
      }
      if (effectiveState === "מלאה") {
        return NextResponse.json({ error: "המשמרת מלאה" }, { status: 400 })
      }
      if (effectiveState === "סגורה") {
        return NextResponse.json({ error: "המשמרת הסתיימה" }, { status: 400 })
      }

      // Check if user is already signed up via shift_assignments
      const { data: existingAssignment } = await adminClient
        .from("shift_assignments")
        .select("id")
        .eq("shift_id", id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (existingAssignment) {
        return NextResponse.json({ error: "כבר רשום למשמרת" }, { status: 400 })
      }

      // Insert assignment
      const { error: insertError } = await adminClient
        .from("shift_assignments")
        .insert({ shift_id: Number(id), user_id: user.id })

      if (insertError) {
        // Handle unique constraint violation (race condition)
        if (insertError.code === "23505") {
          return NextResponse.json({ error: "כבר רשום למשמרת" }, { status: 400 })
        }
        console.error("Error inserting assignment:", insertError)
        return NextResponse.json({ error: insertError.message }, { status: 500 })
      }

      // Count assignments and update state to full if capacity reached
      const { count } = await adminClient
        .from("shift_assignments")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", id)

      const newState = (count || 0) >= shift.bartenders_required ? "מלאה" : shift.state
      await adminClient.from("shifts").update({ state: newState }).eq("id", id)

      return NextResponse.json({ shift: await buildEnrichedShift(adminClient, id) })
    }

    if (action === "signoff") {
      // Use adminClient to avoid sb_publishable_* JWT issues with PostgREST
      const signoffAdmin = createAdminClient()

      // Fetch the current shift
      const { data: shift, error: fetchError } = await signoffAdmin
        .from("shifts")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError || !shift) {
        return NextResponse.json({ error: "Shift not found" }, { status: 404 })
      }

      // Check if user is signed up
      const { data: assignment } = await signoffAdmin
        .from("shift_assignments")
        .select("id")
        .eq("shift_id", id)
        .eq("user_id", user.id)
        .maybeSingle()

      if (!assignment) {
        return NextResponse.json({ error: "לא רשום למשמרת" }, { status: 400 })
      }

      // Delete assignment
      const { error: deleteError } = await signoffAdmin
        .from("shift_assignments")
        .delete()
        .eq("shift_id", id)
        .eq("user_id", user.id)

      if (deleteError) {
        console.error("Error deleting assignment:", deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      // Revert state: closed stays closed, anything else reverts to open
      const newState = shift.state === "סגורה" ? "סגורה" : "פתוחה"
      await signoffAdmin.from("shifts").update({ state: newState }).eq("id", id)

      return NextResponse.json({ shift: await buildEnrichedShift(signoffAdmin, id) })
    }

    return NextResponse.json({ error: "Invalid action" }, { status: 400 })
  } catch (error) {
    console.error("Error in shift PATCH:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// PUT /api/shifts/[id] - Update a shift (full update)
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClientWithCookies()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, shift_date, shift_start_time, shift_type, state, bartenders_required, notes } = body

    // Validate required fields
    if (!title || !shift_date || !shift_start_time || !shift_type || !state || !bartenders_required) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    // Fetch current shift to check effective state before updating
    const putAdmin = createAdminClient()
    const { data: currentShift, error: fetchError } = await putAdmin
      .from("shifts")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !currentShift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    const effectiveState = computeEffectiveState(currentShift as DBShift)
    if (effectiveState === "running") {
      return NextResponse.json({ error: "לא ניתן לעדכן משמרת פועלת" }, { status: 400 })
    }
    if (currentShift.state === "סגורה") {
      return NextResponse.json({ error: "לא ניתן לעדכן משמרת סגורה" }, { status: 400 })
    }

    // Update shift
    const { data: updatedShift, error: updateError } = await putAdmin
      .from("shifts")
      .update({
        title,
        shift_date,
        shift_start_time,
        shift_type,
        state,
        bartenders_required,
        notes,
      })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating shift:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    return NextResponse.json({ shift: updatedShift })
  } catch (error) {
    console.error("Error in shift PUT:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/shifts/[id] - Delete a shift
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerClientWithCookies()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params

    // Delete shift (shift_assignments rows are removed by ON DELETE CASCADE)
    const { error: deleteError } = await supabase
      .from("shifts")
      .delete()
      .eq("id", id)

    if (deleteError) {
      console.error("Error deleting shift:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error in shift DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
