"use client"

import { useState, useEffect } from "react"
import useSWR from "swr"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

export type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
  banned_until: string | null
  full_name: string | null
  role: string | null
  user_metadata: {
    name: string | null
    avatar_url: string | null
  }
}

const fetcher = async (url: string) => {
  const res = await fetch(url)
  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.error || "Failed to fetch")
  }

  return data
}

interface UsersTableProps {
  onUserClick?: (user: User) => void
  refreshKey?: number
  onSelectionChange?: (selectedIds: Set<string>, selectedUsers: User[]) => void
  clearSelectionKey?: number
}

export function UsersTable({ onUserClick, refreshKey = 0, onSelectionChange, clearSelectionKey = 0 }: UsersTableProps) {
  const { data, error, isLoading } = useSWR<{ users: User[]; count: number }>(
    `/api/users?refresh=${refreshKey}`,
    fetcher
  )
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const selected = data?.users?.filter((u) => selectedIds.has(u.id)) ?? []
    onSelectionChange?.(selectedIds, selected)
  }, [selectedIds, onSelectionChange, data?.users])

  useEffect(() => {
    setSelectedIds(new Set())
  }, [clearSelectionKey])

  // Toggle single user selection
  const toggleSelection = (userId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  // Toggle all users selection
  const toggleAll = () => {
    if (!data?.users) return

    if (selectedIds.size === data.users.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(data.users.map((u) => u.id)))
    }
  }

  // Check if all are selected
  const allSelected = data?.users && data.users.length > 0 && selectedIds.size === data.users.length
  const someSelected = selectedIds.size > 0 && !allSelected

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Loading users from Supabase...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertTitle>Error loading users</AlertTitle>
        <AlertDescription>
          {error.message}
          <br />
          <span className="text-sm mt-2 block">
            Make sure your <code className="bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> is set correctly.
          </span>
        </AlertDescription>
      </Alert>
    )
  }

  if (!data?.users?.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>No users found in your Supabase project</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sign up a user in your app or create one in the Supabase dashboard to see them here.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>משתמשים ({data.count})</span>
          {selectedIds.size > 0 && (
            <span className="text-sm font-normal text-muted-foreground">{selectedIds.size} selected</span>
          )}
        </CardTitle>
        <CardDescription>
          רשימת כל המשתמשים הרשומים
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table className="users-table">
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={allSelected}
                  data-indeterminate={someSelected}
                  onCheckedChange={toggleAll}
                  aria-label="Select all users"
                />
              </TableHead>
              <TableHead>שם</TableHead>
              <TableHead>שם משתמש</TableHead>
              <TableHead>תפקיד</TableHead>
              <TableHead>סטטוס</TableHead>
              <TableHead>תאריך רישום</TableHead>
              <TableHead>כניסה אחרונה למערכת</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.users.map((user) => {
              const isSuspended = user.banned_until && new Date(user.banned_until) > new Date()
              return (
                <TableRow
                  key={user.id}
                  data-state={selectedIds.has(user.id) ? "selected" : undefined}
                  className="cursor-pointer"
                  onClick={() => onUserClick?.(user)}
                >
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <Checkbox
                      checked={selectedIds.has(user.id)}
                      onCheckedChange={() => toggleSelection(user.id)}
                      aria-label={`Select ${user.full_name || user.email}`}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{user.full_name || user.user_metadata?.name || "—"}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>
                    {user.role ? (
                      <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {isSuspended ? (
                      <Badge variant="destructive">מושעה</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-300">
                        פעיל
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(user.created_at).toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {user.last_sign_in_at ? new Date(user.last_sign_in_at).toLocaleDateString() : "Never"}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

