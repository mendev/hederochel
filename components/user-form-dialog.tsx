"use client"

import * as React from "react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

interface User {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  full_name: string | null
  role: string | null
  banned_until?: string | null
  user_metadata: {
    name: string | null
    avatar_url: string | null
  }
}

interface UserFormDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user?: User | null
  onSuccess?: () => void
}

export function UserFormDialog({
  open,
  onOpenChange,
  user,
  onSuccess,
}: UserFormDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [suspending, setSuspending] = React.useState(false)
  const [deleting, setDeleting] = React.useState(false)

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    full_name: "",
    role: "bartender",
  })

  const isSuspended = user?.banned_until && new Date(user.banned_until) > new Date()

  // Populate form when editing
  React.useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: "",
        full_name: user.full_name || "",
        role: user.role || "bartender",
      })
    } else {
      // Reset form for new user
      setFormData({
        email: "",
        password: "",
        full_name: "",
        role: "bartender",
      })
    }
    setError(null)
  }, [user, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      const url = user ? `/api/users/${user.id}` : "/api/users"
      const method = user ? "PUT" : "POST"

      const payload = user
        ? {
            full_name: formData.full_name,
            role: formData.role,
            ...(formData.password && { password: formData.password }),
          }
        : formData

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to save user")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save user")
    } finally {
      setLoading(false)
    }
  }

  const handleSuspend = async () => {
    if (!user) return

    if (!confirm("האם אתה בטוח שברצונך להשעות את המשתמש? המשתמש יוסר מכל המשמרות הפתוחות.")) {
      return
    }

    setSuspending(true)
    setError(null)

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suspend" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to suspend user")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to suspend user")
    } finally {
      setSuspending(false)
    }
  }

  const handleUnsuspend = async () => {
    if (!user) return

    setSuspending(true)
    setError(null)

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unsuspend" }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to unsuspend user")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to unsuspend user")
    } finally {
      setSuspending(false)
    }
  }

  const handleDelete = async () => {
    if (!user) return

    if (!confirm("האם אתה בטוח שברצונך למחוק את המשתמש? פעולה זו תסיר את המשתמש מכל המשמרות ולא ניתן לבטלה.")) {
      return
    }

    setDeleting(true)
    setError(null)

    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || "Failed to delete user")
      }

      onSuccess?.()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {user ? "ערוך משתמש" : "הוסף משתמש חדש"}
            {user && isSuspended && (
              <Badge variant="destructive" className="mr-2">מושעה</Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                {error}
              </p>
            )}

            <div>
              <Label htmlFor="email">אימייל</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) =>
                  setFormData({ ...formData, email: e.target.value })
                }
                required
                disabled={!!user}
                placeholder="user@example.com"
              />
              {user && (
                <p className="text-xs text-muted-foreground mt-1">
                  לא ניתן לשנות אימייל לאחר יצירת המשתמש
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="full_name">שם מלא</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) =>
                  setFormData({ ...formData, full_name: e.target.value })
                }
                required
                placeholder="ישראל ישראלי"
              />
            </div>

            <div>
              <Label htmlFor="role">תפקיד</Label>
              <Select
                value={formData.role}
                onValueChange={(value) =>
                  setFormData({ ...formData, role: value })
                }
              >
                <SelectTrigger className="bg-[#1A3535] border-[#2C5F5F]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#1A3535] border-[#2C5F5F]">
                  <SelectItem value="bartender">ברמן</SelectItem>
                  <SelectItem value="manager">מנהל משמרת</SelectItem>
                  <SelectItem value="admin">מנהל</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="password">
                {user ? "סיסמה חדשה (אופציונלי)" : "סיסמה"}
              </Label>
              <Input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) =>
                  setFormData({ ...formData, password: e.target.value })
                }
                required={!user}
                placeholder={user ? "השאר ריק לשמירת הסיסמה הנוכחית" : "********"}
                minLength={6}
              />
              {user && (
                <p className="text-xs text-muted-foreground mt-1">
                  הזן סיסמה רק אם ברצונך לאפס אותה
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-6 gap-2 flex-col sm:flex-row">
            {user && (
              <>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={loading || deleting || suspending}
                  className="w-full sm:w-auto"
                >
                  {deleting ? "מוחק..." : "מחק משתמש"}
                </Button>
                {isSuspended ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleUnsuspend}
                    disabled={loading || deleting || suspending}
                    className="w-full sm:w-auto"
                  >
                    {suspending ? "מבטל השעיה..." : "בטל השעיה"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleSuspend}
                    disabled={loading || deleting || suspending}
                    className="w-full sm:w-auto border-orange-500 text-orange-600 hover:bg-orange-50"
                  >
                    {suspending ? "משעה..." : "השעה משתמש"}
                  </Button>
                )}
              </>
            )}
            <Button
              type="submit"
              disabled={loading || deleting || suspending}
              className="w-full sm:w-auto"
            >
              {loading ? "שומר..." : user ? "עדכן" : "הוסף"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
