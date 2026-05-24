import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProfile } from '../../src/contexts/ProfileContext';

export default function BoardScreen(): React.JSX.Element {
  const { signOut } = useAuth();
  const { profile } = useProfile();

  const initial = profile?.display_name.charAt(0).toUpperCase() ?? '?';
  const color = profile?.avatar_color ?? '#6C63FF';
  const name = profile?.display_name ?? 'there';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={[styles.avatar, { backgroundColor: color }]}>
          <Text style={styles.avatarInitial}>{initial}</Text>
        </View>
        <Text style={styles.title}>SyncUp</Text>
        <Text style={styles.subtitle}>Hey {name} 👋</Text>
        <Text style={styles.placeholder}>Your goal board will appear here in Phase 5.</Text>
        <Text style={styles.hint}>Invite someone to start syncing goals.</Text>
      </View>
      <TouchableOpacity style={styles.signOutBtn} onPress={() => void signOut()}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  avatarInitial: { fontSize: 30, fontWeight: '700', color: '#FFF' },
  title: { fontSize: 36, fontWeight: '700', color: '#6C63FF', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#333', marginBottom: 24 },
  placeholder: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 13, color: '#999', textAlign: 'center' },
  signOutBtn: { margin: 24, padding: 16, backgroundColor: '#F0EEFF', borderRadius: 12 },
  signOutText: { textAlign: 'center', color: '#6C63FF', fontWeight: '600', fontSize: 15 },
});
