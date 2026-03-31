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

// PATCH /api/reports/templates/[id]/activate — set this template as the active one
// Deactivates any currently active template first (satisfies partial unique index).
export async function PATCH(
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

    // Verify the target template exists
    const { data: target, error: fetchError } = await admin
      .from("task_templates")
      .select("id, is_active")
      .eq("id", templateId)
      .single()

    if (fetchError || !target) {
      return NextResponse.json({ error: "התבנית לא נמצאה" }, { status: 404 })
    }

    if (target.is_active) {
      // Already active — return it as-is
      const { data: current, error: currentFetchError } = await admin
        .from("task_templates")
        .select("id, name, is_active, created_at, task_template_items(id, position, description, created_at)")
        .eq("id", templateId)
        .order("position", { referencedTable: "task_template_items", ascending: true })
        .single()
      if (currentFetchError) throw currentFetchError
      return NextResponse.json({ template: current })
    }

    // Deactivate any currently active template first to satisfy the partial unique index
    const { error: deactivateError } = await admin
      .from("task_templates")
      .update({ is_active: false })
      .eq("is_active", true)

    if (deactivateError) throw deactivateError

    // Activate the target template
    const { error: activateError } = await admin
      .from("task_templates")
      .update({ is_active: true })
      .eq("id", templateId)

    if (activateError) throw activateError

    const { data: full, error: resultError } = await admin
      .from("task_templates")
      .select("id, name, is_active, created_at, task_template_items(id, position, description, created_at)")
      .eq("id", templateId)
      .order("position", { referencedTable: "task_template_items", ascending: true })
      .single()

    if (resultError) throw resultError
    return NextResponse.json({ template: full })
  } catch (err) {
    console.error("PATCH /api/reports/templates/[id]/activate error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
