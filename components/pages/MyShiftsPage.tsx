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
import { useAuth } from "@/contexts/auth-context"

const stateBadgeVariant: Record<string, string> = {
  פתוחה: "bg-green-100 text-green-700",
  מלאה: "bg-yellow-100 text-yellow-800",
  סגורה: "bg-gray-200 text-gray-700",
  running: "bg-blue-100 text-blue-700",
}

const formatTime = (time: string | null | undefined) =>
  time ? time.slice(0, 5) : "לא צוין"

function MyShifts() {
  const { user, loading: authLoading } = useAuth()
  const [shifts, setShifts] = React.useState<Shift[]>([])
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [signingOff, setSigningOff] = React.useState<number | null>(null)
  const [selectedShift, setSelectedShift] = React.useState<Shift | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [isDialogPast, setIsDialogPast] = React.useState(false)

  React.useEffect(() => {
    if (authLoading) return

    async function fetchData() {
      try {
        setLoading(true)

        if (!user) {
          setError("לא מחובר למערכת")
          return
        }

        // Fetch only this user's shifts
        const shiftsRes = await fetch(`/api/shifts?userId=${user.id}`)
        if (!shiftsRes.ok) throw new Error("Failed to fetch shifts")
        const shiftsData = await shiftsRes.json()

        setShifts(shiftsData.shifts || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "שגיאה בטעינת המשמרות")
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [authLoading, user])

  const handleShiftClick = (shift: Shift, past = false) => {
    setSelectedShift(shift)
    setIsDialogPast(past)
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

  const today = new Date().toISOString().split("T")[0]
  const upcomingShifts = shifts.filter((s) => s.shift_date >= today)
  const pastShifts = shifts
    .filter((s) => s.shift_date < today)
    .sort((a, b) => b.shift_date.localeCompare(a.shift_date))

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

      {upcomingShifts.length === 0 ? (
        <p className="text-gray-600">אין לך משמרות רשומות כרגע</p>
      ) : (
        <div className="space-y-3">
          {upcomingShifts.map((shift) => (
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
                disabled={loading || signingOff === shift.id || shift.state === "סגורה"}
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

      {/* Past shifts history */}
      <div className="mt-10">
        <h2 className="text-xl font-bold mb-4 text-gray-900">היסטוריית משמרות</h2>
        {pastShifts.length === 0 ? (
          <p className="text-gray-600">אין משמרות קודמות</p>
        ) : (
          <div className="space-y-3">
            {pastShifts.map((shift) => (
              <div
                key={shift.id}
                className="flex items-center justify-between p-4 bg-white border-2 border-gray-100 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all cursor-pointer opacity-80"
                onClick={() => handleShiftClick(shift, true)}
              >
                <div>
                  <h3 className="font-semibold text-gray-900">{shift.title}</h3>
                  <p className="text-sm text-gray-500">
                    {formatDate(shift.shift_date)} · {formatTime(shift.shift_start_time)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className={stateBadgeVariant[shift.state || shift.shift_state] ?? "bg-gray-200 text-gray-700"}>
                    {shift.state || shift.shift_state}
                  </Badge>
                  <Badge className="bg-gray-100 text-gray-500 text-xs">אין ח״וד עדיין</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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

                {/* Sign-off button — hidden for past shifts */}
                {!isDialogPast && (
                  <Button
                    onClick={() => handleSignoff(selectedShift.id)}
                    disabled={loading || signingOff === selectedShift.id || selectedShift.state === "סגורה"}
                    variant="destructive"
                    className="w-full"
                    size="lg"
                  >
                    {signingOff === selectedShift.id ? "מבטל הרשמה..." : "בטל הרשמה"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default MyShifts