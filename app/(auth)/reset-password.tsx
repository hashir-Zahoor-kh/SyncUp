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
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  container: { flex: 1, padding: 24, paddingTop: 16 },
  backBtn: { marginBottom: 24 },
  backText: { fontSize: 15, color: '#D85A30', fontWeight: '600', fontFamily: 'DMSans_700Bold' },
  card: {
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 28,
    borderWidth: 0.5,
    borderColor: '#E8E0D8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: 8,
    fontFamily: 'Fraunces_700Bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#888',
    lineHeight: 20,
    marginBottom: 24,
    fontFamily: 'DMSans_400Regular',
  },
  successCard: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    borderRadius: 14,
    padding: 32,
    borderWidth: 0.5,
    borderColor: '#E8E0D8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  successEmoji: { fontSize: 56, marginBottom: 20 },
  successTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: 12,
    textAlign: 'center',
    fontFamily: 'Fraunces_700Bold',
  },
  successBody: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 28,
    fontFamily: 'DMSans_400Regular',
  },
});
