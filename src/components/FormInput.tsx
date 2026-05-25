import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';

interface FormInputProps extends TextInputProps {
  label: string;
  error?: string | undefined;
  isPassword?: boolean;
}

export function FormInput({
  label,
  error,
  isPassword = false,
  ...props
}: FormInputProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={[styles.input, error ? styles.inputError : null, isPassword && styles.inputPadded]}
          secureTextEntry={isPassword && !visible}
          autoCapitalize="none"
          autoCorrect={false}
          accessibilityLabel={label}
          accessibilityHint={error}
          {...props}
        />
        {isPassword && (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setVisible((v) => !v)}
            accessibilityLabel={visible ? 'Hide password' : 'Show password'}
          >
            <Text style={styles.eyeText}>{visible ? 'Hide' : 'Show'}</Text>
          </TouchableOpacity>
        )}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 16 },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2C2C2A',
    marginBottom: 6,
    fontFamily: 'DMSans_700Bold',
  },
  inputRow: { flexDirection: 'row', alignItems: 'center' },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#DDD',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#2C2C2A',
    backgroundColor: '#FFF',
    fontFamily: 'DMSans_400Regular',
  },
  inputError: { borderColor: '#FF6B6B' },
  inputPadded: { paddingRight: 72 },
  eyeBtn: {
    position: 'absolute',
    right: 16,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  eyeText: { fontSize: 13, color: '#D85A30', fontWeight: '600', fontFamily: 'DMSans_700Bold' },
  error: { marginTop: 4, fontSize: 12, color: '#FF6B6B', fontFamily: 'DMSans_400Regular' },
});
