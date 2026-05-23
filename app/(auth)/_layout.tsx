import React, { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { useAuth } from '../../src/contexts/AuthContext';

export default function AuthLayout(): React.JSX.Element {
  const { session } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (session?.user.email_confirmed_at) {
      router.replace('/(app)');
    }
  }, [session, router]);

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="sign-in" />
      <Stack.Screen name="sign-up" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="reset-password" />
    </Stack>
  );
}
