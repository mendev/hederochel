import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"

// Shift type from your database
export type ShiftType =
  | "משמרת רגילה"
  | "ערב צעירים"
  | "ארוע מיוחד"

export type ShiftState = "פתוחה" | "מלאה" | "סגורה"
export type EffectiveShiftState = ShiftState | "running"

export interface DBShift {
  id: number
  shift_date: string
  shift_start_time: string
  title: string
  shift_type: ShiftType
  notes: string | null
  bartenders_required: number
  state: ShiftState
  start_at: string | null
  report_id: string | null
  created_at: string
}

// Returns 'running' when the shift has started (start_at <= now) and is still
// open or full in the database. Otherwise returns the stored state unchanged.
export function computeEffectiveState(shift: DBShift): EffectiveShiftState {
  if (
    shift.start_at !== null &&
    new Date(shift.start_at) <= new Date() &&
    (shift.state === "פתוחה" || shift.state === "מלאה")
  ) {
    return "running"
  }
  return shift.state
}

// GET /api/shifts - Fetch all shifts or filter by date range / userId
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")
    const userId = searchParams.get("userId")

    // Use admin client for reads: shifts table has no RLS and GRANT ALL to all roles,
    // so the session-based client is not needed. The admin client avoids JWT validation
    // issues with the new sb_publishable_ key format in local Supabase dev.
    const supabase = createAdminClient()

    // If filtering by userId, first resolve the shift IDs the user is assigned to.
    // shift_assignments is the authoritative source; the old bartenders jsonb is dropped.
    let filteredShiftIds: number[] | null = null
    if (userId) {
      const { data: assignments } = await supabase
        .from("shift_assignments")
        .select("shift_id")
        .eq("user_id", userId)
      filteredShiftIds = (assignments || []).map((a: { shift_id: number }) => a.shift_id)
      if (filteredShiftIds.length === 0) {
        return NextResponse.json({ shifts: [] })
      }
    }

    let query = supabase
      .from("shifts")
      .select("*")
      .order("shift_start_time", { ascending: true })

    if (startDate) query = query.gte("shift_date", startDate)
    if (endDate)   query = query.lte("shift_date", endDate)
    if (filteredShiftIds !== null) query = query.in("id", filteredShiftIds)

    // Run shifts query and profiles fetch in parallel
    const [{ data: shifts, error }, { data: profiles }] = await Promise.all([
      query,
      supabase.from("profiles").select("id, full_name, role"),
    ])

    if (error) {
      console.error("Error fetching shifts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch all assignments for the returned shifts
    const shiftIds = (shifts || []).map((s) => s.id)
    const { data: allAssignments } = shiftIds.length > 0
      ? await supabase
          .from("shift_assignments")
          .select("shift_id, user_id")
          .in("shift_id", shiftIds)
      : { data: [] }

    // Build lookup maps
    const profileMap: Record<string, { full_name: string; role: string }> = (profiles ?? []).reduce(
      (acc, p) => {
        acc[p.id] = { full_name: p.full_name, role: p.role }
        return acc
      },
      {} as Record<string, { full_name: string; role: string }>,
    )

    const assignmentMap = new Map<number, string[]>()
    for (const a of allAssignments || []) {
      const list = assignmentMap.get(a.shift_id) || []
      list.push(a.user_id)
      assignmentMap.set(a.shift_id, list)
    }

    // Enrich shifts: derive running state and attach bartender info.
    // Both `state` and `shift_state` are set so callers checking either field are correct.
    // `bartenders` (string[]) is reconstructed from shift_assignments for component compat.
    const enrichedShifts = (shifts || []).map((shift) => {
      const effectiveState = computeEffectiveState(shift)
      const bartenders = assignmentMap.get(shift.id) || []
      return {
        ...shift,
        state: effectiveState,
        shift_state: effectiveState,
        bartenders,
        bartender_details: bartenders.map((id: string) => ({
          id,
          ...profileMap[id],
        })),
      }
    })

    return NextResponse.json({ shifts: enrichedShifts })
  } catch (error) {
    console.error("Error in shifts API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/shifts - Create a new shift
export async function POST(request: Request) {
  try {
    const supabase = await createServerClientWithCookies()

    // Check if user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { title, shift_date, shift_start_time, shift_type, state, bartenders_required, notes } = body

    // Validate required fields
    if (!title || !shift_date || !shift_start_time || !shift_type) {
      return NextResponse.json(
        { error: "Missing required fields: title, shift_date, shift_start_time, shift_type" },
        { status: 400 },
      )
    }

    const { data: shift, error } = await supabase
      .from("shifts")
      .insert({
        title,
        shift_date,
        shift_start_time,
        shift_type,
        state: state || "פתוחה",
        bartenders_required: bartenders_required || 3,
        notes,
      })
      .select()
      .single()

    if (error) {
      console.error("Error creating shift:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ shift }, { status: 201 })
  } catch (error) {
    console.error("Error in shifts API:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
