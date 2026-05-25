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
import * as AppleAuthentication from 'expo-apple-authentication';
import { useAuth } from '../../src/contexts/AuthContext';
import { signInSchema, type SignInFormData } from '../../src/schemas/auth';
import { FormInput } from '../../src/components/FormInput';
import { PrimaryButton } from '../../src/components/PrimaryButton';

export default function SignInScreen(): React.JSX.Element {
  const { signInWithEmail, signInWithApple } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [appleLoading, setAppleLoading] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<SignInFormData>({
    resolver: zodResolver(signInSchema),
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = async (data: SignInFormData): Promise<void> => {
    setLoading(true);
    const { error } = await signInWithEmail(data.email, data.password);
    setLoading(false);
    if (error) {
      Alert.alert('Sign In Failed', 'Incorrect email or password. Please try again.');
    }
  };

  const handleAppleSignIn = async (): Promise<void> => {
    setAppleLoading(true);
    const { error } = await signInWithApple();
    setAppleLoading(false);
    if (error) {
      Alert.alert('Sign In Failed', error);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <Text style={styles.logo}>SyncUp</Text>
            <Text style={styles.tagline}>Stay in sync with the people who matter.</Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.title}>Welcome back</Text>

            {Platform.OS === 'ios' && (
              <>
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={14}
                  style={styles.appleBtn}
                  onPress={() => void handleAppleSignIn()}
                />
                {appleLoading && <Text style={styles.loadingText}>Signing in with Apple...</Text>}
                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>
              </>
            )}

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
                <FormInput
                  label="Password"
                  placeholder="Your password"
                  textContentType="password"
                  autoComplete="current-password"
                  isPassword
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.password?.message}
                />
              )}
            />

            <TouchableOpacity
              style={styles.forgotBtn}
              onPress={() => router.push('/(auth)/reset-password')}
              accessibilityLabel="Forgot password"
            >
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>

            <PrimaryButton
              title="Sign In"
              loading={loading}
              onPress={() => void handleSubmit(onSubmit)()}
            />

            <View style={styles.footer}>
              <Text style={styles.footerText}>{"Don't have an account? "}</Text>
              <TouchableOpacity
                onPress={() => router.push('/(auth)/sign-up')}
                accessibilityLabel="Create an account"
              >
                <Text style={styles.footerLink}>Sign Up</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  header: { alignItems: 'center', marginBottom: 32 },
  logo: {
    fontSize: 40,
    fontWeight: '800',
    color: '#2C2C2A',
    letterSpacing: -1,
    fontFamily: 'Fraunces_700Bold',
  },
  tagline: {
    fontSize: 14,
    color: '#888',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
  },
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
    fontSize: 24,
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: 24,
    fontFamily: 'Fraunces_700Bold',
  },
  appleBtn: { width: '100%', height: 52, marginBottom: 8 },
  loadingText: {
    textAlign: 'center',
    color: '#888',
    fontSize: 13,
    marginBottom: 8,
    fontFamily: 'DMSans_400Regular',
  },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: 20 },
  dividerLine: { flex: 1, height: 1, backgroundColor: '#EEE' },
  dividerText: {
    marginHorizontal: 12,
    color: '#AAA',
    fontSize: 13,
    fontFamily: 'DMSans_400Regular',
  },
  forgotBtn: { alignSelf: 'flex-end', marginBottom: 20, marginTop: -4 },
  forgotText: { fontSize: 13, color: '#D85A30', fontWeight: '600', fontFamily: 'DMSans_700Bold' },
  footer: { flexDirection: 'row', justifyContent: 'center', marginTop: 20 },
  footerText: { fontSize: 14, color: '#666', fontFamily: 'DMSans_400Regular' },
  footerLink: { fontSize: 14, color: '#D85A30', fontWeight: '700', fontFamily: 'DMSans_700Bold' },
});
