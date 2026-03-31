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

// GET /api/reports/templates — list all templates with their items
export async function GET() {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const admin = createAdminClient()
    const { data: templates, error } = await admin
      .from("task_templates")
      .select("id, name, is_active, created_at, task_template_items(id, position, description, created_at)")
      .order("created_at", { ascending: true })
      .order("position", { referencedTable: "task_template_items", ascending: true })

    if (error) throw error
    return NextResponse.json({ templates })
  } catch (err) {
    console.error("GET /api/reports/templates error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST /api/reports/templates — create a new template
// Body: { name: string, items?: { description: string, position: number }[] }
export async function POST(request: Request) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const body = await request.json()
    const { name, items = [] } = body

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "שם התבנית הוא שדה חובה" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: template, error: templateError } = await admin
      .from("task_templates")
      .insert({ name: name.trim() })
      .select("id, name, is_active, created_at")
      .single()

    if (templateError) throw templateError

    if (items.length > 0) {
      const itemRows = items.map((item: { description: string; position: number }) => ({
        template_id: template.id,
        description: item.description,
        position: item.position,
      }))
      const { error: itemsError } = await admin.from("task_template_items").insert(itemRows)
      if (itemsError) throw itemsError
    }

    // Fetch with items attached
    const { data: full, error: fetchError } = await admin
      .from("task_templates")
      .select("id, name, is_active, created_at, task_template_items(id, position, description, created_at)")
      .eq("id", template.id)
      .order("position", { referencedTable: "task_template_items", ascending: true })
      .single()

    if (fetchError) throw fetchError
    return NextResponse.json({ template: full }, { status: 201 })
  } catch (err) {
    console.error("POST /api/reports/templates error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
