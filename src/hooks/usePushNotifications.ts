import { Alert } from 'react-native';
import * as Notifications from 'expo-notifications';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

const NUDGE_SHOWN_KEY = 'push_nudge_shown';

export interface PushNotificationHook {
  requestAndRegister: () => Promise<void>;
  registerToken: () => Promise<void>;
}

export function usePushNotifications(): PushNotificationHook {
  const { user } = useAuth();

  const registerToken = async (): Promise<void> => {
    if (!user) return;
    try {
      const tokenData = await Notifications.getExpoPushTokenAsync();
      await supabase
        .from('push_tokens')
        .upsert(
          { user_id: user.id, token: tokenData.data, updated_at: new Date().toISOString() },
          { onConflict: 'user_id' },
        );
    } catch {
      // Token registration failure is non-fatal — app works without notifications
    }
  };

  const requestAndRegister = async (): Promise<void> => {
    const { status } = await Notifications.getPermissionsAsync();

    if (status === 'granted') {
      await registerToken();
      return;
    }

    if (status === 'denied') {
      // Show a one-time nudge — never re-request after denial
      const nudgeShown = await SecureStore.getItemAsync(NUDGE_SHOWN_KEY);
      if (!nudgeShown) {
        await SecureStore.setItemAsync(NUDGE_SHOWN_KEY, 'true');
        Alert.alert(
          'Stay in sync',
          'Get notified when your partner completes a goal. Enable notifications in Settings to turn this on.',
          [{ text: 'OK', style: 'default' }],
        );
      }
      return;
    }

    // undetermined — request the system permission dialog
    const { status: newStatus } = await Notifications.requestPermissionsAsync();
    if (newStatus === 'granted') {
      await registerToken();
    }
  };

  return { requestAndRegister, registerToken };
}
