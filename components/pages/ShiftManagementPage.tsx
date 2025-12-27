"use client"

import React from "react"
import { ShiftsCalendar, Shift } from "../shifts-calendar"
import { ShiftFormDialog } from "../shift-form-dialog"
import { Button } from "@/components/ui/button"

function ShiftsPage() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingShift, setEditingShift] = React.useState<Shift | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

  const handleAddShift = () => {
    setEditingShift(null)
    setFormOpen(true)
  }

  const handleEditShift = (shift: Shift) => {
    setEditingShift(shift)
    setFormOpen(true)
  }

  const handleFormSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900">ניהול משמרות</h2>
        <Button onClick={handleAddShift} size="lg" className="font-bold">
          + הוסף משמרת
        </Button>
      </div>

      <ShiftsCalendar
        key={refreshKey}
        managementMode
        onShiftEdit={handleEditShift}
      />

      <ShiftFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        shift={editingShift}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}

export default ShiftsPage