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

// PUT /api/reports/templates/[id] — update template name and/or replace its items
// Body: { name?: string, items?: { description: string, position: number }[] }
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const { id } = await params
    const templateId = Number(id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 })
    }

    const body = await request.json()
    const { name, items } = body
    const admin = createAdminClient()

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "שם התבנית הוא שדה חובה" }, { status: 400 })
      }
      const { error } = await admin
        .from("task_templates")
        .update({ name: name.trim() })
        .eq("id", templateId)
      if (error) throw error
    }

    if (items !== undefined) {
      // Replace all items: delete existing, insert new ones
      const { error: deleteError } = await admin
        .from("task_template_items")
        .delete()
        .eq("template_id", templateId)
      if (deleteError) throw deleteError

      if (items.length > 0) {
        const itemRows = items.map((item: { description: string; position: number }) => ({
          template_id: templateId,
          description: item.description,
          position: item.position,
        }))
        const { error: insertError } = await admin.from("task_template_items").insert(itemRows)
        if (insertError) throw insertError
      }
    }

    const { data: full, error: fetchError } = await admin
      .from("task_templates")
      .select("id, name, is_active, created_at, task_template_items(id, position, description, created_at)")
      .eq("id", templateId)
      .order("position", { referencedTable: "task_template_items", ascending: true })
      .single()

    if (fetchError) throw fetchError
    return NextResponse.json({ template: full })
  } catch (err) {
    console.error("PUT /api/reports/templates/[id] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE /api/reports/templates/[id] — blocked if template is active
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { forbidden } = await requireManager()
  if (forbidden) return forbidden

  try {
    const { id } = await params
    const templateId = Number(id)
    if (isNaN(templateId)) {
      return NextResponse.json({ error: "מזהה לא תקין" }, { status: 400 })
    }

    const admin = createAdminClient()

    const { data: template, error: fetchError } = await admin
      .from("task_templates")
      .select("is_active")
      .eq("id", templateId)
      .single()

    if (fetchError || !template) {
      return NextResponse.json({ error: "התבנית לא נמצאה" }, { status: 404 })
    }

    if (template.is_active) {
      return NextResponse.json({ error: "לא ניתן למחוק תבנית פעילה" }, { status: 400 })
    }

    const { error: deleteError } = await admin
      .from("task_templates")
      .delete()
      .eq("id", templateId)

    if (deleteError) throw deleteError
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error("DELETE /api/reports/templates/[id] error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
