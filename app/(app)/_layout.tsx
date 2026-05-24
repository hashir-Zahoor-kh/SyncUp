import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProfile } from '../../src/contexts/ProfileContext';

export default function AppLayout(): React.JSX.Element {
  const { session, loading } = useAuth();
  const { isOnboarded, profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!session) {
      router.replace('/(auth)/sign-in');
    } else if (!isOnboarded) {
      router.replace('/(onboarding)/setup');
    }
  }, [session, loading, isOnboarded, profileLoading, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
