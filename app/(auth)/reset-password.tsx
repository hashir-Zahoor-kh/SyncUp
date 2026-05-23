import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../src/contexts/AuthContext';
import { passwordResetSchema, type PasswordResetFormData } from '../../src/schemas/auth';
import { FormInput } from '../../src/components/FormInput';
import { PrimaryButton } from '../../src/components/PrimaryButton';

export default function ResetPasswordScreen(): React.JSX.Element {
  const { sendPasswordResetEmail } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<PasswordResetFormData>({
    resolver: zodResolver(passwordResetSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: PasswordResetFormData): Promise<void> => {
    setLoading(true);
    await sendPasswordResetEmail(data.email);
    setLoading(false);
    setSent(true);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Go back"
          style={styles.backBtn}
        >
          <Text style={styles.backText}>← Back</Text>
        </TouchableOpacity>

        {sent ? (
          <View style={styles.successCard}>
            <Text style={styles.successEmoji}>✉️</Text>
            <Text style={styles.successTitle}>Check your email</Text>
            <Text style={styles.successBody}>
              {
                "If an account exists with that email, we've sent a password reset link. Check your spam folder if you don't see it."
              }
            </Text>
            <PrimaryButton
              title="Back to Sign In"
              onPress={() => router.replace('/(auth)/sign-in')}
            />
          </View>
        ) : (
          <View style={styles.card}>
            <Text style={styles.title}>Reset Password</Text>
            <Text style={styles.subtitle}>
              {"Enter your email and we'll send you a link to reset your password."}
            </Text>

            <Controller
              control={control}
              name="email"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Email"
                  placeholder="you@example.com"
                  keyboardType="email-address"
                  textContentType="emailAddress"
                  autoComplete="email"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.email?.message}
                />
              )}
            />

            <PrimaryButton
              title="Send Reset Link"
              loading={loading}
              onPress={() => void handleSubmit(onSubmit)()}
            />
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F5F3FF' },
  container: { flex: 1, padding: 24, paddingTop: 16 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 15, color: '#6C63FF', fontWeight: '600' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 28,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  title: { fontSize: 22, fontWeight: '700', color: '#111', marginBottom: 8 },
  subtitle: { fontSize: 14, color: '#888', lineHeight: 20, marginBottom: 24 },
  successCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 32,
    shadowColor: '#6C63FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 4,
  },
  successEmoji: { fontSize: 56, marginBottom: 20 },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    marginBottom: 12,
    textAlign: 'center',
  },
  successBody: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
  },
});
