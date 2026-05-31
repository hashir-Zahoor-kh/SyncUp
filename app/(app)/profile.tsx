import React from 'react';
import { Alert, Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProfile } from '../../src/contexts/ProfileContext';
import { useGoals } from '../../src/contexts/GoalContext';
import { Avatar } from '../../src/components/Avatar';
import appJson from '../../app.json';

const SECURE_STORE_KEYS = [
  'supabase-auth-token',
  'supabase.auth.token',
  'sb-ilykfwtiebfyaljlhsrx-auth-token',
];

function SectionHeader({ title }: { title: string }): React.JSX.Element {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

function Divider(): React.JSX.Element {
  return <View style={styles.divider} />;
}

export default function ProfileScreen(): React.JSX.Element {
  const { user } = useAuth();
  const { profile } = useProfile();
  const { connection, partnerProfile } = useGoals();
  const router = useRouter();

  const appVersion = (appJson as { expo: { version: string; ios?: { buildNumber?: string } } }).expo
    .version;
  const buildNumber =
    (appJson as { expo: { ios?: { buildNumber?: string } } }).expo.ios?.buildNumber ?? '1';

  async function handleSignOut(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert('Sign out?', '', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: () => void performSignOut(),
      },
    ]);
  }

  async function performSignOut(): Promise<void> {
    await Promise.allSettled(SECURE_STORE_KEYS.map((key) => SecureStore.deleteItemAsync(key)));
    await supabase.auth.signOut();
  }

  async function openURL(url: string): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Linking.openURL(url);
  }

  async function handleDeleteAccount(): Promise<void> {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/(app)/delete-account');
  }

  return (
    <SafeAreaView style={styles.safe} testID="profile-screen">
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile section */}
        <View style={styles.section}>
          <View style={styles.profileRow}>
            {profile && <Avatar profile={profile} size={80} style={styles.avatar} />}
            <View style={styles.profileInfo}>
              <Text style={styles.displayName}>{profile?.display_name ?? 'You'}</Text>
              <Text style={styles.email}>{user?.email ?? ''}</Text>
            </View>
          </View>
        </View>

        <Divider />

        {/* Connection section */}
        {connection !== null && partnerProfile !== null && (
          <>
            <View style={styles.section}>
              <SectionHeader title="Connection" />
              <View style={styles.partnerRow}>
                <Avatar profile={partnerProfile} size={44} style={styles.partnerAvatar} />
                <View style={styles.partnerInfo}>
                  <Text style={styles.partnerName}>{partnerProfile.display_name}</Text>
                  <Text style={styles.connectionType}>{connection.relationship_type}</Text>
                </View>
              </View>
            </View>
            <Divider />
          </>
        )}

        {/* About section */}
        <View style={styles.section}>
          <SectionHeader title="About" />
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Version</Text>
            <Text style={styles.rowValue}>{appVersion}</Text>
          </View>
          <View style={styles.row}>
            <Text style={styles.rowLabel}>Build</Text>
            <Text style={styles.rowValue}>{buildNumber}</Text>
          </View>
        </View>

        <Divider />

        {/* Legal section */}
        <View style={styles.section}>
          <SectionHeader title="Legal" />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => void openURL('https://trysyncup.org/privacy')}
            accessibilityLabel="Privacy Policy"
          >
            <Text style={styles.linkText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => void openURL('https://trysyncup.org/terms')}
            accessibilityLabel="Terms of Service"
          >
            <Text style={styles.linkText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => void openURL('mailto:support@trysyncup.org')}
            accessibilityLabel="Contact support"
          >
            <Text style={styles.linkText}>Support: support@trysyncup.org</Text>
          </TouchableOpacity>
        </View>

        <Divider />

        {/* Account section */}
        <View style={styles.section}>
          <SectionHeader title="Account" />
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => void handleSignOut()}
            accessibilityLabel="Sign out"
          >
            <Text style={styles.signOutText}>Sign out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.linkRow}
            onPress={() => void handleDeleteAccount()}
            accessibilityLabel="Delete account"
            testID="delete-account-btn"
          >
            <Text style={styles.deleteText}>Delete account</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomPad} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  scrollContent: { paddingTop: 24 },

  section: { paddingHorizontal: 24, paddingVertical: 16 },

  divider: {
    height: 0.5,
    backgroundColor: '#E8E0D8',
    marginHorizontal: 24,
  },

  sectionHeader: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: '#888780',
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    marginBottom: 12,
  },

  profileRow: { flexDirection: 'row', alignItems: 'center' },
  avatar: { marginRight: 16 },
  profileInfo: { flex: 1 },
  displayName: {
    fontSize: 20,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C2C2A',
    marginBottom: 4,
  },
  email: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#888780',
  },

  partnerRow: { flexDirection: 'row', alignItems: 'center' },
  partnerAvatar: { marginRight: 12 },
  partnerInfo: { flex: 1 },
  partnerName: {
    fontSize: 15,
    fontFamily: 'DMSans_600SemiBold',
    color: '#2C2C2A',
    marginBottom: 2,
  },
  connectionType: {
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
    color: '#888780',
  },

  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  rowLabel: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#2C2C2A',
  },
  rowValue: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#888780',
  },

  linkRow: { paddingVertical: 10 },
  linkText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#2C2C2A',
  },
  signOutText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#D85A30',
  },
  deleteText: {
    fontSize: 14,
    fontFamily: 'DMSans_600SemiBold',
    color: '#C44545',
  },

  bottomPad: { height: 40 },
});
