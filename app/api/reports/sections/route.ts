import { NextResponse } from "next/server"
import { createAdminClient, createServerClientWithCookies } from "@/lib/supabase/server"

async function requireManager() {
  const supabase = await createServerClientWithCookies()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user?.id) {
    return { forbidden: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  const admin = createAdminClient()
  const { data: profile } = await admin.from("profiles").select("role").eq("id", session.user.id).single()
  if (profile?.role !== "manager") {
    return { forbidden: NextResponse.json({ error: "Forbidden" }, { status: 403 }) }
  }
  return { forbidden: null }
}

// GET /api/reports/sections — list all report sections ordered by position
export async function GET() {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const admin = createAdminClient()
    const { data: sections, error } = await admin
      .from("report_sections")
      .select("id, name, position, created_at")
      .order("position", { ascending: true })

    if (error) throw error
    return NextResponse.json({ sections })
  } catch (err) {
    console.error("GET /api/reports/sections error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/reports/sections — create a new report section
// Body: { name: string, position: number }
export async function POST(request: Request) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const { name, position } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "שם הסעיף הוא שדה חובה" }, { status: 400 })
    }
    if (!position || typeof position !== "number" || position < 1) {
      return NextResponse.json({ error: "מיקום לא תקין" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: section, error } = await admin
      .from("report_sections")
      .insert({ name: name.trim(), position })
      .select("id, name, position, created_at")
      .single()

    if (error) throw error
    return NextResponse.json({ section }, { status: 201 })
  } catch (err) {
    console.error("POST /api/reports/sections error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
