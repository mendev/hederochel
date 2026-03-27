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
    const bartenders: string[] = shift.bartenders || []
    if (!bartenders.includes(userId)) {
      return NextResponse.json({ error: "הברמן אינו רשום למשמרת" }, { status: 404 })
    }

    // Remove bartender; revert to open if shift was full and count drops below capacity
    const updatedBartenders = bartenders.filter((b) => b !== userId)
    const newState =
      shift.state === "מלאה" && updatedBartenders.length < shift.bartenders_required
        ? "פתוחה"
        : shift.state

    const { data: updatedShift, error: updateError } = await admin
      .from("shifts")
      .update({ bartenders: updatedBartenders, state: newState })
      .eq("id", id)
      .select()
      .single()

    if (updateError) {
      console.error("Error updating shift:", updateError)
      return NextResponse.json({ error: updateError.message }, { status: 500 })
    }

    // Fetch updated bartender profiles
    let bartenderProfiles: Record<string, { full_name: string; role: string }> = {}
    if (updatedBartenders.length > 0) {
      const { data: profiles } = await admin
        .from("profiles")
        .select("id, full_name, role")
        .in("id", updatedBartenders)

      bartenderProfiles = (profiles ?? []).reduce(
        (acc, p) => {
          acc[p.id] = { full_name: p.full_name, role: p.role }
          return acc
        },
        {} as Record<string, { full_name: string; role: string }>,
      )
    }

    const enrichedShift = {
      ...updatedShift,
      shift_state: updatedShift.state,
      bartender_details: updatedBartenders.map((bId: string) => ({
        id: bId,
        ...bartenderProfiles[bId],
      })),
    }

    return NextResponse.json({ shift: enrichedShift })
  } catch (error) {
    console.error("Error in bartender DELETE:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
