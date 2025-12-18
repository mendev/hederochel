"use client"

import * as React from "react"
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

export type ShiftType = "ערב חמישי" | "ארוע מיוחד" | "ערב צעירים" | "אחר"

export interface BartenderDetail {
  id: string
  full_name?: string
  role?: string
}

export interface Shift {
  id: number
  title: string
  start_time: string
  end_time: string | null
  shift_type: ShiftType
  notes: string | null
  bartenders: string[]
  bartender_details?: BartenderDetail[]
  created_at: string
}

interface ShiftsCalendarProps {
  shifts?: Shift[]
  onShiftClick?: (shift: Shift) => void
  onDateSelect?: (date: Date) => void
  className?: string
}

const shiftConfig: Record<ShiftType, { symbol: string; color: string; label: string }> = {
  "ערב חמישי": { symbol: "ה", color: "bg-purple-100 text-purple-700 border-purple-300", label: "ערב חמישי" },
  "ארוע מיוחד": { symbol: "★", color: "bg-amber-100 text-amber-700 border-amber-300", label: "ארוע מיוחד" },
  "ערב צעירים": { symbol: "צ", color: "bg-blue-100 text-blue-700 border-blue-300", label: "ערב צעירים" },
  אחר: { symbol: "●", color: "bg-gray-100 text-gray-700 border-gray-300", label: "אחר" },
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

export function ShiftsCalendar({ shifts: propShifts, onShiftClick, onDateSelect, className }: ShiftsCalendarProps) {
  const [shifts, setShifts] = React.useState<Shift[]>(propShifts || [])
  const [loading, setLoading] = React.useState(!propShifts)
  const [error, setError] = React.useState<string | null>(null)
  const [selectedShift, setSelectedShift] = React.useState<Shift | null>(null)
  const [dialogOpen, setDialogOpen] = React.useState(false)
  const [currentMonth, setCurrentMonth] = React.useState(new Date())
  const [selectedDate, setSelectedDate] = React.useState<Date | null>(null)

  React.useEffect(() => {
    if (propShifts) {
      setShifts(propShifts)
      return
    }

    async function fetchShifts() {
      try {
        setLoading(true)
        // Get shifts for current month with some buffer
        const start = new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1)
        const end = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 2, 0)

        const params = new URLSearchParams({
          start: start.toISOString(),
          end: end.toISOString(),
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

  // Group shifts by date for quick lookup
  const shiftsByDate = React.useMemo(() => {
    const map = new Map<string, Shift[]>()
    shifts.forEach((shift) => {
      const date = new Date(shift.start_time)
      const key = date.toDateString()
      const existing = map.get(key) || []
      map.set(key, [...existing, shift])
    })
    return map
  }, [shifts])

  // Handle shift indicator click
  const handleShiftClick = (shift: Shift, e: React.MouseEvent) => {
    e.stopPropagation()
    setSelectedShift(shift)
    setDialogOpen(true)
    onShiftClick?.(shift)
  }

  // Format time for display
  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("he-IL", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const goToPreviousMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))
  }

  const goToNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))
  }

  const getDaysInMonthView = () => {
    const year = currentMonth.getFullYear()
    const month = currentMonth.getMonth()

    // First day of the month
    const firstDay = new Date(year, month, 1)
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0)

    // Day of week for first day (0 = Sunday)
    const startDayOfWeek = firstDay.getDay()

    const days: { date: Date; isCurrentMonth: boolean }[] = []

    // Add days from previous month
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month, -i)
      days.push({ date, isCurrentMonth: false })
    }

    // Add days of current month
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({ date: new Date(year, month, i), isCurrentMonth: true })
    }

    // Add days from next month to complete the grid (6 rows x 7 days = 42)
    const remaining = 42 - days.length
    for (let i = 1; i <= remaining; i++) {
      days.push({ date: new Date(year, month + 1, i), isCurrentMonth: false })
    }

    return days
  }

  const days = getDaysInMonthView()
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const handleDateClick = (date: Date) => {
    setSelectedDate(date)
    onDateSelect?.(date)
  }

  if (loading) {
    return (
      <div className={cn("flex items-center justify-center min-h-[500px] bg-background", className)}>
        <div className="text-muted-foreground text-lg">טוען משמרות...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex items-center justify-center min-h-[500px] bg-background", className)}>
        <div className="text-destructive text-lg">{error}</div>
      </div>
    )
  }

  return (
    <>
      <div className={cn("w-full bg-white p-4 md:p-6 rounded-xl", className)} dir="rtl">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <Button
              variant="outline"
              size="icon"
              onClick={goToNextMonth}
              className="size-10 md:size-12 border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
            >
              <ChevronRightIcon className="size-5 md:size-6" />
            </Button>

            <h2 className="text-xl md:text-3xl font-bold text-gray-900">
              {hebrewMonths[currentMonth.getMonth()]} {currentMonth.getFullYear()}
            </h2>

            <Button
              variant="outline"
              size="icon"
              onClick={goToPreviousMonth}
              className="size-10 md:size-12 border-gray-300 text-gray-700 hover:bg-gray-100 bg-transparent"
            >
              <ChevronLeftIcon className="size-5 md:size-6" />
            </Button>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {hebrewDays.map((day) => (
              <div key={day} className="text-center text-sm md:text-base font-semibold text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {days.map(({ date, isCurrentMonth }, index) => {
              const dayShifts = shiftsByDate.get(date.toDateString()) || []
              const isToday = date.getTime() === today.getTime()
              const isSelected = selectedDate && date.getTime() === selectedDate.getTime()

              return (
                <div
                  key={index}
                  onClick={() => handleDateClick(date)}
                  className={cn(
                    "min-h-[70px] md:min-h-[100px] p-1 md:p-2 rounded-lg border cursor-pointer transition-all",
                    "border-gray-200 hover:border-blue-400 hover:bg-blue-50",
                    isCurrentMonth ? "bg-white" : "bg-gray-50",
                    !isCurrentMonth && "opacity-50",
                    isToday && "ring-2 ring-blue-500 border-blue-500 bg-blue-50",
                    isSelected && "bg-blue-100 border-blue-500",
                  )}
                >
                  <div
                    className={cn(
                      "text-sm md:text-lg font-medium mb-1",
                      isCurrentMonth ? "text-gray-900" : "text-gray-400",
                      isToday && "text-blue-600 font-bold",
                    )}
                  >
                    {date.getDate()}
                  </div>

                  {dayShifts.length > 0 && (
                    <div className="flex flex-wrap gap-0.5 md:gap-1">
                      {dayShifts.slice(0, 3).map((shift) => (
                        <button
                          key={shift.id}
                          onClick={(e) => handleShiftClick(shift, e)}
                          className={cn(
                            "size-5 md:size-7 rounded-full text-[10px] md:text-xs flex items-center justify-center border-2 cursor-pointer",
                            "hover:scale-110 hover:shadow-md transition-all",
                            shiftConfig[shift.shift_type]?.color || shiftConfig["אחר"].color,
                          )}
                          title={shift.title}
                        >
                          {shiftConfig[shift.shift_type]?.symbol || "●"}
                        </button>
                      ))}
                      {dayShifts.length > 3 && (
                        <span className="text-[10px] md:text-xs text-gray-500 self-center">
                          +{dayShifts.length - 3}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="mt-6 flex flex-wrap gap-4 md:gap-6 justify-center text-sm md:text-base">
            {Object.entries(shiftConfig).map(([type, config]) => (
              <div key={type} className="flex items-center gap-2">
                <span
                  className={cn(
                    "size-6 md:size-8 rounded-full flex items-center justify-center text-xs md:text-sm border-2",
                    config.color,
                  )}
                >
                  {config.symbol}
                </span>
                <span className="text-gray-700">{config.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              {selectedShift && (
                <>
                  <span
                    className={cn(
                      "size-8 rounded-full flex items-center justify-center text-sm border-2",
                      shiftConfig[selectedShift.shift_type]?.color || shiftConfig["אחר"].color,
                    )}
                  >
                    {shiftConfig[selectedShift.shift_type]?.symbol || "●"}
                  </span>
                  <span>{selectedShift.title}</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-base">
              {selectedShift &&
                new Date(selectedShift.start_time).toLocaleDateString("he-IL", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
            </DialogDescription>
          </DialogHeader>

          {selectedShift && (
            <div className="space-y-4 py-4">
              <div>
                <p className="text-sm text-muted-foreground">סוג משמרת</p>
                <Badge variant="secondary" className="mt-1">
                  {shiftConfig[selectedShift.shift_type]?.label || selectedShift.shift_type}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">שעת התחלה</p>
                  <p className="font-medium">{formatTime(selectedShift.start_time)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">שעות סיום</p>
                  <p className="font-medium">
                    {selectedShift.end_time ? formatTime(selectedShift.end_time) : "לא נקבע"}
                  </p>
                </div>
              </div>

              {selectedShift.bartender_details && selectedShift.bartender_details.length > 0 && (
                <div>
                  <p className="text-sm text-muted-foreground">ברמנים</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {/* {selectedShift.bartender_details.map((bartender) => (
                      <Badge key={bartender.id} variant="secondary">
                        {bartender.full_name || bartender.id}
                      </Badge>
                    ))} */}
                  </div>
                </div>
              )}

              {selectedShift.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">הערות</p>
                  <p className="text-sm mt-1 p-2 bg-muted rounded-md">{selectedShift.notes}</p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
