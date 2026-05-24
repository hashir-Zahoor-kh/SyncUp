import React, { useEffect, useRef } from 'react';
import { Linking } from 'react-native';
import { Slot, useRouter } from 'expo-router';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { AuthProvider, useAuth } from '../src/contexts/AuthContext';
import { ProfileProvider, useProfile } from '../src/contexts/ProfileContext';
import { extractInviteToken } from '../src/lib/invite-link';

/**
 * Handles deep links that arrive while the app is already running.
 * Renders nothing — it is a side-effect-only component mounted inside
 * both AuthProvider and ProfileProvider so it can access their state.
 *
 * Initial-launch deep links are handled separately in app/index.tsx via
 * Linking.getInitialURL(), which avoids the stale-closure timing issues
 * that arise when both hooks race to process the same URL.
 */
function DeepLinkHandler(): null {
  const { session } = useAuth();
  const { isOnboarded } = useProfile();
  const router = useRouter();

  // Track the last URL we handled to prevent double-processing.
  const handledRef = useRef<string | null>(null);

  // Capture current auth state in a ref so the event listener callback
  // always sees fresh values without needing to re-subscribe.
  const authRef = useRef({ session, isOnboarded });
  useEffect(() => {
    authRef.current = { session, isOnboarded };
  }, [session, isOnboarded]);

  useEffect(() => {
    const subscription = Linking.addEventListener('url', ({ url }) => {
      if (handledRef.current === url) return;

      const token = extractInviteToken(url);
      if (!token) return;

      handledRef.current = url;
      const { session: s, isOnboarded: io } = authRef.current;

      if (s && io) {
        router.push({ pathname: '/(app)/accept-invite', params: { token } });
      } else {
        void SecureStore.setItemAsync('pendingInviteToken', token);
      }
    });

    return () => subscription.remove();
  }, [router]);

  return null;
}

export default function RootLayout(): React.JSX.Element {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ProfileProvider>
            <DeepLinkHandler />
            <Slot />
          </ProfileProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
