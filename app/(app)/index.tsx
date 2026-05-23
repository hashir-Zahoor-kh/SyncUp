import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';

export default function BoardScreen(): React.JSX.Element {
  const { user, signOut } = useAuth();

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>SyncUp</Text>
        <Text style={styles.subtitle}>
          Welcome{user?.email ? `, ${user.email.split('@')[0]}` : ''}!
        </Text>
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
  title: { fontSize: 36, fontWeight: '700', color: '#6C63FF', marginBottom: 8 },
  subtitle: { fontSize: 18, color: '#333', marginBottom: 24 },
  placeholder: { fontSize: 15, color: '#666', textAlign: 'center', marginBottom: 8 },
  hint: { fontSize: 13, color: '#999', textAlign: 'center' },
  signOutBtn: { margin: 24, padding: 16, backgroundColor: '#F0EEFF', borderRadius: 12 },
  signOutText: { textAlign: 'center', color: '#6C63FF', fontWeight: '600', fontSize: 15 },
});
