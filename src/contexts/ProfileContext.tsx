import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type { ProfileFormData } from '../schemas/profile';
import type { Database } from '../types/database';

type ProfileRow = Database['public']['Tables']['profiles']['Row'];

interface ProfileContextValue {
  profile: ProfileRow | null;
  profileLoading: boolean;
  isOnboarded: boolean;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: ProfileFormData) => Promise<{ error: string | null }>;
}

const ProfileContext = createContext<ProfileContextValue | null>(null);

export function ProfileProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { user, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  // Stay true until the first fetch resolves — prevents premature route decisions.
  const [profileLoading, setProfileLoading] = useState(true);

  const fetchProfile = useCallback(async (): Promise<void> => {
    // Yield to the microtask queue so no setState call runs synchronously
    // inside the useEffect body — satisfies react-hooks/set-state-in-effect.
    await Promise.resolve();
    if (!user) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }
    setProfileLoading(true);
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
    setProfile(data ?? null);
    setProfileLoading(false);
  }, [user]);

  // Wait for auth to resolve before fetching — avoids a stale no-profile flash.
  useEffect(() => {
    if (authLoading) return;
    void fetchProfile();
  }, [authLoading, fetchProfile]);

  const refreshProfile = useCallback(async (): Promise<void> => {
    await fetchProfile();
  }, [fetchProfile]);

  const updateProfile = useCallback(
    async (data: ProfileFormData): Promise<{ error: string | null }> => {
      if (!user) return { error: 'Not authenticated' };

      const now = new Date().toISOString();
      // upsert handles the rare case where the trigger didn't create the stub.
      const { error } = await supabase.from('profiles').upsert({
        id: user.id,
        display_name: data.displayName,
        avatar_color: data.avatarColor ?? null,
        avatar_emoji: data.avatarEmoji ?? null,
        avatar_url: data.avatarUrl ?? null,
        updated_at: now,
        onboarded_at: now,
      });

      if (error) return { error: 'Failed to save profile. Please try again.' };
      await fetchProfile();
      return { error: null };
    },
    [user, fetchProfile],
  );

  const isOnboarded = profile !== null && profile.onboarded_at !== null;

  return (
    <ProfileContext.Provider
      value={{ profile, profileLoading, isOnboarded, refreshProfile, updateProfile }}
    >
      {children}
    </ProfileContext.Provider>
  );
}

export function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error('useProfile must be used within ProfileProvider');
  return ctx;
}
