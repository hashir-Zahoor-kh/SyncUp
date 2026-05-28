import React, { useEffect } from 'react';
import { ActivityIndicator, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as SecureStore from 'expo-secure-store';
import { useAuth } from '../src/contexts/AuthContext';
import { useProfile } from '../src/contexts/ProfileContext';
import { extractInviteToken } from '../src/lib/invite-link';

export default function RootIndex(): React.JSX.Element {
  const { session, loading } = useAuth();
  const { isOnboarded, profileLoading } = useProfile();
  const router = useRouter();

  useEffect(() => {
    const go = async (): Promise<void> => {
      if (loading) return;

      const noteSeen = await SecureStore.getItemAsync('founders_note_seen');
      if (!noteSeen) {
        router.replace('/(founders)/note');
        return;
      }

      if (!session?.user.email_confirmed_at) {
        router.replace('/(auth)/sign-in');
        return;
      }

      if (profileLoading) return;

      if (!isOnboarded) {
        router.replace('/(onboarding)/setup');
        return;
      }

      // Check for an invite token that arrived when the app was launched via deep link.
      // DeepLinkHandler stores tokens in SecureStore when the app is already running;
      // we check Linking.getInitialURL() here for cold-start deep links.
      let inviteToken: string | null = null;

      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        inviteToken = extractInviteToken(initialUrl);
      }

      if (!inviteToken) {
        inviteToken = await SecureStore.getItemAsync('pendingInviteToken');
        if (inviteToken) {
          await SecureStore.deleteItemAsync('pendingInviteToken');
        }
      }

      if (inviteToken) {
        router.replace({ pathname: '/(app)/accept-invite', params: { token: inviteToken } });
      } else {
        router.replace('/(app)');
      }
    };

    void go();
  }, [session, loading, isOnboarded, profileLoading, router]);

  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <ActivityIndicator size="large" color="#D85A30" />
    </View>
  );
}
