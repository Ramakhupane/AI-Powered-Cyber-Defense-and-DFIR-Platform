import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

export interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signInWithGithub: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// --- Provider state hook (pure logic, no JSX) ---
export function useAuthProviderState() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (err) {
        console.error('[Auth] Session init error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      try {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) return { error: error.message };
        return { error: null };
      } catch (err) {
        return { error: 'An unexpected error occurred during sign up.' };
      }
    },
    []
  );

  const signIn = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return { error: error.message };
        return { error: null };
      } catch (err) {
        return { error: 'An unexpected error occurred during sign in.' };
      }
    },
    []
  );

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (err) {
      console.error('[Auth] Sign out error:', err);
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('[Auth] Google sign in error:', err);
      throw err;
    }
  }, []);

  const signInWithGithub = useCallback(async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      console.error('[Auth] GitHub sign in error:', err);
      throw err;
    }
  }, []);

  return {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    signInWithGoogle,
    signInWithGithub,
  };
}

export { AuthContext };
