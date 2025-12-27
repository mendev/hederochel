"use client"

import React from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Shift } from "@/components/shifts-calendar"

const stateBadgeVariant: Record<string, string> = {
  פתוחה: "bg-green-100 text-green-700",
  מלאה: "bg-yellow-100 text-yellow-800",
  סגורה: "bg-gray-200 text-gray-700",
}

const formatTime = (time: string | null | undefined) =>
  time ? time.slice(0, 5) : "לא צוין"

function MyShifts() {
  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [signingOff, setSigningOff] = React.useState<number | null>(null)
  const [selectedShift, setSelectedShift] = React.useState<Shift | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)

  React.useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true)

        // Fetch current user
        const userRes = await fetch("/api/auth/user")
        if (!userRes.ok) throw new Error("Failed to fetch user")
        const userData = await userRes.json()

        if (!userData.user) {
          setError("לא מחובר למערכת")
          setLoading(false)
          return
        }

        setCurrentUserId(userData.user.id)

        // Fetch all shifts
        const shiftsRes = await fetch("/api/shifts")
        if (!shiftsRes.ok) throw new Error("Failed to fetch shifts")
        const shiftsData = await shiftsRes.json()

        // Filter to only user's shifts
        const userShifts = (shiftsData.shifts || []).filter((shift: Shift) =>
          shift.bartenders.includes(userData.user.id)
        )

        setShifts(userShifts)
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בטעינת המשמרות")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleShiftClick = (shift: Shift) => {
    setSelectedShift(shift)
    setDialogOpen(true)
  }

  const handleSignoff = async (shiftId: number) => {
    try {
      setSigningOff(shiftId)

      const res = await fetch(`/api/shifts/${shiftId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signoff" }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign off")
      }

      // Remove the shift from the list
      setShifts((prev) => prev.filter((s) => s.id !== shiftId))

      // Close dialog if it's open
      if (dialogOpen) {
        setDialogOpen(false)
        setSelectedShift(null)
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "שגיאה בביטול ההרשמה")
    } finally {
      setSigningOff(null)
    }
  }

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString("he-IL", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    })
  }

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">המשמרות שלי</h2>
        <p className="text-gray-600">טוען משמרות...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6" dir="rtl">
        <h2 className="text-2xl font-bold mb-4 text-gray-900">המשמרות שלי</h2>
        <p className="text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div className="p-6" dir="rtl">
      <h2 className="text-2xl font-bold mb-6 text-gray-900">המשמרות שלי</h2>

      {shifts.length === 0 ? (
        <p className="text-gray-600">אין לך משמרות רשומות כרגע</p>
      ) : (
        <div className="space-y-3">
          {shifts.map((shift) => (
            <div
              key={shift.id}
              className="flex items-center justify-between p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all"
            >
              <div
                className="flex-1 cursor-pointer"
                onClick={() => handleShiftClick(shift)}
              >
                <h3 className="font-semibold text-gray-900">{shift.title}</h3>
                <p className="text-sm text-gray-600">{formatDate(shift.shift_date)}</p>
              </div>

              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleSignoff(shift.id)
                }}
                disabled={signingOff === shift.id || shift.state === "סגורה"}
                variant="outline"
                size="lg"
                className="border-2 border-red-500 text-red-600 hover:bg-red-50 hover:text-red-700 font-bold"
              >
                {signingOff === shift.id ? "מבטל הרשמה..." : "בטל הרשמה"}
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Shift Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          {selectedShift && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedShift.title}</DialogTitle>
                <DialogDescription>
                  {new Date(selectedShift.shift_date).toLocaleDateString("he-IL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Badge className={stateBadgeVariant[selectedShift.state || selectedShift.shift_state]}>
                    {selectedShift.state || selectedShift.shift_state}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {selectedShift.bartenders.length} / {selectedShift.bartenders_required} ברמנים
                  </span>
                </div>

                <p>שעת התחלה: {formatTime(selectedShift.shift_start_time)}</p>

                {selectedShift.notes && (
                  <p className="bg-muted p-2 rounded text-sm">{selectedShift.notes}</p>
                )}

                {/* Bartenders list */}
                {selectedShift.bartender_details && selectedShift.bartender_details.length > 0 && (
                  <div>
                    <h4 className="font-semibold mb-2">ברמנים רשומים:</h4>
                    <ul className="list-disc list-inside space-y-1">
                      {selectedShift.bartender_details.map((bartender) => (
                        <li key={bartender.id} className="text-sm">
                          {bartender.full_name}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Sign-off button */}
                <Button
                  onClick={() => handleSignoff(selectedShift.id)}
                  disabled={signingOff === selectedShift.id || selectedShift.state === "סגורה"}
                  variant="destructive"
                  className="w-full"
                  size="lg"
                >
                  {signingOff === selectedShift.id ? "מבטל הרשמה..." : "בטל הרשמה"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MyShifts