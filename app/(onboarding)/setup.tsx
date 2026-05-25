import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AvatarPicker } from '../../src/components/AvatarPicker';
import { FormInput } from '../../src/components/FormInput';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useAuth } from '../../src/contexts/AuthContext';
import { useProfile } from '../../src/contexts/ProfileContext';
import { profileSchema, type ProfileFormData } from '../../src/schemas/profile';

export default function OnboardingSetupScreen(): React.JSX.Element {
  const router = useRouter();
  const { user } = useAuth();
  const { updateProfile } = useProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [selectedEmoji, setSelectedEmoji] = useState<string | null>(null);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
  const hasAvatar = selectedEmoji != null || selectedUrl != null;

  const {
    control,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      avatarColor: null,
      avatarEmoji: null,
      avatarUrl: null,
    },
  });

  const onSubmit = async (data: ProfileFormData): Promise<void> => {
    setSubmitError(null);
    const { error } = await updateProfile(data);
    if (error) {
      setSubmitError(error);
      return;
    }
    router.replace('/(app)');
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.kav}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.header}>
            <Text style={styles.logo}>SyncUp</Text>
            <Text style={styles.title}>Set up your profile</Text>
            <Text style={styles.subtitle}>
              Your partner will see your name and avatar on the goal board.
            </Text>
          </View>

          <View style={styles.form}>
            <Controller
              control={control}
              name="displayName"
              render={({ field: { onChange, onBlur, value } }) => (
                <FormInput
                  label="Your name"
                  placeholder="e.g. Alex"
                  value={value}
                  onChangeText={onChange}
                  onBlur={onBlur}
                  error={errors.displayName?.message}
                  maxLength={50}
                  autoCapitalize="words"
                  returnKeyType="done"
                  autoCorrect={false}
                />
              )}
            />

            <Text style={styles.avatarLabel}>Choose your avatar</Text>
            <AvatarPicker
              userId={user?.id ?? ''}
              selectedEmoji={selectedEmoji}
              selectedUrl={selectedUrl}
              onEmojiSelect={(emoji) => {
                setSelectedEmoji(emoji);
                setSelectedUrl(null);
                setValue('avatarEmoji', emoji);
                setValue('avatarUrl', null);
                setValue('avatarColor', null);
              }}
              onUrlSelect={(url) => {
                setSelectedUrl(url);
                setSelectedEmoji(null);
                setValue('avatarUrl', url);
                setValue('avatarEmoji', null);
                setValue('avatarColor', null);
              }}
            />
            {errors.avatarEmoji ? (
              <Text style={styles.fieldError}>{errors.avatarEmoji.message}</Text>
            ) : null}

            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

            <View style={styles.btnContainer}>
              <PrimaryButton
                title="Get Started"
                onPress={() => void handleSubmit(onSubmit)()}
                loading={isSubmitting}
                disabled={!hasAvatar}
              />
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FBF7F2' },
  kav: { flex: 1 },
  scroll: { flexGrow: 1, paddingHorizontal: 28, paddingTop: 48, paddingBottom: 32 },
  header: { marginBottom: 40 },
  logo: {
    fontSize: 20,
    fontWeight: '700',
    color: '#D85A30',
    marginBottom: 24,
    fontFamily: 'Fraunces_700Bold',
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#2C2C2A',
    marginBottom: 8,
    fontFamily: 'Fraunces_700Bold',
  },
  subtitle: { fontSize: 15, color: '#666', lineHeight: 22, fontFamily: 'DMSans_400Regular' },
  form: { flex: 1 },
  avatarLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: 12,
    marginTop: 8,
    fontFamily: 'DMSans_700Bold',
  },
  fieldError: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 6,
    textAlign: 'center',
    fontFamily: 'DMSans_400Regular',
  },
  submitError: {
    fontSize: 14,
    color: '#FF6B6B',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 4,
    fontFamily: 'DMSans_400Regular',
  },
  btnContainer: { marginTop: 40 },
});
