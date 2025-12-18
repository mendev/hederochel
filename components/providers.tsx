"use client"

import { AuthProvider } from "@/contexts/auth-context"
import type { ReactNode } from "react"

// This ensures all client-side providers are properly isolated
export function Providers({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>
}