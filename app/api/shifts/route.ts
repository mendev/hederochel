import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"

// Shift type from your database
export type ShiftType = "ערב חמישי" | "ארוע מיוחד" | "ערב צעירים" | "אחר"

export interface DBShift {
  id: number
  title: string
  start_time: string
  end_time: string | null
  shift_type: ShiftType
  notes: string | null
  bartenders: string[] // Array of user IDs
  created_at: string
}

// GET /api/shifts - Fetch all shifts or filter by date range
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("start")
    const endDate = searchParams.get("end")

    const supabase = await createServerClientWithCookies()

    let query = supabase.from("shifts").select("*").order("start_time", { ascending: true })

    // Filter by date range if provided
    if (startDate) {
      query = query.gte("start_time", startDate)
    }
    if (endDate) {
      query = query.lte("start_time", endDate)
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

    // Enrich shifts with bartender names
    const enrichedShifts = shifts?.map((shift) => ({
      ...shift,
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
    const { title, start_time, end_time, shift_type, notes, bartenders } = body

    // Validate required fields
    if (!title || !start_time || !shift_type || !bartenders) {
      return NextResponse.json(
        { error: "Missing required fields: title, start_time, shift_type, bartenders" },
        { status: 400 },
      )
    }

    const { data: shift, error } = await supabase
      .from("shifts")
      .insert({
        title,
        start_time,
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
