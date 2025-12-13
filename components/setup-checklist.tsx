"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

type CheckItem = {
  name: string
  status: "checking" | "success" | "error"
  message: string
}

export function SetupChecklist() {
  const [checks, setChecks] = useState<CheckItem[]>([
    { name: "NEXT_PUBLIC_SUPABASE_URL", status: "checking", message: "Checking..." },
    { name: "NEXT_PUBLIC_SUPABASE_ANON_KEY", status: "checking", message: "Checking..." },
    { name: "SUPABASE_SERVICE_ROLE_KEY", status: "checking", message: "Checking..." },
    { name: "API Routes Working", status: "checking", message: "Checking..." },
  ])

  useEffect(() => {
    // Check public env vars (available in browser)
    const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const publicAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

    setChecks((prev) =>
      prev.map((check) => {
        if (check.name === "NEXT_PUBLIC_SUPABASE_URL") {
          return publicUrl
            ? { ...check, status: "success", message: "Set correctly" }
            : { ...check, status: "error", message: "Not set - add to .env.local" }
        }
        if (check.name === "NEXT_PUBLIC_SUPABASE_ANON_KEY") {
          return publicAnon
            ? { ...check, status: "success", message: "Set correctly" }
            : { ...check, status: "error", message: "Not set - add to .env.local" }
        }
        return check
      }),
    )

    // Check server-side by calling the health endpoint
    fetch("/api/health")
      .then((res) => res.json())
      .then((data) => {
        setChecks((prev) =>
          prev.map((check) => {
            if (check.name === "API Routes Working") {
              return data.status === "ok"
                ? { ...check, status: "success", message: "API routes are working!" }
                : { ...check, status: "error", message: "API routes not responding" }
            }
            return check
          }),
        )
      })
      .catch(() => {
        setChecks((prev) =>
          prev.map((check) =>
            check.name === "API Routes Working" ? { ...check, status: "error", message: "Failed to reach API" } : check,
          ),
        )
      })

    // Check service role key by calling users endpoint
    fetch("/api/users")
      .then((res) => {
        setChecks((prev) =>
          prev.map((check) => {
            if (check.name === "SUPABASE_SERVICE_ROLE_KEY") {
              return res.ok
                ? { ...check, status: "success", message: "Set correctly (admin API works)" }
                : { ...check, status: "error", message: "Not set or invalid - add to .env.local" }
            }
            return check
          }),
        )
      })
      .catch(() => {
        setChecks((prev) =>
          prev.map((check) =>
            check.name === "SUPABASE_SERVICE_ROLE_KEY"
              ? { ...check, status: "error", message: "Could not verify" }
              : check,
          ),
        )
      })
  }, [])

  const getIcon = (status: CheckItem["status"]) => {
    switch (status) {
      case "success":
        return <CheckCircle2 className="h-5 w-5 text-green-500" />
      case "error":
        return <XCircle className="h-5 w-5 text-red-500" />
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    }
  }

  const allPassed = checks.every((c) => c.status === "success")

  return (
    <Card>
      <CardHeader>
        <CardTitle>Setup Checklist</CardTitle>
        <CardDescription>
          {allPassed
            ? "All checks passed! Your environment is configured correctly."
            : "Verify your environment variables are set correctly"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {checks.map((check) => (
            <div key={check.name} className="flex items-center gap-3">
              {getIcon(check.status)}
              <div>
                <p className="font-medium font-mono text-sm">{check.name}</p>
                <p className="text-xs text-muted-foreground">{check.message}</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
