import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProfile } from '../../src/contexts/ProfileContext';
import { Avatar } from '../../src/components/Avatar';

export default function ProfileScreen(): React.JSX.Element {
  const { signOut } = useAuth();
  const { profile } = useProfile();

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        {profile && <Avatar profile={profile} size={80} style={styles.avatar} />}
        <Text style={styles.name}>{profile?.display_name ?? 'You'}</Text>
        <Text style={styles.subtitle}>Profile settings — coming in Phase 10.</Text>

        <TouchableOpacity style={styles.signOutBtn} onPress={() => void signOut()}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  content: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  avatar: { marginBottom: 16 },
  name: {
    fontSize: 24,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C2C2A',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
    marginBottom: 40,
  },
  signOutBtn: {
    backgroundColor: '#FBEEE8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 40,
  },
  signOutText: { color: '#D85A30', fontFamily: 'DMSans_700Bold', fontSize: 15 },
});
