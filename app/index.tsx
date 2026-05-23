import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../src/contexts/AuthContext';

export default function RootIndex(): React.JSX.Element {
  const { session, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;
    if (session?.user.email_confirmed_at) {
      router.replace('/(app)');
    } else {
      router.replace('/(auth)/sign-in');
    }
  }, [session, loading, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#6C63FF" />
    </View>
  );
}
