import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';
import { useProfile } from '../src/contexts/ProfileContext';

export default function RootIndex(): React.JSX.Element {
  const { session, loading } = useAuth();
  const { isOnboarded, profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    // Always wait for auth to resolve first.
    if (loading) return;

    if (!session?.user.email_confirmed_at) {
      // No valid session — go straight to auth without waiting for profile.
      router.replace('/(auth)/sign-in');
      return;
    }

    // Valid session — wait for profile to load before deciding.
    if (profileLoading) return;

    if (!isOnboarded) {
      router.replace('/(onboarding)/setup');
    } else {
      router.replace('/(app)');
    }
  }, [session, loading, isOnboarded, profileLoading, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}
