"use client"

import * as React from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Shift, ShiftType, ShiftState } from "@/components/shifts-calendar"

interface ShiftFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  shift?: Shift | null
  onSuccess?: () => void
}

export function ShiftFormDialog({
  open,
  onOpenChange,
  shift,
  onSuccess,
}: ShiftFormDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [deleting, setDeleting] = React.useState(false)
  const [bartenderDetails, setBartenderDetails] = React.useState<
    Array<{ id: string; full_name: string; role: string }>
  >([])
  const [removingBartender, setRemovingBartender] = React.useState<string | null>(null)

  const [formData, setFormData] = React.useState({
    title: "",
    shift_date: "",
    shift_start_time: "",
    shift_type: "משמרת רגילה" as ShiftType,
    state: "פתוחה" as ShiftState,
    bartenders_required: 3,
    notes: "",
  })

  // Populate form when editing
  React.useEffect(() => {
    if (shift) {
      setFormData({
        title: shift.title,
        shift_date: shift.shift_date,
        shift_start_time: shift.shift_start_time || "",
        shift_type: shift.shift_type,
        state: shift.state || shift.shift_state,
        bartenders_required: shift.bartenders_required,
        notes: shift.notes || "",
      })
      setBartenderDetails(shift.bartender_details || [])
    } else {
      // Reset form for new shift
      setFormData({
        title: "",
        shift_date: "",
        shift_start_time: "",
        shift_type: "משמרת רגילה",
        state: "פתוחה",
        bartenders_required: 3,
        notes: "",
      })
      setBartenderDetails([])
    }
    setError(null)
  }, [shift, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = shift ? `/api/shifts/${shift.id}` : "/api/shifts"
      const method = shift ? "PUT" : "POST"

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save shift")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save shift")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveBartender = async (bartenderId: string) => {
    if (!shift) return
    try {
      setRemovingBartender(bartenderId)
      const res = await fetch(`/api/shifts/${shift.id}/bartenders/${bartenderId}`, {
        method: "DELETE",
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to remove bartender")
      setBartenderDetails((prev) => prev.filter((b) => b.id !== bartenderId))
      toast.success("הברמן הוסר מהמשמרת")
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "שגיאה בהסרת הברמן")
    } finally {
      setRemovingBartender(null)
    }
  }

  const handleDelete = async () => {
    if (!shift) return

    if (!confirm("האם אתה בטוח שברצונך למחוק את המשמרת?")) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/shifts/${shift.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete shift")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete shift")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>{shift ? "ערוך משמרת" : "הוסף משמרת חדשה"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}

            <div>
              <Label htmlFor="title">שם המשמרת</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                required
                placeholder="לדוגמה: משמרת ערב"
              />
            </div>

            <div>
              <Label htmlFor="shift_date">תאריך</Label>
              <Input
                id="shift_date"
                type="date"
                value={formData.shift_date}
                onChange={(e) =>
                  setFormData({ ...formData, shift_date: e.target.value })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="shift_start_time">שעת התחלה</Label>
              <Input
                id="shift_start_time"
                type="time"
                value={formData.shift_start_time ? formData.shift_start_time.slice(0, 5) : ""}
                onChange={(e) =>
                  setFormData({ ...formData, shift_start_time: e.target.value ? e.target.value + ":00" : "" })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="shift_type">סוג משמרת</Label>
              <Select
                value={formData.shift_type}
                onValueChange={(value) =>
                  setFormData({ ...formData, shift_type: value as ShiftType })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="משמרת רגילה">משמרת רגילה</SelectItem>
                  <SelectItem value="ערב צעירים">ערב צעירים</SelectItem>
                  <SelectItem value="ארוע מיוחד">ארוע מיוחד</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="state">מצב</Label>
              <Select
                value={formData.state}
                onValueChange={(value) =>
                  setFormData({ ...formData, state: value as ShiftState })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="פתוחה">פתוחה</SelectItem>
                  <SelectItem value="מלאה">מלאה</SelectItem>
                  <SelectItem value="סגורה">סגורה</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="bartenders_required">מספר ברמנים נדרש</Label>
              <Input
                id="bartenders_required"
                type="number"
                min="1"
                max="10"
                value={formData.bartenders_required}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    bartenders_required: parseInt(e.target.value) || 1,
                  })
                }
                required
              />
            </div>

            <div>
              <Label htmlFor="notes">הערות (אופציונלי)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) =>
                  setFormData({ ...formData, notes: e.target.value })
                }
                placeholder="הערות נוספות למשמרת..."
                rows={3}
              />
            </div>
          </div>

          {/* Bartender removal — visible only for open and full shifts */}
          {shift && (formData.state === "פתוחה" || formData.state === "מלאה") && (
            <div className="border-t pt-4">
              <h4 className="font-semibold mb-2">ברמנים רשומים</h4>
              {bartenderDetails.length === 0 ? (
                <p className="text-sm text-muted-foreground">אין ברמנים רשומים</p>
              ) : (
                <ul className="space-y-2">
                  {bartenderDetails.map((bartender) => (
                    <li key={bartender.id} className="flex items-center justify-between text-sm">
                      <span>{bartender.full_name}</span>
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        onClick={() => handleRemoveBartender(bartender.id)}
                        disabled={removingBartender === bartender.id}
                      >
                        {removingBartender === bartender.id ? "מסיר..." : "הסר"}
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <DialogFooter className="mt-6 gap-2">
            {shift && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={loading || deleting}
              >
                {deleting ? "מוחק..." : "מחק משמרת"}
              </Button>
            )}
            <Button type="submit" disabled={loading || deleting}>
              {loading ? "שומר..." : shift ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
