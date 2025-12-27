"use client"

import React from "react"
import { UsersTable, User } from "@/components/users-table"
import { UserFormDialog } from "@/components/user-form-dialog"
import { Button } from "@/components/ui/button"

function UsersPage() {
  const [formOpen, setFormOpen] = React.useState(false)
  const [editingUser, setEditingUser] = React.useState<User | null>(null)
  const [refreshKey, setRefreshKey] = React.useState(0)

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

      <UsersTable onUserClick={handleEditUser} refreshKey={refreshKey} />

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