import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useProfile } from '../../src/contexts/ProfileContext';

type ConnectedParams = {
  partnerName: string;
  partnerAvatarColor: string;
};

export default function ConnectedScreen(): React.JSX.Element {
  const { partnerName, partnerAvatarColor } = useLocalSearchParams<ConnectedParams>();
  const { profile } = useProfile();
  const router = useRouter();

  const myInitial = profile?.display_name.charAt(0).toUpperCase() ?? '?';
  const myColor = profile?.avatar_color ?? '#6C63FF';
  const partnerInitial = (partnerName ?? 'P').charAt(0).toUpperCase();
  const partnerColor = partnerAvatarColor ?? '#43AA8B';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.avatarRow}>
          <View style={[styles.avatar, { backgroundColor: myColor }]}>
            <Text style={styles.avatarInitial}>{myInitial}</Text>
          </View>
          <View style={styles.connector}>
            <Text style={styles.connectorText}>+</Text>
          </View>
          <View style={[styles.avatar, { backgroundColor: partnerColor }]}>
            <Text style={styles.avatarInitial}>{partnerInitial}</Text>
          </View>
        </View>

        <Text style={styles.heading}>{"You're synced up!"}</Text>
        <Text style={styles.body}>
          You and {partnerName ?? 'your partner'} are now connected.{'\n'}
          Start by setting your goals for this week.
        </Text>

        <TouchableOpacity style={styles.ctaBtn} onPress={() => router.replace('/(app)')}>
          <Text style={styles.ctaBtnText}>Set Your First Goals</Text>
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
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    gap: 0,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#FBF7F2',
  },
  avatarInitial: { fontSize: 32, fontWeight: '700', color: '#FFF', fontFamily: 'DMSans_700Bold' },
  connector: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FBEEE8',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
    marginHorizontal: -8,
  },
  connectorText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#D85A30',
    fontFamily: 'DMSans_700Bold',
  },
  heading: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C2C2A',
    textAlign: 'center',
    marginBottom: 12,
    fontFamily: 'Fraunces_700Bold',
  },
  body: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 40,
    fontFamily: 'DMSans_400Regular',
  },
  ctaBtn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    alignItems: 'center',
  },
  ctaBtnText: { color: '#FFF', fontWeight: '700', fontSize: 16, fontFamily: 'DMSans_700Bold' },
});
