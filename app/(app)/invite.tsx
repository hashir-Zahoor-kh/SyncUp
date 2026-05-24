import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useProfile } from '../../src/contexts/ProfileContext';

type InviteState = { status: 'loading' } | { status: 'ready'; url: string } | { status: 'error' };

export default function InviteScreen(): React.JSX.Element {
  const { profile } = useProfile();
  const router = useRouter();
  const [invite, setInvite] = useState<InviteState>({ status: 'loading' });

  const createInvite = useCallback(async (): Promise<void> => {
    // Yield to the microtask queue before calling setState inside a useEffect.
    await Promise.resolve();
    setInvite({ status: 'loading' });

    const { data, error } = await supabase.functions.invoke<{ url: string }>('create-invite', {
      method: 'POST',
    });

    if (error !== null || data?.url === undefined) {
      setInvite({ status: 'error' });
      return;
    }

    setInvite({ status: 'ready', url: data.url });
  }, []);

  useEffect(() => {
    void createInvite();
  }, [createInvite]);

  const handleShare = useCallback(async (): Promise<void> => {
    if (invite.status !== 'ready') return;
    await Share.share({
      message: invite.url,
      url: invite.url,
    });
  }, [invite]);

  const initial = profile?.display_name.charAt(0).toUpperCase() ?? '?';
  const color = profile?.avatar_color ?? '#6C63FF';
  const name = profile?.display_name ?? 'You';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} hitSlop={16}>
          <Text style={styles.back}>Back</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.content}>
        <View style={styles.card}>
          <View style={[styles.avatar, { backgroundColor: color }]}>
            <Text style={styles.avatarInitial}>{initial}</Text>
          </View>
          <Text style={styles.name}>{name}</Text>
          <Text style={styles.tagline}>wants to sync up with you this week</Text>
          <Text style={styles.appName}>SyncUp</Text>
        </View>

        {invite.status === 'loading' && (
          <View style={styles.statusBox}>
            <ActivityIndicator color="#6C63FF" />
            <Text style={styles.statusText}>Generating your invite link…</Text>
          </View>
        )}

        {invite.status === 'error' && (
          <View style={styles.statusBox}>
            <Text style={styles.errorText}>Something went wrong. Please try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={() => void createInvite()}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {invite.status === 'ready' && (
          <View style={styles.actionsBox}>
            <Text style={styles.expiry}>Link expires in 7 days</Text>
            <TouchableOpacity style={styles.shareBtn} onPress={() => void handleShare()}>
              <Text style={styles.shareBtnText}>Share Invite</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  header: { paddingHorizontal: 24, paddingTop: 8 },
  back: { fontSize: 16, color: '#6C63FF', fontWeight: '600' },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 4 },
    elevation: 4,
    marginBottom: 32,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarInitial: { fontSize: 34, fontWeight: '700', color: '#FFF' },
  name: { fontSize: 22, fontWeight: '700', color: '#1A1A2E', marginBottom: 8 },
  tagline: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 22,
  },
  appName: { fontSize: 13, color: '#6C63FF', fontWeight: '600', letterSpacing: 1 },
  statusBox: { alignItems: 'center', gap: 12 },
  statusText: { fontSize: 14, color: '#999' },
  errorText: { fontSize: 15, color: '#E55353', textAlign: 'center', marginBottom: 12 },
  retryBtn: {
    backgroundColor: '#F0EEFF',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 24,
  },
  retryBtnText: { color: '#6C63FF', fontWeight: '600', fontSize: 15 },
  actionsBox: { alignItems: 'center', width: '100%', gap: 12 },
  expiry: { fontSize: 13, color: '#999' },
  shareBtn: {
    backgroundColor: '#6C63FF',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  shareBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
});
