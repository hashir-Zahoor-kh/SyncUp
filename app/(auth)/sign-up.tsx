import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '../../src/contexts/AuthContext';
import { signUpSchema, type SignUpFormData } from '../../src/schemas/auth';
import { FormInput } from '../../src/components/FormInput';
import { PasswordStrengthMeter } from '../../src/components/PasswordStrengthMeter';
import { PrimaryButton } from '../../src/components/PrimaryButton';

export default function SignUpScreen(): React.JSX.Element {
  const { signUpWithEmail } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    control,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignUpFormData>({
    resolver: zodResolver(signUpSchema),
    defaultValues: { email: '', password: '', confirmPassword: '', isAgeConfirmed: true },
  });

  // eslint-disable-next-line react-hooks/incompatible-library
  const password = watch('password');

  const onSubmit = async (data: SignUpFormData): Promise<void> => {
    setLoading(true);
    const { error } = await signUpWithEmail(data.email, data.password);
    setLoading(false);
    if (error) {
      Alert.alert('Sign Up Failed', 'Something went wrong. Please try again.');
      return;
    }
    router.push({ pathname: '/(auth)/verify-email', params: { email: data.email } });
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <TouchableOpacity
              onPress={() => router.back()}
              accessibilityLabel="Go back"
              style={styles.backBtn}
            >
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
            <Text style={styles.logo}>SyncUp</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Create your account</Text>
            <Text style={styles.subtitle}>
              Share goals with one person who keeps you accountable.
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

            <Controller
              control={control}
              name="password"
              render={({ field: { onChange, onBlur, value } }) => (
                <>
                  <FormInput
                    label="Password"
                    placeholder="At least 10 characters"
                    textContentType="newPassword"
                    autoComplete="new-password"
                    isPassword
                    value={value}
                    onChangeText={onChange}
                    onBlur={onBlur}
                    error={errors.password?.message}
                  />
                  <PasswordStrengthMeter password={value} />
                </>
              )}
            />

            <Controller
              control={control}
              name="confirmPassword"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Confirm Password"
                  placeholder="Repeat your password"
                  textContentType="newPassword"
                  autoComplete="new-password"
                  isPassword
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.confirmPassword?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="isAgeConfirmed"
              render={({ field: { onChange, value } }) => (
                <TouchableOpacity
                  style={styles.checkboxRow}
                  onPress={() => onChange(!value)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: value }}
                  accessibilityLabel="I confirm I am 13 years of age or older"
                >
                  <View style={[styles.checkbox, value && styles.checkboxChecked]}>
                    {value && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.checkboxLabel}>I confirm I am 13 years of age or older</Text>
                </TouchableOpacity>
              )}
            />
            {errors.isAgeConfirmed && (
              <Text style={styles.checkboxError}>{errors.isAgeConfirmed.message}</Text>
            )}

            <View style={styles.requirements}>
              <Text style={styles.reqTitle}>Password requirements:</Text>
              <PasswordRequirement met={password.length >= 10} text="At least 10 characters" />
              <PasswordRequirement met={/[a-zA-Z]/.test(password)} text="At least one letter" />
              <PasswordRequirement met={/[0-9]/.test(password)} text="At least one number" />
            </View>

            <PrimaryButton
              title="Create Account"
              loading={loading}
              onPress={() => void handleSubmit(onSubmit)()}
              style={styles.submitBtn}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>Already have an account? </Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/sign-in')}
                accessibilityLabel="Sign in"
              >
                <Text style={styles.footerLink}>Sign In</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function PasswordRequirement({ met, text }: { met: boolean; text: string }): React.JSX.Element {
  return (
    <View style={reqStyles.row}>
      <Text style={[reqStyles.dot, met ? reqStyles.dotMet : reqStyles.dotUnmet]}>
        {met ? '✓' : '○'}
      </Text>
      <Text style={[reqStyles.text, met ? reqStyles.textMet : reqStyles.textUnmet]}>{text}</Text>
    </View>
  );
}

const reqStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  dot: { fontSize: 12, marginRight: 6, width: 14 },
  dotMet: { color: '#1D9E75' },
  dotUnmet: { color: '#CCC' },
  text: { fontSize: 12, fontFamily: 'DMSans_400Regular' },
  textMet: { color: '#1D9E75' },
  textUnmet: { color: '#AAA' },
});

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flexGrow: 1, padding: 24, paddingTop: 16 },
  header: { marginBottom: 24 },
  backBtn: { marginBottom: 12 },
  backText: { fontSize: 15, color: '#D85A30', fontWeight: '600', fontFamily: 'DMSans_700Bold' },
  logo: { fontSize: 32, fontWeight: '800', color: '#2C2C2A', fontFamily: 'Fraunces_700Bold' },
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
    marginBottom: 24,
    lineHeight: 20,
    fontFamily: 'DMSans_400Regular',
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, marginTop: 4 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: '#DDD',
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: { backgroundColor: '#D85A30', borderColor: '#D85A30' },
  checkmark: { color: '#FFF', fontSize: 13, fontWeight: '700' },
  checkboxLabel: { fontSize: 14, color: '#444', flex: 1, fontFamily: 'DMSans_400Regular' },
  checkboxError: {
    fontSize: 12,
    color: '#FF6B6B',
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
  },
  requirements: {
    backgroundColor: '#FBF7F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  reqTitle: {
    fontSize: 12,
    color: '#888',
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: 'DMSans_700Bold',
  },
  submitBtn: { marginTop: 4 },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: '#666', fontFamily: 'DMSans_400Regular' },
  footerLink: { fontSize: 14, color: '#D85A30', fontWeight: '700', fontFamily: 'DMSans_700Bold' },
});
