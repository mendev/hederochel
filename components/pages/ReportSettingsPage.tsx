"use client"

import { useState, useEffect, useCallback } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"

// ─── Types ────────────────────────────────────────────────────────────────────

interface TemplateItem {
  id?: number
  position: number
  description: string
}

interface Template {
  id: number
  name: string
  is_active: boolean
  created_at: string
  task_template_items: TemplateItem[]
}

interface StockItem {
  id: number
  name: string
  unit: string
  position: number
}

interface Section {
  id: number
  name: string
  position: number
}

// ─── Task Templates Tab ───────────────────────────────────────────────────────

function TemplatesTab() {
  const [templates, setTemplates] = useState<Template[]>([])
  const [loading, setLoading] = useState(true)
  const [newTemplateName, setNewTemplateName] = useState("")
  const [creating, setCreating] = useState(false)
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

  const fetchTemplates = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reports/templates")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTemplates(data.templates)
    } catch {
      toast.error("שגיאה בטעינת התבניות")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchTemplates() }, [fetchTemplates])

  const handleCreate = async () => {
    if (!newTemplateName.trim()) return
    setCreating(true)
    try {
      const res = await fetch("/api/reports/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newTemplateName.trim(), items: [] }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTemplates(prev => [...prev, data.template])
      setNewTemplateName("")
      toast.success("התבנית נוצרה")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה ביצירת התבנית")
    } finally {
      setCreating(false)
    }
  }

  const handleActivate = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/templates/${id}/activate`, { method: "PATCH" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTemplates(prev => prev.map(t => ({ ...t, is_active: t.id === id })))
      toast.success("התבנית הוגדרה כפעילה")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהפעלת התבנית")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/templates/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTemplates(prev => prev.filter(t => t.id !== id))
      toast.success("התבנית נמחקה")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה במחיקת התבנית")
    }
  }

  const startEditing = (template: Template) => {
    setEditingTemplate({
      ...template,
      task_template_items: template.task_template_items.map(i => ({ ...i })),
    })
    setExpandedId(template.id)
  }

  const cancelEditing = () => {
    setEditingTemplate(null)
  }

  const handleItemChange = (index: number, description: string) => {
    if (!editingTemplate) return
    const items = editingTemplate.task_template_items.map((item, i) =>
      i === index ? { ...item, description } : item
    )
    setEditingTemplate({ ...editingTemplate, task_template_items: items })
  }

  const handleAddItem = () => {
    if (!editingTemplate) return
    const next = editingTemplate.task_template_items.length + 1
    setEditingTemplate({
      ...editingTemplate,
      task_template_items: [
        ...editingTemplate.task_template_items,
        { position: next, description: "" },
      ],
    })
  }

  const handleRemoveItem = (index: number) => {
    if (!editingTemplate) return
    const items = editingTemplate.task_template_items
      .filter((_, i) => i !== index)
      .map((item, i) => ({ ...item, position: i + 1 }))
    setEditingTemplate({ ...editingTemplate, task_template_items: items })
  }

  const handleMoveItem = (index: number, dir: -1 | 1) => {
    if (!editingTemplate) return
    const items = [...editingTemplate.task_template_items]
    const swapIndex = index + dir
    if (swapIndex < 0 || swapIndex >= items.length) return
    ;[items[index], items[swapIndex]] = [items[swapIndex], items[index]]
    const reposItems = items.map((item, i) => ({ ...item, position: i + 1 }))
    setEditingTemplate({ ...editingTemplate, task_template_items: reposItems })
  }

  const handleSave = async () => {
    if (!editingTemplate) return
    try {
      const res = await fetch(`/api/reports/templates/${editingTemplate.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingTemplate.name,
          items: editingTemplate.task_template_items.map(({ position, description }) => ({
            position,
            description,
          })),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setTemplates(prev => prev.map(t => t.id === data.template.id ? data.template : t))
      setEditingTemplate(null)
      toast.success("התבנית עודכנה")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בשמירת התבנית")
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">טוען תבניות...</div>

  return (
    <div className="space-y-4">
      {/* New template form */}
      <div className="flex gap-2">
        <Input
          placeholder="שם תבנית חדשה"
          value={newTemplateName}
          onChange={e => setNewTemplateName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          className="flex-1"
        />
        <Button onClick={handleCreate} disabled={creating || !newTemplateName.trim()}>
          {creating ? "יוצר..." : "צור תבנית"}
        </Button>
      </div>

      {templates.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">אין תבניות. צור תבנית ראשונה.</p>
      )}

      {templates.map(template => {
        const isEditing = editingTemplate?.id === template.id
        const isExpanded = expandedId === template.id

        return (
          <div key={template.id} className="border rounded-lg p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                {isEditing ? (
                  <Input
                    value={editingTemplate.name}
                    onChange={e => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    className="text-sm font-medium"
                  />
                ) : (
                  <span
                    className="font-medium cursor-pointer hover:underline truncate"
                    onClick={() => setExpandedId(isExpanded ? null : template.id)}
                  >
                    {template.name}
                  </span>
                )}
                {template.is_active && (
                  <Badge className="bg-green-100 text-green-700 shrink-0">פעילה</Badge>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {isEditing ? (
                  <>
                    <Button size="sm" onClick={handleSave}>שמור</Button>
                    <Button size="sm" variant="outline" onClick={cancelEditing}>ביטול</Button>
                  </>
                ) : (
                  <>
                    {!template.is_active && (
                      <Button size="sm" variant="outline" onClick={() => handleActivate(template.id)}>
                        הגדר כתבנית פעילה
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => startEditing(template)}>
                      ערוך
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleDelete(template.id)}
                      disabled={template.is_active}
                    >
                      מחק
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Items list (expanded or editing) */}
            {(isExpanded || isEditing) && (
              <div className="space-y-2 pt-2 border-t">
                {isEditing ? (
                  <>
                    {editingTemplate.task_template_items.map((item, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <span className="text-xs text-gray-400 w-5 text-center">{item.position}</span>
                        <Input
                          value={item.description}
                          onChange={e => handleItemChange(index, e.target.value)}
                          className="flex-1 text-sm"
                          placeholder="תיאור משימה"
                        />
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveItem(index, -1)}
                            disabled={index === 0}
                            className="h-7 w-7 p-0"
                          >
                            ↑
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMoveItem(index, 1)}
                            disabled={index === editingTemplate.task_template_items.length - 1}
                            className="h-7 w-7 p-0"
                          >
                            ↓
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleRemoveItem(index)}
                            className="h-7 w-7 p-0 text-destructive"
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                    ))}
                    <Button size="sm" variant="outline" onClick={handleAddItem} className="w-full mt-1">
                      + הוסף משימה
                    </Button>
                  </>
                ) : (
                  <>
                    {template.task_template_items.length === 0 ? (
                      <p className="text-xs text-gray-400">אין פריטים בתבנית זו</p>
                    ) : (
                      template.task_template_items.map(item => (
                        <div key={item.id} className="flex items-center gap-2 text-sm">
                          <span className="text-gray-400 w-5 text-center">{item.position}.</span>
                          <span>{item.description}</span>
                        </div>
                      ))
                    )}
                  </>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// ─── Stock Items Tab ──────────────────────────────────────────────────────────

function StockItemsTab() {
  const [items, setItems] = useState<StockItem[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [newUnit, setNewUnit] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")
  const [editUnit, setEditUnit] = useState("")

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reports/stock-items")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(data.items)
    } catch {
      toast.error("שגיאה בטעינת פריטי המלאי")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchItems() }, [fetchItems])

  const handleAdd = async () => {
    if (!newName.trim() || !newUnit.trim()) return
    setAdding(true)
    try {
      const nextPos = items.length > 0 ? Math.max(...items.map(i => i.position)) + 1 : 1
      const res = await fetch("/api/reports/stock-items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), unit: newUnit.trim(), position: nextPos }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => [...prev, data.item])
      setNewName("")
      setNewUnit("")
      toast.success("הפריט נוסף")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהוספת הפריט")
    } finally {
      setAdding(false)
    }
  }

  const startEdit = (item: StockItem) => {
    setEditingId(item.id)
    setEditName(item.name)
    setEditUnit(item.unit)
  }

  const handleSave = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/stock-items/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim(), unit: editUnit.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => prev.map(i => i.id === id ? data.item : i))
      setEditingId(null)
      toast.success("הפריט עודכן")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בעדכון הפריט")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/stock-items/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setItems(prev => prev.filter(i => i.id !== id))
      toast.success("הפריט נמחק")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה במחיקת הפריט")
    }
  }

  const handleMove = async (id: number, dir: -1 | 1) => {
    const sorted = [...items].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex(i => i.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]
    const tempPosA = a.position
    const tempPosB = b.position

    // Swap positions in DB
    try {
      await Promise.all([
        fetch(`/api/reports/stock-items/${a.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: tempPosB }),
        }),
        fetch(`/api/reports/stock-items/${b.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: tempPosA }),
        }),
      ])
      setItems(prev => prev.map(i => {
        if (i.id === a.id) return { ...i, position: tempPosB }
        if (i.id === b.id) return { ...i, position: tempPosA }
        return i
      }))
    } catch {
      toast.error("שגיאה בשינוי הסדר")
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">טוען פריטי מלאי...</div>

  const sorted = [...items].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-4">
      {/* Add row */}
      <div className="flex gap-2">
        <Input
          placeholder="שם פריט"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          className="flex-1"
        />
        <Input
          placeholder="יחידת מידה"
          value={newUnit}
          onChange={e => setNewUnit(e.target.value)}
          className="w-32"
        />
        <Button onClick={handleAdd} disabled={adding || !newName.trim() || !newUnit.trim()}>
          {adding ? "מוסיף..." : "הוסף"}
        </Button>
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">אין פריטי מלאי. הוסף פריט ראשון.</p>
      )}

      {sorted.map((item, idx) => (
        <div key={item.id} className="flex items-center gap-2 border rounded p-2">
          <div className="flex flex-col gap-0.5">
            <Button
              size="sm" variant="ghost" className="h-5 w-5 p-0"
              onClick={() => handleMove(item.id, -1)} disabled={idx === 0}
            >↑</Button>
            <Button
              size="sm" variant="ghost" className="h-5 w-5 p-0"
              onClick={() => handleMove(item.id, 1)} disabled={idx === sorted.length - 1}
            >↓</Button>
          </div>

          {editingId === item.id ? (
            <>
              <Input value={editName} onChange={e => setEditName(e.target.value)} className="flex-1 text-sm" />
              <Input value={editUnit} onChange={e => setEditUnit(e.target.value)} className="w-28 text-sm" />
              <Button size="sm" onClick={() => handleSave(item.id)}>שמור</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>ביטול</Button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm">{item.name}</span>
              <span className="text-xs text-gray-500 w-20">{item.unit}</span>
              <Button size="sm" variant="outline" onClick={() => startEdit(item)}>ערוך</Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(item.id)}>מחק</Button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Sections Tab ─────────────────────────────────────────────────────────────

function SectionsTab() {
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState("")
  const [adding, setAdding] = useState(false)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editName, setEditName] = useState("")

  const fetchSections = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/reports/sections")
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSections(data.sections)
    } catch {
      toast.error("שגיאה בטעינת הסעיפים")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchSections() }, [fetchSections])

  const handleAdd = async () => {
    if (!newName.trim()) return
    setAdding(true)
    try {
      const nextPos = sections.length > 0 ? Math.max(...sections.map(s => s.position)) + 1 : 1
      const res = await fetch("/api/reports/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), position: nextPos }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSections(prev => [...prev, data.section])
      setNewName("")
      toast.success("הסעיף נוסף")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהוספת הסעיף")
    } finally {
      setAdding(false)
    }
  }

  const handleSave = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/sections/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSections(prev => prev.map(s => s.id === id ? data.section : s))
      setEditingId(null)
      toast.success("הסעיף עודכן")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בעדכון הסעיף")
    }
  }

  const handleDelete = async (id: number) => {
    try {
      const res = await fetch(`/api/reports/sections/${id}`, { method: "DELETE" })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSections(prev => prev.filter(s => s.id !== id))
      toast.success("הסעיף נמחק")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה במחיקת הסעיף")
    }
  }

  const handleMove = async (id: number, dir: -1 | 1) => {
    const sorted = [...sections].sort((a, b) => a.position - b.position)
    const idx = sorted.findIndex(s => s.id === id)
    const swapIdx = idx + dir
    if (swapIdx < 0 || swapIdx >= sorted.length) return

    const a = sorted[idx]
    const b = sorted[swapIdx]
    const tempPosA = a.position
    const tempPosB = b.position

    try {
      await Promise.all([
        fetch(`/api/reports/sections/${a.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: tempPosB }),
        }),
        fetch(`/api/reports/sections/${b.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ position: tempPosA }),
        }),
      ])
      setSections(prev => prev.map(s => {
        if (s.id === a.id) return { ...s, position: tempPosB }
        if (s.id === b.id) return { ...s, position: tempPosA }
        return s
      }))
    } catch {
      toast.error("שגיאה בשינוי הסדר")
    }
  }

  if (loading) return <div className="p-4 text-sm text-gray-500">טוען סעיפים...</div>

  const sorted = [...sections].sort((a, b) => a.position - b.position)

  return (
    <div className="space-y-4">
      {/* Add row */}
      <div className="flex gap-2">
        <Input
          placeholder="שם סעיף חדש"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleAdd()}
          className="flex-1"
        />
        <Button onClick={handleAdd} disabled={adding || !newName.trim()}>
          {adding ? "מוסיף..." : "הוסף"}
        </Button>
      </div>

      {sorted.length === 0 && (
        <p className="text-sm text-gray-500 text-center py-8">אין סעיפים. הוסף סעיף ראשון.</p>
      )}

      {sorted.map((section, idx) => (
        <div key={section.id} className="flex items-center gap-2 border rounded p-2">
          <div className="flex flex-col gap-0.5">
            <Button
              size="sm" variant="ghost" className="h-5 w-5 p-0"
              onClick={() => handleMove(section.id, -1)} disabled={idx === 0}
            >↑</Button>
            <Button
              size="sm" variant="ghost" className="h-5 w-5 p-0"
              onClick={() => handleMove(section.id, 1)} disabled={idx === sorted.length - 1}
            >↓</Button>
          </div>

          {editingId === section.id ? (
            <>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
                className="flex-1 text-sm"
                onKeyDown={e => e.key === "Enter" && handleSave(section.id)}
              />
              <Button size="sm" onClick={() => handleSave(section.id)}>שמור</Button>
              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>ביטול</Button>
            </>
          ) : (
            <>
              <span className="flex-1 text-sm">{section.name}</span>
              <Button size="sm" variant="outline" onClick={() => { setEditingId(section.id); setEditName(section.name) }}>
                ערוך
              </Button>
              <Button size="sm" variant="destructive" onClick={() => handleDelete(section.id)}>מחק</Button>
            </>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ReportSettingsPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold">הגדרות דוחות</h1>
        <p className="text-sm text-gray-500 mt-1">ניהול תבניות משימות, פריטי מלאי וסעיפי דוחות</p>
      </div>

      <Tabs defaultValue="templates" dir="rtl">
        <TabsList className="w-full">
          <TabsTrigger value="templates" className="flex-1">תבניות משימות</TabsTrigger>
          <TabsTrigger value="stock" className="flex-1">פריטי מלאי</TabsTrigger>
          <TabsTrigger value="sections" className="flex-1">סעיפי דוח</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="mt-4">
          <TemplatesTab />
        </TabsContent>

        <TabsContent value="stock" className="mt-4">
          <StockItemsTab />
        </TabsContent>

        <TabsContent value="sections" className="mt-4">
          <SectionsTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
