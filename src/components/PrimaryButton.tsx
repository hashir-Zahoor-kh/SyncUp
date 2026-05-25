import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type TouchableOpacityProps,
} from 'react-native';

interface PrimaryButtonProps extends TouchableOpacityProps {
  title: string;
  loading?: boolean;
}

export function PrimaryButton({
  title,
  loading = false,
  disabled,
  style,
  ...props
}: PrimaryButtonProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.btn, (disabled ?? loading) ? styles.btnDisabled : null, style]}
      disabled={disabled ?? loading}
      accessibilityRole="button"
      accessibilityLabel={title}
      {...props}
    >
      {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.text}>{title}</Text>}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: '#D85A30',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: { opacity: 0.6 },
  text: { color: '#FFF', fontSize: 16, fontWeight: '700', fontFamily: 'DMSans_700Bold' },
});
