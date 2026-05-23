import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AppLayout(): React.JSX.Element {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !session) {
      router.replace('/(auth)/sign-in');
    }
  }, [session, loading, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
    </Stack>
  );
}
