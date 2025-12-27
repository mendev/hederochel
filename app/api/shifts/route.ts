import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"

// Shift type from your database
export type ShiftType =
  | "משמרת רגילה"
  | "ערב צעירים"
  | "ארוע מיוחד"

export type ShiftState = "פתוחה" | "מלאה" | "סגורה"

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
  report_id: string | null
  created_at: string
}

// GET /api/shifts - Fetch all shifts or filter by date range
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    const supabase = await createServerClientWithCookies()

    let query = supabase.from("shifts").select("*").order("shift_start_time", { ascending: true })

    // Filter by date range if provided
    if (startDate) {
      query = query.gte("shift_date", startDate)
    }
    if (endDate) {
      query = query.lte("shift_date", endDate)
    }

    const { data: shifts, error } = await query

    if (error) {
      console.error("Error fetching shifts:", error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch bartender profiles to include names
    const allBartenderIds = [...new Set(shifts?.flatMap((s) => s.bartenders || []) || [])]

    let bartenderProfiles: Record<string, { full_name: string; role: string }> = {}

    if (allBartenderIds.length > 0) {
      const adminClient = createAdminClient()
      const { data: profiles } = await adminClient
        .from("profiles")
        .select("id, full_name, role")
        .in("id", allBartenderIds)

      if (profiles) {
        bartenderProfiles = profiles.reduce(
          (acc, p) => {
            acc[p.id] = { full_name: p.full_name, role: p.role }
            return acc
          },
          {} as Record<string, { full_name: string; role: string }>,
        )
      }
    }

    // Enrich shifts with bartender names and map field names
    const enrichedShifts = shifts?.map((shift) => ({
      ...shift,
      shift_state: shift.state,  // Map database 'state' to component 'shift_state'
      bartender_details: (shift.bartenders || []).map((id: string) => ({
        id,
        ...bartenderProfiles[id],
      })),
    }))

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
    const { title, shift_start_time, end_time, shift_type, notes, bartenders } = body

    // Validate required fields
    if (!title || !shift_start_time || !shift_type || !bartenders) {
      return NextResponse.json(
        { error: "Missing required fields: title, shift_start_time, shift_type, bartenders" },
        { status: 400 },
      )
    }

    const { data: shift, error } = await supabase
      .from("shifts")
      .insert({
        title,
        shift_start_time,
        end_time,
        shift_type,
        notes,
        bartenders,
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
