"use client"

import React from "react"
import { UsersTable, User } from "@/components/users-table"
import { UserFormDialog } from "@/components/user-form-dialog"
import { Button } from "@/components/ui/button"

function UsersPage() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [selectedUsers, setSelectedUsers] = React.useState<User[]>([])
  const [clearSelectionKey, setClearSelectionKey] = React.useState(0)
  const [bulkLoading, setBulkLoading] = React.useState(false)

  const handleAddUser = () => {
    setEditingUser(null)
    setFormOpen(true)
  }

  const handleEditUser = (user: User) => {
    setEditingUser(user)
    setFormOpen(true)
  }

  const handleFormSuccess = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleSelectionChange = React.useCallback((ids: Set<string>, users: User[]) => {
    setSelectedIds(new Set(ids))
    setSelectedUsers(users)
  }, [])

  const handleBulkDelete = async () => {
    if (!confirm(`האם אתה בטוח שברצונך למחוק ${selectedIds.size} משתמשים? פעולה זו לא ניתנת לביטול.`)) {
      return
    }
    setBulkLoading(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/users/${id}`, { method: "DELETE" })
        )
      )
    } finally {
      setBulkLoading(false)
      setClearSelectionKey((prev) => prev + 1)
      setRefreshKey((prev) => prev + 1)
    }
  }

  const handleBulkSuspend = async () => {
    if (!confirm(`האם אתה בטוח שברצונך להשעות ${selectedIds.size} משתמשים?`)) {
      return
    }
    setBulkLoading(true)
    try {
      await Promise.all(
        Array.from(selectedIds).map((id) =>
          fetch(`/api/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "suspend" }),
          })
        )
      )
    } finally {
      setBulkLoading(false)
      setClearSelectionKey((prev) => prev + 1)
      setRefreshKey((prev) => prev + 1)
    }
  }

  const hasSuspendedSelected = selectedUsers.some(
    (u) => u.banned_until && new Date(u.banned_until) > new Date()
  )

  const handleBulkUnsuspend = async () => {
    const suspendedIds = selectedUsers
      .filter((u) => u.banned_until && new Date(u.banned_until) > new Date())
      .map((u) => u.id)
    if (!confirm(`האם אתה בטוח שברצונך לבטל השעיה ל-${suspendedIds.length} משתמשים?`)) {
      return
    }
    setBulkLoading(true)
    try {
      await Promise.all(
        suspendedIds.map((id) =>
          fetch(`/api/users/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "unsuspend" }),
          })
        )
      )
    } finally {
      setBulkLoading(false)
      setClearSelectionKey((prev) => prev + 1)
      setRefreshKey((prev) => prev + 1)
    }
  }

  return (
    <div className="p-6" dir="rtl">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">ניהול משתמשים</h2>
          <p className="text-sm text-gray-600 mt-1">
            הוסף, ערוך, השעה או מחק משתמשים במערכת
          </p>
        </div>
        <Button onClick={handleAddUser} size="lg" className="font-bold">
          + הוסף משתמש
        </Button>
      </div>

      {selectedIds.size > 0 && (
        <div className="flex items-center gap-3 mb-4 p-3 bg-muted rounded-lg bulk-actions-bar">
          <span className="text-sm font-medium">{selectedIds.size} נבחרו</span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={bulkLoading}
            data-testid="bulk-delete-btn"
          >
            {bulkLoading ? "מוחק..." : "מחק נבחרים"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkSuspend}
            disabled={bulkLoading}
            className="border-orange-500 text-orange-600 hover:bg-orange-50"
            data-testid="bulk-suspend-btn"
          >
            {bulkLoading ? "משעה..." : "השעה נבחרים"}
          </Button>
          {hasSuspendedSelected && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleBulkUnsuspend}
              disabled={bulkLoading}
              className="border-green-500 text-green-600 hover:bg-green-50"
              data-testid="bulk-unsuspend-btn"
            >
              {bulkLoading ? "מבטל השעיה..." : "בטל השעיה לנבחרים"}
            </Button>
          )}
        </div>
      )}

      <UsersTable
        onUserClick={handleEditUser}
        refreshKey={refreshKey}
        onSelectionChange={handleSelectionChange}
        clearSelectionKey={clearSelectionKey}
      />

      <UserFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        user={editingUser}
        onSuccess={handleFormSuccess}
      />
    </div>
  )
}

export default UsersPage
