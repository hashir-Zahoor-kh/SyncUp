import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/contexts/AuthContext';

const SECURE_STORE_KEYS = [
  'supabase-auth-token',
  'supabase.auth.token',
  'sb-ilykfwtiebfyaljlhsrx-auth-token',
];

export default function DeleteAccountScreen(): React.JSX.Element {
  const { user } = useAuth();
  const router = useRouter();
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(false);

  const userEmail = user?.email ?? '';
  const isConfirmed = confirmation === userEmail && userEmail.length > 0;

  async function handleDelete(): Promise<void> {
    if (!isConfirmed) return;

    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

    Alert.alert(
      'Delete account?',
      'This will permanently delete your account and all your data. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => void performDeletion(),
        },
      ],
    );
  }

  async function performDeletion(): Promise<void> {
    setLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        Alert.alert('Error', 'Session expired. Please sign in again.');
        setLoading(false);
        return;
      }

      const supabaseUrl = process.env['EXPO_PUBLIC_SUPABASE_URL'] ?? '';
      const response = await fetch(`${supabaseUrl}/functions/v1/delete-account`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.status === 429) {
        Alert.alert(
          'Already requested',
          'A deletion request was already submitted. Please wait 24 hours.',
        );
        setLoading(false);
        return;
      }

      if (!response.ok) {
        Alert.alert('Error', 'Deletion failed. Please contact support@trysyncup.org.');
        setLoading(false);
        return;
      }

      setDeleted(true);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Clear all secure storage
      await Promise.allSettled(SECURE_STORE_KEYS.map((key) => SecureStore.deleteItemAsync(key)));

      await supabase.auth.signOut();

      setTimeout(() => {
        router.replace('/(auth)/sign-in');
      }, 2000);
    } catch {
      Alert.alert('Error', 'Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  if (deleted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text style={styles.deletedTitle}>Account deleted</Text>
          <Text style={styles.deletedSubtitle}>Your data has been permanently removed.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.content}>
        <Text style={styles.title}>Delete your account</Text>

        <View style={styles.warningBox}>
          <Text style={styles.warningText}>
            {'This will permanently delete:\n'}
            {'• Your profile and avatar\n'}
            {"• All goals you've ever set\n"}
            {"• All reactions you've sent\n"}
            {'• Your connection with your partner\n'}
            {'• Your push notification settings\n\n'}
            {
              'Your partner will be notified that the connection has ended, but they will not be told who left.\n\n'
            }
            {'This cannot be undone.'}
          </Text>
        </View>

        <Text style={styles.label}>Type your email to confirm</Text>
        <TextInput
          style={styles.input}
          value={confirmation}
          onChangeText={setConfirmation}
          placeholder={userEmail}
          placeholderTextColor="#C0BAB2"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          editable={!loading}
        />

        <TouchableOpacity
          style={[styles.deleteBtn, isConfirmed && styles.deleteBtnActive]}
          onPress={() => void handleDelete()}
          disabled={!isConfirmed || loading}
          accessibilityLabel="Delete my account"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.deleteBtnText}>Delete my account</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.cancelBtn} onPress={() => router.back()} disabled={loading}>
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 32,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    fontSize: 26,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C2C2A',
    marginBottom: 24,
  },
  warningBox: {
    backgroundColor: '#FFF0EE',
    borderRadius: 12,
    padding: 16,
    marginBottom: 28,
    borderLeftWidth: 3,
    borderLeftColor: '#C44545',
  },
  warningText: {
    fontSize: 14,
    fontFamily: 'DMSans_400Regular',
    color: '#2C2C2A',
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontFamily: 'DMSans_600SemiBold',
    color: '#888780',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E8E0D8',
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#2C2C2A',
    marginBottom: 24,
  },
  deleteBtn: {
    backgroundColor: '#E8E0D8',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteBtnActive: {
    backgroundColor: '#C44545',
  },
  deleteBtnText: {
    fontSize: 15,
    fontFamily: 'DMSans_700Bold',
    color: '#fff',
  },
  cancelBtn: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cancelText: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#888780',
  },
  deletedTitle: {
    fontSize: 26,
    fontFamily: 'Fraunces_700Bold',
    color: '#2C2C2A',
    marginBottom: 12,
    textAlign: 'center',
  },
  deletedSubtitle: {
    fontSize: 15,
    fontFamily: 'DMSans_400Regular',
    color: '#888780',
    textAlign: 'center',
  },
});
