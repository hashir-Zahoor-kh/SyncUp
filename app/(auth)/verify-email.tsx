import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/contexts/AuthContext';
import { PrimaryButton } from '../../src/components/PrimaryButton';

export default function VerifyEmailScreen(): React.JSX.Element {
  const { email } = useLocalSearchParams<{ email?: string }>();
  const { resendVerificationEmail, signOut } = useAuth();
  const router = useRouter();
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);

  const handleResend = async (): Promise<void> => {
    if (!email) return;
    setResending(true);
    const { error } = await resendVerificationEmail(email);
    setResending(false);
    if (error) {
      Alert.alert('Error', 'Could not resend the email. Please try again shortly.');
    } else {
      setResent(true);
    }
  };

  const handleWrongEmail = async (): Promise<void> => {
    await signOut();
    router.replace('/(auth)/sign-up');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.emoji}>📬</Text>
        <Text style={styles.title}>Check your inbox</Text>
        <Text style={styles.body}>
          We sent a verification link to{'\n'}
          <Text style={styles.email}>{email ?? 'your email'}</Text>
        </Text>
        <Text style={styles.instruction}>
          Tap the link in the email to verify your account, then come back and sign in.
        </Text>

        <View style={styles.card}>
          <PrimaryButton title="Go to Sign In" onPress={() => router.replace('/(auth)/sign-in')} />

          <View style={styles.spacer} />

          {resent ? (
            <Text style={styles.resentMsg}>✓ Email resent! Check your spam folder too.</Text>
          ) : (
            <PrimaryButton
              title="Resend Verification Email"
              loading={resending}
              onPress={() => void handleResend()}
              style={styles.resendBtn}
            />
          )}

          <TouchableOpacity
            style={styles.wrongEmailBtn}
            onPress={() => void handleWrongEmail()}
            accessibilityLabel="Wrong email address, go back to sign up"
          >
            <Text style={styles.wrongEmailText}>Wrong email? Go back</Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  emoji: { fontSize: 64, marginBottom: 24 },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Fraunces_700Bold',
  },
  body: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 16,
    fontFamily: 'DMSans_400Regular',
  },
  email: { fontWeight: '700', color: '#D85A30', fontFamily: 'DMSans_700Bold' },
  instruction: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 32,
    fontFamily: 'DMSans_400Regular',
  },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 24,
    width: '100%',
    borderWidth: 0.5,
    borderColor: '#E8E0D8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  spacer: { height: 12 },
  resendBtn: { backgroundColor: '#FBEEE8' },
  resentMsg: {
    textAlign: 'center',
    color: '#1D9E75',
    fontWeight: '600',
    fontSize: 14,
    padding: 12,
    fontFamily: 'DMSans_700Bold',
  },
  wrongEmailBtn: { marginTop: 16, alignItems: 'center', padding: 8 },
  wrongEmailText: { color: '#AAA', fontSize: 13, fontFamily: 'DMSans_400Regular' },
});
