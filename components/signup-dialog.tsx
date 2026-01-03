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

interface SignupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function SignupDialog({
  open,
  onOpenChange,
  onSuccess,
}: SignupDialogProps) {
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const [formData, setFormData] = React.useState({
    email: "",
    password: "",
    confirmPassword: "",
    full_name: "",
  })

  // Reset form when dialog opens/closes
  React.useEffect(() => {
    if (open) {
      setFormData({
        email: "",
        password: "",
        confirmPassword: "",
        full_name: "",
      })
      setError(null)
      setSuccess(false)
    }
  }, [open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setError("הסיסמאות אינן תואמות")
      setLoading(false)
      return
    }

    // Validate password length
    if (formData.password.length < 6) {
      setError("הסיסמה חייבת להכיל לפחות 6 תווים")
      setLoading(false)
      return
    }

    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          full_name: formData.full_name,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "שגיאה ביצירת המשתמש")
      }

      setSuccess(true)

      // Show success message for 2 seconds then close
      setTimeout(() => {
        onSuccess?.()
        onOpenChange(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת המשתמש")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle>הרשמה למערכת</DialogTitle>
        </DialogHeader>

        {success ? (
          <div className="py-6 text-center">
            <p className="text-lg font-semibold text-green-600">
              המשתמש נוצר בהצלחה!
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              כעת תוכל להתחבר עם הפרטים שהזנת
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4">
              {error && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {error}
                </p>
              )}

              <div>
                <Label htmlFor="signup-email">שם משתמש (אימייל)</Label>
                <Input
                  id="signup-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData({ ...formData, email: e.target.value })
                  }
                  required
                  placeholder="user@example.com"
                  autoComplete="email"
                />
              </div>

              <div>
                <Label htmlFor="signup-full-name">שם מלא</Label>
                <Input
                  id="signup-full-name"
                  type="text"
                  value={formData.full_name}
                  onChange={(e) =>
                    setFormData({ ...formData, full_name: e.target.value })
                  }
                  required
                  placeholder="ישראל ישראלי"
                  autoComplete="name"
                />
              </div>

              <div>
                <Label htmlFor="signup-password">סיסמה</Label>
                <Input
                  id="signup-password"
                  type="password"
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  required
                  placeholder="לפחות 6 תווים"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>

              <div>
                <Label htmlFor="signup-confirm-password">אימות סיסמה</Label>
                <Input
                  id="signup-confirm-password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) =>
                    setFormData({ ...formData, confirmPassword: e.target.value })
                  }
                  required
                  placeholder="הזן את הסיסמה שוב"
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <DialogFooter className="mt-6">
              <Button
                type="submit"
                disabled={loading}
                className="w-full"
              >
                {loading ? "נרשם..." : "הירשם"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
