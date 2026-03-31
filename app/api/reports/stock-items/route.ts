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

// GET /api/reports/stock-items — list all stock items ordered by position
export async function GET() {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const admin = createAdminClient()
    const { data: items, error } = await admin
      .from("stock_items")
      .select("id, name, unit, position, created_at")
      .order("position", { ascending: true })

    if (error) throw error
    return NextResponse.json({ items })
  } catch (err) {
    console.error("GET /api/reports/stock-items error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/reports/stock-items — create a new stock item
// Body: { name: string, unit: string, position: number }
export async function POST(request: Request) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const { name, unit, position } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "שם הפריט הוא שדה חובה" }, { status: 400 })
    }
    if (!unit || typeof unit !== "string" || !unit.trim()) {
      return NextResponse.json({ error: "יחידת המידה היא שדה חובה" }, { status: 400 })
    }
    if (!position || typeof position !== "number" || position < 1) {
      return NextResponse.json({ error: "מיקום לא תקין" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { data: item, error } = await admin
      .from("stock_items")
      .insert({ name: name.trim(), unit: unit.trim(), position })
      .select("id, name, unit, position, created_at")
      .single()

    if (error) throw error
    return NextResponse.json({ item }, { status: 201 })
  } catch (err) {
    console.error("POST /api/reports/stock-items error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
