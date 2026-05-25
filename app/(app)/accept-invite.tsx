import React, { useCallback, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';

type AcceptState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error'; message: string };

type AcceptInviteParams = { token: string };

type AcceptInviteResponse = {
  connection_id: string;
  partner_name: string;
  partner_avatar_color: string;
};

export default function AcceptInviteScreen(): React.JSX.Element {
  const { token } = useLocalSearchParams<AcceptInviteParams>();
  const router = useRouter();
  const [state, setState] = useState<AcceptState>({ status: 'idle' });

  const handleAccept = useCallback(async (): Promise<void> => {
    if (!token) {
      setState({ status: 'error', message: 'Invalid invite link.' });
      return;
    }

    setState({ status: 'loading' });

    const { data, error } = await supabase.functions.invoke<AcceptInviteResponse>('accept-invite', {
      method: 'POST',
      body: { token },
    });

    if (error !== null) {
      const msg =
        typeof (error as { message?: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Something went wrong. Please try again.';

      // Map known error messages to user-friendly copy.
      if (msg.includes('expired') || msg.includes('not found')) {
        setState({ status: 'error', message: 'This invite has expired or is no longer valid.' });
      } else if (msg.includes('own invite')) {
        setState({ status: 'error', message: "You can't accept your own invite." });
      } else if (msg.includes('Already connected')) {
        setState({ status: 'error', message: "You're already connected with this person." });
      } else {
        setState({ status: 'error', message: 'Something went wrong. Please try again.' });
      }
      return;
    }

    if (data === null) {
      setState({ status: 'error', message: 'Something went wrong. Please try again.' });
      return;
    }

    router.replace({
      pathname: '/(app)/connected',
      params: {
        partnerName: data.partner_name,
        partnerAvatarColor: data.partner_avatar_color,
      },
    });
  }, [token, router]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.iconRow}>
          <View style={styles.linkIcon}>
            <Text style={styles.linkEmoji}>🔗</Text>
          </View>
        </View>

        <Text style={styles.heading}>{"You've been invited to sync up"}</Text>
        <Text style={styles.body}>
          Accept to connect and start sharing your weekly goals with each other.
        </Text>

        {state.status === 'error' && (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{state.message}</Text>
          </View>
        )}

        <TouchableOpacity
          style={[styles.acceptBtn, state.status === 'loading' && styles.acceptBtnDisabled]}
          onPress={() => void handleAccept()}
          disabled={state.status === 'loading'}
        >
          {state.status === 'loading' ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.acceptBtnText}>Accept {'&'} Set Your Goals</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.cancelBtn}
          onPress={() => router.replace('/(app)')}
          disabled={state.status === 'loading'}
        >
          <Text style={styles.cancelBtnText}>Maybe Later</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FBF7F2' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconRow: { marginBottom: 24 },
  linkIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#FBEEE8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  linkEmoji: { fontSize: 36 },
  heading: {
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C2A',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Fraunces_700Bold',
  },
  body: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    fontFamily: 'DMSans_400Regular',
  },
  errorBox: {
    backgroundColor: '#FFF0F0',
    borderRadius: 10,
    padding: 14,
    marginBottom: 20,
    width: '100%',
  },
  errorText: {
    color: '#E55353',
    fontSize: 14,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
  },
  acceptBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
    marginBottom: 12,
  },
  acceptBtnDisabled: { opacity: 0.6 },
  acceptBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16, fontFamily: 'DMSans_700Bold' },
  cancelBtn: { paddingVertical: 12 },
  cancelBtnText: { color: '#999', fontSize: 15, fontFamily: 'DMSans_400Regular' },
});
