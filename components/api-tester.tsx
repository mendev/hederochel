"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type ApiResult = {
  status: number
  data: unknown
  error?: string
}

export function ApiTester() {
  const [results, setResults] = useState<Record<string, ApiResult | null>>({})
  const [loading, setLoading] = useState<Record<string, boolean>>({})

  async function testEndpoint(endpoint: string, options?: RequestInit) {
    const key = endpoint + (options?.method || "GET")
    setLoading((prev) => ({ ...prev, [key]: true }))

    try {
      const response = await fetch(endpoint, options)
      const data = await response.json()

      setResults((prev) => ({
        ...prev,
        [key]: {
          status: response.status,
          data,
        },
      }))
    } catch (error) {
      setResults((prev) => ({
        ...prev,
        [key]: {
          status: 0,
          data: null,
          error: error instanceof Error ? error.message : "Unknown error",
        },
      }))
    } finally {
      setLoading((prev) => ({ ...prev, [key]: false }))
    }
  }

  const endpoints = [
    {
      name: "Health Check",
      description: "Basic endpoint to verify API is working",
      endpoint: "/api/health",
      method: "GET",
    },
    {
      name: "List Users",
      description: "Admin endpoint to list all users (requires service_role key)",
      endpoint: "/api/users",
      method: "GET",
    },
    {
      name: "Current User",
      description: "Get the currently authenticated user",
      endpoint: "/api/me",
      method: "GET",
    },
    {
      name: "Example GET",
      description: "Example endpoint with query params",
      endpoint: "/api/example?name=Developer",
      method: "GET",
    },
    {
      name: "Example POST",
      description: "Example POST request",
      endpoint: "/api/example",
      method: "POST",
      body: JSON.stringify({ message: "Hello from frontend!" }),
    },
  ]

  return (
    <div className="space-y-4">
      {endpoints.map((ep) => {
        const key = ep.endpoint + ep.method
        const result = results[key]
        const isLoading = loading[key]

        return (
          <Card key={key}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">{ep.name}</CardTitle>
                  <CardDescription>{ep.description}</CardDescription>
                </div>
                <Button
                  onClick={() =>
                    testEndpoint(ep.endpoint, {
                      method: ep.method,
                      headers: ep.body ? { "Content-Type": "application/json" } : undefined,
                      body: ep.body,
                    })
                  }
                  disabled={isLoading}
                  size="sm"
                >
                  {isLoading ? "Testing..." : `Test ${ep.method}`}
                </Button>
              </div>
              <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                {ep.method} {ep.endpoint}
              </code>
            </CardHeader>

            {result && (
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Status:</span>
                    <span
                      className={`text-sm px-2 py-0.5 rounded ${
                        result.status >= 200 && result.status < 300
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {result.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm font-medium">Response:</span>
                    <pre className="mt-1 text-xs bg-muted p-3 rounded overflow-auto max-h-48">
                      {JSON.stringify(result.data, null, 2)}
                    </pre>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>
        )
      })}
    </div>
  )
}
