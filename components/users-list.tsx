"use client"

import useSWR from "swr"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"

type User = {
  id: string
  email: string
  created_at: string
  last_sign_in_at: string | null
  email_confirmed_at: string | null
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

export function UsersList() {
  const { data, error, isLoading } = useSWR<{ users: User[]; count: number }>("/api/users", fetcher)

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Loading users from Supabase...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-full" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
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
            Make sure your <code className="bg-muted px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code> is set correctly in{" "}
            <code className="bg-muted px-1 rounded">.env.local</code>
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
        <CardTitle>Users ({data.count})</CardTitle>
        <CardDescription>Users fetched from Supabase via the /api/users serverless function</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {data.users.map((user) => (
            <div key={user.id} className="flex items-center gap-4 p-3 rounded-lg bg-muted/50">
              <Avatar>
                <AvatarFallback>
                  {user.full_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{user.full_name || user.user_metadata?.name || user.email}</p>
                <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
              {user.role && <Badge variant={user.role === "admin" ? "default" : "secondary"}>{user.role}</Badge>}
              <div className="text-right text-xs text-muted-foreground">
                <p>Joined {new Date(user.created_at).toLocaleDateString()}</p>
                {user.last_sign_in_at && <p>Last seen {new Date(user.last_sign_in_at).toLocaleDateString()}</p>}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
