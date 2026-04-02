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

// PUT /api/reports/stock-items/[id] — update a stock item's name, unit, or position
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const { id } = await params
    const itemId = Number(id)
    if (isNaN(itemId)) {
      return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 })
    }

    const body = await request.json()
    const updates: Record<string, unknown> = {}

    if (body.name !== undefined) {
      if (typeof body.name !== "string" || !body.name.trim()) {
        return NextResponse.json({ error: "שם הפריט הוא שדה חובה" }, { status: 400 })
      }
      updates.name = body.name.trim()
    }
    if (body.unit !== undefined) {
      if (typeof body.unit !== "string" || !body.unit.trim()) {
        return NextResponse.json({ error: "יחידת המידה היא שדה חובה" }, { status: 400 })
      }
      updates.unit = body.unit.trim()
    }
    if (body.position !== undefined) {
      updates.position = body.position
    }

    const admin = createAdminClient()
    const { data: item, error } = await admin
      .from("stock_items")
      .update(updates)
      .eq("id", itemId)
      .select("id, name, unit, position, created_at")
      .single()

    if (error) throw error
    return NextResponse.json({ item })
  } catch (err) {
    console.error("PUT /api/reports/stock-items/[id] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/reports/stock-items/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const { id } = await params
    const itemId = Number(id)
    if (isNaN(itemId)) {
      return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 })
    }

    const admin = createAdminClient()
    const { error } = await admin.from("stock_items").delete().eq("id", itemId)
    if (error) throw error
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/reports/stock-items/[id] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
