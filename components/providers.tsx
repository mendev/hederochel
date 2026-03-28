"use client"

import { AuthProvider } from "@/contexts/auth-context"
import { Toaster } from "sonner"
import type { ReactNode } from "react"

// This ensures all client-side providers are properly isolated
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      {children}
      <Toaster richColors position="top-center" dir="rtl" />
    </AuthProvider>
  )
}