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
  shitf_date: string
  shift_start_time: string
  title: string
  shift_type: ShiftType
  notes: string | null
  bartenders_required: number | 3
  bartenders: string[] // Array of user IDs
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

// GET /api/shifts - Fetch all shifts or filter by date range
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

    let query = supabase.from("shifts").select("*").order("shift_start_time", { ascending: true })

    // Filter by date range if provided
    if (startDate) {
      query = query.gte("shift_date", startDate)
    }
    if (endDate) {
      query = query.lte("shift_date", endDate)
    }
    // Filter to shifts the user is registered for.
    // bartenders is jsonb — UUID must be quoted inside the JSON array string
    // to avoid a 22P02 "invalid input syntax for type json" error from PostgREST.
    if (userId) {
      query = query.filter("bartenders", "cs", `["${userId}"]`)
    }

    const [{ data: shifts, error }, { data: profiles }] = await Promise.all([
      query,
      supabase.from("profiles").select("id, full_name, role"),
    ])

    if (error) {
      console.error("Error fetching shifts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const bartenderProfiles: Record<string, { full_name: string; role: string }> = (profiles ?? []).reduce(
      (acc, p) => {
        acc[p.id] = { full_name: p.full_name, role: p.role }
        return acc
      },
      {} as Record<string, { full_name: string; role: string }>,
    )

    // Enrich shifts with bartender names and apply derived running state.
    // Both `state` and `shift_state` are set to the effective value so that
    // callers checking either field get the correct result.
    const enrichedShifts = shifts?.map((shift) => {
      const effectiveState = computeEffectiveState(shift)
      return {
        ...shift,
        state: effectiveState,
        shift_state: effectiveState,
        bartender_details: (shift.bartenders || []).map((id: string) => ({
          id,
          ...bartenderProfiles[id],
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
        bartenders: [],
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
