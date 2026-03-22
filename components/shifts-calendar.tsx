"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

/* --------------------------------------------------
 * Types
 * -------------------------------------------------- */

export type ShiftType =
  | "משמרת רגילה"
  | "ערב צעירים"
  | "ארוע מיוחד"

export type ShiftState = "פתוחה" | "מלאה" | "סגורה" | "running"

export interface Shift {
  id: number
  title: string
  shift_date: string          // DATE → "YYYY-MM-DD"
  shift_start_time: string          // TIME → "HH:MM:SS"
  shift_type: ShiftType
  shift_state: ShiftState
  state: ShiftState           // Database field name
  notes: string | null
  bartenders_required: number
  bartenders: string[]        // Supabase user IDs
  bartender_details?: Array<{
    id: string
    full_name: string
    role: string
  }>
  shift_report_id: number | null
  created_at: string
}

/* --------------------------------------------------
 * Config
 * -------------------------------------------------- */

const shiftTypeLabels: Record<ShiftType, string> = {
  "משמרת רגילה": "משמרת רגילה",
  "ערב צעירים": "ערב צעירים",
  "ארוע מיוחד": "ארוע מיוחד",
}

const stateConfig: Record<
  ShiftState,
  { symbol: string; color: string; label: string }
> = {
  פתוחה: {
    symbol: "●",
    color: "bg-green-500 text-white border-green-600",
    label: "פתוחה",
  },
  מלאה: {
    symbol: "●",
    color: "bg-red-500 text-white border-red-600",
    label: "מלאה",
  },
  סגורה: {
    symbol: "●",
    color: "bg-gray-500 text-white border-gray-600",
    label: "סגורה",
  },
  running: {
    symbol: "▶",
    color: "bg-blue-500 text-white border-blue-600",
    label: "פועלת",
  },
}

const stateBadgeVariant: Record<ShiftState, string> = {
  פתוחה: "bg-green-100 text-green-700",
  מלאה: "bg-red-100 text-red-700",
  סגורה: "bg-gray-200 text-gray-700",
  running: "bg-blue-100 text-blue-700",
}

const hebrewMonths = [
  "ינואר",
  "פברואר",
  "מרץ",
  "אפריל",
  "מאי",
  "יוני",
  "יולי",
  "אוגוסט",
  "ספטמבר",
  "אוקטובר",
  "נובמבר",
  "דצמבר",
]

const hebrewDays = ["א׳", "ב׳", "ג׳", "ד׳", "ה׳", "ו׳", "ש׳"]

/* --------------------------------------------------
 * Helpers
 * -------------------------------------------------- */

const buildShiftDateTime = (shift: Shift) =>
  new Date(`${shift.shift_date}T${shift.shift_start_time}`)

const formatTime = (time: string | null | undefined) =>
  time ? time.slice(0, 5) : "לא צוין"

/* --------------------------------------------------
 * Component
 * -------------------------------------------------- */

interface ShiftsCalendarProps {
  shifts?: Shift[]
  onShiftClick?: (shift: Shift) => void
  onDateSelect?: (date: Date) => void
  className?: string
  managementMode?: boolean
  onShiftEdit?: (shift: Shift) => void
}

export function ShiftsCalendar({
  shifts: propShifts,
  onShiftClick,
  onDateSelect,
  className,
  managementMode = false,
  onShiftEdit,
}: ShiftsCalendarProps) {
  const [shifts, setShifts] = React.useState<Shift[]>(propShifts || [])
  const [loading, setLoading] = React.useState(!propShifts)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedShift, setSelectedShift] = React.useState<Shift | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)
  const [signingUp, setSigningUp] = React.useState(false)
  const [signupError, setSignupError] = React.useState<string | null>(null)
  const [currentUserId, setCurrentUserId] = React.useState<string | null>(null)
  const [currentUserSuspended, setCurrentUserSuspended] = React.useState(false)

  // Fetch current user (including suspension status)
  React.useEffect(() => {
    async function getCurrentUser() {
      try {
        const res = await fetch("/api/auth/user")
        if (res.ok) {
          const data = await res.json()
          setCurrentUserId(data.user?.id || null)
          setCurrentUserSuspended(data.user?.suspended ?? false)
        }
      } catch (err) {
        console.error("Failed to fetch current user:", err)
      }
    }
    getCurrentUser()
  }, [])

  React.useEffect(() => {
    if (propShifts) {
      setShifts(propShifts)
      return
    }

    async function fetchShifts() {
      try {
        setLoading(true)

        const start = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth(),
          1,
        )
        const end = new Date(
          currentMonth.getFullYear(),
          currentMonth.getMonth() + 1,
          0,
        )

        const params = new URLSearchParams({
          start: start.toDateString(),
          end: end.toDateString(),
        })

        const res = await fetch(`/api/shifts?${params}`)
        const data = await res.json()

        if (!res.ok) throw new Error(data.error)
        setShifts(data.shifts || [])
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load shifts")
      } finally {
        setLoading(false)
      }
    }

    fetchShifts()
  }, [propShifts, currentMonth])

  /* Group shifts by date */
  const shiftsByDate = React.useMemo(() => {
    const map = new Map<string, Shift[]>()
    shifts.forEach((shift) => {
      const key = new Date(shift.shift_date).toDateString()
      map.set(key, [...(map.get(key) || []), shift])
    })
    return map
  }, [shifts])

  const handleShiftClick = (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation()

    if (managementMode && onShiftEdit) {
      onShiftEdit(shift)
    } else {
      setSelectedShift(shift)
      setDialogOpen(true)
      setSignupError(null)
    }

    onShiftClick?.(shift)
  }

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onDateSelect?.(date)
  }

  const handleSignup = async () => {
    if (!selectedShift) return

    try {
      setSigningUp(true)
      setSignupError(null)

      const res = await fetch(`/api/shifts/${selectedShift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signup" }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to signup")
      }

      // Update the shift in the list
      setShifts((prev) =>
        prev.map((s) => (s.id === selectedShift.id ? data.shift : s))
      )

      // Update the selected shift
      setSelectedShift(data.shift)
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Failed to signup")
    } finally {
      setSigningUp(false)
    }
  }

  const handleSignoff = async () => {
    if (!selectedShift) return

    try {
      setSigningUp(true)
      setSignupError(null)

      const res = await fetch(`/api/shifts/${selectedShift.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "signoff" }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || "Failed to sign off")
      }

      // Update the shift in the list
      setShifts((prev) =>
        prev.map((s) => (s.id === selectedShift.id ? data.shift : s))
      )

      // Update the selected shift
      setSelectedShift(data.shift)
    } catch (err) {
      setSignupError(err instanceof Error ? err.message : "Failed to sign off")
    } finally {
      setSigningUp(false)
    }
  }

  const goToPreviousMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))

  const goToNextMonth = () =>
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))

  const days = (() => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const startDay = firstDay.getDay()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    for (let i = startDay - 1; i >= 0; i--) {
      days.push({ date: new Date(year, month, -i), isCurrentMonth: false })
    }

    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    while (days.length < 42) {
      days.push({
        date: new Date(year, month + 1, days.length - lastDay.getDate() + 1),
        isCurrentMonth: false,
      })
    }

    return days
  })()

  if (loading) {
    return <div className="text-center py-20">טוען משמרות...</div>
  }

  if (error) {
    return <div className="text-center text-destructive py-20">{error}</div>
  }

  return (
    <>
      <div  dir="rtl">
        <div className="flex justify-between items-center mb-6">
          <Button variant="outline" size="icon" onClick={goToNextMonth}>
            <ChevronRightIcon />
          </Button>

          <h2 className="text-2xl font-bold text-foreground">
            {hebrewMonths[currentMonth.getMonth()]} {currentMonth.getFullYear()}
          </h2>

          <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
            <ChevronLeftIcon />
          </Button>
        </div>

        <div className="grid grid-cols-7 gap-2 mb-2">
          {hebrewDays.map((day) => (
            <div key={day} className="text-center font-semibold text-white">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-2">
          {days.map(({ date, isCurrentMonth }, idx) => {
            const dayShifts = shiftsByDate.get(date.toDateString()) || []

            return (
              <div
                key={idx}
                onClick={() => handleDateClick(date)}
                className={cn(
                  "min-h-[90px] p-2 rounded-lg border cursor-pointer hover:border-accent transition-colors",
                  isCurrentMonth
                    ? "bg-card border-border"
                    : "bg-card/50 border-border/50 opacity-60",
                )}
              >
                <div className="font-medium mb-1 text-foreground">{date.getDate()}</div>

                <div className="flex flex-wrap gap-1">
                  {dayShifts.map((shift) => {
                    const shiftState = shift.state || shift.shift_state
                    const config = stateConfig[shiftState] ?? stateConfig["פתוחה"]
                    return (
                      <button
                        key={shift.id}
                        onClick={(e) => handleShiftClick(shift, e)}
                        className={cn(
                          "size-7 rounded-full border-2 flex items-center justify-center text-xs",
                          config.color,
                        )}
                        title={shift.title}
                      >
                        {config.symbol}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Shift Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent dir="rtl">
          {selectedShift && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedShift.title}</DialogTitle>
                <DialogDescription>
                  {buildShiftDateTime(selectedShift).toLocaleDateString("he-IL", {
                    weekday: "long",
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge className={stateBadgeVariant[selectedShift.state || selectedShift.shift_state] ?? stateBadgeVariant["פתוחה"]}>
                    {selectedShift.state || selectedShift.shift_state || "לא ידוע"}
                  </Badge>
                  <Badge variant="outline">
                    {shiftTypeLabels[selectedShift.shift_type]}
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

                {/* Signup/Signoff buttons */}
                {signupError && (
                  <p className="text-sm text-destructive">{signupError}</p>
                )}

                {currentUserId && selectedShift.bartenders.includes(currentUserId) ? (
                  <Button
                    onClick={handleSignoff}
                    disabled={signingUp || selectedShift.state === "סגורה"}
                    variant="destructive"
                    className="w-full"
                  >
                    {signingUp ? "מבטל הרשמה..." : "בטל הרשמה"}
                  </Button>
                ) : (
                  <Button
                    onClick={handleSignup}
                    disabled={
                      signingUp ||
                      currentUserSuspended ||
                      selectedShift.state !== "פתוחה"
                    }
                    className="w-full"
                  >
                    {signingUp ? "נרשם..." : "הרשם למשמרת"}
                  </Button>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
