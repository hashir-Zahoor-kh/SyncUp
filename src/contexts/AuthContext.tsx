import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from '../lib/supabase';

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signInWithApple: () => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  sendPasswordResetEmail: (email: string) => Promise<{ error: string | null }>;
  resendVerificationEmail: (email: string) => Promise<{ error: string | null }>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    },
    [],
  );

  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      return { error: null };
    },
    [],
  );

  const signInWithApple = useCallback(async (): Promise<{ error: string | null }> => {
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      if (!credential.identityToken) {
        return { error: 'Apple Sign In failed: no identity token received' };
      }

      const { error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) return { error: error.message };
      return { error: null };
    } catch (err: unknown) {
      if (err instanceof Error && err.message.includes('ERR_REQUEST_CANCELED')) {
        return { error: null };
      }
      return { error: 'Apple Sign In failed. Please try again.' };
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
  }, []);

  const sendPasswordResetEmail = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'syncup://reset-password',
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    [],
  );

  const resendVerificationEmail = useCallback(
    async (email: string): Promise<{ error: string | null }> => {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      if (error) return { error: error.message };
      return { error: null };
    },
    [],
  );

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        signUpWithEmail,
        signInWithEmail,
        signInWithApple,
        signOut,
        sendPasswordResetEmail,
        resendVerificationEmail,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
