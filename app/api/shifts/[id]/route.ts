import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"
import { computeEffectiveState, type DBShift } from "@/app/api/shifts/route"

// PATCH /api/shifts/[id] - Update a shift (e.g., signup)
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

      // Check if user is already signed up
      const bartenders = shift.bartenders || []
      if (bartenders.includes(user.id)) {
        return NextResponse.json({ error: "כבר רשום למשמרת" }, { status: 400 })
      }

      // Add user to bartenders
      const updatedBartenders = [...bartenders, user.id]
      const newState = updatedBartenders.length >= shift.bartenders_required ? "מלאה" : shift.state

      // Update shift
      const { data: updatedShift, error: updateError } = await adminClient
        .from("shifts")
        .update({
          bartenders: updatedBartenders,
          state: newState,
        })
        .eq("id", id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating shift:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Fetch bartender details
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, full_name, role")
        .in("id", updatedBartenders)

      const bartenderProfiles = profiles?.reduce(
        (acc, p) => {
          acc[p.id] = { full_name: p.full_name, role: p.role }
          return acc
        },
        {} as Record<string, { full_name: string; role: string }>,
      ) || {}

      const enrichedShift = {
        ...updatedShift,
        shift_state: updatedShift.state,  // Map database 'state' to component 'shift_state'
        bartender_details: updatedBartenders.map((id: string) => ({
          id,
          ...bartenderProfiles[id],
        })),
      }

      return NextResponse.json({ shift: enrichedShift })
    }

    if (action === "signoff") {
      // Fetch the current shift
      const { data: shift, error: fetchError } = await supabase
        .from("shifts")
        .select("*")
        .eq("id", id)
        .single()

      if (fetchError || !shift) {
        return NextResponse.json({ error: "Shift not found" }, { status: 404 })
      }

      // Check if user is signed up
      const bartenders = shift.bartenders || []
      if (!bartenders.includes(user.id)) {
        return NextResponse.json({ error: "לא רשום למשמרת" }, { status: 400 })
      }

      // Remove user from bartenders
      const updatedBartenders = bartenders.filter((id: string) => id !== user.id)
      const newState = shift.state === "סגורה" ? "סגורה" : "פתוחה"

      // Update shift
      const { data: updatedShift, error: updateError } = await supabase
        .from("shifts")
        .update({
          bartenders: updatedBartenders,
          state: newState,
        })
        .eq("id", id)
        .select()
        .single()

      if (updateError) {
        console.error("Error updating shift:", updateError)
        return NextResponse.json({ error: updateError.message }, { status: 500 })
      }

      // Fetch bartender details
      let bartenderProfiles: Record<string, { full_name: string; role: string }> = {}
      if (updatedBartenders.length > 0) {
        const adminClient = createAdminClient()
        const { data: profiles } = await adminClient
          .from("profiles")
          .select("id, full_name, role")
          .in("id", updatedBartenders)

        bartenderProfiles = profiles?.reduce(
          (acc, p) => {
            acc[p.id] = { full_name: p.full_name, role: p.role }
            return acc
          },
          {} as Record<string, { full_name: string; role: string }>,
        ) || {}
      }

      const enrichedShift = {
        ...updatedShift,
        shift_state: updatedShift.state,
        bartender_details: updatedBartenders.map((id: string) => ({
          id,
          ...bartenderProfiles[id],
        })),
      }

      return NextResponse.json({ shift: enrichedShift })
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

    // Update shift
    const { data: updatedShift, error: updateError } = await supabase
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

    // Delete shift
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
