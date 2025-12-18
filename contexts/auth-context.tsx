"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"
import { createClient } from "@/lib/supabase/client"

type Role = "bartender" | "shift-manager" | "manager" | null

interface AuthContextValue {
  user: any | null
  role: Role
  loading: boolean
  fullName: string | null
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

let supabaseInstance: ReturnType<typeof createClient> | null = null

function getSupabase() {
  if (typeof window === "undefined") {
    // Return null during SSR - we won't use it anyway
    return null
  }
  if (!supabaseInstance) {
    supabaseInstance = createClient()
  }
  return supabaseInstance
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any | null>(null)
  const [role, setRole] = useState<Role>(null)
  const [fullName, setFullName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)

  async function fetchProfile(uid: string) {
    const supabase = getSupabase()
    if (!supabase) return

    const resp = await supabase.from("profiles").select("*").eq("id", uid).single()
    const profile = resp.data
    if (profile) {
      setRole(profile.role)
      setFullName(profile.full_name)
    } else {
      setRole(null)
      setFullName(null)
    }
  }

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return

    const supabase = getSupabase()
    if (!supabase) {
      setLoading(false)
      return
    }
    // initial session
    ;(async () => {
      const resp = await supabase.auth.getSession()
      const session = resp.data?.session ?? null
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      }
      setLoading(false)
    })()

    // subscribe to changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        setUser(session.user)
        await fetchProfile(session.user.id)
      } else {
        setUser(null)
        setRole(null)
        setFullName(null)
      }
    })

    return () => {
      listener.subscription.unsubscribe()
    }
  }, [mounted])

  const signIn = async (email: string, password: string) => {
    const supabase = getSupabase()
    if (!supabase) throw new Error("Supabase client not available")

    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (data.session == null) {
      console.log("No active session after sign in")
    }
    if (error) throw error
  }

  const signOut = async () => {
    const supabase = getSupabase()
    if (!supabase) return

    await supabase.auth.signOut()
    setUser(null)
    setRole(null)
    setFullName(null)
  }

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id)
  }

  return (
    <AuthContext.Provider value={{ user, role, fullName, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used within AuthProvider")
  return ctx
}
