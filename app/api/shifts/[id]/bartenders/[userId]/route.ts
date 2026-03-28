import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"
import { computeEffectiveState, type DBShift } from "@/app/api/shifts/route"

async function requireManager() {
  const supabase = await createServerClientWithCookies()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return { forbidden: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from("profiles")
    .select("role")
    .eq("id", session.user.id)
    .single()
  if (profile?.role !== "manager") {
    return { forbidden: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { forbidden: null }
}

// DELETE /api/shifts/[id]/bartenders/[userId] — Manager removes a bartender from a shift
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> }
) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const { id, userId } = await params
    const admin = createAdminClient()

    // Fetch the shift
    const { data: shift, error: fetchError } = await admin
      .from("shifts")
      .select("*")
      .eq("id", id)
      .single()

    if (fetchError || !shift) {
      return NextResponse.json({ error: "Shift not found" }, { status: 404 })
    }

    // Reject if running or closed
    const effectiveState = computeEffectiveState(shift as DBShift)
    if (effectiveState === "running") {
      return NextResponse.json(
        { error: "לא ניתן להסיר ברמן ממשמרת פועלת" },
        { status: 400 },
      )
    }
    if (effectiveState === "סגורה") {
      return NextResponse.json(
        { error: "לא ניתן להסיר ברמן ממשמרת סגורה" },
        { status: 400 },
      )
    }

    // 404 if bartender not assigned
    const { data: assignment } = await admin
      .from("shift_assignments")
      .select("id")
      .eq("shift_id", id)
      .eq("user_id", userId)
      .maybeSingle()

    if (!assignment) {
      return NextResponse.json({ error: "הברמן אינו רשום למשמרת" }, { status: 404 })
    }

    // Delete the assignment
    const { error: deleteError } = await admin
      .from("shift_assignments")
      .delete()
      .eq("shift_id", id)
      .eq("user_id", userId)

    if (deleteError) {
      console.error("Error deleting assignment:", deleteError)
      return NextResponse.json({ error: deleteError.message }, { status: 500 })
    }

    // Revert state to open if shift was full and count drops below capacity
    if (shift.state === "מלאה") {
      const { count } = await admin
        .from("shift_assignments")
        .select("*", { count: "exact", head: true })
        .eq("shift_id", id)

      if ((count || 0) < shift.bartenders_required) {
        await admin.from("shifts").update({ state: "פתוחה" }).eq("id", id)
      }
    }

    // Build enriched response
    const { data: assignments } = await admin
      .from("shift_assignments")
      .select("user_id")
      .eq("shift_id", id)

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

    // Re-fetch updated shift for state
    const { data: updatedShift } = await admin.from("shifts").select("*").eq("id", id).single()

    const enrichedShift = {
      ...updatedShift,
      shift_state: updatedShift?.state,
      bartenders: bartenderIds,
      bartender_details: bartenderIds.map((bId: string) => ({
        id: bId,
        ...profileMap[bId],
      })),
    }

    return NextResponse.json({ shift: enrichedShift })
  } catch (error) {
    console.error("Error in bartender DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
