import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function OnboardingLayout(): React.JSX.Element {
  const { session, loading } = useAuth();
  const router = useRouter();

  // If the user is not authenticated at all, send them to sign-in.
  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/sign-in');
    }
  }, [session, loading, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        // Prevent back-swiping out of onboarding.
        gestureEnabled: false,
      }}
    />
  );
}
