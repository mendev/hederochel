// File: src/frontend/lib/AuthContext.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../data/supabaseClient';

type Role = 'bartender' | 'shift-manager' | 'manager' | null;

interface AuthContextValue {
  user: any | null;
  role: Role;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [role, setRole] = useState<Role>(null);
  const [loading, setLoading] = useState(true);

  async function fetchProfile(uid: string) {
    const resp = await supabase
      .from('profiles')
      .select('role')
      .eq('id', uid)
      .single();
    const profile = resp.data; // use resp variable so there's no unused 'error'
    if (profile) setRole(profile.role);
    else setRole(null);
  }

  useEffect(() => {
    // initial session
    (async () => {
    const resp = await supabase.auth.getSession();
    const session = resp.data?.session ?? null;
    if (session?.user) {
      setUser(session.user);
      await fetchProfile(session.user.id);
    }
    setLoading(false);
  })();

    // subscribe to changes
    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      setUser(session.user);
      await fetchProfile(session.user.id);
    } else {
      setUser(null);
      setRole(null);
    }
  });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password });
    if (data.session == null) {
      console.log('No active session after sign in');
    }
    if (error) throw error;
    // after sign in, profile should be fetched by onAuthStateChange
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setRole(null);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signOut, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};