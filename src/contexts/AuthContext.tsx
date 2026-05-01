import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { posthog } from '@/lib/posthog';
import type { User, Session } from '@supabase/supabase-js';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isDemo: boolean;
  signUp: (email: string, password: string, meta: { firstName: string; lastName: string; company: string; profession: string }) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  enterDemo: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemo, setIsDemo] = useState(false);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // If refresh fails (stale/invalid token), clear it so the app doesn't hang
      if (event === 'TOKEN_REFRESHED' && !session) {
        supabase.auth.signOut({ scope: 'local' }).catch(() => {});
      }
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);

      // PostHog: identify on sign-in/up, reset on sign-out.
      try {
        if (typeof posthog !== 'undefined') {
          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
            const u = session.user;
            const meta: any = u.user_metadata || {};
            const name = meta.display_name
              || [meta.first_name, meta.last_name].filter(Boolean).join(' ').trim()
              || u.email
              || '';
            const userType = meta.user_type || meta.profession || undefined;
            posthog.identify(u.id, {
              email: u.email,
              name,
              signup_date: u.created_at,
              ...(userType ? { user_type: userType } : {}),
            });
            // Start session recording only for authenticated users.
            posthog.startSessionRecording?.();
          } else if (event === 'SIGNED_OUT') {
            posthog.stopSessionRecording?.();
            posthog.reset();
          }
        }
      } catch { /* never break auth on analytics */ }
    });

    supabase.auth.getSession()
      .then(async ({ data: { session }, error }) => {
        if (error) {
          // Stale refresh token (e.g. user deleted, project reset). Purge locally.
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('refresh') || msg.includes('token')) {
            await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
          }
          setSession(null);
          setUser(null);
        } else {
          setSession(session);
          setUser(session?.user ?? null);
        }
        setLoading(false);
      })
      .catch(async () => {
        await supabase.auth.signOut({ scope: 'local' }).catch(() => {});
        setSession(null);
        setUser(null);
        setLoading(false);
      });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, meta: { firstName: string; lastName: string; company: string; profession: string }) => {
    const displayName = `${meta.firstName} ${meta.lastName}`.trim();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          first_name: meta.firstName,
          last_name: meta.lastName,
          company: meta.company,
          profession: meta.profession,
        },
        emailRedirectTo: `${window.location.origin}/onboarding`,
      },
    });
    if (!error) {
      try {
        if (typeof posthog !== 'undefined') {
          posthog.capture('signup_completed', { signup_source: 'direct' });
        }
      } catch { /* noop */ }
    }
    return { error: error?.message ?? null };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    if (isDemo) {
      setIsDemo(false);
      return;
    }
    await supabase.auth.signOut();
  };

  const enterDemo = () => setIsDemo(true);

  return (
    <AuthContext.Provider value={{ user, session, loading, isDemo, signUp, signIn, signOut, enterDemo }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
