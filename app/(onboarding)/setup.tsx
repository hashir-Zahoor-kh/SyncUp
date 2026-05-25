import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AvatarColorPicker } from '../../src/components/AvatarColorPicker';
import { FormInput } from '../../src/components/FormInput';
import { PrimaryButton } from '../../src/components/PrimaryButton';
import { useProfile } from '../../src/contexts/ProfileContext';
import { AVATAR_COLORS, profileSchema, type ProfileFormData } from '../../src/schemas/profile';

export default function OnboardingSetupScreen(): React.JSX.Element {
  const router = useRouter();
  const { updateProfile } = useProfile();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      displayName: '',
      avatarColor: AVATAR_COLORS[0],
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
              Your partner will see this name and color on the goal board.
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

            <Text style={styles.colorLabel}>Pick your color</Text>
            <Controller
              control={control}
              name="avatarColor"
              render={({ field: { onChange, value } }) => (
                <AvatarColorPicker value={value} onChange={onChange} />
              )}
            />
            {errors.avatarColor ? (
              <Text style={styles.fieldError}>{errors.avatarColor.message}</Text>
            ) : null}

            {submitError ? <Text style={styles.submitError}>{submitError}</Text> : null}

            <View style={styles.btnContainer}>
              <PrimaryButton
                title="Get Started"
                onPress={() => void handleSubmit(onSubmit)()}
                loading={isSubmitting}
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
  colorLabel: {
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
